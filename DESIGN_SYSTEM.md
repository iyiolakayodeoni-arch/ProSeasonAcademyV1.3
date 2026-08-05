# ProSeasonAcademy — Visual Design System (v1)

> The work product of a deliberate UX pass: philosophy → research → honest
> diagnosis → principles → applied → self-checked. Read top to bottom; each
> step depends on the one above it.

---

## STEP 0 — The philosophy I am designing against

Found in-repo, read in full: `README.md`, `WHERE_WE_ARE.md`, `ROADMAP.md`,
`MIRROR_DIRECTION.md`, `MATCH_SCAN_RITUAL.md`, `ONLIVERSITY_WEBSITE_COPY.md`.
These are not generic product notes — they are a *stance*. The spine of it:

- **"We cannot make you better. We can only help you see yourself clearly
  enough to do the work yourself."**
- **"Mirror is not an answer machine. It is a structure that makes it
  difficult to keep giving yourself convenient answers."**
- **"Evidence before advice. The machine records the evidence. The player
  does the seeing."**
- **"Progress is earned from receipts. Reading, watching or tapping is not
  improvement. Stages clear only when the evidence says the work was done."**
- **"Your journey is the evidence. The Standard is the benchmark."**
- Tone, in the founder's own words: *no painted percentages*, *you cannot
  outrun your receipts*, *nothing is bombarded, nothing is forced, lateness
  is never punished*, *the scan does not hand you the lesson — it forces you
  to reason your way to it*.

**The thing I am holding onto for every decision below:** this is a serious,
truth-telling, anti-self-deception tool with a "coach who tells you the
truth" voice. That is not a vibe I apply at the end. It is the constraint
that decides which game-UI patterns are *allowed in* and which are
disqualifying. Anything that would let a player feel rewarded without having
earned it is off the table by definition.

---

## STEP 1 — Research (EA SPORTS FC 26/27 Console + eFootball, real sources)

Studied across multiple sources, not memory. Findings I am willing to stand
behind, each cross-checked; gaps flagged honestly at the end.

### 1a. The collectible card is the unit of identity
In both EA SPORTS FC 26/27 Console FUT and eFootball Dream Team, the **player card is the
central object** — the thing you collect, upgrade, show off, and identify
with. Third-party ecosystems exist almost entirely around it: a popular FC
Mobile companion app ships a "Pack Opener" and a "Card Generator" so players
can *reveal* and *design* cards outside the game ([RenderZ app listing][r1]).
eFootball's progression is **attribute-point allocation onto a card** that
levels to a max, with rare "shiny" card versions carrying boosted stats
([CharlieIntel eFootball 1.0 notes][r2]; r/eFootball build discussions).
EA's own forward direction leans harder into this — FC 27 pitch notes
describe a "FUT **Gallery**" and "**Holographic** Player Items" as a
long-term progression path ([EA FC 27 pitch notes][r3]).

→ *Takeaway for us:* the card-as-identity pattern is the one game-technical
that is genuinely *loved*, not tolerated. We already have it for the Role
Model (`RoleModelCard.tsx`) — and conspicuously *not* for the player, who is
a 104px text box.

### 1b. The reveal / "walkout" is the loved reward moment
The signature premium moment in FUT is the **walkout**: when a pack yields a
high-rated player, "the player appears on the screen in a dramatic manner,
often accompanied by special lighting effects" and players explicitly chase
"the dopamine rush of seeing a walkout flare"; the animation is "coded to
trigger specific effects based on the quality of the card" ([SuperCoinsy][r4];
[Recharge pack-opener writeup][r5]). This is the moment people remember and
share.

→ *Takeaway for us:* a genuine visual payoff on a milestone is not cheap —
it is the thing these products are *known* for. But per our philosophy it may
only ever be an **evidence reveal**, never a lootbox.

### 1c. Stat visualization that reads in 3 seconds
The football-card convention is a strict visual hierarchy: rating + name
first, photo for identity/energy, a row of secondary stats at the foot, all
"modular and consistent across players" so "fans get the core insight in 3
seconds or less" ([Medium card-UI case study][r6]). eFootball players talk
fluently in attribute numbers (speed 99, balance 91…) because the card made
them legible.

→ *Takeaway for us:* our objectives ("Log 3 real matches"), XP, and
composure can be **graphical readouts**, not `3/3` mono text — as long as
the numbers are the real graded ledger.

### 1d. What players actually hate (the cautionary half — this matters most)
This is the finding that reshaped my whole approach. Across FC 25, eFootball,
and Football Manager 26, communities use near-identical language to condemn
**graphical UI applied as decoration**:

