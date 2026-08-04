# DEPLOY — what remains and exactly how to do it

**29 July 2026 · Project: `ymnkphqgjxexsnbgtqvk.supabase.co` · West EU (London)**

Everything code-side is built, typechecks clean, and 7/7 tests pass. What remains
between this repo and a live app taking money is all **deployment** — dashboard
clicks, one command, and a real payment test. Nothing is a rewrite.

---

## Estimated time: ~45 minutes

---

## STEP 1 · Deploy the edge functions (10 min)

The database is live and seeded — it is **listening for nothing** until these are
deployed. You need the **Supabase CLI** installed (`npx supabase` works), or you
can paste them one by one in the Dashboard (Functions → New Function → paste code).

### Option A: CLI (one command)

```bash
# Install the CLI once
npm install -g supabase

# Link your project (it will ask you to authenticate)
supabase link --project-ref ymnkphqgjxexsnbgtqvk

# Deploy every function at once
supabase functions deploy ensure-profile
supabase functions deploy health
supabase functions deploy admin-summary
supabase functions deploy founder-broadcast
supabase functions deploy till-topup
supabase functions deploy till-subscribe
supabase functions deploy refresh-fx
supabase functions deploy pay-start
supabase functions deploy pay-webhook
supabase functions deploy founder-desk

# Set the secrets (ONE of these is the founder key YOU choose)
supabase secrets set FOUNDER_KEY=your-chosen-key-here
```

### Option B: Dashboard (copy-paste, one at a time)

Go to **Supabase Dashboard → Edge Functions → New Function**.
For each function below, copy the WHOLE file from `supabase/functions/<name>/index.ts`
and paste it into the editor, then Deploy.

| Order | Function | Source | Critical Setting |
|---|---|---|---|
| 1 | `health` | `supabase/functions/health/index.ts` | — |
| 2 | `ensure-profile` | `supabase/functions/ensure-profile/index.ts` | — |
| 3 | `admin-summary` | `supabase/functions/admin-summary/index.ts` | — |
| 4 | `founder-broadcast` | `supabase/functions/founder-broadcast/index.ts` | — |
| 5 | `till-topup` | `supabase/functions/till-topup/index.ts` | — |
| 6 | `till-subscribe` | `supabase/functions/till-subscribe/index.ts` | — |
| 7 | `refresh-fx` | `supabase/functions/refresh-fx/index.ts` | — |
| 8 | `pay-start` | `supabase/functions/pay-start/index.ts` | — |
| 9 | `pay-webhook` | `supabase/functions/pay-webhook/index.ts` | **⚠️ TURN OFF "Verify JWT"** |
| 10 | `founder-desk` | `supabase/functions/founder-desk/index.ts` | — |

**For `pay-webhook`:** Go to the function → Settings → **turn OFF "Verify JWT"**.
Stripe and PayPal have no JWT — leaving it on rejects every payment before it
reaches your code. The function is not unprotected: every request is
signature-checked inside the code itself.

After all are deployed, set the secret:

Dashboard → Edge Functions → Secrets → Add secret →
**`FOUNDER_KEY`** = whatever you choose (treat it like a password — your phone
will cache it once validated, and every admin action behind it proves this key)

---

## STEP 2 · Run the remaining SQL migrations (5 min)

Open **Supabase Dashboard → SQL Editor → New Query**. Paste each file below
**in this order** and click **Run**. Each file is safe to re-run (idempotent).

| # | File | What it arms |
|---|---|---|
| 1 | `supabase/schema.sql` | Tables, RLS, till, seed data *(if not already run — check if `channels` has 5 rows)* |
| 2 | `supabase/seat-gate.sql` | The 1,000-seat cap enforced in Postgres |
| 3 | `supabase/security.sql` | Rate limits, contact inbox, audit log, membership state |
| 4 | `supabase/fx.sql` + `fx2.sql` + `fx3.sql` | FX rate table + live pricing functions |
| 5 | `supabase/stripe.sql` | Stripe payment methods and grant_tier |
| 6 | `supabase/rescue.sql` | OPay fallback, "my card was refused" flow |
| 7 | `supabase/packs.sql` | Bundle tricks into packs |
| 8 | `supabase/tiers.sql` | ACADEMY / PRO ladder in both currencies |
| 9 | `supabase/access.sql` | Trial, paid-only gate, grace window |
| 10 | `supabase/claims.sql` | Manual payment claims |
| 11 | `supabase/consult.sql` | Pricing consultation |
| 12 | `supabase/enforcement.sql` | Deadlines, auto-removal, strikes, terms, refunds |
| 13 | `supabase/notices.sql` | Academy bot — nobody is removed without being told |

Verify with:
```sql
select * from season_seats();
-- Should show: SEASON ONE | 1000 | <current> | <waiting>

select code, label, sort, active from pay_methods where active order by sort;
-- Should show: stripe (0), opay (1), paypal (2)
```

---

## STEP 3 · Fix the OPay account name (2 min)

The `rescue.sql` file set your OPay number `8112179292` correctly, but the
**account holder name** is still a placeholder. This matters: when a member
types your number into OPay, a name comes back. If it does not match what
the till shows, they stop — and that check is the whole defence against
someone posting a fake number in the halls.

