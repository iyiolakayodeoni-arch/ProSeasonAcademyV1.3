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

-- ── 4 · Hosted PayPal buttons — the automatic path ───────────
-- Create ONE button per pass in PayPal → Pay & Get Paid → PayPal
-- Buttons (or a Subscription/Checkout link), then paste its URL here.
--
-- The app appends the member's identity to the link, so the webhook
-- can grant the pass with nobody typing anything:
--     ...&custom=PSA-A1B2C3|NG-PRO-90
--
--   Table Editor → products → pay_link
--   e.g. https://www.paypal.com/ncp/payment/XXXXXXXX
--
-- Until a real link is set the app falls back to showing your PayPal
-- address and the claim flow — so nothing is ever blocked on this.
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

-- ── 7 · The welcome, sent by the system ──────────────────────
-- The founder: "they would be sent like a message saying welcome back
-- lets win some tournaments." grant_tier already runs on every
-- successful payment, so hanging the message off it means it fires
-- automatically — webhook or manual, there is no path that pays
-- without being welcomed.
create or replace function welcome_paid(p_academy text, p_tier text, p_exp timestamptz)
returns void
language plpgsql security definer set search_path = public as $$
declare v_msg text; v_name text;
begin
  select handle into v_name from profiles where academy_id = p_academy;

  v_msg :=
    'WELCOME BACK' || coalesce(', ' || v_name, '') || ' — LET''S GO WIN SOMETHING' || E'\n\n' ||
    'Payment received. Your ' ||
    case when p_tier = 'pro' then 'PRO' when p_tier = 'mid' then 'ACADEMY' else upper(p_tier) end ||
    ' pass runs until ' || to_char(p_exp, 'DD Mon YYYY') || '.' || E'\n\n' ||
    'Everything is open — the full journey, the film room, every trick your coach drops. ' ||
    'You carry on from exactly the node you stopped at; nothing was lost.' || E'\n\n' ||
    'Now go and take some scalps. Your coach is waiting.';

  perform notify_member(p_academy, 'message', v_msg, 'WELCOME_PAID');
end $$;
revoke execute on function welcome_paid(text, text, timestamptz) from public, anon, authenticated;
grant execute on function welcome_paid(text, text, timestamptz) to service_role;

-- hang it off grant_tier so EVERY paid path sends it
create or replace function grant_tier(
  p_academy text,
  p_product text,
  p_ref     text default null
) returns table (tier text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_tier text; v_days int; v_title text;
  v_cur text; v_curexp timestamptz;
  v_newlvl int; v_curlvl int;
  v_base timestamptz; v_exp timestamptz;
begin
  p_academy := upper(trim(p_academy));
  p_product := upper(trim(p_product));

  if not exists (select 1 from profiles
                  where academy_id = p_academy and academy_id <> 'PSA-FOUNDER') then
    raise exception 'unknown academy id';
  end if;

  select tier, duration_days, title into v_tier, v_days, v_title
    from products where code = p_product and active;
  if v_tier is null or v_days is null then
    raise exception 'unknown or non-tier product';
  end if;

  insert into entitlements (academy_id) values (p_academy) on conflict do nothing;
  perform 1 from entitlements where academy_id = p_academy for update;

  select e.tier, e.expires_at into v_cur, v_curexp
    from entitlements e where e.academy_id = p_academy;

  select level into v_newlvl from tiers where key = v_tier;
  select level into v_curlvl from tiers where key = coalesce(v_cur, 'free');

  if v_curexp is not null and v_curexp > now() and v_curlvl > v_newlvl then
    raise exception 'ACTIVE_HIGHER_TIER';
  end if;

  v_base := greatest(coalesce(v_curexp, now()), now());
  v_exp  := v_base + (v_days || ' days')::interval;

  update entitlements
     set tier = v_tier, expires_at = v_exp, source = p_product, updated_at = now()
   where academy_id = p_academy;

  insert into wallets (academy_id) values (p_academy) on conflict do nothing;
  update wallets
     set plan = case when v_tier = 'pro' then 'pro' else 'free' end,
         plan_renews = to_char(v_exp, 'YYYY-MM-DD'),
         updated_at = now()
   where academy_id = p_academy;

  insert into ledger (academy_id, delta, reason, ref, actor)
    values (p_academy, 0,
            upper(v_tier) || ' · ' || v_title || ' → ' || to_char(v_exp, 'DD Mon YYYY'),
            left(p_ref, 60), 'founder');

  insert into unlocks (academy_id, item)
  select p_academy, pi.item from pack_items pi where pi.pack_code = p_product
  on conflict do nothing;

  -- paying clears any removal deadline
  update profiles set deadline_at = null where academy_id = p_academy;

  -- and the welcome goes out, every time, automatically
  perform welcome_paid(p_academy, v_tier, v_exp);

  return query select v_tier, v_exp;
end $$;
revoke execute on function grant_tier(text, text, text) from public, anon, authenticated;
grant execute on function grant_tier(text, text, text) to service_role;
