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

  -- PSA-<seat>-<4 chars>: short enough to type into a transfer note
  v_ref := replace(v_academy, 'PSA-', '') || '-' ||
           upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 4));

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
