# ⚽ ProSeasonAcademy

## What this app is

**ProSeasonAcademy helps an EA FC console player learn from a real match.**

The player plays a match, names what mattered, and carries one useful lesson into the next match.

> **Play → Review → Carry one lesson forward.**

It is not a tips feed, a social network, a player-card generator, or an AI that tells a player what to think.

---

## What a player does

The member should only need to understand this:

1. Open **Today**.
2. Tap **Start My Match Review**.
3. Choose one path:
   - **I’m about to play** — choose one focus before kick-off.
   - **I already finished a match** — save the score, name the turning point, and write one lesson.
4. Return for the next real match.

If there is no match today, there is nothing to complete. The player is not behind.

## Plain player language

| What the player sees | What it means |
|---|---|
| **Match Review** | A short before/during/after review of one real match. |
| **Your Lesson** | One useful line to carry into the next match. |
| **Match History** | Saved scores and review receipts. |
| **Loss Notes** | Brief notes about losses and repeated mistakes. |
| **Progress** | Six chapters earned from evidence. |
| **Community** | Optional support from real players. |
| **Optional Tip** | A mechanic or idea that can help, but is never the main assignment. |

The old internal Academy names remain in code/data only where needed for compatibility. A player should not need to learn them before acting.

---

## Product hierarchy

### Primary
- Today
- Start My Match Review
- Match Review
- Your Lesson
- Progress

### Supporting evidence
- Match History
- Loss Notes
- Starting Week

### Optional utilities
- Academy updates
- Community
- Detailed evidence tracker

Nothing should appear above the next match review.

---

## Founder guides

- [`FOUNDER_BRIEF.md`](./FOUNDER_BRIEF.md) — the product story, first-use journey, and five-second usability test.
- [`PRODUCT_FOCUS.md`](./PRODUCT_FOCUS.md) — the feature filter for future decisions.

Before approving a new feature, ask:

> Does it help a player play, review, or carry one lesson forward?

If not, it should stay out of the primary member experience.

---

## Quick start

```bash
npm install --legacy-peer-deps
npm start
```

| Command | What it does |
|---|---|
| `npm start` | Starts the Expo development server. |
| `npm run web` | Starts the web preview. |
| `npm run typecheck` | Runs TypeScript validation. |
| `npm test` | Runs the offline data and UX logic test suites. |
| `npm run doctor` | Runs Expo project health checks. |

Local runs read `.env` (gitignored). Copy `.env.example` and supply:

```bash
EXPO_PUBLIC_PSA_SUPABASE_URL=
EXPO_PUBLIC_PSA_SUPABASE_ANON_KEY=
```

---

## App structure

```text
App.tsx
  └─ Sign in → Choose coach → Starting Week → Today

src/screens/
  ├─ tabs/HomeTab.tsx          Today: the next action
  ├─ tabs/JourneyTab.tsx       Progress: evidence across six chapters
  ├─ tabs/SettingsTab.tsx      Profile, help and preferences
  ├─ CoachingScreen.tsx        Choose “about to play” or “already finished”
  ├─ MirrorSessionScreen.tsx   Full match review
  ├─ StageScanSheet.tsx        Short post-match review
  ├─ MatchVault.tsx            Match History
  ├─ LossJournal.tsx           Loss Notes
  └─ AcademyGuideScreen.tsx    Plain-language first-use guide

src/data/
  ├─ mirrorSession.ts          Match-review state machine
  ├─ lessonThread.ts           Your Lesson store
  ├─ matches.ts                Match History store and evidence checks
  ├─ journal.ts                Loss Notes store
  └─ journey.ts                Six chapter definitions
```

## Product rules

- The app records evidence; it does not create a player’s psychology for them.
- A player’s own words are required for reflections and lessons.
- Progress comes from saved match evidence, not time spent clicking screens.
- Community, news, and optional tips never replace the main match review.
