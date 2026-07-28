-- ═════════════════════════════════════════════════════════════
-- SEAT GATE — PROOF THE 1,000-SEAT CAP HOLDS
--
-- Run AFTER schema.sql + seat-gate.sql, in Supabase → SQL Editor.
-- Everything happens inside a transaction that ROLLS BACK, so your
-- real data is never touched.
--
--   Expect: every test prints PASS, then "ALL SEAT GATE TESTS PASS".
--   Any FAIL raises and aborts.
-- ═════════════════════════════════════════════════════════════

begin;

-- shrink the season to 3 seats so the maths is readable
update config set value = '3' where key = 'seat_cap';

-- clear the table for a clean count (rolled back at the end)
delete from matches;
delete from messages;
delete from wallets;
delete from waitlist;
delete from profiles where academy_id <> 'PSA-FOUNDER';

do $$
declare
  v_taken   int;
  v_cap     int;
  v_waiting int;
  v_full    boolean;
  v_err     text;
  v_allowed boolean;
begin
  -- ── 1 · founder row does not consume a seat ────────────────
  select taken into v_taken from season_seats();
  if v_taken <> 0 then
    raise exception 'FAIL 1 · founder row counted as a member (taken=%)', v_taken;
  end if;
  raise notice 'PASS 1 · founder row excluded from the count';

  -- ── 2 · seats fill normally up to the cap ──────────────────
  insert into profiles (auth_user_id, handle, region, academy_id)
  values (gen_random_uuid(), 'MEMBER_1', 'africa', 'PSA-AAA001'),
         (gen_random_uuid(), 'MEMBER_2', 'world',  'PSA-AAA002'),
         (gen_random_uuid(), 'MEMBER_3', 'africa', 'PSA-AAA003');

  select taken, cap, is_full into v_taken, v_cap, v_full from season_seats();
  if v_taken <> 3 or v_cap <> 3 or not v_full then
    raise exception 'FAIL 2 · expected 3/3 full, got %/% full=%', v_taken, v_cap, v_full;
  end if;
  raise notice 'PASS 2 · seats fill to the cap (3/3, is_full=true)';

  -- ── 3 · THE CAP HOLDS — seat 4 is refused ──────────────────
  -- This is the whole point. Before the trigger, this insert
  -- succeeded and the season quietly grew past its limit.
  v_allowed := false;
  begin
    insert into profiles (auth_user_id, handle, region, academy_id)
    values (gen_random_uuid(), 'MEMBER_4', 'world', 'PSA-AAA004');
    v_allowed := true;               -- got past the gate = broken
  exception
    when others then
      get stacked diagnostics v_err = message_text;
  end;
  if v_allowed then
    raise exception 'FAIL 3 · seat 4 was ALLOWED — the cap does not hold';
  end if;
  if position('SEASON_FULL' in v_err) = 0 then
    raise exception 'FAIL 3 · refused, but wrong error: %', v_err;
  end if;
  raise notice 'PASS 3 · seat 4 REFUSED by the database (%)', v_err;

  -- ── 4 · still exactly 3 after the refusal ──────────────────
  select taken into v_taken from season_seats();
  if v_taken <> 3 then
    raise exception 'FAIL 4 · count drifted to % after a refused insert', v_taken;
  end if;
  raise notice 'PASS 4 · count intact at 3 after the refusal';

  -- ── 5 · the founder can still be seeded when full ──────────
  -- (the real founder row already exists; prove the branch by
  --  deleting and re-inserting it while the season is full)
  delete from profiles where academy_id = 'PSA-FOUNDER';
  insert into profiles (auth_user_id, handle, region, academy_id)
  values (null, 'FOUNDER', 'world', 'PSA-FOUNDER');
  raise notice 'PASS 5 · founder row insertable even at a full cap';

  -- ── 6 · a freed seat becomes available again ───────────────
  delete from profiles where academy_id = 'PSA-AAA003';
  insert into profiles (auth_user_id, handle, region, academy_id)
  values (gen_random_uuid(), 'MEMBER_5', 'africa', 'PSA-AAA005');
  select taken into v_taken from season_seats();
  if v_taken <> 3 then
    raise exception 'FAIL 6 · expected 3 after swap, got %', v_taken;
  end if;
  raise notice 'PASS 6 · a released seat can be re-taken';

  -- ── 7 · raising the cap opens seats immediately ────────────
  update config set value = '5' where key = 'seat_cap';
  insert into profiles (auth_user_id, handle, region, academy_id)
  values (gen_random_uuid(), 'MEMBER_6', 'world', 'PSA-AAA006');
  select taken, cap, is_full into v_taken, v_cap, v_full from season_seats();
  if v_taken <> 4 or v_cap <> 5 or v_full then
    raise exception 'FAIL 7 · expected 4/5 not full, got %/% full=%', v_taken, v_cap, v_full;
  end if;
  raise notice 'PASS 7 · raising seat_cap opens seats (Season Two path)';

  -- ── 8 · lowering the cap never evicts anyone ───────────────
  update config set value = '2' where key = 'seat_cap';
  select taken, cap, is_full into v_taken, v_cap, v_full from season_seats();
  if v_taken <> 4 or not v_full then
    raise exception 'FAIL 8 · lowering the cap disturbed members (%/%)', v_taken, v_cap;
  end if;
  raise notice 'PASS 8 · lowering the cap keeps members, blocks new ones';

  -- ── 9 · the waitlist is counted ────────────────────────────
  insert into waitlist (auth_user_id, handle, region)
  values (gen_random_uuid(), 'HOPEFUL_1', 'africa'),
         (gen_random_uuid(), 'HOPEFUL_2', 'world');
  select waiting into v_waiting from season_seats();
  if v_waiting <> 2 then
    raise exception 'FAIL 9 · expected 2 waiting, got %', v_waiting;
  end if;
  raise notice 'PASS 9 · waitlist counted (% waiting)', v_waiting;

  -- ── 10 · seat identity is immutable ────────────────────────
  v_allowed := false;
  begin
    update profiles set academy_id = 'PSA-HACKED' where academy_id = 'PSA-AAA001';
    v_allowed := true;
  exception
    when others then
      get stacked diagnostics v_err = message_text;
  end;
  if v_allowed then
    raise exception 'FAIL 10 · academy_id was mutable';
  end if;
  if position('immutable' in v_err) = 0 then
    raise exception 'FAIL 10 · blocked, but wrong error: %', v_err;
  end if;
  raise notice 'PASS 10 · academy_id is immutable';

  raise notice '───────────────────────────────';
  raise notice 'ALL SEAT GATE TESTS PASS';
end $$;

-- nothing above is kept
rollback;
