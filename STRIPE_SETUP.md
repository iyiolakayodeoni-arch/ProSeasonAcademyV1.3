# Stripe — setting it up, start to finish

Stripe is now the way members pay. PayPal stays wired up underneath as a
fallback, because a working second rail costs nothing and a dead checkout
costs a sale.

**About 25 minutes.** Do the steps in order.

```
member taps PAY → Stripe takes the card → Stripe calls your webhook
   → signature verified → pass granted → "WELCOME BACK — LET'S GO WIN
   SOMETHING" lands in their inbox → app shows YOU'RE IN
```

You are not involved at any point.

---

## Why Stripe, in one paragraph

Most of your members are Nigerian. Nigerian banks restored international
payments on ordinary naira cards in July 2025 — GTBank, UBA, Access, First
Bank, Zenith, Wema. But **PayPal's own risk layer stays wary of Nigeria**
whatever the bank allows: a card that works on Netflix can still be refused by
PayPal. Stripe is a plain card checkout, so the member's own bank makes the
call. It is also cheaper on every pass — roughly **£156 more kept** across a
full 1,000-seat season.

---

## The three doors

Nobody who wants to pay you ever hits a dead end:

| | Door | What happens |
|---|---|---|
| **1** | **CARD** (Stripe) | Automatic. Seconds. You are not involved. |
| **2** | **OPAY / TRANSFER** | Card refused → they send naira, quote a reference, you approve in the Desk. |
| **3** | **TALK TO ME** | One tap sends you their ID, the pass they wanted and the price. You sort it personally. |

Door 3 is the important one. A member whose card fails is someone who *wanted*
to pay — the opposite of a problem. The till now says so in plain words, and
your Founder Desk puts these people **above** the general inbox, because each
one is a sale you still have if you answer today.

---

## Step 1 · Finish the database (5 min)

Three files, in this order, in Supabase → **SQL Editor**:

1. **`supabase/FINISH_PAYMENTS.sql`** — the prices and the till. Still not run.
2. **`supabase/stripe.sql`** — makes CARD the payment method.
3. **`supabase/rescue.sql`** — the OPay fallback and the "talk to me" path.

All three are safe to re-run and all three have been executed against a real
Postgres loaded with a copy of your database. `rescue.sql` finishes by printing
your three doors in order.

**Check it worked:**

```sql
select code, label, sort, active from pay_methods where active order by sort;
```

Expect exactly this:

```
stripe · CARD                 · 0 · true
opay   · OPAY / BANK TRANSFER · 1 · true
paypal · PAYPAL               · 2 · true
```

### Then put your real OPay details in

Table Editor → **`pay_methods`** → the `opay` row:

- `details` → your OPay number
- `holder` → the name on the account

It ships as `REPLACE-WITH-YOUR-OPAY-NUMBER`. Until you change it, door 2 is
telling people to send money to a placeholder.

---

## Step 2 · Create the Stripe account (10 min)

**stripe.com** → Sign up → choose **United Kingdom**.

You will need:
- Your business details (sole trader is fine — your name and address)
- Your UK bank account for payouts
- Photo ID

Verification is usually same-day, sometimes instant. You can build everything
below in **test mode** while you wait.

---

## Step 3 · Get your secret key (2 min)

Stripe Dashboard → **Developers** → **API keys**.

There is a **Test mode** toggle top-right. Leave it **ON** for now.

Copy the **Secret key** — starts `sk_test_…` (later `sk_live_…`).

> Never the *publishable* key. This one is secret; it goes in Supabase, nowhere
> else, and never into the app.

---

## Step 4 · Create the webhook (5 min)

The webhook is how Stripe tells your app the money arrived. Without it members
pay and nothing opens.

**Developers** → **Webhooks** → **Add endpoint**.

**Endpoint URL:**
```
https://ymnkphqgjxexsnbgtqvk.supabase.co/functions/v1/pay-webhook?p=stripe
```

**Events to send** — tick this one only:

- ✅ `checkout.session.completed`

*(Optionally also `checkout.session.async_payment_succeeded` — it covers slow
bank-backed payments. The code already handles it.)*

**Add endpoint**, then click into it and reveal the **Signing secret** — starts
`whsec_…`. Copy it.

---

## Step 5 · Put the keys in Supabase (2 min)

Supabase → **Edge Functions** → **Secrets** → Add:

| Name | Value |
|---|---|
| `STRIPE_SECRET` | `sk_test_…` from step 3 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from step 4 |

Also add `FOUNDER_KEY` (any long random string) if you have not — it unlocks
your Founder Desk.

You do **not** need the PayPal secrets any more. Leave them if they are already
there; the fallback will simply work.

---

## Step 6 · Deploy the functions (5 min)

Supabase → **Edge Functions** → **Deploy a new function** → **via Editor**.

| Function name | Paste from |
|---|---|
| `pay-start` | `supabase/functions/pay-start/index.ts` |
| `pay-webhook` | `supabase/functions/pay-webhook/index.ts` |
| `refresh-fx` | `supabase/functions/refresh-fx/index.ts` |

For each: **click into the code box, Ctrl+A, Delete**, then paste the whole
file. Pasting on top of the sample code is what caused your
`Module not found "_shared/cors.ts"` failure before.

### Then turn OFF "Verify JWT" on `pay-webhook`

`pay-webhook` → **Settings** → **Verify JWT with legacy secret** → **off** → Save.

