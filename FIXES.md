# v1.3.2 — "The expected package.json path … android\package.json" — false alarm, wrong folder

**Date:** 3 August 2026

## The failure

Following the v1.3.1 instructions, the release build failed twice in a row:

1. `npx expo prebuild --platform android` died instantly with
   `ConfigError: The expected package.json path: C:\Users\admin\...\android\package.json does not exist`
2. `cd android` then failed with `Cannot find path '...\android\android'`
3. `./gradlew assembleRelease` compiled but died at `:app:compileReleaseKotlin` with the
   **v1.3.1 errors again** (`MatchWatcherModule.kt`: `Conflicting overloads` on
   `onActivityResult`, `Unresolved reference 'emit' / 'currentActivity'`, `Missing '}'`;
   `MatchWatcherService.kt`: `Unresolved reference 'RGBA_8888' / 'Display'`).

## The cause — not a code bug this time

The terminal session was sitting **inside `android/`** when the block was pasted:

- `npx expo prebuild` therefore treated `android/` as the project root. Expo's
  `getConfig()` demands a `package.json` at the root → `android\package.json does not exist`
  (there is never supposed to be one there; the project root has the real one).
- Because prebuild never ran, the **fixed** MatchWatcher Kotlin (v1.3.1, in
  `plugins/withMatchWatcher.js`) was never re-injected into `android/` — the stale
  pre-fix files stayed and gradle compiled those, hence the identical errors.
- The `cd android` failure (`...\android\android`) is the giveaway: it only happens when
  you are *already inside* `android/`.

## The fix

Run everything from the project root, never from inside `android/`:

```powershell
cd C:\Users\admin\ProSeasonAcademyV1.3
npx expo prebuild --platform android   # re-injects the fixed MatchWatcher Kotlin
cd android
.\gradlew assembleRelease
```

No keystore was touched — nothing was deleted. (If prebuild is ever unwanted, the
one-command equivalent that only rewrites the three Kotlin files is
`node scripts/fix-matchwatcher.cjs` — now self-verifying: it re-checks every file it
writes against the RN 0.86 requirements and fails loudly if the plugin is stale.)

Hardening added in this version:

- `package.json`: new `npm run fix:matchwatcher` script (discoverable recovery command).
- `scripts/fix-matchwatcher.cjs`: warns when run outside the project root; after writing
  the Kotlin files it verifies `onNewIntent` is implemented, exactly one
  `onActivityResult` exists, `emit()` is defined, `currentActivity` resolves via
  `reactApplicationContext`, and the service uses `ImageFormat.RGBA_8888` +
  `android.view.Display` — 6/6 checks, fails with a clear message otherwise.
- `BUILD.md`: new "1b · Direct gradle build (no EAS)" section documenting the root-only
  rule and both failure modes above.

---

# v1.3.1 — The Android Build, Fixed

**Date:** 1 August 2026

## The failure

`./gradlew` (or `npx expo run:android`) died at `:app:compileReleaseKotlin` with only
"Compilation error. See log for more details" — no source file, no line number, nothing to
act on.

## The cause

`plugins/withMatchWatcher.js` (THE EYE) injects `MatchWatcherModule.kt`,
`MatchWatcherService.kt` and `MatchWatcherPackage.kt` at prebuild time. That Kotlin was
written for the **old Java RN bridge** and stopped compiling the day the project moved to
**React Native 0.86 / SDK 57**, where the bridge was migrated to Kotlin. Three hard errors,
all in `MatchWatcherModule.kt`:

1. `onActivityResult(activity: Activity?, …)` — RN 0.86's `ActivityEventListener` now
   declares `activity: Activity` **non-null** → override mismatch (`'onActivityResult'
   overrides nothing`).
2. `onNewIntent(intent: Intent?)` — same story, `Intent` is non-null → override mismatch.
3. `val activity = currentActivity` — `ReactContextBaseJavaModule` is now Kotlin, so
   `getCurrentActivity()` is a plain function with **no synthetic `currentActivity`
   property** → `Unresolved reference: currentActivity`.

## The fix (all in `plugins/withMatchWatcher.js`)

