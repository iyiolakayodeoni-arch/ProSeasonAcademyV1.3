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
  metaLine: string; // e.g. "12 STAGES · CONSOLE PRO"
  /** local require(...) or { uri } — swap freely */
  portrait: ImageSourcePropType;
  /** transparent cut-out bust for the Role Model card (falls back to arch-masked portrait) */
  cutout?: ImageSourcePropType;
  /** reframed, headroom-rich bust used on the Role Model card arch */
  cardPortrait?: ImageSourcePropType;
  /** collectible-card accent (Chinedu gold / Obinna green — set by the approved direction) */
  cardAccent: string;
  /** the academy's own 6-stat system shown on the Role Model card */
  cardStats: CardStat[];
  /** which winding trail variant the card shows behind the portrait */
  trailVariant: TrailVariant;
  /** stagger the trail loop so cards don't move in sync */
  trailPhaseMs: number;
}

// ─────────────────────────────────────────────────────────────
// PLACEHOLDER COACH DATA — edit everything from this one file.
// Add more coaches by appending objects; every screen that lists
// coaches renders however many are present.
// ─────────────────────────────────────────────────────────────
export const COACHES: Coach[] = [
  {
    id: 'chinedu',
    name: 'CHINEDU OKAFOR',
    title: 'THE DISCIPLINARIAN',
    oneLiner: 'Comfort is the enemy. We train until losing hurts more than the work.',
    rating: 92,
    journeyTag: 'PRO JOURNEY',
    metaLine: '12 STAGES · CONSOLE PRO',
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
  {
    id: 'obinna',
    name: 'OBINNA',
    title: 'THE MOTIVATOR',
    oneLiner: 'Calm is trained, not soft. We finish the un-fun parts — together.',
    rating: 88,
    journeyTag: 'PRO JOURNEY',
    metaLine: '10 STAGES · CONSOLE PRO',
    portrait: require('../../assets/coaches/obinna.png'),
    cardPortrait: require('../../assets/coaches/obinna-card.png'),
    cardAccent: '#39FF6A',
    cardStats: [
      { label: 'PACE', value: 84 },
      { label: 'FINISH', value: 86 },
      { label: 'VISION', value: 91 },
      { label: 'WORKRATE', value: 95 },
      { label: 'CLUTCH', value: 89 },
      { label: 'IQ', value: 93 },
    ],
    trailVariant: 'b',
    trailPhaseMs: 1100,
  },
];
