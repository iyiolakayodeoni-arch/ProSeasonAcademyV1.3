-- ═══════════════════════════════════════════════════════════
-- PAYPAL CANNOT CHARGE NAIRA — so the charge goes out in £
--
-- Run in Supabase → SQL Editor AFTER fx2.sql. Safe to re-run.
--
-- WHAT WENT WRONG
--   fx2.sql set products.charge_currency = 'NGN' for Africa, and
--   pay-start passes that straight to PayPal as currency_code.
--   PayPal's REST API does not accept NGN — it is not on the
--   supported-currency list at all. Every African checkout would
--   have come back:
--       422 UNPROCESSABLE_ENTITY · CURRENCY_NOT_SUPPORTED
--   ...which the member would see as "paypal rejected the order".
--   The world (£) side would have worked fine, so this would have
--   looked like a mystery affecting only Nigeria.
--
-- WHAT CHANGES
--   Every charge now leaves in GBP, because that is the currency
--   the founder's UK PayPal Business account actually holds.
--
--   The naira price is NOT abandoned. ₦3,900 stays the headline
--   number an African member sees, because that is the price he
--   was promised and the one he can reason about. The £ figure
--   underneath is simply what his bank will convert it to.
--
--   So the honesty runs the other way round from fx2: the member
--   is shown BOTH, and told plainly which one leaves his account.
--
-- WHY NOT USD
--   Same problem, one step removed — it would still not be naira,
--   and it would add a second conversion (₦→$→£) before the money
--   reaches a GBP balance. One conversion is cheaper than two.
-- ═══════════════════════════════════════════════════════════

-- ── 1 · Everything is charged in the account's own currency ──

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

update products set charge_currency = 'GBP' where tier is not null;

-- ── 2 · A stored £ fallback, so a dead rate never blocks a sale ──
-- This is the belt-and-braces from fx2 carried forward: if the FX
-- feed is stale we charge this stored figure rather than refusing
-- the sale or guessing.
alter table products add column if not exists charge_minor bigint;   -- in PENCE

-- Seeded at the rate held in fx_rates, +margin, rounded up to 5p.
-- refresh-fx keeps these current; the seed just means it works today.
update products p
   set charge_minor = greatest(
     1,
     ceil(
       ( (p.amount_minor / (select rate from fx_rates where pair = 'NGN/GBP'))
         * (1 + (select value::numeric from config where key = 'fx_margin_pct') / 100)
       ) * 20                                    -- ×20 → units of 5p
     )::bigint * 5
   )
 where p.region = 'africa' and p.tier is not null and p.amount_minor is not null;

-- World products are already priced in pence — the charge IS the price.
update products set charge_minor = amount_minor
 where region = 'world' and tier is not null;

-- ── 3 · price_now, corrected ─────────────────────────────────
/**
 * amount/currency  = what PayPal is actually asked to charge (always GBP)
 * display          = the headline the member is shown (₦ for Africa)
 * compare          = the plain-English truth about the other figure
 *
 * A stale rate no longer blanks anything and never blocks a sale —
 * it just means the stored charge_minor is used instead of a fresh
 * calculation.
 */
create or replace function price_now(p_product text)
returns table (
  amount        numeric,
  currency      text,
  display       text,
  compare       text,
  base_amount   bigint,
  base_currency text,
  rate_used     numeric,
  stale         boolean
)
language plpgsql security definer stable set search_path = public as $$
declare
  v_amt bigint; v_region text; v_stored bigint;
  v_rate numeric; v_age numeric; v_max int; v_margin numeric;
  v_pence bigint; v_val numeric; v_disp text; v_cmp text;
  v_stale boolean := false;
