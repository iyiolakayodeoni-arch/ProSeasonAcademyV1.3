# ProSeasonAcademy V1.3 — Repository Audit

**Audited:** 28 July 2026 · **Commit:** `d095733` (first commit) · **Branch:** `arena/019fa755-proseasonacademyv1-3`

This is an independent read of what is *actually in the code*, how it runs, and exactly
what stands between this repo and a live app. Where the code and `PROJECT_STATUS.md`
disagree, this document reports **the code**.

---

## 1 · What is in the repository

| Area | Files | Lines | State |
|---|---|---|---|
| **Expo/React Native app** (`App.tsx`, `src/`, `index.ts`) | 45 | ~13,600 | Builds clean, typechecks clean |
| **Supabase backend** (`supabase/`) | 12 | ~950 | Written, **never deployed** |
| **Custom Node server** (`server/`) | 8 | ~1,900 | Kept as the proven ₦0 fallback |
| **MetaBot scout pipeline** (`metabot/`) | 21 | ~1,400 | Runs locally, no scheduler installed |
| **Docs** (5 markdown files) | 5 | ~980 | Detailed but drifted from code |
| **Assets** | 9 PNG/JPG | 5.1 MB | Icons + coach portraits |
| **Tests** | 1 | 300 | `tests/frameAnalysis.test.js` — 7/7 pass |

Breakdown of the app: **19 screens** (14 + 5 tabs), **9 components**, **17 data modules**,
**4 hooks**, **7 edge functions**.

### Verified working right now

```
npm install          ✅  915 packages, no errors
npx tsc --noEmit     ✅  zero type errors
npx expo export      ✅  bundles to 2 MB (714 modules), web build succeeds
node tests/...       ✅  ALL WATCHER FRAME TESTS PASS (7/7)
```

The app compiles and runs. This is real, working software — not a skeleton.

---

## 2 · How it actually works

### The architecture in one picture

```
PHONE (Expo / React Native 0.86, Expo SDK 57)
  │
  ├─ App.tsx  ── phase-state routing (NO react-navigation; plain useState)
  │     splash → signin → coach → intro → scan → hear → setup → hub
  │
  ├─ MainScreen ── crest + 4 tabs (Home / Journey / Community / Settings)
  │     └─ tap a journey node → CoachingScreen "blooms" full-screen
  │
  ├─ src/data/*.ts ── every store is the same hand-rolled pattern:
  │     module-level `state` + Set<listener> + useSyncExternalStore
  │     (no Redux/Zustand; 6 of 7 stores persist to AsyncStorage)
  │
  ├─ src/data/liveFeed.json ── MetaBot's export, bundled at build time
  │     coaching.ts reads it → resolveStageLesson() picks the newest
  │     unused fresh lesson per stage → the film room teaches it
  │
  └─ src/data/backend.ts ── THE SEAM. The only file that knows the backend.
        supabaseClient.ts returns `null` when env vars are blank
        → every call fails soft → app runs 100% offline
```

### The backend seam (the good design decision in this repo)

`src/config.ts` reads two env vars at build time:

```ts
PSA_SUPABASE_URL      = process.env.EXPO_PUBLIC_PSA_SUPABASE_URL ?? ''
PSA_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_PSA_SUPABASE_ANON_KEY ?? ''
```

Both are blank today → `supabase` client is `null` → `SUPABASE_READY === false`
→ every one of the ~20 backend functions returns `null`/`false` instead of throwing.

**This is why the app "works" today and why it is not live.** It is running in
permanent offline mode by default, and nothing in the UI tells you that.

### The Supabase design (written, not deployed)

- **9 tables**: `profiles`, `waitlist`, `matches`, `channels`, `messages`, `wallets`, `ledger`, `products`, `config`
- **RLS everywhere** — players read their own rows; `kind='founder'` is rejected by the *database*, so the founder badge can't be faked from a phone
- **6 RPCs**: `season_seats`, `till_topup`, `till_plan`, `till_spend`, `toggle_reaction`, `admin_rollup`
- **6 edge functions** + 2 shared helpers, all guarded by an `x-founder-key` header
- **Season One gate**: `seat_cap = 1000` enforced in `ensure-profile`; overflow → `waitlist` + HTTP 409 `SEASON_FULL`
- Verified against local PostgreSQL 17 with auth stubs (per the docs) — but **never against a real Supabase project**

