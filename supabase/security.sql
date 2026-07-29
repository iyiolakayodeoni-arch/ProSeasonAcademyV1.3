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
insert into config (key, value) values ('invite_only', 'false')
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
