import { ObjectiveCheck } from './matches';

// ─────────────────────────────────────────────────────────────
// JOURNEY MAP DATA — Pro Season curriculum.
//
// MIRROR DIRECTION: there is ONE universal player Journey, not
// two coach-specific fictional roads. Both coaches walk the same
// six development chapters (SEE YOURSELF → PROVE IT) — the coach
// stays a voice, guide and accountability presence, but the
// curriculum is no longer a game-world choice. "Your Journey is
// the evidence. The Standard is the benchmark."
//
// OUR OWN PATH · THE CHINEDU WAY:
// Every stage of our own path in the Journey follows The Chinedu Way:
//   1. Record as usual and watch your match tape.
//   2. Pen to Paper: write key moments and answers on paper with a biro.
//      "There is a special connection a biro has to a book that
//       cannot be typed."
//   3. Let your mind cool down for 24–30 minutes.
//   4. Type your written truth into the Academy database.
//   "The hard way is the easy way, and tech is meant to elevate."
//
// Every objective is machine-checkable against the Match Vault,
// the Loss Journal and the Thread (matches.ts ObjectiveCheck).
// Map geometry is shared: the same S-curve for every player,
// because the climb itself is universal.
// ─────────────────────────────────────────────────────────────

export interface MapPoint {
  x: number;
  y: number;
}

export interface JourneyObjective {
  label: string;
  target: number; // display count
  done: number;   // display count (live screens may grade `check`)
  /** how the vault grades this objective — the honest counter */
  check?: ObjectiveCheck;
}

export interface SideQuest {
  id: string;
  n: number; // side quest index within parent stage
  parentStageN: number;
  key: string; // short map label, e.g. "SHIELD TRAP"
  name: string; // full name
  tagline: string;
  at: MapPoint; // position on map canvas
  objectives: JourneyObjective[];
  rewardXp: number;
  rewardBadge?: string;
  quote?: string;
  duration?: string;
  // Sourced internally (verification, patching, maintenance):
  internalSource: string; // e.g. "EA Sports FC 26 Pitch Notes (Physicality & Shielding Rework)"
  internalPatchVersion: string; // e.g. "FC 26 Launch Meta v1.0"
  coachExplanation: string; // coach audio transcription
  rule: string; // core gameplay rule
  why: string; // tactical reason why it works
  tiles: { icon: 'target' | 'waves' | 'arrow'; title: string; desc: string }[];
  clip: { variant: 'pitchRun' | 'pitchFade' | 'kickoff'; duration: string; caption: string; subcaption: string };
}

export interface JourneyStage {
  n: number;
  key: string; // short map label
  name: string;
  tagline: string;
  at: MapPoint; // node position on the map canvas
  /** the development chapter this stage stands for (universal) */
  chapter?: string;
  objectives?: JourneyObjective[];
  progressPct?: number;
  rewardXp?: number;
  rewardBadge?: string;
  quote?: string;
  duration?: string; // how long this stage takes to be completed
  sideQuests?: SideQuest[];
  // Side-quest / synthetic stage fields (used when a stage represents
  // a side quest from the journey, or a synthetic stage object):
  isSideQuest?: boolean;
  parentStageN?: number;
  id?: string; // for synthetic stages derived from SideQuest.id
  internalSource?: string;
  internalPatchVersion?: string;
  coachExplanation?: string;
  rule?: string;
  why?: string;
  tiles?: { icon: 'target' | 'waves' | 'arrow'; title: string; desc: string }[];
  clip?: { variant: 'pitchRun' | 'pitchFade' | 'kickoff'; duration: string; caption: string; subcaption: string };
  topic?: string; // mechanism key used for combo lookup
}

export interface SeasonDef {
  seasonNo: number;
  totalStages: number;
  title: string; // the name of the programme road
  arc: string;   // one-line legend of the road
  playerCard: { at: MapPoint; rating: number; label: string };
  coachAnchor: MapPoint; // the path necks up to the Role Model hero card above the map
  stages: JourneyStage[];
}

// canvas coordinate system (SVG viewBox): 360 x 560
export const MAP_W = 360;
export const MAP_H = 560;