---

## 3 · 🔴 Blockers — the app cannot go live until these are fixed

### 3.1 No backend exists yet (the headline blocker)

The entire Supabase project is unbuilt. `console-steps.md` documents the 6 clicks;
none have been done. Until a project exists and its URL + anon key are baked into a
build, there is **no cloud, no accounts, no community, no till, no founder desk**.

**One gap in `console-steps.md`:** it never says to enable **Anonymous Sign-Ins**
(Dashboard → Authentication → Sign In / Providers). The whole auth model is
`supabase.auth.signInAnonymously()`, and that setting is **off by default**. Without it,
every sign-in fails silently and the app just looks offline forever.

### 3.2 Five finished screens are unreachable — 2,143 lines of dead code

I searched every `.ts`/`.tsx` in the repo. These files are never imported by anything:

| Screen | Lines | What the user loses |
|---|---|---|
| `MatchVault.tsx` | 712 | The whole match ledger + THE EYE autopilot card |
| `StageScanSheet.tsx` | 576 | **STAGE MATCH SCAN v2** — the entire scan ritual |
| `FounderDesk.tsx` | 364 | Your admin GUI, broadcasts, money controls |
| `LossJournal.tsx` | 266 | The loss journal |
| `StoreSheet.tsx` | 225 | THE TILL |

`PROJECT_STATUS.md` §2.13, §2.14, §2.20, §2.22, §2.23 describe all of these as shipped
and E2E-green. The components exist and typecheck — but there is **no button anywhere in
the app that opens them**. `SettingsTab` has a "Loss Journal" *toggle*, not a link.

There is also no `Settings → tap VERSION ×5 → ADMIN ACCESS` handler (§2.22): the version
string at `SettingsTab.tsx:380` is a plain `<Text>` with no press handler. **The Founder
Desk has no door.**

### 3.3 Nothing calls `initCloudSync()`

`src/data/cloudSync.ts` exports the boot routine that probes health, signs in, pulls the
vault, pushes the outbox and re-probes every 30s. **It is never called** — not in
`App.tsx`, not in `MainScreen`, nowhere. Even with valid Supabase keys, cloud sync never
starts. The only backend call the running app makes is `ensureAuth()` from the Sign In
button.

Same for the community: `joinRoom`, `sendRoomMessage`, `pullMessages`, `listChannels`,
`postMessage` are all implemented in `backend.ts` and **called by nothing**. `CommunityTab`
imports `backend` only to read `getSeasonGate()`. Live chat today is
`startMockTraffic(coach)` — scripted bots.

### 3.4 Progress is not saved

`src/data/progress.ts` is 74 lines of pure in-memory state. Line 8 still says
`TODO(real-persistence): hydrate + persist via AsyncStorage`. Zero `AsyncStorage` calls.

Every stage cleared, all XP and every badge **vanish when the app is closed.**
(`PROJECT_STATUS.md` §2.8 claims this was verified working with a force-quit test — the
code does not support that claim.)

The coach lock is also unsaved: `App.tsx` holds `coachId` in `useState` and always boots to
`route = 'signin'`. So every cold start = Sign In → pick a coach again → coach intro →
**the full 5-match Baseline Scan interview again.** The "permanent" coach lock lasts one session.

### 3.5 The stage Match Scan always passes

`src/hooks/useMatchScan.ts` → `mockScanResult()` hard-codes `met: true` on every target and
returns `passed: true`. `CoachingScreen` calls it on a 2.8s timer, then fires
`recordStagePass()`. So the CTA "GO PLAY — START THE SCAN" waits 2.8 seconds and grants the
stage. Nobody has to play a match.

