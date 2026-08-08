// ─────────────────────────────────────────────────────────────
// COACH VOICE — retained for compatibility. The academy has ONE
// coach, Chinedu Okafor. No selection dialogue exists anymore; the
// coach is met and locked in once, permanently.
// ─────────────────────────────────────────────────────────────

export type CoachId = 'chinedu';
export type ReactionKind = 'laugh' | 'flame';

export interface BanterSeg {
  t: string;
  /** rendered in the coach's hot accent color */
  hot?: boolean;
}

export interface BanterMsg {
  segs: BanterSeg[];
  /** reaction chip pinned to this bubble */
  react?: ReactionKind;
}

export interface BanterRun {
  coach: CoachId;
  msgs: BanterMsg[];
}

export const BANTER: BanterRun[] = [
  {
    coach: 'chinedu',
    msgs: [
      { segs: [{ t: "Don't let anyone fool you — I held world #1. Fact, not pitch." }], react: 'laugh' },
      { segs: [{ t: 'Pick me and become dangerous. Comfort is the enemy.' }] },
    ],
  },
];
