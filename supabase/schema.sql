-- ═════════════════════════════════════════════════════════════
-- PROSEASONACADEMY × SUPABASE — the whole brain in one paste.
-- SQL Editor → New query → paste everything → Run. (~2 minutes)
--
-- Creates: tables · RLS guard rules · realtime publication
--          the till (products/config/wallets/ledger + atomic RPCs)
--          SEASON ONE seat system (1,000-seat cap + waitlist)
--          admin_rollup() for the Founder Desk
-- Safe to re-run: CREATE IF NOT EXISTS / OR REPLACE throughout.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · TABLES ────────────────────────────────────────────────

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  handle text not null,
  coach_id text,
  platform text,
  region text not null default 'unset',          -- 'africa' | 'world' | 'unset'
  academy_id text unique not null,               -- PSA-XXXXXX
  created_at timestamptz not null default now()
);

create table if not exists waitlist (             -- SEASON gate overflow
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null,
  region text not null default 'unset',
  at timestamptz not null default now()
);

create table if not exists matches (              -- the vault
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  client_id text not null,
  at timestamptz not null,
  gf int not null default 0,
  ga int not null default 0,
  mode text,
  opp_style text,
  pass_acc int,
  no_sprint boolean not null default false,
  mechanics_used int not null default 0,
  led_at75 boolean,
  decisive text,
  source text not null default 'manual',
  composure int,
  note text,
  unique (user_id, client_id)                     -- idempotent sync
);

create table if not exists channels (             -- the five rooms
  slug text primary key,
  name text not null,
  topic text
);

create table if not exists messages (
  id bigint generated always as identity primary key,
  channel_slug text not null references channels(slug) on delete cascade,
  user_id uuid not null references profiles(id),
  handle text not null,
  academy_id text,
  kind text not null default 'text',              -- 'text' | 'founder'
  text text not null,
  at timestamptz not null default now(),
  reactions jsonb not null default '{}'::jsonb
);
create index if not exists idx_messages_channel on messages (channel_slug, id);

create table if not exists wallets (              -- THE TILL
  academy_id text primary key references profiles(academy_id),
  credits int not null default 0,
  plan text not null default 'free',
  plan_renews text,
  updated_at timestamptz not null default now()
);

create table if not exists ledger (               -- every credit movement
  id bigint generated always as identity primary key,
  academy_id text not null,
  delta int not null,                             -- + top-up, − spend, 0 plan
  reason text not null,
  ref text,
  actor text not null default 'system',
  at timestamptz not null default now()
);
create index if not exists idx_ledger_academy on ledger (academy_id, at desc);

create table if not exists products (             -- YOUR PRICE LIST (GUI-editable)
  code text primary key,
  region text not null,                           -- 'africa' | 'world'
  title text not null,
  credits int,
  plan text,
  price text not null,
  pay_link text not null default 'ASK-IN-HALL',
  sort int not null default 0,
  active boolean not null default true
);

create table if not exists config (
  key text primary key,
  value text not null
);

-- ── 2 · SEEDS (idempotent) ────────────────────────────────────

insert into channels (slug, name, topic) values
  ('dressing-room', 'THE DRESSING ROOM', 'GENERAL — THE WHOLE ACADEMY IN ONE ROOM'),
  ('match-receipts', 'MATCH RECEIPTS', 'POST YOUR DUBS — RECEIPTS ONLY'),
  ('the-lab', 'THE LAB', 'LOSSES GO HERE TO DIE — BRING NOTES'),
  ('division-africa', 'DIVISION: AFRICA', 'PRICING HALL — CREDIT PACKS VS SUBS'),
  ('division-world', 'DIVISION: WORLDWIDE', 'PRICING HALL — THE SUBSCRIPTION DEBATE')
on conflict (slug) do nothing;

insert into products (code, region, title, credits, price, sort) values
  ('NG-STARTER', 'africa', 'STARTER PACK', 100, '₦500', 1),
  ('NG-REGULAR', 'africa', 'REGULAR PACK', 300, '₦1,200', 2),
  ('NG-GRINDER', 'africa', 'GRINDER PACK', 750, '₦2,500', 3),
  ('NG-PATRON', 'africa', 'PATRON PACK', 1700, '₦5,000', 4)
