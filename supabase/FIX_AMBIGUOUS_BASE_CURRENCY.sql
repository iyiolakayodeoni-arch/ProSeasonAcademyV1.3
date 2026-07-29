-- ═══════════════════════════════════════════════════════════
-- FIX: ambiguous column "base_currency" in price_now()
--
-- The function's RETURNS TABLE declares base_currency as an
-- output column. When the function body then does
--   SELECT base_currency FROM products
-- PostgreSQL cannot tell whether you mean the table column or
-- the function variable. Qualifying with the table alias fixes it.
--
-- Run this ONCE in Supabase → SQL Editor. Then re-run fx3.sql.
-- ═══════════════════════════════════════════════════════════

-- 1. Drop every version so we start from a clean slate
drop function if exists price_now(text) cascade;

-- 2. Drop prices_now too (it depends on price_now, cascade handles this)
drop function if exists prices_now(text) cascade;

-- 3. Recreate price_now (fx3 version, table-qualified)
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
  v_amt    bigint;
  v_region text;
  v_stored bigint;
  v_rate   numeric;
  v_age    numeric;
  v_max    int;
  v_margin numeric;
  v_pence  bigint;
  v_val    numeric;
  v_disp   text;
  v_cmp    text;
  v_stale  boolean := false;
begin
  -- TABLE-QUALIFIED: p.amount_minor, p.region, p.charge_minor
  -- avoids ambiguity with the function's own output columns
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

-- 4. Recreate prices_now (table-qualified)
create or replace function prices_now(p_region text default null)
returns table (
  code          text,
  title         text,
  region        text,
  tier          text,
  duration_days int,
  display       text,
  amount        numeric,
  currency      text,
  compare       text,
  base_amount   bigint,
  base_currency text,
  price_note    text,
  stale         boolean
)
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

-- 5. Proof it works now
do $$
declare r record;
begin
  raise notice '─────────────────────────────────────────────';
  raise notice 'PRICE_NOW FIXED — table-qualified columns';
  for r in select * from prices_now() loop
    raise notice '  % shown %  → charges £%  %',
      rpad(r.code, 12), rpad(r.display, 10), r.amount, coalesce(r.compare, '');
  end loop;
  raise notice '─────────────────────────────────────────────';
end $$;
