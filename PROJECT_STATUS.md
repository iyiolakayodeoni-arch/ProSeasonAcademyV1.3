# ⚽ ProSeasonAcademy — Full Build Ledger

**Version:** 1.0.0 · **Package:** `com.onliversity.proseasonacademy` · **Android release:** APK + AAB (Gradle-built, signed)
**Last updated:** 25 July 2026

This document is the single place to check **what the app already does**, **what is real vs. simulated**, and **what is left**. Every feature below has been built and verified in the actual running app (screenshots drove every screen before it shipped).

---

## 1. What the app is (30-second version)

ProSeasonAcademy is your coaching academy for FC Mobile. You pick **one coach — permanently**. Your coach walks you up a **6-stage journey**. Each stage he teaches you **one mechanic that is actually working in the game right now** (found by your own scouting bot, MetaBot — no third-party apps involved), then a **Match Scan** grades whether you used it in a real match. Pass → XP + badge → next node unlocks. Around that: a Home feed, a Community clubhouse, film-room sessions, and a Role Model collectible card of your coach.

---

## 2. ✅ Everything implemented so far (screen by screen)

### 2.1 Onboarding — *fully built, all screens real*
| # | Screen | What's working |
|---|--------|----------------|
| 1 | **Splash** | Animated logo crest with the looping "trail" animation, brand grid background, version footer |
| 2 | **Sign In** | Clean neon form (email/username/password + create account + forgot). Runs on a local session today; the real server hook is marked for later (`TODO(real-auth)`) |
| 3 | **Coach Selection** | The courtroom: both coaches pitch you in a one-way chat (you only read, they talk), banter lines per coach, scout file cards, then **"I'M WITH COACH X" → LOCK IT IN**. The lock is **permanent by design** — the app never offers a way back |
| 4 | **How Did You Hear** | Source picker (YouTube/TikTok/IG/friend/other) with icons |
| 5 | **Setup Loader** | Short animated "building your academy" boot into the main app |

### 2.2 Main app shell
- Shared brand crest at the top of every tab, 4-tab bar (Home / Journey / Community / Settings)
- **Shared-element zoom transitions**: tap a journey node or the Role Model card and it *blooms* full-screen into the stage room; the back chevron reverses the exact same animation

### 2.3 Home tab
- Live feed powered by MetaBot's daily export (scrollable cards: headlines, posts, broadcast items)
- Marquee ticker + pull of the freshest approved finds
- Anything stale gets flagged instead of silently breaking

### 2.4 Journey tab — the map (TWO different odysseys)
- **Each coach walks a different path through a different fictional world** — inspired by research on the world's top console players (see `uploads/role-model-player-research.md`), distilled into archetypes with zero real names/likenesses on screen:
  - **CHINEDU — "THE ASHFAULT ASCENT"** (Ruthless Winner × Dominant Prodigy): Cinder Row → The Lean-To → The Saltpits → Long Corridor → Red Lantern End → The Iron Whistle. Mentors: Mama Ukae, Drummer Ezra, Foreman Baba Salt, Locksmith Venn, Night-Watch Kettle, Old Whistle Onye
  - **OBINNA — "THE MEREHAVEN WAY"** (Iceman × Unlikely Champion): Tide Flats → Lantern Canal → Stillwater Docks → The Fog Gate → Harbour Lights → Calm Water. Mentors: Fisher-Boy Idri, Boatman Sola, Dockmaster Yew, Fogwatcher Nne, Light-Keeper Ama, Elder Mere
  - Obinna's map even winds in the **opposite direction** (mirrored layout)
- **Six stages** per path, same mechanical arc (First Touch → … → Showtime), full data per stage: objectives, progress, XP ramp (120 → 400), **place-named badges** (e.g. CINDER ROW BADGE), stage quotes spoken by the fictional mentor who shaped that place
- Winding dotted path with footprint pips; the path to your current node stays **lit**
- Player card (OVR rises as you pass stages: 61 → 62…) with "YOU — STAGE n"
- Tap any reachable node → **stage details panel** (objectives with progress, live progress bar, XP + badge reward, coach quote, CTA)
- Cleared nodes show **✓ CLEARED + "REPLAY THE FILM ROOM"**
- Locked future nodes show padlocks

