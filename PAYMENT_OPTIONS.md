# Taking money into a UK account — the real options

You asked what else could work besides PayPal. Short answer: **Stripe**, and it
is better than PayPal for you on both cost and — more importantly — on whether
your Nigerian members can actually pay at all.

But there is something you need to know first, because it affects the business
more than the choice of processor does.

---

## Nigeria: corrected — see NIGERIA_PAYMENTS.md

> **An earlier version of this file said most Nigerian naira cards cannot pay
> internationally. That was true from 2022 until mid-2025. It is out of date.**
>
> In July 2025 Nigerian banks restored international payments on ordinary naira
> debit cards — GTBank, UBA, Access, First Bank, Zenith, Wema, Stanbic and
> others. There are caps (GTBank $1,000/quarter, First Bank and Wema
> $500/month), but your most expensive pass is **£14.20 ≈ $18** — under **2%**
> of the smallest allowance. The caps do not affect you.
>
> A Nigerian member pays with his **normal bank card, straight through the
> app.** No dollar card needed.
>
> Full detail, caveats and the fallback for the ~1 in 5 who still fail:
> **`NIGERIA_PAYMENTS.md`**

The one wrinkle that remains: **PayPal specifically** has a poor record with
Nigerian cards, even now that the banks allow it — its fraud systems are
conservative about Nigeria regardless of what the issuing bank permits. A card
that works fine on Netflix may still be refused by PayPal.

That is the strongest argument for adding Stripe below: it is a plain card
checkout with no PayPal risk layer in between, so the member's own bank makes
the decision.

---

## The options, honestly

### 1 · Stripe — the one I would add

Your business is UK-registered, so you qualify. Stripe does not accept merchants
*in* Nigeria, but that is irrelevant: what matters is where **you** are, not
where your customers are. Nigerians can pay a UK Stripe account fine.

**Fees (UK account):**
- 1.5% + 20p — UK cards
- 3.25% + 20p — international cards (most of your Nigerian members)
- +2% if currency conversion is needed

**Against PayPal at your actual prices:**

| Pass | Price | PayPal | Stripe |
|---|---|---|---|
| Africa Pro 3mo | £4.45 | £0.43 | £0.34 |
| World Pro 3mo | £15.99 | £0.76 | £0.44 |
| World Season | £47.99 | £1.69 | £0.92 |

On a full Season One — say 700 Africa Pro and 300 World Pro, ~£7,900 gross:

- **PayPal:** ~£529 in fees (6.7%)
- **Stripe:** ~£373 in fees (4.7%)
- **You keep ~£156 more with Stripe**

Not life-changing, but it is a season's worth of coffee for no extra work. The
bigger win is card acceptance and the fact that Stripe's checkout does not send
your members to a separate PayPal login.

**The catch:** Stripe requires proper business verification — company details,
bank account, sometimes ID. Takes a day or two. PayPal you already have.

---

### 2 · Paystack — the one that would be perfect, except

Paystack is built for exactly your problem. Nigerian members could pay by naira
card, bank transfer, USSD, or mobile money — **no dollar card needed**, at
1.5% + ₦100 capped at ₦2,000. That is the single best experience your Nigerian
members could possibly have.

**But you cannot use it.** Paystack only accepts merchants registered in
Nigeria, Ghana, South Africa, Kenya or Egypt. You are UK. The only way in is to
register a Nigerian company, which means CAC registration, a Nigerian bank
account, tax filings, and settlement in naira you would then have to move to the
UK. That is a whole second business, not a payment method.

Worth knowing about for the future if the Nigerian side ever gets big enough to
justify a local entity. Not now.

---

### 3 · Merchant of Record (Paddle, Lemon Squeezy) — solves a problem you don't have

These act as the legal seller and handle VAT everywhere for you. Genuinely
useful once you are selling into 20+ tax jurisdictions.

**Fees: 5% + 50¢, and more like 7% once currency conversion is added.** That is
roughly double PayPal and triple Stripe. Payouts are slow — Paddle pays monthly,
Lemon Squeezy holds 13 days.

At your volume the VAT compliance they sell you is not yet a real burden. Skip
it. Revisit if you ever pass ~£50k/year.

---

### 4 · Flutterwave — no

Pan-African, supports GBP, but the merchant requirements point back at Africa
and the reliability reputation is weaker than the others. You already rejected
it and you were right.

---

## What I would actually do

**Finish PayPal first.** It is 90% built and it works today for your world
members — the UK, Europe, America. Do not throw that away because of the Nigeria
issue.

**Then add Stripe as the second button.** Cheaper on every pass, better card
acceptance for Nigerians, and no PayPal-account requirement for the buyer.

**Then tell your Nigerian members the truth in the till:** "If your naira card
is declined, that is your bank blocking international payments, not us. A
virtual dollar card from Grey or Cardtonic fixes it in five minutes." Being
straight about it turns a mystery failure into a solved problem.

---

## What adding Stripe would take

The webhook is already built for multiple providers — it handles PayPal,
Paystack and Flutterwave today, each with its own signature verification, and
the URL picks which (`?p=paypal`). Adding Stripe means:

1. A `stripe` branch in `pay-webhook` — verify the `Stripe-Signature` header,
   listen for `checkout.session.completed`.
2. A `pay-start-stripe` function that creates a Checkout Session at the price
   `price_now()` returns, with `client_reference_id = SEAT|PRODUCT` — the same
   trick PayPal's `custom_id` uses, so the grant path does not change at all.
3. One row in `pay_methods`, and a second button in the till.

**Everything downstream is untouched** — `grant_tier`, the welcome message, the
idempotency, the refunds. A payment is a payment once it is verified.

Roughly an hour of work. **Say the word and I will build it** — but get PayPal
live first so you have one working rail before adding a second.

---

## One thing to check on your PayPal account today

paypal.com → Settings → Payments → **Payment preferences**:

- **"Block payments from users with non-UK accounts"** must be **OFF**.
  If this is on, every Nigerian payment is refused before it reaches you.

That single setting has quietly killed more African sales than any code bug.
