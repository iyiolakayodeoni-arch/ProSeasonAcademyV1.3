-- ── PREFLIGHT · make this file safe to run ON ITS OWN ────────
-- Injected into the top of every fx file by build-finish.py.
--
-- WHY IT EXISTS
--   These migrations used to form a chain — fx added amount_minor,
--   fx2 added charge_currency, fx3 added charge_minor — so running
--   one without the previous gave:
--       ERROR 42703: column p.amount_minor does not exist
--       ERROR 42703: column "charge_currency" ... does not exist
--
--   Worse, the Supabase SQL Editor wraps a script in ONE transaction.
--   A failure near the bottom rolled back the ALTER TABLEs at the top,
--   so the columns never appeared and re-running produced the exact
--   same error — which looked like the fix had not been applied.
--
--   Now each file creates everything it needs first. Order no longer
--   matters, and any of them can be pasted on its own.

alter table products add column if not exists tier            text;
alter table products add column if not exists duration_days   int;
alter table products add column if not exists currency        text;
alter table products add column if not exists price_note      text;
alter table products add column if not exists amount_minor    bigint;
alter table products add column if not exists base_currency   text;
alter table products add column if not exists charge_currency text;
alter table products add column if not exists charge_minor    bigint;

-- The true prices, seeded only where missing so a later, deliberate
-- price change is never overwritten by re-running this.
update products set amount_minor = 3900,  base_currency = 'NGN' where code = 'NG-MID-90'  and amount_minor is null;
update products set amount_minor = 7800,  base_currency = 'NGN' where code = 'NG-PRO-90'  and amount_minor is null;
update products set amount_minor = 25000, base_currency = 'NGN' where code = 'NG-PRO-365' and amount_minor is null;
update products set amount_minor = 799,   base_currency = 'GBP' where code = 'WD-MID-90'  and amount_minor is null;
update products set amount_minor = 1599,  base_currency = 'GBP' where code = 'WD-PRO-90'  and amount_minor is null;
update products set amount_minor = 4799,  base_currency = 'GBP' where code = 'WD-PRO-365' and amount_minor is null;

create table if not exists fx_rates (
  pair       text primary key,
  rate       numeric(18,8) not null,
  fetched_at timestamptz not null default now(),
  source     text
);
alter table fx_rates enable row level security;
drop policy if exists fx_read on fx_rates;
create policy fx_read on fx_rates for select using (true);
insert into fx_rates (pair, rate, source) values ('NGN/GBP', 1816.02, 'seed')
on conflict (pair) do nothing;

insert into config (key, value) values
  ('fx_margin_pct',    '3'),
  ('fx_max_age_hours', '48')
on conflict (key) do nothing;

-- price_now()/prices_now() change shape between these files, and
-- Postgres refuses a return-type change via CREATE OR REPLACE
-- (ERROR 42P13). They are read-only calculators holding no data, so
-- clearing them costs nothing — each file rebuilds what it needs.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('price_now', 'prices_now',
                         'subsidy_check', 'resync_charge_amounts')
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;

-- ── end preflight ────────────────────────────────────────────