on conflict (code) do nothing;

insert into products (code, region, title, plan, price, sort) values
  ('PRO-MONTHLY', 'world', 'PRO MONTHLY', 'pro', '$4.99 / MONTH', 1)
on conflict (code) do nothing;

insert into config (key, value) values
  ('go_live', 'TBA'),                             -- till opens after testing, no fixed public date
  ('seat_cap', '1000'),                           -- SEASON ONE seats
  ('season_name', 'SEASON ONE')
on conflict (key) do nothing;

-- the seeded FOUNDER identity (auth_user_id NULL — never logs in,
-- posts only through the key-gated founder-broadcast function)
insert into profiles (auth_user_id, handle, region, academy_id)
values (null, 'FOUNDER', 'world', 'PSA-FOUNDER')
on conflict (academy_id) do nothing;

-- ── 3 · ROW LEVEL SECURITY — the guard inside the database ───

alter table profiles enable row level security;
alter table waitlist enable row level security;
alter table matches enable row level security;
alter table channels enable row level security;
alter table messages enable row level security;
alter table wallets enable row level security;
alter table ledger enable row level security;
alter table products enable row level security;
alter table config enable row level security;

-- profiles: read/write only your own row
drop policy if exists profiles_select_own on profiles;
create policy profiles_select_own on profiles
  for select to authenticated using (auth_user_id = auth.uid());
-- NOTE: players do NOT insert their own row. Allowing that let any
-- signed-in device mint a seat directly via /rest/v1/profiles and skip
-- the season gate entirely (the anon key is public — it ships in the
-- app). Only ensure-profile (service_role) mints seats, so the cap is
-- always on the path. See supabase/seat-gate.sql for the trigger that
-- enforces it inside Postgres.
drop policy if exists profiles_insert_own on profiles;

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- waitlist: you may join the list as yourself; nobody reads it
drop policy if exists waitlist_insert_own on waitlist;
create policy waitlist_insert_own on waitlist
  for insert to authenticated with check (auth_user_id = auth.uid());

-- matches: full private vault
drop policy if exists matches_own on matches;
create policy matches_own on matches
  for all to authenticated
  using (user_id in (select id from profiles where auth_user_id = auth.uid()))
  with check (user_id in (select id from profiles where auth_user_id = auth.uid()));

-- channels, products, config: read-only for everyone (owner edits via dashboard)
drop policy if exists channels_read on channels;
create policy channels_read on channels for select using (true);
drop policy if exists products_read on products;
create policy products_read on products for select using (true);
drop policy if exists config_read on config;
create policy config_read on config for select using (true);

-- messages: everyone reads; you post only as yourself, only kind='text'
-- (the FOUNDER badge is impossible to fake from a phone — the database rejects it)
drop policy if exists messages_read on messages;
create policy messages_read on messages
  for select to authenticated using (true);
drop policy if exists messages_post_own on messages;
create policy messages_post_own on messages
  for insert to authenticated
  with check (kind = 'text' and user_id in (select id from profiles where auth_user_id = auth.uid()));

-- wallets + ledger: read your own behind-glass; writes only via founder functions
drop policy if exists wallets_read_own on wallets;
create policy wallets_read_own on wallets
  for select to authenticated
  using (academy_id in (select academy_id from profiles where auth_user_id = auth.uid()));
drop policy if exists ledger_read_own on ledger;
create policy ledger_read_own on ledger
  for select to authenticated
  using (academy_id in (select academy_id from profiles where auth_user_id = auth.uid()));

-- ── 4 · REALTIME — message INSERTs fan out to the rooms ──────

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;

-- ── 5 · SEASON SEATS — the 1,000-seat gate, COUNTED IN SQL ───
-- ⚠️ Counting alone does NOT enforce the cap. After running this file,
--    run supabase/seat-gate.sql — it installs the BEFORE INSERT trigger
--    that locks the config row and recounts inside the transaction, so
--    concurrent signups cannot both take the last seat.


