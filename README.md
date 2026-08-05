# ⚽ ProSeasonAcademy

**Onliversity's ProSeasonAcademy — Pro Season, the EA SPORTS FC 26/27 Console Pro development programme.**

**Version 1.3.0** · `com.onliversity.proseasonacademy` · Expo SDK 57 / React Native 0.86 · Android APK (private distribution — deliberately not on any public store)

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
1. **Record & Watch:** Record your console match as usual (PS Share / Xbox Capture / capture card or phone recording) and watch your tape back.
2. **Pen to Paper Before You Type:** *"There is a special connection a biro has to a book that cannot be typed."* Write down your key moments, unusual events, and answers on paper with a biro first.
3. **24–30 Minute Cool-Down:** Let your head settle and cool down for 24–30 minutes after full time before opening the app.
4. **Log to Database:** Type your penned truth into the Academy database.
5. **The 7-Day Cadence:** Days 1–3 build momentum with Matches 1, 2, and 3; Day 4 is Rest Day 1 (mid-week rest & reflection, no match played); Day 5 is Match 4; Day 6 is Rest Day 2 (pre-finale rest & preparation, no match played); Day 7 is Match 5 (The Finale) & Profile Card seal.
6. **The Philosophy:** *"In a world where everyone is looking for the easy way out, we tell you that the hard way is the easy way, and the easy way is the hard way. Do things the right way. Tech is meant to elevate and not make you dormant. That is the Chinedu Way."*

**Private enterprise software.** Distributed inside the Onliversity ecosystem — its own
**Package Manager** companion app (`onliversity-pm/`) plus direct APK sideload — never on any
public app store. **Season One is capped at 1,000 seats**, enforced in the database, so coaching
stays personal and every member can actually be tracked and spoken to.

---

## What's new in v1.3 — current state of the app

The programme shipped in stages; this is where it stands today (see `PROJECT_STATUS.md` for
the full build ledger, entry by entry):

- **One Journey, The Standard, the Mirror Session** *(01 Aug 2026)* — the two coach-specific
  fictional roads (Ashfault Ascent / Merehaven Way) were retired as *curriculum*. Every member
  now walks the same six development chapters; the coach stays the voice, not the syllabus.
  The Mirror Session replaced the old Match Scan as the **main quest** ritual (the legacy scan
  survives as the quick path), and **The Standard** runs beside the journey as the reveal-as-you-advance
  benchmark. See `MIRROR_DIRECTION.md`.
- **The Baseline Week** *(01 Aug 2026)* — the old 5-match Baseline Scan became an honest
  7-day gate: one match a day, watch the tape, name the moments you failed, analyse each in
  your own words, a 24-hour gap between days (lateness never punished), Day 6 reflection,
  Day 7 ambition + sealed profile card. A one-time **Week Orientation** handshake precedes it,
  and each day's unlock is scheduled as a local notification.
- **Academy Tour rewrite** *(01 Aug 2026)* — the first-run tutorial now teaches the current
  product (the road, The Standard, the Mirror, The Thread, the vault, the till), and is
  replayable anytime from Settings → Help & support → TOUR THE ACADEMY.
- **The Honesty Guard & Coach Audit** *(04 Aug 2026)* — because the app refuses AI for the
  player's psychology and can't read minds, every typed reflection is now checked by
  `src/data/honestyGuard.ts`: keyboard mashing, gibberish, evasive filler ("idk", "nothing"),
  repeated spam, and copy-pasted prompts are rejected in the coach's own voice, while
  substantive reflections earn a green **HONEST LEDGER** verification. Enforced at every
  submission gate (Mirror Session, Baseline Week, Stage Scan, Loss Journal, Match Vault,
  Community, Contact) with live `HonestyBadge` feedback under every text box.