- FC 25 console menus: *"menu so big and clunky… looks like it was meant for
  a mobile device… so much unnecessary clutter… three or four screens just
  to get anywhere"* ([r/FifaCareers][r7]).
- eFootball: menus called *"horrible in terms of usability and user
  experience… heavy and unresponsive"*; one of the most upvoted sentiments is
  *"Design-wise I couldn't care less, it looks simple… But using it is
  awful."* A widely-quoted insight: they *"want to make the same game on
  consoles and phones… lots of submenus are bad on small screens so they just
  made everything go to a new screen all the time. That is a terrible
  decision. The UI/UX can and HAS to be different."* ([r/eFootball][r8]).
- FM26: a Tile-and-Card overhaul branded *"designed like a cheap mobile
  game," "form over function," "the UI feels vibe coded,"* with a
  self-identified UX designer writing *"the UI is way worse [than the UX]…
  looks unfinished, no proper animations… no visualisation of this depth…
  awful design"* ([r/footballmanagergames][r9]; [thickaccent][r10]).

The FM team's own stated correction is telling and aligns with a premium
developer-tool feel: fix it by *"correcting unreadable font sizes and
defining our colour contrasts to stop information becoming illegible"* and
showing *"key general information early and often, with more detailed
information available when you dig deeper"* ([footballmanager.com][r11]).

→ *Takeaway for us:* the line between "premium game UI" and "cheap mobile
game" is **not how graphical it is — it is whether the graphics carry honest
information and depth.** Decoration-for-its-own-sake is the single fastest
way to make serious players despise the product. Our philosophy already
forbids it; the research explains *why the market does too*.

### Honest gaps in my research
- I could **not** find a clean, current, multi-source visual walkthrough of
  EA SPORTS FC 26/27 Console's *exact present home-tab structure* (tab names, nav order). My
  sources are strong on cards, reveals, and *sentiment*, weaker on a
  screen-by-screen map of the current FC 26/27 home. Treat any specific
  claim about FC 26/27's current tab bar as not directly verified by me.
- App-store screenshot galleries are images; I could not OCR them through the
  text fetcher, so I am not making pixel-level claims about either game's
  exact current composition.
- "Holographic Player Items / FUT Gallery" is from FC **27** pitch notes — a
  *forward* signal, not a current FC 26/27 feature. Framed as direction, not
  fact.

[r2]: https://www.charlieintel.com/efootball-version-1-0-0-patch-notes-season-1/171427/
[r3]: https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-fut-deep-dive
[r4]: https://supercoinsy.com/article/ea-sports-fc-25-walkouts
[r5]: https://www.recharge.com/blog/en-au/au/free-fc-26-pack-opener-ultimate-online-simulator
[r6]: https://medium.com/@akanshabatham44/how-i-gave-football-stats-a-visual-upgrade-with-modular-card-ui-b705e48a495b
[r7]: https://www.reddit.com/r/FifaCareers/comments/1hdimfb/why_are_the_new_menus_in_fc25_actually_cancerous/
[r8]: https://www.reddit.com/r/eFootball/comments/u72r2f/rant_post_about_ui_menus_and_their_outright_bad/
[r9]: https://www.reddit.com/r/footballmanagergames/comments/1oekgsv/the_current_ui_is_indefensible/
[r10]: https://www.thickaccent.com/2025/10/24/maze-of-screens-fm26-beta-sparks-backlash-over-controversial-new-ui/
[r11]: https://www.footballmanager.com/fm26/features/fm26s-reimagined-user-interface

---

## STEP 1.5 — The target feel

**Premium, open-source-tool precision first; game-technical language second.**
Think Linear / Vercel / a well-made instrument panel: confident, quiet,
everything earning its place — *then* layer the football-card identity, the
earned reveal, and the receipt-driven readout on top. It must read as
intentional to someone who has never played EA SPORTS FC 26/27 Console, and as *legit* to
someone who has. Crucially: **game-inspired, but never lootbox-coded.** A
reveal here means "your receipts cleared a stage," not "you pulled a shiny."

---

## STEP 2 — Honest diagnosis of the app as it stands

I read the screens rather than skimmed them. The true state:

### Where a stat / status / progress is still text, not a visual
- **The player's identity on the map** (`JourneyTab.tsx`) is a 104px box
  reading `61`, `PLAYER`, `PROSEASONACADEMY`. The *Role Model* gets a full
  foil collectible card; the *player* — the person the whole product is
  about — gets a label. This is the single biggest missed opportunity.
- **Objectives** render as a checkbox + `2/3` mono text. A graded target with
  a real numerator and denominator is the textbook case for a graphical
  readout, and it is rendered as the dullest possible string.
