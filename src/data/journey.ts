import { ObjectiveCheck } from './matches';

// ─────────────────────────────────────────────────────────────
// JOURNEY MAP DATA — Season 1 curriculum + map coordinates.
// THE CANON: each coach's path is a FICTIONAL place from his own
// legend — never a real club, city, stadium or footballer.
//
//   CHINEDU walks THE ASHFAULT ASCENT — a climb out of Cinder Row,
//   byline voices from a hard town: Mama Ukae, Drummer Ezra,
//   Foreman Baba Salt, Locksmith Venn, Night-Watch Kettle,
//   Old Whistle Onye.
//
//   OBINNA walks THE MEREHAVEN WAY — a harbour road to Calm
//   Water, byline voices from the water: Fisher-boy Idri,
//   Boatman Sola, Dockmaster Yew, Fogwatcher Nne,
//   Light-keeper Ama, Elder Mere.
//
// 26 objectives across both journeys, every one machine-checkable
// against the Match Vault vocabulary (matches.ts ObjectiveCheck).
// Map geometry is shared (same canvas coords per stage number);
// the fiction, objectives and badges are per-coach.
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
  mentor?: string; // the byline voice of this stop on the road
  objectives?: JourneyObjective[];
  progressPct?: number;
  rewardXp?: number;
  rewardBadge?: string;
  quote?: string;
}

export interface SeasonDef {
  seasonNo: number;
  totalStages: number;
  title: string; // the name of THIS coach's road
  arc: string;   // one-line legend of the road
  playerCard: { at: MapPoint; rating: number; label: string };
  coachAnchor: MapPoint; // the path necks up to the Role Model hero card above the map
  stages: JourneyStage[];
}

// canvas coordinate system (SVG viewBox): 360 x 560
export const MAP_W = 360;
export const MAP_H = 560;

// shared map geometry — a single S-curve, player card at the foot,
// coach at the neck. Fiction differs, the climb is the same shape.
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

