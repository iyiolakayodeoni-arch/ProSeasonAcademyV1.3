// ─────────────────────────────────────────────────────────────
// DAILY PROGRAM — the simple, 6-month day-by-day tracker.
//
// This is deliberately NOT another curriculum. The coaching content
// lives on the Home feed (role-model story, teachings, tutorials).
// Here a player just walks a warm day card one at a time:
//
//   • One day unlocks at a time — you never see the whole list.
//   • Each day carries a light line from the coach + one small task.
//   • A hard 24-hour reset sits between days (your discipline reward).
//   • "Pause for now" freezes the clock when life gets in the way.
//   • A month-by-month calendar shows how far you've come and how
//     long is left.
//
// The player does most of the work; this only tracks it honestly.
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'psa.dailyprog.v1';

/** hard lock between days — 24 hours */
export const COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const MONTHS = 6;
export const DAYS_PER_MONTH = 30;
export const TOTAL_DAYS = MONTHS * DAYS_PER_MONTH; // 180

export interface DailyDay {
  day: number;
  sealedAt: number | null;
}

export interface DailyProgram {
  startedAt: number;
  days: DailyDay[];
  paused: boolean;
  pausedAt: number | null;
  pausedMs: number; // accumulated paused time — pauses stretch every future unlock
}

// ── store ───────────────────────────────────────────────────
let state: DailyProgram | null = null;

function emptyProgram(now = Date.now()): DailyProgram {
  return {
    startedAt: now,
    days: Array.from({ length: TOTAL_DAYS }, (_, i) => ({ day: i + 1, sealedAt: null })),
    paused: false,
    pausedAt: null,
    pausedMs: 0,
  };
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* a full disk must never take the academy down */
  }
}

function revive(raw: string, now: number): DailyProgram {
  try {
    const p = JSON.parse(raw) as Partial<DailyProgram>;
    const days = Array.from({ length: TOTAL_DAYS }, (_, i) => {
      const d = (p.days ?? []).find((x: any) => x.day === i + 1);
      return { day: i + 1, sealedAt: typeof d?.sealedAt === 'number' ? d.sealedAt : null };
    });
    return {
      startedAt: typeof p.startedAt === 'number' ? p.startedAt : now,
      days,
      paused: !!p.paused,
      pausedAt: typeof p.pausedAt === 'number' ? p.pausedAt : null,
      pausedMs: typeof p.pausedMs === 'number' ? Math.max(0, p.pausedMs) : 0,
    };
  } catch {
    return emptyProgram(now);
  }
}

export async function loadDailyProgram(now = Date.now()): Promise<DailyProgram> {
  if (!state) {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      state = raw ? revive(raw, now) : emptyProgram(now);
      if (!raw) void persist();
    } catch {
      state = emptyProgram(now);
    }
  }
  return state;
}

export function getDailyProgram(): DailyProgram | null {
  return state;
}