// shared map geometry — a single S-curve, player card at the foot,
// coach at the neck. One climb, the same shape for every player.
const PLAYER_CARD = { at: { x: 150, y: 505 }, rating: 61, label: 'YOU — STAGE 0' };
const COACH_ANCHOR: MapPoint = { x: 180, y: 10 };
const AT: MapPoint[] = [
  { x: 252, y: 430 },
  { x: 108, y: 352 },
  { x: 252, y: 274 },
  { x: 108, y: 196 },
  { x: 252, y: 118 },
  { x: 108, y: 44 },
];

// ── THE UNIVERSAL JOURNEY — PRO SEASON ───────────────────────
// One stage framework for every member. The evidence inside each
// stage is the player's own; the chapters are universal.
const UNIVERSAL: SeasonDef = {
  seasonNo: 1,
  totalStages: 6,
  title: 'PRO SEASON — YOUR JOURNEY',
  arc: 'SEE YOURSELF · CONTROL YOURSELF · READ THE GAME · BUILD DISCIPLINE · PERFORM UNDER PRESSURE · PROVE IT',
  playerCard: PLAYER_CARD,
  coachAnchor: COACH_ANCHOR,
  stages: [
    {
      n: 1,
      key: 'SEE YOURSELF',
      name: 'See Yourself',
      tagline: 'ESTABLISH A TRUTHFUL BASELINE — NOTICE YOUR REPEATED BEHAVIOUR BEFORE YOU TRY TO CHANGE IT',
      chapter: 'SEE YOURSELF',
      at: AT[0],
      objectives: [
        { label: 'Log 3 real matches in Match History', target: 3, done: 0, check: { kind: 'matches_played', count: 3 } },
        { label: 'Write 1 honest Loss Note', target: 1, done: 0, check: { kind: 'journal', count: 1 } },
      ],
      rewardXp: 120,
      rewardBadge: 'SEE YOURSELF BADGE',
      quote:
        'Before one tactic, before one mechanic — the truth about what you actually do. Nobody else can see into your matches the way you can, and nobody else can walk this road for you. Log the matches. Write the line. Look first.',
      duration: '2-3 DAYS',
      sideQuests: [
        {
          id: 'sq-1',
          n: 1,
          parentStageN: 1,
          key: 'SHIELD TRAP',
          name: 'The Shield Trap',
          tagline: 'PROTECT THE BALL ON RECEIPT. STAND YOUR GROUND AND KEEP DEFENDERS AT BAY.',
          at: { x: 310, y: 450 },
          rewardXp: 60,
          rewardBadge: 'SHIELD MASTER BADGE',
          quote: 'L2/LT is your shield. Let the opponent bring the force; you provide the wall.',
          duration: '1 DAY',
          internalSource: 'EA Sports FC 26 Pitch Notes — Physicality & Shielding Rework (Shield Trapping)',
          internalPatchVersion: 'v1.0 Launch Meta',
          coachExplanation: 'Look, little bro. In FC 26, shielding has been completely reworked. Don\'t receive the ball and immediately try to run. If a defender is breathing down your neck, hold L2/LT the moment the ball arrives. This triggers the new Shield Trapping animation where your player gets their body in the way of the defender, prioritizing protection over a perfect touch. Let them bounce off your strength.',
          rule: 'Press and hold L2/LT as the ball arrives to trigger Shield Trapping and secure your ground.',
          why: 'FC 26 REWORKED SHIELDING TO DELIVER EXTRA PHYSICALITY. BY STANDING YOUR GROUND INSTEAD OF IMMEDIATELY TURNING, YOU FORCE AN INCOMING DEFENDER TO COLLIDE WITH YOUR BACK. THE STRENGTH-BASED CALCULATION SEALS THEM OUT, BUYING YOU AN EXTRA SECOND TO DRIBBLE OR PROGRESS THE BALL.',
          tiles: [
            { icon: 'target', title: 'HOLD L2/LT', desc: 'PRESS BEFORE THE BALL ARRIVES TO POSITION YOUR BODY' },
            { icon: 'waves', title: 'ABSORB FORCE', desc: 'LET THE PRESSER BUMP YOUR BACK; THE STRENGTH MODEL STABILISES YOU' },
            { icon: 'arrow', title: 'EXIT CLEAN', desc: 'ACCELERATE OR PASS ONCE THEY STUMBLE BACK' }
          ],
          clip: {
            variant: 'pitchFade',
            duration: '04:15',
            caption: 'SHIELD TRAPPING BREAKDOWN',
            subcaption: 'See how holding L2/LT on receipt creates instant separation under heavy pressure.'
          },
          objectives: [
            { label: 'Win 1 match using Shield Trapping (Hold L2/LT on receipt)', target: 1, done: 0, check: { kind: 'win_with_mechanics', mechanics: 1, count: 1 } },
            { label: 'Rate composure in 1 match after physical contests', target: 1, done: 0, check: { kind: 'composure', count: 1 } }
          ]
        }
      ]
    },
    {
      n: 2,
      key: 'CONTROL YOURSELF',
      name: 'Control Yourself',
      tagline: 'IDENTIFY WHAT PRESSURE DOES TO YOUR DECISIONS — THE HEAD IS THE FIRST GAME',
      chapter: 'CONTROL YOURSELF',
      at: AT[1],
      objectives: [
        { label: 'Rate your head state on 2 matches', target: 2, done: 0, check: { kind: 'composure', count: 2 } },
        { label: 'Concede 1 or fewer in 2 ranked matches', target: 2, done: 0, check: { kind: 'concede_max', max: 1, count: 2, rankedOnly: true } },
      ],
      rewardXp: 150,
      rewardBadge: 'CONTROL YOURSELF BADGE',
      quote:
        'The first goal is never the problem. The second is the problem — the one you concede to your own head. Rate how you felt in the match. Then defend like the pressure is the opponent, because it is.',
      duration: '3-4 DAYS',
      sideQuests: [
        {
          id: 'sq-2',
          n: 1,
          parentStageN: 2,
          key: 'INVERT OVERLOAD',
          name: 'The Inverted Overload',
          tagline: 'OVERLOAD THE MIDFIELD FROM FULLBACK. TRIGGER CENTRAL CREATION CHANNELS.',
          at: { x: 50, y: 370 },
          rewardXp: 75,
          rewardBadge: 'TACTICAL MASTER BADGE',
          quote: 'Overload the centre to release the flanks. The space is where they are not.',
          duration: '1 DAY',
          internalSource: 'EA Sports FC 26 Pitch Notes — FC IQ Tactical Overhaul (Inverted Wingback positional role)',
          internalPatchVersion: 'v1.0 Launch Meta',
          coachExplanation: 'Midfield density is the secret of the elite. With FC IQ\'s new Inverted Wingback role, your fullbacks don\'t just stay wide. They drift central when in possession, acting as deep playmaker overloads. By using Theo Hernandez or Cancelo with this role assigned, you draw their wingers inward and open up massive channels for diagonal runs. Play with your head, not just your fingers.',
          rule: 'Assign Inverted Wingback in Team Tactics. Use R1/RB and pass to trigger central overloads.',
          why: 'THE INVERTED WINGBACK ROLE CONVERTS A DEFENSIVE FULLBACK INTO AN ACTIVE DEEP PLAYMAKER ON THE BALL. IN COMBINATION WITH R1/RB CLOSE CONTROL AND QUICK STEP PLAYSTYLE+, THEY CREATE RAPID 3v2 MIDFIELD OVERLOADS THAT CRIPPLE THE DEFENSIVE AI\'S COHERENCE.',
          tiles: [
            { icon: 'target', title: 'ROLE ASSIGN', desc: 'SET YOUR RB/LB ROLE TO INVERTED WINGBACK IN SQUAD TACTICS' },
            { icon: 'waves', title: 'R1 BUILD-UP', desc: 'CARRY WITH CLOSE CONTROL TO DRAW DEFENDERS INSIDE' },
            { icon: 'arrow', title: 'DIAGONAL PASS', desc: 'RELEASE THE WIDE RUNNERS THROUGH THE OPEN FLANK CHANNEL' }
          ],
          clip: {
            variant: 'pitchRun',
            duration: '05:30',
            caption: 'INVERTED OVERLOAD TACTICS',
            subcaption: 'See how the inverted fullback creates a 3-man midfield pivot for easy transitions.'
          },
          objectives: [
            { label: 'Win 1 match with Inverted Wingback overloads (R1 + pass build-ups)', target: 1, done: 0, check: { kind: 'win', count: 1, rankedOnly: true } },
            { label: 'Maintain 70%+ pass accuracy in 1 match', target: 1, done: 0, check: { kind: 'pass_acc', min: 70, count: 1 } }
          ]
        }
      ]
    },
    {
      n: 3,
      key: 'READ THE GAME',
      name: 'Read the Game',
      tagline: 'NOTICE PATTERNS, DANGER, SPACE, TEMPO AND DECISION CONTEXT — THEN ACT BEFORE THE PICTURE CHANGES',
      chapter: 'READ THE GAME',
      at: AT[2],
      objectives: [
        { label: 'Hit 65%+ pass accuracy in 2 matches', target: 2, done: 0, check: { kind: 'pass_acc', min: 65, count: 2 } },
        { label: 'Score 3 goals against a low block', target: 3, done: 0, check: { kind: 'goals_vs_style', style: 'LOW BLOCK', count: 3 } },
      ],
      rewardXp: 180,
      rewardBadge: 'READ THE GAME BADGE',
      quote:
        'Stop playing the ball. Play the picture. The best read the game three seconds before everyone else sees it — and they got there by counting what repeated. Pass the pattern open. Break the parked bus with patience, not panic.',
      duration: '4-5 DAYS',
      sideQuests: [
        {
          id: 'sq-3',
          n: 1,
          parentStageN: 3,
          key: 'BOX CRASH RUN',
          name: 'The Box Crash Run',
          tagline: 'TIME TRAILING MIDFIELDER RUNS INTO THE BOX. SURPRISE HIGH DEFENSIVE LINES.',
          at: { x: 310, y: 290 },
          rewardXp: 90,
          rewardBadge: 'CRASH MASTER BADGE',
          quote: 'Bait the front line, trigger the back. The unmarked runner is the killer.',
          duration: '1 DAY',
          internalSource: 'EA Sports FC 26 Pitch Notes — FC IQ Player Roles (Box Crasher Midfielder)',
          internalPatchVersion: 'v1.0 Launch Meta',
          coachExplanation: 'When the opponent parks a massive low block, standard strikers get swallowed alive. That\'s why FC 26 introduced the Box Crasher CDM role. While the defence is busy wrestling Haaland, your CDM (like Rodri) ghosts into the box from deep, completely unmarked. Time your pass to his trailing run and smash it home.',
          rule: 'Use Box Crasher role on a CDM. Hold ball with your striker, then play trailing runs.',
          why: 'THE BOX CRASHER ROLE TRIGGERS TRAILING MIDFIELD RUNS INTO THE 18-YARD BOX WHEN THE STRIKER IS CONTESTED. THE DEFENSIVE AI PREFERS MAN-MARKING CLOSE INSIDE THE BOX, CAUSING THEM TO COMPLETELY MISS LATE SECOND-WAVE RUNS FROM DEEP MIDFIELD.',
          tiles: [
            { icon: 'target', title: 'BAIT THE CBs', desc: 'HOLD THE BALL WITH YOUR STRIKER TO FORCE MAN-MARKING' },
            { icon: 'waves', title: 'TIME THE RUN', desc: 'WAIT FOR THE BOX CRASHER CDM TO ENTER THE BOX UNMARKED' },
            { icon: 'arrow', title: 'LOFTED PASS', desc: 'DOUBLE-TAP Y/TRIANGLE FOR A LOFTED THROUGH BALL, FINISH ONE-TOUCH' }
          ],
          clip: {
            variant: 'kickoff',
            duration: '03:48',
            caption: 'BOX CRASHER WALKTHROUGH',
            subcaption: 'Watch how Rodri cuts through a parked bus with an unmarked late box entry.'
          },
          objectives: [
            { label: 'Score 1 goal against a low block with midfield runs', target: 1, done: 0, check: { kind: 'goals_vs_style', style: 'LOW BLOCK', count: 1 } },
            { label: 'Complete 1 match with a self-rated head state', target: 1, done: 0, check: { kind: 'composure', count: 1 } }
          ]
        }
      ]
    },
    {
      n: 4,
      key: 'BUILD DISCIPLINE',
      name: 'Build Discipline',
      tagline: 'TURN AWARENESS INTO REPEATABLE BEHAVIOUR — THE ROUTINE IS THE TALENT',
      chapter: 'BUILD DISCIPLINE',
      at: AT[3],
      objectives: [
        { label: 'Win 2 ranked matches', target: 2, done: 0, check: { kind: 'win', count: 2, rankedOnly: true } },
        { label: 'Win once using 1+ taught mechanics', target: 1, done: 0, check: { kind: 'win_with_mechanics', mechanics: 1, count: 1 } },
        { label: 'Write 2 honest Loss Notes', target: 2, done: 0, check: { kind: 'journal', count: 2 } },
      ],
      rewardXp: 200,
      rewardBadge: 'BUILD DISCIPLINE BADGE',
      quote:
        'Awareness without repetition is a mood. Discipline is what you do on the night you do not feel like it — the same routine, the same standards, the same honest ledger. Win with the work. Log the losses. Repeat.',
      duration: '4-5 DAYS',
      sideQuests: [
        {
          id: 'sq-4',
          n: 1,
          parentStageN: 4,
          key: 'TACKLE INTENT',
          name: 'Tackle Personality',
          tagline: 'LEVERAGE DEFENSIVE ATTRIBUTES. EXECUTE PREMIUM ANIMATIONS WITH 85+ STAND TACKLE.',
          at: { x: 50, y: 210 },
          rewardXp: 100,
          rewardBadge: 'DEFENSIVE LOCK BADGE',
          quote: 'Wait for the heavy touch. One clean tackle is worth ten desperate lunges.',
          duration: '1 DAY',
          internalSource: 'EA Sports FC 26 Pitch Notes — Defending & Tackle Personality Overhaul',
          internalPatchVersion: 'v1.0 Launch Meta',
          coachExplanation: 'Stop spamming the tackle button! In FC 26, missed tackles have a severe recovery delay, and the game introduces Tackle Personality. Players with Stand Tackle attributes below 71 only have basic animations, while elite defenders with 85+ (like Virgil van Dijk) unlock premium tackle animations that stop attackers dead. Jockey patiently, and only strike when the gap is certain.',
          rule: 'Jockey with L2/LT. Use a CB with 85+ Stand Tackle, and only press B/Circle on heavy touches.',
          why: 'TACKLE SPAM LOGIC NOW TRIGGERS A SEVERE SPEED PENALTY AFTER A MISSED LUNGE. DEFENDERS WITH 85+ STAND TACKLE HAVE UNIQUE REACH AND EXTENSION ANIMATIONS THAT RESPECT POSITIONING, MAKING TACKLING PATIENCE EXTREMELY REWARDING.',
          tiles: [
            { icon: 'target', title: 'JOCKEY AND WAIT', desc: 'HOLD L2/LT TO TRACK ATTACKER; DO NOT PRESS TACKLE YET' },
            { icon: 'waves', title: 'CHECK STATS', desc: 'ENSURE YOUR CB HAS 85+ STAND TACKLE FOR PREMIUM ANIMATIONS' },
            { icon: 'arrow', title: 'STRIKE PRECISELY', desc: 'PRESS STAND TACKLE ONLY WHEN THE ATTACKER TAKES A HEAVY TOUCH' }
          ],
          clip: {
            variant: 'pitchFade',
            duration: '04:50',
            caption: 'TACKLE PERSONALITY ANALYSIS',
            subcaption: 'See the difference between low-rated tackle lunges vs elite 85+ premium animations.'
          },
          objectives: [
            { label: 'Keep 1 clean sheet with structured defending (No Tackle Spam)', target: 1, done: 0, check: { kind: 'clean_sheet', count: 1 } },
            { label: 'Win 1 match keeping goals conceded to 1 or fewer', target: 1, done: 0, check: { kind: 'concede_max', max: 1, count: 1, rankedOnly: true } }
          ]
        }
      ]
    },
    {
      n: 5,
      key: 'PERFORM UNDER PRESSURE',
      name: 'Perform Under Pressure',
      tagline: 'TEST THE WORK IN REAL COMPETITIVE SITUATIONS — PRESSURE IS WHERE HABITS PROVE THEMSELVES',
      chapter: 'PERFORM UNDER PRESSURE',
      at: AT[4],
      objectives: [
        { label: 'Win 3 ranked matches', target: 3, done: 0, check: { kind: 'win', count: 3, rankedOnly: true } },
        { label: 'Bank a win you led at 75’', target: 1, done: 0, check: { kind: 'close_out', count: 1 } },
        { label: 'Win with the decider after 60’', target: 1, done: 0, check: { kind: 'win_decisive_after', minute: 60, count: 1 } },
      ],
      rewardXp: 240,
      rewardBadge: 'PERFORM UNDER PRESSURE BADGE',
      quote:
        'This is the chapter where training becomes a result. Under pressure, you do not rise to the occasion — you sink to your highest level of preparation. Win ranked. Close it out. Decide it late. Show the work under fire.',
      duration: '5-6 DAYS',
    },
    {
      n: 6,
      key: 'PROVE IT',
      name: 'Prove It',
      tagline: 'REVIEW THE EVIDENCE ACCUMULATED ACROSS THE PROGRAMME — THEN SET YOUR NEXT PROFESSIONAL STANDARD',
      chapter: 'PROVE IT',
      at: AT[5],
      objectives: [
        { label: 'Keep 1 clean sheet', target: 1, done: 0, check: { kind: 'clean_sheet', count: 1 } },
        { label: 'Bank 2 wins you led at 75’', target: 2, done: 0, check: { kind: 'close_out', count: 2 } },
        { label: 'Hold or break your Thread 3 times', target: 3, done: 0, check: { kind: 'thread', count: 3 } },
      ],
      rewardXp: 300,
      rewardBadge: 'PROVE IT BADGE',
      quote:
        'The programme ends the way it began — with the evidence. Not what you hoped you did. What you did. Look at the receipts: the matches, the lines, the lessons that held and the ones that broke. Then set the next standard. This road never really ends; you just get to choose the next one.',
      duration: '6-7 DAYS',
    },
  ],
};

