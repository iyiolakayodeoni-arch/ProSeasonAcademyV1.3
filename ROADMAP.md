# ProSeasonAcademy — the founder's direction

Captured 28 July 2026, in the founder's own framing. This is the "why" behind the
build decisions, so nobody (including a future me) argues with settled calls.

---

## The stance

**Quality over quantity. Not on any store. Total control.**

The academy is part of the Onliversity ecosystem — distributed privately, not on any
store, and capped at 1,000 seats. The goal is not reach; it is making the people inside
genuinely better. If they get good,
they stay, they tell people, and their subscriptions and credits fund the thing. Success
of the members *is* the business model.

### What a store would have given us — and why we said no

Play Store gives distribution to strangers, an install button, automatic updates, and a
payment rail that takes 15–30%. It also brings review queues, policy changes you do not
control, refund disputes, a public rating, and — for a new personal account — 12 testers
for 14 days before you can even publish.

We want none of the reach and all of the control. Sideloaded APKs from your own link,
your own payment rails, your own rules, no gatekeeper. **Decision: closed. Not revisited.**

---

## Seasons — capped on purpose, growing on purpose

| Season | Seats | Why |
|---|---|---|
| One | 1,000 | What one person can genuinely coach and talk to. Also what the infrastructure costs allow today. |
| Two | 2,000 | Doubles once Season One proves the model and pays for the room. |
| Beyond | grows | Keep going until the software has run out of updates worth shipping — then move to the next product. |

The cap is **both** a constraint and a feature: exclusivity that is real, and a promise
you can actually keep. Raising it is one SQL statement (`SEAT_CAP.md` §4) — no deploy.

Enforced in Postgres: `config.seat_cap` + a row-locking trigger. Cannot be raced,
cannot be bypassed. Removed members free their seat.

---

## Money — ONE ladder, two currencies

The first cut had Africa buying credits (permanent unlocks) and abroad paying a monthly
sub (loses everything if they stop). Same academy, two different deals. The founder's
call, and it is the right one:

> *"so that it does not seem like we are cheating them when they start chatting with
> each other"*

Members talk. If two of them compare what they paid for and the deals are not
equivalent, trust is gone — and trust is the whole product here.

### The three rungs, identical everywhere

| Tier | What it opens |
|---|---|
| **LAPSED** | Door shut. Nothing deleted — vault, journal, XP and badges all wait. |
| **ACADEMY** | The full journey, every stage, and the weekly tricks as they drop. |
| **PRO** | Everything, plus the film room and first call on the founder's time. |

Passes are **timed**, in both regions: 1 month · 3 months · 1 season.

| | Africa (₦) | World ($) |
|---|---|---|
| ACADEMY · 1 month | ₦1,500 | $3.99 |
| ACADEMY · 3 months | ₦3,900 | $9.99 |
| PRO · 1 month | ₦3,000 | $7.99 |
| PRO · 3 months | ₦7,800 | $19.99 |
| PRO · 1 season | ₦25,000 | $59.99 |

**Only the currency differs.** Same rungs, same durations, same access.

### The fairness rules, enforced in SQL
- Same tier again → days **add** to what is left
- Upgrade mid-period → remaining days **carry over** at the better tier
- A cheaper pass can **never** strip a live higher one (`ACTIVE_HIGHER_TIER`)
- An expired pass silently drops to FREE — nobody is locked out of their own vault

### Still not set in stone
Every price, duration and tier boundary is a row in `products` or `config`, editable in
the dashboard. The pricing halls exist so members argue it out before it locks. The till
stays shut until `config.go_live`.

## The academy is paid — and that is the point

After the two-week trial, **no plan means no app**. The founder's reasoning:

> *"if u cant drop some sort of money then u are not serious and there is limited seats
> it's like going for an event or a school and not paying when there is limited seats"*

A capped intake only works if the people in it are committed. A free rider holding one of
1,000 seats is taking it from someone who would use it.

Two things keep this from feeling harsh:
- **Nothing is deleted.** The lapsed gate says so before it asks for anything.
- **A 3-day grace window.** Payments are manual; nobody who has already paid gets locked
  out while waiting on confirmation.

Seats lapsed beyond 30 days are *reported* to the founder, never auto-removed.

## December — the listening week

**One week, app free, founder in the halls.**

The point is that launch should not be a surprise to anyone. Members are in the room
while it is being decided — asked what they want, what they would pay for, what is
annoying them. They arrive already invested because they helped build it.

Shipped for it:
- `#founders-week` channel
- `config.founder_week_start` / `_end` / `_note` — dates movable without a deploy
- A live banner in Community while the window is open
- The door stays open to anyone with the app, up to the 1,000-seat cap

## The private line

**Contact the founder** — Settings → private thread. Questions, suggestions, bugs, or
just talking. Not a ticket queue with a robot: it lands in `contact_messages`, you read
it, your reply comes back into the member's thread. Rate-limited to 5/hour so the line
stays usable.

---

## What is built vs. what is next

**Built and tested:** open registration up to the cap · seat cap enforced in Postgres ·
rate limits · mute/remove · contact inbox · founder's week · `unlock_item()`
credit/subscription engine · per-coach progress persistence · live rooms.

**Next, in order:**
1. Apply `security.sql` to the live project (nothing above is armed until then)
2. Home tab: mark tricks locked/unlocked, wire `unlock_item()` to the tap
3. Journey: gate stages 3+ behind `free_stages`, with an honest unlock prompt
4. Founder Desk: contact inbox reader + reply box
5. Decide the December dates for the free trial week
