-- ═════════════════════════════════════════════════════════════
-- PAYPAL ONLY — one account, one currency, two price tracks
--
-- Run in Supabase → SQL Editor AFTER claims.sql. Safe to re-run.
--
-- THE FOUNDER'S DECISIONS
--   · Everything goes to ONE UK PayPal account. No OPay, no
--     Paystack, no Flutterwave, no separate rails to reconcile.
--   · Africa keeps its cheaper pricing — the naira price is simply
--     charged as its GBP equivalent, so both tracks land in the
--     same account.
--   · The 1-month pass is GONE. PayPal's flat ~£0.30 fee ate
--     23–43% of it, and a 3-month minimum filters for the people
--     who are actually serious.
--
-- WHY GBP FOR EVERYONE
--   The founder's account is UK. Charging in his own currency
--   avoids PayPal's ~4% conversion spread on every transaction and
--   means the number he sees is the number he keeps.
--   Members abroad see £; Africa members see the £ equivalent of
--   the naira price, clearly labelled so nothing feels hidden.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · PayPal is the only way to pay ────────────────────────
update pay_methods set active = false where code <> 'paypal';

insert into pay_methods (code, label, region, currency, details, holder, note, sort, active)
values ('paypal', 'PAYPAL', null, 'GBP',
        'REPLACE-WITH-YOUR-PAYPAL-EMAIL', 'REPLACE WITH THE NAME ON THE ACCOUNT',
        'Send as GOODS AND SERVICES — never Friends and Family. Goods and Services gives YOU PayPal''s buyer protection. Anyone asking for Friends and Family is avoiding that protection.',
        1, true)
on conflict (code) do update
  set region   = null,          -- one method, both regions
      currency = 'GBP',
      label    = 'PAYPAL',
      note     = excluded.note,
      active   = true;

-- ── 2 · Retire the monthly passes ────────────────────────────
-- Kept, not deleted, so old ledger rows still resolve to a name.
update products set active = false
 where duration_days = 30 and tier is not null;

-- ── 3 · Reprice everything in GBP ────────────────────────────
-- price      = what the member is charged (always £)
-- price_note = the honest explanation of where that number came from
alter table products add column if not exists price_note text;

-- AFRICA — the naira price, charged as its GBP equivalent
update products set price = '£1.95',  price_note = 'THE ₦3,900 ACADEMY PRICE, CHARGED IN £'
 where code = 'NG-MID-90';
update products set price = '£3.90',  price_note = 'THE ₦7,800 PRO PRICE, CHARGED IN £'
 where code = 'NG-PRO-90';
update products set price = '£12.50', price_note = 'THE ₦25,000 SEASON PRICE, CHARGED IN £'
 where code = 'NG-PRO-365';

-- WORLD
update products set price = '£7.99',  price_note = '3 MONTHS · WORKS OUT AT £2.66 A MONTH'
 where code = 'WD-MID-90';
update products set price = '£15.99', price_note = '3 MONTHS · WORKS OUT AT £5.33 A MONTH'
 where code = 'WD-PRO-90';
update products set price = '£47.99', price_note = 'A FULL SEASON · WORKS OUT AT £4.00 A MONTH'
 where code = 'WD-PRO-365';

-- ── 4 · A PayPal.me or payment link per product ──────────────
-- Optional but strongly recommended: the amount is pre-filled, so
-- nobody can mistype it and nobody has to be told a number.
--   Table Editor → products → pay_link
--   e.g. https://www.paypal.com/paypalme/YOURNAME/12.50
update products set pay_link = 'ASK-IN-HALL'
 where active and tier is not null and (pay_link is null or pay_link = '');

-- ── 5 · Tell members why monthly is gone ─────────────────────
insert into config (key, value) values
  ('min_duration_note',
   'The shortest pass is 3 months. Card fees on small payments are brutal — a 1-month pass lost nearly half its value to charges, which helped nobody. Longer passes cost you less per month and mean more of your money reaches the academy.')
on conflict (key) do update set value = excluded.value;

-- ── 6 · Proof ────────────────────────────────────────────────
do $$
declare r record; v_ph int;
begin
  raise notice 'PAYPAL ONLY — active passes:';
  for r in
    select code, region, tier, duration_days, price, price_note
      from products where active and tier is not null order by region, sort
  loop
    raise notice '  % · % · % days · %  (%)',
      rpad(r.code, 12), upper(r.region), r.duration_days, r.price, coalesce(r.price_note, '');
  end loop;

  select count(*) into v_ph from pay_methods
   where active and details like 'REPLACE-%';
  if v_ph > 0 then
    raise notice '';
    raise notice '  ⚠️  PayPal details are still a PLACEHOLDER.';
    raise notice '      Table Editor → pay_methods → paypal → set details + holder';
  end if;
end $$;
