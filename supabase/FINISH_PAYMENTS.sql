-- ═══════════════════════════════════════════════════════════
-- FINISH PAYMENTS — the only SQL you still need to run
--
-- GENERATED. Edit the section files, then: python3 supabase/build-finish.py
--
-- Already on your database: schema, seat-gate, security, packs,
-- tiers, access, consult, enforcement, notices.  ✅
-- This adds the rest: claims, paypal-only, fx, fx2, fx3 — the till,
-- the prices, and PayPal.
--
-- Paste the WHOLE file into Supabase → SQL Editor → Run.
-- Safe to re-run. About 15 seconds.
--
-- Every column is created up front, so section order cannot break it.
-- ═══════════════════════════════════════════════════════════


-- ▓▓▓▓▓▓▓▓▓▓ claims.sql ▓▓▓▓▓▓▓▓▓▓

-- ═════════════════════════════════════════════════════════════
-- PAYMENT CLAIMS — "I have paid", on the record, both sides
--
-- Run in Supabase → SQL Editor AFTER notices.sql. Safe to re-run.
--
-- THE PROBLEM THIS SOLVES
--   A member sends money to PayPal or OPay and then… waits. No
--   record, no status, no way to prove they paid. That silence is
--   exactly when someone starts wondering if they have been
--   scammed — and the founder has nothing to check against either.
--
--   Now: they tap a pass, get a unique reference to put in the
--   payment, and submit a claim. It lands in the Founder Desk with
--   the amount and reference. The founder checks the real account,
--   taps approve, and grant_tier runs automatically.
--
--   Both sides can see the same claim and its status the whole way.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · Where the money actually goes ────────────────────────
-- Editable in the Table Editor. Nothing about the founder's bank
-- details lives in the app build.
create table if not exists pay_methods (
  code       text primary key,          -- 'paypal' | 'opay'
  label      text not null,             -- what the member sees
  region     text,                      -- 'africa' | 'world' | null = both
  currency   text not null,
  details    text not null,             -- the address / account number
  holder     text,                      -- the name on the account
  note       text,                      -- anything else they must know
  sort       int not null default 0,
  active     boolean not null default true
);
alter table pay_methods enable row level security;

drop policy if exists pay_methods_read on pay_methods;
create policy pay_methods_read on pay_methods
  for select to authenticated using (active);

-- Seeded as PLACEHOLDERS — replace the details before launch.
insert into pay_methods (code, label, region, currency, details, holder, note, sort) values
  ('paypal', 'PAYPAL', 'world', 'GBP',
   'REPLACE-WITH-YOUR-PAYPAL-EMAIL', 'REPLACE WITH THE NAME ON THE ACCOUNT',
   'Send as GOODS AND SERVICES, not Friends and Family — that is what protects you.', 1),
  ('opay', 'OPAY / BANK TRANSFER', 'africa', 'NGN',
   'REPLACE-WITH-YOUR-OPAY-NUMBER', 'REPLACE WITH THE ACCOUNT NAME',
   'Put your reference in the transfer narration so it can be matched.', 2)
on conflict (code) do nothing;

-- ── 2 · The claim ────────────────────────────────────────────
create table if not exists payment_claims (
  id          bigint generated always as identity primary key,
  academy_id  text not null references profiles(academy_id) on delete cascade,
  handle      text,
  product     text not null references products(code),
  method      text not null,
  reference   text not null unique,     -- what they put in the payment
  amount      text,                     -- what they say they sent
  sender_note text,                     -- their bank name / PayPal email
  status      text not null default 'pending',  -- pending|approved|rejected
  at          timestamptz not null default now(),
  decided_at  timestamptz,
  decided_note text
);
create index if not exists idx_claims_pending on payment_claims (status, at desc);
alter table payment_claims enable row level security;

-- a member sees only their own claims, and can only file as themselves
drop policy if exists claims_read_own on payment_claims;
create policy claims_read_own on payment_claims
  for select to authenticated
  using (academy_id in (select academy_id from profiles where auth_user_id = auth.uid()));

/**
 * File a claim. The reference is generated SERVER-SIDE so it is
 * unique and cannot be spoofed to collide with someone else's.
 */
create or replace function claim_payment(
  p_product text,
  p_method  text,
  p_amount  text default null,
  p_note    text default null
) returns table (reference text, product text, method text)
language plpgsql security definer set search_path = public as $$
declare
  v_academy text;
  v_handle  text;
  v_ref     text;
  v_open    int;
