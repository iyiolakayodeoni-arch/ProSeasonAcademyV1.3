// ─────────────────────────────────────────────────────────────
// BASELINE SCAN — the 7-day interview that builds the player
// profile card. Structured around "The Chinedu Way":
//   DAY 1–3: Match 1, 2, 3 (build momentum)
//   DAY 4:   Rest Day 1 (mid-week rest & reflection, no match)
//   DAY 5:   Match 4
//   DAY 6:   Rest Day 2 (pre-finale rest & preparation, no match)
//   DAY 7:   Match 5 (The Finale) + Ambition & Profile Card seal
//
// For every match, players follow The Chinedu Way ritual:
//   1. Record as usual and watch the match tape.
//   2. Pen the key moments and unusual events on paper with a biro.
//      "There is a special connection a biro has to a book that
//       cannot be typed."
//   3. Let their mind cool down for 24–30 minutes.
//   4. Type their written answers into the Academy database.
//   "The hard way is the easy way. Tech is meant to elevate and
//    not make you dormant."
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMatch } from './matches';
import { isValidReflection } from './honestyGuard';
import * as backend from './backend';

const KEY = 'psa.baseline.v1';

function baselineStorageKey(): string {
  const me = backend.getMe();
  return me?.id ? `${KEY}.${me.id}` : KEY;
}

export type MatchResult = 'W' | 'D' | 'L';

// ─────────────────────────────────────────────────────────────
// THE BASELINE WEEK — 5 matches across 7 calendar-paced days.
//
// The point of the pacing is HONESTY and RESILIENCE: three matches
// build momentum, then a rest day to reflect; one match, then a
// rest day to prepare; finally Match 5 (The Finale). The next day
// unlocks 24h after the previous one is sealed, so the player
// always has time to think and let their mind cool down.
//
//   DAY 1, 2, 3   Matches 1, 2, 3 + review each (watch → pen → database)
//   DAY 4         Rest Day 1 — mid-week reflection on matches 1–3
//   DAY 5         Match 4 + review
//   DAY 6         Rest Day 2 — pre-finale preparation & reflection
//   DAY 7         Match 5 (The Finale) + Ambition & Profile Card seal
// ─────────────────────────────────────────────────────────────
export const BASELINE_MATCHES = 5;
export const BASELINE_DAYS = 7;
export const BASELINE_DAY_MS = 24 * 60 * 60 * 1000;

/** the per-moment analysis of a failing moment (the day's core task) */
export type BaselineAnalysisKey =
  | 'happened'
  | 'thinking'
  | 'feel'
  | 'cause'
  | 'why'
  | 'noticed'
  | 'missed'
  | 'differently'
  | 'evidence';

export const BASELINE_MOMENT_QUESTIONS: { key: BaselineAnalysisKey; label: string }[] = [
  { key: 'happened', label: 'WHAT HAPPENED?' },
  { key: 'thinking', label: 'WHAT WERE YOU THINKING IN THAT MOMENT?' },
  { key: 'feel', label: 'WHAT WERE YOU FEELING?' },
  { key: 'cause', label: 'WHAT MADE YOU FAIL THERE?' },
  { key: 'why', label: 'WHY DID THIS MOMENT TURN AGAINST YOU?' },
  { key: 'noticed', label: 'WHAT DID YOU NOTICE BEFORE THE DECISION?' },
  { key: 'missed', label: 'WHAT DID YOU FAIL TO NOTICE?' },
  { key: 'differently', label: 'WHAT COULD YOU HAVE DONE DIFFERENTLY?' },
  { key: 'evidence', label: 'WHAT EVIDENCE SUPPORTS YOUR ANSWER?' },
];

export const BASELINE_MOMENT_MIN_ANSWER = 8;

/** optional coarse tags a player can stick on a named moment — they feed the
 *  week's tendency read. Honesty is never forced: naming is required, tagging
 *  is a choice. */
export const BASELINE_MOMENT_TAGS = [
  'LOST BALL',
  'PANIC PASS',
  'TILT MOMENT',
  'BAD DEFENDING',
  'MISSED CHANCE',
  'COUNTER AGAINST',
  'CARD / FOUL',
] as const;