create or replace function season_seats()
returns table (season text, cap int, taken int)
language sql security definer stable as $$
  select
    (select value from config where key = 'season_name'),
    (select value::int from config where key = 'seat_cap'),
    (select count(*)::int from profiles where academy_id != 'PSA-FOUNDER');
$$;
grant execute on function season_seats() to anon, authenticated;

-- ── 6 · THE TILL — atomic credit moves (founder-only via fns) ─

create or replace function till_topup(p_academy text, p_delta int,
  p_reason text default 'FOUNDER TOP-UP', p_ref text default null,
  p_actor text default 'founder') returns int
language plpgsql security definer as $$
declare p_credits int;
begin
  if not exists (select 1 from profiles where academy_id = p_academy and academy_id != 'PSA-FOUNDER')
    then raise exception 'unknown academy id'; end if;
  p_delta := greatest(1, least(100000, round(p_delta)));
  insert into wallets (academy_id) values (p_academy)
    on conflict (academy_id) do nothing;
  update wallets set credits = wallets.credits + p_delta, updated_at = now()
    where academy_id = p_academy returning credits into p_credits;
  insert into ledger (academy_id, delta, reason, ref, actor)
    values (p_academy, p_delta, left(p_reason, 60), left(p_ref, 60), left(p_actor, 24));
  return p_credits;
end $$;

create or replace function till_plan(p_academy text, p_plan text,
  p_renews text, p_actor text default 'founder') returns void
language plpgsql security definer as $$
begin
  if not exists (select 1 from profiles where academy_id = p_academy and academy_id != 'PSA-FOUNDER')
    then raise exception 'unknown academy id'; end if;
  p_plan := case when p_plan = 'pro' then 'pro' else 'free' end;
  insert into wallets (academy_id) values (p_academy)
    on conflict (academy_id) do nothing;
  update wallets set plan = p_plan, plan_renews = left(p_renews, 40), updated_at = now()
    where academy_id = p_academy;
  insert into ledger (academy_id, delta, reason, ref, actor)
    values (p_academy, 0, 'PLAN → ' || upper(p_plan), left(p_renews, 40), left(p_actor, 24));
end $$;

-- founder-only: callable by service role (functions), never by phones
revoke execute on function till_topup(text, int, text, text, text) from public, anon, authenticated;
revoke execute on function till_plan(text, text, text, text) from public, anon, authenticated;
grant execute on function till_topup(text, int, text, text, text) to service_role;
grant execute on function till_plan(text, text, text, text) to service_role;

-- player-facing spend: self-resolving (your own academy only), go-live gated, atomic
create or replace function till_spend(p_amount int, p_reason text default 'ACADEMY SPEND')
returns table (ok boolean, credits int, error text)
language plpgsql security definer as $$
declare p_academy text; p_credits int; p_go_live timestamptz;
begin
  select academy_id into p_academy from profiles where auth_user_id = auth.uid();
  if p_academy is null then return query select false, 0, 'NO_PROFILE'; return; end if;
  select value::timestamptz into p_go_live from config where key = 'go_live';
  if now() < p_go_live then
    return query select false, (select w.credits from wallets w where w.academy_id = p_academy), 'STORE_NOT_LIVE';
    return;
  end if;
  p_amount := greatest(1, least(100000, round(p_amount)));
  update wallets set credits = wallets.credits - p_amount, updated_at = now()
    where academy_id = p_academy and wallets.credits >= p_amount
    returning wallets.credits into p_credits;
  if not found then
    return query select false,
      coalesce((select w.credits from wallets w where w.academy_id = p_academy), 0), 'INSUFFICIENT_CREDITS';
  else
    insert into ledger (academy_id, delta, reason, actor)
      values (p_academy, -p_amount, left(p_reason, 60), 'player');
    return query select true, p_credits, null::text;
  end if;
end $$;
grant execute on function till_spend(int, text) to authenticated;

