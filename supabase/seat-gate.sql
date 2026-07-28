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
