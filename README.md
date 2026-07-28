# ⚽ ProSeasonAcademy

A coaching academy for FC Mobile. You lock in **one coach — permanently** — and he walks you
up a six-stage journey, teaching one mechanic that is actually working in the game right now.
A **Match Scan** then grades your real matches against that stage's objectives. Pass, and the
next node opens.

**Private enterprise software.** Distributed inside the Onliversity ecosystem — not on any
app store. **Season One is capped at 1,000 seats**, enforced in the database, so coaching
stays personal and every member can actually be tracked and spoken to.

---

## Quick start

```bash
npm install
npm start                 # Expo dev server
```

| Command | What it does |
|---|---|
| `npm start` | Metro dev server (Expo Go or a dev build) |
| `npm run typecheck` | `tsc --noEmit` — must be clean |
| `npm test` | watcher frame-analysis tests (7/7) |
| `npm run doctor` | `expo-doctor` project health |
| `npx eas build --platform android --profile production` | **signed APK** → see `BUILD.md` |

Local runs read `.env` (gitignored). Copy `.env.example` and fill in the two Supabase values.
Cloud builds read them from `eas.json` instead — both are needed. `BUILD.md` explains why.

---

## Architecture

```
PHONE — Expo SDK 57 / React Native 0.86
  │
  ├─ App.tsx ............ phase routing; restores the saved session during the splash
  ├─ src/screens/ ....... 19 screens (14 + 5 tabs)
  ├─ src/components/ .... 9 pure-SVG components
  ├─ src/data/ .......... 17 stores — module state + useSyncExternalStore,
  │                       persisted to AsyncStorage
  └─ src/data/backend.ts  THE SEAM — the only file that knows the backend
        │
        ▼
SUPABASE  ymnkphqgjxexsnbgtqvk  ← the one live backend
  ├─ Auth ............. anonymous sign-in (no passwords, ever)
  ├─ Postgres ......... profiles · matches · channels · messages
  │                     wallets · ledger · products · config · waitlist
  ├─ RLS .............. players touch only their own rows; a forged
  │                     founder message is rejected by the database
  ├─ Realtime ......... live rooms from message INSERTs + presence
  └─ Edge Functions ... ensure-profile (the seat gate) · admin-summary
                        founder-broadcast · till-topup · till-subscribe · health
```

**`server/` is a backup only.** A complete self-hosted Node/SQLite backend, kept as a proven
₦0 escape hatch and as the behavioural map of what the database must do. Nothing in the app
imports it. ⚠️ It does **not** implement the 1,000-seat gate — read `server/DEPLOYMENT.md`
before ever switching to it.

**`metabot/`** is the scout: a keyless Node pipeline that reads EA news, YouTube, RSS and
guide sites, composes lesson candidates, and waits for **your approval** before anything
reaches a player. Its output is `src/data/liveFeed.json`.

---

## How a member's data is kept

| Store | Key | Holds |
|---|---|---|
| progress | `psa.progress.v1.<coachId>` | stages cleared, XP, badges, lesson refs |
| session | `psa.session.v1` | signed-in, **the permanent coach lock**, intro, baseline |
| vault | `psa.match-vault.v1` | every logged match (graded by the scan) |
| journal | `psa.loss-journal.v1` | loss-journal lines |
| settings | `psa.settings.v1` | name, country/region, platform, toggles |

Progress is keyed **per coach**, so the two journeys can never contaminate each other, and it
survives a force-quit. The vault syncs to Supabase when there's signal and queues in an
outbox when there isn't — the app is offline-first throughout.

---

## Season One — the 1,000-seat gate

Enforced where it can't be fudged, in Postgres:

- `config.seat_cap = 1000`, counted by `season_seats()`, which **excludes** the
  `PSA-FOUNDER` row so your own seat never consumes a member's
- `ensure-profile` counts **before** inserting, so a seat can't be over-sold
- Overflow → `waitlist` table + HTTP 409 `SEASON_FULL`; the app shows the waitlist panel and
  **still lets them train solo** (vault, journey and scans all work offline)
- Re-entry is idempotent — a returning device reclaims its existing seat

Opening Season Two later is one SQL `update` to `seat_cap`.

---

## Documentation

| File | What it's for |
|---|---|
| **`BUILD.md`** | how to build and hand out the APK ← start here |
| `FIXES.md` | the nine go-live blockers and how each was fixed |
| `SUPABASE_MIGRATION.md` | the backend design and the reasoning behind it |
| `console-steps.md` | Supabase dashboard setup, click by click |
| `PROJECT_STATUS.md` | the long feature ledger |
| `REPO_AUDIT.md` | historical audit (superseded) |
| `RELEASE_CHECKLIST.md` | superseded — store-era notes, kept for the keystore history |

---

## Security

- The **anon key** is public by design and safe in `eas.json` — every table is behind RLS.
- The **`service_role` key** must never appear in this repo or any build. It lives only in
  Supabase → Edge Functions → Secrets. Verify with:
  `grep -c 'service_role' dist/_expo/static/js/web/index-*.js` → must be `0`.
- The **founder key** gates every admin action and is checked server-side; the app stores it
  on-device only after Supabase has confirmed it.