- **Stage progress** is a 4.5px bar + `37%`. The percentage is author-set
  (`progressPct`), not even live — and a bar that thin communicates nothing.
- **XP** accumulates invisibly in `progress.ts` (`state.xp`) and is shown
  nowhere as a visual. The reward line is `REWARD › +120 XP · SEE YOURSELF
  BADGE` — a sentence.
- **Badges** are bare strings (`'SEE YOURSELF BADGE'`). They are never
  rendered as objects. A badge is the archetypal thing that should *be* a
  visual.
- **The honesty check** (`HonestyBadge.tsx`) reports `12 WORDS (74 CHARS) ·
  REFLECTION VERIFIED` as a line of 9.5px mono. The one mechanism most
  central to the philosophy is communicated as a console log.

### Where the screen is static / lifeless
- **The stage-clear "reward"** (`CoachingScreen.tsx`, the scan status block)
  is a *text status flip*: the line changes to `STAGE n CLEARED — THE
  EVIDENCE HOLDS` and a `CheckRingIcon` swaps in, plus a sound. That is the
  entire payoff for the single most important moment in the product. There is
  no reveal, no seal, no sense that anything was *won*. Compared to the
  walkout these players are used to, it lands as a form submission.
- Most list screens (vault, journal, community) are static stacks. The only
  ambient motion in the product is the `LiveDot`, the `PulseRing` on the
  current node, the `Marquee` ticker, and the card sheens — good instincts,
  but narrow.

### Where "game HUD" was applied as decoration, not structure
- Honestly: **most of it.** The current "game feel" is a skin — green neon
  `#39FF6A`, hairline borders, monospace at 5–10px, a faint grid, a
  `LIVE FEED` pill. That palette and type are applied *over* what is, screen
  after screen, **a text feed.** The grid background and the glow do real work
  on the map; everywhere else they are chrome on a document. Per the research
  in 1d, "chrome on a document" is exactly what serious players call a
  *cheap mobile game*.

**One-line truth:** large parts of ProSeasonAcademy today are a well-written
monospace text report wearing a green stadium jacket. The information
architecture is honest; the *visualisation* of that information is almost
entirely absent. That is the gap this pass closes.

---

## STEP 3 — Design principles (each traces to philosophy OR research)

These are rules I will apply consistently and check my own work against.

**P1 — Receipt-first visualisation.**
*Every graphical readout is fed by the real, machine-graded ledger. No fill
is ever decorative.* An empty ring is an honest "0 receipts," never a loading
shimmer pretending progress exists.
— Philosophy: *"no painted percentages," "progress is earned from receipts."*
Research: the FM26/eFootball backlash against *"form over function."*

**P2 — The player is a card, not a label.**
*The player gets the same collectible-card treatment as the Role Model, and
the card only rises when evidence clears a stage.* The Role Model card is the
ceiling the player's card approaches — that is the whole "Your Journey vs The
Standard" idea made visible and personal.
— Philosophy: *"your journey is the evidence; the Standard is the
benchmark."* Research: §1a, the card as the unit of identity. (And it is
already half-built — `RoleModelCard` is the craft reference.)

**P3 — The earned reveal.**
*Every stage clear gets a genuine visual payoff — but it is an evidence
reveal, not a lootbox.* It shows the vault receipts that cleared it, the badge
sealing, and the card rating stepping up, because that is what actually
happened. No confetti for nothing; no celebration the receipts don't
underwrite.
— Philosophy: *"STAGE n CLEARED — THE EVIDENCE HOLDS"* (the product's own
words). Research: §1b, the loved walkout — recast honestly.

**P4 — Mechanics get diagrams before paragraphs.**
*Every explained mechanic or Standard pillar gets a precise schematic before
any block of body copy.* Premium-open-source feel = an instrument diagram,
not decorative art.
— Philosophy / `MATCH_SCAN_RITUAL`: *"a silent animated board explaining the
concept."* Research: §1c, "core insight in 3 seconds."

**P5 — Quiet, instrument-like motion.**
*Motion is reserved for state change and live data — a pulse on the current
node, a ring filling as receipts land, a sheen on the card.* It signals
"alive and tracking you," never "look at me." No heavy, unresponsive
choreography.
— Philosophy: *"nothing is bombarded, nothing is forced."* Research: §1d,
communities hate "heavy/unresponsive" menus; FM26's *"no proper animations,
no visualisation of this depth."*