- Both override signatures made non-null (`Activity`, `Intent`) to match RN 0.86.
- `currentActivity` → `reactApplicationContext.currentActivity` (the property survives on
  the Java `ReactContext`, which is exactly what RN's own deprecation notice recommends).
- `MainApplication.kt` registration hardened: it already handled the SDK 57
  `PackageList(this).packages.apply { … }` shape; now it also handles the RN-classic
  `val packages = PackageList(this).packages` shape with `packages.add(...)`, and **warns
  loudly** instead of injecting Kotlin that cannot compile if a future template matches
  nothing.

Verified: the plugin was run through Expo's real mod compiler against a simulated SDK 57
project — 13/13 checks pass (registration lands inside the `apply` block, manifest gets the
three permissions + the `mediaProjection` service, all three Kotlin files are written with
the corrected signatures). `tsc --noEmit` clean, all tests pass, `expo config` resolves.

> If you already have a generated `android/` folder, delete it first — the injected files
> are only re-written at prebuild time:
> ```bash
> rm -rf android
> npx expo run:android   # or: npx expo prebuild && cd android && ./gradlew assembleRelease
> ```

---

# v1.3.0 — The Nine Blockers, Fixed

**Date:** 28 July 2026 · **Backend:** `ymnkphqgjxexsnbgtqvk.supabase.co` (live, verified)
**Distribution:** private / enterprise, inside the Onliversity ecosystem. **Not a store app.**

Verified after every change: `tsc --noEmit` clean · watcher tests 7/7 · `expo export` succeeds ·
`expo-doctor` 18/20 (the 2 failures are sandbox network blocks, not project faults).

---

## Your backend, checked before a line was written

| Check | Result |
|---|---|
| Schema deployed | ✅ 9 tables live |
| Channels seeded | ✅ all 5 rooms |
| Products seeded | ✅ 4 africa credit packs + 1 world sub |
| `season_seats()` | ✅ `SEASON ONE · cap 1000 · taken 0` |
| Anonymous sign-ins | ✅ already enabled |
| Edge functions | ✅ deployed + demanding auth |
| RLS on `profiles` / `matches` | ✅ returns empty to a stranger |
| `go_live` | `2027-01-01` — till stays shut, as intended |

Your setup was correct. Nothing on the Supabase side needed changing.

---

## The nine

### 1 · Progress is saved ✅ *(the one you asked for)*
`src/data/progress.ts` was pure in-memory. Now persisted to AsyncStorage under
`psa.progress.v1.<coachId>` — **keyed per coach**, so the two journeys can never bleed
into each other.

Every stage cleared, all XP, every badge and each stage's lesson reference now survive a
force-quit. Loading is defensive: corrupt or hand-edited data is rejected field by field
rather than crashing, and `currentStage` is always re-derived as
`max(saved, highestCleared + 1)` so the map can never contradict the ledger.

### 2 · The coach lock and onboarding survive restarts ✅
New `src/data/session.ts` (`psa.session.v1`) remembers: signed-in, **locked coach**,
intro seen, baseline cleared, referral, first-entry date.

`App.tsx` now restores this *while the splash is still on screen* and routes to the right
place. Before, every cold start meant re-locking a coach and re-sitting the whole 5-match
Baseline Scan. `lockCoach()` is guarded — once set, it cannot be overwritten, which is what
"permanent" is supposed to mean.

Sign-out keeps the ledger and the lock; only **delete account** wipes settings + progress +
session + cloud identity together.

### 3 · The five orphaned screens have doors ✅
2,143 lines that no button could reach:

| Screen | Now reachable via |
|---|---|
| `MatchVault` | Journey tab → **MATCH VAULT** card (live W-D-L) |
| `LossJournal` | Journey tab → **LOSS JOURNAL** card (count + streak, PAUSED state) |
| `StageScanSheet` | Coaching screen → **SCAN A MATCH ›** |
| `FounderDesk` | Settings → tap version **×5** → key sheet → desk |
| `StoreSheet` | Settings → **THE TILL** row |

### 4 · The Founder's door exists ✅
The `VERSION ×5` tap described in your status doc had never been built. Now: 5 taps opens a
key sheet, the key is proved **server-side** via `admin-summary` (a wrong key opens nothing —
the phone doesn't get a vote), and on success it's cached on-device so later taps go straight
to the desk. A `★` on the version line shows it's held. `FounderDesk`'s own `onForgetKey`
clears it.

### 5 · The Match Scan is real ✅
`mockScanResult()` hard-coded `passed: true` — the CTA just waited 2.8s and granted the stage.

Rewritten: `gradeStage()` scores the stage's objectives against the **real vault + journal**
via the existing `objectiveCount()`. A stage passes only when *every* objective is met. The
scan card now shows live counts before you even scan, plus the coach's honour-system watch-list
for today's mechanic. Two ways in:
- **SCAN A MATCH ›** → the full `StageScanSheet` ritual → grades the moment it closes
- **OR GRADE THE N MATCHES ALREADY IN MY VAULT ›** → grades what's already logged

Failing is now genuinely possible, which is the entire point of a scan.

### 6 · Journey objectives count for real ✅
Every objective rendered `0/2` forever because `JourneyTab` read the static `o.done`. It now
calls `objectiveCount(o.check, vault.matches, journal.entries.length)` — the same grader the
scan uses, so the map and the film room can never disagree.

### 7 · The cloud is connected ✅
- `.env` created with your URL + anon key; **verified inlined into a real build** (URL ×1,
  anon ×1, `service_role` ×0).
- `.gitignore` now excludes `.env` but keeps `.env.example` — your keys stay out of Git.
- `initCloudSync()` is finally **called** (from `App.tsx`, once the coach is known).
- Community `#general`/`#wins`/`#losses` now mirror the real `dressing-room`/`match-receipts`/
  `the-lab` rooms: history pull, realtime INSERT fan-out, presence, remote players folded into
  the same user map the UI already renders.
- **Bug found and fixed in `backend.ts`:** `joinRoom` stored one global handler, so with three
  rooms only the last would have received anything. Handlers are now per-room.
- Scripted traffic only runs when genuinely offline — a live hall is never faked over.

### 8 · Sign-in is honest ✅
It collected email + username + **password**, logged them to the console, threw them away,
and let you in with three empty fields — under copy that read "NO PASSWORDS".

Now one field (academy name, 3–14 chars), country required, and the button states the actual
blocker (`PICK YOUR COUNTRY FIRST` → `ENTER YOUR ACADEMY NAME` → `CLAIM MY SEAT`). `useAuth`
does the real anonymous-auth + `ensure-profile` seat claim. Dead "create account" / "forgot
password" links removed. If the backend can't be reached the player is *told* and trains
offline instead of silently thinking they're connected.

Settings → Security now explains the real model: the seat is held by the device, and losing
it in a capped season matters.

### 9 · THE EYE + MetaBot — documented honestly ✅
- **THE EYE:** the native Android module genuinely isn't in this repo. It already degrades to
  manual logging; I've documented the exact 4 pieces needed to light it up (native module,
  foreground service, manifest permissions, config plugin) at the top of `matchWatcher.ts`.
- **MetaBot:** the scheduler is written and ready at
  `metabot/scheduled-github-action.example.yml` (daily 08:00 UTC, least-privilege
  `contents: write`, concurrency guard, manual run button). It only writes *pending* findings —
  nothing reaches a player until you approve it.
  **One command from you to activate it** — GitHub refuses to let an app create workflow files:
  ```bash
  mkdir -p .github/workflows
  cp metabot/scheduled-github-action.example.yml .github/workflows/metabot.yml
  git add .github/workflows/metabot.yml && git commit -m "ci: enable metabot" && git push
  ```
- **The 2-lessons-for-6-stages problem no longer blocks anyone:** since the scan grades
  objectives rather than lessons, stages 3–6 are fully playable while the tape is still being
  cut. The coach's copy now says so instead of implying the player should wait.

---

## Housekeeping

- Version **1.0.0 → 1.3.0** (`app.json` + `package.json`; `versionCode` 3, `buildNumber` 3)
- `react-native-worklets@0.10.3` added as a direct dep (Reanimated 4 requires it; doctor flagged
  it as a crash risk outside Expo Go)
- `eas-cli` removed from devDependencies (use `npx eas`)
- Scripts added: `typecheck`, `test`, `doctor`
- **LICENSE replaced** — it was Expo's MIT template crediting *650 Industries*. Now a
  proprietary all-rights-reserved notice naming you, matching private enterprise distribution
- `tests/live-backend.test.mjs` — a 20-assertion battery against the live project (seats, RLS,
  vault idempotence, forged-founder rejection, founder-key enforcement). Run it from a machine
  with normal network access: `node tests/live-backend.test.mjs`

---

## Season One is intact

The 1,000-seat cap is enforced where it should be — in the database, not in a promise:

- `config.seat_cap = 1000`, counted by `season_seats()`, which **excludes** the `PSA-FOUNDER`
  row so your own seat never eats a player's
- `ensure-profile` counts before it inserts, so a seat can't be over-sold; overflow goes to
  `waitlist` with a 409 `SEASON_FULL`
- The app shows the SEASON FULL panel + waitlist note and **still lets them train solo** —
  vault, journey and scans all work offline
- Re-entry is idempotent: the same device reclaims its existing seat instead of burning a new one

Progress being saved per-player is what makes the cap do its real job — you can now actually
track and coach the 1,000, which was the reason for the limit in the first place.

---

## What I could not verify from here

The sandbox blocks direct outbound HTTPS from Node (I proxied the read-only checks above, which
is how I confirmed your schema, seats, RLS and functions). Two things need one run from your
machine:

1. **`node tests/live-backend.test.mjs`** — proves anonymous sign-in → seat claim → vault
   round-trip → forged-founder rejection end to end. Expect `20 passed · 0 failed`.
2. **`FOUNDER_KEY`** — I couldn't test the Founder Desk unlock without your key. Confirm it's set
   under Edge Functions → Secrets, then tap version ×5 and paste it.

## Suggested next

- Sideload a build and confirm: pass a stage → force-quit → reopen → **stage still cleared, XP
  still banked**. That's the fix you asked for, and it's the one worth seeing with your own eyes.
- Two devices in `#general` at once to watch realtime fan-out.
- `npx expo prebuild` when you want the native `android/` project back — and **find and back up
  the upload keystore** (`proseason-upload.keystore`) before that, since it isn't in this repo.
