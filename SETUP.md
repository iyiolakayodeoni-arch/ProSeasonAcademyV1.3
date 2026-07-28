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
| 5 | `supabase/tiers.sql` | **FREE / ACADEMY / PRO — the same ladder in ₦ and $** | `THE LADDER` + 10 product lines |

Then **Edge Functions** — paste each file's contents into a function of the same name:

| Function | Source | Why |
|---|---|---|
| `ensure-profile` | `supabase/functions/ensure-profile/index.ts` | **redeploy** — now checks invites |
| `founder-desk` | `supabase/functions/founder-desk/index.ts` | **new** — inbox, invites, packs |

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

## December — the free listening week

Two moves, both from the desk:

1. **THE DOOR** → tap the pill to `OPEN TO ALL`. Anyone with the app can take a seat.
2. Set the dates so the banner appears in Community:

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

No deploy, no rebuild, no code change. That was deliberate: you said the pricing is not
set in stone, so none of it is hardcoded.

---

## Two things only you can do

- **Make the GitHub repo private** — Settings → Danger Zone → Change visibility. It is
  still public. Nobody has forked it (0 forks, 0 stars), and no real secrets were ever
  committed, but the source is the product.
- **Back up the signing keystore** once EAS creates it (`npx eas credentials`). Lose it
  and members cannot install updates over the top of what they have.