-- reactions: toggle YOUR handle only (looked up from your session — unspoofable)
create or replace function toggle_reaction(p_message_id bigint, p_emoji text)
returns jsonb
language plpgsql security definer as $$
declare p_handle text; p_reactions jsonb;
begin
  select handle into p_handle from profiles where auth_user_id = auth.uid();
  if p_handle is null then raise exception 'no profile'; end if;
  p_emoji := left(p_emoji, 8);
  select reactions into p_reactions from messages where id = p_message_id;
  if not found then raise exception 'unknown message'; end if;
  if (p_reactions -> p_emoji) ? p_handle then
    p_reactions := jsonb_set(p_reactions, array[p_emoji],
      (p_reactions -> p_emoji) - p_handle);
    if jsonb_array_length(p_reactions -> p_emoji) = 0 then
      p_reactions := p_reactions - p_emoji;
    end if;
  else
    p_reactions := jsonb_set(p_reactions, array[p_emoji],
      coalesce(p_reactions -> p_emoji, '[]'::jsonb) || to_jsonb(p_handle));
  end if;
  update messages set reactions = p_reactions where id = p_message_id;
  return p_reactions;
end $$;
grant execute on function toggle_reaction(bigint, text) to authenticated;

-- ── 7 · ADMIN ROLLUP — the Founder Desk's exact JSON (service only) ─

create or replace function admin_rollup()
returns jsonb
language plpgsql security definer stable as $$
declare
  week_ago timestamptz := now() - interval '7 days';
begin
  return jsonb_build_object(
    'users', (select count(*) from profiles where academy_id != 'PSA-FOUNDER'),
    'matches', (select count(*) from matches),
    'messages', (select count(*) from messages),
    'matchesThisWeek', (select count(*) from matches where at > week_ago),
    'regions', (select jsonb_build_object(
        'africa', coalesce(sum((region = 'africa')::int), 0),
        'world',  coalesce(sum((region = 'world')::int), 0),
        'unset',  coalesce(sum((region not in ('africa','world'))::int), 0))
      from profiles where academy_id != 'PSA-FOUNDER'),
    'coaches', (select coalesce(jsonb_agg(jsonb_build_object('coach', coach_id, 'n', n)), '[]'::jsonb)
      from (select coach_id, count(*) as n from profiles
            where academy_id != 'PSA-FOUNDER' group by coach_id) c),
    'topScorersWeek', (select coalesce(jsonb_agg(jsonb_build_object(
        'handle', handle, 'goals', goals, 'played', played) order by goals desc), '[]'::jsonb)
      from (select p.handle, sum(m.gf)::int as goals, count(*)::int as played
            from matches m join profiles p on p.id = m.user_id
            where m.at > week_ago group by m.user_id, p.handle
            order by goals desc limit 5) t),
    'recentMatches', (select coalesce(jsonb_agg(jsonb_build_object(
        'handle', handle, 'gf', gf, 'ga', ga, 'mode', mode, 'source', source,
        'composure', composure, 'note', note, 'at', (extract(epoch from at) * 1000)::bigint) order by at desc), '[]'::jsonb)
      from (select p.handle, m.gf, m.ga, m.mode, m.source, m.composure, m.note, m.at
            from matches m join profiles p on p.id = m.user_id
            order by m.at desc limit 10) r),
    'till', jsonb_build_object(
      'wallets', (select count(*) from wallets where academy_id != 'PSA-FOUNDER'),
      'creditsOut', (select coalesce(sum(credits), 0) from wallets where academy_id != 'PSA-FOUNDER'),
      'proSubs', (select count(*) from wallets where plan = 'pro'),
      'recentLedger', (select coalesce(jsonb_agg(jsonb_build_object(
          'id', id, 'academyId', academy_id, 'delta', delta, 'reason', reason,
          'ref', ref, 'actor', actor, 'at', (extract(epoch from at) * 1000)::bigint) order by at desc), '[]'::jsonb)
        from (select * from ledger order by at desc, id desc limit 8) l)),
    'seats', (select jsonb_build_object('season', season, 'cap', cap, 'taken', taken,
                                        'waiting', waiting, 'isFull', is_full)
      from season_seats()),
    'generatedAt', (extract(epoch from now()) * 1000)::bigint
  );
end $$;
revoke execute on function admin_rollup() from public, anon, authenticated;
grant execute on function admin_rollup() to service_role;

-- ═════ done — verify: select season_seats(); ═════
