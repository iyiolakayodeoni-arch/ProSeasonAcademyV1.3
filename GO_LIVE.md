# GO LIVE — the exact list

Checked against your live project on 28 July 2026.
**`schema.sql` is already running.** You need pastes 2–9, then 3 functions.

About 20 minutes. Do them in order — later files depend on earlier ones.

---

## PART 1 — the SQL

### Easiest: one paste

Open **`supabase/RUN_ALL.sql`** — it is all 8 migrations joined in the right order.
Supabase → **SQL Editor** → **New query** → paste the whole thing → **Run**.

You should end with `THE ACADEMY BOT ARMED` in the notices.

### Or one at a time

If you would rather see each step succeed on its own (easier to pinpoint a failure),
run these eight in this exact order instead. Same result.

| # | File | Success message |
|---|---|---|
| 2 | `supabase/seat-gate.sql` | `SEAT GATE ARMED · SEASON ONE · 0/1000 taken` |
| 3 | `supabase/security.sql` | `SECURITY ARMED · … invite_only=true` |
| 4 | `supabase/packs.sql` | `PACK CONTENTS` + a line per pack |
| 5 | `supabase/tiers.sql` | `THE LADDER` + 10 product lines |
| 6 | `supabase/access.sql` | `ACCESS ARMED · trial=MID for 14 days` |
| 7 | `supabase/consult.sql` | `PRICING TABLE ARMED · 7 open question(s)` |
| 8 | `supabase/enforcement.sql` | `ENFORCEMENT ARMED` |
| 9 | `supabase/notices.sql` | `THE ACADEMY BOT ARMED` |

**Where to see the message:** the green **Success** panel, or the **Messages / Notices**
tab under the results. If it says Success but you see no notice, it still worked.

**If you get a red error:** stop. Do not run the next file. Copy the red text and send it
to me — running the rest on a half-applied migration makes it harder to fix.

---

## PART 2 — the Edge Functions (3)

Supabase → **Edge Functions**.

### 2a · Redeploy `ensure-profile` (it already exists — replace the code)
Open it → select all the code → delete → paste from
**`supabase/functions/ensure-profile/index.ts`** → **Deploy**.

*Why: it now checks invite codes, sets the 14-day deadline, and sends the welcome message.*

### 2b · Create `founder-desk` (new)
**Create a new function** → name it exactly `founder-desk` → delete the sample code →
paste from **`supabase/functions/founder-desk/index.ts`** → **Deploy**.

*This is your whole admin console: inbox, invites, packs, moderation, the sweeper.*

### 2c · Create `pay-webhook` (new)
**Create a new function** → name it exactly `pay-webhook` → paste from
**`supabase/functions/pay-webhook/index.ts`** → **Deploy**.

*This is what makes payments automatic.*

> **If a function errors about `../_shared/...`:** create the two shared files first.
> In the function editor use **Add file** to create `_shared/cors.ts` and
> `_shared/admin.ts`, pasting from `supabase/functions/_shared/`. Their UI moves this
> around between versions — send me a screenshot if it does not match and I will walk you
> through the version you have.

---

## PART 3 — the secrets

Supabase → **Edge Functions** → **Secrets** (or Project Settings → Edge Functions).

| Name | Value | Needed for |
|---|---|---|
| `FOUNDER_KEY` | your admin word | Founder Desk, broadcasts, money moves |
| `PAYSTACK_SECRET` | from Paystack dashboard | automatic ₦ payments |
| `FLW_SECRET_HASH` | from Flutterwave dashboard | automatic $ payments |

`FOUNDER_KEY` is required now. The two payment secrets can wait until those merchant
accounts exist — the Founder Desk's manual grant works in the meantime.

---

## PART 4 — check it worked

New query in the SQL Editor, paste this, Run:

```sql
select * from season_seats();
select key, value from config
 where key in ('invite_only','paid_only','trial_days','existing_grace_days','tos_version');
select code, region, tier, duration_days, price from products where active order by region, sort;
select count(*) as open_questions from consult_questions where open;
```

You should see:

- `SEASON ONE | 1000 | 0 | 0 | false`
- `invite_only=true · paid_only=true · trial_days=14 · existing_grace_days=30 · tos_version=1`
- 10 products — 5 africa (₦), 5 world ($)
- `7` open questions

**Prove the seat cap actually holds** — paste `supabase/tests/seat-gate.test.sql` and run
it. It shrinks the season to 3 seats, tries to take a 4th, then **rolls itself back**, so
your data is untouched. Expect `ALL SEAT GATE TESTS PASS`.

---

## PART 5 — the app build

Nothing in the app needs editing. `.env` and `eas.json` already carry your project keys.

```bash
npm install
npx eas login
npx eas init                                          # once
npx eas build --platform android --profile production # → signed APK
```

When EAS offers to make a keystore, say **yes**, then run `npx eas credentials` and back
it up. Lose it and members cannot install updates over the top.

---

## What changes the moment you finish

| Before | After |
|---|---|
| Anyone with the APK takes a seat | Invite code required |
| Seat cap was bypassable | Enforced in Postgres, race-proof |
| No tiers | FREE / ACADEMY / PRO, same rungs in ₦ and $ |
| No trial | 14 days for new members, 30 for existing |
| Manual payment validation | Automatic via webhook |
| No moderation | 3 strikes, extreme content flagged to you |
| Silent removals | Every warning and removal explained in their inbox |

---

## First things to do in the app afterwards

Settings → tap **VERSION ×5** → paste your `FOUNDER_KEY` → Founder Desk.

1. **THE DOOR** → create an invite code for yourself and test signing up.
2. **THE FREE WEEK** → when you are ready to launch, grant the trial to everyone.
3. **THE INBOX** → your private line from members.

---

## Order of operations, honestly

Do **Part 1 and 2 now** — that is the security work, and until it runs your academy is
open to anyone who gets the APK.

The payment secrets, the invite codes and the free week can all wait until you are
actually ready to launch. None of them are urgent; the open door is.