begin
  select academy_id, handle into v_academy, v_handle
    from profiles where auth_user_id = auth.uid() and status = 'active';
  if v_academy is null then raise exception 'no active seat'; end if;

  if not exists (select 1 from products where code = upper(trim(p_product)) and active) then
    raise exception 'unknown product';
  end if;

  -- one open claim at a time: stops a member filing ten and confusing
  -- the queue while the founder is checking the first
  select count(*) into v_open from payment_claims
   where academy_id = v_academy and status = 'pending';
  if v_open >= 1 then
    raise exception 'CLAIM_PENDING';
  end if;

  -- PSA-<seat>-<4 chars>: short enough to type into a transfer note.
  --
  -- md5(random()||clock_timestamp()) rather than gen_random_bytes():
  -- the latter needs the pgcrypto extension, which is NOT enabled by
  -- default on a Supabase project. Every claim would have died with
  --     ERROR 42883: function gen_random_bytes(integer) does not exist
  -- at the exact moment a member whose card failed tried the fallback.
  -- md5() and random() are core Postgres and always present.
  --
  -- 4 hex chars = 65,536 combinations per seat, and the reference is
  -- only ever matched against ONE member's payment, so a collision
  -- across different seats is harmless. The unique index still catches
  -- the improbable case.
  v_ref := replace(v_academy, 'PSA-', '') || '-' ||
           upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));

  insert into payment_claims (academy_id, handle, product, method, reference, amount, sender_note)
  values (v_academy, v_handle, upper(trim(p_product)), lower(trim(p_method)),
          v_ref, left(p_amount, 40), left(p_note, 300));

  perform notify_member(v_academy, 'message',
    'PAYMENT CLAIM RECEIVED' || E'\n\n' ||
    'Reference: ' || v_ref || E'\n' ||
    'For: ' || upper(trim(p_product)) || E'\n\n' ||
    'The founder checks the account by hand and approves it — usually the same day. ' ||
    'You will get a message here the moment it lands. If something looks wrong, just ' ||
    'reply to this message.',
    'CLAIM');

  return query select v_ref, upper(trim(p_product)), lower(trim(p_method));
end $$;
grant execute on function claim_payment(text, text, text, text) to authenticated;

/** what the member sees on their own claims */
create or replace function my_claims()
returns table (id bigint, product text, method text, reference text,
               amount text, status text, at timestamptz, decided_note text)
language sql security definer stable set search_path = public as $$
  select c.id, c.product, c.method, c.reference, c.amount, c.status, c.at, c.decided_note
    from payment_claims c
    join profiles p on p.academy_id = c.academy_id
   where p.auth_user_id = auth.uid()
   order by c.at desc
   limit 20;
$$;
grant execute on function my_claims() to authenticated;

-- ── 3 · The founder approves, and the pass is granted ────────
/**
 * One tap: marks the claim approved AND runs grant_tier, so there is
 * no way to approve a payment without the member actually receiving
 * what they paid for. Same function, same audit trail, same ledger.
 */
create or replace function decide_claim(
  p_id       bigint,
  p_approve  boolean,
  p_note     text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_academy text;
  v_product text;
  v_ref     text;
  v_status  text;
  v_tier    text;
  v_exp     timestamptz;
begin
  select academy_id, product, reference, status
    into v_academy, v_product, v_ref, v_status
    from payment_claims where id = p_id for update;

  if v_academy is null then
    return jsonb_build_object('ok', false, 'error', 'unknown claim');
  end if;
  if v_status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'already ' || v_status);
  end if;

  if not p_approve then
    update payment_claims
       set status = 'rejected', decided_at = now(), decided_note = left(p_note, 300)
     where id = p_id;

    perform notify_member(v_academy, 'message',
      'PAYMENT NOT FOUND YET' || E'\n\n' ||
      'Reference: ' || v_ref || E'\n\n' ||
      coalesce(p_note, 'The founder could not match this payment to the account.') || E'\n\n' ||
      'This is usually a missing reference or a transfer still clearing. Nothing is ' ||
      'lost — reply here with a screenshot and it gets sorted.',
      'CLAIM');

    perform audit('claim_rejected', v_academy, jsonb_build_object('claim', p_id, 'ref', v_ref));
    return jsonb_build_object('ok', true, 'approved', false);
  end if;

  -- approved → grant the pass in the same transaction
  select tier, expires_at into v_tier, v_exp
    from grant_tier(v_academy, v_product, v_ref);

  update payment_claims
     set status = 'approved', decided_at = now(), decided_note = left(p_note, 300)
   where id = p_id;

  perform notify_member(v_academy, 'message',
    'PAYMENT CONFIRMED — YOU ARE IN' || E'\n\n' ||
    'Reference: ' || v_ref || E'\n' ||
    'Pass: ' || upper(coalesce(v_tier, '')) ||
    ' until ' || to_char(v_exp, 'DD Mon YYYY') || E'\n\n' ||
    'Everything is open. Thank you for backing this — it is what keeps the academy running.',
    'CLAIM');

  perform audit('claim_approved', v_academy,
                jsonb_build_object('claim', p_id, 'ref', v_ref, 'product', v_product));

  return jsonb_build_object('ok', true, 'approved', true,
                            'tier', v_tier, 'expiresAt', v_exp);
