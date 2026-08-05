# FC 26 Console/PC UI — Verified Research → ProSeasonAcademy Application

> Research target: **EA SPORTS FC 26**, the current console/PC release (PS5, Xbox Series X|S,
> Windows). Released 25–26 September 2025; it is the current title as of August 2026 (FC 27 has
> sources — EA's own Pitch Notes, launch/review coverage, and current community discussion —
> cross-checked across multiple sources. Where a detail is from a single source or could not be
> confirmed, it is flagged rather than asserted.

---

## 1. Navigation structure

**Verified (multiple sources):**
- EA reworked the **FUT Play Menu "from the ground up"** in FC 26, combining the FC 25 layout
  with a new **grid-style organisation** ([realsport101][rs101-ui], [vocal.media][vocal-ui],
  [EA FUT Deep Dive][ea-fut-dd]).
- Top-level navigation is a set of **tabs switched with bumpers/triggers** (L1/R1, LB/RB) for
  near-instant movement: *For You / Online / Play vs CPU / Play vs Friend*, plus up to **6 dynamic
  Live Events tabs** ([EA FUT Deep Dive][ea-fut-dd], [realsport101][rs101-ui]).
- **"For You"** is a personalised hub with three categories — **New / Continue Playing / Upcoming**
  — surfacing the most relevant content ([EA FUT Deep Dive][ea-fut-dd]).
- **Objectives are surfaced on the mode screen itself** (a sidebar), not buried in a separate
  Objectives menu, so a typical action is shallow — "spend more time on the pitch and less time
  navigating menus" ([EA FUT Deep Dive][ea-fut-dd], [realsport101][rs101-ui]).
- A new **Event Hub** shows availability, requirements, rewards and progress **at a glance**
  ([EA FUT Deep Dive][ea-fut-dd]).
- Reviews describe the menu as **"tidier and segregated better," "nice and clean," "simple to
  navigate," and faster-loading** ([completexbox][review-cx], [thexboxhub][review-tx]).

**Application to ProSeasonAcademy:** the app already uses a tab bar + chips. I apply the
"objectives/status at a glance" and "For You-style primary hub first" ideas by keeping the most
relevant live state (greeting, live feed, current journey node) at the top of each screen and
surfacing objectives directly on the Journey stage card (already done). The visual execution is
grounded in the grid/tab feel by tightening the resting chrome (see §3–§5).

## 2. Card and player presentation

**Verified (multiple sources):**
- FC 26 cards use **dynamic gradients and gold accents**; rarity/quality is communicated by
  **colour + badge effects + animation**. Promo cards have distinct colourways: Hero purple,
  TOTW black & gold, FUTTIES pink/purple gradient with gold ([mirror][mirror-cards], [u7buy][u7buy]).
- **"When an item's rarity changes, animation and badge effects that aren't tied to rarity will
  carry over"** — animation/badge is a real layer of card identity ([EA FUT Deep Dive][ea-fut-dd]).
- **Evolution cards preview the cosmetics and rarity they unlock** ([EA FUT Deep Dive][ea-fut-dd]).
- The card reveal shows **Country > Position > Club > Rating > Player**, with the **rating
  counting up** at the end ([mein-mmo][mein-mmo], [recharge][recharge], [fifauteam][fifauteam]).
- EA added a **spider-chart tactical breakdown** (six stats: Attack, Defence, Build-Up, Width,
  Length, Endurance) for tactics ([EA Gameplay Deep Dive][ea-gameplay-dd]).

**Application:** ProSeasonAcademy's `RoleModelCard`/`PlayerCard` already carry foil sheen, a
"rarity/quality" glow per coach, and a six-stat row (mirroring the six-stat spider concept). I
ground the execution further by adding an **animated gradient hairline border** (see the
"multicolour border animation" finding in §4) and by keeping the **rating count-up** reveal in
`StageClearedSheet` (directly matching the FC 26 reveal sequence finding).

## 3. Color grading and lighting

**Verified (single detailed source, flagged):**
- FC 26's overall resting menu theme is described as a **"muted teal and blue steel theme with a
  multicolour border animation (like the Hey Siri border on the iPhone)"**, with a **bright neon
  blue** used as the screen-transition flash ([r/FifaCareers][color-thread], Aug 2026).
- This is consistent with multiple sources calling the menus **clean / modern / dark** and with
  the **vibrant gradient card colourways** (gold, pink/purple, black-gold) used as accent states
  ([realsport101][rs101-ui], [thexboxhub][review-tx], [moviesgamesandtech][review-mgt]).

**Application — INSPIRED, NOT A PHOTOCOPY:** we do **not** shift the app's resting palette toward
teal/blue-steel. Neon green + gold stay the hero (per the brief). What we take from this finding
is the *feel* — that the world is a dark, moody, instrument-grade surface where a neon colour is
reserved for live/transition moments. We express that through treatment: a subtle cool `steel`
neutral on a couple of fine card hairlines, and a one-beat neon `flash` on screen transitions.
The result "belongs in that world" through how it behaves, not by copying its colours.

## 4. Typography

**Verified (the broader football-UI pattern; exact EA FC 26 in-game face NOT definitively
documented — flagged):**
- Modern football/console display headers use **all-caps, ultra-condensed, Black-weight athletic
  display type**; this is well documented for the FIFA World Cup 26 typeface (FWC26) and the
  football-UI convention, and is echoed across football sports UIs ([pimpmytype][pimpmytype]).
- Paired with a **clean, legible sans for body/data** (e.g. Noto Sans for the WC scoreboard) so
  data stays readable on TV screens ([pimpmytype][pimpmytype]).
- **Caveat:** I could not verify the exact in-game typeface name for FC 26's menu from any source;
  treat the specific face as unconfirmed. What is confirmed is the **structural pattern**:
  condensed/heavy uppercase headers + a quieter data face.

**Application:** ProSeasonAcademy already uses uppercase headers + monospace data labels (a strong
match for the "display headers + data face" pattern). I tighten the execution: heavier weights and
tighter letter-spacing on the major section headers (the condensed/athletic feel) while keeping
monospace for the technical/data readouts.

## 5. Motion and feedback

**Verified (multiple sources):**
- Menus use **sliding transitions between screens**, with a **bright neon blue** flash on the
  transition ([r/FifaCareers][color-thread]).
- The **pack/walkout reveal** is a staged sequence — Country > Position > Club > Rating > Player —
  where the **rating counts up** and the card animates in with its image and stats; high-rated
  (86+) cards get a distinct cinematic reveal with metallic streaks and a tunnel glimpse
  ([mein-mmo][mein-mmo], [fifauteam][fifauteam], [recharge][recharge]).
- Selection states: cards/tiles highlight, objectives are cycled with the right stick
  ([EA FUT Deep Dive][ea-fut-dd]).

**Application:** the app's `StageClearedSheet` already implements the earned "reveal" with a rating
count-up and staggered receipts (matches the finding). I add a neon-blue **transition flash** and a
subtle **slide** to the full-screen sheets and the feed, matching the FC 26 slide/flash feel, while
keeping motion restrained per the app's own design system.

## 6. Ranked/competitive progression UI

**Verified (multiple sources):**
- **Division Rivals** is a **ladder of 11 divisions** (Division 10 → 1, then **Elite**), with
  **Stages** within each division, **Win Streaks** that double progress, and **Checkpoints** that
  guard against relegation (Limited Checkpoints can break and relegate) ([fifauteam][rivals-fifauteam],
  [timesaver][rivals-timesaver], [supercoinsy][rivals-supercoinsy], [EA FUT Deep Dive][ea-fut-dd]).
- Progression points: **3 win / 1 draw / 0 loss**; **15 points = base weekly rewards, 30 =
  upgraded**; weekly rewards reset **every Thursday**; **seasonal milestones** by matches played
  ([sportsdunia][rivals-sd], [supercoinsy][rivals-supercoinsy]).
- **Elite** ranks by **Skill Rating** with a top-200 global leaderboard ([fifauteam][rivals-fifauteam]).
- **Champions** is a **15-rank ladder** (Rank 1 = 15 wins); qualification via **Champions
  Qualification Points** earned in Rivals from Division 7, auto-qualify at Division 6 with ~1,000
  CQP; **no playoffs**; **Challengers** is a lower tier for below Division 7 ([realsport101][champs-rs101],
  [timesaver][champs-timesaver], [ldshop][champs-ld]).
- Rivals also adds **Bounties** (random per-match challenges) and **Duels** ([EA FUT Deep Dive][ea-fut-dd]).

**Application:** ProSeasonAcademy's `RivalsRankLadder` (JourneyTab) already frames stage progress as
a ladder. I enrich it to reflect the real structure — **Stages within a division, Win-Streak
doubling, and a Checkpoint** — and add a **15-rank Champions-style ladder** to the final "PROVE IT"
standard, so the app's competitive layer speaks the same ranked language as the current game.

## 7. What I could NOT confirm (flagged honestly)
- The **exact in-game typeface** of FC 26's menu (name/foundry) — unconfirmed.
- The specific **hex palette** of the menu theme — I have a strong single-source verbal description
  ("muted teal and blue steel," neon-blue transition) but no authoritative colour spec; the
  teal/steel application is a faithful translation, not a claim to match EA's exact hexes.
- FC 26's **live store/squad-screen layout** beyond the Play Menu — my sources are strongest on the
  Play Menu, Play/Online tabs, Event Hub, Rivals, Champions and cards.

---

## Traceability map (finding → change)
The guiding rule for applying all of this: **inspired, never a photocopy.** The nod to the
current console FC world comes through *treatment* (gradient-edged cards, a live transition
flash, condensed display type, ranked-ladder structures) — rendered in **ProSeasonAcademy's own
neon-green + gold identity**, not by adopting FC 26's palette. So the teal/blue-steel described
in §3 is *not* used as a wash; only a whisper of cool steel appears on fine card hairlines.

| Finding (§) | Change in this pass |
|---|---|
| §3 FC 26 rests on a muted teal/blue-steel + neon accents | Reframed: the app keeps its own green-family resting chrome. A single `steel` neutral is used only on the RoleModelCard gradient edge + inset hairline; a neon `flash` is a one-beat live transition cue. No teal wash. |
| §4 Condensed heavy uppercase headers + data face | Shared display-header `type` tokens applied to major headers; monospace kept for data readouts (Home/Journey/Feed) |
| §4/§2 Multicolour gradient border animation (Siri-like) | `RoleModelCard` outer hairline is a gradient border — but in OUR palette (cool steel → brand green → coach gold), so it's the *treatment* inspired by the cue, not a colour copy |
| §5 Sliding transitions + neon flash | Full-screen surfaces get a brief `ScreenFlash` live cue on entry — the full-screen sheets/feed, the earned-reveal sheet, and the SignIn entry screens (season-full / token / sign-in branches), so the "entering a screen" moment is consistent app-wide |
| §6 Rivals Stages / Win Streak / Checkpoint + 15-rank Champs | `RivalsRankLadder` + a 15-rank Champions ladder in JourneyTab — the STRUCTURE mirrors the real ranked format; colours stay ProSeasonAcademy green/gold |
| §2 Rating count-up reveal (Country→…→Rating) | Already present in `StageClearedSheet`; kept, with the flash finish |

[rs101-ui]: https://realsport101.com/article/fc-26s-new-ui-a-deep-dive-into-the-redesigned-ultimate-team-menu
[vocal-ui]: https://vocal.media/gamers/fc-26-ea-fc-26-s-new-user-interface-a-deep-dive-into-the-redesigned-ultimate-team-menu
[ea-fut-dd]: https://www.ea.com/en/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-fut-deep-dive
[ea-gameplay-dd]: https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive
[review-cx]: https://completexbox.co.uk/reviews/ea-sports-fc-26-review/
[review-tx]: https://www.thexboxhub.com/ea-sports-fc-26-review/
[review-mgt]: https://moviesgamesandtech.com/2025/11/05/review-eafc26/
[mirror-cards]: https://www.mirror.co.uk/gaming/ea-fc-26-card-designs-35456072
[u7buy]: https://www.u7buy.com/blog/fc-26-futties/
[mein-mmo]: https://mein-mmo.de/en/ea-fc-26-how-to-recognize-walkouts-during-pack-opening,1526086/
[recharge]: https://www.recharge.com/blog/en-gb/free-fc-26-pack-opener-ultimate-online-simulator
[fifauteam]: https://fifauteam.com/fc-26-walkout-player/
[pimpmytype]: https://pimpmytype.com/fifa-2026-font/
[color-thread]: https://www.reddit.com/r/FifaCareers/comments/1mjivh6/fc_26_colour_theme_do_not_play_at_night/
[rivals-fifauteam]: https://fifauteam.com/rivals-fc-26/
[rivals-timesaver]: https://timesaver.gg/blog/ea-fc-26-division-rivals-climb-guide
[rivals-supercoinsy]: https://supercoinsy.com/article/ea-fc-26-game-mode-explained-division-rivals
[rivals-sd]: https://www.sportsdunia.com/esports/ea-fc-26-division-rivals-rewards
[champs-rs101]: https://realsport101.com/article/fc-26-fut-champions-new-qualification-all-rewards-explained
[champs-timesaver]: https://timesaver.gg/blog/ea-fc-26-fut-champions-reach-elite-futties
[champs-ld]: https://www.ldshop.gg/blog/ea-fc/fut-champions-guide.html
