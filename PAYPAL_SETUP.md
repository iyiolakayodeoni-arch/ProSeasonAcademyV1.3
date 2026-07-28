# PayPal — setting it up, start to finish

You have the UK PayPal Business account. This is everything else.
**About 30 minutes.** Do the steps in order — each one depends on the last.

---

## Is the paywall already built? Yes.

Short answer: **the paywall is written and wired. It is not switched on.**

Nothing below is code you have to write. It already exists:

| Piece | Where | Status |
|---|---|---|
| The locked door a lapsed member hits | `src/screens/LapsedGate.tsx` | built + wired into `MainScreen` |
| The till (what they buy) | `src/screens/PaySheet.tsx` | built |
| Price list with the subsidy shown | `src/screens/PricingTable.tsx` | built |
| Terms shown before anything else | `src/screens/TermsSheet.tsx` | built |
| Decides active / grace / lapsed | `access_state()` in the database | **applied ✅** |
| 14-day trial, 3-day grace, paid-only | `config` table | **applied ✅** |
| Creates the PayPal order at the right price | `pay-start` function | written, **not deployed** |
| Hears back from PayPal and opens the pass | `pay-webhook` function | written, **not deployed** |
| The prices themselves | `products` table | **missing — step 1** |

So the three things standing between you and taking money are:
**run the last SQL** (step 1), **deploy three functions** (step 5), and
**paste four PayPal keys** (step 4).

### How the paywall actually gates someone

Every time the app opens, it asks the database one question: *what is this
member's state?* The answer is one of three, and the app is already
written to respond to each:

- **`active`** — a paid pass with time left. Everything open.
- **`grace`** — expired within the last 3 days. Still let in, but nudged.
  This exists so a slow payment never locks out someone who has paid.
- **`lapsed`** — out of time. `MainScreen` returns `LapsedGate` instead of
  the app, and there is no way round it from the phone, because the
  decision is made server-side.

New members get **14 days** on the `mid` tier. Existing members get
**30 days** to decide. Both numbers are rows in the `config` table — you
change them by editing a value, no rebuild.

Nothing is ever deleted when someone lapses. The gate says so, and keeps
the contact line to you open.

---

When it is all done, this is what happens without you:

```
member taps PAY → PayPal charges the card → PayPal calls your webhook
   → signature verified → pass granted → "WELCOME BACK — LET'S GO WIN
   SOMETHING" lands in their inbox → app shows YOU'RE IN
```

A few seconds, start to finish. You are not involved at any point.

---

## Before you start — one thing to know

**PayPal cannot charge naira.** NGN is not on PayPal's supported-currency
list at all. This is a PayPal limitation, nothing to do with your account
or your country.

So every charge leaves in **GBP** — the currency your account actually
holds. The Nigerian subsidy is untouched: an African member still sees
**₦3,900** as the headline price, with the line underneath saying

> CHARGED AS £2.25 — PAYPAL CANNOT TAKE NAIRA DIRECTLY

His bank does the conversion, as it would for any foreign purchase. He
knows exactly what is leaving his account before he taps.

This was a genuine bug in the database until now. Step 1 fixes it.
Without it, **every African payment would have failed** with
`CURRENCY_NOT_SUPPORTED` while world payments worked fine — which would
have looked completely random.

---

## Step 1 · Finish the database (5 min)

I checked your live database. You got further than we thought — `schema`,
`seat-gate`, `security`, `packs`, `tiers`, `access`, `consult`,
`enforcement` and `notices` are all applied. ✅

What is missing is the last five: `claims`, `paypal-only`, `fx`, `fx2`,
`fx3`. That is the till, the prices and PayPal — so nothing below works
until they are in.

Supabase → **SQL Editor** → **New query**.

Open **`supabase/FINISH_PAYMENTS.sql`**, select all, copy, paste, **Run**.

> Use `FINISH_PAYMENTS.sql`, **not** `RUN_ALL.sql`. It is a quarter of the
> size and only contains what you are actually missing. (`RUN_ALL.sql`
> still works and is safe to re-run — it is just the long way round.)

It ends by printing your six passes and their prices. If anything did not
apply it raises a loud error instead of pretending it worked.

> **If you see red**, send me the error text exactly as it appears.
>
> The `42P13` error you hit twice is now impossible here. The cause: the
> three `fx` files each rebuild `price_now()` with a different set of
> columns, and Postgres will not let you change a function's return type
> in place. The file now drops those functions before each section that
> reshapes them. They are read-only price calculators holding no data, so
> dropping them costs nothing.