end $$;
revoke execute on function decide_claim(bigint, boolean, text) from public, anon, authenticated;
grant execute on function decide_claim(bigint, boolean, text) to service_role;

-- ── 4 · Proof ────────────────────────────────────────────────
do $$
declare v_m int; v_ph int;
begin
  select count(*) into v_m from pay_methods where active;
  select count(*) into v_ph from pay_methods where details like 'REPLACE-%';
  raise notice 'PAYMENT CLAIMS ARMED · % method(s) active', v_m;
  if v_ph > 0 then
    raise notice '  ⚠️  % method(s) still hold PLACEHOLDER details —', v_ph;
    raise notice '      Table Editor → pay_methods → set your real PayPal / OPay details';
  end if;
end $$;


-- ▓▓▓▓▓▓▓▓▓▓ paypal-only.sql ▓▓▓▓▓▓▓▓▓▓

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


-- ▓▓▓▓▓▓▓▓▓▓ fx.sql ▓▓▓▓▓▓▓▓▓▓

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


-- ▓▓▓▓▓▓▓▓▓▓ fx2.sql ▓▓▓▓▓▓▓▓▓▓

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


-- ▓▓▓▓▓▓▓▓▓▓ fx3.sql ▓▓▓▓▓▓▓▓▓▓

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


-- ▓▓▓▓▓▓▓▓▓▓ FINAL CHECK ▓▓▓▓▓▓▓▓▓▓
-- Fails loudly rather than letting you think this worked when it did not.
do $$
declare n int; bad int; r record;
begin
  raise notice '';
  raise notice '═══════════════════════════════════════════════';

  if to_regclass('public.pay_methods') is null then
    raise exception 'pay_methods missing — claims section did not apply';
  end if;
  if to_regclass('public.fx_rates') is null then
    raise exception 'fx_rates missing — fx section did not apply';
  end if;

  select count(*) into n from products where tier is not null and active;
  if n = 0 then raise exception 'no active passes — tiers.sql did not apply'; end if;

  select count(*) into bad from products
   where tier is not null and active and coalesce(charge_currency, '') <> 'GBP';
  if bad > 0 then
    raise exception '% pass(es) not charging GBP — PayPal would reject them', bad;
  end if;

  select count(*) into bad from products
   where tier is not null and active and coalesce(charge_minor, 0) <= 0;
  if bad > 0 then
    raise exception '% pass(es) have no charge amount', bad;
  end if;

  -- the naira headline must survive: Africa prices are stored in NGN
  select count(*) into bad from products
   where region = 'africa' and tier is not null and active
     and coalesce(amount_minor, 0) <= 0;
  if bad > 0 then
    raise exception '% Africa pass(es) lost their naira price', bad;
  end if;

  -- the 1-month passes stay retired: PayPal's flat ~30p fee ate them
  select count(*) into bad from products
   where duration_days = 30 and tier is not null and active;
  if bad > 0 then
    raise exception '% monthly pass(es) still active — should be retired', bad;
  end if;

  raise notice 'PAYMENTS READY · % passes, all charging GBP', n;
  raise notice '';
  for r in select code, display, amount from prices_now() loop
    raise notice '  % shown %  → charges £%',
      rpad(r.code, 12), rpad(r.display, 10), to_char(r.amount, 'FM999990.00');
  end loop;
  raise notice '';
  raise notice 'NEXT: deploy pay-start, pay-webhook, refresh-fx,';
  raise notice '      then set the PayPal secrets.';
  raise notice '═══════════════════════════════════════════════';
end $$;
