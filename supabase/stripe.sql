-- ═══════════════════════════════════════════════════════════
-- STRIPE IS THE RAIL — PayPal stays as a fallback
--
-- Run in Supabase → SQL Editor AFTER FINISH_PAYMENTS.sql.
-- Safe to re-run.
--
-- THE FOUNDER'S CALL
--   "lets just use stripe then stripe business instead of using
--    paypal, because a good amount of my customers would actually
--    be nigerian"
--
-- WHY THAT IS RIGHT
--   Nigerian banks restored international payments on ordinary naira
--   cards in July 2025 — GTBank, UBA, Access, First Bank, Zenith,
--   Wema. But PayPal's own risk layer stays wary of Nigeria whatever
--   the issuing bank allows: a card that works on Netflix can still
--   be refused by PayPal. Stripe is a plain card checkout, so the
--   member's OWN BANK makes the decision.
--
--   It is also cheaper on every pass:
--     Stripe  1.5% + 20p (UK) · 3.25% + 20p (international)
--     PayPal  ~2.9% + 30p
--   On a full 1,000-seat season that is roughly £156 kept.
--
-- WHAT DOES NOT CHANGE
--   Prices, the naira headline, the subsidy, grant_tier, the welcome
--   message, refunds, the seat cap. A payment is a payment once it is
--   verified — only the rail in front of it is different.
-- ═══════════════════════════════════════════════════════════

-- ── 1 · Card checkout is how you pay ─────────────────────────
insert into pay_methods (code, label, region, currency, details, holder, note, sort, active)
values ('stripe', 'CARD', null, 'GBP',
        'PAY IN THE APP', 'PROSEASONACADEMY',
        'Your normal bank card. Nigerian cards work — GTBank, UBA, Access, First Bank, Zenith, Wema all allow international payments again. The academy never sees your card details.',
        0, true)
on conflict (code) do update
  set label    = 'CARD',
      region   = null,
      currency = 'GBP',
      note     = excluded.note,
      sort     = 0,
      active   = true;

-- PayPal stays available but second. A working fallback costs nothing
-- to keep, and a dead checkout costs a sale.
update pay_methods set sort = 1, active = true where code = 'paypal';

-- Rails that were never wired up for this account.
update pay_methods set active = false where code in ('opay', 'paystack', 'flutterwave');

-- ── 2 · Fees, recorded honestly ──────────────────────────────
-- Used by the Founder Desk so the founder sees what he actually keeps,
-- not the headline price.
insert into config (key, value) values
  ('fee_note',
   'Stripe takes 1.5% + 20p on UK cards and 3.25% + 20p on international cards. A £4.45 pass nets about £4.11.'),
  ('pay_provider', 'stripe')
on conflict (key) do update set value = excluded.value;

-- ── 3 · Proof ────────────────────────────────────────────────
do $$
declare r record; n int;
begin
  select count(*) into n from pay_methods where active;
  raise notice '─────────────────────────────────────────────';
  raise notice 'PAYMENT RAILS · % active', n;
  for r in select code, label, currency, sort, active from pay_methods order by sort loop
    raise notice '  % · % · % · %',
      rpad(r.code, 12), rpad(r.label, 8), r.currency,
      case when r.active then 'ON' else 'off' end;
  end loop;
  raise notice '';
  raise notice 'Stripe secrets needed:  STRIPE_SECRET · STRIPE_WEBHOOK_SECRET';
  raise notice 'Webhook URL:  /functions/v1/pay-webhook?p=stripe';
  raise notice 'Event:        checkout.session.completed';
  raise notice '─────────────────────────────────────────────';
end $$;
