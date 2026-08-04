import { ImageSourcePropType } from 'react-native';

export type TrailVariant = 'a' | 'b';

export interface CardStat {
  label: string;
  value: number;
}

export interface Coach {
  id: string;
  name: string;
  /** short identity tag, e.g. "THE DISCIPLINARIAN" */
  title: string;
  /** one-line philosophy shown on the scout file + lock-in sheet */
  oneLiner: string;
  rating: number;
  journeyTag: string; // e.g. "PRO JOURNEY"
  metaLine: string; // e.g. "TOP OF THE GAME · 10+ SEASONS · CONSOLE PRO"
  /** local require(...) or { uri } — swap freely */
  portrait: ImageSourcePropType;
  /** transparent cut-out bust for the Role Model card (falls back to arch-masked portrait) */
  cutout?: ImageSourcePropType;
  /** reframed, headroom-rich bust used on the Role Model card arch */
  cardPortrait?: ImageSourcePropType;
  /** collectible-card accent (Chinedu gold — the one accent) */
  cardAccent: string;
  /** the academy's own 6-stat system shown on the Role Model card */
  cardStats: CardStat[];
  /** which winding trail variant the card shows behind the portrait */
  trailVariant: TrailVariant;
  /** stagger the trail loop so cards don't move in sync */
  trailPhaseMs: number;
}

// ─────────────────────────────────────────────────────────────
// THE COACH — one voice, on purpose.
//
// THE ACADEMY HAS ONE COACH: CHINEDU OKAFOR. The decision to run
// a single voice is a product decision, not a lack of options —
// the only choice a player should carry is the one that moves
// them forward (their training, their thinking, the programme),
// never "which coach do I use". One voice, one path: his road is
// the benchmark, the player's own journey is the evidence.
//
// Edit his data here only — every screen that lists coaches
// renders however many are present.
// ─────────────────────────────────────────────────────────────
export const COACHES: Coach[] = [
  {
    id: 'chinedu',
    name: 'CHINEDU OKAFOR',
    title: 'THE DISCIPLINARIAN',
    oneLiner: 'Comfort is the enemy. We train until losing hurts more than the work.',
    rating: 92,
    journeyTag: 'PRO JOURNEY',
    metaLine: 'TOP OF THE GAME · 10+ SEASONS · CONSOLE PRO',
    portrait: require('../../assets/coaches/chinedu.jpg'),
    cardPortrait: require('../../assets/coaches/chinedu-card.png'),
    cardAccent: '#f2c078',
    cardStats: [
      { label: 'PACE', value: 94 },
      { label: 'FINISH', value: 93 },
      { label: 'VISION', value: 88 },
      { label: 'WORKRATE', value: 91 },
      { label: 'CLUTCH', value: 96 },
      { label: 'IQ', value: 90 },
    ],
    trailVariant: 'a',
    trailPhaseMs: 0,
  },
];