begin
  -- always p.-qualified: several OUT parameter names collide with
  -- column names on this table, and Postgres aborts on ambiguity
  -- rather than guessing.
  select p.amount_minor, p.region, p.charge_minor
    into v_amt, v_region, v_stored
    from products p where p.code = upper(trim(p_product));
  if v_amt is null then return; end if;

  select value::int     into v_max    from config where key = 'fx_max_age_hours';
  select value::numeric into v_margin from config where key = 'fx_margin_pct';
  select rate, extract(epoch from (now() - fetched_at)) / 3600
    into v_rate, v_age from fx_rates where pair = 'NGN/GBP';
  v_stale := v_rate is null or v_rate <= 0 or v_age > coalesce(v_max, 48);

  if v_region = 'africa' then
    -- fresh rate → convert now; stale → use the stored £ figure
    if not v_stale then
      v_pence := greatest(1, (ceil((v_amt / v_rate) * (1 + coalesce(v_margin, 0) / 100) * 20))::bigint * 5);
    else
      v_pence := coalesce(v_stored, 0);
    end if;
    if v_pence <= 0 then return; end if;

    v_val  := v_pence / 100.0;
    v_disp := '₦' || to_char(v_amt, 'FM999,999,999');
    v_cmp  := 'CHARGED AS £' || to_char(v_val, 'FM999990.00')
              || ' — PAYPAL CANNOT TAKE NAIRA DIRECTLY';
  else
    v_pence := coalesce(nullif(v_stored, 0), v_amt);
    v_val   := v_pence / 100.0;
    v_disp  := '£' || to_char(v_val, 'FM999990.00');
    v_cmp   := case when v_stale then null
                    else '≈ ₦' || to_char(round(v_val * v_rate), 'FM999,999,999') || ' TODAY' end;
  end if;

  return query select v_val, 'GBP'::text, v_disp, v_cmp,
                      v_amt, (case when v_region = 'africa' then 'NGN' else 'GBP' end)::text,
                      v_rate, v_stale;
end $$;
grant execute on function price_now(text) to anon, authenticated;

-- ── 3b · Rebuild the list view on top of the corrected price ──
-- price_now() was just redefined, so prices_now() has to be rebuilt
-- against it. Repeated here (rather than relying on fx2) so this file
-- is self-contained: dropping the price functions to avoid 42P13 takes
-- prices_now() with it, and nothing else puts it back.
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

-- ── 4 · Keep the stored fallback in step with the live rate ──
/**
 * Called by refresh-fx after it writes a new rate. Recomputing here
 * rather than in TypeScript keeps one definition of the price.
 */
create or replace function resync_charge_amounts()
returns int
language plpgsql security definer set search_path = public as $$
declare v_rate numeric; v_margin numeric; v_n int;
begin
  select rate into v_rate from fx_rates where pair = 'NGN/GBP';
  if v_rate is null or v_rate <= 0 then return 0; end if;
  select value::numeric into v_margin from config where key = 'fx_margin_pct';

  update products p
     set charge_minor = greatest(1,
           (ceil((p.amount_minor / v_rate) * (1 + coalesce(v_margin, 0) / 100) * 20))::bigint * 5)
   where p.region = 'africa' and p.tier is not null and p.amount_minor is not null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke execute on function resync_charge_amounts() from public, anon, authenticated;
grant execute on function resync_charge_amounts() to service_role;

-- ── 5 · Proof ────────────────────────────────────────────────
do $$
declare r record; bad int;
begin
  select count(*) into bad from products
   where tier is not null and active and coalesce(charge_currency, '') <> 'GBP';
  if bad > 0 then
    raise exception 'STILL % product(s) not charging in GBP — PayPal will reject them', bad;
  end if;

  raise notice '─────────────────────────────────────────────';
  raise notice 'EVERY CHARGE LEAVES IN GBP (PayPal-safe)';
  for r in select * from prices_now() loop
    raise notice '  % shown %  → charges £%  %',
      rpad(r.code, 12), rpad(r.display, 10), r.amount, coalesce(r.compare, '');
  end loop;
  raise notice '─────────────────────────────────────────────';
end $$;
