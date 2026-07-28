# What account do I need to actually receive money?

Short answer: **you can start collecting ₦ today without registering a company.**
Collecting **$** from abroad is the harder one and needs planning.

---

## Paystack (₦) — start here

Paystack has two account types, and most people assume wrongly that they need the second.

| | Starter Business | Registered Business |
|---|---|---|
| Company registration | **Not needed** | CAC certificate required |
| ID | BVN + one of: NIN slip, driver's licence, voter's card, passport | Same, plus director details |
| Proof of address | Utility bill (under 6 months) | Business proof of address |
| Bank account for payouts | **Your personal account** — name must match your BVN/ID | Corporate account matching the CAC name |
| Extra | — | TIN, MEMART, CAC status report |
| Time to live | Usually days | Weeks (CAC first) |

### ✅ For Season One, Starter Business is enough
1,000 members at ₦1,500–₦3,000 is well inside what a Starter account handles. Money settles
into your personal bank account.

**Sign up:** paystack.com → create account → **Activate Business** → choose **Starter
Business** → upload ID + proof of address → add your personal bank account → submit.

Test mode works immediately, so you can build and test the whole paywall before activation
finishes.

### When to upgrade
Register with CAC and switch to a Registered Business when: you want the academy's name on
the payment page instead of yours, volume grows enough that a personal account looks odd to
your bank, or you want to separate business and personal money for tax. You can upgrade
later — it is not a restart.

---

## Flutterwave ($, international) — read this before relying on it

Signing up is similar and Nigeria lets you answer **"No"** to having a CAC certificate.
Without documents your account stays in **test mode** and cannot receive real money.

### ⚠️ The trap: international payments are a separate approval

A verified Flutterwave account does **not** automatically accept foreign cards. Collecting
USD from members abroad needs **compliance approval for international payments**, requested
separately — historically by emailing their support/compliance team and asking for it
explicitly. Expect questions about what you sell and who your customers are.

**So plan for this:** ₦ will likely be live weeks before $ is.

### What that means for your launch
Your tier system already handles it. Both regions climb the same ladder, and the founder
grants passes manually from the Desk regardless of how the money arrived. So:

1. Launch with **Paystack live** for the Africa track.
2. For the World track, take payment by whatever works meanwhile — a Flutterwave payment
   link once approved, or a manual transfer — and grant the pass from THE TILL.
3. Turn the `pay-webhook` automation on per provider, as each is approved.

Nothing in the app breaks. Manual granting uses the same `grant_tier` function with the
same audit trail; automation only removes your involvement.

---

## 🔴 Do not buy a "verified account"

Searching this throws up sellers offering pre-verified Paystack/Flutterwave accounts on
Telegram and WhatsApp. **Avoid every one of them.**

- The account is in **someone else's name** — they can reclaim it and your members' money
  with it.
- It breaks both providers' terms. Accounts get frozen with funds inside.
- It is money laundering exposure you do not want attached to a business you are building
  in public.

Your own Starter Business takes days and costs nothing. There is no reason to go near this.

---

## Fees, so the pricing conversation is informed

Roughly, at the time of writing — confirm on their pricing pages:

- **Paystack Nigeria:** ~1.5% local cards, +₦100 on transactions above ₦2,500, capped
  around ₦2,000. International cards ~3.9%.
- **Flutterwave:** ~1.4% local, ~3.8% international.

On a ₦3,000 PRO month that is roughly ₦145 to Paystack. Worth mentioning at the pricing
table — members respond better to "the processor takes a cut" than to a number that seems
arbitrary.

---

## The order I would do this in

1. **Now:** get the SQL + functions live (`GO_LIVE.md`). Nothing here depends on payments.
2. **This week:** open Paystack, choose Starter Business, submit ID + proof of address.
   Activation runs in the background.
3. **Same day:** open Flutterwave and request international-payments approval, because it
   is the long pole.
4. **Trial fortnight:** run it. Grant passes manually — there will be few, and it costs
   you a minute each.
5. **After the pricing table:** you now know your real prices. Set them in `products`.
6. **Then:** add `PAYSTACK_SECRET`, point the webhook at your project, and payments become
   automatic (`PAYMENTS.md`).

The paywall does not need a merchant account to be *live* — it needs one to be *automatic*.
Those are different milestones, and conflating them is what makes people delay launching.
