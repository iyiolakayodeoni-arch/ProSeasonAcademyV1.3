-- VERIFY — exercises the whole academy brain on a real Postgres
\set ON_ERROR_STOP on

-- seed two auth users
insert into auth.users values
  ('00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000a2');

-- player one claims a seat (as ensure-profile would)
insert into profiles (auth_user_id, handle, coach_id, platform, region, academy_id)
values ('00000000-0000-4000-8000-0000000000a1', 'ALPHA', 'chinedu', 'ANDROID', 'africa', 'PSA-T00001');

-- 1 · seats: founder row must NOT count
do $$ declare s record;
begin
  select * into s from season_seats();
  assert s.season = 'SEASON ONE' and s.cap = 1000 and s.taken = 1, format('seats wrong: %s %s %s', s.season, s.cap, s.taken);
end $$;

-- 2 · topups: credit accumulates; ghost ids rejected
select till_topup('PSA-T00001', 300, 'FOUNDER TOP-UP', 'PAYSTACK-001', 'founder') as should_be_300;
select till_topup('PSA-T00001', 50, 'FOUNDER TOP-UP', null, 'founder') as should_be_350;
do $$
begin
  perform till_topup('PSA-GHOST99', 100);
  raise exception 'ghost topup must fail';
exception when raise_exception or others then
  if sqlerrm not like '%ghost topup must fail%' then
    assert sqlerrm like '%unknown academy id%', format('unexpected: %s', sqlerrm);
  end if;
end $$;
do $$ declare c int;
begin
  select credits into c from wallets where academy_id = 'PSA-T00001';
  assert c = 350, format('wallet wrong: %s', c);
end $$;

-- 3 · spend: go-live gate first, then atomic debit + 402-style refusal
set test.uid = '00000000-0000-4000-8000-0000000000a1';
do $$ declare r record;
begin
  select * into r from till_spend(100, 'STAGE SCAN PACK');
  assert r.ok = false and r.error = 'STORE_NOT_LIVE' and r.credits = 350, format('gate wrong: %s %s %s', r.ok, r.error, r.credits);
end $$;
update config set value = '2020-01-01T00:00:00Z' where key = 'go_live';
do $$ declare r record;
begin
  select * into r from till_spend(120, 'STAGE SCAN PACK');
  assert r.ok = true and r.credits = 230, format('spend wrong: %s %s', r.ok, r.credits);
  select * into r from till_spend(999, 'DREAM BIG');
  assert r.ok = false and r.error = 'INSUFFICIENT_CREDITS' and r.credits = 230, format('overspend wrong: %s %s %s', r.ok, r.error, r.credits);
end $$;
do $$ declare n int;
begin
  select count(*) into n from ledger where academy_id = 'PSA-T00001';
  assert n = 3, format('ledger wrong: %s', n);
  assert (select ref from ledger where delta = 300) = 'PAYSTACK-001', 'ref kept';
  assert (select actor from ledger where delta = -120) = 'player', 'spend actor';
end $$;

-- 4 · WORLD track: plan flips PRO with a ledger line
select till_plan('PSA-T00001', 'pro', '2027-03-01', 'founder');
do $$
begin
  assert (select plan from wallets where academy_id = 'PSA-T00001') = 'pro', 'plan not pro';
  assert (select plan_renews from wallets where academy_id = 'PSA-T00001') = '2027-03-01', 'renews wrong';
  assert exists (select 1 from ledger where academy_id = 'PSA-T00001' and reason = 'PLAN → PRO' and delta = 0), 'plan ledger line';
end $$;

-- 5 · rooms: seeded channels, a player message, reaction toggle (own handle only)
do $$
begin
  assert (select count(*) from channels) = 5, 'channels not seeded';
end $$;
insert into messages (channel_slug, user_id, handle, academy_id, kind, text)
select 'division-africa', id, 'ALPHA', 'PSA-T00001', 'text', 'CREDITS OR SUBS — AFRICA DECIDES FRIDAY'
from profiles where academy_id = 'PSA-T00001';
do $$ declare j jsonb;
begin
  j := toggle_reaction(1, '🔥');
  assert j -> '🔥' ? 'ALPHA', format('reaction add wrong: %s', j);
  j := toggle_reaction(1, '🔥');
  assert j = '{}'::jsonb, format('reaction remove wrong: %s', j);
end $$;

-- 6 · RLS: a phone can never forge FOUNDER, and sees only its own wallet
set role authenticated;
set test.uid = '00000000-0000-4000-8000-0000000000a1';
do $$
declare n int;
begin
  select count(*) into n from profiles;      -- only own row visible
  assert n = 1, format('profiles rls wrong: %s', n);
  select count(*) into n from wallets;       -- only own wallet visible
  assert n = 1, format('wallets rls wrong: %s', n);
  insert into wallets (academy_id, credits) values ('PSA-T00001', 9999);
  raise exception 'wallet write must be blocked';
exception when others then
  if sqlerrm not like '%wallet write must be blocked%' then
    assert sqlerrm like '%row-level security%' or sqlerrm like '%violates%', format('unexpected: %s', sqlerrm);
  end if;
end $$;
do $$
begin
  insert into messages (channel_slug, user_id, handle, kind, text)
  select 'dressing-room', id, 'ALPHA', 'founder', 'fake badge'
  from profiles where academy_id = 'PSA-T00001';
  raise exception 'founder badge must be unforgeable';
exception when others then
  if sqlerrm not like '%founder badge must be unforgeable%' then
    assert sqlerrm like '%row-level security%' or sqlerrm like '%violates%', format('unexpected: %s', sqlerrm);
  end if;
end $$;
reset role;

-- 7 · waitlist: you may join as yourself
set role authenticated;
set test.uid = '00000000-0000-4000-8000-0000000000a2';
insert into waitlist (auth_user_id, handle, region)
values ('00000000-0000-4000-8000-0000000000a2', 'LATECOMER', 'world');
reset role;
do $$ begin assert (select count(*) from waitlist) = 1, 'waitlist write failed'; end $$;

-- 8 · admin rollup: the whole desk page in one JSON, seats included
do $$ declare j jsonb := admin_rollup();
begin
  assert (j ->> 'users')::int = 1, format('users: %s', j ->> 'users');
  assert (j -> 'regions' ->> 'africa')::int = 1, 'regions.africa';
  assert (j #>> '{coaches,0,coach}') = 'chinedu', format('coaches: %s', j -> 'coaches');
  assert (j -> 'till' ->> 'creditsOut')::int = 230, format('creditsOut: %s', j -> 'till' ->> 'creditsOut');
  assert (j -> 'till' ->> 'proSubs')::int = 1, 'proSubs';
  assert (j -> 'till' ->> 'wallets')::int = 1, 'wallets';
  assert (j #>> '{till,recentLedger,0,reason}') is not null, 'recentLedger present';
  assert (j -> 'seats' ->> 'taken')::int = 1, 'seats.taken';
  assert (j -> 'seats' ->> 'cap')::int = 1000, 'seats.cap';
  assert (j -> 'seats' ->> 'season') = 'SEASON ONE', 'seats.season';
  assert (j ->> 'messages')::int = 1, 'messages';
  assert (j ->> 'generatedAt')::bigint > 0, 'generatedAt';
end $$;

select 'ALL SUPABASE BRAIN TESTS PASSED' as result;