### 2.5 The Role Model card (your coach as a collectible)
- Full SVG football-card design: shield silhouette, double border, halo, **foil sheen that physically sweeps** across the card every few seconds
- Rating + title (**92 DISCIPLINARIAN** Chinedu, gold accent · **88 MOTIVATOR** Obinna, green accent — your chosen direction)
- Full-face portrait busts, foiled name plate, 6-stat row, "ROLE MODEL · STAGE MENTOR" footer
- Sitting above the map as the hero; **tap it → zooms straight into today's stage room**

### 2.6 Coaching Screen (the film room) — *the heart of the app*
- **One-way session**: the coach talks to you, you cannot type back (by design)
- Header: coach identity, photo, live "ONLINE" pulse, "ONE-WAY SESSION · TODAY {time}"
- Message sequence: greeting in his own voice → **voice note bubble** with working play/pause, animated waveform and 0:42 countdown → the mechanic message with **green highlights** → closer ("the scan will know.")
- **TODAY'S MECHANIC lesson card**, fed live from MetaBot: tags + name + headline + *why it works after the update* + 3 step tiles (icons) + coach's rule strip + clip block with play countdown + a real SOURCE link to the original video/post + traceability line (`TRACKING FEED ITEM mb-…`)
- **Safe empty states**: if MetaBot approved nothing new, the room shows a clearly-marked "coach is prepping today's mechanic" placeholder; if a mechanic got patched out, a gold "PATCHED OUT" banner appears instead of stale teaching
- **MATCH SCAN** state machine: armed → scanning → passed/failed, checklist fills with HIT x/y or MISSED per target; fail → "RUN IT BACK"

### 2.7 XP, badges & the celebration moment 🏆
- Passing a scan awards real XP + the stage badge, once (replays never double-pay)
- **Full-screen celebration**: "STAGE n CLEARED", XP counting up like a scoreboard, badge tile stamped *"ADDED TO YOUR CABINET — PERMANENT"*, praise line in your coach's voice, "CONTINUE TO THE MAP ›"
- Stage rewards: 120 XP + badge per stage … **400 XP + SHOWTIME BADGE** at the summit

### 2.8 Progress persistence 💾
- Current stage, completed stages, XP, badges, and which MetaBot item taught each stage are **saved on the phone (AsyncStorage)**
- Verified: pass a stage → force-quit → reopen → everything is exactly where you left it (Stage 2 CURRENT, card at 62, XP banked)

### 2.9 Community tab — "The Clubhouse"
- **Channels** in a CLUBHOUSE group: `#general`, `#wins`, `#losses`, plus read-only `#coach-updates` (shows a dashed "coaches only" composer)
- **Direct Messages** section — structurally separate from channels in the data layer (`type: 'channel' | 'dm'`)
- Fully working chat shell everywhere: grouped messages, per-user colored initials avatars, colored @mentions, COACH badge + gold ring, one "COACHES IN THE ROOM" divider
- **Reactions** (fire/laugh/eye pills) you can tap to add/remove; icon-only "noticed" variant
- **Typing indicator**, **auto-scroll to newest** with a "N NEW ↓" pill if you're scrolled up
- Composer: send by Enter or arrow; **+ menu** posts real content — *SHARE MATCH SCAN* and *SHARE MY STAGE* pull your actual live progress; **mic** records a voice-note state → playable voice bubble
- Channel drawer with unread counts, DM list sorted by last activity, **+ NEW** DM picker with search
- Members panel (COACHES / ONLINE / OFFLINE)
- Tap any avatar/username → profile sheet: **MESSAGE ›** opens/creates the DM, MUTE/UNMUTE hides their messages
- **FIND A SQUAD** flow: search → squad card → JOIN → JOINED
- Live-feel engine: mock members chat and reply on their own (see §4 — this part is simulated until a server exists; the *UI* is 100% real)