// ── CHINEDU — THE ASHFAULT ASCENT ────────────────────────────
const ASHFAULT: SeasonDef = {
  seasonNo: 1,
  totalStages: 6,
  title: 'THE ASHFAULT ASCENT',
  arc: 'CINDER ROW TO THE IRON WHISTLE — THE CLIMB THAT FORGED THE DISCIPLINARIAN',
  playerCard: PLAYER_CARD,
  coachAnchor: COACH_ANCHOR,
  stages: [
    {
      n: 1,
      key: 'CINDER ROW',
      name: 'Cinder Row',
      tagline: 'WHERE HE LEARNED THAT SPACE IS BORROWED AND PAID BACK IN SWEAT',
      at: AT[0],
      mentor: 'MAMA UKAE',
      objectives: [
        { label: 'Win 2 ranked matches', target: 2, done: 0, check: { kind: 'win', count: 2, rankedOnly: true } },
        { label: 'Win once using 1+ mechanics', target: 1, done: 0, check: { kind: 'win_with_mechanics', mechanics: 1, count: 1 } },
      ],
      rewardXp: 120,
      rewardBadge: 'CINDER ROW BADGE',
      quote:
        'On Cinder Row you did not find space — you borrowed it and paid it back in sweat. Mama Ukae ran the evening games from her shopfront step; she never once blew a whistle, she just looked at you. Bring her two ranked wins. Clean ones.',
    },
    {
      n: 2,
      key: 'THE LEAN-TO',
      name: 'The Lean-To',
      tagline: 'A BROKEN ROOF TEACHES SHAPE: STAND WHERE THE RAIN IS NOT',
      at: AT[1],
      mentor: 'DRUMMER EZRA',
      objectives: [
        { label: 'Concede 1 or fewer in 3 matches', target: 3, done: 0, check: { kind: 'concede_max', max: 1, count: 3 } },
        { label: 'Keep 1 clean sheet', target: 1, done: 0, check: { kind: 'clean_sheet', count: 1 } },
      ],
      rewardXp: 150,
      rewardBadge: 'LEAN-TO BADGE',
      quote:
        'Drummer Ezra played for our shape, not our feet — he said a team standing right sounds like a tight drumskin, and a team chasing sounds like a burst one. Under the Lean-To you learn to stand where the rain is not. Concede nothing cheap. Nothing.',
    },
    {
      n: 3,
      key: 'THE SALTPITS',
      name: 'The Saltpits',
      tagline: 'THE GRIND — CRAMPS FIRST, WAGES LATER',
      at: AT[2],
      mentor: 'FOREMAN BABA SALT',
      objectives: [
        { label: 'Win 3 ranked matches', target: 3, done: 0, check: { kind: 'win', count: 3, rankedOnly: true } },
        { label: 'Write 2 honest lines in the Loss Journal', target: 2, done: 0, check: { kind: 'journal', count: 2 } },
      ],
      rewardXp: 180,
      rewardBadge: 'SALTPITS BADGE',
      quote:
        'Foreman Baba Salt paid boys in cramps first and wages later — and they all came back the next morning. Ranked is the same contract. Win three. And write two honest lines about what the work cost, because a player who cannot read his own ledger goes broke.',
    },
    {
      n: 4,
      key: 'LONG CORRIDOR',
      name: 'Long Corridor',
      tagline: 'PATIENCE — A LOCK OPENS TOOTH BY TOOTH, NEVER ALL AT ONCE',
      at: AT[3],
      mentor: 'LOCKSMITH VENN',
      objectives: [
        { label: 'Hit 65%+ pass accuracy in 2 matches', target: 2, done: 0, check: { kind: 'pass_acc', min: 65, count: 2 } },
        { label: 'Bank a win you led at 75’', target: 1, done: 0, check: { kind: 'close_out', count: 1 } },
      ],
      rewardXp: 200,
      rewardBadge: 'CORRIDOR BADGE',
      quote:
        'Locksmith Venn could open anything in the Row except a boy in a hurry. “A lock opens tooth by tooth,” he said, “never all at once.” Move their block the same way — pass, pass, wait, pass. Then lead at 75’ and shut the door with your own hand.',
    },
    {
      n: 5,
      key: 'RED LANTERN END',
      name: 'Red Lantern End',
      tagline: 'LATE DRAMA — WHEN THEIR LEGS START NEGOTIATING, YOURS VOTE',
      at: AT[4],
      mentor: 'NIGHT-WATCH KETTLE',
      objectives: [
        { label: 'Win with the decider after the hour', target: 1, done: 0, check: { kind: 'win_decisive_after', minute: 60, count: 1 } },
        { label: 'Score 4 total vs low blocks', target: 4, done: 0, check: { kind: 'goals_vs_style', style: 'LOW BLOCK', count: 4 } },
      ],
      rewardXp: 240,
      rewardBadge: 'RED LANTERN BADGE',
      quote:
        'Night-Watch Kettle lit the red lamps at the row’s end and knew everyone who only came out tired. Winners are made in the hour others sit down. Score late. Break a parked bus. Let the red light find you still standing.',
    },
    {
      n: 6,
      key: 'THE IRON WHISTLE',
      name: 'The Iron Whistle',
      tagline: 'FINALS MENTALITY — FULL TIME WHEN THE CLIMB IS DONE, NOT BEFORE',
      at: AT[5],
      mentor: 'OLD WHISTLE ONYE',
      objectives: [
        { label: 'Win 4 ranked matches', target: 4, done: 0, check: { kind: 'win', count: 4, rankedOnly: true } },
        { label: 'Keep a no-sprint clean sheet', target: 1, done: 0, check: { kind: 'clean_sheet', count: 1, noSprint: true } },
        { label: 'Bank 2 wins you led at 75’', target: 2, done: 0, check: { kind: 'close_out', count: 2 } },
      ],
      rewardXp: 300,
      rewardBadge: 'THE IRON WHISTLE',
      quote:
        'Old Whistle Onye refereed the Row for forty years and swallowed his whistle in the biggest game ever played on Cinder Row — my game. He blew full time when the climb was finished, not a breath before. Become someone he would wait for. Four ranked wins. A silent sheet. Two doors shut at 75’.',
    },
  ],
};

