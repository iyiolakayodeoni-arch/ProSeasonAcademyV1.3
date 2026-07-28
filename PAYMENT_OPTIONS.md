# Taking money into a UK account — the real options

You asked what else could work besides PayPal. Short answer: **Stripe**, and it
is better than PayPal for you on both cost and — more importantly — on whether
your Nigerian members can actually pay at all.

But there is something you need to know first, because it affects the business
more than the choice of processor does.

---

## The thing nobody tells you about PayPal and Nigeria

**Most Nigerian bank cards do not work on PayPal.**

Since the CBN foreign-exchange restrictions, Nigerian banks stopped allowing
naira Mastercard and Visa cards to be used for international online payments.
GTBank, Access, First Bank and the rest all did it. PayPal's own community
support says plainly that Nigerian accounts cannot receive, and naira cards are
routinely declined when sending. Verve cards are not supported by PayPal at all.

So a Lagos member taps PAY, gets bounced by his bank, and concludes your app is
broken. You would see failed checkouts with no obvious cause.

**What actually works for a Nigerian paying you:**

| Method | Works? |
|---|---|
| Naira Mastercard / Visa debit | ❌ usually declined |
| Verve card | ❌ never |
| Domiciliary USD card (Zenith, GTB, UBA…) | ✅ yes |
| Virtual USD card (Grey, Chipper, Cardtonic) | ✅ yes, most common |

This is true **whether you use PayPal or Stripe**. It is a Nigerian banking
restriction, not a processor one. The difference is that naira cards are
declined by PayPal almost always, and by Stripe merely often — Stripe checkouts
have a noticeably better record with Nigerian cards.

**What this means for you:** a chunk of your Nigerian members will need a
virtual dollar card to pay you. That is a five-minute signup on Grey or
Cardtonic, and many of them will already have one. But you should say it up
front in the till, not let them discover it as a failure.

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
