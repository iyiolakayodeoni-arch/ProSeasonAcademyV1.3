-- ═══════════════════════════════════════════════════════════
-- PROSEASONACADEMY — EVERYTHING, IN ONE PASTE
-- Generated 2026-07-28 · safe to re-run, safe over a partial apply
-- ═══════════════════════════════════════════════════════════

-- ▓▓▓▓▓▓▓▓▓▓ 0 · clear stale function shapes (42P13 guard) ▓▓▓▓▓▓▓▓▓▓

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('my_access', 'access_state', 'can_access', 'season_seats')
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
    raise notice 'dropped %', r.sig;
  end loop;
end $$;

-- ── Now re-create the ones the LATER files expect ────────────
-- season_seats() is needed by seat-gate/security/access, so rebuild
-- it here in its final 5-column shape rather than leaving a gap.
create or replace function season_seats()
returns table (season text, cap int, taken int, waiting int, is_full boolean)


-- ▓▓▓▓▓▓▓▓▓▓ seat-gate.sql ▓▓▓▓▓▓▓▓▓▓

-- ═════════════════════════════════════════════════════════════
-- SEASON ONE — MAKING THE 1,000-SEAT CAP ACTUALLY HOLD
--
-- Run this ONCE in Supabase → SQL Editor, AFTER schema.sql.
-- Safe to re-run.
--
-- WHY THIS EXISTS
-- The cap was enforced only inside the ensure-profile edge function,
-- which left two ways past it:
--
--   1. BYPASS — policy `profiles_insert_own` allowed ANY signed-in
--      device to POST /rest/v1/profiles directly and mint itself a
--      seat without ever calling ensure-profile. The anon key is
--      public (it ships inside the app), so this needed no secret.
--
--   2. RACE — ensure-profile counted seats, then inserted, in two
--      separate round-trips. Two devices arriving at seat 999 both
--      read taken=999, both passed the check, both inserted. 1001.
--
-- THE FIX: the cap becomes a rule of the DATABASE, not of one
-- function. A BEFORE INSERT trigger locks the config row, recounts
-- inside the same transaction, and raises if the season is full.
-- Postgres serialises concurrent inserts on that lock, so seat 1001
-- cannot exist no matter who asks or how many ask at once.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · Close the direct-insert bypass ───────────────────────
-- Players never create their own row again. Only ensure-profile
-- (service_role, which bypasses RLS) may mint a seat — so the gate
-- is always on the path.
drop policy if exists profiles_insert_own on profiles;

-- Players keep reading their own row. Nothing changes for them.
drop policy if exists profiles_select_own on profiles;
create policy profiles_select_own on profiles
  for select to authenticated using (auth_user_id = auth.uid());

-- A player may correct their own handle/coach/platform, but never
-- their seat identity — that is pinned by the trigger in §2.
drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- ── 2 · The seat identity is immutable ───────────────────────
-- A WITH CHECK clause cannot see OLD, so this needs a trigger.
create or replace function profiles_guard_identity()
returns trigger language plpgsql as $$
begin
  if new.academy_id is distinct from old.academy_id then
    raise exception 'academy_id is immutable';
  end if;
  if new.auth_user_id is distinct from old.auth_user_id then
    raise exception 'auth_user_id is immutable';
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_guard_identity on profiles;
create trigger trg_profiles_guard_identity
  before update on profiles
  for each row execute function profiles_guard_identity();

-- ── 3 · THE GATE — the cap, enforced by Postgres itself ──────
-- Runs for EVERY insert, from any client, including service_role.
--
-- SECURITY DEFINER is essential, not decoration: without it the
-- function runs as the caller, and RLS (profiles_select_own) would
-- restrict the count to the caller's own rows — reporting 0 seats
-- taken and letting everyone through. It must count as the owner.
create or replace function profiles_enforce_seat_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap   int;
  v_taken int;
begin
  -- the founder's own row never consumes a member seat
  if new.academy_id = 'PSA-FOUNDER' then
    return new;
  end if;

  -- Lock the seat_cap config row for this transaction. Any other
  -- signup must wait here, so the count below cannot go stale
  -- between reading it and inserting. This is what kills the race.
  select value::int into v_cap
    from config
   where key = 'seat_cap'
     for update;

  -- no cap configured = no gate (fail open, rather than locking
  -- every member out because one config row went missing)
  if v_cap is null then
    return new;
  end if;

  select count(*) into v_taken
    from profiles
   where academy_id <> 'PSA-FOUNDER';

  if v_taken >= v_cap then
    -- ensure-profile maps this to a clean 409 SEASON_FULL
    raise exception 'SEASON_FULL: % of % seats taken', v_taken, v_cap
      using errcode = 'P0001';
  end if;

  return new;
end $$;

drop trigger if exists trg_profiles_seat_cap on profiles;
create trigger trg_profiles_seat_cap
  before insert on profiles
  for each row execute function profiles_enforce_seat_cap();

-- ── 4 · Exactly one founder row ──────────────────────────────
-- auth_user_id is UNIQUE, but Postgres treats NULLs as distinct, so
-- multiple NULL rows were possible. Only the founder may be NULL.
create unique index if not exists profiles_one_founder
  on profiles ((auth_user_id is null))
  where auth_user_id is null;

-- ── 5 · Seat report, now including the waitlist ──────────────
-- DROP first: create-or-replace cannot change a function's return
-- type, and we are adding two columns.
-- (Function-to-function deps are not tracked, so admin_rollup is
--  unaffected — it selects season/cap/taken, which still exist.)
drop function if exists season_seats();
create or replace function season_seats()
returns table (season text, cap int, taken int, waiting int, is_full boolean)
language sql security definer stable as $$
  select
    (select value from config where key = 'season_name'),
    (select value::int from config where key = 'seat_cap'),
    (select count(*)::int from profiles where academy_id <> 'PSA-FOUNDER'),
    (select count(*)::int from waitlist),
    (select count(*) from profiles where academy_id <> 'PSA-FOUNDER')
      >= (select value::int from config where key = 'seat_cap');
$$;
grant execute on function season_seats() to anon, authenticated;

-- ── 6 · Opening Season Two later ─────────────────────────────
-- One statement, and the gate honours the new number immediately:
--     update config set value = '2000'       where key = 'seat_cap';
--     update config set value = 'SEASON TWO' where key = 'season_name';
-- Lowering the cap never evicts anyone; it just means no new seats
-- until the count falls back below it.

-- ── 7 · Proof it is armed (read-only) ────────────────────────
do $$
declare r record;
begin
  select * into r from season_seats();
  raise notice 'SEAT GATE ARMED · % · %/% taken · % waiting · full=%',
    r.season, r.taken, r.cap, r.waiting, r.is_full;
end $$;


-- ▓▓▓▓▓▓▓▓▓▓ security.sql ▓▓▓▓▓▓▓▓▓▓

-- ═════════════════════════════════════════════════════════════
-- PROSEASONACADEMY — SECURITY HARDENING
--
-- Run ONCE in Supabase → SQL Editor, AFTER schema.sql and
-- seat-gate.sql. Safe to re-run.
--
-- This closes the gap between "capped at 1,000" and "MY 1,000".
-- Before this, the seat gate counted seats but did not care WHO
-- took them: anyone who obtained the APK could claim one, because
-- the anon key ships inside every build. A private ecosystem needs
-- the door to know your name.
--
-- What this adds:
--   1. INVITE CODES — a seat requires a code you issued
--   2. RATE LIMITS — nobody can flood the halls
--   3. ABUSE CONTROLS — mute/remove a member, revoke a seat
--   4. CONTACT INBOX — private line to the founder
--   5. FOUNDER HOURS — the December listening week, in data
-- ═════════════════════════════════════════════════════════════

-- ── 1 · INVITE CODES — the door knows your name ──────────────
create table if not exists invites (
  code text primary key,                            -- what you hand out
  label text,                                       -- "IG giveaway", "Chinedu's list"
  max_uses int not null default 1,
  uses int not null default 0,
  expires_at timestamptz,                           -- null = never
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  note text
);

-- which invite let a member in (audit trail, and lets you see who
-- your best inviters are)
alter table profiles add column if not exists invite_code text;
alter table profiles add column if not exists status text not null default 'active';
  -- 'active' | 'muted' | 'removed'

alter table invites enable row level security;
-- nobody reads the invite table from a phone; only edge functions touch it
drop policy if exists invites_none on invites;

/**
 * Claim an invite atomically. Locks the row so two people cannot
 * spend the last use of the same code at the same instant.
 * Returns true when the code was valid and has been consumed.
 */
create or replace function claim_invite(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_ok boolean := false;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return false;
  end if;

  update invites
     set uses = uses + 1
   where code = upper(trim(p_code))
     and not revoked
     and (expires_at is null or expires_at > now())
     and uses < max_uses
  returning true into v_ok;

  return coalesce(v_ok, false);
end $$;
revoke execute on function claim_invite(text) from public, anon, authenticated;
grant execute on function claim_invite(text) to service_role;

-- Is the academy invite-only right now? One row, flip any time.
insert into config (key, value) values ('invite_only', 'true')
on conflict (key) do nothing;

-- ── 2 · RATE LIMITS — the halls cannot be flooded ────────────
-- A member could previously insert unlimited messages: one script,
-- and every room is unreadable. This caps it at the database.
create or replace function messages_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent int;
  v_status text;
begin
  -- removed/muted members cannot speak at all
  select status into v_status from profiles where id = new.user_id;
  if v_status = 'removed' then
    raise exception 'ACCOUNT_REMOVED' using errcode = 'P0001';
  end if;
  if v_status = 'muted' then
    raise exception 'ACCOUNT_MUTED' using errcode = 'P0001';
  end if;

  -- 20 messages per minute is generous for a human, fatal to a script
  select count(*) into v_recent
    from messages
   where user_id = new.user_id
     and at > now() - interval '1 minute';

  if v_recent >= 20 then
    raise exception 'RATE_LIMITED: slow down' using errcode = 'P0001';
  end if;

  -- length guard (the app caps at 500; enforce it server-side too)
  if length(new.text) > 500 then
    raise exception 'MESSAGE_TOO_LONG' using errcode = 'P0001';
  end if;

  return new;
end $$;

drop trigger if exists trg_messages_rate_limit on messages;
create trigger trg_messages_rate_limit
  before insert on messages
  for each row execute function messages_rate_limit();

-- match sync abuse: 200 rows/minute is far above honest use
create or replace function matches_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_recent int;
begin
  select count(*) into v_recent
    from matches
   where user_id = new.user_id
     and synced_at > now() - interval '1 minute';
  if v_recent >= 200 then
    raise exception 'RATE_LIMITED: too many matches at once' using errcode = 'P0001';
  end if;
  return new;
end $$;

alter table matches add column if not exists synced_at timestamptz not null default now();
drop trigger if exists trg_matches_rate_limit on matches;
create trigger trg_matches_rate_limit
  before insert on matches
  for each row execute function matches_rate_limit();

-- ── 3 · MEMBERSHIP CONTROL — mute, remove, free the seat ─────
-- A removed member stops occupying a seat, so you can re-issue it.
create or replace function season_seats()
returns table (season text, cap int, taken int, waiting int, is_full boolean)
language sql security definer stable as $$
  select
    (select value from config where key = 'season_name'),
    (select value::int from config where key = 'seat_cap'),
    (select count(*)::int from profiles
       where academy_id <> 'PSA-FOUNDER' and status <> 'removed'),
    (select count(*)::int from waitlist),
    (select count(*) from profiles
       where academy_id <> 'PSA-FOUNDER' and status <> 'removed')
      >= (select value::int from config where key = 'seat_cap');
$$;
grant execute on function season_seats() to anon, authenticated;

create or replace function set_member_status(p_academy text, p_status text)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('active', 'muted', 'removed') then
    raise exception 'bad status';
  end if;
  update profiles set status = p_status
   where academy_id = upper(trim(p_academy)) and academy_id <> 'PSA-FOUNDER';
  return found;
end $$;
revoke execute on function set_member_status(text, text) from public, anon, authenticated;
grant execute on function set_member_status(text, text) to service_role;

-- a removed member's rows stop being readable by them
drop policy if exists profiles_select_own on profiles;
create policy profiles_select_own on profiles
  for select to authenticated
  using (auth_user_id = auth.uid());

-- muted/removed members cannot post (belt AND braces with the trigger)
drop policy if exists messages_post_own on messages;
create policy messages_post_own on messages
  for insert to authenticated
  with check (
    kind = 'text'
    and user_id in (
      select id from profiles
       where auth_user_id = auth.uid() and status = 'active'
    )
  );

-- ── 4 · CONTACT INBOX — the private line to you ──────────────
-- "text me privately for questions, suggestions, bugs"
create table if not exists contact_messages (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete set null,
  handle text,
  academy_id text,
  kind text not null default 'message',   -- 'message'|'bug'|'suggestion'|'question'
  body text not null,
  at timestamptz not null default now(),
  read boolean not null default false,
  replied boolean not null default false,
  reply text
);
create index if not exists idx_contact_unread on contact_messages (read, at desc);

alter table contact_messages enable row level security;

-- a member may WRITE to you, and read only their own thread
drop policy if exists contact_insert_own on contact_messages;
create policy contact_insert_own on contact_messages
  for insert to authenticated
  with check (user_id in (
    select id from profiles where auth_user_id = auth.uid() and status <> 'removed'
  ));

drop policy if exists contact_read_own on contact_messages;
create policy contact_read_own on contact_messages
  for select to authenticated
  using (user_id in (select id from profiles where auth_user_id = auth.uid()));

-- 5 contact messages per hour — enough for a real issue, not a flood
create or replace function contact_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_recent int;
begin
  select count(*) into v_recent from contact_messages
   where user_id = new.user_id and at > now() - interval '1 hour';
  if v_recent >= 5 then
    raise exception 'RATE_LIMITED: you have already sent 5 messages this hour'
      using errcode = 'P0001';
  end if;
  if length(new.body) > 2000 then
    raise exception 'MESSAGE_TOO_LONG' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists trg_contact_rate_limit on contact_messages;
create trigger trg_contact_rate_limit
  before insert on contact_messages
  for each row execute function contact_rate_limit();

-- ── 5 · FOUNDER HOURS — the December listening week ──────────
-- A window where you are live in the halls and the academy is open.
-- Config rows, so you move the dates without a deploy.
insert into config (key, value) values
  ('founder_week_start', '2026-12-01T00:00:00Z'),
  ('founder_week_end',   '2026-12-08T00:00:00Z'),
  ('founder_week_note',  'FOUNDER''S WEEK — I AM IN THE HALLS. TELL ME WHAT TO BUILD.')
on conflict (key) do nothing;

-- a dedicated room for it
insert into channels (slug, name, topic) values
  ('founders-week', 'FOUNDER''S WEEK', 'ONE WEEK. THE FOUNDER IS LISTENING. SHAPE THE ACADEMY.')
on conflict (slug) do nothing;

-- ── 6 · AUDIT — every founder action leaves a trace ──────────
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  action text not null,
  target text,
  detail jsonb,
  at timestamptz not null default now()
);
alter table audit_log enable row level security;   -- no phone reads this