### 2.10 Settings tab — the Control Room
- **Player card**: avatar + verified badge, generated Academy ID (`#PSA-…`), live line "STAGE n — WALKING {COACH}'S PATH", stat strip (DIV · Academy XP · best streak · days in academy — all real data)
- **EDIT PROFILE** — actually renames you everywhere
- **Coach & Journey**: coach row → sheet explaining the permanent lock (with his photo/rating); Current Stage → jumps to the map; Match Scan auto-read + Loss Journal toggles (coach's rule)
- **Notifications**: 4 real toggles (coach messages / scan results / film room live / community mentions) — **persist across restarts** (verified by test)
- **Game & Account**: Platform (CONSOLE/MOBILE), Region (5 servers), Academy plan (PRO/ROOKIE switch), Password & security sheet (reset-link seam), Help & support (FAQs + "talk to a human" ticket seam)
- **DANGER ZONE**: Log out (confirm sheet) and **Delete account** (demands a double confirmation, then genuinely wipes local data and signs out)
- Footer with live version + build note

### 2.11 MetaBot — your private scouting server 🤖
*Your rule: "a bot to do the search, no third-party apps involved" — zero API keys, zero accounts, zero AI services.*
- Collectors: YouTube channels, EA news page, RSS feeds, guide-site watch (Reddit collector exists but Reddit blocks datacenter IPs)
- Understand → compose → dedupe (fingerprinting) → store → human **approve** step → `exportForApp` writes `liveFeed.json` consumed by the app
- **Lesson engine**: turns approved finds into structured lessons — mechanic name, why-it-works, 3 tiles, rule, clip reference, scan targets (e.g. "lane changes 5+", "0 flags")
- Stage assignment: every stage gets the **newest approved item not already used by another stage**; if an item goes stale, the stage is flagged for a coach swap

### 2.13 Loss Journal — *fully built, one line per loss*
- Entry card on the Journey tab (live count + flame streak chip); **PAUSED** state when the Settings toggle is off
- Full-screen journal: stats strip (lines logged · last 7 days · day streak), composer with cause chips (DEFENDING / FINISHING / COMPOSURE / KICKOFF GAP / BS MOMENT), 90-char "no essays" limit, LOG IT
- **Coach acknowledgment strip** after each line (his own voice per coach) — he reads every line
- Entries: numbered (#001…), tagged, timestamped, day-grouped (TODAY/YESTERDAY/date), deletable
- **Persisted on-device** (verified across force-quit + restart) and **feeds the journey objectives live** — every "Log N lines…" objective reads the journal store
- Verbatim from the design's rule: "the pattern you write is the pattern he fixes"

### 2.14 Match Vault + the REAL Match Scan — *the scan tells the truth now*
- **Match Vault** (`src/data/matches.ts`): every match you play, logged in ~15 seconds — score, mode (RANKED/CASUAL/TOURNAMENT), their style (LOW BLOCK/HIGH PRESS/COUNTERS/POSSESSION/LONG BALL/HARD TO TELL), pass accuracy off the post-match screen, and honor chips (no-sprint kept · taught mechanics used · winner's minute · led at 75')
- **Honor-system ingest, by design**: FC Mobile exposes no official match feed (and we ship zero third-party services). The `source` field is the seam — rows are `'manual'` today, `'scan'` the day automatic ingest exists; nothing else in the app changes
- **Objectives are machine-readable now**: every match-provable journey objective carries a `check` spec (26 wired across both journeys — wins, ranked wins, no-sprint wins, pass accuracy, concede-max, goals-vs-style, late winners, close-outs, clean sheets, taught-mechanics wins, journal lines). `objectiveCount()` grades them against the vault *live*
- **MATCH SCAN reads the vault** (no more scripted resolves): scan card shows THE COACH'S EYE (the live mechanic's watch-items — judged by the coach, not the vault) above THE VAULT SAYS (graded rows: HIT/MISSED with real counts). Pass = every gradable objective genuinely met → stage clears, XP + badge celebration
- **Auto-read setting honored**: with `matchScanAutoRead` on, opening a room with matches in the vault starts the scan by itself; off → manual START THE SCAN
- Flow glue: vault strip in the scan card (W–D–L + count, tap to open), CTA becomes LOG A MATCH FIRST when the vault is empty, LOG THE NEXT ONE & RESCAN after a fail (returning from the vault re-scans automatically), and a LOSS JOURNAL nudge appears when you failed off the back of a logged loss
- Stage cards show **live objective counts and live stage %** (weighted across objectives — no more painted percentages); persisted across restarts like everything else
- Community SHARE MATCH SCAN posts the real latest ledger entry + stage receipt

### 2.12 Android release — built the proper way 📦
- Full **native Gradle project** (`android/`) generated and kept in the repo — opens directly in Android Studio
- Local toolchain build (JDK 21, Android SDK 36, NDK r27b): `./gradlew assembleRelease` + `bundleRelease`
- **Signed with your own upload keystore** (`proseason-upload.keystore`) — release config declared in `build.gradle` + `gradle.properties` (classic pattern)
- Outputs: **APK** (install on your phone, 36 MB) and **AAB** (Play Store file, 27 MB)
- `com.onliversity.proseasonacademy`, versionName 1.0.0, minSdk 24, targetSdk 36, arm64-v8a (every modern phone)

---

## 3. 🟡 Honest ledger: what's simulated, and exactly why

These are real, finished UIs wired to a **marked seam** instead of a server. Nothing is faked silently — each seam logs `TODO(real-…)` in the code.

| Feature | Status today | Why | What makes it 100% real |
|---------|--------------|-----|------------------------|
| Accounts / sign-in | Local session | No server yet | Auth service (Supabase/Firebase) plugs into the marked seam — UI won't change |
| Match Scan result | **REAL — graded from the Match Vault** (§2.14) | Match entry is honor-system because FC Mobile has no official feed | Automatic ingest (on-device post-match read) writes the same vault as `source:'scan'` — UI won't change |
| Community live traffic & DM replies | Scripted engine (bot members) | Real humans need a realtime chat server | Swap engine for WebSocket feed — UI won't change |
| Coach voice notes | Player UI + waveform + countdown, no audio | **CUT from v1 by owner decision (26 Jul)** — may return post-launch | Drop-in audio file later; UI already wired |
| Lesson clip replay | Countdown placeholder + source link | No video pipeline yet | Host the clip → feeds into the in-app player |
| Acadademy plan purchase | Instant local switch | No store billing yet | Play Billing receipt flow |
| Push notifications | Preferences saved & real | Delivery needs FCM + server | Plug device token into notification service |
| Password reset / help tickets | UI + logged seams | Needs email/support backend | Real mail + ticketing service |
| Multi-device sync | Phone-local profile | Needs cloud profile | Backend sync once accounts land |

---

## 4. 📋 Remaining roadmap (in order)

1. ~~Real coach voice notes~~ — ✗ **CUT from v1** (owner decision, 26 Jul). Film room stays text + typed lessons
2. ✅ **Loss Journal screen** — DONE 26 Jul (§2.13): one line per loss, persisted, feeds objectives
3. ✅ **Journey objectives → journal wiring** — "Log N lines…" objectives read the journal store live (26 Jul)
4. ✅ **Real match-stat objectives + Match Scan backend** — DONE 26 Jul (§2.14): Match Vault (honor-ingest, persisted), 26 machine-readable objective checks, scan grades the vault live, auto-read, loss-journal nudge
5. ☐ Backend services (accounts → chat; match ingest stays honor-system until a legit feed exists) — then flip the remaining seams in §3
6. ☐ **Play Store release** — needs your $25 Google dev account, listing screenshots + privacy policy (AAB is ready today)
7. ☐ iPhone version (Expo makes this straightforward later)

---

## 5. Changelog

- **2026-07-26 · v1.0.0 (match vault + the real scan)** — Match Vault shipped (persisted honor-system ingest, W-D-L/xG-free stats, day-grouped ledger); 26 machine-readable objective checks wired across both journeys; MATCH SCAN now grades the vault live (auto-read, coach's-eye watch-list, fail→rescan loop, loss-journal nudge); stage % + objective counts live; progress persistence restored; SHARE MATCH SCAN posts real ledger data; signed APK/AAB rebuilt.
- **2026-07-26 · v1.0.0 (loss journal + journeys)** — Loss Journal shipped (persisted entries, cause chips, coach acks, streaks, objective wiring); voice notes cut from v1 per owner; signed APK/AAB rebuilt.
- **2026-07-26 · v1.0.0 (journeys update)** — Two per-coach fictional journeys (Ashfault Ascent / Merehaven Way) from fresh research on the current FC Pro scene; mentor bylines, place-named badges, mirrored map for Obinna; rebuilt signed APK/AAB.
- **2026-07-25 · v1.0.0** — First signed release: full onboarding→main-app loop, Home, 6-stage Journey with persistence, film-room coaching with live MetaBot lessons + Match Scan + XP celebration, Community clubhouse, full Settings, native Gradle release APK/AAB.
- **Earlier** — Design phase: pixel-perfect approved designs for every screen (Splash, Sign In, Coach Selection, Home, Journey, Community, Coaching Screen, Settings), coach system (Chinedu 92 gold / Obinna 88 green), Role Model card, MetaBot pipeline.

---

## 6. Where everything lives in the project

```
ProSeasonAcademy/
├─ App.tsx                     → app entry, navigation flow
├─ src/screens/                → Splash, SignIn, CoachSelect, HearAbout, SetupLoader,
│                                  MainScreen, CoachingScreen
├─ src/screens/tabs/           → HomeTab, JourneyTab, CommunityTab, SettingsTab
├─ src/components/             → LogoMark, GridBackground, RoleModelCard, CoachCard,
│                                  Marquee, MiniPitch, TabBar, Icons (all SVG)
├─ src/data/                   → coaches, journey, coaching, progress, community,
│                                  settings, homeFeed, liveFeed.json (MetaBot export)
├─ src/hooks/                  → useAuth, useMatchScan, useTrailLoop, useSplashAnimation
├─ metabot/                    → the scouting bot (collectors, compose, dedupe, approve,
│                                  lessons, exportForApp) + README
├─ android/                    → NATIVE GRADLE PROJECT (release-signed; opens in Android Studio)
├─ assets/coaches/             → coach portraits + Role Model card busts
├─ RELEASE_CHECKLIST.md        → how the release APK/AAB were built + rebuild commands
└─ PROJECT_STATUS.md           → THIS FILE
```

*Rule for every future build: update this file first, then ship.*


## 2.17 · ACADEMY CLOUD SERVER + LIVE COMMUNITY (custom backend, ₦0)
`server/` — 100% custom Node/SQLite/WS backend: guest auth, idempotent match-vault
sync (incl. THE MIND fields), Discord-style live rooms (join/message/react/typing,
presence, 60-msg/min rate limit), key-gated admin desk (`/admin`). `server/DEPLOYMENT.md`
= zero-naira hosting guide (Oracle Always Free / home PC + Cloudflare Tunnel).
App side: `src/data/backend.ts` + `cloudSync.ts` (outbox, 30s re-probe, unique per-device
handles) + community bridge (general/wins/losses mirror server rooms, LIVE chip).
E2E: two-browser live chat + vault→admin desk all green.

## 2.18 · MATCH WATCHER (THE EYE) + THE MIND (semi-automatic BY DESIGN)
On-device auto scan: native MatchWatcherService (MediaProjection, ~1fps 96×54 grayscale)
→ pure ScoreTracker (pixel-change goal detection, 7/7 unit tests) → Match Vault
AUTOPILOT card (arm/live score/swap sides/full time/prefill AUTO). THE MIND = framed
as the point: composure dial + one-line debrief, per-coach self-aware framing copy.

## 2.19 · BASELINE SCAN (5-match interview gate)
Post-lock flow: CoachSelect → LOCK → CoachIntro (his fictional backstory in his voice)
→ BaselineScanScreen: serious gate (no-AI manifesto, house-rule bluff, NOT READY note)
→ 5 debriefs (score + scoreline story beat + composure + deep question, answer ≥12 chars
enforced) → ambition ask (stored, coach references later) → sealed profile card
(tier from avg composure, coach read, ambition quote) → journey unlocks. Baseline
matches land in the real vault (source manual, note prefix BASELINE Mn). Data:
`src/data/baselineScan.ts` (both coaches' scripts, beats, tiers) — E2E full-pass green.

## 2.20 · STAGE MATCH SCAN v2 (the new scan system INSIDE the coaching stages)
The full scan ritual now lives inside every stage room, not just the vault/baseline.
CoachingScreen's MATCH SCAN card carries a gold "SCAN V2" tag and its CTAs open the
new `StageScanSheet` (full-screen, in-room): PART 1 THE SCAN (score steppers + THE EYE
bridge/prefill, mode, opp profile, pass accuracy, honor rows auto-labelled with today's
mechanic) → PART 2 THE MIND (composure + the SOUL QUESTION from the baseline canon,
answer ≥12 chars enforced — gated LOG) → THE STORY (funny scoreline beat) + THE READ
(references today's mechanic) → GRADE THE VAULT (grading runs the moment it closes).
Ghost CTA "SCAN A FRESH MATCH FIRST" keeps the ritual reachable even with vault data.
Voice layer: `src/data/coaching.ts` (STAGE_SCAN_COPY, stageSoulQuestion, stageScoreBeat,
stageReadLine; reuses BASELINE_SCRIPTS + beatKey); COMPOSURE_LABELS exported from
matches.ts. E2E green end-to-end (design-preview/e2e-stagescan.js): auto-scan fails 0/2
→ in-room scan logs W 2–1 no-sprint + CALM + answer → beat/read → grade 1/2 → second
scan 1–0 → STAGE 1 CLEARED + 120 XP + badge.

## 2.21 · RELEASE BUILD v1.2.0 (everything compiled in)
Local Gradle release (assembleRelease + bundleRelease) on the full system: baseline,
cloud sync + live community, THE EYE native watcher (Kotlin compile-checked for the
first time — fixed RN 0.86 signature/null-safety + manifest quote), THE MIND, and the
in-room STAGE MATCH SCAN v2. Signed with the academy upload key — cert SHA-256
832cbd23125b64c5db1e1cad205e8b88fe68745893aed91330661ec40967d01a (same key as the
first builds; installs as an upgrade). Hermes bundle string-probed: baseline copy,
STAGE_SCAN_COPY, soul questions, story beats, both fictional journeys + mentors all
PRESENT. APK 38.1MB / AAB 28.7MB. THE EYE runtime needs one real-phone check
(MediaProjection consent) — everything else verified end-to-end.

## 2.22 · REGIONAL MONETIZATION FOUNDATIONS + FOUNDER DESK (v1.3)
JAN 1 payment split (Africa → credit packs · World → subscription) foundations:
sign-up now captures COUNTRY (settings.country + geo 'africa'|'world'); the cloud
guest identity carries the region; server adminSummary splits AFRICA/WORLD/UNSET
(+ coach split). Pricing halls seeded: #division-africa (credits debate) +
#division-world (subscription debate). FOUNDER access = one key: Settings → tap
VERSION ×5 → ADMIN ACCESS sheet → paste ADMIN_KEY (verified server-side, stored
on-device only) → FounderDesk GUI: live academy stats, region/coach splits, top
scorers, recent vault (THE MIND included), BROADCAST AS FOUNDER into any channel
(kind:'founder', live WS fan-out, seeded FOUNDER identity row, excluded from
player counts). The charge-money engine itself (Paystack/Flutterwave credits,
Play Billing subscriptions) is vNext and needs the founder's own merchant
accounts — foundations flip it on without a rewrite. Server tests 6/6 green;
app founder E2E 8/8 green (country capture → unlock → desk → broadcast → hall).

## 2.23 — 2026-07-27 · THE TILL ships, public proof, and the SUPABASE PIVOT (Season One)

Charge engine on the custom server: wallets/ledger tables, hot-reload products
catalog (₦500/100cr → ₦5,000/1,700cr + $4.99/mo PRO), /store routes, GO_LIVE
default 2027-01-01, admin rollup till block; app THE TILL sheet + Community TILL
chip + Founder Desk money controls (CREDIT THE PLAYER / ACTIVATE PRO · 30 DAYS).
Server suites 8/8 groups, app E2E 8/8; public proof via cloudflared tunnel
(public smoke ALL GREEN incl. founder broadcast over WSS). Deployment bundle for
Oracle path kept as fallback (install.sh + .env.example + DEPLOYMENT.md §6b).

FOUNDER DECISION: backend pivots from self-hosted custom server to **Supabase free
tier + Postgres** ("the stress is not worth it"); custom server stays in server/
as the proven ₦0 fallback and behavioral map. Additional founder locks: sign-up/
sign-in entirely INSIDE the app (website = intro only); **SEASON ONE cap of 1,000
players enforced in code** (config seat_cap, ensure-profile 409 SEASON_FULL path,
waitlist table, founder-row exclusion) with seasons framing copy.

Built (tsc clean): supabase/schema.sql (full brain: RLS, RPCs till_topup/till_plan
service-role-only, till_spend self-resolving atomic guard, admin_rollup, realtime
publication), verified end-to-end against local PostgreSQL 17 with auth-stubs
(two real bugs fixed: `wallets.credits` qualification; `extract(epoch)::bigint`
×3) — supabase/tests verify ALL PASSED; 8 edge functions (_shared cors/admin;
health; ensure-profile seat gate; founder-broadcast; admin-summary; till-topup;
till-subscribe); src/data/backend.ts FULL rewrite preserving every old export
(fail-soft offline, anonymous auth, SEASON_FULL gate w/ getSeasonGate, camel/snake
vault sync w/ ignoreDuplicates, realtime rooms + presence, till RPC, founder fns
via x-founder-key); SignInScreen rebuilt with 11-chip country picker routing to
africa/world plan note + SEASON FULL panel; CommunityTab waitlist banner;
FounderDesk seats counter; tsconfig excludes Deno dirs. Mid-session sandbox
reversion incident: 5 files silently reverted to v1.0-era — all recovered
(journey.ts got the full canon fiction rewrite + 26 machine-checkable objectives),
recovery rule now double-anchors the zip.

Pending: founder's 6 console steps (console-steps.md); live project URL+anon key;
live E2E battery vs real project (incl. forced SEASON_FULL); v1.3 APK/AAB cut
(keystore + secrets intact, cert 832cbd…).
