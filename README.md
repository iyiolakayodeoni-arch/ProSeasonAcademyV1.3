# ⚽ ProSeasonAcademy

**Onliversity's ProSeasonAcademy — Pro Season, the FC Mobile Pro development programme.**

You lock in **one coach — permanently** — as your voice, guide and accountability presence on a
**universal six-stage development journey** (See Yourself → Control Yourself → Read the Game →
Build Discipline → Perform Under Pressure → Prove It). Beside it runs **The Standard** — the
parallel benchmark journey of a composite elite Role Model, revealed as you advance: *your
journey is the evidence, the Standard is the benchmark.*

The heart of the programme is the **Mirror Session**: you set an intention before the match,
answer checkpoints at half-time and full-time, divide the match into your own key moments,
review them in your own words, and watch the versions of your thinking sit beside one another —
*before / half-time / full-time / after review* — until you can see the gaps yourself. The app
records the evidence; **it never does your thinking for you.** Each session ends with one lesson
you swear into **The Thread**, which the next session opens by asking how it held — or broke.

Across the entire application — from **The Baseline Week** to **The Journey (Our Own Path)**, **Loss Journal**, and **Side Quests** — every player trains under **The Chinedu Way**:
1. **Screen Record & Watch:** Record your match using your phone's built-in recorder and watch your tape back.
2. **Pen to Paper Before You Type:** *"There is a special connection a biro has to a book that cannot be typed."* Write down your key moments, unusual events, and answers on paper with a biro first.
3. **24–30 Minute Cool-Down:** Let your head settle and cool down for 24–30 minutes after full time before opening the app.
4. **Log to Database:** Type your penned truth into the Academy database.
5. **The 7-Day Cadence:** Days 1–3 build momentum with Matches 1, 2, and 3; Day 4 is Rest Day 1 (mid-week rest & reflection, no match played); Day 5 is Match 4; Day 6 is Rest Day 2 (pre-finale rest & preparation, no match played); Day 7 is Match 5 (The Finale) & Profile Card seal.
6. **The Philosophy:** *"In a world where everyone is looking for the easy way out, we tell you that the hard way is the easy way, and the easy way is the hard way. Do things the right way. Tech is meant to elevate and not make you dormant. That is the Chinedu Way."*

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

**`src/audio/`** is the academy's ear. `sound.ts` owns every noise the app makes: short UI
sounds (bubble pops, the referee whistle at lock-in and stage pass, the till), the 24-second
night-stadium pad that breathes under the home tab, and the two **real coach voice notes**
that play in the briefing room. Every asset is generated in-repo, never licensed —
`python3 scripts/make-sounds.py` re-synthesises the whole pack in `assets/sounds/`. Two
toggles (MUSIC / SOUND FX) live in Settings → SOUND and persist with the other preferences.

**The native watcher (`plugins/withMatchWatcher.js`)** is the Mirror Session's eyes and
recorder: at `expo prebuild` it injects a MediaProjection module into the generated
`android/` project — official screen-capture consent, a `mediaProjection` foreground
service, ~1fps grayscale frames for the on-device ScoreTracker (goals), and a
**MediaRecorder that only starts when the match is detected** (first goal or your
MATCH STARTED tap). The MP4 is written to app-private storage and never uploaded by
default; the session plays it back with MARK START / MARK END from the timeline.
⚠️ Requires a development build (`npx expo run:android` / EAS) — not in Expo Go; on
other platforms the session runs in manual mode.

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
| **`MIRROR_DIRECTION.md`** | the applied product direction: one Journey, The Standard, the Mirror Session |
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
