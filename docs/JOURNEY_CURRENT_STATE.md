# ProSeason Academy — The Journey
## Current application documentation

**Document status:** Updated for the MIRROR DIRECTION (01 Aug 2026). The sections below that describe the two coach-specific journeys (**The Ashfault Ascent** / **The Merehaven Way**) are now **historical** — see §0 for the applied direction and `../MIRROR_DIRECTION.md` for the full record.
**Repository:** `iyiolakayodeoni-arch/ProSeasonAcademyV1.3`  
**Prepared:** 31 July 2026 (UTC) · updated 01 Aug 2026  
**Scope:** The Journey as it is currently implemented in the application, including the map, stages, objectives, Match Scan / Mirror Session, coach room, progression, Role Model finish, storage, access rules, and known implementation notes.

---

## 0. The MIRROR DIRECTION — applied 01 Aug 2026

The product direction (see `../MIRROR_DIRECTION.md`) replaced the two coach-specific
fictional journeys with **ONE universal player Journey** — the same six development
chapters for every member:

1. **SEE YOURSELF** — truthful baseline, repeated behaviour
2. **CONTROL YOURSELF** — what pressure does to your decisions
3. **READ THE GAME** — patterns, danger, space, tempo, context
4. **BUILD DISCIPLINE** — awareness becomes repeatable behaviour
5. **PERFORM UNDER PRESSURE** — the work tested in competition
6. **PROVE IT** — review the accumulated evidence, set the next standard

