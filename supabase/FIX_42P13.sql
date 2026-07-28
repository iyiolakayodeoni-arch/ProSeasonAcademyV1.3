-- ═══════════════════════════════════════════════════════════
-- FIX FOR:  ERROR 42P13 cannot change return type of existing function
--
-- Run THIS first, on its own. Then run access.sql again.
--
-- WHY YOU HIT IT
--   tiers.sql created my_access() returning 4 columns.
--   access.sql widens it to 7 (adding state, grace_left, paid_only).
--   Postgres will not let CREATE OR REPLACE change a return type —
--   the old function has to be dropped first. That is all this does.
--
-- Nothing is lost: my_access() is a read-only helper that calculates
-- a member's tier on the fly. It holds no data. access.sql rebuilds
-- it immediately.
--
-- Safe to run even if you already applied the fixed access.sql —
-- it will simply report that there was nothing to drop.
-- ═══════════════════════════════════════════════════════════

-- Drop EVERY overload of these, whatever shape they are in.
-- (A plain "drop function name()" fails if the argument list differs,
--  so this looks them up in the catalogue and drops them by identity.)
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
language sql security definer stable as $$
  select
    (select value from config where key = 'season_name'),
    (select value::int from config where key = 'seat_cap'),
    (select count(*)::int from profiles
       where academy_id <> 'PSA-FOUNDER'
         and coalesce(status, 'active') <> 'removed'),
    (select count(*)::int from waitlist),
    (select count(*) from profiles
       where academy_id <> 'PSA-FOUNDER'
         and coalesce(status, 'active') <> 'removed')
      >= (select value::int from config where key = 'seat_cap');
$$;
grant execute on function season_seats() to anon, authenticated;

do $$
begin
  raise notice '───────────────────────────────────────────';
  raise notice 'CLEARED. Now run access.sql again, then';
  raise notice 'consult.sql, enforcement.sql, notices.sql.';
  raise notice '───────────────────────────────────────────';
end $$;