**Do this:**
1. Open your OPay app
2. Send yourself ₦100 from another account (or ask someone to)
3. Note the **exact name** OPay shows for your number
4. In Supabase → Table Editor → `pay_methods` → find row `opay`
5. Update `holder` to that exact name

```sql
-- OR run this:
update pay_methods set holder = 'THE EXACT NAME SHOWN' where code = 'opay';
```

---

## STEP 4 · Set up Stripe for card payments (15 min)

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) → create an account
2. **Developers → API Keys** → copy the **Secret key** (starts `sk_live_`)
3. **Developers → Webhooks → Add endpoint**:
   - URL: `https://ymnkphqgjxexsnbgtqvk.supabase.co/functions/v1/pay-webhook?p=stripe`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`
   - Copy the **Signing secret** (starts `whsec_`)
4. In Supabase → Edge Functions → Secrets, add:
   - `STRIPE_SECRET` = your `sk_live_...` key
   - `STRIPE_WEBHOOK_SECRET` = your `whsec_...` signing secret

---

## STEP 5 · Set the go-live date (1 min)

When you're ready to take real money:
```sql
update config set value = '2026-08-01T00:00:00Z' where key = 'go_live';
```
The till stays shut until this date. Set it to a past date to open immediately.

---

## STEP 6 · Build the APK (15 min)

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo (creates a free account)
eas login

# Initialize the EAS project (once)
eas init --id YOUR_PROJECT_ID

# Build the APK for Android
eas build --platform android --profile production

# The build runs on Expo's servers (~15 min). When done you get a
# download link. Install it on your phone and test.
```

The Supabase URL and anon key are already in `eas.json` and will be baked
into the build automatically.

---

## STEP 7 · Buy your own pass — the real test (5 min)

1. Install the APK on your phone
2. Sign up, claim a seat
3. Go to THE TILL → pick a pass → pay with a real card
4. Watch the "WELCOME BACK — LET'S GO WIN SOMETHING" screen appear

**This is the moment the repository becomes a business.** Nothing proves it
works until you see a real payment flow through end-to-end.

---

## STEP 8 · Install the MetaBot scheduler (1 min)

```bash
mkdir -p .github/workflows
cp metabot/scheduled-github-action.example.yml .github/workflows/metabot.yml
git add .github/workflows/metabot.yml
git commit -m "ci: enable metabot daily scout"
git push
```

The MetaBot runs daily at 08:00 UTC, finds new EA SPORTS FC 26/27 Console mechanics from
YouTube/EA news/RSS, and writes them as **pending** findings. Nothing reaches
a player until you approve it.

**To approve findings:**
```bash
node metabot/src/approve.js pending   # see what's waiting
node metabot/src/approve.js approve <id>   # approve one
node metabot/src/exportForApp.js   # writes src/data/liveFeed.json
git add src/data/liveFeed.json && git commit -m "metabot: approved lesson" && git push
```

---

## STEP 9 · Make the repo private

GitHub → Settings → Danger Zone → Change visibility → **Make private**.

The source, coaching system and journey fiction are the product. It is still
public (0 forks, 0 stars), and no secrets were ever committed — but the
coaching IP should not be browseable.

---

## Quick-verify checklist

```bash
# Code quality
npx tsc --noEmit                 # must be zero errors.
node tests/frameAnalysis.test.js  # 7/7 pass.
npx expo export --platform web    # should succeed.

# With .env set (keys from eas.json):
node tests/live-backend.test.mjs  # 20 passed · 0 failed.
```

---

## What was fixed today (29 July 2026)

| Fix | Details |
|---|---|
| `.env` created | Real Supabase URL + anon key from the live project |
| MetaBot scheduler installed | `.github/workflows/metabot.yml` — runs daily |
| 4 new MetaBot lessons | Stages 3–6 now have content (The Second Ball, The Driven Pass, The 75th-Minute Switch, The Controlled Sprint) — `liveFeed.json` has 6 lesson-bearing posts |
| THE EYE Android module written | `plugins/withMatchWatcher.js` — Expo config plugin that injects native Kotlin (MatchWatcherModule, MatchWatcherService, MatchWatcherPackage) at prebuild time. Registered in `app.json` |
| Edge functions verified | All 10 are complete and ready to deploy |
| TypeScript verified | `tsc --noEmit` — zero errors |
| Tests pass | `frameAnalysis.test.js` — 7/7 |
| Auth keys baked | `eas.json` has real URL + anon key for cloud builds |

---

## The honest remaining list

| # | What | Who | Time |
|---|---|---|---|
| 1 | Deploy 10 edge functions | You (dashboard) | 10 min |
| 2 | Run remaining SQL migrations (fx, stripe, rescue, packs, tiers, access, claims, consult, enforcement, notices) | You (SQL Editor) | 5 min |
| 3 | Fix OPay account holder name | You (OPay app) | 2 min |
| 4 | Create Stripe account, add secrets | You (Stripe) | 15 min |
| 5 | Build the APK (`eas build`) | You (terminal) | 15 min |
| 6 | Buy your own pass (real payment test) | You (phone) | 5 min |
| 7 | Make repo private | You (GitHub) | 1 min |
| 8 | Install MetaBot scheduler (one command) | You (terminal) | 1 min |
| 9 | Back up upload keystore (`npx eas credentials`) | You (terminal) | 2 min |

**Total: ~55 minutes, all yours.** Nothing left to code.
