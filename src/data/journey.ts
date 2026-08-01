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
        { label: 'Log 3 real matches in the Match Vault', target: 3, done: 0, check: { kind: 'matches_played', count: 3 } },
        { label: 'Write 1 honest line in the Loss Journal', target: 1, done: 0, check: { kind: 'journal', count: 1 } },
      ],
      rewardXp: 120,
      rewardBadge: 'SEE YOURSELF BADGE',
      quote:
        'Before one tactic, before one mechanic — the truth about what you actually do. Nobody else can see into your matches the way you can, and nobody else can walk this road for you. Log the matches. Write the line. Look first.',
      duration: '2-3 DAYS',
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
        { label: 'Write 2 honest lines in the Loss Journal', target: 2, done: 0, check: { kind: 'journal', count: 2 } },
      ],
      rewardXp: 200,
      rewardBadge: 'BUILD DISCIPLINE BADGE',
      quote:
        'Awareness without repetition is a mood. Discipline is what you do on the night you do not feel like it — the same routine, the same standards, the same honest ledger. Win with the work. Log the losses. Repeat.',
      duration: '4-5 DAYS',
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
