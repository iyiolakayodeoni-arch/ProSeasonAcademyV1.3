-- ═══════════════════════════════════════════════════════════
-- BOTH PRICES REAL — and the Nigerian one deliberately subsidised
--
-- Run in Supabase → SQL Editor AFTER fx.sql. Safe to re-run.
--
-- THE FOUNDER'S CALL
--   "i wanted the nigerian one to be subsidized while the world own
--    will also work as well since i know that most nigerians dont
--    earn in pounds"
--
--   So neither price is a conversion of the other. ₦7,800 is a real
--   price. £15.99 is a real price. The gap between them is a
--   deliberate ~72% discount, not an exchange-rate accident.
--
-- WHAT CHANGES HERE
--   1. Each side is CHARGED in its own currency. A Nigerian is billed
--      ₦7,800 — a figure that never moves on him, in the money he
--      actually earns. A world member is billed £15.99.
--   2. The live rate is no longer used to SET either price. It is used
--      only to show the other one for comparison, and to warn the
--      founder when the subsidy has drifted.
-- ═══════════════════════════════════════════════════════════

-- ── 1 · Both currencies are real, so both are charged natively ──

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

alter table products add column if not exists charge_currency text;

update products set charge_currency = 'NGN' where region = 'africa' and tier is not null;
update products set charge_currency = 'GBP' where region = 'world'  and tier is not null;

-- the subsidy, stated out loud rather than implied
insert into config (key, value) values
  ('subsidy_note',
   'Nigeria and the rest of Africa pay a lower price on purpose. Most members here do not earn in pounds, and a price that ignores that is a price nobody can pay. Same academy, same coaches, same everything.'),
  ('subsidy_target_pct', '28'),   -- africa should sit near this % of world
  ('subsidy_drift_pct',  '8')     -- warn the founder past this much drift
on conflict (key) do update set value = excluded.value;

-- ── 2 · Price in the member's own money ──────────────────────
/**
 * No conversion in the charge. The stored amount IS the price, in the
 * currency it is stored in. The rate is used only to show the other
 * side's figure underneath, so the two are comparable in the halls.
 */
create or replace function price_now(p_product text)
returns table (
  amount        numeric,      -- what PayPal will charge
  currency      text,         -- ...in this currency
  display       text,         -- "₦7,800" or "£15.99"
  compare       text,         -- "≈ £4.30 today" — context, never charged
  base_amount   bigint,
  base_currency text,
  rate_used     numeric,
  stale         boolean
)
language plpgsql security definer stable set search_path = public as $$
declare
  v_amt bigint; v_cur text; v_rate numeric; v_age numeric; v_max int;
  v_val numeric; v_disp text; v_cmp text; v_stale boolean := false;
begin
  -- p.-qualified: base_currency is ALSO an OUT parameter here, and an
  -- unqualified reference is ambiguous (Postgres aborts rather than
  -- guessing between the column and the variable).
  select p.amount_minor, coalesce(p.charge_currency, p.base_currency)
    into v_amt, v_cur
    from products p where p.code = upper(trim(p_product));
  if v_amt is null then return; end if;

  select value::int into v_max from config where key = 'fx_max_age_hours';
  select rate, extract(epoch from (now() - fetched_at)) / 3600
    into v_rate, v_age from fx_rates where pair = 'NGN/GBP';
  v_stale := v_rate is null or v_age > coalesce(v_max, 48);

  if v_cur = 'NGN' then
    v_val  := v_amt;                                  -- naira has no minor unit here
    v_disp := '₦' || to_char(v_amt, 'FM999,999,999');
    v_cmp  := case when v_stale then null
                   else '≈ £' || to_char(round((v_amt / v_rate)::numeric, 2), 'FM999990.00') || ' TODAY' end;
  else
    v_val  := v_amt / 100.0;                          -- pence → pounds
    v_disp := '£' || to_char(v_val, 'FM999990.00');
    v_cmp  := case when v_stale then null
                   else '≈ ₦' || to_char(round(v_val * v_rate), 'FM999,999,999') || ' TODAY' end;
  end if;

  -- NOTE: stale only blanks the comparison line. The real price is
  -- stored, not derived, so a dead rate can never stop a sale.
  return query select v_val, v_cur, v_disp, v_cmp, v_amt, v_cur, v_rate, v_stale;
end $$;
grant execute on function price_now(text) to anon, authenticated;

create or replace function prices_now(p_region text default null)
returns table (code text, title text, region text, tier text, duration_days int,
               display text, amount numeric, currency text, compare text,
               base_amount bigint, base_currency text, price_note text, stale boolean)
language sql security definer stable set search_path = public as $$
  select p.code, p.title, p.region, p.tier, p.duration_days,
         n.display, n.amount, n.currency, n.compare,
         p.amount_minor, n.base_currency,
         case when p.region = 'africa'
              then (select value from config where key = 'subsidy_note')
              else p.price_note end,
         coalesce(n.stale, false)
    from products p
    left join lateral price_now(p.code) n on true
   where p.active and p.tier is not null
     and (p_region is null or p.region = p_region)
   order by p.sort;
$$;
grant execute on function prices_now(text) to anon, authenticated;

-- ── 3 · Has the subsidy drifted? ─────────────────────────────
/**
 * Africa is meant to sit near subsidy_target_pct of the world price.
 * The naira moving does not change either price — but it does change
 * how big the discount really is. This tells the founder when to
 * revisit, instead of letting it drift unnoticed for a year.
 */
create or replace function subsidy_check()
returns table (pair text, africa_ngn bigint, world_gbp numeric,
               africa_pct numeric, target_pct numeric, drifted boolean)
language sql security definer stable set search_path = public as $$
  with r as (select rate from fx_rates where pair = 'NGN/GBP'),
       t as (select value::numeric tgt from config where key = 'subsidy_target_pct'),
       d as (select value::numeric drift from config where key = 'subsidy_drift_pct'),
       m as (
         select a.code africa, a.amount_minor ngn, w.amount_minor gbp_minor
           from products a
           join products w on w.region = 'world' and w.tier = a.tier
                          and w.duration_days = a.duration_days and w.active
          where a.region = 'africa' and a.active and a.tier is not null
       )
  select m.africa,
         m.ngn,
         (m.gbp_minor / 100.0)::numeric,
         round(((m.ngn / r.rate) / (m.gbp_minor / 100.0) * 100)::numeric, 1),
         t.tgt,
         abs(((m.ngn / r.rate) / (m.gbp_minor / 100.0) * 100) - t.tgt) > d.drift
    from m, r, t, d;
$$;
revoke execute on function subsidy_check() from public, anon, authenticated;
grant execute on function subsidy_check() to service_role;

-- ── 4 · Proof ────────────────────────────────────────────────
do $$
declare r record;
begin
  raise notice 'BOTH PRICES REAL — charged in the member''s own currency';
  for r in select * from prices_now() loop
    raise notice '  % · %  %', rpad(r.code, 12), rpad(r.display, 10), coalesce(r.compare, '');
  end loop;
  raise notice '';
  raise notice 'SUBSIDY:';
  for r in select * from subsidy_check() loop
    raise notice '  % → africa pays %%% of world (target %%%) %',
      rpad(r.pair, 12), r.africa_pct, r.target_pct,
      case when r.drifted then '⚠ DRIFTED' else 'ok' end;
  end loop;
end $$;
