# Turning it all on — the four pastes

Everything built so far is written and tested, but **none of it is live until you run
these**. Right now your database is still on the original schema: the door is open to
anyone with the APK, and the credit gating has no backend to talk to.

About 10 minutes, once.

---

## The order matters

Supabase dashboard → **SQL Editor** → **New query** → paste the whole file → **Run**.

| # | File | What it turns on | Success looks like |
|---|---|---|---|
| 1 | `supabase/schema.sql` | tables, RLS, the till *(already run — skip if so)* | "Success. No rows returned" |
| 2 | `supabase/seat-gate.sql` | the 1,000-seat cap, enforced in Postgres | `SEAT GATE ARMED · SEASON ONE · 0/1000` |
| 3 | `supabase/security.sql` | invite-only door, rate limits, contact inbox, founder's week | `SECURITY ARMED · … invite_only=true` |
| 4 | `supabase/packs.sql` | bundle extras onto a product | `PACK CONTENTS` + a line per pack |
| 5 | `supabase/tiers.sql` | **ACADEMY / PRO — the same ladder in ₦ and $** | `THE LADDER` + 10 product lines |
| 6 | `supabase/access.sql` | **the trial, then paid-only + the grace window** | `ACCESS ARMED · trial=MID for 14 days` |
| 7 | `supabase/consult.sql` | **the pricing table — members help set the price** | `PRICING TABLE ARMED · 7 open question(s)` |
| 8 | `supabase/enforcement.sql` | **deadlines, auto-removal, strikes, terms, refunds** | `ENFORCEMENT ARMED` |

Then **Edge Functions** — paste each file's contents into a function of the same name:

| Function | Source | Why |
|---|---|---|
| `ensure-profile` | `supabase/functions/ensure-profile/index.ts` | **redeploy** — now checks invites |
| `founder-desk` | `supabase/functions/founder-desk/index.ts` | **new** — inbox, invites, packs, moderation |
| `pay-webhook` | `supabase/functions/pay-webhook/index.ts` | **new** — payments grant access automatically |

Confirm `FOUNDER_KEY` is set under **Edge Functions → Secrets**.

---

## Then check it worked

```sql
select * from season_seats();
-- SEASON ONE | 1000 | 0 | 0 | false

select key, value from config
 where key in ('invite_only','free_stages','stage_unlock_cost','trick_unlock_cost');
-- invite_only=true · free_stages=2 · stage_unlock_cost=50 · trick_unlock_cost=20

select p.title, count(pi.item) as bundled
  from products p left join pack_items pi on pi.pack_code = p.code
 group by p.title;
-- STARTER 1 · REGULAR 2 · GRINDER 3 · PATRON 6
```

Prove the cap actually holds — paste `supabase/tests/seat-gate.test.sql` and run it.
It shrinks the season to 3 seats, tries to take a 4th, then **rolls itself back**. Your
data is untouched. Expect `ALL SEAT GATE TESTS PASS`.

---

## Your first day running it

Everything below is in the app: **Settings → tap VERSION ×5 → Founder Desk.**

**1. Make yourself some invite codes.** THE DOOR panel → label them (`LAGOS DEC`), set
uses and expiry days → CREATE. Use `1` use for people you actually know.

**2. Hand them out.** A member types the code on the sign-in screen. No code, or a
used/expired one, and no seat is spent.

**3. When someone pays.** THE TILL panel → their Academy ID → pick the pass → **GIVE
{PASS}**. Passes are timed: buying the same tier again *adds* days, and upgrading
carries the remaining days over. A cheaper pass can never strip a live higher one.

**4. Read your inbox.** THE INBOX panel shows every private message with an unread
count. Reply inline; it appears in their thread.

---

## December — the free trial fortnight

Three moves:

1. **THE FREE WEEK** panel → **OPEN THE FREE WEEK** (tap twice to confirm). Every seated
   member gets a real ACADEMY pass for 14 days. Anyone already holding something longer
   keeps it — nobody is downgraded. People who claim a seat *during* the window get it
   automatically.
2. **THE DOOR** → tap the pill to `OPEN TO ALL` if you want new people in without a code.
3. Set the dates so the banner appears in Community:

```sql
update config set value = '2026-12-01T00:00:00Z' where key = 'founder_week_start';
update config set value = '2026-12-08T00:00:00Z' where key = 'founder_week_end';
```

While it's live, `#founders-week` carries a gold banner and members know you're in the
halls. When the week ends, tap the pill back to `INVITE-ONLY`.

---

## Changing your mind later — all of it is data

| To change | Do this |
|---|---|
| Open Season Two (2,000 seats) | `update config set value = '2000' where key = 'seat_cap';` |
| More/fewer free stages | `update config set value = '3' where key = 'free_stages';` |
| Where ACADEMY stops / PRO starts | `mid_stages` |
| Which tier sees tricks / film room | `tricks_min_tier` · `filmroom_min_tier` |
| Any price, either currency | Table Editor → `products` → edit `price` |
| Pass durations | `products.duration_days` |
| Which tricks are in a pack | Table Editor → `pack_items`, or the desk's `pack_set_items` |
| Open the till for real | `go_live` → any past date |
| Trial length / tier | `trial_days` · `trial_tier` |
| Grace window after expiry | `grace_days` (default 3) |
| Turn paid-only off again | `update config set value='false' where key='paid_only';` |