export const JOURNEYS: Record<string, SeasonDef> = {
  // the same universal road for every coach — the coach is the
  // voice on it, never a different curriculum
  chinedu: UNIVERSAL,
  obinna: UNIVERSAL,
};

/** this player's road — one universal journey, whoever the guide is */
export function journeySeasonFor(_coachId: string): SeasonDef {
  return UNIVERSAL;
}

// legacy default — consumers that only need shape/counts (progress
// arithmetic, settings badges) share the same 6-stage structure
export const JOURNEY_SEASON = UNIVERSAL;

export const CURRENT_STAGE = 1; // stage the player is on (1-based)

/** smooth S-curve path through all nodes, user card → coach card */
export function buildMapPath(season: SeasonDef = JOURNEY_SEASON): string {
  const pts: MapPoint[] = [
    { x: season.playerCard.at.x, y: season.playerCard.at.y - 52 }, // path starts atop the player card
    ...season.stages.map((s) => s.at),
    season.coachAnchor,
  ];
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const midY = (a.y + b.y) / 2;
    d += ` C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`;
  }
  return d;
}

/** the lit segment = from the player card up to the CURRENT stage node */
export function buildLitPath(currentN: number, season: SeasonDef = JOURNEY_SEASON): string {
  const pts: MapPoint[] = [
    { x: season.playerCard.at.x, y: season.playerCard.at.y - 52 },
    ...season.stages.filter((s) => s.n <= currentN).map((s) => s.at),
  ];
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const midY = (a.y + b.y) / 2;
    d += ` C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`;
  }
  return d;
}

/** footprint dots along the dim path — two per segment */
export function footprintDots(currentN: number, season: SeasonDef = JOURNEY_SEASON): MapPoint[] {
  const pts: MapPoint[] = [
    { x: season.playerCard.at.x, y: season.playerCard.at.y - 52 },
    ...season.stages.map((s) => s.at),
    season.coachAnchor,
  ];
  const dots: MapPoint[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    // match the cubic used in buildMapPath: controls (a.x,midY) (b.x,midY)
    const midY = (a.y + b.y) / 2;
    for (const t of [0.35, 0.7]) {
      const u = 1 - t;
      const x = u ** 3 * a.x + 3 * u ** 2 * t * a.x + 3 * u * t ** 2 * b.x + t ** 3 * b.x;
      const y = u ** 3 * a.y + 3 * u ** 2 * t * midY + 3 * u * t ** 2 * midY + t ** 3 * b.y;
      // dots on the already-lit portion are drawn by the lit path instead
      const segStage = i; // segment ending at stage index i (1-based over pts)
      if (segStage > currentN) dots.push({ x, y });
    }
  }
  return dots;
}
