# Switching backends — Supabase ⇄ your own server

**You are on Supabase.** This is the fire escape: how to move to the self-hosted
Node/SQLite server in this folder if you ever want off, and how to come back.

The app was built with a **seam**: exactly two files know a backend exists
(`src/data/backend.ts` and `src/data/supabaseClient.ts`). All 19 screens call the same
32 functions and cannot tell the difference. That is what makes this a config change
rather than a rewrite.

---

## 1 · Parity — what the backup actually does

Both backends now enforce the rules that matter. This was **not** true before: the
backup server had no seat gate at all, so switching would have silently uncapped
Season One.

| Behaviour | Supabase | `server/` |
|---|---|---|
| Sign-in without passwords | anonymous auth | guest token |
| **1,000-seat cap** | BEFORE INSERT trigger + row lock | `BEGIN IMMEDIATE` transaction |
| **Cap survives a race** | ✅ config row locked | ✅ single-writer lock |
| **409 `SEASON_FULL`** | edge function | `/auth/guest` |
| **Waitlist on overflow** | `waitlist` table | `waitlist` table |
| Founder excluded from count | ✅ | ✅ |
| Raise cap → seats open | `config.seat_cap` row | `config.seat_cap` row |
| Match vault, idempotent sync | ✅ | ✅ |
| Live rooms + presence | Realtime | WebSocket |
| Founder Desk / broadcast | edge functions + key | `/admin` + key |
| The Till | RPCs + key | routes + key |
| Seat report | `season_seats()` | `GET /season/seats` |

Both prove it in tests: `supabase/tests/seat-gate.test.sql` (10 assertions) and
`server/test/seat-gate.test.js` (10 assertions, **currently 10/10 green**).

### Known gaps in the backup

- **Realtime scale.** WebSocket fan-out is in-process; fine for 1,000 members, but there
  is no second node to fail over to.
- **Backups are yours.** SQLite is one file — `academy.db`. Nobody snapshots it for you.
  Set up a nightly copy before trusting it with real members.
- **Uptime is yours.** If the box reboots and the service is not enabled, the academy is
  down until you notice.

---

## 2 · Moving TO the backup server

### a. Run it

```bash
cd server
cp .env.example .env        # set ADMIN_KEY (your founder key) and GO_LIVE
npm install                 # needs a compiler for better-sqlite3
npm start                   # listens on :8788
curl localhost:8788/health  # {"ok":true,...}
curl localhost:8788/season/seats
# {"season":"SEASON ONE","cap":1000,"taken":0,"waiting":0,"isFull":false}
```

`server/DEPLOYMENT.md` covers hosting it on Oracle Always Free or a home box behind a
Cloudflare Tunnel, both at ₦0.

### b. Point the app at it

Rewrite the **inside** of `src/data/backend.ts` to call REST/WS instead of `supabase-js`,
keeping all 32 exported names identical. The route map:

| `backend.ts` export | Server route |
|---|---|
| `probeHealth` | `GET /health` |
| `ensureAuth` | `POST /auth/guest` → 409 = `SEASON_FULL` |
| `pushMatches` / `pullMatches` | `POST /matches/sync` · `GET /matches` |
| `listChannels` / `pullMessages` / `postMessage` | `GET /community/channels` · `/community/:slug/messages` |
| `joinRoom` / `sendRoomMessage` | `WS /ws?token=` |
| `toggleCloudReaction` | `POST /react` |
| `adminSummary` / `postFounderMessage` | `GET /admin/summary` · founder broadcast |
| `storeCatalog` / `tillBalance` / `tillSpend` | `/store/catalog` · `/store/balance` · `/store/spend` |
| `tillTopUp` / `tillSubscribe` | `/store/topup` · `/store/subscribe` (key-gated) |

The git history has the pre-Supabase version of this file — `git log --all -- src/data/backend.ts`
— which is the fastest starting point.

Then point the build at the new host:

```bash
# .env  (local)          and  eas.json → build.base.env  (cloud builds)
EXPO_PUBLIC_PSA_SERVER=https://academy.yourdomain.com
```

### c. Move the members across

There is no automatic migration — the two stores have different shapes. Export from
Supabase (Table Editor → CSV, or `pg_dump`) and insert into SQLite:

| Supabase | SQLite |
|---|---|
| `profiles` | `users` (`auth_user_id` → a fresh `token`) |
| `matches` | `matches` (same columns) |
| `messages` / `channels` | `messages` / `channels` |
| `wallets` / `ledger` | `wallets` / `ledger` |
| `waitlist` | `waitlist` |
| `config` | `config` ← **carry `seat_cap` over, or the cap resets to 1000** |

⚠️ Members are identified by a **device-held token**, not an email. Migrating invalidates
existing sessions unless you copy tokens across, so plan a re-sign-in. Their on-device
progress (stages, XP, badges) is untouched either way — it lives in AsyncStorage.

---

## 3 · Coming back to Supabase

Re-point the seam at `supabaseClient` (git history has today's version), restore
`EXPO_PUBLIC_PSA_SUPABASE_*`, and rebuild. Run `supabase/seat-gate.sql` if the project
is fresh — otherwise the cap is enforced only by the edge function, which is the hole
that was fixed.

---

## 4 · Before you switch, honestly

Supabase is doing real work for you at ₦0: managed Postgres, backups, auth, realtime
fan-out and TLS, none of which you maintain. The realistic reasons to move are hitting
the free realtime ceiling (~200 concurrent), wanting the data physically in your own
custody, or Supabase changing terms.

**Season One is 1,000 seats — you will not hit that ceiling.** Keep this as the escape
hatch it is, and keep it tested (`node server/test/seat-gate.test.js`) so it stays real.
