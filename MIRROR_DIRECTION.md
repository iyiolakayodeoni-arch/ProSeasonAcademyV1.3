# MIRROR DIRECTION — applied to ProSeasonAcademy (v1.3+)

**Status:** APPLIED (data layer + primary UI paths + docs). Names preserved: **Onliversity · ProSeasonAcademy** remain the product names; "Mirror" is the method, "Pro Season" the programme, "EA SPORTS FC 26/27 Console Pro" the first specialist path.

This file records how the product direction ("Mirror — Pro Season") was implemented in this repository, what is honest today, and what remains for later.

---

## 1. What changed

### 1.1 One universal Journey (direction §5)
- `src/data/journey.ts` — the two coach-specific fictional journeys (**The Ashfault Ascent** / **The Merehaven Way**) are replaced by **ONE universal six-stage development arc**:

  1. **SEE YOURSELF** — truthful baseline, repeated behaviour
  2. **CONTROL YOURSELF** — what pressure does to your decisions
  3. **READ THE GAME** — patterns, danger, space, tempo, context
  4. **BUILD DISCIPLINE** — awareness becomes repeatable behaviour
  5. **PERFORM UNDER PRESSURE** — the work tested in competition
  6. **PROVE IT** — review the accumulated evidence, set the next standard

- Both coaches now walk the same road. The coach remains the voice, guide and accountability presence (lock-in, film room, scan copy, banter all intact) — but the curriculum is no longer a game-world choice.
- Objectives stay **machine-checkable** against the Match Vault, Loss Journal and Thread. Three new check kinds were added to the objective engine (`src/data/matches.ts`): `matches_played`, `composure`, `thread` (settled lessons).

### 1.2 The Standard (direction §4.2, §8)
- **NEW `src/data/standard.ts`** — the parallel benchmark journey: a **fictional composite elite Role Model** ("THE STANDARD — A COMPOSITE OF THE BEST IN THE PATH") with the professional pillars from the direction (deliberate practice, honest review, emotional control, preparation, consistency, decisions under pressure, recovery after failure, disciplined repetition, professional conduct).
- Six chapters that mirror the universal Journey. The Standard **moves with the player's progress** — the chapter for the player's current stage is revealed alongside it.
- **Not a second progression track:** no objectives, no XP, no badges. `useStandard()` exposes only the revealed chapter.
- `src/screens/tabs/JourneyTab.tsx` now renders a **THE STANDARD** panel between the map and the stage card, showing the dual line:

  ```
  YOUR JOURNEY — CONTROL YOURSELF      THE STANDARD — CONTROL YOURSELF
  Your current evidence                What elite players learn here
  ```

  plus the behaviour to study, the benchmark, and the motto: *"Your Journey is the evidence. The Standard is the benchmark."*

### 1.3 The Mirror Session (direction §6, §7)
- **NEW `src/data/mirrorSession.ts`** — the session state machine, persisted per coach:

  ```
  THREAD CHECK → INTENTION → ARMED → LIVE → HALF-TIME →
  SECOND HALF → SCORE → FULL-TIME → DIVISION → REVIEW → COMPARE → LESSON → DONE
  ```

- **Thread check:** the carried lesson must be answered first — HELD or BROKE, in the player's words — so a lesson can never be created and immediately forgotten (§6.9).
- **Intention (§6.2):** five pre-match answers + starting composure, captured before the score changes the emotions.
- **Arm (§6.3):** requests the official MediaProjection consent through the existing Match Watcher; recording never starts silently; raw video stays local by default. On devices without the native watcher the session runs fully in manual mode.
- **Half-time (§6.4):** seven questions + composure, answered while the match is still emotionally alive.
- **Full-time (§6.5):** the score is logged to the **real Match Vault** first (the receipt), then seven reflection questions + final composure are captured **before** the recording is made available.
- **Division (§6.6):** the player divides the match into key moments themselves — the app does not choose them first.
- **Review (§6.7):** eight questions per player-chosen moment, answered in the player's own words.
- **Compare (§6.8):** the four versions placed beside one another — BEFORE / HALF-TIME / AFTER FULL-TIME / AFTER REVIEW — and the player answers *"which version is closest to the evidence?"*
- **Lesson (§6.9):** the one line the player is willing to carry forward → sworn into THE THREAD (`lessonThread.ts`), which the next session opens by asking how it held.
- **Receipts:** every completed (or abandoned) session appends a receipt — score, moments reviewed, lesson, closest version, thread verdict.

**Automation boundaries (§7) are respected in code:** the app timestamps, stores locally and preserves receipts; it never writes the player's psychological answer, never auto-selects key moments, never generates the lesson, never uploads raw video.

