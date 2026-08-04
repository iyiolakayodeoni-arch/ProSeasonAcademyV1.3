// ─────────────────────────────────────────────────────────────
// BASELINE SCAN — the 5-match interview that builds the player
// profile card. Semi-automatic BY DESIGN, same principle as the
// Match Vault: THE EYE gets the numbers (score), THE MIND gets
// the truth (composure + a soul-searching answer). We refuse AI
// for the second half on purpose — the manifesto below is the
// product philosophy, said out loud by the coach.
//
// Everything persists to AsyncStorage so a closed app resumes
// mid-baseline. Completed entries ALSO land in the real Match
// Vault (they're real matches — the scan grades them later).
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMatch } from './matches';

const KEY = 'psa.baseline.v1';

export type MatchResult = 'W' | 'D' | 'L';

// ─────────────────────────────────────────────────────────────
// THE BASELINE WEEK — 5 matches across 7 calendar-paced days.
//
// The point of the pacing is HONESTY: one match a day, and the
// review work (watch the recording, name the moments where you
// failed, analyse each one) is done while the day is still real.
// Nothing is bombarded — the next day unlocks 24h after the
// previous one is sealed, so the player always has time to think.
//
//   DAY 1–5   one ranked match + review each (watch → name → analyse)
//   DAY 6     the week so far — receipts + one reflection, no match
//   DAY 7     the ambition question + the sealed profile card
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
    (q) => (m.analysis[q.key] ?? '').trim().length >= BASELINE_MOMENT_MIN_ANSWER,
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

/** build the 7-day schedule. Day 1 opens at the session start; each next day
 *  opens 24h after the previous one is sealed. Old sessions (pre-week) are
 *  migrated from their existing entries so no one is reset mid-baseline. */
function makeDays(entries: BaselineEntry[], startedAt: number): BaselineDay[] {
  const days: BaselineDay[] = [];
  let prevSeal = startedAt;
  for (let day = 1; day <= BASELINE_DAYS; day++) {
    const entryIndex = day <= entries.length ? day - 1 : undefined;
    const sealedAt = entryIndex !== undefined ? entries[entryIndex].at : null;
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
      const raw = await AsyncStorage.getItem(KEY);
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

/** day 6 — the week's reflection, no match */
export function saveBaselineReflection(repeated: string, changed: string): void {
  if (!session) return;
  const days = session.days.map((d) =>
    d.day === 6 ? { ...d, reflection: { repeated: repeated.trim(), changed: changed.trim() } } : d,
  );
  session = { ...session, days };
  void persist();
}

/** which match number a sealed day produced (1-based) */
export function matchNumberForDay(s: BaselineSession | null, day: number): number {
  return (s?.days ?? []).find((d) => d.day === day)?.entryIndex != null
    ? ((s?.days ?? []).find((d) => d.day === day)?.entryIndex ?? 0) + 1
    : day;
}

/** the week's receipts for day 6 — every named moment across the matches */
export function weekMoments(s: BaselineSession | null): BaselineMoment[] {
  return (s?.entries ?? []).flatMap((e) => e.moments ?? []);
}

export function getBaseline(): BaselineSession | null {
  return session;
}

async function persist() {
  await AsyncStorage.setItem(KEY, JSON.stringify(session)).catch(() => {});
}

/** record one debriefed match; also lands in the real vault. The day whose
 *  match this is gets its entry index + recording path linked automatically. */
export function recordBaselineMatch(entry: Omit<BaselineEntry, 'at'>, recordingPath?: string | null): void {
  if (!session) return;
  const at = Date.now();
  session = { ...session, entries: [...session.entries, { ...entry, at }] };
  // match N belongs to day N — link the entry + recording path
  const idx = session.entries.length - 1;
  const days = session.days.map((d) =>
    d.day === idx + 1 ? { ...d, entryIndex: idx, recordingPath: recordingPath ?? null } : d,
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
  await AsyncStorage.removeItem(KEY).catch(() => {});
}

// ═════════════════════════════════════════════════════════════
// CONTENT — the fiction. One voice: Chinedu — blunt, hates losing.
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
      'I have watched a hundred careers die from one disease: lying to yourself after a match. “The game is rigged.” “My phone lagged.” Maybe. Usually it was your head, and we both know it.',
      'You picked my path. Good. I do not do comfort — I do receipts. And for the record: I am glad you are here. Now let us find out the truth about you.',
    ],
    introSignoff: 'Enough about me. Now you.',
    talk: [
      'Before one tactic. Before one mechanic. Five matches. Yours.',
      'Play them normally. After EACH one, come straight back here. I will take the numbers — the easy part. A machine could take the numbers. What I cannot take is the truth, and that is the part that actually changes a player.',
      'Hear me: we do not use AI to read your head. AI can summarise a match — it cannot build your mentality in a live game. Only you can build that, and you build it by thinking for yourself. That is why my questions will dig. That is not a bug in the scan. That IS the scan.',
      'This gate is real, by the way. The academy does not carry passengers. A player who cannot sit with their own performance for five debriefs will not survive a season — better we know now than in week nine. That is us being serious about what we do.',
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
};

/** what the coach says on the REST day (the 24h gap between tasks) */
export const BASELINE_REST_LINES: Record<string, string> = {
  chinedu: 'Rest is part of the work. The match will be here tomorrow — your review needs tonight.',
};
