# ProSeasonAcademy — the founder's direction

Captured 28 July 2026, in the founder's own framing. This is the "why" behind the
build decisions, so nobody (including a future me) argues with settled calls.

---

## The stance

**Quality over quantity. Not on any store. Total control.**

The academy is part of the Onliversity ecosystem — invited members, not downloads. The
goal is not reach; it is making the people inside genuinely better. If they get good,
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

## Money — different by region, deliberately unsettled

### Africa → **credits**
Some of the journey is free; the rest is bought with credit packs. Pay for what you
want, when you have it. No monthly commitment in a market where that is a barrier.

- `config.free_stages = 2` — first two stages free for everyone
- `config.stage_unlock_cost = 50` credits per stage after that
- `config.trick_unlock_cost = 20` credits per Home trick
- **Home tricks are bundled into the starter packs** — a pack is not just credits, it is
  a set of tricks you keep

### World → **subscription**
Flat monthly, everything unlocked. `PRO-MONTHLY`, currently $4.99.

### Both are config rows, not code
Every number above lives in `config` or `products` and is editable in the Supabase
dashboard. **The founder was explicit: the pricing is not set in stone.** The pricing
halls (`#division-africa`, `#division-world`) exist so members argue it out before it
locks. `unlock_item()` handles both models — subscribers unlock at zero credit cost, so
one code path serves both regions.

The till stays shut until `config.go_live` (currently 2027-01-01). Prices are visible
before then; nothing can be bought.

---

## December — the listening week

**One week, app free, founder in the halls.**

The point is that launch should not be a surprise to anyone. Members are in the room
while it is being decided — asked what they want, what they would pay for, what is
annoying them. They arrive already invested because they helped build it.

Shipped for it:
- `#founders-week` channel
- `config.founder_week_start` / `_end` / `_note` — dates movable without a deploy
- A live banner in Community while the window is open
- `invite_only = 'false'` for that week opens the doors, then back to `'true'`

## The private line

**Contact the founder** — Settings → private thread. Questions, suggestions, bugs, or
just talking. Not a ticket queue with a robot: it lands in `contact_messages`, you read
it, your reply comes back into the member's thread. Rate-limited to 5/hour so the line
stays usable.

---

## What is built vs. what is next

**Built and tested:** invite-only door · seat cap enforced in Postgres · rate limits ·
mute/remove · contact inbox · founder's week · `unlock_item()` credit/subscription
engine · per-coach progress persistence · live rooms.

**Next, in order:**
1. Apply `security.sql` to the live project (nothing above is armed until then)
2. Home tab: mark tricks locked/unlocked, wire `unlock_item()` to the tap
3. Journey: gate stages 3+ behind `free_stages`, with an honest unlock prompt
4. Founder Desk: contact inbox reader + reply box; invite-code issuer
5. Decide the December dates and seed the invite codes