- **The v14 platform — real accounts, announcements, news, push, location pricing**
  *(05 Aug 2026)* — anonymous sessions are gone: members now register with **email + academy
  name + password** through the `auth-register` / `auth-login` / `auth-reset` / `auth-delete`
  edge functions (open registration, up to the 1,000-seat cap; the academy ID token is shown
  exactly once at sign-up). Founder announcements reach the Home feed with read state
  (`founder_announcements`), MetaBot findings land in `news_drafts` for founder approval and
  surface as **FC 26/27 CONSOLE NEWS**, Expo push tokens register into `push_tokens` and are
  drained by the `push-dispatch` cron, and pricing became **location-aware**: the ₦ naira
  shelf is **Nigeria-only** (soft IP verify, founder override on the Desk) — every other
  country, including the rest of Africa, sees the world shelf. The till stays closed until
  the founder opens it from the Desk. Full rollout steps in `DEPLOY_V14.md`.
- **Onliversity Package Manager + two-lane releases** *(05 Aug 2026)* — a private app-store
  companion (`onliversity-pm/`) that reads one catalog manifest and installs/updates every
  Onliversity app through the Android system installer (every install is one honest tap —
  silent install is impossible, and the PM walks the user through Android 13+'s Restricted
  Settings trap). PSA deep-links updates into the PM (`src/data/packageManager.ts`,
  `onliversitypm://update?app=proseasonacademy`) and falls back to the direct APK when the
  PM isn't installed; CI (`docs/release-onliversity.yml` + `scripts/publish-onliversity.mjs`)
  builds the APK, uploads it to Supabase Storage, bumps the catalog and the `config` update
  rows in one push. Pure-JS fixes ship instantly over the second lane — Expo Updates OTA.
  See `RELEASE_PIPELINE.md` and `ONLIVERSITY_PM.md`.
- **Season One money path, live in the database** — regional pricing is seeded and enforced:
  **Nigeria** pays in naira credit packs (₦3,900 / ₦7,800 / ₦25,000, a deliberate subsidy
  versus world prices), the rest of the world pays GBP subscriptions (£7.99 / £15.99 / £47.99).
  The price is computed **by Postgres at checkout**, never by the phone, and every charge
  leaves in **GBP** (PayPal cannot take naira directly — the member is shown both figures and
  told plainly which one leaves their account). Doors: card (Stripe), PayPal where
  configured (and a PayPal-only mode — `paypal-only.sql`), OPay manual
  transfer with holder-name verification, and a one-tap "talk to me" rescue path. See
  `WHERE_WE_ARE.md`, `PAYMENTS.md`, `STRIPE_SETUP.md`, `PAYPAL_SETUP.md`.
- **Benchmark Tracker + stats-screen OCR** — the player's six-month record is built backward
  from evidence: each checkpoint is a 7-match batch of post-match stats screens. Screenshots
  are the proof; on-device OCR (`tesseract.js`) reads the numbers, and the record syncs to
  the cloud when there's signal.

---

## The member's path, screen by screen

1. **Splash → Sign In** — real accounts inside the app: email + academy name + password
   (register / login / reset), the academy ID token shown once at sign-up, and the 11-chip
   country picker that sets the pricing shelf — Nigeria unlocks the naira credit packs,
   everywhere else sees the world subscriptions. A built-in **Sideload Assistant** walks
   anyone through "allow unknown apps" so nobody drops off at the door.
2. **Coach Selection — the courtroom** — both coaches pitch in a one-way chat, banter and
   scout files included, then **"I'M WITH COACH X" → LOCK IT IN**. Permanent by design.