The coach remains the voice, guide and accountability presence — the lock-in, film room,
banter and Role Model card are unchanged — but **no player receives a different
curriculum based on the coach they pick.** In parallel runs **THE STANDARD** (`src/data/standard.ts`),
the benchmark journey of a fictional composite elite Role Model, revealed chapter by
chapter as the player advances ("Your Journey is the evidence. The Standard is the
benchmark.").

The stage-room **Match Scan** is superseded as the MAIN QUEST by **THE MIRROR SESSION**
(`src/data/mirrorSession.ts` + `src/screens/MirrorSessionScreen.tsx`): intention before
the match → half-time checkpoint → full-time reflection before the recording → player-led
moment division → per-moment review → the versions compared ("which version is closest to
the evidence?") → one lesson sworn into THE THREAD. The grading engine is unchanged — a
completed session logs a real match to the vault and the stage is graded from the evidence.
The legacy scan remains as the "QUICK MATCH SCAN" secondary path.

The historical sections below (§1 onward) describe the retired two-coach journey system
and are kept for the record.

---

## 1. What the Journey is

The Journey is ProSeason Academy's structured player-development path. It is not a conventional linear lesson list or a timer-based campaign. It is a six-stage road built around a player's own matches:

1. The player chooses a coach.
2. The player completes the five-match Baseline Scan and seals a player profile.
3. The Journey opens at Stage 1.
4. Each stage presents a set of measurable objectives.
5. The player enters the stage room, receives a coach briefing and an optional live-feed mechanic, then plays a real match.
6. The player returns to complete the Match Scan: score, match context, key moments, composure, reflection, and a signed lesson.
7. The app grades the objectives against the Match Vault and Loss Journal.
8. Only a passing scan unlocks the next stage.
9. The player carries the lesson from one scan into the next match as **THE THREAD**, the next session's Main Quest.
10. Clearing all six stages opens the coach's Role Model finish: a story and mirror, not a route to copy.

The Journey's central promise is that progress is earned from evidence in the player's own games. A stage cannot be cleared by simply opening it, waiting, reading the coach content, or pressing a completion button.

> **Core loop:** Play → scan the moments → answer honestly → write the lesson → carry it forward → prove the stage objectives → unlock the next node.

---

## 2. Entry point and pre-Journey setup

### 2.1 Coach selection

The Journey is coach-specific. The current application includes two coaches:

| Coach | Role | Philosophy | Journey road |
|---|---|---|---|
| **Chinedu Okafor** | The Disciplinarian | “Comfort is the enemy. We train until losing hurts more than the work.” | **The Ashfault Ascent** |
| **Obinna** | The Motivator | “Calm is trained, not soft. We finish the un-fun parts — together.” | **The Merehaven Way** |

The selected coach determines the Journey's fiction, stage names, mentors, quotes, objective sets, coach voice, scan copy, rewards, and Role Model story. The six-node map geometry is shared by both coaches, but the meaning and curriculum are different.

### 2.2 Baseline Scan

Before the Journey, the player completes a five-match interview called the **Baseline Scan**. It establishes the player's starting profile rather than completing a Journey stage.

For each baseline match, the player records:

- score and result;
- composure/head state;
- key moments and responses;
- an answer to the coach's question.

Baseline matches are also written into the real Match Vault. The baseline does **not** create a Journey lesson/thread. Lessons begin at Stage 1.

When five matches are complete, the app seals a profile containing:

- player handle and coach;
- W/D/L record;
- goals for and against;
- average composure;
- a starting mental tier;
- coach read;
- stated ambition;
- up to three recurring tendencies from the tagged moments.

The mental tiers are derived from average composure:

| Average composure | Baseline tier |
|---:|---|
| 4.4+ | ICE VEINS |
| 3.6–4.3 | STEADY HANDS |
| 2.8–3.5 | WORKING HEAD |
| 2.0–2.7 | HOT HEAD — REPAIRABLE |
| Below 2.0 | VOLCANO — FOR NOW |

The Baseline is therefore the starting profile; the Journey is the continuing training climb.

---

## 3. Journey map and interface

The Journey tab is titled **YOUR JOURNEY** and displays **WALKING [COACH]'S PATH**. The header shows the season and current position, for example `SEASON 1 · 1/6`.

The map contains:

- the Role Model card at the top;
- a winding S-curve from the player card at the bottom to the coach anchor;
- six numbered stage nodes;
- a glowing path through the current stage;
- a dashed, dimmed path for future stages;
- footprint dots along the locked route;
- a pulsing **CURRENT** node;
- check-marked cleared nodes;
- locked nodes with lock icons;
- stage names alongside each node;
- a player card labelled `YOU — STAGE 0` in the underlying map data.

The player card rating starts at 61 and is displayed as `61 + completed stage count`. It is a visual Journey indicator, not a competitive rating calculation.

### Stage states

- **Current:** the next stage the player can enter. It pulses and is labelled `CURRENT`.
- **Cleared:** the stage has passed and awarded XP/badge. It can be replayed as a film room, but replaying does not pay XP or badges a second time.
- **Locked:** a later stage. Tapping it selects the node and shows: “Finish Stage N first. The path only moves forward — no skipping, no shortcuts.”
- **Paid/entitlement locked:** a stage may also be unavailable because of the access tier, even if it is the current stage. The Journey shows the applicable pass screen rather than opening the room.

Tapping an open node zooms into its stage room. Tapping the Role Model card opens the finish/story sheet; it does not bypass the current stage.

The Journey tab also exposes two source ledgers:

- **Match Vault:** every logged match and W/D/L totals;
- **Loss Journal:** reflective lines used by some stage objectives.

These are not decorative statistics. The Journey reads them live when calculating objective progress.

---

## 4. Season 1 structure

The current Journey data defines **Season 1** with **six stages per coach**. The map finishes at the coach's Role Model card.

### Important current-state note

The coach selection cards still contain legacy metadata such as `12 STAGES · CONSOLE PRO` for Chinedu and `10 STAGES · CONSOLE PRO` for Obinna. The active Journey curriculum and map currently render **six stages for both coaches** (`totalStages: 6`). The Journey implementation is therefore six stages, despite those older card labels.

---

# 5. Chinedu's Journey — THE ASHFAULT ASCENT

**Arc:** `CINDER ROW TO THE IRON WHISTLE — THE CLIMB THAT FORGED THE DISCIPLINARIAN`

The Ashfault Ascent is a climb out of Cinder Row through six fictional places. Its supporting voices are Mama Ukae, Drummer Ezra, Foreman Baba Salt, Locksmith Venn, Night-Watch Kettle, and Old Whistle Onye. These places and characters are fictional academy mythology, not real clubs, cities, stadiums, or footballers.

## Stage 1 — CINDER ROW

**Tagline:** Where he learned that space is borrowed and paid back in sweat  
**Mentor:** Mama Ukae  
**Estimated time:** 2–3 days  
**Reward:** **+120 XP** · `CINDER ROW BADGE`

### Objectives

1. Win **2 ranked matches**.
2. Win once using **at least 1 mechanic**.

### Stage meaning

Cinder Row is the beginning of the discipline arc: earn space through effort, establish a ranked-match habit, and use a learned mechanic in a real win.

### Coach story

Mama Ukae ran the evening games from her shopfront step. The stage asks for two clean ranked wins and treats the work itself—not talk—as the first receipt.

---

## Stage 2 — THE LEAN-TO

**Tagline:** A broken roof teaches shape: stand where the rain is not  
**Mentor:** Drummer Ezra  
**Estimated time:** 3–4 days  
**Reward:** **+150 XP** · `LEAN-TO BADGE`

### Objectives

1. Concede **1 or fewer goals in 3 matches**.
2. Keep **1 clean sheet**.

### Stage meaning

This is the defensive shape and discipline stage. The player is asked to stop giving away cheap goals before the attacking climb continues.

### Coach story

Drummer Ezra teaches that a team standing correctly sounds tight; a team chasing sounds broken. The player learns to stand in the right place instead of reacting late.

---

## Stage 3 — THE SALTPITS

**Tagline:** The grind — cramps first, wages later  
**Mentor:** Foreman Baba Salt  
**Estimated time:** 4–5 days  
**Reward:** **+180 XP** · `SALTPITS BADGE`

### Objectives

1. Win **3 ranked matches**.
2. Write **2 honest lines in the Loss Journal**.

### Stage meaning

This stage connects competitive repetition with honest reflection. Winning is one part; understanding what the work cost is the other.

### Coach story

Foreman Baba Salt's lesson is that ranked work is a contract: results first, then an honest ledger of what the player learned or paid for them.

---

## Stage 4 — LONG CORRIDOR

**Tagline:** Patience — a lock opens tooth by tooth, never all at once  
**Mentor:** Locksmith Venn  
**Estimated time:** 4–5 days  
**Reward:** **+200 XP** · `CORRIDOR BADGE`

### Objectives

1. Reach **65% or higher pass accuracy in 2 matches**.
2. Bank **1 win while leading at 75 minutes**.

### Stage meaning

The player must combine patient possession with game management: pass accurately, then close out a lead rather than allowing the match to become chaotic.

### Coach story

Locksmith Venn's principle is incremental progress: pass, pass, wait, pass; then shut the door once the lead is established.

---

## Stage 5 — RED LANTERN END

**Tagline:** Late drama — when their legs start negotiating, yours vote  
**Mentor:** Night-Watch Kettle  
**Estimated time:** 5–6 days  
**Reward:** **+240 XP** · `RED LANTERN BADGE`

### Objectives

1. Win with the deciding goal after **60 minutes**.
2. Score **4 total goals against LOW BLOCK opponents**.

### Stage meaning

This is the late-game and low-block challenge: continue working after the opponent tires and learn to break a deep defensive shape.

### Coach story

Night-Watch Kettle represents the hour when other players sit down. The stage rewards late winners and persistent attacking against a parked defence.

---

## Stage 6 — THE IRON WHISTLE

**Tagline:** Finals mentality — full time when the climb is done, not before  
**Mentor:** Old Whistle Onye  
**Estimated time:** 6–7 days  
**Reward:** **+300 XP** · `THE IRON WHISTLE`

### Objectives

1. Win **4 ranked matches**.
2. Keep **1 clean sheet while obeying the no-sprint rule**.
3. Bank **2 wins while leading at 75 minutes**.

### Stage meaning

The final stage combines ranked consistency, defensive control, and closing discipline. It is the full Ashfault test.

### Coach story

Old Whistle Onye represents full time: the player must not assume the climb is finished before the evidence says it is.

### Total possible Ashfault reward

**1,190 XP** across six stages.

---

# 6. Obinna's Journey — THE MEREHAVEN WAY

**Arc:** `THE HARBOUR ROAD TO CALM WATER — HOW THE ICEMAN LEARNED HIS TEMPERATURE`

The Merehaven Way is a harbour road to Calm Water. Its fictional supporting voices are Fisher-boy Idri, Boatman Sola, Dockmaster Yew, Fogwatcher Nne, Light-keeper Ama, and Elder Mere.

## Stage 1 — TIDE FLATS

**Tagline:** First touch — the tide gives minutes, not hours  
**Mentor:** Fisher-boy Idri  
**Estimated time:** 2–3 days  
**Reward:** **+120 XP** · `TIDE FLATS BADGE`

### Objectives

1. Reach **60% or higher pass accuracy in 2 matches**.
2. Win **1 ranked match**.

### Stage meaning

The first Merehaven stage builds calm first touch and basic ranked execution. The player learns to look up, make the ball move, and not chase every moment.

### Coach story

Fisher-boy Idri's tide gives minutes, not hours: use the available time well and let the match come back to the player.

---

## Stage 2 — LANTERN CANAL

**Tagline:** Rhythm — passing that stops feeling like a pattern  
**Mentor:** Boatman Sola  
**Estimated time:** 3–4 days  
**Reward:** **+150 XP** · `CANAL BADGE`

### Objectives

1. Reach **70% or higher pass accuracy in 2 matches**.
2. Win once using **at least 1 mechanic**.

### Stage meaning

The player develops passing rhythm and learns to apply the current mechanic without forcing it.

### Coach story

Boatman Sola teaches that the boat should finish its thought. Patience through bends becomes a passing habit and a controlled use of the mechanic.

---

## Stage 3 — STILLWATER DOCKS

**Tagline:** Patience vs the block — still water moves what storms cannot  
**Mentor:** Dockmaster Yew  
**Estimated time:** 4–5 days  
**Reward:** **+180 XP** · `STILLWATER BADGE`

### Objectives

1. Score **3 total goals against LOW BLOCK opponents**.
2. Concede **1 or fewer goals in 2 matches**.

### Stage meaning

The player must patiently dismantle a low block without sacrificing defensive control.

### Coach story

Dockmaster Yew compares the low block to a dock wall: move it patiently instead of trying to overpower it in a storm.

---

## Stage 4 — THE FOG GATE

**Tagline:** Composure in chaos — when you cannot see, steer by feel  
**Mentor:** Fogwatcher Nne  
**Estimated time:** 4–5 days  
**Reward:** **+200 XP** · `FOG GATE BADGE`

### Objectives

1. Write **2 honest lines in the Loss Journal**.
2. Bank **1 win while leading at 75 minutes**.

### Stage meaning

This stage turns difficult moments into reflection and controlled finishing. The player must name the chaos and still close a game calmly.

### Coach story

Fogwatcher Nne counts ships by sound when visibility fails. The player likewise learns to make a useful read when a match becomes hard to interpret.

---

## Stage 5 — HARBOUR LIGHTS

**Tagline:** Vision — see the whole pitch the way a lighthouse sees the bay  
**Mentor:** Light-keeper Ama  
**Estimated time:** 5–6 days  
**Reward:** **+240 XP** · `HARBOUR LIGHTS BADGE`

### Objectives

1. Win **3 ranked matches**.
2. Win with the deciding goal after **80 minutes**.

### Stage meaning

This is the late-game vision stage: anticipate the decisive moment and execute when the match is close to full time.

### Coach story

Light-keeper Ama sees weather before sailors feel it. The player is asked to read the whole pitch and act before the tired defence fully breaks.

---

## Stage 6 — CALM WATER

**Tagline:** Mastery — the opponent supplies the waves; you remain the temperature  
**Mentor:** Elder Mere  
**Estimated time:** 6–7 days  
**Reward:** **+300 XP** · `CALM WATER BADGE`

### Objectives

1. Reach **75% or higher pass accuracy once**.
2. Keep **1 clean sheet**.
3. Bank **2 wins while leading at 75 minutes**.

### Stage meaning

The final Merehaven stage combines passing quality, defensive calm, and close-out discipline. Mastery is represented by remaining calm while the opponent supplies the chaos.

### Coach story

Elder Mere's final lesson is temperature: champions may look slow because they do not let the opponent determine their internal state.

### Total possible Merehaven reward

**1,190 XP** across six stages.

---

## 7. How objectives are actually measured

Every objective has a machine-readable check. The app calculates live progress using the Match Vault and Loss Journal, then uses the same calculation during the stage scan.

### Match fields used by the grader

Each Match Vault entry may contain:

- goals scored and conceded;
- mode: `RANKED`, `CASUAL`, or `TOURNAMENT`;
- opponent style: `LOW BLOCK`, `HIGH PRESS`, `COUNTERS`, `POSSESSION`, `LONG BALL`, or `HARD TO TELL`;
- pass accuracy, if entered;
- whether the no-sprint rule was kept;
- number of taught mechanics used;
- whether the player was leading at 75 minutes;
- when the winning goal was scored: before 60, 60–79, or 80+;
- composure rating from 1 to 5;
- the player's match note.

### Objective rules

| Objective type | How it is counted |
|---|---|
| Ranked wins | Match result is W and mode is RANKED. |
| Wins using mechanics | Match result is W and `mechanicsUsed` meets the stage minimum. |
| Pass accuracy | Matches with a recorded pass accuracy at or above the threshold. |
| Concede maximum | Matches with goals conceded at or below the threshold. |
| Clean sheet | Matches with 0 goals conceded. If no-sprint is required, the match must also have `noSprint = true`. |
| Goals vs style | All goals scored in matches whose opponent style matches the target style. It is cumulative goals, not number of matches. |
| Decider after 60 | Wins whose decisive goal was recorded as `AFTER 60` or `AFTER 80`. |
| Decider after 80 | Wins whose decisive goal was recorded as `AFTER 80` only. |
| Close-out | Wins where the player marked that they were leading at 75 minutes. |
| Loss Journal | Current total number of journal entries, regardless of which match produced them. |

A stage passes only when **every objective** is met. The scan does not require the latest match alone to satisfy every objective; it grades the accumulated ledger. This makes earlier qualifying matches count toward the stage.

### Honest-system boundary: "The Chinedu Way"

The application does not have an official FC Mobile match feed. Match data and key moments are entered manually by the player following **The Chinedu Way**:
1. **Pen to Paper:** *"There is a special connection a biro has to a book that cannot be typed."* Players screen record their match, watch their tape back, and pen the unusual and key make-or-break moments on paper with a biro first.
2. **24–30 Minute Cool-Down:** Players let their thoughts settle for 24–30 minutes after the match before typing their written answers into the Academy database.
3. **The 7-Day Cadence (3 Matches → Rest 1 → Match 4 → Rest 2 → Match 5 Finale):**
   - **Days 1–3:** Matches 1, 2, and 3 (building momentum).
   - **Day 4:** Rest Day 1 (mid-week rest & reflection on matches 1–3, no match played — respecting that players have a life outside the pitch).
   - **Day 5:** Match 4.
   - **Day 6:** Rest Day 2 (pre-finale preparation & reflection, no match played).
   - **Day 7:** Match 5 (The Finale) + Ambition & Profile Card seal.
4. **Philosophy:** In a world looking for the easy way out, the hard way is the easy way, and the easy way is the hard way. Tech is meant to elevate and not make you dormant. That is the Chinedu Way.

---

## 8. The stage room: what happens after opening a stage

The stage room is a coach-led film-room screen with two quests.

### 8.0 "The Chinedu Way" in Our Own Path (The Journey)

The entire universal player Journey (our own path across the 18 stages, not the role model's path) is walked using **The Chinedu Way**:
- **Stage Room (`CoachingScreen.tsx`):** Displays **The Chinedu Way: How You Work In Our Path** card right above the Main Quest, instructing players to screen record, pen to paper with a biro first, cool down for 24–30 minutes, and type their truth into the database.
- **Coach Briefings (`coaching.ts`):** Both Coach Chinedu and Coach Obinna remind the player that *"there is a special connection a biro has to a book that cannot be typed"* and *"the hard way is the easy way; tech is meant to elevate."*
- **Main Quest (`MirrorSessionScreen.tsx`) & Stage Scan (`StageScanSheet.tsx`):** Every review and checkpoint prompts the player to answer from their immediate memory or paper notes before typing into the app.

### 8.1 Coach briefing

The room includes:

- coach identity and online status;
- a one-way coach chat thread;
- a playable voice note, normally around 42 seconds;
- stage-specific greeting, mechanic explanation, humour, and closer;
- the stage's duration and identity;
- a clear statement that the Match Scan is the Main Quest.

The coach voice differs:

- **Chinedu:** direct, strict, disciplined, with blunt humour.
- **Obinna:** calm, reassuring, patient, with water/harbour imagery.

### 8.2 Main Quest — THE THREAD

The Main Quest is the player's own lesson. After each completed scan, the player writes one lesson of at least 20 characters. That lesson is sworn into the lesson thread and becomes the next session's carried quest.

At the next stage-room scan, the app shows the carried lesson and asks whether it:

- **held today**, or
- **broke today**.

A verdict note of at least 8 characters is required. The app then records the new lesson. This creates a loop of evidence rather than a one-off journal prompt.

Before the first stage scan, there is no carried lesson. The room explains that the first scan creates the thread.

### 8.3 Side Quest — today's mechanic

The Side Quest is a separate, optional mechanic sourced from the approved live MetaBot feed. It is deliberately not the same thing as the stage's Main Quest. The player may study and try it, but the central Journey remains the player's own match, moments, and lesson.

The side-quest card can include:

- mechanic name and headline;
- why the mechanic matters after the current patch;
- three instructional tiles;
- a coach rule;
- animated in-app clip preview and duration;
- source attribution and external link;
- an in-app blog/lesson sheet;
- mechanic-specific scan targets.

The current checked-in feed is marked `FC Mobile 26` and includes fresh items such as **THE LANE CHANGE**, **THE TACTIC WINDOW**, **THE SECOND BALL**, and **THE DRIVEN PASS**. The stage claims the newest eligible fresh item not already assigned to another stage. Once claimed, that stage keeps the item until it becomes stale. If the source is patched out, the UI explicitly flags it and waits for a fresh approved replacement rather than silently teaching outdated material.

The side mechanic's own scan targets are shown as coach watch-list items, but they do not replace the stage objective checks in the Journey data.

---

## 9. The Match Scan ritual

The Match Scan is the gate between playing and stage progression.

### Part 1 — The Tape / numbers

The player records or confirms:

- score for and against;
- match result, derived as W/D/L;
- mode;
- opponent style;
- pass accuracy, if available;
- no-sprint rule;
- taught mechanics used;
- decisive-goal window, if a win;
- whether the player was leading at 75 minutes, if a win.

The score stepper accepts 0–9 goals. The Eye can prefill the score and goal markers on supported Android builds; the player can swap sides if the detected sides are reversed.

### Part 2 — Key Moments

The scanner focuses on moments, not just the score. The player tags the match's make-or-break moments, including goal events when The Eye detected them, and adds an answer to each prompt. The app requires completed moment responses rather than a scoreline-only submission.

### Part 3 — The Mind

The player selects one of five head states:

1. TILTED
2. SHOOK
3. OKAY
4. CALM
5. ICE IN VEINS

The coach then asks a stage- and result-sensitive soul question. The answer must be at least 12 characters. The app explicitly does not generate this answer for the player.

### Part 4 — The Lesson / Main Quest

The player writes a signed lesson of at least 20 characters. The lesson is capped at 140 characters in the input and is stored with the match note. If a previous thread exists, the player must also submit the held/broke verdict and an 8-character minimum explanation.

When sealed, the match is added to the Match Vault and the lesson becomes the next thread entry. The room then shows:

- sealed result and score;
- head-state label;
- the new Main Quest lesson;
- whether the previous lesson held or broke;
- a coach story beat based on the scoreline;
- a coach read tied to the result and mechanic.

The player can then choose **GRADE THE VAULT — RUN THE SCAN**.

### Privacy behavior shown in the room

The room tells the player that any raw video stays on the phone and is discarded when the session seals. The Academy keeps the tags, answers, and lesson, not the raw match video.

---

## 10. Stage grading and unlocking

The Match Scan has four states:

1. **Armed** — waiting for a match or an existing vault to be graded.
2. **Scanning** — the app reads the ledger for approximately 1.8 seconds, or approximately 0.9 seconds immediately after a newly logged in-room match.
3. **Passed** — every stage objective is met.
4. **Failed** — one or more objectives are still unmet.

The UI shows each objective with its observed count and target. A failed objective is identified, and the player can run the session again after adding more qualifying evidence.

On pass:

- the stage is recorded as completed;
- the stage XP is awarded;
- the stage badge is added;
- the next node becomes available;
- the map's lit path moves forward;
- a success sound/whistle plays;
- the player can return to the map.

On failure:

- the stage remains open/current;
- no XP or badge is paid;
- the player is told to run it back;
- existing vault matches can be graded without logging another match.

A stage completion is idempotent. Replaying a cleared stage does not award the same XP or badge twice.

The path only moves forward. A later stage cannot be opened before the preceding current stage is cleared, even if the player taps its map node.

---

## 11. Rewards, progression, and persistence

### XP and badges

Each stage gives XP and one badge. The six stages total 1,190 XP for either coach:

| Stage | XP |
|---:|---:|
| 1 | 120 |
| 2 | 150 |
| 3 | 180 |
| 4 | 200 |
| 5 | 240 |
| 6 | 300 |
| **Total** | **1,190** |

Progress stores the stage's lesson content ID as traceability. This lets the app identify if a live mechanic later becomes stale.

### Per-coach ledgers

Journey progress is persisted separately for each coach. The storage key includes the coach ID, so Chinedu and Obinna cannot share completed stages, XP, badges, or lesson references. Switching coaches gives the player that coach's own ledger.

The ledger survives force-quitting the app. Deleting the account / using the destructive reset path wipes the ledger.

Stored progress includes:

- current stage;
- completed stage records and timestamps;
- XP;
- badges;
- stage-to-live-content references.

Match Vault and Loss Journal are also persisted locally and can sync to the backend when available.

---

## 12. Access and paid stages

The Journey uses the application's single access ladder:

- **FREE** — default opening access;
- **ACADEMY** — opens the middle/full Journey according to the configured rules;
- **PRO** — required for summit stages beyond the configured middle threshold.

The Journey requests access rules from the backend. Its fallback values in the current client are:

- first **2 stages free**;
- stages through **6** available at the middle tier;
- later stages require PRO;
- configurable unlock pricing/entitlements are supplied by the backend.

The effective tier is configured server-side, so the UI should be treated as displaying the current account's live rules rather than hardcoding a single price or currency. The same ladder is intended across countries; only the currency/payment handling changes.

When a selected stage requires access, the Journey displays:

- which stages are free;
- the required tier;
- the player's current tier and days remaining when available;
- a pass CTA;
- the explanation that an Academy pass opens the Journey for the selected period, while summit stages are PRO.

Stage access and progression are separate checks: owning access does not automatically clear a stage, and clearing a stage does not bypass a required entitlement.

---

## 13. The Role Model finish — Stage 7 / THE FINISH

The map labels the coach card as the next stop after the six-stage climb. The Role Model card is described in the app as **STAGE 7 · THE FINISH**, although `totalStages` remains six because the card is the finish, not an objective-bearing stage.

### Before all six stages are cleared

The card is sealed. The player can read a teaser and the contract of the finish, but the full story is locked. The UI makes clear that the card is not a shortcut and that six stages must be completed first.

The finish principle is:

> **Mirror, not map.**

The player's coach is proof that a road can lead somewhere; the player's task is not to copy that road.

### After all six stages are cleared

The full Role Model story opens in three beats, followed by a sign-off. The sheet also shows the player's own receipts:

- matches logged;
- W/D/L;
- lessons sworn;
- lessons held;
- lessons broken;
- XP banked.

The app then presents the next locked **Legend Path** concept. The current copy describes two possible future directions:

1. **The Road to ProSeason FC** — guidance on getting into ProSeason in FC.
2. **Coach the Next Generation** — an optional paid coaching/community direction, explicitly described as voluntary, with no recruitment or pyramid structure.

That Legend Path is not implemented as another open Journey curriculum in the current six-stage map; it is a locked future-facing finish area.

---

## 14. What the Journey does not do

- It does not unlock stages because time passed.
- It does not unlock stages merely because the player watched a lesson clip.
- It does not use the live mechanic as a substitute for the Main Quest.
- It does not let the player skip stage order.
- It does not let replaying a cleared stage pay XP again.
- It does not have AI write the player's soul answer or lesson.
- It does not claim that raw match video is uploaded as part of the scan.
- It does not silently continue teaching a patched-out mechanic; stale content is flagged.
- It does not merge progress between the two coaches.
- It does not currently render the old 10- or 12-stage coach-card metadata as the actual active map length.

---

## 15. Source-of-truth files for maintainers

The current Journey behavior is distributed across these implementation files:

| File | Role |
|---|---|
| `src/data/journey.ts` | Season definitions, map coordinates, stage names, objectives, quotes, rewards, durations. |
| `src/screens/tabs/JourneyTab.tsx` | Map, node states, stage detail card, ledgers, access wall, Role Model entry. |
| `src/screens/CoachingScreen.tsx` | Stage room, coach chat, live side quest, Main Quest thread, scan launch, pass/fail UI. |
| `src/screens/StageScanSheet.tsx` | Four-part Match Scan ritual and match/lesson submission. |
| `src/hooks/useMatchScan.ts` | Stage grading state machine and the all-objectives-required pass rule. |
| `src/data/matches.ts` | Match Vault schema and objective-counting logic. |
| `src/data/progress.ts` | Per-coach Journey ledger, XP, badges, completion persistence. |
| `src/data/coaching.ts` | Live lesson resolution, coach copy, scan prompts, score reads. |
| `src/data/liveFeed.json` | Checked-in approved mechanic feed and side-quest content. |
| `src/data/lessonThread.ts` | Carried lessons and held/broke thread history. |
| `src/data/journal.ts` | Loss Journal entries used by Journal objectives. |
| `src/screens/RoleModelSheet.tsx` | Finish story, receipts, and Legend Path teaser. |
| `src/data/baselineScan.ts` | Five-match pre-Journey profile and starting card. |

---

## 16. One-sentence explanation for players

**The Journey is a six-stage, coach-specific climb where your own logged matches, honest moment answers, and signed lessons—not a timer or a shortcut—are what move you from the foot of the road to the Role Model at the finish.**