**Check it worked** — new query, run this:

```sql
select code, display, amount, currency from prices_now();
```

Six rows, every `currency` saying `GBP`. If any row says `NGN`, stop and
tell me — PayPal will reject it.

---

## Step 2 · Get your API credentials (5 min)

Go to **developer.paypal.com** → log in with your Business account →
**Apps & Credentials**.

Top right there is a **Sandbox / Live** toggle. Start on **Sandbox** —
you will test with fake money first, then repeat this step on **Live**.

**Create App** → name it `ProSeasonAcademy` → **Create**.

Copy the two values shown:
- **Client ID**
- **Secret** (click *Show*)

---

## Step 3 · Create the webhook (5 min)

The webhook is how PayPal tells your app the money arrived. Without it,
members pay and nothing opens.

Same page, scroll down to **Webhooks** → **Add Webhook**.

**URL** — paste exactly:

```
https://ymnkphqgjxexsnbgtqvk.supabase.co/functions/v1/pay-webhook?p=paypal
```

**Event types** — tick **one** only:

- ✅ `PAYMENT.CAPTURE.COMPLETED`

That one means the money has actually landed, not merely been approved.
Do not tick `CHECKOUT.ORDER.APPROVED` — approved is not paid.

**Save**, then copy the **Webhook ID** PayPal generates (looks like
`8SR012345A6789012`). You need it in the next step.

---

## Step 4 · Put the keys in Supabase (5 min)

Supabase → **Edge Functions** → **Secrets** → **Add new secret**.

Add these four:

| Name | Value |
|---|---|
| `PAYPAL_CLIENT_ID` | from step 2 |
| `PAYPAL_SECRET` | from step 2 |
| `PAYPAL_WEBHOOK_ID` | from step 3 |
| `PAYPAL_API` | `https://api-m.sandbox.paypal.com` |

That last one puts you in test mode. **You delete it in step 7** to go
live — that single deletion is the switch.

While you are here, add `FOUNDER_KEY` too if you have not — any long
random string. It is what unlocks your Founder Desk.

---

## Step 5 · Deploy the functions (5 min)

Supabase → **Edge Functions** → **Deploy a new function** → choose
**via Editor**.

Do these three:

| Function name | Paste from |
|---|---|
| `pay-start` | `supabase/functions/pay-start/index.ts` |
| `pay-webhook` | `supabase/functions/pay-webhook/index.ts` |
| `refresh-fx` | `supabase/functions/refresh-fx/index.ts` |

For each one:

1. Type the name **exactly** as above — the webhook URL depends on it.
2. **Click into the code box and press Ctrl+A, then Delete.** Clear out
   the sample code completely. Pasting on top of it is what caused your
   `Module not found "_shared/cors.ts"` failure last time.
3. Paste the whole file.
4. **Deploy**.

> There is no `_shared` folder any more — every function is one
> self-contained file, because the dashboard only deploys one file and
> cannot resolve `../_shared/`.

### Turn OFF "Verify JWT" for the webhook

`pay-webhook` → **Settings** → find **Verify JWT with legacy secret** →
switch it **off** → Save.

PayPal is not a logged-in user and has no JWT. Leave this on and PayPal's
calls get rejected before they reach your code — payments arrive, nothing
opens, and the logs look empty. **This is the single most common reason a
webhook silently does nothing.**

The function is not unprotected: it verifies every call against PayPal's
own signature-verification endpoint. A forged call is rejected there.

---

## Step 6 · Test with fake money (5 min)

**developer.paypal.com** → **Testing Tools** → **Sandbox Accounts**.

PayPal made you two automatically. You want the **Personal** one — click
the three dots → **View/Edit account** → copy its email and password.

Now, in your app: sign in, go to the till, buy any pass, and pay with
that sandbox buyer login.

**What should happen:** payment completes, the app shows YOU'RE IN, and
the welcome message appears in the member's inbox.

**Check the logs:** Supabase → Edge Functions → `pay-webhook` → **Logs**.
You want a line reading `ok: true`.

### If it did not work

| What you see | What it means |
|---|---|
| `paypal not configured` | `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` missing or misspelled |
| `CURRENCY_NOT_SUPPORTED` | Step 1 did not run. Check `prices_now()` says GBP |
| `misconfigured price` | Same — a product is still set to NGN |
| Webhook logs completely empty | Verify JWT is still on (step 5), or the URL has a typo |
| `verification failed` | `PAYPAL_WEBHOOK_ID` is wrong or from the other environment |
| `unknown product` | Step 1 did not finish |

