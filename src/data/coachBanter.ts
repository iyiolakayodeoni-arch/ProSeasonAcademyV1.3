// ─────────────────────────────────────────────────────────────
// COACH SELECTION — the one-way "group chat" script.
// The two coaches make their case to the new player; the player
// never replies — they just pick a side at the end.
// This is the FINAL dialogue (matches the approved design).
// Edit lines here only — the screen renders whatever is present.
// ─────────────────────────────────────────────────────────────

export type CoachId = 'chinedu' | 'obinna';
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
      { segs: [{ t: "Don't let him fool you. I held world #1 — fact, not pitch. My thumbs still send me invoices." }], react: 'laugh' },
    ],
  },
  {
    coach: 'obinna',
    msgs: [
      {
        segs: [
          { t: "I'm not here to compete. I'm here for " },
          { t: 'YOU', hot: true },
          { t: '. What do you actually need right now?' },
        ],
        react: 'laugh',
      },
    ],
  },
  {
    coach: 'chinedu',
    msgs: [
      { segs: [{ t: 'At least mine show up when it matters. Unlike my first coffee of the day.' }], react: 'laugh' },
      { segs: [{ t: '…he says that to everyone. Same speech, every player.' }] },
    ],
  },
  {
    coach: 'obinna',
    msgs: [
      {
        segs: [
          { t: "While you called it talent, I trained six days a week. Calm isn't soft, Chinedu — it's " },
          { t: 'trained', hot: true },
          { t: '.' },
        ],
      },
      { segs: [{ t: 'Your journey. Your pace. I make sure you finish the un-fun parts.' }] },
    ],
  },
  {
    coach: 'chinedu',
    msgs: [
      {
        segs: [
          { t: 'Pick him, stay comfortable. Pick me — become ' },
          { t: 'dangerous', hot: true },
          { t: '.' },
        ],
      },
      {
        segs: [{ t: "I've been to the low point already. I know the way through." }],
        react: 'flame',
      },
    ],
  },
  {
    coach: 'obinna',
    msgs: [
      {
        segs: [
          { t: 'I lost a final on the biggest stage and showed up next morning. Pick who walks you back from ' },
          { t: 'that', hot: true },
          { t: ' night.' },
        ],
      },
    ],
  },
];
