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
  /** the elite benchmark rating — the Standard you chase. Always above the
   *  player's reachable ceiling (96), so the benchmark stays ahead. */
  rating: number;
  journeyTag: string; // e.g. "PRO JOURNEY"
  metaLine: string; // e.g. "THE BENCHMARK · WALKS THE ROAD WITH YOU"
  /** local require(...) or { uri } — swap freely */
  portrait: ImageSourcePropType;
  /** transparent cut-out bust for the Role Model card (falls back to arch-masked portrait) */
  cutout?: ImageSourcePropType;
  /** reframed, headroom-rich bust used on the Role Model card arch */
  cardPortrait?: ImageSourcePropType;
  /** collectible-card accent — gold = the Standard/benchmark */
  cardAccent: string;
  /** the academy's own 6-stat system shown on the Role Model card.
   *  SAME six dimensions as the player's card (src/data/playerCard.ts) so
   *  "YOUR CARD vs THE STANDARD" reads on one instrument. */
  cardStats: CardStat[];
  /** which winding trail variant the card shows behind the portrait */
  trailVariant: TrailVariant;
  /** stagger the trail loop so cards don't move in sync */
  trailPhaseMs: number;
}

// ─────────────────────────────────────────────────────────────
// ONE COACH. Chinedu Okafor is the academy's only coach — your
// permanent guide AND the benchmark (the Standard) you are
// climbing toward. He walks the whole road with you.
//
// His COMPETITIVE PROFILE (rating + the six stats) is grounded in
// the documented game of the current consensus world #1 FC console
// competitor — supreme composure under pressure, elite "cut-and-
// press" defending, a legendary undefeated streak built on
// relentless discipline, clean efficient attacking, and a ruthless
// winning mentality. Per the academy's standing rule, NO real
// player's name or likeness appears inside the app — the real #1
// is research inspiration for the fictional benchmark, never copied.
//
// His CHARACTER and ATTITUDE (THE DISCIPLINARIAN — blunt, hates
// losing, ruthless correction) are unchanged; that voice fits the
// product. Only the benchmark credentials now reflect the real top.
// ─────────────────────────────────────────────────────────────

export const SOLO_COACH_ID = 'chinedu';

export const COACHES: Coach[] = [
  {
    id: 'chinedu',
    name: 'CHINEDU OKAFOR',
    title: 'THE DISCIPLINARIAN',
    oneLiner: 'Comfort is the enemy. We train until losing hurts more than the work.',
    rating: 99,
    journeyTag: 'PRO JOURNEY',
    metaLine: 'THE BENCHMARK · WALKS THE ROAD WITH YOU',
    portrait: require('../../assets/coaches/chinedu.jpg'),
    cardPortrait: require('../../assets/coaches/chinedu-card.png'),
    cardAccent: '#f2c078',
    // grounded in the real world #1's documented traits, on the same six
    // dimensions the player's own card uses:
    //   COMPOSURE is the signature (99) — turns high-stakes matches.
    //   DEFENCE (97) — cut-and-press, never stops at one blocked lane.
    //   DISCIPLINE (98) — the undefeated streak; the routine is the talent.
    //   CLUTCH (98) — decides the late minutes, deliberately.
    //   INSIGHT (97) — reads the game, forces mistakes instead of waiting.
    //   FORM (96) — sustained #1, results that don't wobble.
    cardStats: [
      { label: 'FORM', value: 96 },
      { label: 'DEFENCE', value: 97 },
      { label: 'COMPOSURE', value: 99 },
      { label: 'DISCIPLINE', value: 98 },
      { label: 'CLUTCH', value: 98 },
      { label: 'INSIGHT', value: 97 },
    ],
    trailVariant: 'a',
    trailPhaseMs: 0,
  },
];

/** the academy's one coach — the single source of truth */
export function getCoach(): Coach {
  return COACHES[0];
}

/** look up by id (kept for the session-restore path); always resolves to the solo coach */
export function coachById(id: string | null | undefined): Coach {
  return COACHES.find((c) => c.id === id) ?? COACHES[0];
}