Stripe is not a logged-in user and has no JWT. Leave this on and Stripe's calls
are rejected before reaching your code — payments arrive, nothing opens, and
the logs look empty. **This is the single most common reason a webhook silently
does nothing.**

It is not unprotected: every call is HMAC-verified against your signing secret.
I have tested that verification against forged signatures, tampered bodies and
replayed requests — all rejected (`node tests/stripe-webhook.test.mjs`).

---

## Step 7 · Test with a fake card (3 min)

In your app: sign in, open the till, tap a pass, pay with Stripe's test card:

```
Card    4242 4242 4242 4242
Expiry  any future date      CVC  any 3 digits
```

**Expected:** payment completes, the app shows YOU'RE IN within a few seconds,
welcome message in the inbox.

**Check the logs:** Supabase → Edge Functions → `pay-webhook` → **Logs** →
look for `ok: true`.

Nigerian-card behaviour is worth testing too — Stripe provides
`4000 05660 0000 0000` (a card that requires authentication) to check the OTP
step your members will see.

### If it did not work

| What you see | What it means |
|---|---|
| `stripe not configured` | `STRIPE_SECRET` missing or misspelled |
| `STRIPE_WEBHOOK_SECRET not set` | step 5 not done |
| `bad signature` | wrong signing secret, or you copied the API key by mistake |
| Webhook logs empty | Verify JWT still on, or a typo in the URL |
| `unknown product` | `FINISH_PAYMENTS.sql` not run |
| `misconfigured price` | a product is not set to GBP — re-run `fx3` |

Send me whatever the log says.

---

## Step 8 · Go live (2 min)

1. Stripe Dashboard → flip **Test mode OFF**.
2. **Developers → API keys** → copy the live **Secret key** (`sk_live_…`).
3. **Developers → Webhooks** → add the endpoint again (live mode has its own),
   same URL, same event → copy the new `whsec_…`.
4. Supabase Secrets → update `STRIPE_SECRET` and `STRIPE_WEBHOOK_SECRET`.

Buy one real pass yourself — the cheapest. If the money lands and the pass
opens, you are live. Refund yourself from the Stripe dashboard.

---

## Step 9 · Keep the rate fresh (2 min)

Supabase → Edge Functions → `refresh-fx` → **Cron** → daily:

```
0 4 * * *
```

This keeps the £ figure Africa is charged in step with the naira price. If the
feed is unreachable it keeps the last good rate; a move over 25% in a day is
refused as a bad feed. A sale never fails because of it.

---

## What your members see

| Pass | Africa sees | Charged | World sees & pays |
|---|---|---|---|
| Academy · 3 months | ₦3,900 | £2.25 | £7.99 |
| Pro · 3 months | ₦7,800 | £4.45 | £15.99 |
| Pro · 1 season | ₦25,000 | £14.20 | £47.99 |

Africa sits at ~28% of the world price — the deliberate subsidy, unchanged.

**African members also see a line naming the banks that work**, so a refused
card reads as "my bank blocked it" rather than "this app is broken."

---

## Your fees

| Pass | Charged | Stripe takes | You keep |
|---|---|---|---|
| Africa Academy | £2.25 | £0.27 | ~£1.98 |
| Africa Pro 3mo | £4.45 | £0.34 | ~£4.11 |
| Africa Season | £14.20 | £0.66 | ~£13.54 |
| World Pro 3mo | £15.99 | £0.44 | ~£15.55 |
| World Season | £47.99 | £0.92 | ~£47.07 |

*(1.5% + 20p UK cards, 3.25% + 20p international.)*

---

## What stops it being abused

| Risk | What blocks it |
|---|---|
| Forged webhook granting free access | HMAC-verified against your signing secret |
| A captured request replayed later | Timestamp older than 5 minutes is refused |
| Stripe retries and grants twice | Idempotent on the PaymentIntent id |
| Double-tap creating two checkouts | `Idempotency-Key` per seat + product + price |
| Session created but never paid | Only `payment_status: paid` grants — tested |
| Payment with no identity attached | Lands in your Founder Desk inbox, never lost |
| Tampered app buying PRO for a penny | Price comes from the database, never the phone |
| Webhook slow | App polls ~100 seconds, opens the moment it lands |
| Webhook fails entirely | Manual claim flow still underneath |
| Member's bank refuses the card | Door 2 and door 3 open automatically underneath |
| Someone spamming "my card failed" | One report an hour per member |

---

## When someone's card fails

**What they see:** an amber panel opens under the pay button — not red, because
this is a problem to solve together, not an error they committed. It explains
that it is usually their bank blocking an international payment, offers the
OPay route, and offers one tap to reach you.

**What you get,** in the Founder Desk above the claims:

```
CARD REFUSED — THEY WANT TO PAY                    1

PSA-A1B2C3                          WAITING ON YOU
CARD DID NOT GO THROUGH

ID: PSA-A1B2C3
HANDLE: TUNDE
REGION: AFRICA
WANTS: NG-PRO-90 · ₦7,800

THEY SAID: my gtbank card kept failing
```

Everything you need to answer with a solution rather than a question. Reply in
the inbox and it reaches them in-app.

The row updates itself: **● SENT IT MANUALLY** once they file an OPay claim,
**✓ SORTED SINCE** if they got in another way — so you never chase a person who
is already sorted.

Meanwhile they get: *"We got it. Your ID is PSA-A1B2C3, that is all the founder
needs. Your seat is not going anywhere while we sort this out."*