/** a moment the player named from the recording — their words, their timeline */
export interface BaselineMoment {
  id: string;
  /** the player's own name for the moment, e.g. "CONCEDED AFTER A PANIC PASS" */
  name: string;
  startMin: number;
  endMin: number;
  /** optional coarse tag (LOST BALL / PANIC PASS / TILT MOMENT…) — feeds the
   *  week's tendency read. Skipping is allowed; honesty is not forced. */
  tag: string | null;
  /** derived: "27’–31’" (kept for legacy consumers) */
  when: string | null;
  /** derived: the tag, or 'FAIL MOMENT' (feeds tendenciesOf) */
  kind: string;
  /** legacy slot: the 'happened' answer (kept for old readers) */
  answer: string;
  /** the per-moment analysis — the player's own words, never ours */
  analysis: Partial<Record<BaselineAnalysisKey, string>>;
}

export function baselineMomentComplete(m: BaselineMoment): boolean {
  return BASELINE_MOMENT_QUESTIONS.every(
    (q) => isValidReflection(m.analysis[q.key] ?? '', { minLength: BASELINE_MOMENT_MIN_ANSWER, minWords: 2 }),
  );
}

export interface BaselineDay {
  day: number; // 1..7
  sealedAt: number | null;
  /** epoch ms when this day opened (day 1 = session start; later days = prev seal + 24h) */
  unlockedAt: number;
  entryIndex?: number; // match days: index into entries[]
  recordingPath?: string | null; // the day's local recording, if any
  reflection?: { repeated: string; changed: string }; // day 6
}

export interface BaselineEntry {
  gf: number;
  ga: number;
  result: MatchResult;
  composure: number; // 1..5
  question: string; // the deep question that was asked
  answer: string;   // the soul-searching answer (their words, not ours)
  /** the failing moments the player named from the recording + their analysis.
   *  NO lesson is written during the trial: the lessons start at Stage 1. */
  moments: BaselineMoment[];
  at: number;
}

export interface BaselineCard {
  handle: string;
  coachId: string;
  played: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  avgComposure: number; // 1..5
  tier: string;         // sealed title — computed from THE MIND, not the score
  coachRead: string;    // his verdict line, in his voice
  ambition: string;     // their words — he will bring this up later
  /** what the 20+ tags across 5 matches say you tend to do under pressure */
  tendencies: string[];
  sealedAt: number;
}

export interface BaselineSession {
  coachId: string;
  entries: BaselineEntry[];
  ambition: string | null;
  card: BaselineCard | null;
  startedAt: number;
  /** the 7-day schedule (migrated automatically for old sessions) */
  days: BaselineDay[];
}

// ── store ────────────────────────────────────────────────────
let session: BaselineSession | null = null;
let hydrated = false;

/** Day 1, 2, 3, 5, 7 are match days; Day 4 and 6 are rest days */
export function isBaselineMatchDay(day: number): boolean {
  return day === 1 || day === 2 || day === 3 || day === 5 || day === 7;
}

export function isBaselineRestDay(day: number): boolean {
  return day === 4 || day === 6;
}

/** Day to entry index (0-based) for match days */
export function dayToEntryIndex(day: number): number | undefined {
  switch (day) {
    case 1:
      return 0;
    case 2:
      return 1;
    case 3:
      return 2;
    case 5:
      return 3;
    case 7:
      return 4;
    default:
      return undefined;
  }
}

/** Entry index (0-based) to day number (1..7) */
export function entryIndexToDay(idx: number): number {
  switch (idx) {
    case 0:
      return 1;
    case 1:
      return 2;
    case 2:
      return 3;
    case 3:
      return 5;
    case 4:
      return 7;
    default:
      return idx + 1;
  }
}

/** build the 7-day schedule. Day 1 opens at the session start; each next day
 *  opens 24h after the previous one is sealed. Old sessions (pre-week) are
 *  migrated from their existing entries so no one is reset mid-baseline. */