export async function resetDailyProgramForDev(): Promise<void> {
  state = null;
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// ── time helpers (pure, unit-testable) ──────────────────────
export function monthOf(day: number): number {
  return Math.floor((day - 1) / DAYS_PER_MONTH) + 1;
}
export function weekOf(day: number): number {
  return Math.floor((day - 1) / 7) + 1;
}
export function doneCount(p: DailyProgram): number {
  return p.days.filter((d) => d.sealedAt != null).length;
}
export function daysLeft(p: DailyProgram): number {
  return TOTAL_DAYS - doneCount(p);
}
export function isComplete(p: DailyProgram): boolean {
  return doneCount(p) >= TOTAL_DAYS;
}

/** the first day not yet sealed; TOTAL_DAYS + 1 when the program is complete */
export function currentDay(p: DailyProgram): number {
  for (const d of p.days) if (d.sealedAt == null) return d.day;
  return TOTAL_DAYS + 1;
}

/** the previous day's seal — the reference the cooldown counts from */
export function prevSealAt(p: DailyProgram, day: number): number | null {
  if (day <= 1) return null;
  return p.days[day - 2]?.sealedAt ?? null;
}

/** epoch ms when a day opens. Day 1 opens at start; each later day opens
 *  COOLDOWN after the previous day was sealed, plus any paused time. */
export function unlockAt(p: DailyProgram, day: number): number {
  if (day <= 1) return p.startedAt;
  const seal = prevSealAt(p, day);
  if (seal == null) return p.startedAt;
  return seal + COOLDOWN_MS + p.pausedMs;
}

/** whether a day may be entered right now */
export function isUnlocked(p: DailyProgram, day: number, now = Date.now()): boolean {
  if (day <= 1) return true;
  if (day > TOTAL_DAYS) return false;
  if (prevSealAt(p, day) == null) return false;
  return now >= unlockAt(p, day);
}

export type DailyStatus = 'done' | 'current' | 'future';

/** 'done' = sealed · 'current' = the first unsealed day (may still be locked
 *  by the cooldown) · 'future' = anything after it */
export function status(p: DailyProgram, day: number): DailyStatus {
  if (p.days[day - 1]?.sealedAt != null) return 'done';
  if (day === currentDay(p)) return 'current';
  return 'future';
}

/** ms still to wait before `day` opens. While paused, the clock is frozen. */
export function remainingMs(p: DailyProgram, day: number, now = Date.now()): number {
  const base = p.paused && p.pausedAt != null ? p.pausedAt : now;
  return Math.max(0, unlockAt(p, day) - base);
}

export function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// ── actions ─────────────────────────────────────────────────
export function sealDay(p: DailyProgram, day: number, now = Date.now()): DailyProgram {
  const days = p.days.map((d) => (d.day === day ? { ...d, sealedAt: now } : d));
  state = { ...p, days };
  void persist();
  return state;
}

export function pauseProgram(p: DailyProgram, now = Date.now()): DailyProgram {
  if (p.paused) return p;
  state = { ...p, paused: true, pausedAt: now };
  void persist();
  return state;
}

export function resumeProgram(p: DailyProgram, now = Date.now()): DailyProgram {
  if (!p.paused) return p;
  const extra = p.pausedAt != null ? Math.max(0, now - p.pausedAt) : 0;
  state = { ...p, paused: false, pausedAt: null, pausedMs: p.pausedMs + extra };
  void persist();
  return state;
}

// ── the light daily content — mostly just a line from the coach ──
// The heavy teaching lives on Home. Each day card carries one short line
// and one simple task, so the tracker stays a tracker.
export interface DailyCardContent {
  theme: string; // short card title
  line: string;  // the coach's line for the day (Chinedu's wahala, warm)
  task: string;  // the one small thing to do
}

const DAY1: DailyCardContent = {
  theme: 'THE FIRST DAY',
  line:
    "Sit down. You picked me, so now we work. Today is not about being good — it is about being honest. Play one match, review it straight, and I will meet you here tomorrow. One day at a time, and nobody rushes you. This is your side hustle right now — respect it, but protect it.",
  task: 'Play one real match and do one honest review. That is all. Tomorrow we build.',
};

const LINES = [
  'One match. One honest review. That is the whole job today — do not make it bigger than that.',
  'You do not improve by playing more. You improve by watching yourself more. Today, watch.',
  'Losses are not the enemy. Lying about them is. Log it straight.',
  'No one is coming to save your career. That is not sad news. That is freedom.',
  'Your head goes before your game does. Catch the head slipping today.',
  'Rest is not weakness. It is when the lesson settles. Take it without guilt.',
  'A lesson you do not carry is just a sentence. Carry today’s one.',
  'Wahala is a teacher. Did today’s match teach you, or just stress you?',
  'The hard way is the easy way. Type your truth today.',
  'One clean decision in the box beats forty panicked ones. Find it.',
  'You cannot fix what you refuse to name. Name one thing today.',
  'Small wins are still wins. Bank it.',
  'Pressure is where the habit proves itself. Show up anyway.',
  'The mirror does not flatter. Good. That is why it works.',
  'Today, play the boring game. The one nobody posts. That is the one that wins seasons.',
  'Your first touch decides your afternoon. Make it calm today.',
  'A player who reads his own tape is dangerous. Read it.',
  'Stop blaming the servers. What did YOU do?',
  'Momentum is built on boring days. Today is a boring day — spend it right.',
  'One more honest review and you are a different player than yesterday. Do it.',
  'You do not need to be perfect. You need to be present. Show up.',
  'A calm player thinks faster. Guard your calm today.',
  'The receipts never lie. Check yours.',
  'Fear is not your enemy. Fear without a plan is. Plan today.',
  'Your standard is what you accept. Raise it, one match at a time.',
  'Nobody watched that save. You did. That is enough.',
  'When it gets messy, get boring. Pass it simple, win it honest.',
  'The only player you compete with is yesterday you. Beat him.',
  'If you can win the small things by hand, you can win the big things.',
  'Stay in your lane. Your lane is one honest review a day.',
];

const TASKS = [
  'Play one real match, then do one honest review.',
  'Watch your last match back and name one turning point.',
  'Write one lesson you will carry into the next match.',
  'Rate your head state for one match.',
  'Take a rest day — no guilt, no catch-up.',
  'Log one match into your vault.',
  'Write one honest loss note.',
  'Re-read your last lesson and decide: held or broke?',
  'Give the mirror one honest moment from your last match.',
  'Keep a clean head for one full match — composure is the training.',
];

export function dailyContent(day: number): DailyCardContent {
  if (day <= 1) return DAY1;
  const i = (day - 1) % LINES.length;
  return {
    theme: `DAY ${day}`, // title overridden by the card's eyebrow context
    line: LINES[i],
    task: TASKS[(day - 1) % TASKS.length],
  };
}

/** the month label for the calendar, e.g. "MONTH 3 OF 6" */
export function monthLabel(month: number): string {
  return `MONTH ${month} OF ${MONTHS}`;
}