The real grading logic (`objectiveCount()` in `matches.ts`, 9 machine-readable check kinds)
exists and is correct — but **no screen calls it**. `MainScreen` passes
`liveResult={null}` with a `TODO(real-match-scan)` comment.

### 3.6 Journey objectives are frozen at 0

Every objective in `journey.ts` is `{ ..., done: 0, check: {...} }`. `JourneyTab` renders
`o.done` directly. Nothing ever recomputes `done` from the vault. So every objective reads
`0/2` forever, even after wins.

### 3.7 THE EYE has no native module

`src/data/matchWatcher.ts` does `NativeModules.MatchWatcher` on Android. There is **no
Kotlin, no Java, no config plugin, and no `android/` folder** in this repo. So
`watcherNativeAvailable` is always `false`, and automatic goal detection can never arm.

The pure logic (`frameAnalysis.ts` + its 7 passing tests) is genuinely good — it just has
nothing feeding it pixels.

### 3.8 Only 2 lessons exist for 6 stages

`src/data/liveFeed.json` has 5 posts; only **2** are lesson-bearing kinds
(`SKILL_MOVE`, `EXPLOIT`) with a `lesson` block. `resolveStageLesson()` assigns each stage a
*distinct unused* item — so **stages 3–6 will always show the "coach is prepping today's
mechanic" empty state.** The data is also from 24 July (4 days stale) and
`metabot/scheduled-github-action.example.yml` was never copied to `.github/workflows/`
(the folder doesn't exist).

### 3.9 Auth is a console.log stub

`src/hooks/useAuth.ts` — `handleSignIn`, `handleCreateAccount`, `handleForgotPassword` all
just `console.log` and `await` a 900ms fake delay. Email/username/password are collected,
validated by nothing, and **discarded**. "CREATE ACCOUNT" and "FORGOT PASSWORD" do nothing.

That's arguably fine *if* the anonymous-auth model is the real plan (per
`SUPABASE_MIGRATION.md` §2) — but then the password field shouldn't be on screen, and the
Sign In button shouldn't be gated on nothing. Right now a user can tap SIGN IN with three
empty fields and get straight in.

---

## 4 · 🟠 Release-mechanics gaps (nothing to do with features)

| # | Gap | Detail |
|---|---|---|
| 1 | **No `android/` or `ios/` folder** | `.gitignore` excludes `/android` + `/ios`. `RELEASE_CHECKLIST.md` points at `android/app/proseason-upload.keystore` — **it is not in this repo.** If that keystore is only in an old zip, back it up *today*: lose it and you can never update the Play listing. |
| 2 | **No EAS project ID** | `app.json` has no `extra.eas.projectId`. `npx eas init` is required before any cloud build. |
| 3 | **No env plumbing** | No root `.env.example`. `.gitignore` covers `.env*.local` but **not** `.env` — a real `.env` would be committed. |
| 4 | **Missing peer dep** | `react-native-worklets` isn't in `package.json` (works transitively via expo, but `expo-doctor` flags it: *"your app may crash outside Expo Go"*). |
| 5 | **`eas-cli` in devDependencies** | `expo-doctor` flags this; use `npx eas` instead. |
| 6 | **Version drift** | Docs say v1.2.0 / v1.3; `app.json` and `package.json` both say `1.0.0`, `versionCode: 1`, `buildNumber: "1"`. |
| 7 | **LICENSE is wrong** | It's Expo's template: *"Copyright (c) 2015-present 650 Industries, Inc."* — not yours. |
| 8 | **No README** | Nothing tells a new machine how to run this. |
| 9 | **No CI** | No `.github/` at all — no typecheck, no test run on push. |
| 10 | **favicon is 48×48, 147 bytes** | Effectively a blank placeholder. |
| 11 | **Coach card PNGs are 1.6 MB each** | ~5 MB of the 5.1 MB asset budget; worth compressing before store builds. |

### Store submission — still entirely outstanding

