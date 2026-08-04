# ⚽ ProSeasonAcademy

**Onliversity's ProSeasonAcademy — Pro Season, the FC Mobile Pro development programme.**

The academy has **one coach — Chinedu Okafor, THE DISCIPLINARIAN — permanently**. No coach
selection exists, by design: the only decision a player should carry is the one that moves them
forward — their training, their thinking, the programme ahead — never *which coach to use*.
He is your voice, guide and accountability presence on a **universal six-stage development
journey** (See Yourself → Control Yourself → Read the Game → Build Discipline → Perform Under
Pressure → Prove It). Beside it runs **His Road** — the benchmark journey Chinedu himself
walked, season after season at the top of the game, revealed as you advance: *your journey is
the evidence, his road is the benchmark.*

The heart of the programme is the **Mirror Session**: you set an intention before the match,
answer checkpoints at half-time and full-time, divide the match into your own key moments,
review them in your own words, and watch the versions of your thinking sit beside one another —
*before / half-time / full-time / after review* — until you can see the gaps yourself. The app
records the evidence; **it never does your thinking for you.** Each session ends with one lesson
you swear into **The Thread**, which the next session opens by asking how it held — or broke.

Before the Journey runs **The Baseline Week** — the same discipline as the gate: one ranked
match a day for seven days. Each day you watch the recording, name the moments where you
failed, and analyse each one (how you were thinking, what made you fail, what you could have
done differently). The next day unlocks 24 hours after the previous one seals — a forced gap
so the thinking has time to land. Nothing is bombarded, nothing is forced, lateness is never
punished. Day 6 is the week's reflection, day 7 seals your profile card.

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
night-stadium pad that breathes under the home tab, and the **real coach voice note**
that plays in the briefing room. Every asset is generated in-repo, never licensed —
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

Progress is keyed **per coach**, so each player's ledger stays theirs alone, and it survives
a force-quit. The vault syncs to Supabase when there's signal and queues in an
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
| **`MIRROR_DIRECTION.md`** | the applied product direction: one Journey, His Road (the benchmark), the Mirror Session |
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
