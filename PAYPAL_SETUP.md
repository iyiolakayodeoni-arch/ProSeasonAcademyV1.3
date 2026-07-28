# PayPal — fully automatic, no manual checking

You do nothing. Member pays, the pass opens, the welcome message sends itself.

```
member taps PAY  →  PayPal charges the card  →  PayPal calls your webhook
      →  signature verified  →  pass granted  →  "WELCOME BACK, LET'S GO WIN
      SOMETHING" lands in their inbox  →  app shows YOU'RE IN
```

Typical time: **a few seconds.** You are not involved at any point.

---

## Setup — about 15 minutes, once

### 1 · Get your API credentials
**developer.paypal.com** → log in with your PayPal Business account →
**Apps & Credentials** → **Live** tab → **Create App** (name it `ProSeasonAcademy`).

Copy the **Client ID** and **Secret**.

### 2 · Create the webhook
Same page, scroll to **Webhooks** → **Add Webhook**.

**URL:**
```
https://ymnkphqgjxexsnbgtqvk.supabase.co/functions/v1/pay-webhook?p=paypal
```

**Event to subscribe to:** `PAYMENT.CAPTURE.COMPLETED` — that one only. It means the
money has actually landed, not merely been approved.

Save, then copy the **Webhook ID** PayPal generates.

### 3 · Put the three values in Supabase
Edge Functions → **Secrets**:

| Name | Value |
|---|---|
| `PAYPAL_CLIENT_ID` | from step 1 |
| `PAYPAL_SECRET` | from step 1 |
| `PAYPAL_WEBHOOK_ID` | from step 2 |

*(Sandbox testing? Add `PAYPAL_API` = `https://api-m.sandbox.paypal.com` and use your
sandbox credentials. Delete that secret to go live.)*

### 4 · Make one payment button per pass
PayPal → **Pay & Get Paid** → **PayPal Buttons** (or Payment Links). Create one per pass
with the exact amount:

| Pass | Amount |
|---|---|
| NG-MID-90 · Academy 3mo (Africa) | £1.95 |
| NG-PRO-90 · Pro 3mo (Africa) | £3.90 |
| NG-PRO-365 · Pro season (Africa) | £12.50 |
| WD-MID-90 · Academy 3mo (World) | £7.99 |
| WD-PRO-90 · Pro 3mo (World) | £15.99 |
| WD-PRO-365 · Pro season (World) | £47.99 |

Copy each link into **Table Editor → products → `pay_link`** on the matching row.

### 5 · Your PayPal address (the fallback)
Table Editor → **`pay_methods`** → row `paypal` → set **details** and **holder**.

Used only if a link is missing or someone prefers sending manually. Belt and braces.

---

## How the member is identified automatically

This is the part that removes you from the loop. When they tap PAY, the app appends their
identity to the link:

```
https://www.paypal.com/ncp/payment/XXXX?custom=PSA-A1B2C3|NG-PRO-90
                                        └── seat ──┘ └─ pass ─┘
```

PayPal echoes that back in the webhook as `custom_id`. The webhook reads it, grants that
exact pass to that exact seat, and sends the welcome. **Nobody types a reference. You
never check anything.**

---

## What stops it being abused

| Risk | What blocks it |
|---|---|
| Fake webhook granting free access | Every call is verified by **PayPal's own** verify-signature endpoint. Forgeries are rejected. |
| PayPal retries granting twice | Idempotent on the capture id — a repeat is recognised and ignored. |
| Payment arrives with no identity | Never lost. It lands in your Founder Desk inbox with the reference and amount. |
| Member pays, webhook is slow | The app polls for ~100 seconds and shows YOU'RE IN the moment it lands. |
| Member pays, webhook fails entirely | The manual claim flow is still there underneath — nothing is ever a dead end. |

---

## Testing before real money

1. developer.paypal.com → **Sandbox** tab → create test buyer + business accounts.
2. Add `PAYPAL_API` = `https://api-m.sandbox.paypal.com` and swap in sandbox credentials.
3. Buy a pass with the sandbox buyer.
4. Supabase → Edge Functions → `pay-webhook` → **Logs** → expect `ok: true`.
5. Reopen the app: your tier should read PRO or ACADEMY, with the welcome message waiting.
6. Delete `PAYPAL_API`, swap in live credentials. Done.

---

## Until the buttons exist

Every pass without a `pay_link` falls back to showing your PayPal address plus the claim
flow, which you approve from the Desk. So you can launch before finishing step 4 — the
automation just switches itself on per pass as you add each link.