No deploy, no rebuild, no code change. That was deliberate: you said the pricing is not
set in stone, so none of it is hardcoded.

---

## Two things only you can do

- **Make the GitHub repo private** — Settings → Danger Zone → Change visibility. It is
  still public. Nobody has forked it (0 forks, 0 stars), and no real secrets were ever
  committed, but the source is the product.
- **Back up the signing keystore** once EAS creates it (`npx eas credentials`). Lose it
  and members cannot install updates over the top of what they have.


---

## After the trial — the paid academy

`paid_only = true` means a lapsed member cannot use the app. They see the **lapsed gate**:
nothing deleted, their vault and progress intact, the coach explaining it in his own
voice, and the passes one tap away.

**The grace window matters.** Payments are confirmed by hand — someone pays, you see the
alert, you grant the pass. Without a cushion, a member who paid at 11pm gets locked out at
midnight through no fault of theirs. `grace_days` (default **3**) keeps them inside while
your confirmation catches up, with an honest banner counting it down.

The gate also keeps **Contact the founder** reachable, so anyone stuck can always reach a
human rather than a dead end.

### Reclaiming seats

`THE FREE WEEK` panel lists members lapsed beyond `lapsed_seat_days` (default 30). It
**only reports** — nothing is automatic. Removing someone is always your decision:

```sql
select set_member_status('PSA-ABC123', 'removed');   -- frees the seat
```


---

## The fortnight, end to end

**Day 0 — open it.** Founder Desk → THE FREE WEEK → *OPEN THE FREE WEEK*. Everyone with
a seat gets a 14-day ACADEMY pass. Set the Community banner dates.

**Days 1–14 — be in the halls.** `#founders-week` is live. Members see **THE PRICING
TABLE** banner in Community with a count of questions left. Seven questions: did it make
you better, would you pay, what is a fair price *in your own currency*, which duration,
what is worth paying for, what is missing.

One answer per member, editable while it is open, private from the halls. They can be
blunt without performing for an audience.

**Day 14 — read the numbers.** Founder Desk → THE PRICING TABLE shows counts per choice,
the **median** price per region (median, not average, so two silly numbers cannot drag
it), the range, and their own words as quotes.

**Then set the real prices** in `products` and tap *CLOSE THE TABLE*. Answers freeze, so
nobody can edit a vote after you have published what it produced.

**Day 15 — paid only.** `paid_only` is already `true`. Lapsed members meet the gate:
nothing deleted, coach's words, passes one tap away, 3 days of grace for anyone whose
manual payment is still with you.


---

## Automatic payments — no more validating by hand

`pay-webhook` turns a successful charge into access with no involvement from you.

### Set it up once

**Paystack (₦)** → Settings → API Keys & Webhooks → Webhook URL:
```
https://ymnkphqgjxexsnbgtqvk.supabase.co/functions/v1/pay-webhook?p=paystack
```
Add the secret as `PAYSTACK_SECRET` under Edge Functions → Secrets.

**Flutterwave ($)** → Settings → Webhooks → same URL with `?p=flutterwave`.
Add your hash as `FLW_SECRET_HASH`.

### The one thing that must be right

The payment has to carry **`academy_id`** and **`product`** in its metadata. Put them in
the payment link you give members — their Academy ID is shown to them in the till exactly
so they can paste it at checkout.

Safety built in:
- **Signature verified** on every call (constant-time compare) — a forged webhook grants
  nothing.
- **Idempotent** — providers retry, and a retry cannot extend a pass twice.
- **Unmatched payments are never dropped.** If the metadata is missing, it lands in your
  inbox with the reference and amount so you can grant it by hand.
- Paying **clears the removal deadline** automatically.

Until the merchant accounts exist, the Founder Desk's manual grant still works — same
`grant_tier` function, same audit trail.

---

## The deadlines

| Who | Clock | Then |
|---|---|---|
| Existing members who never paid | **30 days** from running paste #8 | seat released |
| Every new member | **14 days** from joining | seat released |

`sweep_unpaid()` runs nightly (or from the Desk). It removes **only** people past their
deadline who never paid — anyone holding a live pass, inside the 3-day grace, or who has
ever paid is left alone. The founder row is never touched, and nothing is deleted: status
becomes `removed`, the seat frees, and the reason is logged.

Members see a red countdown banner in their final week, and the exact date in Settings.

## Conduct

Three warnings and out. Swearing, jokes and arguing about football are explicitly fine.

The filter catches **only** sexual content and hate speech, and it **never removes anyone
by itself** — it flags for you in FLAGGED CONTENT, where you can warn or dismiss. Extreme
matches are marked `severe`, which never auto-removes, so you speak to those people first.

## Refunds

`refund_due()` calculates unused days only. Used time is not refunded; if you remove
someone with paid time left, that balance is owed. Removing from the Desk returns the
refund figure so you know what to send back.

## The terms

Every member sees `TermsSheet` before anything else and must scroll to the end to accept.
It covers the trial, the deadline, what happens if a pass lapses, conduct, refunds and
data. Edit the text in the `tos` table; bump `tos_version` to re-show it to everyone.