- **NEW `src/screens/MirrorSessionScreen.tsx`** — the full in-room session UI, opened from the Coaching Screen as the **primary MAIN QUEST CTA** ("START A MIRROR SESSION ›"). A completed session logs a real match to the vault, then the stage is graded from the evidence immediately (existing `useMatchScan` grading + celebration machinery unchanged).
- The legacy **StageScanSheet** is kept as the "QUICK MATCH SCAN (SHORTER RITUAL)" secondary link.

### 1.4 Language (direction §3, §13)
- Film-room copy (`src/data/coaching.ts`) now frames the session as the Mirror Session while keeping both coach voices.
- Journey subline: *"GUIDED BY {COACH} · THE STANDARD SHOWS THE WAY. YOUR EVIDENCE MOVES YOU."*
- The Standard panel motto: *"YOUR JOURNEY IS THE EVIDENCE · THE STANDARD IS THE BENCHMARK."*
- Status copy in the stage room: *"READY FOR YOUR MIRROR SESSION"* / *"STAGE n CLEARED — THE EVIDENCE HOLDS"*.

### 1.5 Global by default (direction §9)
- The universal Journey uses no location-specific lore; the fictional geography (Cinder Row, salt pits, harbours) no longer defines any curriculum. It survives only inside coach backstory screens as character, never as a path decision.
- Location-specific systems (prices, rails, regional pricing, country selection, payment operations, local community rooms, founder operations) are untouched.

---

## 2. What is honest today vs. later

| Direction item | Today | Later |
|---|---|---|
| One universal Journey | ✅ live | — |
| The Standard panel | ✅ live (journey tab) | Optional deeper reveal per stage room |
| Mirror Session structure | ✅ full state machine + UI | — |
| Pre-match / half-time / full-time / post-review answers | ✅ all captured, persisted, compared | — |
| Player-led division + per-moment review | ✅ | — |
| Comparison + "closest to the evidence" | ✅ | Could surface in Founder Desk stats |
| Screen recording | ✅ REAL — native MediaProjection consent → MediaRecorder MP4 written to app-private storage; recording begins only when the match is detected (§5). Requires a development build (`npx expo run:android` / EAS) — **not** available in Expo Go | Trim/export to the gallery; longer retention settings |
| Match detection before recording | ✅ goal event auto-starts the recording; player tap confirms MATCH STARTED | OCR-based scorebug detection |
| Half-time / full-time detection | ✅ time-based heuristics (~6-min halves) emit `mw-checkpoint`; the Mirror Session auto-pauses, player can always override | True scorebug-based detection |
| Video review with timeline | ✅ in-app playback (expo-video) with MARK START / MARK END from the timeline and per-moment seek; ≈8 recording-seconds per match-minute | Pixel-perfect timestamp mapping |

---

## 3. Files touched

| File | Change |
|---|---|
| `src/data/journey.ts` | Rewritten — one universal 6-stage journey; all exports preserved |
| `src/data/matches.ts` | +3 objective kinds (`matches_played`, `composure`, `thread`); `setMatchComposure`; `objectiveCount(…, threadTotal)` |
| `src/data/standard.ts` | **NEW** — The Standard composite Role Model + 6 chapters + `useStandard` |
| `src/data/mirrorSession.ts` | **NEW** — Mirror Session state machine, question banks, receipts, persistence (+ recording path on sessions/receipts) |
| `src/screens/MirrorSessionScreen.tsx` | **NEW** — the full session UI (+ recording playback, MARK-from-timeline, auto-checkpoints) |
| `src/screens/tabs/JourneyTab.tsx` | Universal framing + THE STANDARD panel + thread-aware objectives |
| `src/screens/CoachingScreen.tsx` | Primary CTA → Mirror Session; copy → mirror language; legacy quick scan kept |
| `src/data/coaching.ts` | Film-room copy → Mirror Session language |
| `src/data/matchWatcher.ts` | Real native contract: recording state, checkpoints, goal-triggered auto-record, stop→path |
| `plugins/withMatchWatcher.js` | **REWRITTEN** — real native module: consent flow, MediaProjection service, MediaRecorder, checkpoints |
| `src/data/baselineScan.ts` | **Baseline Week** — 7-day schedule (24h honesty gap), per-moment analysis model, day content, migration |
| `src/screens/BaselineScanScreen.tsx` | **REWRITTEN** — the week UI: day flow (arm → match → watch/name → analyse → day Q), REST countdown, day-6 reflection, day-7 seal |
| `src/components/RecordingPlayer.tsx` | **NEW** — shared local playback (extracted from the Mirror Session) |
| `package.json` | +`expo-video` (playback) |
| `App.tsx` | `hydrateMirror` on boot + coach lock |
| `src/screens/tabs/SettingsTab.tsx` | DANGER ZONE also wipes the mirror record |
| `PROJECT_STATUS.md`, `README.md` | Ledger + quick-start updated |