function makeDays(entries: BaselineEntry[], startedAt: number): BaselineDay[] {
  const days: BaselineDay[] = [];
  let prevSeal = startedAt;
  for (let day = 1; day <= BASELINE_DAYS; day++) {
    const targetIdx = dayToEntryIndex(day);
    const entryIndex = targetIdx !== undefined && targetIdx < entries.length ? targetIdx : undefined;
    let sealedAt: number | null = null;
    if (entryIndex !== undefined) {
      sealedAt = entries[entryIndex].at;
    } else if (day === 4 && entries.length >= 4) {
      sealedAt = entries[2].at + 1000;
    } else if (day === 6 && entries.length >= 5) {
      sealedAt = entries[3].at + 1000;
    }
    const unlock = day === 1 ? startedAt : prevSeal + BASELINE_DAY_MS;
    days.push({ day, sealedAt, unlockedAt: unlock, entryIndex });
    if (sealedAt != null) prevSeal = sealedAt;
  }
  return days;
}

export async function loadBaseline(coachId: string): Promise<BaselineSession> {
  if (!hydrated) {
    hydrated = true;
    try {
      const raw = await AsyncStorage.getItem(baselineStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BaselineSession>;
        session = {
          coachId: parsed.coachId ?? coachId,
          entries: Array.isArray(parsed.entries) ? (parsed.entries as BaselineEntry[]) : [],
          ambition: typeof parsed.ambition === 'string' ? parsed.ambition : null,
          card: parsed.card && typeof parsed.card === 'object' ? (parsed.card as BaselineCard) : null,
          startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : Date.now(),
          // pre-week sessions have no `days` — migrate from their entries
          days: Array.isArray(parsed.days)
            ? (parsed.days as BaselineDay[])
            : makeDays(
                Array.isArray(parsed.entries) ? (parsed.entries as BaselineEntry[]) : [],
                typeof parsed.startedAt === 'number' ? parsed.startedAt : Date.now(),
              ),
        };
      }
    } catch {
      /* corrupt → fresh session */
    }
  }
  if (!session || session.coachId !== coachId) {
    const now = Date.now();
    session = { coachId, entries: [], ambition: null, card: null, startedAt: now, days: makeDays([], now) };
    void persist();
  }
  return session;
}

// ── THE WEEK — schedule helpers (pure, unit-tested) ──────────

/** the first day not yet sealed; BASELINE_DAYS + 1 when the week is complete */
export function currentBaselineDay(s: BaselineSession | null): number {
  if (!s) return 1;
  for (let day = 1; day <= BASELINE_DAYS; day++) {
    if (!(s.days ?? []).find((d) => d.day === day)?.sealedAt) return day;
  }
  return BASELINE_DAYS + 1;
}

export function isWeekComplete(s: BaselineSession | null): boolean {
  return currentBaselineDay(s) > BASELINE_DAYS;
}

/** when the current unsealed day unlocks (null when the week is complete) */
export function nextUnlockAt(s: BaselineSession | null): number | null {
  const day = currentBaselineDay(s);
  if (day > BASELINE_DAYS) return null;
  return (s?.days ?? []).find((d) => d.day === day)?.unlockedAt ?? s?.startedAt ?? 0;
}

export type BaselineDayStatus = 'done' | 'today' | 'locked' | 'future';

export function dayStatus(s: BaselineSession | null, day: number): BaselineDayStatus {
  if (!s) return day === 1 ? 'today' : 'future';
  const d = s.days.find((x) => x.day === day);
  if (d?.sealedAt) return 'done';
  const cur = currentBaselineDay(s);
  if (day > cur) return 'future';
  return Date.now() >= (d?.unlockedAt ?? 0) ? 'today' : 'locked';
}

// ── THE WEEK — day actions ───────────────────────────────────

/**
 * Seal a day of the week. The next day unlocks 24h from THIS seal —
 * that enforced gap is the honesty mechanism: it gives the player a
 * full day to sit with the review before the next match.
 */
export function sealBaselineDay(day: number, extra?: Partial<BaselineDay>): void {
  if (!session) return;
  const sealedAt = Date.now();
  const days = session.days.map((d) => (d.day === day ? { ...d, ...extra, sealedAt } : d));
  const nextIdx = days.findIndex((d) => d.day === day + 1);
  if (nextIdx >= 0 && !days[nextIdx].sealedAt) {
    days[nextIdx] = { ...days[nextIdx], unlockedAt: sealedAt + BASELINE_DAY_MS };
  }
  session = { ...session, days };
  void persist();
}