- **Privacy policy URL** — mandatory for both stores. Doesn't exist.
- **Google Play**: $25 account, then — for a *new personal* account — **12 opted-in testers
  actively using the app for 14 consecutive days** in closed testing before you can even
  apply for production access [1](https://primetestlab.com/blog/google-play-12-testers-closed-testing-guide)[2](https://medium.com/@kefayatkhadem/google-play-closed-testing-in-2026-the-full-path-from-12-testers-to-production-access-1f48b7833671). Organization accounts are exempt. **Budget 3+ weeks for
  Android alone.** Plus: Data Safety form, content rating questionnaire, feature graphic
  (1024×500), screenshots.
- **Apple**: $99/yr, App Store Connect app record, export compliance, review notes, and a
  **demo account** (Apple reviewers must be able to see past your sign-in).

---

## 5 · 🟢 What's genuinely strong

- **The backend seam is real.** `backend.ts` was rewritten from custom-server to Supabase
  while keeping every export name. `FounderDesk`, `StoreSheet` and `cloudSync` never had to
  change. That's disciplined architecture and it will keep paying off.
- **Fail-soft everywhere.** Every backend call is wrapped in try/catch returning
  `null`/`false`. A dead network degrades the app instead of crashing it.
- **The SQL is careful.** Idempotent (`if not exists`, `on conflict do nothing`), RLS on
  every table, service-role-only grants on money RPCs, `till_spend` as a self-resolving
  atomic guard, founder-row excluded from seat counts. Two real bugs were already found and
  fixed against local Postgres.
- **`frameAnalysis.ts`** is pure, dependency-free, and properly unit-tested (reference-frame
  blending for lighting drift, cooldowns, flash rejection). Good code.
- **Zero dependency bloat** — 13 runtime deps, all Expo-canonical. No secrets committed.
- **The writing.** `console-steps.md` explains a Supabase setup to a non-technical founder
  better than most paid onboarding docs.

---

## 6 · The order I'd fix things

**Phase 1 — make the app honest (code only, no accounts needed, ~1–2 days)**

1. Persist `progress.ts` to AsyncStorage (copy the exact pattern from `matches.ts`).
2. Persist the coach lock + onboarding completion; boot straight to `hub` for returning players.
3. Wire the 5 orphaned screens to real entry points:
   - Journey tab → MATCH VAULT + LOSS JOURNAL cards
   - CoachingScreen scan CTA → `StageScanSheet` (replaces the fake `useMatchScan`)
   - Community tab → TILL chip → `StoreSheet`
   - Settings → version ×5 tap counter → admin key sheet → `FounderDesk`
4. Call `objectiveCount()` from `JourneyTab` so objectives count real matches.
5. Delete or hide the password field until real password auth exists.

**Phase 2 — turn the cloud on (~1 day, needs you at a browser)**

6. Do `console-steps.md` — **and enable Anonymous Sign-Ins**, which the doc omits.
7. Add a root `.env.example`; add `.env` to `.gitignore`.
8. Call `initCloudSync()` on app boot; wire `CommunityTab` to `joinRoom`/`sendRoomMessage`.
9. Run the E2E battery against the real project, including a forced `seat_cap=2` to prove
   the SEASON_FULL path.

**Phase 3 — ship it (~3–4 weeks, mostly waiting on Google)**

10. `npx eas init`, bump version to 1.3.0, `npx expo prebuild`, re-add the native
    MatchWatcher module (or ship v1 without THE EYE and let the vault stay manual).
11. **Locate and back up the upload keystore** before anything else.
12. Privacy policy, listing copy, screenshots, Data Safety, content rating.
13. Play Console → internal testing → 12 testers × 14 days → production access.

**Phase 4 — content**

14. Install the MetaBot GitHub Action so `liveFeed.json` refreshes itself; you need **at
    least 6 lesson-bearing approved items** before all six stages can teach anything.

---

## 7 · One-line answer

> The app is a well-architected, cleanly-compiling Expo project with roughly 80% of a real
> product inside it — but it is **not live and cannot go live today**, because the backend
> was never created, five finished screens have no way to be opened, and player progress
> isn't saved. None of that is a rewrite; it's roughly two days of wiring plus a browser
> session, and then the Play Store's 14-day testing clock.
