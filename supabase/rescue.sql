-- ═══════════════════════════════════════════════════════════
-- THE RESCUE PATH — card fails, nobody is lost
--
-- Run in Supabase → SQL Editor AFTER stripe.sql. Safe to re-run.
--
-- THE FOUNDER'S CALL
--   "if the stripe doesnt work they should come to me we would solve
--    thier issues for them basically with thier id then they should
--    sha just dm me self"
--
-- THREE DOORS, IN ORDER
--   1. CARD (Stripe)      — automatic, seconds, no human involved
--   2. OPAY / TRANSFER    — they send it, quote a reference, you approve
--   3. TALK TO THE FOUNDER — the ID lands in your inbox and you sort it
--
--   Nobody ever hits a dead end. A member who cannot pay is a member
--   who wanted to pay, which is the opposite of a problem.
--
-- WHY OPAY COMES BACK ON
--   stripe.sql switched it off because Stripe was meant to be the only
--   rail. But a Nigerian whose bank refuses an international card can
--   still send naira to an OPay account in ten seconds. It is not a
--   competing rail — it is the safety net under the main one.
-- ═══════════════════════════════════════════════════════════

-- ── 1 · The three doors, in the order the member should try them ──
update pay_methods set sort = 0, active = true where code = 'stripe';

-- OPay: the fallback, priced in naira because that is what they hold
insert into pay_methods (code, label, region, currency, details, holder, note, sort, active)
values ('opay', 'OPAY / BANK TRANSFER', 'africa', 'NGN',
        'REPLACE-WITH-YOUR-OPAY-NUMBER', 'REPLACE WITH THE ACCOUNT NAME',
        'Only if your card was refused. Put your REFERENCE in the transfer narration — that is how the payment gets matched to your seat. Then submit the claim below so it reaches the founder.',
        1, true)
on conflict (code) do update
  set label  = 'OPAY / BANK TRANSFER',
      region = 'africa',
      note   = excluded.note,
      sort   = 1,
      active = true;

-- PayPal stays available but last: it is the rail Nigerian cards
-- struggle with most, so it should never be the suggestion.
update pay_methods set sort = 2, active = true where code = 'paypal';

update pay_methods set active = false where code in ('paystack', 'flutterwave');

-- ── 2 · "My card was refused" — a first-class message ────────
/**
 * A member whose card failed should not have to work out what to say.
 * One tap files a message that already carries their Academy ID, the
 * pass they were trying to buy, and the price — so the founder can
 * answer with a solution instead of a question.
 *
 * Deliberately NOT rate-limited the way chat is: someone who cannot
 * pay is already frustrated, and a "slow down" message at that moment
 * would be the last thing they ever did in the app. The one-per-hour
 * guard below is only to stop a stuck retry loop spamming the inbox.
 */
create or replace function payment_trouble(
  p_product text default null,
  p_note    text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_academy text;
  v_handle  text;
  v_region  text;
  v_recent  int;
  v_price   text;
  v_body    text;
begin
  select academy_id, handle, region into v_academy, v_handle, v_region
    from profiles where auth_user_id = auth.uid() and status <> 'removed';
  if v_academy is null then raise exception 'no active seat'; end if;

  -- one an hour is plenty; a stuck retry loop must not flood the inbox
  select count(*) into v_recent from contact_messages
   where academy_id = v_academy
     and kind = 'payment'
     and at > now() - interval '1 hour';
  if v_recent >= 1 then
    return 'ALREADY_SENT';
  end if;

  select display into v_price from prices_now() where code = upper(trim(p_product));

  v_body :=
    'CARD DID NOT GO THROUGH' || E'\n\n' ||
    'ID: ' || v_academy || E'\n' ||
    'HANDLE: ' || coalesce(v_handle, '?') || E'\n' ||
    'REGION: ' || coalesce(upper(v_region), '?') || E'\n' ||
    'WANTS: ' || coalesce(upper(trim(p_product)), '(not said)') ||
      coalesce(' · ' || v_price, '') || E'\n\n' ||
    coalesce('THEY SAID: ' || left(p_note, 500), 'They did not add a note.');

  insert into contact_messages (user_id, handle, academy_id, kind, body)
  select p.id, v_handle, v_academy, 'payment', v_body
    from profiles p where p.academy_id = v_academy;

  -- tell them a human has it, so the silence does not feel like a wall
  perform notify_member(v_academy, 'message',
    'WE GOT IT — YOUR CARD DIDN''T GO THROUGH' || E'\n\n' ||
    'Your ID is ' || v_academy || '. That is all the founder needs.' || E'\n\n' ||
    'He will message you here and sort it personally — usually the same day. ' ||
    'If you would rather not wait, you can send it to the OPay account in the ' ||
    'till and submit a claim with your reference.' || E'\n\n' ||
    'Your seat is not going anywhere while we sort this out.',
    'PAYMENT');

  return 'SENT';
end $$;
grant execute on function payment_trouble(text, text) to authenticated;

-- ── 3 · The founder's view: who is stuck, and on what ────────
/**
 * These are people trying to give you money and failing. They should
 * be the first thing you see, not buried in the general inbox.
 */
create or replace function stuck_payments()
returns table (
  id         bigint,
  academy_id text,
  handle     text,
  body       text,
  at         timestamptz,
  read       boolean,
  has_claim  boolean,
  paid_since boolean
)
language sql security definer stable set search_path = public as $$
  select c.id, c.academy_id, c.handle, c.body, c.at, c.read,
         exists (select 1 from payment_claims pc
                  where pc.academy_id = c.academy_id and pc.status = 'pending'),
         exists (select 1 from entitlements e
                  where e.academy_id = c.academy_id and e.expires_at > c.at)
    from contact_messages c
   where c.kind = 'payment'
     and coalesce(c.replied, false) = false
   order by c.at desc;
$$;
revoke execute on function stuck_payments() from public, anon, authenticated;
grant execute on function stuck_payments() to service_role;

-- ── 4 · Proof ────────────────────────────────────────────────
do $$
declare r record; n int;
begin
  raise notice '─────────────────────────────────────────────';
  raise notice 'THE THREE DOORS';
  for r in select code, label, coalesce(region, 'both') as region, sort
             from pay_methods where active order by sort loop
    raise notice '  %. % · % · %', r.sort + 1, rpad(r.code, 8), rpad(r.label, 22), r.region;
  end loop;

  select count(*) into n from pay_methods
   where active and details like 'REPLACE-WITH%';
  if n > 0 then
    raise notice '';
    raise notice '  ⚠  % method(s) still hold PLACEHOLDER details.', n;
    raise notice '     Table Editor → pay_methods → set your real OPay number.';
  end if;

  raise notice '';
  raise notice 'RESCUE ARMED · members can report a failed card in one tap';
  raise notice '  founder reads:  select * from stuck_payments();';
  raise notice '─────────────────────────────────────────────';
end $$;