/** day 4 or day 6 — the week's rest & reflection days (no match) */
export function saveBaselineReflection(dayOrRepeated: number | string, repeatedOrChanged: string, maybeChanged?: string): void {
  if (!session) return;
  let day = 6;
  let repeated = '';
  let changed = '';
  if (typeof dayOrRepeated === 'number') {
    day = dayOrRepeated;
    repeated = repeatedOrChanged;
    changed = maybeChanged ?? '';
  } else {
    day = currentBaselineDay(session);
    if (day !== 4 && day !== 6) day = 6;
    repeated = dayOrRepeated;
    changed = repeatedOrChanged;
  }
  const days = session.days.map((d) =>
    d.day === day ? { ...d, reflection: { repeated: repeated.trim(), changed: changed.trim() } } : d,
  );
  session = { ...session, days };
  void persist();
}

/** which match number a sealed day produced (1-based) */
export function matchNumberForDay(s: BaselineSession | null, day: number): number {
  const d = (s?.days ?? []).find((x) => x.day === day);
  if (d?.entryIndex != null) return d.entryIndex + 1;
  switch (day) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 3:
      return 3;
    case 4:
      return 3;
    case 5:
      return 4;
    case 6:
      return 4;
    case 7:
      return 5;
    default:
      return day;
  }
}

/** the week's receipts for day 6 — every named moment across the matches */
export function weekMoments(s: BaselineSession | null): BaselineMoment[] {
  return (s?.entries ?? []).flatMap((e) => e.moments ?? []);
}

export function getBaseline(): BaselineSession | null {
  return session;
}

async function persist() {
  await AsyncStorage.setItem(baselineStorageKey(), JSON.stringify(session)).catch(() => {});
}

/** record one debriefed match; also lands in the real vault. The day whose
 *  match this is gets its entry index + recording path linked automatically. */
export function recordBaselineMatch(entry: Omit<BaselineEntry, 'at'>, recordingPath?: string | null): void {
  if (!session) return;
  const at = Date.now();
  session = { ...session, entries: [...session.entries, { ...entry, at }] };
  const idx = session.entries.length - 1;
  const matchDay = entryIndexToDay(idx);
  const days = session.days.map((d) =>
    d.day === matchDay ? { ...d, entryIndex: idx, recordingPath: recordingPath ?? null } : d,
  );
  session = { ...session, days };
  const momentLine = entry.moments.length
    ? entry.moments.map((m) => `${m.kind}@${m.when ?? '?'}`).join(' · ')
    : 'NONE TAGGED';
  addMatch(
    {
      gf: entry.gf,
      ga: entry.ga,
      mode: 'RANKED',
      oppStyle: 'HARD TO TELL',
      passAcc: null,
      noSprint: false,
      mechanicsUsed: 0,
      ledAt75: null,
      decisive: null,
      composure: entry.composure,
      note: `BASELINE M${idx + 1} — ${entry.answer} | MOMENTS: ${momentLine}`.slice(0, 140),
    },
    'manual',
  );
  void persist();
}

export async function sealBaseline(handle: string, coachId: string, ambition: string): Promise<BaselineCard> {
  const e = session?.entries ?? [];
  const w = e.filter((m) => m.result === 'W').length;
  const d = e.filter((m) => m.result === 'D').length;
  const l = e.filter((m) => m.result === 'L').length;
  const avg = e.length ? e.reduce((s, m) => s + m.composure, 0) / e.length : 0;
  const card: BaselineCard = {
    handle,
    coachId,
    played: e.length,
    w, d, l,
    gf: e.reduce((s, m) => s + m.gf, 0),
    ga: e.reduce((s, m) => s + m.ga, 0),
    avgComposure: Math.round(avg * 10) / 10,
    tier: tierFor(avg),
    coachRead: coachReadFor(coachId, avg, w, l),
    ambition,
    tendencies: tendenciesOf(e),
    sealedAt: Date.now(),
  };
  session = { ...(session as BaselineSession), ambition, card };
  await persist();
  return card;
}

