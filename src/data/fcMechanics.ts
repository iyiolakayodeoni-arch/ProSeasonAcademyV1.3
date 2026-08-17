// ─────────────────────────────────────────────────────────────────────────
// FC 26 MECHANICS — what is actually new, how to do it, how to learn it.
//
// Sourced from EA Pitch Notes (Gameplay Deep Dive, TU 1.5.0, World's Game
// update) plus the public skill-move lists. Console only. PS / Xbox.
// Compiled 17 Aug 2026. Public record — not a YouTube rewrite.
// ─────────────────────────────────────────────────────────────────────────

export type MechanicKind = 'SKILL' | 'SYSTEM' | 'PLAYSTYLE' | 'PATCH';
export type SkillStars = '1–5' | '3–5' | '4–5' | '5';

export interface MechanicInput {
  ps: string;
  xbox: string;
}

export interface FcMechanic {
  id: string;
  kind: MechanicKind;
  name: string;
  tag: string;
  stars?: SkillStars;
  newIn: string;
  headline: string;
  why: string;
  input?: MechanicInput;
  learn: [string, string, string];
  rule: string;
  source: string;
  sourceUrl: string;
}

export const FC_MECHANICS: FcMechanic[] = [
  {
    id: 'mx-explosive-stepover',
    kind: 'SKILL',
    name: 'EXPLOSIVE STEPOVER',
    tag: 'NEW SKILL · 3★',
    stars: '3–5',
    newIn: 'FC 26 launch',
    headline: 'This replaces the old stepover. Learn this one first.',
    why: 'EA cut the speed boost off the regular stepover — that was last year’s free yard. The Explosive Stepover is the replacement: stand or jog, hold L1, roll the right stick, exit with the left. Three-star players can do it. That is why the scene is on it.',
    input: {
      ps: 'Hold L1 + rotate RS forward → left or right. Exit with LS.',
      xbox: 'Hold LB + rotate RS forward → left or right. Exit with LS.',
    },
    learn: [
      'Arena. No defender. Ten clean exits each way until the roll is one motion.',
      'Add a standing CB. Lure the hip, then exit the way he is not leaning.',
      'In a real match: only on the half-turn in the final third. Not in your own half.',
    ],
    rule: 'Lure the hip. Roll. Exit the open side. The old stepover is dead — this is the yard now.',
    source: 'EA Pitch Notes · FC 26 Gameplay Deep Dive',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive',
  },
  {
    id: 'mx-advanced-heel-flick',
    kind: 'SKILL',
    name: 'ADVANCED HEEL FLICK',
    tag: 'NEW SKILL · 4★',
    stars: '4–5',
    newIn: 'FC 26 launch',
    headline: 'Wrong-foot a fullback who is already set.',
    why: 'The regular heel flick is linear. This one asks for the left stick on a diagonal, so the exit is not the line he is blocking. Four-star only. Use it when the fullback has shown you inside on the half-turn.',
    input: {
      ps: 'From a jog: flick RS forward, then back, LS held on a diagonal.',
      xbox: 'From a jog: flick RS forward, then back, LS held on a diagonal.',
    },
    learn: [
      'Arena, 4★ player. Ten flicks with LS top-left, ten with LS top-right.',
      '1v1 vs a fullback who is jockeying. Exit the diagonal he is not covering.',
      'Match rule: only after he has already shown you a side. Do not guess.',
    ],
    rule: 'The flick is nothing. The diagonal is the move.',
    source: 'EA Pitch Notes · FC 26 Gameplay Deep Dive',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive',
  },
  {
    id: 'mx-drag-to-chop',
    kind: 'SKILL',
    name: 'DRAG TO CHOP',
    tag: 'NEW SKILL · 4★',
    stars: '4–5',
    newIn: 'FC 26 launch',
    headline: 'Stand still. Change the picture. Leave him planted.',
    why: 'Built for the half-space when you have already stopped. L2 plus a 180 on the right stick drags then chops. It is not a sprint move. It is a stand-and-kill when the fullback has over-jockeyed.',
    input: {
      ps: 'Hold L2 + roll RS left → back → right (or mirrored).',
      xbox: 'Hold LT + roll RS left → back → right (or mirrored).',
    },
    learn: [
      'Standing start in the arena. One clean 180 each way. No jog.',
      'Receive on the half-turn, stop, then chop. First touch is the setup.',
      'In-game: only when you have already killed your momentum. Never at full sprint.',
    ],
    rule: 'Stop first. Then chop. A moving chop is a turnover.',
    source: 'Red Bull / EA skill-move list · FC 26',
    sourceUrl: 'https://www.redbull.com/us-en/ea-sports-fc-26-tips-tricks',
  },
  {
    id: 'mx-elastico-variation',
    kind: 'SKILL',
    name: 'ELASTICO VARIATION',
    tag: 'NEW SKILL · 5★',
    stars: '5',
    newIn: 'FC 26 launch',
    headline: 'Five-star only. Rapid direction change with L2 on the roll.',
    why: 'The classic elastico is still there. This variation adds L2 and a tighter roll so the ball stays closer. EA also reduced skill-move error across the board, so a clean five-star actually lands more often than last year. Still not a spam button.',
    input: {
      ps: 'Hold L2 + rotate RS right → back → left (or mirrored).',
      xbox: 'Hold LT + rotate RS right → back → left (or mirrored).',
    },
    learn: [
      'Only with a confirmed 5★ player. Check the name bar — FC 26 shows stars on it.',
      'Arena: five each way, then a shot. If you cannot shoot after it, you do not own it.',
      'Match: one per attack, on the edge of the box, never in traffic.',
    ],
    rule: 'If he is not 5★, this move does not exist. Check the name bar.',
    source: 'EA Pitch Notes · FC 26 Gameplay Deep Dive',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive',
  },
  {
    id: 'mx-trickster-rainbow',
    kind: 'SKILL',
    name: 'TRICKSTER RAINBOW',
    tag: 'NEW SKILL · 1★',
    stars: '1–5',
    newIn: 'FC 26 launch',
    headline: 'Anyone can do it. Almost nobody should.',
    why: 'One-star rainbow. Flick back, flick forward. It is in the game so every card can look busy. In ranked it is a turnover unless the defender has already turned his back. Learn it so you recognise it. Do not build a game on it.',
    input: {
      ps: 'Flick RS back, then forward.',
      xbox: 'Flick RS back, then forward.',
    },
    learn: [
      'Five in the arena so the input is in the hands.',
      'Never in your own half. Never under a press.',
      'If you use it, it is to lift a standing CB who has already planted. That is the only picture.',
    ],
    rule: 'Know it. Almost never use it.',
    source: 'Red Bull · New skill moves in FC 26',
    sourceUrl: 'https://www.redbull.com/us-en/ea-sports-fc-26-tips-tricks',
  },
  {
    id: 'mx-lane-change',
    kind: 'SKILL',
    name: 'LANE CHANGE (LA CROQUETA)',
    tag: 'REWORKED',
    newIn: 'FC 26 rework',
    headline: 'Faster. Tighter. The ball no longer pops forward at the end.',
    why: 'Last year the croqueta finished by shoving the ball into the next man. EA sped it up and killed that push. It is now a snap across the body that stays on your foot. Combined with the stepover nerf, this is the press-beater the ladder actually uses.',
    input: {
      ps: 'Hold L1 + hold RS left or right.',
      xbox: 'Hold LB + hold RS left or right.',
    },
    learn: [
      'Arena: ten across the body, both ways, no sprint.',
      '1v1: carry at his shoulder, snap the moment he leans.',
      'Match: one snap, then a pass or a shot. Never two croquetas in a row.',
    ],
    rule: 'Three beats: lure, snap, exit. The fourth beat is a turnover.',
    source: 'EA Pitch Notes · FC 26 Gameplay Deep Dive',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive',
  },
  {
    id: 'mx-simplified-skills',
    kind: 'SYSTEM',
    name: 'SIMPLIFIED SKILL MOVES',
    tag: 'NEW SYSTEM',
    newIn: 'FC 26 launch',
    headline: 'One flick. The game picks the move. Slower, three in a row max.',
    why: 'Accessibility option. A single right-stick flick in a cardinal direction performs a contextual skill gated by the player’s star rating. It is slower than the real input and capped at three in a row. Fine for learning the idea. Not how the scene plays.',
    input: {
      ps: 'Settings → enable Simplified Skill Moves. Flick RS up / down / left / right.',
      xbox: 'Settings → enable Simplified Skill Moves. Flick RS up / down / left / right.',
    },
    learn: [
      'Turn it on in the arena for one session so you feel which move each flick maps to.',
      'Turn it off. Learn the real input for Explosive Stepover and Lane Change.',
      'Do not leave it on for ranked. The delay is readable.',
    ],
    rule: 'A teaching tool. Not a ranked setting.',
    source: 'EA FC Zone · FC 26 skill moves',
    sourceUrl: 'https://eafczone.com/ea-fc-skill-moves/',
  },
  {
    id: 'mx-shield-trap',
    kind: 'SYSTEM',
    name: 'SHIELD TRAP + SHIELD DRIBBLE',
    tag: 'REWORKED',
    newIn: 'FC 26 launch',
    headline: 'L2 is a wall again. Agile dribble is gone so the input is clean.',
    why: 'Agile dribbling (L2+R2) was removed. Shielding was rebuilt: new trap animations, shield-dribble that respects the stick, better sprint-out, fatigue-limited hold, and a new shoulder-challenge while you dribble. Enforcer PlayStyle adds extra animations. This is how physical forwards keep the ball this year.',
    input: {
      ps: 'Hold L2 on receipt to trap-shield. Hold L2 + LS to shield-dribble. Circle to shoulder.',
      xbox: 'Hold LT on receipt to trap-shield. Hold LT + LS to shield-dribble. B to shoulder.',
    },
    learn: [
      'Receive with a CB on your back. L2 before the ball arrives. Do not run.',
      'Once he bounces, first touch across your body, then look up.',
      'In-game: every back-to-goal receipt in the final third. That is the drill.',
    ],
    rule: 'L2 on the way in. Not after you have already lost it.',
    source: 'EA Pitch Notes · FC 26 Gameplay Deep Dive',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive',
  },
  {
    id: 'mx-controlled-sprint',
    kind: 'SYSTEM',
    name: 'CONTROLLED SPRINT',
    tag: 'FUNDAMENTAL',
    newIn: 'FC 26 emphasis',
    headline: 'R1 is the carry. R2 is the risk.',
    why: 'Competitive preset made dribbling tighter and skill moves faster, but full sprint still wrecks your turn and your pass. Controlled sprint (R1 / RB) is how the scene carries. Explosive sprint exists in every direction now — save the full trigger for the exit, not the approach.',
    input: {
      ps: 'R1 + LS to carry. R2 only when the hip opens.',
      xbox: 'RB + LS to carry. RT only when the hip opens.',
    },
    learn: [
      'One match in the arena where you are not allowed to hold R2 except to finish.',
      'Count your sprint presses in a real match. Cut them in half next time.',
      'The exit: R2 for two touches, then a pass or a shot. Never a third.',
    ],
    rule: 'Sprint is a weapon, not a default.',
    source: 'EA Pitch Notes · Competitive gameplay',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive',
  },
  {
    id: 'mx-driven-pass',
    kind: 'SYSTEM',
    name: 'DRIVEN PASS',
    tag: 'PATCH-LIVE',
    newIn: 'TU 1.5.0 + competitive',
    headline: 'Ground passes are faster and truer. Lofted is worse. Drive it.',
    why: 'Title Update 1.5.0 sped up ground passing and cut lofted-pass accuracy (the double-tap). High Short/Long/Curve can now curve a through ball without Incisive Pass. Tiki Taka was nerfed so the PlayStyle is no longer a laser. The picture: a flat driven ball through the first press, not a chip over it.',
    input: {
      ps: 'R1 + X for a driven ground pass. R1 + △ for a driven through ball. Do not double-tap.',
      xbox: 'RB + A for a driven ground pass. RB + Y for a driven through ball. Do not double-tap.',
    },
    learn: [
      'Arena: ten driven passes into a run. Watch the ball stay below knee height.',
      'Under a 2-man press: see the gap, drive, first-time lay-off. No loft.',
      'Ban the double-tap for a week. If you want air, you have to mean it.',
    ],
    rule: 'Double-tap is a loft. The patch punished it. Drive or don’t pass.',
    source: 'EA Pitch Notes · Title Update 1.5.0',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-title-update-1-5-0',
  },
  {
    id: 'mx-power-chip',
    kind: 'SYSTEM',
    name: 'POWER SHOT + CHIP',
    tag: 'PATCH-LIVE',
    newIn: 'TU 1.5.0',
    headline: 'Power shots fly truer from range. Chips miss wide less.',
    why: '1.5.0 improved Power Shot trajectory and boosted accuracy with the Power Shot PlayStyle/+. Chips are less likely to sail wide; Chip Shot PlayStyle adds more. Timed finishing is gone from free kicks. The finish is the attribute plus the PlayStyle, not a timing minigame.',
    input: {
      ps: 'L1 + R1 + ○ for a Power Shot. L1 + □ for a chip.',
      xbox: 'LB + RB + B for a Power Shot. LB + X for a chip.',
    },
    learn: [
      'Power Shot only from 20–28 yards, planted, on your strong foot.',
      'Chip only when the keeper has already rushed. If he is set, it is a pass back.',
      'One of each in the arena until the input is not a thought.',
    ],
    rule: 'Power Shot is a picture, not a panic. Chip is for a rushing keeper. Nothing else.',
    source: 'EA Pitch Notes · Title Update 1.5.0',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-title-update-1-5-0',
  },
  {
    id: 'mx-tackle-personality',
    kind: 'SYSTEM',
    name: 'TACKLE + DEFLECTION CONTROL',
    tag: 'REWORKED',
    newIn: 'FC 26 launch',
    headline: 'Auto-blocks are down. The tackle has to be yours. The bounce is no longer free.',
    why: 'Competitive preset cut auto tackles and auto blocks. New deflection control tries to put blocked shots and interceptions away from the opponent, not back onto his foot. Stand/slide tackles are retuned to find a teammate when they win it. Manual jockey is faster. This is why the scene jockeys and waits.',
    input: {
      ps: 'L2 to jockey. ○ to stand tackle. □ to slide. Do not mash.',
      xbox: 'LT to jockey. B to stand tackle. X to slide. Do not mash.',
    },
    learn: [
      'Jockey a 1v1 in the arena. Tackle only on the heavy touch.',
      'Count auto-blocks you used to get for free. They are not coming.',
      'After you win it: first thought is the outlet, not the dribble.',
    ],
    rule: 'Wait for the heavy touch. One clean tackle beats ten desperate ones.',
    source: 'EA Pitch Notes · FC 26 Gameplay Deep Dive',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive',
  },
  {
    id: 'mx-second-man',
    kind: 'SYSTEM',
    name: 'SECOND MAN PRESS',
    tag: 'NERFED',
    newIn: 'cycle patches',
    headline: 'R1 still calls a second body. It also opens the lane you just left.',
    why: 'Constant Pressure and second-man press drain stamina harder and leave bigger gaps if you hold them. Press After Possession Loss in short bursts is the patch-legal version. The scene uses R1 for two seconds on a regain, then lets the line reset.',
    input: {
      ps: 'Hold R1 to call the second man. Release the moment the lane appears.',
      xbox: 'Hold RB to call the second man. Release the moment the lane appears.',
    },
    learn: [
      'One half where R1 may not be held longer than a count of two.',
      'On a regain: R1, win or lose, then drop. No third presser.',
      'If you are tired at 70\', you held it too long. Write that down.',
    ],
    rule: 'Two seconds. Then the line. A held R1 is a gift.',
    source: 'Community / title-update defending notes',
    sourceUrl: 'https://www.itemd2r.com/blog/fc-26/ea-fc-26-title-update-patch-notes-gameplay-changes-new-meta-coin-tips',
  },
  {
    id: 'mx-inverted-wb',
    kind: 'SYSTEM',
    name: 'INVERTED WINGBACK',
    tag: 'NEW ROLE',
    newIn: 'FC 26 FC IQ',
    headline: 'Your fullback is a midfielder if you let him invert.',
    why: 'FC IQ loosened roles and added Inverted Wingback plus new Half-Winger focuses. Invert the FB, he drifts inside, you suddenly have a 3v2 in midfield and a naked flank behind the winger who followed him. Wide Mids were reworked to protect 3-back shapes. This is the overload the scene is living in.',
    learn: [
      'Set one fullback to Inverted Wingback. Watch one half without touching him.',
      'When he arrives central, play the bounce and look at the vacated flank.',
      'If the opponent’s winger follows, the diagonal is on. If he stays, you have the extra man.',
    ],
    rule: 'Overload the centre to release the flank. The space is where they are not.',
    source: 'EA Pitch Notes · FC IQ',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive',
  },
  {
    id: 'mx-competitive-preset',
    kind: 'SYSTEM',
    name: 'COMPETITIVE PRESET',
    tag: 'NEW PRESET',
    newIn: 'FC 26 launch',
    headline: 'Online is a different game from Career. Play the one you are in.',
    why: 'Competitive: faster passing, less AI defending, fewer rebound goals, tighter dribble, faster skills, more heading error, redesigned fatigue. Authentic: weather, realistic corners, tighter AI lines, slower skills. Ranked is Competitive. If you train Authentic, you are training the wrong sport.',
    learn: [
      'Confirm the preset before kick-off. Ranked / Champs / Rivals = Competitive.',
      'Train in Competitive Kick-Off, not Career.',
      'Fatigue is redesigned. Your 70th-minute plan has to change with it.',
    ],
    rule: 'Train the preset you compete in. Authentic will lie to you.',
    source: 'EA Pitch Notes · Competitive vs Authentic',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive',
  },
  {
    id: 'mx-playstyles-26',
    kind: 'PLAYSTYLE',
    name: 'NEW PLAYSTYLES',
    tag: 'NEW SET',
    newIn: 'FC 26 launch + 1.5.0',
    headline: 'Enforcer, Precision Header, Aerial Fortress, Inventive, Gamechanger. Trivela and Flair as PlayStyles are gone.',
    why: 'EA cut overlap. Power Header, Aerial, Trivela and Flair PlayStyles were removed. In came Enforcer (physical shield/shoulder), Precision Header, Aerial Fortress / Aerial Enforcement, Inventive (lofted creativity), Gamechanger. TU 1.5.0 then pulled Tiki Taka accuracy down and let high-attribute players curve through balls without Incisive. Attributes matter more than the badge.',
    learn: [
      'On every new card, read the PlayStyles before the rating.',
      'Build one attack around Enforcer (hold L2) and one around Inventive (lofted).',
      'Stop looking for Trivela PlayStyle. It is not coming back. The shot can still exist; the badge does not.',
    ],
    rule: 'The badge is a boost. The attribute is the mechanic. Check both.',
    source: 'ESPN / EA gameplay deep dive + TU 1.5.0',
    sourceUrl: 'https://www.espn.com/gaming/story/_/id/45803292/ea-sports-fc-26-gameplay-deep-dive',
  },
  {
    id: 'mx-rl-keeper',
    kind: 'SYSTEM',
    name: 'RL GOALKEEPER POSITIONING',
    tag: 'NEW SYSTEM',
    newIn: 'FC 26 launch',
    headline: 'The keeper now cuts the angle with a trained model. Near-post tap-ins are rarer.',
    why: 'Reinforcement-learning positioning is active before the save, not during it. Combined with deflection control (saves go out or to teammates, not back onto the striker), the cheap rebound meta is thinner. Near-post finishes that worked last year now meet a keeper who has already stepped.',
    learn: [
      'Stop shooting near post on instinct. Look at his feet first.',
      'Far-post across the body and cut-backs are the pictures that still work.',
      'If you are through 1v1, a chip or a pass is often better than the old slam.',
    ],
    rule: 'He has already moved. Shoot where he was, and you miss.',
    source: 'EA Pitch Notes · Goalkeepers',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive',
  },
  {
    id: 'mx-acceleration-types',
    kind: 'SYSTEM',
    name: 'THREE ACCELERATION TYPES',
    tag: 'REWORKED',
    newIn: 'FC 26 launch + 1.4.0',
    headline: 'Explosive, Lengthy, Controlled. Height splits differ for men and women.',
    why: 'Back to three types. Explosive: agility 65+, agility−strength ≥ 10, acc 80+, height cap 182cm men / 162cm women. Lengthy: strength 65+, strength−agility ≥ 4, acc 40+, height floor 183 / 164. Everyone else is Controlled. Early acceleration and deceleration are snappier. 1.4.0 then let more players qualify as Lengthy. Build your front line on type, not just pace.',
    learn: [
      'Open three attackers. Read Explosive / Lengthy / Controlled before you buy.',
      'Explosive for the half-space. Lengthy for the channel in behind.',
      'Do not ask a Lengthy 9 to drop and turn. That is not his engine.',
    ],
    rule: 'Pace is a number. Acceleration type is how he leaves.',
    source: 'EA Pitch Notes · Acceleration Types',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive',
  },
  {
    id: 'mx-throw-in',
    kind: 'SYSTEM',
    name: 'MANUAL THROW-IN TAKER',
    tag: 'NEW',
    newIn: 'FC 26 launch',
    headline: 'R1 picks who takes it. Corners are less congested. Timed finishing is gone from free kicks.',
    why: 'You can request the throw-in taker with R1/RB. Corner run locations were spread out to cut the old cluster and the cheap counter. Free-kick trajectories were retuned after timed finishing was removed. Practice Arena now lets you change the taker and take corners.',
    input: {
      ps: 'R1 to request the throw-in taker.',
      xbox: 'RB to request the throw-in taker.',
    },
    learn: [
      'In the arena, take ten corners and ten throws with a chosen man.',
      'On the throw: pick the CB if you want the long one, the FB if you want the short.',
      'Free kicks: no timing meter. Aim and power. That is the whole skill now.',
    ],
    rule: 'Set pieces are a choice again. If you do not pick, the game will.',
    source: 'EA Pitch Notes · Set pieces',
    sourceUrl: 'https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive',
  },
];

export function mechanicsByKind(kind: MechanicKind): FcMechanic[] {
  return FC_MECHANICS.filter((m) => m.kind === kind);
}

export function mechanicFeedPosts() {
  return FC_MECHANICS.map((m) => ({
    id: `mech-${m.id}`,
    kind: 'MECHANIC' as const,
    handle: 'META WATCH',
    date: '2026-08-17',
    headline: m.headline,
    body: `${m.name} — ${m.why}`,
    source: m.source,
    sourceUrl: m.sourceUrl,
    mechanicId: m.id,
  }));
}
