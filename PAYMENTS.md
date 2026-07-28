# Getting the Paystack and Flutterwave secrets

> **Need an account first?** See **`MERCHANT_ACCOUNTS.md`** — which account type you need,
> why ₦ goes live before $, and why you must never buy a "pre-verified" account.

The two work differently, and that trips most people up:

| | Where the secret comes from |
|---|---|
| **Paystack** | They **give** you a key. You copy it. |
| **Flutterwave** | You **invent** a password and type it into their dashboard. |

Your webhook URLs (already live once `pay-webhook` is deployed):

```
Paystack     https://ymnkphqgjxexsnbgtqvk.supabase.co/functions/v1/pay-webhook?p=paystack
Flutterwave  https://ymnkphqgjxexsnbgtqvk.supabase.co/functions/v1/pay-webhook?p=flutterwave
```

---

## 1 · Paystack (₦, Nigeria)

**Account:** paystack.com → sign up as a business. You will need CAC documents, a bank
account and BVN to go live. Test mode works immediately without any of that.

### Get the secret key
1. Dashboard → **Settings** → **API Keys & Webhooks**
2. Scroll to **API Configuration**
3. Click the eye icon beside **Secret Key**, enter your password
4. Copy it — starts `sk_test_…` (test) or `sk_live_…` (live)

### Set the webhook
Same page → **Webhook URL** field → paste the Paystack URL above → **Save**.

### Store it
Supabase → Edge Functions → **Secrets** → add:

| Name | Value |
|---|---|
| `PAYSTACK_SECRET` | your `sk_live_…` key |

> Use the **test** key while testing and the **live** key when you launch. They are
> different secrets — swapping modes means updating this too.

---

## 2 · Flutterwave ($ and international)

**Account:** flutterwave.com → sign up. Same story: test mode now, business verification
before live payouts.

### Invent the secret hash
This is **not** a key they give you. You make up a long random string, tell Flutterwave
what it is, and Flutterwave sends it back in the `verif-hash` header of every webhook so
your server can prove the call is genuine.

Here is one generated for you — or use your own:

```
PSA-FLW-420e0e289a43b1a1aa638a7cd92b50b57b7e2dcd
```

### Set it
1. Dashboard → **Settings** → **Webhooks**
2. **Webhook URL**: the Flutterwave URL above
3. **Secret Hash**: paste that string
4. Tick: *Receive webhook response in JSON*, *Enable webhook retries*, *Enable V3 webhooks*
5. **Save**

### Store it
Supabase → Edge Functions → **Secrets** → add:

| Name | Value |
|---|---|
| `FLW_SECRET_HASH` | the **exact same string** you typed into Flutterwave |

> If these two do not match character for character, every webhook is rejected as forged
> and nobody gets access. That mismatch is the single most common failure here.

---

## 3 · The part that actually matters

A payment only grants access if it carries **who** paid and **what** they bought:

| Field | Example |
|---|---|
| `academy_id` | `PSA-A1B2C3` |
| `product` | `NG-PRO-30` |

The member's Academy ID is shown to them in the till precisely so they can paste it at
checkout.

### With payment links (simplest — no code)
Create one payment link per product:

| Link | Product code | Price |
|---|---|---|
| ACADEMY · 1 month | `NG-MID-30` | ₦1,500 |
| PRO · 1 month | `NG-PRO-30` | ₦3,000 |
| PRO · 1 season | `NG-PRO-365` | ₦25,000 |

Both providers let you add a **custom field** on a payment link. Add one labelled
**"Your Academy ID"** and make it required. Put the product code in the link's metadata,
or name the link exactly after the product code.

### If the metadata is missing
The money is **never lost**. `pay-webhook` drops an entry in your Founder Desk inbox with
the reference and amount, and you grant the pass by hand from THE TILL panel. That path
stays available permanently.

---

## 4 · Test before trusting it

1. Deploy `pay-webhook` (see `GO_LIVE.md`).
2. Set both secrets in Supabase.
3. Use **test mode** keys and a test card:
   - Paystack: `4084 0840 8408 4081`, any future expiry, CVV `408`
   - Flutterwave: `5531 8866 5214 2950`, `09/32`, CVV `564`
4. Pay with your own Academy ID and `NG-MID-30` in the metadata.
5. Check Supabase → Edge Functions → `pay-webhook` → **Logs** for `ok: true`.
6. Reopen the app — your tier should read **ACADEMY** with 30 days.

Then swap both secrets to live keys.

---

## 5 · What is protected

- **Signature verified** on every call, with a constant-time compare. A forged webhook
  grants nothing.
- **Idempotent** on the provider's reference — providers retry, and a retry cannot extend
  a pass twice.
- **Nothing is silently dropped.** Unmatched payments reach your inbox.
- Paying **clears the removal deadline** automatically.

🔴 The Paystack **secret key** and the Flutterwave **secret hash** belong only in Supabase
Secrets. Never in `.env`, never in `eas.json`, never in the app. Unlike the anon key, these
are not safe to ship.

---

## 6 · You do not need this yet

The Founder Desk's manual grant works today and uses the same `grant_tier` function with
the same audit trail. Nothing is blocked by not having merchant accounts.

Sensible order: get the SQL and functions live first, run the trial, hold the pricing
consultation, **then** open merchant accounts once you know what you are charging.
Business verification takes days, and there is no point rushing it before the prices are
settled.