/** the top scanners' reads across the trial — what pressure does to THIS player */
export function tendenciesOf(entries: Pick<BaselineEntry, 'moments'>[]): string[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    for (const m of e.moments ?? []) counts.set(m.kind, (counts.get(m.kind) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([kind, n]) => `${kind} ×${n}`);
}

export function tierFor(avgComposure: number): string {
  if (avgComposure >= 4.4) return 'ICE VEINS';
  if (avgComposure >= 3.6) return 'STEADY HANDS';
  if (avgComposure >= 2.8) return 'WORKING HEAD';
  if (avgComposure >= 2) return 'HOT HEAD — REPAIRABLE';
  return 'VOLCANO — FOR NOW';
}

function coachReadFor(coachId: string, avg: number, w: number, l: number): string {
  if (coachId === 'chinedu') {
    if (avg >= 3.6) return `Acceptable base. ${w} win${w === 1 ? '' : 's'}, head mostly intact. The scan will find the cracks — that's what it's for.`;
    return `I read the debriefs, not just the scores. Your head goes before your game does. We fix the head first — the rest is mechanics.`;
  }
  if (avg >= 3.6) return `A good foundation, little one. ${w} win${w === 1 ? '' : 's'} and a calm head. Now we sharpen what the calm is protecting.`;
  return `I saw the debriefs, little one. The scores don't worry me — the storms do. Good news: storms can be trained. That's my whole job.`;
}

export async function resetBaselineForDev(): Promise<void> {
  session = null;
  hydrated = false;
  await AsyncStorage.removeItem(baselineStorageKey()).catch(() => {});
}

// ═════════════════════════════════════════════════════════════
// CONTENT — the fiction. Coach voices per coaches.ts canon:
// Chinedu = blunt, hates losing. Obinna = calm, "little one".
// ═════════════════════════════════════════════════════════════

export interface CoachScript {
  /** his introduction — shown right after the path lock */
  intro: string[];
  introSignoff: string;
  /** the serious talk before M1: how the baseline works + why it matters */
  talk: string[];
  /** the in-character bluff about honesty (flavor, not an app claim) */
  bluff: string;
  /** deep questions by result — rotated across the 5 matches */
  questions: Record<MatchResult, string[]>;
  /** funny story beats, keyed by scoreline shape (see beatKey) */
  beats: Record<BeatKey, string>;
  /** the ambition ask — final question before the card seals */
  ambitionAsk: string;
}

export type BeatKey = 'winBig' | 'winTight' | 'drawGoals' | 'drawNill' | 'lossBig' | 'lossTight';

export function beatKey(gf: number, ga: number): BeatKey {
  if (gf === ga) return gf === 0 ? 'drawNill' : 'drawGoals';
  if (gf > ga) return gf - ga >= 3 ? 'winBig' : 'winTight';
  return ga - gf >= 3 ? 'lossBig' : 'lossTight';
}

export const BASELINE_SCRIPTS: Record<string, CoachScript> = {
  chinedu: {
    intro: [
      'Sit down. My name is Chinedu. They call me THE DISCIPLINARIAN and I earned every letter of it.',
      'I was never the best player on any pitch. Too slow, too small, take your pick. So I became the most honest one instead — and honest players are the ones still standing in April.',
      'I have watched a hundred careers die from one disease: lying to yourself after a match. “The game is rigged.” “My controller lagged.” Maybe. Usually it was your head, and we both know it.',
      'You picked my path. Good. I do not do comfort — I do receipts. And for the record: I am glad you are here. Now let us find out the truth about you.',
    ],
    introSignoff: 'Enough about me. Now you.',
    talk: [
      'Before one tactic. Before one mechanic. Five matches. Yours.',
      'For every match, follow The Chinedu Way: record your console match as usual and watch your tape back. Take a biro and paper — there is a special connection a biro has to a book that cannot be typed. Pen your key moments and unusual events on paper first.',
      'Let your head cool for 24–30 minutes after full time. Only when your mind has settled do you open the app and type your written truth into your database.',
      'In a world where everyone is looking for the easy way out, we tell you that the hard way is the easy way, and the easy way is the hard way. Do things the right way. Tech is meant to elevate and not make you dormant. That is the Chinedu Way.',
    ],
    bluff:
      'One warning. Answer honestly. I have listened to two thousand debriefs — I know what a lie sounds like before you finish the sentence. Try me once and you will not try me twice.',
    questions: {
      W: [
        'Which goal actually mattered — patience, or luck? Pick one and defend it.',
        'What did you do at 1–0 that you normally never do? Be exact.',
        'After you took the lead, did you keep YOUR plan or play THEIR panic? What changed in your head?',
        'A win hides cracks better than a loss exposes them. Name one crack this win is hiding.',
        'If your next opponent watches this match back, what will they punish? Answer for them.',
      ],
      D: [
        'A draw is a mirror. What did they take from you that you quietly allowed?',
        'Point to the minute the game started slipping. What did you do with that feeling?',
        'If this draw were a cup final, where did you lose the trophy?',
        'Which decision would you take back — and why did it feel right at the time?',
        'Did you chase the winner like a pro or like a gambler? What tells you the difference?',
      ],
      L: [
        'The first goal you conceded: before it went in — what were YOU doing? Start there.',
        'After they scored, what changed in your decisions? Not theirs. Yours.',
        'If I watched only your last fifteen minutes, what would I say about your mentality?',
        'Excuse or reason? Take your strongest excuse and argue against it. Now.',
        'What did this loss cost you — points, pride, or patience? Rank them and tell me why.',
      ],
    },
    beats: {
      winBig:
        'A big win? Hah. I once won 5–0 and my coach made me write my review on the BUS home. “You enjoyed that too much,” he said. He was right. Enjoy it — then we look at what THEY did wrong.',
      winTight:
        'One-goal wins build careers. The first trophy I ever held was 1–0 — an own goal. Nobody needs to know I celebrated like I had scored a bicycle kick. Take the win; we audit the nerves.',
      drawGoals:
        'A draw with goals takes me back. I once led 2–0 and “managed the game” so brilliantly we drew 2–2. My legs remembered the plan. My brain went on holiday.',
      drawNill:
        'Zero-zero. The scoreline nobody frames. In my old league we called that “two coaches pretending it was tactical.” One of you blinked in your head — was it you?',
      lossBig:
        'A heavy one. Fine. I once lost 6–1 and wrote three pages about it. Page four was tears, but pages one to three got me a clean sheet the next week. We write it down or it writes YOU down.',
      lossTight:
        'A one-goal loss is a small lie scoreboards tell. I lost a final 1–0 to a deflection off a man tying his boot. True story. The lesson is never the bounce — it is the ninety minutes before it.',
    },
    ambitionAsk:
      'Last question of the baseline, and I want the real one, not the polite one. Where are you going with this? Not “up a division.” Where. I will hold you to it.',
  },

  obinna: {
    intro: [
      'Come in, come in, little one. I am Obinna — THE MOTIVATOR, though between us, I mostly hate watching good players quit on themselves.',
      'I played academy football until my knee ended it at nineteen. For two years I was angry at the world. Then a coach sat me down and asked questions I did not want to answer. That conversation is why I am standing here.',
      'Somebody has to ask you the real questions too — gently, but actually ask them. That is me. For the record: you choosing this path genuinely made my day.',
      'So before tactics, before mechanics — we find out who you are when the goals are going in against you. That player, the one under pressure, is the one I coach.',
    ],
    introSignoff: 'My story is told. Yours starts now, little one.',
    talk: [
      'Welcome, little one. My name is Obinna. In this academy, we build the mind first — five baseline matches across seven days, walked at your own pace.',
      'For every match, we train The Chinedu Way: record your console match as usual and watch your tape back. Take a biro and paper — there is a special connection a biro has to a book that cannot be typed. Pen your key moments and unusual events on paper first.',
      'Let your mind cool down for 24–30 minutes after full time. Only when your head has settled do you open the app and type your written truth into your database.',
      'In a world where everyone is looking for the easy way out, we tell you that the hard way is the easy way, and the easy way is the hard way. Tech is meant to elevate and not make you dormant. That is our way.',
    ],
    bluff:
      'And little one — be honest with me. I have heard every excuse ever built; I can hear the difference between a player telling the truth and a player performing it. Honest answers make you better and make me better for you. Win-win.',
    questions: {
      W: [
        'Little one, tell me the honest version: which part of that win was YOURS, and which part was the game being kind?',
        'When you went ahead, what did your body do — relax or tighten? Why do you think that is?',
        'What did you do well today that nobody watching would ever notice?',
        'If this win has a lesson you might ignore, what is it?',
        'Who were you in the last ten minutes — the closer or the survivor? What does that tell us?',
      ],
      D: [
        'A draw, little one. Where did you feel the balance tip — and what did you do with that feeling?',
        'What did you give them for free today? Not what they earned — what you gave.',
        'If this draw were a final, where did you leave the trophy?',
        'Was there a moment you played not to lose instead of playing to win? Tell me about it honestly.',
        'What would your teammate say you should have done differently? Answer for them.',
      ],
      L: [
        'Little one, walk me to the first goal — before it went in, where was your attention? Start there.',
        'After they scored, what did the voice in your head say? The real one. I have heard them all.',
        'If I watched only your last fifteen minutes, what would I believe about your heart? Tell me true.',
        'What is the kindest excuse you are telling yourself right now? Now tell me the truth under it.',
        'Losses are tuition, they say. What exactly did this one teach you — in one sentence you would sign?',
      ],
    },
    beats: {
      winBig:
        'A big win, little one! My first ever “big win” was 4–0… in a friendly… against a team that arrived with nine men. I still count it. We do not speak of it. Enjoy yours — THEN we audit it.',
      winTight:
        'A one-goal win — my favourite kind, honestly? You know why? Because somewhere in those minutes, you chose to suffer correctly, and nobody claps for that. I clap for that.',
      drawGoals:
        'A scoring draw! My first draw like that, I sprinted to celebrate OUR equaliser and pulled my hamstring. Missed two weeks. The lesson, little one: celebrate after the debrief.',
      drawNill:
        'Zero-zero — the scoreline that puts crowds to sleep and coaches to work. My old gaffer called it “a chess match where nobody moved.” Prove him wrong with your answers today.',
      lossBig:
        'A heavy loss, little one. My worst was 7–1. My coach bought me dinner after and said, “good — now you know exactly how much work you have.” I never forgot. Neither will you.',
      lossTight:
        'A narrow one. I once lost 1–0 to a goal that came off a man fixing his sock. True story, little one. But we never talk about the bounce — we talk about the ninety minutes before it.',
    },
    ambitionAsk:
      'One more thing, little one, and this stays between us until we need it: where do you want your game to BE when we look back a year from now? Tell me the real dream — I will hold it for you.',
  },
};

// ── THE WEEK — short day-to-day lines (match days 2–5, rest, reflection) ──
// Day 1 uses the full TALK. Day 7 uses ambitionAsk. These keep the pacing
// human: a word from the coach, then the day's work — never a wall of text.

export const BASELINE_DAY_INTRO: Record<string, Record<number, string>> = {
  chinedu: {
    2: 'Match two. Yesterday’s moments are still warm — good. Bring them into this one on purpose.',
    3: 'Halfway, little bro. The mirror does not care about your excuses, and neither do I. Play like day one meant something.',
    4: 'Match four. You should be starting to hear yourself before you do it. That is the point of this week.',
    5: 'Last trial match. Leave yourself nothing to hide behind — the card you get is built from these five days.',
    6: 'No match today. Sit with the week — I will show you what you keep doing; you tell me what it means.',
  },
  obinna: {
    2: 'Match two, little one. Let yesterday’s review sit inside you before you play — calm carries over.',
    3: 'Halfway. The water remembers every ripple — and so do I. I have your week in front of me.',
    4: 'Match four. Notice how you start. Notice when the calm goes. That noticing IS the training.',
    5: 'The last trial match, little one. Play it like the mirror is kind — because it is, and it does not forget.',
    6: 'Rest today. The week has been speaking to you — today we listen to it together.',
  },
};

/** what the coach says on the REST day (the 24h gap between tasks) */
export const BASELINE_REST_LINES: Record<string, string> = {
  chinedu: 'Rest is part of the work. The match will be here tomorrow — your review needs tonight.',
  obinna: 'Sit with today’s review, little one. The match will still be here tomorrow — and so will I.',
};