**P6 — Honesty is visible, not just audited.**
*The honesty check becomes a calibrated visual meter, not a line of console
text.* The product's most distinctive mechanism deserves its most distinctive
visual.
— Philosophy: `honestyGuard.ts`, *"BE HONEST · NO EXCUSES, NO AI WILL EVER
WRITE THIS FOR YOU."* (Already half-built as `HonestyBadge`.)

---

## STEP 4 — Applied (screen by screen)

Implemented in this pass. Each change names the text-first element it
converts and why.

- **New design-system layer** (`src/theme.ts` expanded; new components
  `PlayerCard`, `StatReadout`, `BadgeMark`, `HonestyMeter`, `StageClearedSheet`;
  new `src/data/playerCard.ts`). The system, not a reskin.
- **JourneyTab** — the player text-box → `PlayerCard` (P2); objective
  `2/3` rows → `StatReadout` rings (P1); the `37%` author-set bar → a live
  evidence ring (P1); the `+120 XP · BADGE` sentence → a `BadgeMark` medallion
  + XP ring (P1/P2); the ledger cards get micro stat-bars.
- **The reward moment** — `StageClearedSheet`, wired into the grade path in
  `CoachingScreen`, fires on a genuine pass: receipts, badge seal, rating step
  (P3).
- **HonestyMeter** — the reflection verification line → a calibrated meter
  (P6), drop-in compatible with `HonestyBadge`.

What this pass deliberately does **not** touch, and why: the Mirror Session,
Baseline Week, Match Vault, Loss Journal and Community screens. They are the
*next* application of this same system — applying it to one screen
deliberately (per the brief's "screen by screen, not batch-applied") is more
honest than smearing a half-considered template across all of them. The
system is built so those screens adopt it by composition, not rework.

---

## STEP 5 — Self-check (re-run of STEP 2 against the new output)

Honest verdict, holding the work to the same standard I used to diagnose it.

**What genuinely moved from text → earned visual:**
- Player identity: 104px text box → full collectible `PlayerCard` (rating + ascent ring +
  six receipt-coloured stats). The single biggest gap, closed.
- Objectives: checkbox + `2/3` → `EvidenceRing` driven by the real graded count.
- Stage progress: an *author-set* `progressPct` bar (a painted number) → a `EvidenceMeter`
  fed by the live met-objective ratio. This actually *fixed* an honesty bug, not just dressed it.
- Reward: `+120 XP · SEE YOURSELF BADGE` sentence → a sealed/unsealed `BadgeMark` + XP box.
- Honesty: console-text `HonestyBadge` → calibrated `HonestyMeter` (MomentReview + LossJournal).
- Stage clear: text status flip → `StageClearedSheet` earned reveal (seal + receipts + rating step).

**Where my own output still leans, said plainly:**
1. *The six stat formulas are my design decision, not a pre-existing product definition.* The
   rating is unimpeachably honest (stage-gated). The stats are honest-by-construction — every
   input is a real receipt — but the *mapping* (FORM = win rate, DEFENCE = ga/game, …) is mine
   and tunable. The founder should own these weightings; they are in `playerCard.ts`, one file.
2. *One affective flourish I'll own:* the burst ring behind the sealing badge in the reveal. It is
   the single purely-affective element. Everything else in the reveal is underwritten by evidence
   (the receipts are the actual scan values; the +6 is the real stage delta; the ascent is real).
3. *I have NOT seen this paint on a device.* Verified by `tsc` (clean) + the full test suite
   (passing) + a faithful static reference render (`ui/design-reference.html`). On-device
   specifics I have not confirmed: the count-up/sheen timing on Android, exact monospace metrics,
   and that the new `PlayerCard` hero doesn't crowd the Journey scroll. That is a real gap — flag it.

**Scope I did not pretend to cover:** the Mirror Session, Baseline Week, Match Vault, Community,
Settings and Home screens are still largely the text-feed-with-green-glow diagnosed in Step 2.
This pass built the *system* and applied it deliberately to one screen + the reward moment + two
honesty surfaces, per the brief's "screen by screen, not batch-applied." Those screens adopt the
system by composition next — `StatReadout`, `BadgeMark`, `HonestyMeter`, `PlayerCard` are all
built to be dropped in. The `StandardPanel` is still editorial prose; that's correct (P4 keeps
prose as prose) but it's the next candidate for an illustrated your-journey-vs-standard diagram.

**Would this survive a design review?** The principles are defensible and each traces to the
philosophy or the research; the honesty is real (the progress fix, the stage-gated rating, the
earned-not-lootbox reveal); the color semantics were corrected mid-pass to stop shaming thin
evidence. The honest risks are the stat-formula ownership, the one affective flourish, and the
lack of on-device verification. None of those are hidden; all are named above.