Send me whatever the log says and I will tell you which one it is.

---

## Step 7 · Go live (2 min)

Once the sandbox test passes:

1. developer.paypal.com → flip to the **Live** tab.
2. **Create App** again — same name. Copy the **live** Client ID and Secret.
3. Add the webhook again on the Live tab, same URL, same one event. Copy
   the **live** Webhook ID.
4. Supabase Secrets → update `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`,
   `PAYPAL_WEBHOOK_ID` with the live values.
5. **Delete the `PAYPAL_API` secret entirely.** That is the switch.

Buy one real pass yourself, cheapest one. If the money lands and the pass
opens, you are live. Refund yourself from PayPal afterwards.

---

## Step 8 · Two settings inside PayPal (3 min)

**paypal.com** → Settings (gear) → **Payments** → **Payment preferences**:

- **Block payments sent to me in a currency I do not hold** → set to
  **"Accept and convert"** (or leave unblocked). Everything is charged in
  GBP so this should never trigger — but if it is set to *Ask me*, a
  stray payment sits pending until you click it manually, which is
  exactly the babysitting you do not want.

- **Block payments from users with non-UK accounts** → make sure this is
  **OFF**. Your members are Nigerian, and this would refuse them.

---

## Step 9 · Keep the rate fresh (2 min)

The £ figure African members are charged is recalculated from the live
NGN/GBP rate. Keep it current:

Supabase → **Edge Functions** → `refresh-fx` → **Cron** → schedule daily.

Cron expression for 4am:

```
0 4 * * *
```

If the rate feed is unreachable it keeps the last good rate. If a rate
moves more than 25% in a day it refuses it as a bad feed. Either way a
sale never fails because of it.

---

## Step 10 · Your PayPal address, as a fallback (1 min)

Supabase → **Table Editor** → **`pay_methods`** → the `paypal` row:

- `details` → your PayPal email
- `holder` → the name on the account

Replace the `REPLACE-WITH-YOUR-PAYPAL-EMAIL` placeholder. This is only
used if someone wants to send manually. Belt and braces.

---

## What the member is charged

| Pass | Africa sees | Actually charged | World sees & pays |
|---|---|---|---|
| Academy · 3 months | ₦3,900 | ~£2.25 | £7.99 |
| Pro · 3 months | ₦7,800 | ~£4.45 | £15.99 |
| Pro · 1 season | ₦25,000 | ~£14.20 | £47.99 |

*(£ figures at today's ₦1,816/£ plus the 3% margin, rounded up to 5p.
They move with the rate; the ₦ headline never does.)*

Africa sits at roughly **28% of the world price** — a deliberate ~72%
subsidy, stated to members in the till rather than hidden. The £ figures
move with the exchange rate; the ₦ headline never does.

**To change a price:** Table Editor → `products` → `amount_minor`.
₦ for Africa rows (`3900`), pence for World rows (`799`). No rebuild.

---

## How the member is identified automatically

This is the part that removes you from the loop. When they tap PAY,
`pay-start` creates the order server-side with their seat attached:

```
custom_id = "PSA-A1B2C3|NG-PRO-90"
             └─ seat ─┘ └─ pass ─┘
```

PayPal echoes that back in the webhook. The webhook reads it, grants that
exact pass to that exact seat, and sends the welcome. **Nobody types a
reference. You never check anything.**

The price is calculated by the database, never sent up from the phone, so
a tampered app cannot buy PRO for a penny.

---

## What stops it being abused

| Risk | What blocks it |
|---|---|
| Fake webhook granting free access | Verified against **PayPal's own** signature endpoint |
| PayPal retries and grants twice | Idempotent on the capture id |
| Double-tap creates two orders | `PayPal-Request-Id` per seat+product+price |
| Payment arrives with no identity | Lands in your Founder Desk inbox with reference and amount |
| Webhook is slow | App polls ~100 seconds, opens the moment it lands |
| Webhook fails entirely | Manual claim flow still underneath — never a dead end |

---

## Your fees, honestly

PayPal UK takes roughly **2.9% + £0.30** on international sales.

| Pass | Charged | You keep |
|---|---|---|
| Africa Academy | £2.25 | ~£1.88 |
| Africa Pro 3mo | £4.45 | ~£4.02 |
| World Pro 3mo | £15.99 | ~£15.23 |
| World Season | £47.99 | ~£46.30 |

That flat £0.30 is why the 1-month passes were removed — it was eating
43% of a £0.75 pass. Three months is the minimum for a reason.