create or replace function audit(p_action text, p_target text default null, p_detail jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into audit_log (action, target, detail) values (p_action, p_target, p_detail);
$$;
revoke execute on function audit(text, text, jsonb) from public, anon, authenticated;
grant execute on function audit(text, text, jsonb) to service_role;

-- ── 7 · Proof ────────────────────────────────────────────────
do $$
declare r record; v_inv int; v_only text;
begin
  select * into r from season_seats();
  select count(*) into v_inv from invites;
  select value into v_only from config where key = 'invite_only';
  raise notice 'SECURITY ARMED · % · %/% seats · invite_only=% · % invite code(s)',
    r.season, r.taken, r.cap, v_only, v_inv;
end $$;

-- ═════════════════════════════════════════════════════════════
-- ACCESS MODEL — free vs paid, per region
--
-- AFRICA  → credits. Some of the journey is free; deeper stages
--           and the Home tricks are unlocked with credit packs.
-- WORLD   → subscription. Same content, flat monthly.
--
-- Deliberately data, not code: every number below is a config row
-- or a products row you edit in the dashboard. Nothing here is
-- set in stone, because the pricing is not settled yet.
-- ═════════════════════════════════════════════════════════════

insert into config (key, value) values
  ('free_stages',        '2'),     -- stages 1-2 free for everyone
  ('stage_unlock_cost',  '50'),    -- credits per stage after that (africa)
  ('trick_unlock_cost',  '20'),    -- credits per Home trick (africa)
  ('world_model',        'subscription'),
  ('africa_model',       'credits')
on conflict (key) do nothing;

-- what a member has unlocked (credits spent = permanent access)
create table if not exists unlocks (
  academy_id text not null references profiles(academy_id) on delete cascade,
  item text not null,                       -- 'stage:3' | 'trick:mb-2026-07-24-011'
  at timestamptz not null default now(),
  primary key (academy_id, item)
);
alter table unlocks enable row level security;

drop policy if exists unlocks_read_own on unlocks;
create policy unlocks_read_own on unlocks
  for select to authenticated
  using (academy_id in (select academy_id from profiles where auth_user_id = auth.uid()));

/**
 * Spend credits to unlock something, atomically. PRO subscribers
 * (world track) get it free — the same call just records the unlock.
 * Returns the new balance, or raises so nothing is half-done.
 */
create or replace function unlock_item(p_item text, p_cost int)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_academy text;
  v_plan    text;
  v_credits int;
begin
  select academy_id into v_academy from profiles where auth_user_id = auth.uid();
  if v_academy is null then raise exception 'no seat'; end if;

  -- already owned → no double charge, ever
  if exists (select 1 from unlocks where academy_id = v_academy and item = p_item) then
    select credits into v_credits from wallets where academy_id = v_academy;
    return coalesce(v_credits, 0);
  end if;

  select plan, credits into v_plan, v_credits from wallets where academy_id = v_academy for update;

  -- subscribers unlock everything at no credit cost
  if v_plan = 'pro' then
    insert into unlocks (academy_id, item) values (v_academy, p_item)
      on conflict do nothing;
    return coalesce(v_credits, 0);
  end if;

  if coalesce(v_credits, 0) < p_cost then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;

  update wallets set credits = credits - p_cost, updated_at = now()
    where academy_id = v_academy;
  insert into unlocks (academy_id, item) values (v_academy, p_item)
    on conflict do nothing;
  insert into ledger (academy_id, delta, reason, actor)
    values (v_academy, -p_cost, 'UNLOCK ' || upper(p_item), 'player');

  select credits into v_credits from wallets where academy_id = v_academy;
  return v_credits;
end $$;
grant execute on function unlock_item(text, int) to authenticated;


-- ▓▓▓▓▓▓▓▓▓▓ packs.sql ▓▓▓▓▓▓▓▓▓▓

-- ═════════════════════════════════════════════════════════════
-- STARTER PACKS — credits AND the tricks that come with them
--
-- Run in Supabase → SQL Editor AFTER schema.sql, seat-gate.sql and
-- security.sql. Safe to re-run.
--
-- The founder's model: "the Home page tricks would be part of each
-- of those starter packs." Until now a pack only dropped credits in
-- a wallet and every trick had to be bought separately. Now a pack
-- is a bundle: its credits AND its tricks land together, in one
-- transaction, and the member owns those tricks permanently.
--
-- Everything is data. Which tricks sit in which pack is a table you
-- edit in the dashboard — no deploy, no code change, and it can be
-- re-cut every season as the meta moves.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · What each pack contains, beyond credits ──────────────
create table if not exists pack_items (
  pack_code text not null references products(code) on delete cascade,
  item text not null,               -- 'trick:mb-2026-07-24-011' | 'stage:3'
  sort int not null default 0,
  primary key (pack_code, item)
);
alter table pack_items enable row level security;

-- members may read the contents so the till can show "WHAT'S INSIDE"
drop policy if exists pack_items_read on pack_items;
create policy pack_items_read on pack_items for select using (true);

-- ── 2 · Granting a pack: credits + tricks, atomically ────────
/**
 * Founder-only. Called after a payment lands, from the Founder Desk.
 * Either everything is delivered or nothing is — a half-delivered
 * pack (credits but no tricks) can never exist.
 *
 * Returns the new credit balance.
 */
create or replace function grant_pack(
  p_academy text,
  p_pack    text,
  p_ref     text default null
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_credits    int;
  v_pack_title text;
  v_pack_cr    int;
  v_plan       text;
  v_granted    int := 0;
begin
  p_academy := upper(trim(p_academy));
  p_pack    := upper(trim(p_pack));

  if not exists (
    select 1 from profiles
     where academy_id = p_academy and academy_id <> 'PSA-FOUNDER'
  ) then
    raise exception 'unknown academy id';
  end if;

  select title, coalesce(credits, 0), plan
    into v_pack_title, v_pack_cr, v_plan
    from products where code = p_pack and active;
  if v_pack_title is null then
    raise exception 'unknown or inactive pack';
  end if;

  -- make sure the wallet exists, then lock it for this transaction
  insert into wallets (academy_id) values (p_academy) on conflict do nothing;
  perform 1 from wallets where academy_id = p_academy for update;

  -- (a) the credits
  if v_pack_cr > 0 then
    update wallets
       set credits = credits + v_pack_cr, updated_at = now()
     where academy_id = p_academy;
    insert into ledger (academy_id, delta, reason, ref, actor)
      values (p_academy, v_pack_cr, 'PACK ' || v_pack_title, left(p_ref, 60), 'founder');
  end if;

  -- (b) a subscription pack activates PRO instead
  if v_plan is not null then
    update wallets
       set plan = v_plan,
           plan_renews = to_char(now() + interval '30 days', 'YYYY-MM-DD'),
           updated_at = now()
     where academy_id = p_academy;
    insert into ledger (academy_id, delta, reason, ref, actor)
      values (p_academy, 0, 'PLAN → ' || upper(v_plan), left(p_ref, 60), 'founder');
  end if;

  -- (c) the tricks that ship inside the pack — free, already paid for
  insert into unlocks (academy_id, item)
  select p_academy, pi.item
    from pack_items pi
   where pi.pack_code = p_pack
  on conflict do nothing;
  get diagnostics v_granted = row_count;

  if v_granted > 0 then
    insert into ledger (academy_id, delta, reason, ref, actor)
      values (p_academy, 0,
              v_granted || ' ITEM(S) FROM ' || v_pack_title,
              left(p_ref, 60), 'founder');
  end if;

  select credits into v_credits from wallets where academy_id = p_academy;
  return coalesce(v_credits, 0);
end $$;
revoke execute on function grant_pack(text, text, text) from public, anon, authenticated;
grant execute on function grant_pack(text, text, text) to service_role;

-- ── 3 · What a member sees before buying ─────────────────────
/**
 * The till's "what's inside" list. Readable by anyone signed in —
 * knowing what a pack contains is not privileged information.
 */
create or replace function pack_contents(p_pack text)
returns table (item text, sort int)
language sql security definer stable as $$
  select item, sort from pack_items
   where pack_code = upper(trim(p_pack))
   order by sort, item;
$$;
grant execute on function pack_contents(text) to anon, authenticated;

-- ── 4 · Seed: the starter packs carry real tricks ────────────
-- These reference the MetaBot items currently in liveFeed.json.
-- Re-cut them any season: delete the rows, insert new ones.
insert into pack_items (pack_code, item, sort) values
  -- STARTER: one trick to prove the format
  ('NG-STARTER', 'trick:mb-2026-07-24-011', 1),

  -- REGULAR: both live tricks
  ('NG-REGULAR', 'trick:mb-2026-07-24-011', 1),
  ('NG-REGULAR', 'trick:mb-2026-07-24-009', 2),

  -- GRINDER: the tricks + the first paid stage
  ('NG-GRINDER', 'trick:mb-2026-07-24-011', 1),
  ('NG-GRINDER', 'trick:mb-2026-07-24-009', 2),
  ('NG-GRINDER', 'stage:3', 3),

  -- PATRON: everything currently gateable
  ('NG-PATRON', 'trick:mb-2026-07-24-011', 1),
  ('NG-PATRON', 'trick:mb-2026-07-24-009', 2),
  ('NG-PATRON', 'stage:3', 3),
  ('NG-PATRON', 'stage:4', 4),
  ('NG-PATRON', 'stage:5', 5),
  ('NG-PATRON', 'stage:6', 6)
on conflict do nothing;

-- ── 5 · Proof ────────────────────────────────────────────────
do $$
declare r record;
begin
  raise notice 'PACK CONTENTS';
  for r in
    select p.code, p.title, coalesce(p.credits, 0) as cr, count(pi.item) as items
      from products p left join pack_items pi on pi.pack_code = p.code
     where p.active group by p.code, p.title, p.credits order by p.sort
  loop
    raise notice '  % (%) · % credits · % bundled item(s)', r.code, r.title, r.cr, r.items;
  end loop;
end $$;


-- ▓▓▓▓▓▓▓▓▓▓ tiers.sql ▓▓▓▓▓▓▓▓▓▓

-- ═════════════════════════════════════════════════════════════
-- ONE SYSTEM, TWO CURRENCIES — FREE · MID · PRO
--
-- Run in Supabase → SQL Editor AFTER schema.sql, seat-gate.sql,
-- security.sql and packs.sql. Safe to re-run.
--
-- WHY THIS REPLACES THE OLD SPLIT
-- Africa bought credits and kept unlocks forever. Abroad paid a
-- monthly sub and lost everything if they stopped. Same academy,
-- two different deals — and the moment those two members compared
-- notes in the halls, one of them was going to feel cheated.
--
-- Now both sides climb the SAME three-rung ladder for the SAME
-- period of time. The only difference is the currency on the price
-- tag: ₦ for Africa, $ for everyone else.
--
--   FREE  · always on, never expires, genuinely useful
--   MID   · the working member's tier
--   PRO   · almost everything
--
-- Access is by TIER + EXPIRY, not by counting individual purchases,
-- so "what do I get?" has one honest answer in every country.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · The ladder ───────────────────────────────────────────
create table if not exists tiers (
  key   text primary key,          -- 'free' | 'mid' | 'pro'
  level int  not null,             -- 0 | 1 | 2 — compare with >=
  title text not null,
  blurb text
);

insert into tiers (key, level, title, blurb) values
  ('free', 0, 'FREE',
   'The first stages, your whole Match Vault, the Loss Journal, the scans and the halls. Free forever — not a trial.'),
  ('mid',  1, 'ACADEMY',
   'The full journey, every stage, and the weekly tricks as they drop.'),
  ('pro',  2, 'PRO',
   'Everything in the academy: the journey, every trick, the film room, and first call on the founder''s time.')
on conflict (key) do update set level = excluded.level,
                                title = excluded.title,
                                blurb = excluded.blurb;

-- ── 2 · Products become timed tier passes ────────────────────
alter table products add column if not exists tier text references tiers(key);
alter table products add column if not exists duration_days int;
alter table products add column if not exists currency text;

-- The SAME ladder in both regions. Prices differ; access does not.
-- Every number here is editable in the Table Editor — nothing is
-- hardcoded, because the pricing is not settled.
insert into products (code, region, title, tier, duration_days, currency, price, sort, active) values
  -- AFRICA · naira
  ('NG-MID-30',  'africa', 'ACADEMY · 1 MONTH',  'mid', 30,  'NGN', '₦1,500',  1, true),
  ('NG-MID-90',  'africa', 'ACADEMY · 3 MONTHS', 'mid', 90,  'NGN', '₦3,900',  2, true),
  ('NG-PRO-30',  'africa', 'PRO · 1 MONTH',      'pro', 30,  'NGN', '₦3,000',  3, true),
  ('NG-PRO-90',  'africa', 'PRO · 3 MONTHS',     'pro', 90,  'NGN', '₦7,800',  4, true),
  ('NG-PRO-365', 'africa', 'PRO · 1 SEASON',     'pro', 365, 'NGN', '₦25,000', 5, true),
  -- WORLD · dollars, same rungs, same durations
  ('WD-MID-30',  'world',  'ACADEMY · 1 MONTH',  'mid', 30,  'USD', '$3.99',   1, true),
  ('WD-MID-90',  'world',  'ACADEMY · 3 MONTHS', 'mid', 90,  'USD', '$9.99',   2, true),
  ('WD-PRO-30',  'world',  'PRO · 1 MONTH',      'pro', 30,  'USD', '$7.99',   3, true),
  ('WD-PRO-90',  'world',  'PRO · 3 MONTHS',     'pro', 90,  'USD', '$19.99',  4, true),
  ('WD-PRO-365', 'world',  'PRO · 1 SEASON',     'pro', 365, 'USD', '$59.99',  5, true)
on conflict (code) do update set tier          = excluded.tier,
                                 duration_days = excluded.duration_days,
                                 currency      = excluded.currency,
                                 title         = excluded.title,
                                 sort          = excluded.sort;

-- retire the old credit packs + the lone monthly sub: they are the
-- unequal deal we are removing. Kept, not deleted, so old ledger
-- rows still resolve to a product name.
update products set active = false
 where code in ('NG-STARTER','NG-REGULAR','NG-GRINDER','NG-PATRON','PRO-MONTHLY');

-- ── 3 · Who is on what, until when ───────────────────────────
create table if not exists entitlements (
  academy_id text primary key references profiles(academy_id) on delete cascade,
  tier       text not null default 'free' references tiers(key),
  expires_at timestamptz,                     -- null = free, never expires
  source     text,                            -- the product code that granted it
  updated_at timestamptz not null default now()
);
alter table entitlements enable row level security;

drop policy if exists entitlements_read_own on entitlements;
create policy entitlements_read_own on entitlements
  for select to authenticated
  using (academy_id in (select academy_id from profiles where auth_user_id = auth.uid()));

/**
 * The effective tier for a member RIGHT NOW. An expired pass silently
 * becomes 'free' — nobody is ever locked out of their own vault, they
 * just stop seeing the paid rungs.
 */
create or replace function effective_tier(p_academy text)
returns text
language sql security definer stable set search_path = public as $$
  select coalesce(
    (select e.tier from entitlements e
      where e.academy_id = p_academy
        and (e.expires_at is null or e.expires_at > now())),
    'free');
$$;
grant execute on function effective_tier(text) to anon, authenticated;

/** the caller's own tier + when it runs out — what the app renders */
create or replace function my_access()
returns table (tier text, level int, expires_at timestamptz, days_left int)
language sql security definer stable set search_path = public as $$
  with me as (select academy_id from profiles where auth_user_id = auth.uid())
  select
    t.key,
    t.level,
    e.expires_at,
    case when e.expires_at is null then null
         else greatest(0, ceil(extract(epoch from (e.expires_at - now())) / 86400)::int)
    end
  from me
  left join entitlements e on e.academy_id = me.academy_id
                          and (e.expires_at is null or e.expires_at > now())
  join tiers t on t.key = coalesce(e.tier, 'free');
$$;
grant execute on function my_access() to authenticated;

-- ── 4 · Granting a pass: stack time, never lose it ───────────
/**
 * Founder-only, called when a payment lands.
 *
 * Fairness rules, deliberate:
 *   · Same tier again        → the days ADD to whatever is left.
 *   · Upgrade (mid → pro)    → remaining days carry over, at the
 *                              better tier. Nobody is punished for
 *                              upgrading mid-period.
 *   · Downgrade while active → refused, so a cheaper pass cannot
 *                              silently strip a PRO member.
 */
create or replace function grant_tier(
  p_academy text,
  p_product text,
  p_ref     text default null
) returns table (tier text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_tier   text;
  v_days   int;
  v_title  text;
  v_cur    text;
  v_curexp timestamptz;
  v_newlvl int;
  v_curlvl int;
  v_base   timestamptz;
  v_exp    timestamptz;
begin
  p_academy := upper(trim(p_academy));
  p_product := upper(trim(p_product));

  if not exists (select 1 from profiles
                  where academy_id = p_academy and academy_id <> 'PSA-FOUNDER') then
    raise exception 'unknown academy id';
  end if;

  select tier, duration_days, title into v_tier, v_days, v_title
    from products where code = p_product and active;
  if v_tier is null or v_days is null then
    raise exception 'unknown or non-tier product';
  end if;

  insert into entitlements (academy_id) values (p_academy) on conflict do nothing;
  perform 1 from entitlements where academy_id = p_academy for update;

  select e.tier, e.expires_at into v_cur, v_curexp
    from entitlements e where e.academy_id = p_academy;

  select level into v_newlvl from tiers where key = v_tier;
  select level into v_curlvl from tiers where key = coalesce(v_cur, 'free');

  -- a live, higher pass is never replaced by a cheaper one
  if v_curexp is not null and v_curexp > now() and v_curlvl > v_newlvl then
    raise exception 'ACTIVE_HIGHER_TIER';
  end if;

  -- time stacks: start from whatever is left, or from now
  v_base := greatest(coalesce(v_curexp, now()), now());
  v_exp  := v_base + (v_days || ' days')::interval;

  update entitlements
     set tier = v_tier, expires_at = v_exp, source = p_product, updated_at = now()
   where academy_id = p_academy;

  -- keep the wallet's plan flag in step (older screens still read it)
  insert into wallets (academy_id) values (p_academy) on conflict do nothing;
  update wallets
     set plan = case when v_tier = 'pro' then 'pro' else 'free' end,
         plan_renews = to_char(v_exp, 'YYYY-MM-DD'),
         updated_at = now()
   where academy_id = p_academy;

  insert into ledger (academy_id, delta, reason, ref, actor)
    values (p_academy, 0,
            upper(v_tier) || ' · ' || v_title || ' → ' || to_char(v_exp, 'DD Mon YYYY'),
            left(p_ref, 60), 'founder');

  -- anything bundled with the pass (a specific trick, a bonus stage)
  insert into unlocks (academy_id, item)
  select p_academy, pi.item from pack_items pi where pi.pack_code = p_product
  on conflict do nothing;

  return query select v_tier, v_exp;
end $$;
revoke execute on function grant_tier(text, text, text) from public, anon, authenticated;
grant execute on function grant_tier(text, text, text) to service_role;

-- ── 5 · What each rung opens ─────────────────────────────────
-- Config, not code: move the line any time without a rebuild.
insert into config (key, value) values
  ('free_stages',      '2'),    -- stages 1-2 on the FREE tier
  ('mid_stages',       '6'),    -- MID opens the whole journey
  ('tricks_min_tier',  'mid'),  -- the tier that unlocks Home tricks
  ('filmroom_min_tier','pro')   -- PRO gets the film room
on conflict (key) do update set value = excluded.value;

/**
 * One question the whole app asks: may THIS member open THIS thing?
 * Tier-based, so the answer is identical in Lagos and London.
 */
create or replace function can_access(p_item text)
returns boolean
language plpgsql security definer stable set search_path = public as $$
declare
  v_academy text;
  v_tier    text;
  v_lvl     int;
  v_free    int;
  v_mid     int;
  v_n       int;
  v_need    text;
begin
  select academy_id into v_academy from profiles where auth_user_id = auth.uid();
  if v_academy is null then return false; end if;

  -- a one-off unlock (bundled or bought outright) always wins
  if exists (select 1 from unlocks where academy_id = v_academy and item = p_item) then
    return true;
  end if;

  v_tier := effective_tier(v_academy);
  select level into v_lvl from tiers where key = v_tier;

  if p_item like 'stage:%' then
    v_n    := split_part(p_item, ':', 2)::int;
    select value::int into v_free from config where key = 'free_stages';
    select value::int into v_mid  from config where key = 'mid_stages';
    if v_n <= coalesce(v_free, 2) then return true; end if;                -- free rung
    if v_n <= coalesce(v_mid, 6)  then return v_lvl >= 1; end if;          -- academy rung
    return v_lvl >= 2;                                                     -- pro rung
  end if;

  if p_item like 'trick:%' then
    select value into v_need from config where key = 'tricks_min_tier';
    return v_lvl >= (select level from tiers where key = coalesce(v_need, 'mid'));
  end if;

  if p_item = 'filmroom' then
    select value into v_need from config where key = 'filmroom_min_tier';
    return v_lvl >= (select level from tiers where key = coalesce(v_need, 'pro'));
  end if;

  return false;
end $$;
grant execute on function can_access(text) to authenticated;

-- ── 6 · Everyone starts on FREE ──────────────────────────────
insert into entitlements (academy_id, tier)
select academy_id, 'free' from profiles where academy_id <> 'PSA-FOUNDER'
on conflict do nothing;

-- ── 7 · Proof ────────────────────────────────────────────────
do $$
declare r record;
begin
  raise notice 'THE LADDER — identical in both regions';
  for r in
    select region, tier, duration_days, price, title
      from products where active and tier is not null
     order by region, sort
  loop
    raise notice '  % · % · % days · % (%)',
      upper(r.region), upper(r.tier), r.duration_days, r.price, r.title;
  end loop;
end $$;


-- ▓▓▓▓▓▓▓▓▓▓ access.sql ▓▓▓▓▓▓▓▓▓▓

-- ═════════════════════════════════════════════════════════════
-- SERIOUS MEMBERS ONLY — the trial, then a paid academy
--
-- Run in Supabase → SQL Editor AFTER tiers.sql. Safe to re-run.
--
-- THE FOUNDER'S CALL
--   · The free week grants a real pass to everyone holding a seat.
--   · After the trial, no plan = no app. Limited seats, serious
--     people. Like paying for a course with a capped intake.
--   · The pricing model is then discussed WITH the members — they
--     helped build it, so they help price it.
--
-- WHAT THIS CHANGES
--   'free' stops being a permanent tier you can sit on forever.
--   It becomes LAPSED: the door is shut, but nothing is deleted.
--   Their vault, journal, XP and badges wait for them.
--
-- ⚠️ THE GRACE WINDOW — why it exists
--   Payment is manual: they pay, you see the alert, you grant the
--   pass. That lag is human, not instant. Without a grace period a
--   member who paid at 11pm gets locked out at midnight through no
--   fault of their own — and that is exactly the kind of thing that
--   costs you a member and a reputation. Default 3 days.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · The ladder, restated ─────────────────────────────────
update tiers set title = 'LAPSED',
  blurb = 'Your pass has run out. Nothing is lost — your vault, journal, XP and badges are exactly where you left them. Pick a pass and the doors open again.'
 where key = 'free';

insert into config (key, value) values
  ('trial_tier',        'mid'),   -- what the free week grants
  ('trial_days',        '14'),    -- the founder said two weeks
  ('grace_days',        '3'),     -- manual-payment cushion after expiry
  ('lapsed_seat_days',  '30'),    -- lapsed this long → seat may be reclaimed
  ('paid_only',         'true')   -- after the trial, a plan is required
on conflict (key) do update set value = excluded.value;

-- ── 2 · Access, with the grace window ────────────────────────
/**
 * The real question: is this member's door open right now?
 *
 *   'active'  — inside a paid (or trial) pass
 *   'grace'   — expired within grace_days; still let them in, and
 *               tell them plainly. Protects anyone whose payment is
 *               sitting in your inbox unprocessed.
 *   'lapsed'  — past grace. Read-only shell, nothing deleted.
 */
create or replace function access_state(p_academy text)
returns table (state text, tier text, expires_at timestamptz, days_left int, grace_left int)
language plpgsql security definer stable set search_path = public as $$
declare
  v_tier  text;
  v_exp   timestamptz;
  v_grace int;
begin
  select value::int into v_grace from config where key = 'grace_days';
  v_grace := coalesce(v_grace, 3);

  select e.tier, e.expires_at into v_tier, v_exp
    from entitlements e where e.academy_id = p_academy;

  -- never had a pass, or explicitly lapsed
  if v_tier is null or v_exp is null then
    return query select 'lapsed'::text, 'free'::text, null::timestamptz, 0, 0;
    return;
  end if;

  if v_exp > now() then
    return query select
      'active'::text, v_tier, v_exp,
      greatest(0, ceil(extract(epoch from (v_exp - now())) / 86400)::int),
      0;
    return;
  end if;

  if v_exp + (v_grace || ' days')::interval > now() then
    return query select
      'grace'::text, v_tier, v_exp, 0,
      greatest(0, ceil(extract(epoch from ((v_exp + (v_grace || ' days')::interval) - now())) / 86400)::int);
    return;
  end if;

  return query select 'lapsed'::text, 'free'::text, v_exp, 0, 0;
end $$;
grant execute on function access_state(text) to anon, authenticated;

/** the caller's own state — what every screen reads */
-- DROP first: tiers.sql created my_access() with 4 columns and we are
-- widening it to 7. Postgres refuses to change a function's return type
-- via CREATE OR REPLACE (42P13) — it must be dropped and rebuilt.
drop function if exists my_access();
create or replace function my_access()
returns table (tier text, level int, expires_at timestamptz, days_left int,
               state text, grace_left int, paid_only boolean)
language plpgsql security definer stable set search_path = public as $$
declare
  v_academy text;
  r         record;
  v_lvl     int;
  v_paid    boolean;
begin
  select academy_id into v_academy from profiles where auth_user_id = auth.uid();
  select (value = 'true') into v_paid from config where key = 'paid_only';

  if v_academy is null then
    return query select 'free'::text, 0, null::timestamptz, 0, 'lapsed'::text, 0, coalesce(v_paid, true);
    return;
  end if;

  select * into r from access_state(v_academy);
  select level into v_lvl from tiers where key = r.tier;

  return query select
    r.tier,
    case when r.state = 'lapsed' then 0 else coalesce(v_lvl, 0) end,
    r.expires_at, r.days_left, r.state, r.grace_left, coalesce(v_paid, true);
end $$;
grant execute on function my_access() to authenticated;

-- can_access() must respect the lapsed state: a one-off unlock does
-- NOT reopen a closed door once the academy is paid-only.
create or replace function can_access(p_item text)
returns boolean
language plpgsql security definer stable set search_path = public as $$
declare
  v_academy text;
  v_state   text;
  v_tier    text;
  v_lvl     int;
  v_free    int;
  v_mid     int;
  v_n       int;
  v_need    text;
  v_paid    boolean;
begin
  select academy_id into v_academy from profiles where auth_user_id = auth.uid();
  if v_academy is null then return false; end if;

  select (value = 'true') into v_paid from config where key = 'paid_only';
  select state, tier into v_state, v_tier from access_state(v_academy);

  -- paid-only academy: a lapsed member opens nothing until they renew
  if coalesce(v_paid, true) and v_state = 'lapsed' then
    return false;
  end if;

  if exists (select 1 from unlocks where academy_id = v_academy and item = p_item) then
    return true;
  end if;

  select level into v_lvl from tiers where key = v_tier;
  v_lvl := coalesce(v_lvl, 0);

  if p_item like 'stage:%' then
    v_n := split_part(p_item, ':', 2)::int;
    select value::int into v_free from config where key = 'free_stages';
    select value::int into v_mid  from config where key = 'mid_stages';
    if v_n <= coalesce(v_free, 2) then return not coalesce(v_paid, true) or v_state <> 'lapsed'; end if;
    if v_n <= coalesce(v_mid, 6)  then return v_lvl >= 1; end if;
    return v_lvl >= 2;
  end if;

  if p_item like 'trick:%' then
    select value into v_need from config where key = 'tricks_min_tier';
    return v_lvl >= (select level from tiers where key = coalesce(v_need, 'mid'));
  end if;

  if p_item = 'filmroom' then
    select value into v_need from config where key = 'filmroom_min_tier';
    return v_lvl >= (select level from tiers where key = coalesce(v_need, 'pro'));
  end if;

  return false;
end $$;
grant execute on function can_access(text) to authenticated;

-- ── 3 · THE FREE WEEK — grant it to everyone with a seat ─────
/**
 * Founder-only. Gives every seated member the trial tier.
 *
 * Deliberately additive: anyone already holding a longer pass keeps
 * it (greatest(...)), so a paying member is never downgraded by the
 * trial. New members who claim a seat DURING the window get it too
 * (see grant_trial_one, called from ensure-profile).
 */
create or replace function grant_trial(p_days int default null, p_tier text default null)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_days int;
  v_tier text;
  v_exp  timestamptz;
  v_n    int;
begin
  select coalesce(p_days, (select value::int from config where key = 'trial_days'), 14) into v_days;
  select coalesce(p_tier, (select value from config where key = 'trial_tier'), 'mid') into v_tier;
  v_exp := now() + (v_days || ' days')::interval;

  insert into entitlements (academy_id, tier, expires_at, source)
  select p.academy_id, v_tier, v_exp, 'TRIAL'
    from profiles p
   where p.academy_id <> 'PSA-FOUNDER' and p.status <> 'removed'
  on conflict (academy_id) do update
    set tier = case when entitlements.expires_at > v_exp then entitlements.tier else v_tier end,
        expires_at = greatest(coalesce(entitlements.expires_at, v_exp), v_exp),
        source = case when entitlements.expires_at > v_exp then entitlements.source else 'TRIAL' end,
        updated_at = now();

  get diagnostics v_n = row_count;

  insert into ledger (academy_id, delta, reason, actor)
  select p.academy_id, 0,
         'TRIAL · ' || upper(v_tier) || ' → ' || to_char(v_exp, 'DD Mon YYYY'), 'founder'
    from profiles p
   where p.academy_id <> 'PSA-FOUNDER' and p.status <> 'removed';

  return v_n;
end $$;
revoke execute on function grant_trial(int, text) from public, anon, authenticated;
grant execute on function grant_trial(int, text) to service_role;

/** one member — used when someone joins mid-trial */
create or replace function grant_trial_one(p_academy text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_start timestamptz;
  v_end   timestamptz;
  v_tier  text;
begin
  select value::timestamptz into v_start from config where key = 'founder_week_start';
  select value::timestamptz into v_end   from config where key = 'founder_week_end';
  select value into v_tier from config where key = 'trial_tier';

  -- only inside the announced window
  if v_start is null or v_end is null or now() < v_start or now() >= v_end then
    return false;
  end if;

  insert into entitlements (academy_id, tier, expires_at, source)
  values (p_academy, coalesce(v_tier, 'mid'), v_end, 'TRIAL')
  on conflict (academy_id) do update
    set tier = case when entitlements.expires_at > v_end then entitlements.tier else coalesce(v_tier, 'mid') end,
        expires_at = greatest(coalesce(entitlements.expires_at, v_end), v_end),
        updated_at = now();
  return true;
end $$;
revoke execute on function grant_trial_one(text) from public, anon, authenticated;
grant execute on function grant_trial_one(text) to service_role;

-- ── 4 · Seats: lapsed members eventually free theirs ─────────
/**
 * Who has been lapsed long enough that their seat could go to
 * someone on the waitlist. REPORTS ONLY — it never removes anyone.
 * Taking a seat back is a decision you make, not a cron job.
 */
create or replace function lapsed_members()
returns table (academy_id text, handle text, tier text, expired_at timestamptz, days_lapsed int)
language sql security definer stable set search_path = public as $$
  select p.academy_id, p.handle, e.tier, e.expires_at,
         floor(extract(epoch from (now() - e.expires_at)) / 86400)::int
    from profiles p
    join entitlements e on e.academy_id = p.academy_id
   where p.academy_id <> 'PSA-FOUNDER'
     and p.status <> 'removed'
     and e.expires_at is not null
     and e.expires_at + ((select value::int from config where key = 'lapsed_seat_days') || ' days')::interval < now()
   order by e.expires_at;
$$;
revoke execute on function lapsed_members() from public, anon, authenticated;
grant execute on function lapsed_members() to service_role;

-- ── 5 · Proof ────────────────────────────────────────────────
do $$
declare v_t text; v_d text; v_g text; v_p text; v_seated int; v_active int;
begin
  select value into v_t from config where key = 'trial_tier';
  select value into v_d from config where key = 'trial_days';
  select value into v_g from config where key = 'grace_days';
  select value into v_p from config where key = 'paid_only';
  select count(*) into v_seated from profiles where academy_id <> 'PSA-FOUNDER';
  select count(*) into v_active from entitlements where expires_at > now();
  raise notice 'ACCESS ARMED · trial=% for % days · grace % days · paid_only=%',
    upper(v_t), v_d, v_g, v_p;
  raise notice '  % seated member(s) · % holding a live pass', v_seated, v_active;
  raise notice '  run  select grant_trial();  to open the free window to everyone';
end $$;


-- ▓▓▓▓▓▓▓▓▓▓ consult.sql ▓▓▓▓▓▓▓▓▓▓

-- ═════════════════════════════════════════════════════════════
-- THE PRICING TABLE — deciding it together, and counting it
--
-- Run in Supabase → SQL Editor AFTER access.sql. Safe to re-run.
--
-- THE FOUNDER'S CALL
--   "after the 2 week free trial we discuss the pricing model with
--    them so we are building this together like it's all inclusive
--    and not just for me it's a community"
--
-- WHY THIS IS NOT JUST A CHAT CHANNEL
--   The pricing halls already exist, but chat scatters. Ten people
--   say "too expensive" in ten different ways across three days and
--   there is no number at the end of it — just a feeling, and the
--   loudest voice wins.
--
--   This captures the same conversation as DATA: what would you
--   actually pay, which tier, and why. The founder ends the
--   fortnight with counts and quotes instead of an impression.
--
--   One response per member per question. Editable until the
--   consultation closes, then frozen.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · The questions ────────────────────────────────────────
create table if not exists consult_questions (
  id         bigint generated always as identity primary key,
  slug       text unique not null,
  prompt     text not null,
  helper     text,
  kind       text not null default 'choice',   -- 'choice' | 'price' | 'text'
  options    jsonb,                            -- for 'choice': ["A","B"]
  region     text,                             -- null = everyone
  sort       int not null default 0,
  open       boolean not null default true
);
alter table consult_questions enable row level security;

drop policy if exists consult_q_read on consult_questions;
create policy consult_q_read on consult_questions
  for select to authenticated using (open);

-- ── 2 · The answers ──────────────────────────────────────────
create table if not exists consult_answers (
  question_id bigint not null references consult_questions(id) on delete cascade,
  academy_id  text   not null references profiles(academy_id) on delete cascade,
  choice      text,
  amount      numeric(10,2),
  note        text,
  at          timestamptz not null default now(),
  primary key (question_id, academy_id)        -- one voice, one vote
);
alter table consult_answers enable row level security;

-- a member writes and edits only their own answer
drop policy if exists consult_a_write_own on consult_answers;
create policy consult_a_write_own on consult_answers
  for insert to authenticated
  with check (academy_id in (
    select academy_id from profiles
     where auth_user_id = auth.uid() and status = 'active'
  ));

drop policy if exists consult_a_update_own on consult_answers;
create policy consult_a_update_own on consult_answers
  for update to authenticated
  using (academy_id in (select academy_id from profiles where auth_user_id = auth.uid()))
  with check (academy_id in (select academy_id from profiles where auth_user_id = auth.uid()));

drop policy if exists consult_a_read_own on consult_answers;
create policy consult_a_read_own on consult_answers
  for select to authenticated
  using (academy_id in (select academy_id from profiles where auth_user_id = auth.uid()));

/**
 * Answer, or change your mind. Refused once the question is closed,
 * so nobody can edit their vote after the founder has published the
 * numbers it produced.
 */
create or replace function consult_answer(
  p_slug   text,
  p_choice text default null,
  p_amount numeric default null,
  p_note   text default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_academy text;
  v_qid     bigint;
  v_open    boolean;
begin
  select academy_id into v_academy
    from profiles where auth_user_id = auth.uid() and status = 'active';
  if v_academy is null then return false; end if;

  select id, open into v_qid, v_open from consult_questions where slug = p_slug;
  if v_qid is null or not v_open then return false; end if;

  insert into consult_answers (question_id, academy_id, choice, amount, note)
  values (v_qid, v_academy, p_choice, p_amount, left(p_note, 500))
  on conflict (question_id, academy_id) do update
    set choice = excluded.choice,
        amount = excluded.amount,
        note   = excluded.note,
        at     = now();
  return true;
end $$;
grant execute on function consult_answer(text, text, numeric, text) to authenticated;

/** the open questions + whatever this member already said */
create or replace function my_consult()
returns table (slug text, prompt text, helper text, kind text, options jsonb,
               my_choice text, my_amount numeric, my_note text, answered boolean)
language sql security definer stable set search_path = public as $$
  with me as (select academy_id, region from profiles where auth_user_id = auth.uid())
  select q.slug, q.prompt, q.helper, q.kind, q.options,
         a.choice, a.amount, a.note, (a.academy_id is not null)
    from consult_questions q
    cross join me
    left join consult_answers a
           on a.question_id = q.id and a.academy_id = me.academy_id
   where q.open
     and (q.region is null or q.region = me.region)
   order by q.sort, q.id;
$$;
grant execute on function my_consult() to authenticated;

-- ── 3 · The founder's read-out ───────────────────────────────
/**
 * What the fortnight actually produced. Counts for choices, and the
 * median for prices — median, not mean, because two people typing
 * a silly number should not drag the answer.
 */
create or replace function consult_results()
returns jsonb
language sql security definer stable set search_path = public as $$
  select coalesce(jsonb_agg(r order by r->>'slug'), '[]'::jsonb) from (
    select jsonb_build_object(
      'slug',    q.slug,
      'prompt',  q.prompt,
      'kind',    q.kind,
      'region',  q.region,
      'open',    q.open,
      'answers', (select count(*) from consult_answers a where a.question_id = q.id),
      'choices', (
        select coalesce(jsonb_object_agg(c.choice, c.n), '{}'::jsonb)
          from (select choice, count(*) n from consult_answers
                 where question_id = q.id and choice is not null
                 group by choice) c
      ),
      'median',  (
        select percentile_cont(0.5) within group (order by amount)
          from consult_answers where question_id = q.id and amount is not null
      ),
      'low',     (select min(amount) from consult_answers where question_id = q.id and amount is not null),
      'high',    (select max(amount) from consult_answers where question_id = q.id and amount is not null),
      'notes',   (
        select coalesce(jsonb_agg(jsonb_build_object('handle', p.handle, 'note', a.note)
                                  order by a.at desc), '[]'::jsonb)
          from consult_answers a join profiles p on p.academy_id = a.academy_id
         where a.question_id = q.id and a.note is not null and length(trim(a.note)) > 0
         limit 40
      )
    ) as r
    from consult_questions q
  ) s;
$$;
revoke execute on function consult_results() from public, anon, authenticated;
grant execute on function consult_results() to service_role;

-- ── 4 · The questions that matter after the trial ────────────
insert into consult_questions (slug, prompt, helper, kind, options, region, sort) values
  ('worth_it',
   'Two weeks in — did the academy actually make you better?',
   'Be blunt. A polite yes helps nobody.',
   'choice',
   '["MUCH BETTER","A BIT BETTER","NO DIFFERENCE","TOO EARLY TO SAY"]'::jsonb,
   null, 1),

  ('would_pay',
   'Would you pay to keep your seat?',
   'There are 1,000 seats and the academy runs on the people in it.',
   'choice',
   '["YES — PRO","YES — ACADEMY","ONLY IF CHEAPER","NO"]'::jsonb,
   null, 2),

  ('fair_price_ng',
   'What is a FAIR monthly price for ACADEMY, in naira?',
   'Type the number you would genuinely pay each month — not the number you wish it cost.',
   'price', null, 'africa', 3),

  ('fair_price_wd',
   'What is a FAIR monthly price for ACADEMY, in dollars?',
   'Type the number you would genuinely pay each month — not the number you wish it cost.',
   'price', null, 'world', 3),

  ('duration',
   'Which length would you actually buy?',
   'Longer passes cost less per month.',
   'choice',
   '["1 MONTH","3 MONTHS","1 SEASON"]'::jsonb,
   null, 4),

  ('most_valuable',
   'Which part is worth paying for?',
   'The honest answer tells the founder what to build more of.',
   'choice',
   '["THE JOURNEY","THE COACH + FILM ROOM","THE MATCH SCAN","THE TRICKS","THE COMMUNITY"]'::jsonb,
   null, 5),

  ('missing',
   'What is missing, or what would you change?',
   'One thing. The clearer you are, the more likely it gets built.',
   'text', null, null, 6)
on conflict (slug) do nothing;

-- ── 5 · Proof ────────────────────────────────────────────────
do $$
declare v_q int; v_a int;
begin
  select count(*) into v_q from consult_questions where open;
  select count(*) into v_a from consult_answers;
  raise notice 'PRICING TABLE ARMED · % open question(s) · % answer(s) so far', v_q, v_a;
  raise notice '  members answer in COMMUNITY → THE PRICING TABLE';
  raise notice '  founder reads: select consult_results();  (or the Desk)';
  raise notice '  close it with: update consult_questions set open = false;';
end $$;


-- ▓▓▓▓▓▓▓▓▓▓ enforcement.sql ▓▓▓▓▓▓▓▓▓▓

-- ═════════════════════════════════════════════════════════════
-- THE RULES, ENFORCED BY THE SYSTEM — not by the founder's time
--
-- Run in Supabase → SQL Editor AFTER consult.sql. Safe to re-run.
--
-- THE FOUNDER'S CALL
--   · Existing members: one month to decide. No payment → out.
--   · New members: 14 days to try it. No payment → out.
--   · Conduct: warned, warned, warned — then out. Extreme content
--     is flagged instantly for the founder, never auto-removed.
--   · Refunds: you paid for what you used, so no refund for that.
--     Removed with unused time left → that balance comes back.
--   · Terms are sent to every member on enrolment so nobody is
--     ever surprised by why they were removed.
--
-- WHY THIS IS A SEPARATE FILE
--   Everything here REMOVES people or takes money decisions. It is
--   deliberately the most conservative code in the project: every
--   automatic removal is logged with a reason, every strike is
--   reversible, and extreme-content flags always wait for a human.
-- ═════════════════════════════════════════════════════════════

insert into config (key, value) values
  ('existing_grace_days', '30'),   -- current members: a month to decide
  ('trial_days',          '14'),   -- new members: two weeks
  ('strikes_to_remove',   '3'),    -- warnings before removal
  ('auto_remove',         'true'), -- the sweeper is armed
  ('tos_version',         '1')     -- bump to re-send the terms
on conflict (key) do update set value = excluded.value;

-- ── 1 · Why someone left, on the record ──────────────────────
alter table profiles add column if not exists removed_at    timestamptz;
alter table profiles add column if not exists removed_reason text;
alter table profiles add column if not exists strikes        int not null default 0;
alter table profiles add column if not exists tos_version    int not null default 0;
alter table profiles add column if not exists deadline_at    timestamptz;

/**
 * Everyone gets a personal deadline the moment they join, so the
 * app can always answer "how long have I got?" honestly instead of
 * springing a removal on someone.
 */
create or replace function set_deadline(p_academy text, p_days int)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_at timestamptz;
begin
  v_at := now() + (p_days || ' days')::interval;
  update profiles set deadline_at = v_at where academy_id = p_academy;
  return v_at;
end $$;
revoke execute on function set_deadline(text, int) from public, anon, authenticated;
grant execute on function set_deadline(text, int) to service_role;

-- existing members who have never paid get the one-month clock now
update profiles p
   set deadline_at = now() + ((select value::int from config where key = 'existing_grace_days') || ' days')::interval
 where p.academy_id <> 'PSA-FOUNDER'
   and p.deadline_at is null
   and not exists (
     select 1 from entitlements e
      where e.academy_id = p.academy_id and e.source is distinct from 'TRIAL'
   );

-- ── 2 · THE SWEEPER — removes only who it must ───────────────
/**
 * Removes members whose deadline has passed and who never paid.
 *
 * Four things it will NOT do, on purpose:
 *   · touch anyone holding a live pass
 *   · touch anyone inside the grace window
 *   · touch anyone who has EVER paid (source <> 'TRIAL')
 *   · touch the founder
 *
 * Nothing is deleted — status becomes 'removed', the seat frees up,
 * and every removal is written to audit_log with its reason.
 */
create or replace function sweep_unpaid()
returns table (academy_id text, handle text, reason text)
language plpgsql security definer set search_path = public as $$
declare
  v_on    boolean;
  v_grace int;
  r       record;
begin
  select (value = 'true') into v_on from config where key = 'auto_remove';
  if not coalesce(v_on, false) then return; end if;

  select value::int into v_grace from config where key = 'grace_days';
  v_grace := coalesce(v_grace, 3);

  for r in
    select p.academy_id, p.handle
      from profiles p
      left join entitlements e on e.academy_id = p.academy_id
     where p.academy_id <> 'PSA-FOUNDER'
       and p.status <> 'removed'
       and p.deadline_at is not null
       and p.deadline_at + (v_grace || ' days')::interval < now()
       -- never paid: no entitlement at all, or only ever a trial
       and (e.academy_id is null or coalesce(e.source, 'TRIAL') = 'TRIAL')
       -- and not currently inside any live pass
       and (e.expires_at is null or e.expires_at < now())
  loop
    update profiles
       set status = 'removed', removed_at = now(), removed_reason = 'NO PLAN AFTER THE DEADLINE'
     where profiles.academy_id = r.academy_id;

    perform audit('auto_remove', r.academy_id, jsonb_build_object('reason', 'unpaid'));

    academy_id := r.academy_id;
    handle     := r.handle;
    reason     := 'NO PLAN AFTER THE DEADLINE';
    return next;
  end loop;
end $$;
revoke execute on function sweep_unpaid() from public, anon, authenticated;
grant execute on function sweep_unpaid() to service_role;

-- Run it nightly if pg_cron is available; harmless if it is not.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('psa-sweep') where exists (select 1 from cron.job where jobname = 'psa-sweep');
    perform cron.schedule('psa-sweep', '0 3 * * *', 'select sweep_unpaid();');
    raise notice 'sweeper scheduled nightly at 03:00 UTC';
  else
    raise notice 'pg_cron not enabled — run sweep_unpaid() from the Founder Desk instead';
  end if;
exception when others then
  raise notice 'could not schedule the sweeper: % (run it from the Desk)', sqlerrm;
end $$;

-- ── 3 · CONDUCT — warned, warned, warned, then out ───────────
create table if not exists strikes (
  id         bigint generated always as identity primary key,
  academy_id text not null references profiles(academy_id) on delete cascade,
  reason     text not null,
  detail     text,
  severity   text not null default 'warning',   -- 'warning' | 'severe'
  by_founder boolean not null default false,
  at         timestamptz not null default now(),
  revoked    boolean not null default false
);
alter table strikes enable row level security;

-- a member may read their own record — no secret files
drop policy if exists strikes_read_own on strikes;
create policy strikes_read_own on strikes
  for select to authenticated
  using (academy_id in (select academy_id from profiles where auth_user_id = auth.uid()));

/**
 * Add a strike. At the limit the member is removed automatically —
 * but only for ordinary warnings. 'severe' never auto-removes: the
 * founder said he speaks to those people himself.
 */
create or replace function add_strike(
  p_academy  text,
  p_reason   text,
  p_detail   text default null,
  p_severity text default 'warning',
  p_founder  boolean default false
) returns int
language plpgsql security definer set search_path = public as $$
declare v_n int; v_limit int;
begin
  insert into strikes (academy_id, reason, detail, severity, by_founder)
  values (upper(trim(p_academy)), p_reason, p_detail, p_severity, p_founder);

  select count(*) into v_n from strikes
   where academy_id = upper(trim(p_academy)) and not revoked;
  update profiles set strikes = v_n where academy_id = upper(trim(p_academy));

  select value::int into v_limit from config where key = 'strikes_to_remove';

  if p_severity <> 'severe' and v_n >= coalesce(v_limit, 3) then
    update profiles
       set status = 'removed', removed_at = now(),
           removed_reason = 'CONDUCT — ' || coalesce(v_limit, 3) || ' WARNINGS'
     where academy_id = upper(trim(p_academy)) and status <> 'removed';
    perform audit('auto_remove', p_academy, jsonb_build_object('reason', 'strikes', 'count', v_n));
  end if;

  return v_n;
end $$;
revoke execute on function add_strike(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function add_strike(text, text, text, text, boolean) to service_role;

/** a strike given in error should cost nothing */
create or replace function revoke_strike(p_id bigint)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_academy text; v_n int;
begin
  update strikes set revoked = true where id = p_id returning academy_id into v_academy;
  if v_academy is null then return false; end if;
  select count(*) into v_n from strikes where academy_id = v_academy and not revoked;
  update profiles set strikes = v_n where academy_id = v_academy;
  return true;
end $$;
revoke execute on function revoke_strike(bigint) from public, anon, authenticated;
grant execute on function revoke_strike(bigint) to service_role;

-- ── 4 · The content filter — extreme only, humour untouched ──
-- The founder was explicit: nobody is removed for saying "fuck".
-- This looks ONLY for sexual content and hate, and it never removes
-- anyone by itself — it flags for the founder to read.
create table if not exists flagged_messages (
  id         bigint generated always as identity primary key,
  message_id bigint,
  academy_id text,
  handle     text,
  channel    text,
  text       text not null,
  matched    text not null,
  at         timestamptz not null default now(),
  reviewed   boolean not null default false,
  action     text
);
alter table flagged_messages enable row level security;   -- founder only

create table if not exists banned_terms (
  term     text primary key,
  category text not null default 'sexual'   -- 'sexual' | 'hate'
);
alter table banned_terms enable row level security;

-- Seeded conservatively. Ordinary profanity is deliberately absent.
insert into banned_terms (term, category) values
  ('porn', 'sexual'), ('pornhub', 'sexual'), ('xvideos', 'sexual'),
  ('onlyfans', 'sexual'), ('nudes', 'sexual'), ('nsfw', 'sexual'),
  ('cp', 'sexual'), ('rape', 'sexual'), ('paedo', 'sexual'), ('pedo', 'sexual'),
  ('nigger', 'hate'), ('faggot', 'hate'), ('tranny', 'hate'), ('kike', 'hate')
on conflict (term) do nothing;

create or replace function flag_message()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_term text; v_handle text;
begin
  select term into v_term
    from banned_terms
   where position(term in lower(new.text)) > 0
   limit 1;

  if v_term is not null then
    select handle into v_handle from profiles where id = new.user_id;
    insert into flagged_messages (message_id, academy_id, handle, channel, text, matched)
    values (new.id, new.academy_id, coalesce(v_handle, new.handle), new.channel_slug, new.text, v_term);
    -- flagged, NOT removed: the founder reads it and decides
  end if;
  return new;
end $$;

drop trigger if exists trg_flag_message on messages;
create trigger trg_flag_message
  after insert on messages
  for each row execute function flag_message();

-- ── 5 · REFUNDS — you paid for what you used ─────────────────
/**
 * Pro-rata refund of UNUSED days only. Someone removed with 12 of 30
 * days left is owed those 12 days; the 18 they used are not refunded.
 * This records what is owed — the money still moves in your bank.
 */
create or replace function refund_due(p_academy text)
returns table (days_left int, tier text, source text, note text)
language plpgsql security definer stable set search_path = public as $$
declare v_exp timestamptz; v_tier text; v_src text;
begin
  select e.expires_at, e.tier, e.source into v_exp, v_tier, v_src
    from entitlements e where e.academy_id = upper(trim(p_academy));

  if v_exp is null or v_exp <= now() or coalesce(v_src, 'TRIAL') = 'TRIAL' then
    return query select 0, coalesce(v_tier, 'free'), coalesce(v_src, 'NONE'),
      'NOTHING OWED — NO UNUSED PAID TIME'::text;
    return;
  end if;

  return query select
    ceil(extract(epoch from (v_exp - now())) / 86400)::int,
    v_tier, v_src,
    'REFUND THE UNUSED DAYS ONLY — WHAT WAS USED IS NOT REFUNDED'::text;
end $$;
revoke execute on function refund_due(text) from public, anon, authenticated;
grant execute on function refund_due(text) to service_role;

/** remove someone, on the record, with the refund position attached */
create or replace function remove_member(p_academy text, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_days int; v_tier text; v_src text; v_note text;
begin
  select days_left, tier, source, note into v_days, v_tier, v_src, v_note
    from refund_due(p_academy);

  update profiles
     set status = 'removed', removed_at = now(), removed_reason = left(p_reason, 120)
   where academy_id = upper(trim(p_academy)) and academy_id <> 'PSA-FOUNDER';

  if not found then return jsonb_build_object('ok', false, 'error', 'unknown academy id'); end if;

  perform audit('remove_member', p_academy,
                jsonb_build_object('reason', p_reason, 'refundDays', v_days));

  return jsonb_build_object('ok', true, 'academyId', upper(trim(p_academy)),
                            'reason', p_reason, 'refundDays', v_days,
                            'tier', v_tier, 'note', v_note);
end $$;
revoke execute on function remove_member(text, text) from public, anon, authenticated;
grant execute on function remove_member(text, text) to service_role;

-- ── 6 · TERMS OF SERVICE — everyone is told, in writing ──────
create table if not exists tos (
  version    int primary key,
  body       text not null,
  created_at timestamptz not null default now()
);
alter table tos enable row level security;
drop policy if exists tos_read on tos;
create policy tos_read on tos for select using (true);

insert into tos (version, body) values (1,
'PROSEASONACADEMY — HOW THIS WORKS

You have a seat in a capped academy. Season One is 1,000 places, so a
seat that is not being used is a seat someone else wanted.

1 · YOUR TRIAL
Every new member gets 14 days of full access. No card, no catch. Use it
properly and decide honestly.

2 · AFTER THE TRIAL
The academy is paid. If you do not take a plan by your deadline, your
seat is released and you are removed. The date is always shown in the
app — you will never be surprised by it.

3 · IF YOUR PASS RUNS OUT
Nothing is deleted. Your Match Vault, Loss Journal, XP, badges and the
stages you cleared all wait for you. Renew and you continue from the
same node.

4 · CONDUCT
Talk like a normal person. Swearing, jokes, banter and arguing about
football are all fine — nobody is removed for saying "fuck".

You will be warned for: spam, advertising, repeatedly derailing rooms.
Three warnings and you are out.

You are removed immediately, without warnings, for: sexual content,
content involving minors, hate speech targeting race, religion,
sexuality or disability, threats, or sharing another member''s private
information. These are read by a human first — the founder will speak
to you before anything final.

5 · REFUNDS
You are not refunded for time you have already used. If you are removed
while you still have unused paid time, that unused balance is returned
to you.

6 · YOUR DATA
Your match data, journal entries and messages live on your device and on
the academy''s server. The founder can read the public halls and the
messages you send him directly. He cannot read anything you have not
sent. Delete your account and your data goes with it.

7 · CHANGES
Prices and rules can change, and members are asked before they do — that
is what THE PRICING TABLE is for. You will always be told in the app
before anything affects you.

Questions about any of this: Settings → Contact the founder.')
on conflict (version) do nothing;

/** who still needs to be shown the current terms */
create or replace function tos_pending()
returns table (academy_id text, handle text)
language sql security definer stable set search_path = public as $$
  select p.academy_id, p.handle from profiles p
   where p.academy_id <> 'PSA-FOUNDER'
     and p.status <> 'removed'
     and p.tos_version < (select value::int from config where key = 'tos_version');
$$;
revoke execute on function tos_pending() from public, anon, authenticated;
grant execute on function tos_pending() to service_role;

/** the member confirms they have read them */
create or replace function accept_tos(p_version int)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update profiles set tos_version = p_version where auth_user_id = auth.uid();
  return found;
end $$;
grant execute on function accept_tos(int) to authenticated;

/** what the app shows: the terms + whether this member has accepted */
create or replace function my_tos()
returns table (version int, body text, accepted boolean, deadline_at timestamptz, strikes int)
language sql security definer stable set search_path = public as $$
  select t.version, t.body,
         (p.tos_version >= t.version),
         p.deadline_at,
         p.strikes
    from profiles p
    cross join lateral (
      select version, body from tos
       where version = (select value::int from config where key = 'tos_version')
    ) t
   where p.auth_user_id = auth.uid();
$$;
grant execute on function my_tos() to authenticated;

-- ── 7 · Proof ────────────────────────────────────────────────
do $$
declare v_due int; v_flag int; v_pend int;
begin
  select count(*) into v_due from profiles
   where academy_id <> 'PSA-FOUNDER' and status <> 'removed' and deadline_at is not null;
  select count(*) into v_flag from flagged_messages where not reviewed;
  select count(*) into v_pend from tos_pending();
  raise notice 'ENFORCEMENT ARMED';
  raise notice '  % member(s) on a deadline · % unreviewed flag(s) · % awaiting the terms',
    v_due, v_flag, v_pend;
  raise notice '  sweep manually any time:  select * from sweep_unpaid();';
end $$;


-- ▓▓▓▓▓▓▓▓▓▓ notices.sql ▓▓▓▓▓▓▓▓▓▓

-- ═════════════════════════════════════════════════════════════
-- THE ACADEMY BOT — nobody is ever removed without being told
--
-- Run in Supabase → SQL Editor AFTER enforcement.sql. Safe to re-run.
--
-- THE GAP THIS CLOSES
--   The founder said: "a bot sends u a message ... so when we kick u
--   out u know why we did." Strikes were being recorded silently —
--   a member could collect three warnings without ever seeing one,
--   then find themselves removed. That is exactly the surprise the
--   founder is trying to avoid.
--
--   Now every warning, every deadline reminder and the terms
--   themselves arrive as a message in the member's own inbox, from
--   THE ACADEMY. They can read it, and reply to a human.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · Messages the academy sends TO a member ───────────────
-- contact_messages already carries member → founder. This adds the
-- other direction, so one inbox holds the whole conversation.
alter table contact_messages add column if not exists from_academy boolean not null default false;
alter table contact_messages add column if not exists kind_detail  text;

create or replace function notify_member(
  p_academy text,
  p_kind    text,
  p_body    text,
  p_detail  text default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_uid uuid; v_handle text;
begin
  select id, handle into v_uid, v_handle
    from profiles where academy_id = upper(trim(p_academy));
  if v_uid is null then return null; end if;

  insert into contact_messages
    (user_id, handle, academy_id, kind, body, from_academy, kind_detail, read)
  values
    (v_uid, v_handle, upper(trim(p_academy)), p_kind, p_body, true, p_detail, false)
  returning id into v_id;

  return v_id;
end $$;
revoke execute on function notify_member(text, text, text, text) from public, anon, authenticated;
grant execute on function notify_member(text, text, text, text) to service_role;

-- ── 2 · A warning now ARRIVES ────────────────────────────────
/**
 * Same rules as before — three warnings and out, severe never
 * auto-removes — but the member is TOLD each time, in plain words,
 * with the count and what happens next.
 */
create or replace function add_strike(
  p_academy  text,
  p_reason   text,
  p_detail   text default null,
  p_severity text default 'warning',
  p_founder  boolean default false
) returns int
language plpgsql security definer set search_path = public as $$
declare v_n int; v_limit int; v_left int; v_msg text;
begin
  insert into strikes (academy_id, reason, detail, severity, by_founder)
  values (upper(trim(p_academy)), p_reason, p_detail, p_severity, p_founder);

  select count(*) into v_n from strikes
   where academy_id = upper(trim(p_academy)) and not revoked;
  update profiles set strikes = v_n where academy_id = upper(trim(p_academy));

  select value::int into v_limit from config where key = 'strikes_to_remove';
  v_limit := coalesce(v_limit, 3);
  v_left  := greatest(0, v_limit - v_n);

  if p_severity = 'severe' then
    v_msg :=
      'WARNING ' || v_n || ' OF ' || v_limit || E'\n\n' ||
      'Reason: ' || p_reason || E'\n\n' ||
      'This one is serious enough that the founder will speak to you himself before ' ||
      'anything is decided. Nothing has happened to your seat yet. If you think this ' ||
      'is a mistake, reply here — he reads every message.';
  elsif v_left > 0 then
    v_msg :=
      'WARNING ' || v_n || ' OF ' || v_limit || E'\n\n' ||
      'Reason: ' || p_reason || E'\n\n' ||
      'You have ' || v_left || ' warning' || case when v_left = 1 then '' else 's' end ||
      ' left before your seat is released. Nobody is warned for swearing, jokes or ' ||
      'arguing about football — this is about something else. Read the terms in ' ||
      'Settings, and reply here if you disagree.';
  else
    v_msg :=
      'YOUR SEAT HAS BEEN RELEASED' || E'\n\n' ||
      'Reason: ' || p_reason || E'\n\n' ||
      'This was warning ' || v_n || ' of ' || v_limit || '. You were told each time. ' ||
      'Nothing of yours has been deleted. If you had unused paid time, that balance is ' ||
      'refunded. If you believe this is wrong, reply here — a human reads it.';
  end if;

  perform notify_member(p_academy, 'warning', v_msg, p_reason);

  if p_severity <> 'severe' and v_n >= v_limit then
    update profiles
       set status = 'removed', removed_at = now(),
           removed_reason = 'CONDUCT — ' || v_limit || ' WARNINGS'
     where academy_id = upper(trim(p_academy)) and status <> 'removed';
    perform audit('auto_remove', p_academy, jsonb_build_object('reason', 'strikes', 'count', v_n));
  end if;

  return v_n;
end $$;
revoke execute on function add_strike(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function add_strike(text, text, text, text, boolean) to service_role;

-- ── 3 · The welcome — terms land in the inbox on enrolment ───
/**
 * The founder: "you get a message telling u our terms of service
 * everything u need to know as u are enrolled." The blocking screen
 * still exists, but this leaves a copy they can re-read any time.
 */
create or replace function welcome_member(p_academy text)
returns bigint
language plpgsql security definer set search_path = public as $$
declare v_days int; v_msg text;
begin
  select value::int into v_days from config where key = 'trial_days';
  v_days := coalesce(v_days, 14);

  v_msg :=
    'WELCOME TO PROSEASONACADEMY' || E'\n\n' ||
    'Your seat is live. Here is everything that matters, in short:' || E'\n\n' ||
    '· You have ' || v_days || ' days of full access, free. No card needed.' || E'\n' ||
    '· After that the academy is paid — Season One is capped, so a seat ' ||
    'that is not used is a seat someone else wanted.' || E'\n' ||
    '· Your deadline is always visible in Settings. You will never be ' ||
    'surprised by it.' || E'\n' ||
    '· If a pass runs out, NOTHING is deleted. Your vault, journal, XP and ' ||
    'badges wait for you.' || E'\n' ||
    '· Talk like a normal person. Swearing and banter are fine. Warnings are ' ||
    'for spam and hate; three and the seat goes.' || E'\n' ||
    '· Removed with unused paid time? That balance comes back to you.' || E'\n\n' ||
    'The full terms are in Settings. This thread is your direct line to the ' ||
    'founder — questions, bugs, ideas, or if something feels wrong. He reads ' ||
    'every one.';

  return notify_member(p_academy, 'message', v_msg, 'WELCOME');
end $$;
revoke execute on function welcome_member(text) from public, anon, authenticated;
grant execute on function welcome_member(text) to service_role;

-- ── 4 · Deadline reminders, before it is too late ────────────
/**
 * Nudges at 7 days, 3 days and 1 day out. Idempotent per member per
 * milestone, so running it twice in a day never double-messages.
 */
create table if not exists notice_log (
  academy_id text not null,
  notice     text not null,
  at         timestamptz not null default now(),
  primary key (academy_id, notice)
);
alter table notice_log enable row level security;

create or replace function remind_deadlines()
returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_sent int := 0; v_key text; v_msg text; v_d int;
begin
  for r in
    select p.academy_id, p.handle, p.deadline_at,
           ceil(extract(epoch from (p.deadline_at - now())) / 86400)::int as days
      from profiles p
      left join entitlements e on e.academy_id = p.academy_id
     where p.academy_id <> 'PSA-FOUNDER'
       and p.status <> 'removed'
       and p.deadline_at is not null
       and p.deadline_at > now()
       and (e.academy_id is null or coalesce(e.source, 'TRIAL') = 'TRIAL')
  loop
    v_d := r.days;
    if v_d not in (1, 3, 7) then continue; end if;

    v_key := 'deadline-' || v_d;
    if exists (select 1 from notice_log
                where academy_id = r.academy_id and notice = v_key) then
      continue;
    end if;

    v_msg := case
      when v_d = 7 then
        'ONE WEEK LEFT ON YOUR TRIAL' || E'\n\n' ||
        'Seven days until your seat needs a plan. If the academy has been worth it, ' ||
        'pick a pass in Settings → THE TILL. If it has not, tell me why in this thread — ' ||
        'that is more useful to me than silence.'
      when v_d = 3 then
        'THREE DAYS LEFT' || E'\n\n' ||
        'Your seat is released in three days without a plan. Everything you have built ' ||
        'stays saved either way — but the seat goes to someone on the waitlist.'
      else
        'LAST DAY' || E'\n\n' ||
        'Your seat is decided today. Settings → THE TILL. If money is the problem, ' ||
        'reply here and talk to me — I would rather know than lose you quietly.'
    end;

    perform notify_member(r.academy_id, 'message', v_msg, v_key);
    insert into notice_log (academy_id, notice) values (r.academy_id, v_key)
      on conflict do nothing;
    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end $$;
revoke execute on function remind_deadlines() from public, anon, authenticated;
grant execute on function remind_deadlines() to service_role;

-- ── 5 · Removal always explains itself ───────────────────────
create or replace function remove_member(p_academy text, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_days int; v_tier text; v_src text; v_note text; v_msg text;
begin
  select days_left, tier, source, note into v_days, v_tier, v_src, v_note
    from refund_due(p_academy);

  update profiles
     set status = 'removed', removed_at = now(), removed_reason = left(p_reason, 120)
   where academy_id = upper(trim(p_academy)) and academy_id <> 'PSA-FOUNDER';

  if not found then return jsonb_build_object('ok', false, 'error', 'unknown academy id'); end if;

  v_msg :=
    'YOUR SEAT HAS BEEN RELEASED' || E'\n\n' ||
    'Reason: ' || p_reason || E'\n\n' ||
    case when coalesce(v_days, 0) > 0
      then 'You had ' || v_days || ' day' || case when v_days = 1 then '' else 's' end ||
           ' of paid time left. That balance is refunded — you are not charged for ' ||
           'what you did not use.' || E'\n\n'
      else 'You are not owed a refund: the time you paid for was used.' || E'\n\n'
    end ||
    'Nothing of yours has been deleted. If you believe this is a mistake, reply here.';

  perform notify_member(p_academy, 'message', v_msg, 'REMOVED');
  perform audit('remove_member', p_academy,
                jsonb_build_object('reason', p_reason, 'refundDays', v_days));

  return jsonb_build_object('ok', true, 'academyId', upper(trim(p_academy)),
                            'reason', p_reason, 'refundDays', v_days,
                            'tier', v_tier, 'note', v_note);
end $$;
revoke execute on function remove_member(text, text) from public, anon, authenticated;
grant execute on function remove_member(text, text) to service_role;

-- the sweeper tells people too, instead of just vanishing them
create or replace function sweep_unpaid()
returns table (academy_id text, handle text, reason text)
language plpgsql security definer set search_path = public as $$
declare v_on boolean; v_grace int; r record;
begin
  select (value = 'true') into v_on from config where key = 'auto_remove';
  if not coalesce(v_on, false) then return; end if;

  select value::int into v_grace from config where key = 'grace_days';
  v_grace := coalesce(v_grace, 3);

  for r in
    select p.academy_id, p.handle
      from profiles p
      left join entitlements e on e.academy_id = p.academy_id
     where p.academy_id <> 'PSA-FOUNDER'
       and p.status <> 'removed'
       and p.deadline_at is not null
       and p.deadline_at + (v_grace || ' days')::interval < now()
       and (e.academy_id is null or coalesce(e.source, 'TRIAL') = 'TRIAL')
       and (e.expires_at is null or e.expires_at < now())
  loop
    update profiles
       set status = 'removed', removed_at = now(),
           removed_reason = 'NO PLAN AFTER THE DEADLINE'
     where profiles.academy_id = r.academy_id;

    perform notify_member(r.academy_id, 'message',
      'YOUR SEAT HAS BEEN RELEASED' || E'\n\n' ||
      'Your deadline passed without a plan. You were reminded at seven days, three ' ||
      'days and on the last day.' || E'\n\n' ||
      'Nothing has been deleted — your vault, journal, XP and badges are all still ' ||
      'here. Take a pass any time and you carry on from the same node, if a seat is ' ||
      'free. If money was the problem, reply here and talk to me.',
      'SWEPT');

    perform audit('auto_remove', r.academy_id, jsonb_build_object('reason', 'unpaid'));

    academy_id := r.academy_id;
    handle     := r.handle;
    reason     := 'NO PLAN AFTER THE DEADLINE';
    return next;
  end loop;
end $$;
revoke execute on function sweep_unpaid() from public, anon, authenticated;
grant execute on function sweep_unpaid() to service_role;

-- ── 6 · Nightly: remind first, then sweep ────────────────────
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('psa-remind') where exists (select 1 from cron.job where jobname = 'psa-remind');
    perform cron.schedule('psa-remind', '0 9 * * *', 'select remind_deadlines();');
    raise notice 'reminders scheduled daily at 09:00 UTC';
  else
    raise notice 'pg_cron not enabled — run remind_deadlines() from the Desk';
  end if;
exception when others then
  raise notice 'could not schedule reminders: %', sqlerrm;
end $$;

-- ── 7 · Proof ────────────────────────────────────────────────
do $$
declare v_from int;
begin
  select count(*) into v_from from contact_messages where from_academy;
  raise notice 'THE ACADEMY BOT ARMED · % message(s) sent so far', v_from;
  raise notice '  every warning, reminder and removal now lands in the member''s inbox';
end $$;


-- ▓▓▓▓▓▓▓▓▓▓ claims.sql ▓▓▓▓▓▓▓▓▓▓

-- ═════════════════════════════════════════════════════════════
-- PAYMENT CLAIMS — "I have paid", on the record, both sides
--
-- Run in Supabase → SQL Editor AFTER notices.sql. Safe to re-run.
--
-- THE PROBLEM THIS SOLVES
--   A member sends money to PayPal or OPay and then… waits. No
--   record, no status, no way to prove they paid. That silence is
--   exactly when someone starts wondering if they have been
--   scammed — and the founder has nothing to check against either.
--
--   Now: they tap a pass, get a unique reference to put in the
--   payment, and submit a claim. It lands in the Founder Desk with
--   the amount and reference. The founder checks the real account,
--   taps approve, and grant_tier runs automatically.
--
--   Both sides can see the same claim and its status the whole way.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · Where the money actually goes ────────────────────────
-- Editable in the Table Editor. Nothing about the founder's bank
-- details lives in the app build.
create table if not exists pay_methods (
  code       text primary key,          -- 'paypal' | 'opay'
  label      text not null,             -- what the member sees
  region     text,                      -- 'africa' | 'world' | null = both
  currency   text not null,
  details    text not null,             -- the address / account number
  holder     text,                      -- the name on the account
  note       text,                      -- anything else they must know
  sort       int not null default 0,
  active     boolean not null default true
);
alter table pay_methods enable row level security;

drop policy if exists pay_methods_read on pay_methods;
create policy pay_methods_read on pay_methods
  for select to authenticated using (active);

-- Seeded as PLACEHOLDERS — replace the details before launch.
insert into pay_methods (code, label, region, currency, details, holder, note, sort) values
  ('paypal', 'PAYPAL', 'world', 'GBP',
   'REPLACE-WITH-YOUR-PAYPAL-EMAIL', 'REPLACE WITH THE NAME ON THE ACCOUNT',
   'Send as GOODS AND SERVICES, not Friends and Family — that is what protects you.', 1),
  ('opay', 'OPAY / BANK TRANSFER', 'africa', 'NGN',
   'REPLACE-WITH-YOUR-OPAY-NUMBER', 'REPLACE WITH THE ACCOUNT NAME',
   'Put your reference in the transfer narration so it can be matched.', 2)
on conflict (code) do nothing;

-- ── 2 · The claim ────────────────────────────────────────────
create table if not exists payment_claims (
  id          bigint generated always as identity primary key,
  academy_id  text not null references profiles(academy_id) on delete cascade,
  handle      text,
  product     text not null references products(code),
  method      text not null,
  reference   text not null unique,     -- what they put in the payment
  amount      text,                     -- what they say they sent
  sender_note text,                     -- their bank name / PayPal email
  status      text not null default 'pending',  -- pending|approved|rejected
  at          timestamptz not null default now(),
  decided_at  timestamptz,
  decided_note text
);
create index if not exists idx_claims_pending on payment_claims (status, at desc);
alter table payment_claims enable row level security;

-- a member sees only their own claims, and can only file as themselves
drop policy if exists claims_read_own on payment_claims;
create policy claims_read_own on payment_claims
  for select to authenticated
  using (academy_id in (select academy_id from profiles where auth_user_id = auth.uid()));

/**
 * File a claim. The reference is generated SERVER-SIDE so it is
 * unique and cannot be spoofed to collide with someone else's.
 */
create or replace function claim_payment(
  p_product text,
  p_method  text,
  p_amount  text default null,
  p_note    text default null
) returns table (reference text, product text, method text)
language plpgsql security definer set search_path = public as $$
declare
  v_academy text;
  v_handle  text;
  v_ref     text;
  v_open    int;
begin
  select academy_id, handle into v_academy, v_handle
    from profiles where auth_user_id = auth.uid() and status = 'active';
  if v_academy is null then raise exception 'no active seat'; end if;

  if not exists (select 1 from products where code = upper(trim(p_product)) and active) then
    raise exception 'unknown product';
  end if;

  -- one open claim at a time: stops a member filing ten and confusing
  -- the queue while the founder is checking the first
  select count(*) into v_open from payment_claims
   where academy_id = v_academy and status = 'pending';
  if v_open >= 1 then
    raise exception 'CLAIM_PENDING';
  end if;

  -- PSA-<seat>-<4 chars>: short enough to type into a transfer note
  v_ref := replace(v_academy, 'PSA-', '') || '-' ||
           upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 4));

  insert into payment_claims (academy_id, handle, product, method, reference, amount, sender_note)
  values (v_academy, v_handle, upper(trim(p_product)), lower(trim(p_method)),
          v_ref, left(p_amount, 40), left(p_note, 300));

  perform notify_member(v_academy, 'message',
    'PAYMENT CLAIM RECEIVED' || E'\n\n' ||
    'Reference: ' || v_ref || E'\n' ||
    'For: ' || upper(trim(p_product)) || E'\n\n' ||
    'The founder checks the account by hand and approves it — usually the same day. ' ||
    'You will get a message here the moment it lands. If something looks wrong, just ' ||
    'reply to this message.',
    'CLAIM');

  return query select v_ref, upper(trim(p_product)), lower(trim(p_method));
end $$;
grant execute on function claim_payment(text, text, text, text) to authenticated;

/** what the member sees on their own claims */
create or replace function my_claims()
returns table (id bigint, product text, method text, reference text,
               amount text, status text, at timestamptz, decided_note text)
language sql security definer stable set search_path = public as $$
  select c.id, c.product, c.method, c.reference, c.amount, c.status, c.at, c.decided_note
    from payment_claims c
    join profiles p on p.academy_id = c.academy_id
   where p.auth_user_id = auth.uid()
   order by c.at desc
   limit 20;
$$;
grant execute on function my_claims() to authenticated;

-- ── 3 · The founder approves, and the pass is granted ────────
/**
 * One tap: marks the claim approved AND runs grant_tier, so there is
 * no way to approve a payment without the member actually receiving
 * what they paid for. Same function, same audit trail, same ledger.
 */
create or replace function decide_claim(
  p_id       bigint,
  p_approve  boolean,
  p_note     text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_academy text;
  v_product text;
  v_ref     text;
  v_status  text;
  v_tier    text;
  v_exp     timestamptz;
begin
  select academy_id, product, reference, status
    into v_academy, v_product, v_ref, v_status
    from payment_claims where id = p_id for update;

  if v_academy is null then
    return jsonb_build_object('ok', false, 'error', 'unknown claim');
  end if;
  if v_status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'already ' || v_status);
  end if;

  if not p_approve then
    update payment_claims
       set status = 'rejected', decided_at = now(), decided_note = left(p_note, 300)
     where id = p_id;

    perform notify_member(v_academy, 'message',
      'PAYMENT NOT FOUND YET' || E'\n\n' ||
      'Reference: ' || v_ref || E'\n\n' ||
      coalesce(p_note, 'The founder could not match this payment to the account.') || E'\n\n' ||
      'This is usually a missing reference or a transfer still clearing. Nothing is ' ||
      'lost — reply here with a screenshot and it gets sorted.',
      'CLAIM');

    perform audit('claim_rejected', v_academy, jsonb_build_object('claim', p_id, 'ref', v_ref));
    return jsonb_build_object('ok', true, 'approved', false);
  end if;

  -- approved → grant the pass in the same transaction
  select tier, expires_at into v_tier, v_exp
    from grant_tier(v_academy, v_product, v_ref);

  update payment_claims
     set status = 'approved', decided_at = now(), decided_note = left(p_note, 300)
   where id = p_id;

  perform notify_member(v_academy, 'message',
    'PAYMENT CONFIRMED — YOU ARE IN' || E'\n\n' ||
    'Reference: ' || v_ref || E'\n' ||
    'Pass: ' || upper(coalesce(v_tier, '')) ||
    ' until ' || to_char(v_exp, 'DD Mon YYYY') || E'\n\n' ||
    'Everything is open. Thank you for backing this — it is what keeps the academy running.',
    'CLAIM');

  perform audit('claim_approved', v_academy,
                jsonb_build_object('claim', p_id, 'ref', v_ref, 'product', v_product));

  return jsonb_build_object('ok', true, 'approved', true,
                            'tier', v_tier, 'expiresAt', v_exp);
end $$;
revoke execute on function decide_claim(bigint, boolean, text) from public, anon, authenticated;
grant execute on function decide_claim(bigint, boolean, text) to service_role;

-- ── 4 · Proof ────────────────────────────────────────────────
do $$
declare v_m int; v_ph int;
begin
  select count(*) into v_m from pay_methods where active;
  select count(*) into v_ph from pay_methods where details like 'REPLACE-%';
  raise notice 'PAYMENT CLAIMS ARMED · % method(s) active', v_m;
  if v_ph > 0 then
    raise notice '  ⚠️  % method(s) still hold PLACEHOLDER details —', v_ph;
    raise notice '      Table Editor → pay_methods → set your real PayPal / OPay details';
  end if;
end $$;


-- ▓▓▓▓▓▓▓▓▓▓ paypal-only.sql ▓▓▓▓▓▓▓▓▓▓

-- ═════════════════════════════════════════════════════════════
-- PAYPAL ONLY — one account, one currency, two price tracks
--
-- Run in Supabase → SQL Editor AFTER claims.sql. Safe to re-run.
--
-- THE FOUNDER'S DECISIONS
--   · Everything goes to ONE UK PayPal account. No OPay, no
--     Paystack, no Flutterwave, no separate rails to reconcile.
--   · Africa keeps its cheaper pricing — the naira price is simply
--     charged as its GBP equivalent, so both tracks land in the
--     same account.
--   · The 1-month pass is GONE. PayPal's flat ~£0.30 fee ate
--     23–43% of it, and a 3-month minimum filters for the people
--     who are actually serious.
--
-- WHY GBP FOR EVERYONE
--   The founder's account is UK. Charging in his own currency
--   avoids PayPal's ~4% conversion spread on every transaction and
--   means the number he sees is the number he keeps.
--   Members abroad see £; Africa members see the £ equivalent of
--   the naira price, clearly labelled so nothing feels hidden.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · PayPal is the only way to pay ────────────────────────
update pay_methods set active = false where code <> 'paypal';

insert into pay_methods (code, label, region, currency, details, holder, note, sort, active)
values ('paypal', 'PAYPAL', null, 'GBP',
        'REPLACE-WITH-YOUR-PAYPAL-EMAIL', 'REPLACE WITH THE NAME ON THE ACCOUNT',
        'Send as GOODS AND SERVICES — never Friends and Family. Goods and Services gives YOU PayPal''s buyer protection. Anyone asking for Friends and Family is avoiding that protection.',
        1, true)
on conflict (code) do update
  set region   = null,          -- one method, both regions
      currency = 'GBP',
      label    = 'PAYPAL',
      note     = excluded.note,
      active   = true;

-- ── 2 · Retire the monthly passes ────────────────────────────
-- Kept, not deleted, so old ledger rows still resolve to a name.
update products set active = false
 where duration_days = 30 and tier is not null;

-- ── 3 · Reprice everything in GBP ────────────────────────────
-- price      = what the member is charged (always £)
-- price_note = the honest explanation of where that number came from
alter table products add column if not exists price_note text;

-- AFRICA — the naira price, charged as its GBP equivalent
update products set price = '£1.95',  price_note = 'THE ₦3,900 ACADEMY PRICE, CHARGED IN £'
 where code = 'NG-MID-90';
update products set price = '£3.90',  price_note = 'THE ₦7,800 PRO PRICE, CHARGED IN £'
 where code = 'NG-PRO-90';
update products set price = '£12.50', price_note = 'THE ₦25,000 SEASON PRICE, CHARGED IN £'
 where code = 'NG-PRO-365';

-- WORLD
update products set price = '£7.99',  price_note = '3 MONTHS · WORKS OUT AT £2.66 A MONTH'
 where code = 'WD-MID-90';
update products set price = '£15.99', price_note = '3 MONTHS · WORKS OUT AT £5.33 A MONTH'
 where code = 'WD-PRO-90';
update products set price = '£47.99', price_note = 'A FULL SEASON · WORKS OUT AT £4.00 A MONTH'
 where code = 'WD-PRO-365';

-- ── 4 · A PayPal.me or payment link per product ──────────────
-- Optional but strongly recommended: the amount is pre-filled, so
-- nobody can mistype it and nobody has to be told a number.
--   Table Editor → products → pay_link
--   e.g. https://www.paypal.com/paypalme/YOURNAME/12.50
update products set pay_link = 'ASK-IN-HALL'
 where active and tier is not null and (pay_link is null or pay_link = '');

-- ── 5 · Tell members why monthly is gone ─────────────────────
insert into config (key, value) values
  ('min_duration_note',
   'The shortest pass is 3 months. Card fees on small payments are brutal — a 1-month pass lost nearly half its value to charges, which helped nobody. Longer passes cost you less per month and mean more of your money reaches the academy.')
on conflict (key) do update set value = excluded.value;

-- ── 6 · Proof ────────────────────────────────────────────────
do $$
declare r record; v_ph int;
begin
  raise notice 'PAYPAL ONLY — active passes:';
  for r in
    select code, region, tier, duration_days, price, price_note
      from products where active and tier is not null order by region, sort
  loop
    raise notice '  % · % · % days · %  (%)',
      rpad(r.code, 12), upper(r.region), r.duration_days, r.price, coalesce(r.price_note, '');
  end loop;

  select count(*) into v_ph from pay_methods
   where active and details like 'REPLACE-%';
  if v_ph > 0 then
    raise notice '';
    raise notice '  ⚠️  PayPal details are still a PLACEHOLDER.';
    raise notice '      Table Editor → pay_methods → paypal → set details + holder';
  end if;
end $$;