// ── OBINNA — THE MEREHAVEN WAY ───────────────────────────────
const MEREHAVEN: SeasonDef = {
  seasonNo: 1,
  totalStages: 6,
  title: 'THE MEREHAVEN WAY',
  arc: 'THE HARBOUR ROAD TO CALM WATER — HOW THE ICEMAN LEARNED HIS TEMPERATURE',
  playerCard: PLAYER_CARD,
  coachAnchor: COACH_ANCHOR,
  stages: [
    {
      n: 1,
      key: 'TIDE FLATS',
      name: 'Tide Flats',
      tagline: 'FIRST TOUCH — THE TIDE GIVES MINUTES, NOT HOURS',
      at: AT[0],
      mentor: 'FISHER-BOY IDRI',
      objectives: [
        { label: 'Hit 60%+ pass accuracy in 2 matches', target: 2, done: 0, check: { kind: 'pass_acc', min: 60, count: 2 } },
        { label: 'Win 1 ranked match', target: 1, done: 0, check: { kind: 'win', count: 1, rankedOnly: true } },
      ],
      rewardXp: 120,
      rewardBadge: 'TIDE FLATS BADGE',
      quote:
        'Fisher-boy Idri worked the flats barefoot and never once chased the water. “The tide gives minutes, not hours,” he laughed. Touch first. Look up. Let the game come back to you the way the water does. Two calm passing nights and your first ranked win.',
    },
    {
      n: 2,
      key: 'LANTERN CANAL',
      name: 'Lantern Canal',
      tagline: 'RHYTHM — PASSING THAT STOPS FEELING LIKE A PATTERN',
      at: AT[1],
      mentor: 'BOATMAN SOLA',
      objectives: [
        { label: 'Hit 70%+ pass accuracy in 2 matches', target: 2, done: 0, check: { kind: 'pass_acc', min: 70, count: 2 } },
        { label: 'Win once using 1+ mechanics', target: 1, done: 0, check: { kind: 'win_with_mechanics', mechanics: 1, count: 1 } },
      ],
      rewardXp: 150,
      rewardBadge: 'CANAL BADGE',
      quote:
        'Boatman Sola poled the canal at night by lantern and never hurried a bend. “The boat knows the water before you do. Let it finish its thought.” Seventy percent passing, twice — and one win where today’s mechanic does the steering.',
    },
    {
      n: 3,
      key: 'STILLWATER DOCKS',
      name: 'Stillwater Docks',
      tagline: 'PATIENCE VS THE BLOCK — STILL WATER MOVES WHAT STORMS CANNOT',
      at: AT[2],
      mentor: 'DOCKMASTER YEW',
      objectives: [
        { label: 'Score 3 total vs low blocks', target: 3, done: 0, check: { kind: 'goals_vs_style', style: 'LOW BLOCK', count: 3 } },
        { label: 'Concede 1 or fewer in 2 matches', target: 2, done: 0, check: { kind: 'concede_max', max: 1, count: 2 } },
      ],
      rewardXp: 180,
      rewardBadge: 'STILLWATER BADGE',
      quote:
        'Dockmaster Yew moved cargo on the stillest mornings and swore still water out-lifts any storm. A parked bus is a dock wall, little one — lean on it patiently and it opens where it was built to. Three against the block; nothing cheap the other way.',
    },
    {
      n: 4,
      key: 'THE FOG GATE',
      name: 'The Fog Gate',
      tagline: 'COMPOSURE IN CHAOS — WHEN YOU CANNOT SEE, STEER BY FEEL',
      at: AT[3],
      mentor: 'FOGWATCHER NNE',
      objectives: [
        { label: 'Write 2 honest lines in the Loss Journal', target: 2, done: 0, check: { kind: 'journal', count: 2 } },
        { label: 'Bank a win you led at 75’', target: 1, done: 0, check: { kind: 'close_out', count: 1 } },
      ],
      rewardXp: 200,
      rewardBadge: 'FOG GATE BADGE',
      quote:
        'Fogwatcher Nne counted ships through the thickest nights by sound alone. There are match minutes like fog — a deflection, a referee, a tilt — where eyes lie. Write two honest lines about one. Then close a game out while your pulse stays low.',
    },
    {
      n: 5,
      key: 'HARBOUR LIGHTS',
      name: 'Harbour Lights',
      tagline: 'VISION — SEE THE WHOLE PITCH THE WAY A LIGHTHOUSE SEES THE BAY',
      at: AT[4],
      mentor: 'LIGHT-KEEPER AMA',
      objectives: [
        { label: 'Win 3 ranked matches', target: 3, done: 0, check: { kind: 'win', count: 3, rankedOnly: true } },
        { label: 'Win with the decider after 80’', target: 1, done: 0, check: { kind: 'win_decisive_after', minute: 80, count: 1 } },
      ],
      rewardXp: 240,
      rewardBadge: 'HARBOUR LIGHTS BADGE',
      quote:
        'Light-keeper Ama stood above the bay and read weather an hour before sailors felt it. See the whole pitch like that — the run before it starts, the winner before the defending tiredness. Three ranked wins, and one decided after eighty, because you saw it first.',
    },
    {
      n: 6,
      key: 'CALM WATER',
      name: 'Calm Water',
      tagline: 'MASTERY — THE OPPONENT SUPPLIES THE WAVES; YOU REMAIN THE TEMPERATURE',
      at: AT[5],
      mentor: 'ELDER MERE',
      objectives: [
        { label: 'Hit 75%+ pass accuracy once', target: 1, done: 0, check: { kind: 'pass_acc', min: 75, count: 1 } },
        { label: 'Keep 1 clean sheet', target: 1, done: 0, check: { kind: 'clean_sheet', count: 1 } },
        { label: 'Bank 2 wins you led at 75’', target: 2, done: 0, check: { kind: 'close_out', count: 2 } },
      ],
      rewardXp: 300,
      rewardBadge: 'CALM WATER BADGE',
      quote:
        'Elder Mere, oldest head on the water, once told a boy why champions look slow: “The opponent supplies the waves; you remain the temperature.” This is the road’s end, little one — seventy-five on the ball, silence at the back, and two games finished the Iceman way: calm.',
    },
  ],
};

export const JOURNEYS: Record<string, SeasonDef> = {
  chinedu: ASHFAULT,
  obinna: MEREHAVEN,
};

/** this coach's road — the fiction the whole journey UI renders */
export function journeySeasonFor(coachId: string): SeasonDef {
  return JOURNEYS[coachId] ?? MEREHAVEN;
}

// legacy default — consumers that only need shape/counts (progress
// arithmetic, settings badges) share the same 6-stage structure
export const JOURNEY_SEASON = ASHFAULT;

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
