# How a Nigerian member actually pays you

Short version: **his normal bank card, straight through the app.** No dollar
card, no bank transfer, nothing manual. It just works — and your prices are
small enough that it works comfortably.

I need to correct something I told you earlier. I said most Nigerian naira
cards can't pay internationally. **That was true from 2022 to mid-2025. It is
no longer true.**

---

## What changed

In July 2025, after nearly three years, Nigerian banks turned international
payments back on for ordinary naira debit cards. FX pressure eased, so the
restriction was lifted.

Banks that have restored it: **GTBank, UBA, Access, First Bank, Zenith, Wema,
Stanbic IBTC, Providus, Ecobank.** That is effectively everyone your members
bank with.

There are spending caps, and this is the part that matters for you:

| Bank | International limit |
|---|---|
| GTBank | $1,000 per quarter (some customers $4,000) |
| First Bank | $500 per month |
| Wema / ALAT | $500 per month |
| UBA | Premium cards (Gold, Platinum, World) |

**Now compare that to what you actually charge:**

| Pass | Price | ≈ USD | % of GTB's quarterly cap |
|---|---|---|---|
| Academy · 3 months | £2.25 | $2.86 | **0.3%** |
| Pro · 3 months | £4.45 | $5.65 | **0.6%** |
| Pro · 1 season | £14.20 | $18.03 | **1.8%** |

Your most expensive pass uses under **2%** of the smallest quarterly allowance.
A member could buy fifty-five season passes before hitting the cap.

**This is the single biggest advantage of pricing Africa low.** A ₦25,000 pass
sails under every limit. If you were charging ₦200,000, the caps would be a
real problem. At your prices they are irrelevant.

---

## So what does he actually do?

```
1. Taps the pass in the till
2. Sees:  ₦7,800   (charged as £4.45)
3. Taps PAY
4. Enters his normal GTBank / UBA / Access card
5. Bank sends an OTP to his phone
6. Done — pass opens, welcome message lands
```

Six steps, about ninety seconds, no leaving the app. His bank converts naira to
pounds at their rate and the pounds land in your UK account.

---

## The honest caveats

**1 · Some cards will still fail.** Not every bank restored it, some restrict it
to premium tiers (UBA), and a member may have already spent his quarterly
allowance on Netflix and Spotify. Expect maybe **1 in 5** to hit a snag.

**2 · Verve cards never work internationally.** Verve is domestic-only. A member
with a Verve card needs a different route.

**3 · PayPal is the weak link, not the card.** Even with international payments
restored, PayPal specifically has a poor record with Nigerian cards — its fraud
systems are conservative about Nigeria regardless of what the bank allows. A
card that works fine on Netflix may still be refused by PayPal.

**This is the strongest argument for adding Stripe.** Stripe is a plain card
checkout — the member types his card number into your app and his bank decides.
No PayPal risk layer in between. For Nigerian members, Stripe will convert
noticeably better than PayPal, on top of being cheaper.

---

## The fallback, for the ones who fail

Anyone whose card is refused has two options, and both should be visible in the
till rather than left to chance:

**Virtual dollar card** — five-minute signup, funded with naira from his normal
bank app.

| Provider | Setup | Monthly | Notes |
|---|---|---|---|
| **Cardtonic** | $1.50 | none | cheapest, most widely recommended |
| **ALAT (Wema)** | ~₦2,260 | none | backed by a real bank, 2% + ₦100 to fund |
| **Chipper Cash** | $3–5 | $1 | widest acceptance |
| **Geegpay** | $3 | none | best for higher spenders |

**Or the manual claim** — the flow already built into your app. He sends the
money, submits a reference, it lands in your Founder Desk, you approve, and
`grant_tier` runs automatically. Slower, but never a dead end.

---

## What I'd change in the app

Nothing structural. Two small things:

1. **Say it plainly in the till** — under the Africa prices, one line:
   *"Pay with your normal Nigerian bank card. If your bank refuses it, tap here."*
   Turns a mysterious failure into an expected fork.

2. **Add Stripe as a second button.** Better Nigerian card acceptance than
   PayPal, and cheaper on every pass. Roughly an hour of work — the webhook
   already multiplexes providers, so `grant_tier`, the welcome message,
   idempotency and refunds are untouched.

---

## And one setting on your PayPal account, today

paypal.com → Settings → Payments → **Payment preferences**

**"Block payments from users with non-UK accounts" must be OFF.**

If that is on, every Nigerian payment is refused before it ever reaches your
code — and nothing in your logs would explain why.
