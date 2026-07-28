# ProSeason MetaBot 🤖

**What this is:** our own search robot that lives *next to* the app (never inside it).
On a schedule it goes out and reads what's actually happening in FC Mobile right now —
EA's official news hub, YouTube search results, news blogs, guide sites, Reddit — and
turns it into ProSeasonAcademy feed posts.

**Zero third-party services. No API keys. No accounts. No AI services. $0 forever.**
The bot searches and writes entirely by itself: collectors + a rule-based
classifier + a template voice composer, all plain Node code in this folder.

The phone app never searches anything itself. It just reads the finished,
approved list (`src/data/liveFeed.json`) when the Home tab ships.

---

## The pipeline (one job, five stages)

```
              runs on a schedule (every 6h / daily)
                          │
   ┌──────────────────────▼──────────────────────┐
   │ 1 · FETCH    src/collectors/* — OUR own bot  │  youtube search results pages,
   │              searches the sources directly:   │  ea.com news hub + patch notes,
   │              EA news, YouTube, RSS blogs,     │  RSS/Atom feeds, guide sites,
   │              guide sites, r/FUTMobile*        │  reddit's public JSON — no keys
   └──────────────────────┬──────────────────────┘
                          ▼
   ┌─────────────────────────────────────────────┐
   │ 2 · DEDUPE   src/dedupe.js                   │  fingerprint = kind+topic+patch
   │              same story twice = skipped.      │  every run remembers everything
   └──────────────────────┬──────────────────────┘
                          ▼
   ┌─────────────────────────────────────────────┐
   │ 3 · CLASSIFY + COMPOSE                       │  understand.js sorts finds into
   │              src/understand.js + compose.js  │  EXPLOIT/SKILL_MOVE/PATCH_NOTE/…
   │              templates → our voice: punchy    │  compose.js rewrites to drafts:
   │              ALL-CAPS headline, lowercase     │  no emoji, no @handles, no real
   │              body, CTA — source kept as field │  pro identities in the app voice
   └──────────────────────┬──────────────────────┘
                          ▼
   ┌─────────────────────────────────────────────┐
   │ 4 · STORE    src/store.js → data/store.json  │  status: pending_review
   │              + freshness tags (patch, date)   │  staleness sweep every run:
   └──────────────────────┬──────────────────────┘  old patch or >21 days → stale
                          ▼
   ┌─────────────────────────────────────────────┐
   │ 5 · APPROVE  src/approve.js (you, the human) │  you read drafts with sources,
   │              approve → src/exportForApp.js    │  approve what's good enough
   │              writes src/data/liveFeed.json ◄──┼── the ONLY file the app reads
   └─────────────────────────────────────────────┘
```

\* **Reddit reality note:** Reddit aggressively blocks datacenter IPs. From a
normal/home network (your laptop, a small VPS with clean IP) the reddit
collector works as-is; from cloud/CI machines it logs "unavailable" and the
other four collectors carry the run. The job never dies over one source.

---

## Run it (Node 18+; that's the only dependency)

```bash
cd metabot
npm run run                 # fetch → dedupe → classify/compose → store (pending)

# review + publish (the human gate — nothing auto-publishes)
npm run pending             # read the drafts with their sources
npm run approve -- mb-2026-07-24-001
npm run reject  -- mb-2026-07-24-002
npm run export              # rebuild src/data/liveFeed.json (approved only)

### lesson blocks (power the Coaching Screen)

Every approved SKILL_MOVE / EXPLOIT / TRICK_OF_THE_WEEK item also exports a
structured `lesson` block (`src/lessons.js`): mechanic name, headline, why-it-
matters, 3-step tiles, the quotable rule, clip reference and MATCH SCAN targets.
The app's Coaching Screen (Journey map → tap a stage node) selects the newest
eligible lesson per stage, stores the stage → content-id link, and flags the
stage for a coach swap if that item ever goes stale after a patch.
```

Optional upgrades that stay 100% optional:
- `LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=... npm run run` swaps the search +
  compose steps for AI calls (fancier summaries) — the app works fine without it.
- `DISCORD_WEBHOOK_URL=...` pings you when drafts are waiting.

## Put it on a schedule (free)

Copy `scheduled-github-action.example.yml` to `.github/workflows/metabot.yml` —
GitHub runs the bot every 6 hours and commits new findings, no keys needed.
On any machine instead:

```cron
0 */6 * * *  cd /path/to/ProSeasonAcademy/metabot && node src/run.js >> bot.log 2>&1
```

## Cost

**Nothing.** Everything is our own code reading public pages.

## Later upgrades (no rewrites)

- **Real database:** swap the 4 functions in `src/store.js` for Supabase calls.
- **Approval from your phone:** point `src/approve.js` at the same DB behind a
  tiny admin screen.

## Hard rules (enforced in code)

- Server-side only — the phone never searches, scrapes, or stores keys.
- Bodies are rewritten into our own voice; sources stored as fields, never quoted inline.
- No emojis, no @handles, no hashtags, no real pro-player/creator identities in the app voice.
- The fictional coach characters never touch bot content, and bot content never uses them.
- `pending_review` by default. A human approves every post, every time.
