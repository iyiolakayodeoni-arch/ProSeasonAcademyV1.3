-- ═══════════════════════════════════════════════════════════
-- LIVE EXCHANGE RATES — naira is the real price
--
-- Run in Supabase → SQL Editor AFTER paypal-only.sql. Safe to re-run.
--
-- THE FOUNDER'S CALL
--   Africa's price is ₦7,800. Full stop. The £ figure is just what
--   that converts to today, recalculated at the moment of payment
--   so nobody is ever shown one number and charged another.
--
-- WHY THIS MATTERS
--   The rate was hardcoded at ₦2,000/£. The real rate was ₦1,816 —
--   10% out, undercharging by ~9% on every African sale. Naira moves
--   fast enough that any fixed figure is wrong within months.
-- ═══════════════════════════════════════════════════════════

-- ── 1 · Prices in their true currency ────────────────────────
alter table products add column if not exists amount_minor bigint;   -- ₦7800 or 799p
alter table products add column if not exists base_currency text;    -- 'NGN' | 'GBP'

-- AFRICA — naira is the master
update products set amount_minor = 3900,  base_currency = 'NGN' where code = 'NG-MID-90';
update products set amount_minor = 7800,  base_currency = 'NGN' where code = 'NG-PRO-90';
update products set amount_minor = 25000, base_currency = 'NGN' where code = 'NG-PRO-365';

-- WORLD — already priced in the founder's own currency, no conversion
update products set amount_minor = 799,   base_currency = 'GBP' where code = 'WD-MID-90';
update products set amount_minor = 1599,  base_currency = 'GBP' where code = 'WD-PRO-90';
update products set amount_minor = 4799,  base_currency = 'GBP' where code = 'WD-PRO-365';

-- ── 2 · The rate, refreshed daily ────────────────────────────
create table if not exists fx_rates (
  pair       text primary key,          -- 'NGN/GBP'
  rate       numeric(18,8) not null,    -- NGN per 1 GBP
  fetched_at timestamptz not null default now(),
  source     text
);
alter table fx_rates enable row level security;

drop policy if exists fx_read on fx_rates;
create policy fx_read on fx_rates for select using (true);

-- a sane starting value so nothing is ever divided by null
insert into fx_rates (pair, rate, source) values ('NGN/GBP', 1816.02, 'seed')
on conflict (pair) do nothing;

-- how much margin to add over the mid-market rate. PayPal's own
-- conversion spread is ~4%; this keeps the founder whole without
-- pretending the rate is something it is not.
insert into config (key, value) values
  ('fx_margin_pct', '3'),
  ('fx_max_age_hours', '48')     -- older than this = fall back, do not guess
on conflict (key) do nothing;

-- ── 3 · What a member actually pays, right now ───────────────
/**
 * Converts a product's true price into GBP at today's rate plus the
 * configured margin, rounded UP to a clean 5p so the number looks
 * deliberate rather than machine-generated.
 *
 * A stale rate does NOT silently produce a wrong price — the caller
 * gets `stale = true` and the app falls back to the stored price.
 */
create or replace function price_now(p_product text)
returns table (
  amount_gbp   numeric,
  display      text,
  base_amount  bigint,
  base_currency text,
  rate_used    numeric,
  stale        boolean
)
language plpgsql security definer stable set search_path = public as $$
declare
  v_amt   bigint;
  v_cur   text;
  v_rate  numeric;
  v_age   numeric;
  v_max   int;
  v_marg  numeric;
  v_gbp   numeric;
begin
  -- p.-qualified: base_currency is ALSO an OUT parameter of this
  -- function, and an unqualified reference is ambiguous (Postgres
  -- cannot tell the column from the variable and aborts).
  select p.amount_minor, p.base_currency into v_amt, v_cur
    from products p where p.code = upper(trim(p_product));
  if v_amt is null then return; end if;

  select value::numeric into v_marg from config where key = 'fx_margin_pct';
  select value::int     into v_max  from config where key = 'fx_max_age_hours';

  if v_cur = 'GBP' then
    -- already the founder's currency: no conversion, never stale
    v_gbp := v_amt / 100.0;
    return query select v_gbp, '£' || to_char(v_gbp, 'FM999990.00'),
                        v_amt, v_cur, 1::numeric, false;
    return;
  end if;

  select rate, extract(epoch from (now() - fetched_at)) / 3600
    into v_rate, v_age
    from fx_rates where pair = 'NGN/GBP';

  if v_rate is null or v_rate <= 0 then
    return query select null::numeric, null::text, v_amt, v_cur, null::numeric, true;
    return;
  end if;

  -- ₦ → £, plus margin, rounded UP to the next 5p
  v_gbp := (v_amt::numeric / v_rate) * (1 + coalesce(v_marg, 3) / 100.0);
  v_gbp := ceil(v_gbp * 20) / 20.0;

  return query select
    v_gbp,
    '£' || to_char(v_gbp, 'FM999990.00'),
    v_amt, v_cur, v_rate,
    (v_age > coalesce(v_max, 48));
end $$;
grant execute on function price_now(text) to anon, authenticated;

/** the whole live price list in one call — what the till renders */
create or replace function prices_now(p_region text default null)
returns table (code text, title text, region text, tier text, duration_days int,
               display text, amount_gbp numeric, base_amount bigint,
               base_currency text, price_note text, stale boolean)
language sql security definer stable set search_path = public as $$
  select p.code, p.title, p.region, p.tier, p.duration_days,
         coalesce(n.display, p.price),
         n.amount_gbp, p.amount_minor, p.base_currency,
         case
           when p.base_currency = 'NGN' then
             '₦' || to_char(p.amount_minor, 'FM999,999') || ' AT TODAY''S RATE'
           else p.price_note
         end,
         coalesce(n.stale, false)
    from products p
    left join lateral price_now(p.code) n on true
   where p.active and p.tier is not null
     and (p_region is null or p.region = p_region)
   order by p.sort;
$$;
grant execute on function prices_now(text) to anon, authenticated;

-- ── 4 · Keeping the rate fresh ───────────────────────────────
/** called by the refresh-fx function once a day */
create or replace function set_fx(p_rate numeric, p_source text default 'api')
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_old numeric;
begin
  if p_rate is null or p_rate <= 0 then return false; end if;

  select rate into v_old from fx_rates where pair = 'NGN/GBP';

  -- sanity guard: a >25% jump in a day is far more likely to be a bad
  -- feed than a real move. Refuse it rather than mispricing everything.
  if v_old is not null and (p_rate / v_old > 1.25 or p_rate / v_old < 0.75) then
    perform audit('fx_rejected', 'NGN/GBP',
                  jsonb_build_object('old', v_old, 'new', p_rate));
    return false;
  end if;

  insert into fx_rates (pair, rate, fetched_at, source)
  values ('NGN/GBP', p_rate, now(), p_source)
  on conflict (pair) do update
    set rate = excluded.rate, fetched_at = now(), source = excluded.source;
  return true;
end $$;
revoke execute on function set_fx(numeric, text) from public, anon, authenticated;
grant execute on function set_fx(numeric, text) to service_role;

-- ── 5 · Proof ────────────────────────────────────────────────
do $$
declare r record;
begin
  raise notice 'LIVE PRICING — naira is the master for Africa';
  for r in select * from prices_now() loop
    raise notice '  % · % · %  %',
      rpad(r.code, 12), rpad(coalesce(r.display, '?'), 8),
      coalesce(r.price_note, ''),
      case when r.stale then '⚠ STALE RATE' else '' end;
  end loop;
end $$;