3. **Coach Intro → Week Orientation → Baseline Week** — the coach's backstory in his voice,
   the 30-second handshake on the seven days ahead, then the gate itself (§ What's new).
4. **The Journey tab** — your six chapters with live objectives graded from the vault, beside
   **The Standard** panel revealing the elite benchmark chapter by chapter. Role Model card of
   your coach sits above the map; tap it to bloom into today's stage room.
5. **The stage room (film room)** — the coach briefs you, the MetaBot-fed lesson of the day
   lands, and the **Mirror Session** opens as the main quest; completed sessions grade the
   stage immediately from the evidence.
6. **Match Vault & Loss Journal** — every match logged in ~15 seconds (honor-system ingest;
   EA exposes no official feed), one line per loss with cause chips and a coach acknowledgment.
7. **Community — the halls** — `#general`, `#wins`, `#losses` plus read-only coach channels,
   DMs, reactions, typing, find-a-squad, live over Supabase Realtime with presence.
8. **The Till & Founder Desk** — seats, plans, credits and the founder's command centre
   (unlock: Settings → tap VERSION ×5 → paste the admin key). The till stays closed until
   the founder opens it; "CARD REFUSED — THEY WANT TO PAY" sits above everything else.

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
| `npm test` | offline suites: mirror session · baseline week · benchmark tracker · stats OCR · gradle deprecations · honesty guard |
| `npm run test:live` / `test:register` | live-backend batteries against the real Supabase project |
| `npm run doctor` | `expo-doctor` project health |
| `npm run fix:gradle` | re-applies the Gradle-9 deprecation fixes (also runs on `postinstall`) |
| `npx eas build --platform android --profile production` | **signed APK** → see `BUILD.md` |

Local runs read `.env` (gitignored). Copy `.env.example` and fill in
`EXPO_PUBLIC_PSA_SUPABASE_URL` + `EXPO_PUBLIC_PSA_SUPABASE_ANON_KEY` (and optionally the
`EXPO_PUBLIC_PSA_OCR_URL` OCR host). Cloud builds read them from `eas.json` instead — both
are needed. `BUILD.md` explains why.

---

## Storybook (dev)

A minimal story scaffolding is included for the new StatRing component.

To run Storybook locally (React Native / Expo):

1. Install Storybook dev dependencies locally: `npm install --save-dev @storybook/react-native @storybook/addon-essentials`
2. Create a `.storybook/main.js` with the sample config and follow the React Native Storybook guide: https://storybook.js.org/docs/react-native/get-started/introduction
3. Open `src/components/StatRing.stories.tsx` to preview examples.

Note: the repo intentionally does not add Storybook packages automatically. The project now includes minimal Storybook devDependencies and runnable scripts for web preview. To use native RN Storybook you must follow the React Native Storybook guide and wire the Storybook entrypoint into the app (instructions below).

To run Storybook (web preview):
1. npm install
2. npm run storybook

To enable React Native Storybook (native/dev-client): follow https://storybook.js.org/docs/react-native/get-started/introduction — then run the app using the Storybook entrypoint or a dev client.

---

## Architecture

```
PHONE — Expo SDK 57 / React Native 0.86
  │
  ├─ App.tsx ............ phase routing; restores the saved session during the splash
  ├─ src/screens/ ....... 27 screens + tab shell (Home / Journey / Community / Settings)
  ├─ src/components/ .... 26 SVG/Skia components
  ├─ src/data/ .......... 40 modules — stores + state machines via useSyncExternalStore,
  │                       persisted to AsyncStorage, offline-first throughout
  └─ src/data/backend.ts  THE SEAM — the only file that knows the backend
        │
        ▼
SUPABASE  ymnkphqgjxexsnbgtqvk  ← the one live backend
  ├─ Accounts ......... email + academy name + password via the auth-* functions
  │                     (register / login / reset / delete); open registration up
  │                     to the seat cap. ensure-profile survives as the legacy gate
  ├─ Postgres ......... profiles · matches · channels · messages · wallets · ledger ·
  │                     products · tiers · entitlements · config · waitlist · strikes ·
  │                     flagged_messages · contact_messages · consult_questions/answers ·
  │                     fx_rates · pay_methods · payment_claims · benchmark_checkpoints ·
  │                     founder_announcements · announcement_reads · news_drafts ·
  │                     push_tokens · notification_queue · tos · notice_log · audit_log
  │                     · banned_terms · pack_items · unlocks  (~31 tables, ~66 functions)
  ├─ RLS .............. players touch only their own rows; a forged
  │                     founder message is rejected by the database
  ├─ Realtime ......... live rooms from message INSERTs + presence
  └─ Edge Functions ... 16 — auth-register/login/reset/delete · ensure-profile (seat
                        gate, legacy) · geo-verify · push-dispatch · pay-start ·
                        pay-webhook · refresh-fx · till-topup · till-subscribe ·
                        founder-desk · founder-broadcast · admin-summary · health
```

**`server/` is a backup only.** A complete self-hosted Node/SQLite backend, kept as a proven
₦0 escape hatch and as the behavioural map of what the database must do. Nothing in the app
imports it. ⚠️ It does **not** implement the 1,000-seat gate — read `server/DEPLOYMENT.md`
and `server/SWITCHING.md` before ever switching to it.

**`metabot/`** is the scout: a keyless Node pipeline that reads EA news, YouTube, RSS and
guide sites, composes lesson candidates, and waits for **your approval** before anything
reaches a player. `npm run export` writes `src/data/liveFeed.json` (feeds the Home feed, the
stage-room mechanic lessons and the Side Quests) **and** upserts the same candidates into
`news_drafts`, where the founder approves them in the Desk before they appear on Home as
**FC 26/27 CONSOLE NEWS** — nothing auto-publishes, ever.

**`onliversity-pm/`** is the private app store: a companion Expo app
(`com.onliversity.packagemanager`) that reads one catalog manifest
(`onliversity-catalog.json` in the public `onliversity` Storage bucket), shows update state
per app, and installs via the Android system installer — SHA-256 verified, one honest tap,
with a first-run walkthrough for Android 13+ Restricted Settings. PSA deep-links into it for
updates and falls back to the direct APK when it isn't installed. Design + hard truths in
`ONLIVERSITY_PM.md`.

**`supabase/`** is the database brain under version control: `schema.sql` plus the ordered
migrations (seat gate, security, packs, tiers, access, consult, enforcement, notices,
FX ×3, Stripe, PayPal-only, rescue, claims, benchmark tracker, FINISH_PAYMENTS, update
system), `RUN_ALL.sql` to apply them in one paste, **`v14-platform.sql`** on top (accounts,
announcements, news drafts, push, location pricing — see `DEPLOY_V14.md`), the 16 edge
functions, and a test battery. `GO_LIVE.md` and `console-steps.md` walk the dashboard clicks.

**`src/audio/`** is the academy's ear. `sound.ts` owns every noise the app makes: short UI
sounds (bubble pops, the referee whistle at lock-in and stage pass, the till), the 24-second
night-stadium pad that breathes under the home tab, and the two **real coach voice notes**
that play in the briefing room. Every asset is generated in-repo, never licensed —
`python3 scripts/make-sounds.py` re-synthesises the whole pack in `assets/sounds/`. Two
toggles (MUSIC / SOUND FX) live in Settings → SOUND and persist with the other preferences.

**Console capture is external by design.** Record matches using PS Share, Xbox Capture, a capture card, or phone recording. The app never captures your screen, watches the match, or generates your key moments; you review your own tape and enter the evidence manually.

---

## Honesty as a system

The programme's rule — *"The app records the evidence; it never does your thinking for you"* —
is enforced in three layers:

1. **No AI for psychology.** Nothing generates reflections, picks your key moments, or writes
   your lessons.
2. **The Honesty Guard.** `src/data/honestyGuard.ts` rejects keyboard mash, gibberish,
   evasive filler, repetitive spam and copied prompts at every submission gate, with
   coach-voiced live feedback (`HonestyBadge`) and 8 unit tests in `tests/honestyGuard.test.js`.
3. **Evidence-based grading.** Stages clear only when machine-checkable objectives are met by
   real vault entries (wins, pass accuracy, composure, thread lessons, journal lines…) — never
   by opening a screen or pressing a button.

---

## Season One — the 1,000-seat gate & the money

Enforced where it can't be fudged, in Postgres:

- `config.seat_cap = 1000`, counted by `season_seats()`, which **excludes** the
  `PSA-FOUNDER` row so your own seat never consumes a member's
- `ensure-profile` counts **before** inserting, and a trigger closes the remaining hole
  (no signed-in device can mint its own seat via REST) — see `SEAT_CAP.md`
- Overflow → `waitlist` table + HTTP 409 `SEASON_FULL`; the app shows the waitlist panel and
  **still lets them train solo** (vault, journey and scans all work offline)
- Re-entry is idempotent — a returning device reclaims its existing seat

Opening Season Two later is one SQL `update` to `seat_cap`.

**Lifecycle:** 14-day trial → pay or out · 3-day grace after expiry so a slow payment never
locks out someone who paid · lapsed 30 days → seat released to the waitlist · three strikes
on conduct, with flagged messages reviewed by the founder before anything serious happens ·
terms shown before anything else (`TermsSheet`, `LapsedGate`).

**Payments:** the price is computed by the database at checkout — a tampered app cannot buy
PRO for a penny — and every grant flows through one `grant_tier` path, one audit trail.
Doors: card (Stripe webhook), PayPal where configured, OPay manual transfer verified against
the registered holder name, and a one-tap rescue that sends the founder the member's ID,
product and price.
The naira shelf is **Nigeria-only** (`pricing_region_for` + `geo-verify`, founder override
on the Desk), and every charge leaves in GBP with the ₦ headline shown beside it. Setup
docs: `STRIPE_SETUP.md`, `PAYPAL_SETUP.md`, `NIGERIA_PAYMENTS.md`, `MERCHANT_ACCOUNTS.md`,
`PAYMENT_OPTIONS.md`.

---

## How a member's data is kept

| Store | Key | Holds |
|---|---|---|
| progress | `psa.progress.v1.<user>.<coachId>` | stages cleared, XP, badges, lesson refs |
| session | `psa.session.v1` | signed-in, **the permanent coach lock**, intro, orientation, baseline |
| settings | `psa.settings.v1` | name, country/region, platform, toggles |
| baseline | `psa.baseline.v1` | the Baseline Week schedule, seals, moments, profile card |
| mirror | `psa.mirror.v1` | Mirror Session state: intentions, checkpoints, moments, reviews |
| thread | `psa.thread.v1` | the sworn lessons and how they held or broke |
| vault | `psa.match-vault.v1` | every logged match (graded by the scan) |
| journal | `psa.loss-journal.v1` | loss-journal lines |
| benchmark | `psa.benchmark-tracker.v1` | six-month record: 7-match checkpoints + stats screens |
| academy token | `psa.academy.token.v1` | the one-time sign-up token cache |
| announcements | `psa.announcements.read.v1` | which founder posts were read |
| cloud sync | `psa.cloud.handle.v1` · `.outbox.v1` · `.token.v1` | device handle, queued writes, cloud session |
| onboarding | `psa.onboarding.done.v1` | the tour flag (reset by Delete Account) |
| push | `psa.push.token.v1` · `.quiet.v1` | Expo push token + quiet hours |
| canned replies | `psa.canned-replies.v1` | the founder's saved answers |

Progress is keyed **per coach**, so the two journeys can never contaminate each other, and it
survives a force-quit. The vault syncs to Supabase when there's signal and queues in an
outbox when there isn't — the app is offline-first throughout.

---

## Shipping updates (no public store, by design)

Two lanes, founder-controlled end to end (full picture in `RELEASE_PIPELINE.md`):

1. **Full APK release** — push to `main` (or tag `v*`) → GitHub Actions
   (`docs/release-onliversity.yml`) builds the signed APK via EAS →
   `scripts/publish-onliversity.mjs` uploads it to the public `onliversity` Storage bucket,
   upserts the PM catalog, and bumps the `config` rows (`latest_version`, `latest_apk_url`,
   `latest_update_note`). Every installed app checks those rows on boot: the amber
   UPDATE AVAILABLE banner appears, deep-links into the **Onliversity PM** when it's
   installed (`onliversitypm://update?app=proseasonacademy`), and falls back to the direct
   APK download otherwise. Members always tap INSTALL once — that's Android, not us.
2. **JS OTA lane** — for pure-JavaScript fixes, Expo Updates pushes a new bundle that
   applies on next launch. No download, no install prompt.

The manual path still works without CI: `eas build` → upload the APK to GitHub Releases →
set the two `config` rows by hand (`UPDATE_SYSTEM.md`). `BUILD.md` covers signing and
builds; `GRADLE9_DEPRECATIONS.md` keeps the native build ahead of Gradle 9 (enforced by a
test and a `postinstall` fixer); `ONLIVERSITY_PM.md` documents the store app itself.

---

## Documentation

| File | What it's for |
|---|---|
| **`BUILD.md`** | how to build and hand out the APK ← start here |
| **`MIRROR_DIRECTION.md`** | the applied product direction: one Journey, The Standard, the Mirror Session |
| `WHERE_WE_ARE.md` | the honest audit — what is live in the database right now, what's left |
| `PROJECT_STATUS.md` | the long feature ledger, screen by screen, with the changelog |
| `DEPLOY_V14.md` | the v14 platform rollout: accounts, announcements, news, push, location pricing |
| `RELEASE_PIPELINE.md` | the two-lane release system: CI → Package Manager, and Expo Updates OTA |
| `ONLIVERSITY_PM.md` | the private app store: design, hard truths, production checklist |
| `ONLIVERSITY_WEBSITE_COPY.md` | ready-to-paste website copy for the Onliversity platform |
| `GO_LIVE.md` / `console-steps.md` | Supabase SQL + dashboard setup, click by click |
| `SUPABASE_MIGRATION.md` | the backend design and the reasoning behind it |
| `SETUP.md` / `DEPLOY.md` | environment setup and deployment paths |
| `UPDATE_SYSTEM.md` | the sideload update pipeline, end to end |
| `SEAT_CAP.md` | how the 1,000-seat gate is made unfudgeable |
| `PAYMENTS.md` & friends | money: Stripe · PayPal · OPay/Paystack · merchant accounts · options |
| `MATCH_SCAN_RITUAL.md` | the scan ritual, step by step |
| `DESIGN_SYSTEM.md` | the visual language |
| `SECURITY.md` | keys, RLS and threat model |
| `ROADMAP.md` | the founder's direction — quality over quantity, seasons, no store |
| `GRADLE9_DEPRECATIONS.md` | staying ahead of Gradle 9 on the native build |
| `docs/JOURNEY_CURRENT_STATE.md` | deep documentation of the Journey as implemented |
| `server/SWITCHING.md` | what it would actually take to fall back to the self-hosted server |
| `RELEASE_CHECKLIST.md` | store-era notes, kept for the keystore history |

---

## Security

- The **anon key** is public by design and safe in `eas.json` — every table is behind RLS.
- The **`service_role` key** must never appear in this repo or any build. It lives only in
  Supabase → Edge Functions → Secrets and as a **CI-only** repo secret for the release
  pipeline. Verify the app bundle with:
  `grep -c 'service_role' dist/_expo/static/js/web/index-*.js` → must be `0`.
- The **founder key** gates every admin action and is checked server-side; the app stores it
  on-device only after Supabase has confirmed it.
- **Prices are server-computed** and every tier grant flows through one database function,
  so neither a tampered client nor a forged webhook can mint access silently.
- APK updates are **SHA-256 verified** by the Package Manager before the system installer
  ever sees them.