`npm run typecheck` — clean. `npm test` — 18/18 (7 watcher + 5 mirror-session + 6 baseline-week). Plugin injection verified with a prebuild harness (`compileModsAsync`).

## 5. The native recording module (added 01 Aug 2026)

`plugins/withMatchWatcher.js` now injects a **real** implementation at `expo prebuild`
into the generated `android/` project (same package as `MainApplication`, so no import
is needed):

- **Consent (§6.3):** `MatchWatcherModule.start()` launches the official
  `MediaProjectionManager.createScreenCaptureIntent()` from the current Activity
  (`ActivityEventListener` + `startActivityForResult`). Recording never starts
  silently. Declined consent → clean `false` → manual mode.
- **Foreground service** (`MatchWatcherService`, `foregroundServiceType="mediaProjection"`):
  notification channel + `startForeground(..., FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)`.
- **Two virtual displays off one projection:**
  - `mw-frames` — 96×54 RGBA → grayscale → base64 `mw-frame` events (~1fps),
    ingested by the pure ScoreTracker (goal detection, unchanged);
  - `mw-record` — full-resolution `MediaRecorder` (H.264 MP4, 24fps, 8 Mbps) that
    **only starts when the match starts** (`beginRecording()`), so an entire phone
    session is never recorded up front.
- **Auto-start on match detection:** the first goal event from the ScoreTracker
  calls `beginRecording()` automatically; the player's MATCH STARTED tap does it too.
- **Checkpoints:** `mw-checkpoint {kind: half|full}` at ~5.5 min / ~11.5 min of
  recording (FC 26/27 console halves run ~6 real minutes). The Mirror Session auto-advances
  on these; the manual buttons always remain.
- **Stop:** `stop()` tears down recorder + displays + projection, resolves
  `{path, durationMs}`, emits `mw-state {state:"stopped", path}`, and stops the
  service. Files land in `Android/data/<pkg>/files/Movies/match-watcher/` — app-private,
  never uploaded by default.
- **Playback:** `expo-video` in the Mirror Session's DIVISION and REVIEW phases —
  MARK START / MARK END from the timeline, per-moment seek, `≈8 recording-seconds
  per match-minute` mapping (FC 26/27 console ~12 real min per 90 match-min).

**Build note:** the native module + expo-video require a **development build**
(`npx expo run:android` or an EAS build) — they are not present in Expo Go. The
plugin harness (`compileModsAsync`) verifies the prebuild injection; the Kotlin
itself must be compiled by a real Android toolchain (JDK 21 / SDK 36) on the first
`expo run:android`, and the consent flow needs one real-phone check.

## 6. The Baseline Week (added 01 Aug 2026)

The 5-match trial is now **BASELINE WEEK** — the same anti-self-deception philosophy
applied to the gate itself:

- **DAYS 1–5:** one ranked match a day. After each match the player **watches the
  recording** and **names the moments where they failed** — their words, their
  timeline, MARK START / MARK END from playback, optional coarse tag — then
  **analyses each moment** with nine questions (thinking / cause / why / different /
  the rest), then the rotated day question + head state. The day seals.
- **DAY 6 (no match):** the week's receipts are put back in front of the player —
  every named moment, the tendencies that keep appearing — with two reflections:
  *what do you keep repeating?* and *what has actually changed since day 1?*
- **DAY 7:** the ambition question, then the sealed profile card.
- **The 24-hour gap is the honesty mechanism:** the next day unlocks exactly 24h
  after the previous day seals (`sealBaselineDay`), REST screen with live countdown
  and yesterday's review. Lateness is never punished. One task a day is the
  contract — "give you time to think and not force you".
- Old pre-week sessions migrate from their existing entries; nothing is reset.
- `src/data/baselineScan.ts` (schedule + analysis model + day content),
  `src/screens/BaselineScanScreen.tsx` (the week UI), shared
  `src/components/RecordingPlayer.tsx` (extracted from the Mirror Session),
  `tests/baselineWeek.test.js` (6 tests: day-1 open, 24h gap, lateness, moment
  completeness, migration, full-week flow).

---

## 4. The product line, as applied

> **MIRROR / PRO SEASON — EA SPORTS FC 26/27 CONSOLE PRO DEVELOPMENT PROGRAMME**
> *"Mirror helps you see what you actually do — not what you wish you did — then gives you the structure to change it."*
> *"Your Journey is yours. The Standard shows what the best in your path have learned. Mirror gives you the structure to compare your intentions with your evidence and do the work honestly."*
>
> YOUR ROAD. THE STANDARD. NO EXCUSES. · YOU CANNOT OUTRUN YOUR RECEIPTS. · MIRROR DOES NOT THINK FOR YOU.
