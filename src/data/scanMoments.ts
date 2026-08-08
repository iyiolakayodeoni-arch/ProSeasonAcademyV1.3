import { isValidReflection } from './honestyGuard';

// ─────────────────────────────────────────────────────────────
// SCAN MOMENTS — the key-moment vocabulary of the MATCH SCAN.
//
// The scanner (and the player) tags the moments that make or
// break a match — NOT the score. We do not watch or tag the match
// for you; all markers land from honest manual review. Every tag
// earns a guiding question from the coach: he never hands you the
// lesson — he asks until you find it.
//
// The answer to each moment is psychology DATA in the baseline
// (no lesson written there — he is still reading you) and the
// raw ore for THE LESSON once the journey starts (see
// lessonThread.ts — your main quest is always your own words).
// ─────────────────────────────────────────────────────────────

// ── vocabulary ────────────────────────────────────────────────

/** goal moments the player can choose to record during manual review */
export const AUTO_MOMENTS = ['GOAL FOR', 'GOAL AGAINST'] as const;

/** moments the player tags while reviewing their own match */
export const PLAYER_MOMENTS = [
  'LOST BALL',
  'COUNTER AGAINST',
  'BAD DEFENDING',
  'MISSED CHANCE',
  'PANIC PASS',
  'TILT MOMENT',
  'CARD / FOUL',
  'MECHANIC USED',
  'GOOD DECISION',
] as const;

export type KeyMomentKind = (typeof AUTO_MOMENTS)[number] | (typeof PLAYER_MOMENTS)[number];

/** rough match window — honest coarse timing, no stopwatch theatre */
export type MomentWindow = 'EARLY' | 'MID' | 'LATE';

export const MOMENT_WINDOWS: { key: MomentWindow; label: string }[] = [
  { key: 'EARLY', label: 'EARLY · 0–30’' },
  { key: 'MID', label: 'MID · 30–60’' },
  { key: 'LATE', label: 'LATE · 60’+' },
];

export interface TaggedMoment {
  id: string;
  kind: KeyMomentKind;
  when: MomentWindow | null; // null only on EYE-autos before the player sets it
  answer: string; // the player's reasoning under the coach's question
  auto?: boolean; // retained for legacy records; new entries are manual
  eyeNote?: string; // retained for legacy records
}

/** a review is complete when every tag has a window + a real answer */
export const MOMENT_MIN_ANSWER = 8;

export function momentsComplete(moments: TaggedMoment[]): boolean {
  if (!moments.length) return false;
  return moments.every((m) => m.when != null && isValidReflection(m.answer, { minLength: MOMENT_MIN_ANSWER, minWords: 2 }));
}

/** top moment kinds across a set of tagged moments — the "tendencies" read */
export function momentTendencies(moments: { kind: string }[], take = 3): string[] {
  const counts = new Map<string, number>();
  for (const m of moments) counts.set(m.kind, (counts.get(m.kind) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([kind, n]) => `${kind} ×${n}`);
}

// ── the guiding questions — per coach, per moment ─────────────
// Two banks per kind so a second tag of the same kind rotates the
// question instead of repeating it. These never say "you lost
// because X" — they steer the player's headspace so HE finds it.

const BANKS: Record<string, Record<string, string[]>> = {
  chinedu: {
    'GOAL FOR': [
      'Walk me to two actions before your goal — what did you repeat until it broke them?',
      'Was that goal your patience or their error? Both are allowed. Lying about it is not.',
    ],
    'GOAL AGAINST': [
      'What did they repeat before the goal went in?',
      'Two actions before the goal — name YOUR part in it, not the bounce.',
    ],
    'LOST BALL': [
      'What happened two actions before you lost it?',
      'Pressure from them — or greed from you? Which one really took the ball?',
    ],
    'COUNTER AGAINST': [
      'Who was supposed to delay their first pass — and where were you standing?',
      'Were you defending the ball, or defending what came after the ball?',
    ],
    'BAD DEFENDING': [
      'Which runner did you ball-watch straight past you?',
      'Did you jump out to feel useful, or stay in to BE useful?',
    ],
    'MISSED CHANCE': [
      'Did you shoot because it was the best chance — or because you were tired of the attack?',
      'What would one extra pass have changed? Be exact.',
    ],
    'PANIC PASS': [
      'Did you pass because it was open — or because you wanted the pressure to end?',
      'What did your eyes check first — the teammate, or the danger?',
    ],
    'TILT MOMENT': [
      'What did your body want to do — and what did the game actually need?',
      'What was the first rushed input after the mistake? Name it.',
    ],
    'CARD / FOUL': [
      'Was the foul a decision — or a tantrum with studs?',
      'What cheaper foul existed ten seconds earlier?',
    ],
    'MECHANIC USED': [
      'Did the mechanic fit the picture — or did you force it because it was the lesson?',
      'Did the defender bite because you set the bait, or did you just get away with it?',
    ],
    'GOOD DECISION': [
      'Why did it work — the picture they gave you, or the one you made?',
      'Repeat it exactly: what did you check before you chose?',
    ],
  },
};

/** the question the coach asks for the (index-th) tag of this kind */
export function momentQuestion(coachId: string, kind: string, index = 0): string {
  const bank = BANKS[coachId] ?? BANKS.chinedu;
  const list = bank[kind] ?? BANKS.chinedu[kind] ?? ['What was your head doing in that moment?'];
  return list[index % list.length];
}
