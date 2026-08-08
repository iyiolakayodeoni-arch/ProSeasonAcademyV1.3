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
//   3. Let their mind cool down for 30 minutes.
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
// THE BASELINE WEEK — 5 matches and 2 reflection days, at the player’s pace.
//
// Players progress through the week at their own pace: three matches
// build momentum, then a rest day to reflect; one match, then a
// rest day to prepare; finally Match 5 (The Finale). Completing a day
// immediately opens the next one.
//
//   DAY 1, 2, 3   Matches 1, 2, 3 + review each (watch → pen → database)
//   DAY 4         Rest Day 1 — mid-week reflection on matches 1–3
//   DAY 5         Match 4 + review
//   DAY 6         Rest Day 2 — pre-finale preparation & reflection
//   DAY 7         Match 5 (The Finale) + Ambition & Profile Card seal
// ─────────────────────────────────────────────────────────────
export const BASELINE_MATCHES = 5;
export const BASELINE_DAYS = 7;

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

// Three focused prompts give a player a useful baseline without turning a
// five-match week into forty-five essay boxes. Older saved answers are kept;
// these are simply the questions a new player must answer now.
export const BASELINE_MOMENT_QUESTIONS: { key: BaselineAnalysisKey; label: string }[] = [
  { key: 'happened', label: 'WHAT HAPPENED?' },
  { key: 'missed', label: 'WHAT DID YOU MISS OR FAIL TO NOTICE?' },
  { key: 'differently', label: 'WHAT WILL YOU TRY DIFFERENTLY NEXT TIME?' },
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
  /** epoch ms when this day opened (kept for saved-session compatibility) */
  unlockedAt: number;
  entryIndex?: number; // match days: index into entries[]
  reflection?: { repeated: string; changed: string }; // day 6
}

/** The FC 26 post-match stats screen — the console truth. These are the numbers
 *  every player can read after full-time, before any AI touches them. The
 *  Chinedu Way insists they are TYPED, not scanned: AI can hallucinate, you
 *  don't, and winning the small hard way is how you win the big hard way. */
export interface BaselineMatchStats {
  possession: number | null; // 0..100 %
  shots: number | null; // 0..50
  shotsOnTarget: number | null; // 0..50
  passAccuracy: number | null; // 0..100 %
  corners: number | null; // 0..20
  fouls: number | null; // 0..30 — fouls you committed
  tackles: number | null; // 0..50
  saves: number | null; // 0..20
  offsides?: number | null; // 0..20 optional but honest
  yellowCards?: number | null; // 0..10
}

export function baselineStatsComplete(s: BaselineMatchStats | null | undefined): boolean {
  if (!s) return false;
  // Four universal, easy-to-read stats are enough for the starting card.
  // The remaining console fields remain supported for historical imports,
  // but no longer block a new player's first useful review.
  const required: (keyof BaselineMatchStats)[] = ['possession', 'shots', 'shotsOnTarget', 'passAccuracy'];
  return required.every((k) => typeof s[k] === 'number' && Number.isFinite(s[k] as number));
}

export function averageBaselineStats(entries: BaselineEntry[]): BaselineMatchStats | null {
  const valid = entries.filter((e) => e.stats && baselineStatsComplete(e.stats));
  if (!valid.length) return null;
  const sum = (key: keyof BaselineMatchStats) => valid.reduce((s, e) => s + (Number(e.stats?.[key] ?? 0)), 0);
  const avg = (key: keyof BaselineMatchStats, round = 1) => Math.round((sum(key) / valid.length) * 10) / 10;
  return {
    possession: avg('possession'),
    shots: avg('shots'),
    shotsOnTarget: avg('shotsOnTarget'),
    passAccuracy: avg('passAccuracy'),
    corners: avg('corners'),
    fouls: avg('fouls'),
    tackles: avg('tackles'),
    saves: avg('saves'),
    offsides: valid.some((e) => typeof e.stats?.offsides === 'number') ? avg('offsides') : null,
    yellowCards: valid.some((e) => typeof e.stats?.yellowCards === 'number') ? avg('yellowCards') : null,
  };
}

/** Turn averaged baseline stats into 6 gamified card attributes 0..99. These
 *  are NOT FUT clones — they are Onliversity's read of where you are now. */
export function baselineCardStats(avg: BaselineMatchStats | null, entries: BaselineEntry[]): { key: string; label: string; value: number }[] {
  if (!avg || !entries.length) return [
    { key: 'control', label: 'CONTROL', value: 50 },
    { key: 'attack', label: 'ATTACK', value: 50 },
    { key: 'precision', label: 'PRECISION', value: 50 },
    { key: 'defence', label: 'DEFENCE', value: 50 },
    { key: 'discipline', label: 'DISCIPLINE', value: 50 },
    { key: 'composure', label: 'COMPOSURE', value: 50 },
  ];
  const shotAcc = avg.shots && avg.shots > 0 ? Math.round(((avg.shotsOnTarget ?? 0) / avg.shots) * 100) : 0;
  const goalsPerGame = entries.reduce((s, e) => s + e.gf, 0) / entries.length;
  const concededPerGame = entries.reduce((s, e) => s + e.ga, 0) / entries.length;
  const w = entries.filter((e) => e.result === 'W').length / entries.length;
  const avgComposure = entries.reduce((s, e) => s + e.composure, 0) / entries.length;
  const clamp = (n: number) => Math.max(0, Math.min(99, Math.round(n)));
  return [
    { key: 'control', label: 'CONTROL', value: clamp(((avg.possession ?? 50) * 0.6 + (avg.passAccuracy ?? 75) * 0.4)) },
    { key: 'attack', label: 'ATTACK', value: clamp((avg.shots ?? 8) * 6 + goalsPerGame * 10 + (avg.shotsOnTarget ?? 3) * 4) },
    { key: 'precision', label: 'PRECISION', value: clamp(shotAcc * 0.7 + (avg.passAccuracy ?? 75) * 0.3) },
    { key: 'defence', label: 'DEFENCE', value: clamp(99 - concededPerGame * 18 - (avg.fouls ?? 8) * 1.2 + (avg.tackles ?? 12) * 0.8 + (avg.saves ?? 2) * 2) },
    { key: 'discipline', label: 'DISCIPLINE', value: clamp(99 - (avg.fouls ?? 8) * 4 - (avg.yellowCards ?? 0) * 8 - (avg.offsides ?? 2) * 3) },
    { key: 'composure', label: 'COMPOSURE', value: clamp((avgComposure / 5) * 99) },
  ];
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
  stats: BaselineMatchStats | null; // typed FC 26 stats screen — the console truth
  profilePicUri?: string | null; // snap for the baseline card — Day 1 or pre-seal
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
  avgStats: BaselineMatchStats | null; // averaged console truth across 5 matches
  cardStats: { key: string; label: string; value: number }[]; // 6 gamified attributes
  profilePicUri: string | null; // the snap they took — on the card
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

/** Build the 7-day schedule. Each next day opens as soon as the prior day is
 * sealed. Old sessions are migrated without losing progress. */
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
    const unlock = day === 1 ? startedAt : prevSeal;
    days.push({ day, sealedAt, unlockedAt: unlock, entryIndex });
    if (sealedAt != null) prevSeal = sealedAt;
  }
  return days;
}

function migrateEntry(raw: any): BaselineEntry {
  return {
    gf: Number(raw.gf) || 0,
    ga: Number(raw.ga) || 0,
    result: (raw.result === 'W' || raw.result === 'D' || raw.result === 'L' ? raw.result : 'D') as MatchResult,
    composure: typeof raw.composure === 'number' ? raw.composure : 3,
    question: typeof raw.question === 'string' ? raw.question : '',
    answer: typeof raw.answer === 'string' ? raw.answer : '',
    moments: Array.isArray(raw.moments) ? raw.moments : [],
    stats: raw.stats && typeof raw.stats === 'object' ? (raw.stats as BaselineMatchStats) : null,
    profilePicUri: typeof raw.profilePicUri === 'string' ? raw.profilePicUri : null,
    at: typeof raw.at === 'number' ? raw.at : Date.now(),
  };
}

export async function loadBaseline(coachId: string): Promise<BaselineSession> {
  if (!hydrated) {
    hydrated = true;
    try {
      const raw = await AsyncStorage.getItem(baselineStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BaselineSession>;
        const migratedEntries = Array.isArray(parsed.entries) ? (parsed.entries as any[]).map(migrateEntry) : [];
        // migrate old cards missing new fields
        let migratedCard: BaselineCard | null = null;
        if (parsed.card && typeof parsed.card === 'object') {
          const c: any = parsed.card;
          migratedCard = {
            handle: c.handle ?? '',
            coachId: c.coachId ?? coachId,
            played: c.played ?? migratedEntries.length,
            w: c.w ?? 0,
            d: c.d ?? 0,
            l: c.l ?? 0,
            gf: c.gf ?? 0,
            ga: c.ga ?? 0,
            avgComposure: c.avgComposure ?? 0,
            tier: c.tier ?? tierFor(c.avgComposure ?? 0),
            coachRead: c.coachRead ?? '',
            ambition: c.ambition ?? '',
            tendencies: Array.isArray(c.tendencies) ? c.tendencies : [],
            avgStats: c.avgStats ?? averageBaselineStats(migratedEntries),
            cardStats: Array.isArray(c.cardStats) ? c.cardStats : baselineCardStats(c.avgStats ?? averageBaselineStats(migratedEntries), migratedEntries),
            profilePicUri: typeof c.profilePicUri === 'string' ? c.profilePicUri : (migratedEntries.find((e: any) => e.profilePicUri)?.profilePicUri ?? null),
            sealedAt: c.sealedAt ?? Date.now(),
          };
        }
        session = {
          coachId: parsed.coachId ?? coachId,
          entries: migratedEntries,
          ambition: typeof parsed.ambition === 'string' ? parsed.ambition : null,
          card: migratedCard,
          startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : Date.now(),
          // pre-week sessions have no `days` — migrate from their entries
          days: Array.isArray(parsed.days)
            ? (parsed.days as BaselineDay[])
            : makeDays(
                migratedEntries,
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

export type BaselineDayStatus = 'done' | 'today' | 'locked' | 'future';

export function dayStatus(s: BaselineSession | null, day: number): BaselineDayStatus {
  if (!s) return day === 1 ? 'today' : 'future';
  const d = s.days.find((x) => x.day === day);
  if (d?.sealedAt) return 'done';
  const cur = currentBaselineDay(s);
  if (day > cur) return 'future';
  // A current unsealed day is available. The 30-minute cool-down remains
  // coaching guidance, not an app gate, while testing the practice.
  return 'today';
}

// ── THE WEEK — day actions ───────────────────────────────────

/** Seal a day of the week. The next day opens immediately. */
export function sealBaselineDay(day: number, extra?: Partial<BaselineDay>): void {
  if (!session) return;
  const sealedAt = Date.now();
  const days = session.days.map((d) => (d.day === day ? { ...d, ...extra, sealedAt } : d));
  const nextIdx = days.findIndex((d) => d.day === day + 1);
  if (nextIdx >= 0 && !days[nextIdx].sealedAt) {
    days[nextIdx] = { ...days[nextIdx], unlockedAt: sealedAt };
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

export function setBaselineProfilePic(uri: string | null): void {
  if (!session) return;
  // stash on last entry if exists, otherwise hold for next entry — simplest is to attach to next record
  // we also keep a pending pic in the session card slot via a hidden field
  (session as any).__pendingPic = uri;
  void persist();
}

export function getBaselinePendingPic(): string | null {
  return (session as any)?.__pendingPic ?? null;
}

/** record one debriefed match; also lands in the real vault. The day whose
 *  match this is gets its entry index + recording path linked automatically. */
export function recordBaselineMatch(entry: Omit<BaselineEntry, 'at'>): void {
  if (!session) return;
  const at = Date.now();
  // ensure stats field exists for legacy callers
  const withStats: BaselineEntry = {
    gf: entry.gf,
    ga: entry.ga,
    result: entry.result,
    composure: entry.composure,
    question: entry.question,
    answer: entry.answer,
    moments: entry.moments ?? [],
    stats: (entry as any).stats ?? null,
    profilePicUri: (entry as any).profilePicUri ?? (session as any).__pendingPic ?? null,
    at,
  };
  if ((session as any).__pendingPic) (session as any).__pendingPic = null;
  session = { ...session, entries: [...session.entries, withStats] };
  const idx = session.entries.length - 1;
  const matchDay = entryIndexToDay(idx);
  const days = session.days.map((d) =>
    d.day === matchDay ? { ...d, entryIndex: idx } : d,
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

export async function sealBaseline(handle: string, coachId: string, ambition: string, profilePicUri?: string | null): Promise<BaselineCard> {
  const e = session?.entries ?? [];
  const w = e.filter((m) => m.result === 'W').length;
  const d = e.filter((m) => m.result === 'D').length;
  const l = e.filter((m) => m.result === 'L').length;
  const avg = e.length ? e.reduce((s, m) => s + m.composure, 0) / e.length : 0;
  const avgStats = averageBaselineStats(e);
  const cardStats = baselineCardStats(avgStats, e);
  // prefer explicit pic passed at seal, otherwise last match snap, otherwise any earlier snap
  const pic = profilePicUri ?? [...e].reverse().find((x) => x.profilePicUri)?.profilePicUri ?? null;
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
    avgStats,
    cardStats,
    profilePicUri: pic ?? null,
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
  /** his scene-setter at the top of the moment analysis — "take notes out,
   *  he is across the table" — so the 9 questions read as an interview */
  analysisIntro: string;
  /** how HE asks each moment question — his phrasing, not a form label.
   *  The short ALL-CAPS label stays as the field's anchor device. */
  momentAsks: Record<BaselineAnalysisKey, string>;
  /** stage directions between questions — index = the question it precedes.
   *  A few well-placed lines turn a form into a conversation. */
  momentInterludes: Record<number, string>;
  /** templates for questions that build on the previous answer — {snippet}
   *  is replaced with a quote of the player's own words from the question
   *  before, so the next ask visibly grows out of what they just said. */
  momentFollowUps: Partial<Record<BaselineAnalysisKey, string>>;
  /** his acknowledgment of the result, spoken right before the day question —
   *  so the W/D/L rotation reads as HIS choice for today's scoreline,
   *  not a random draw from a question bank. */
  dayQuestionIntro: Record<MatchResult, string>;
}

export type BeatKey = 'winBig' | 'winTight' | 'drawGoals' | 'drawNill' | 'lossBig' | 'lossTight';

export function beatKey(gf: number, ga: number): BeatKey {
  if (gf === ga) return gf === 0 ? 'drawNill' : 'drawGoals';
  if (gf > ga) return gf - ga >= 3 ? 'winBig' : 'winTight';
  return ga - gf >= 3 ? 'lossBig' : 'lossTight';
}

// ── THE COACH ASKS — helpers that turn question banks into an interview ──

/**
 * How the coach asks one moment question — with the follow-up template when
 * the previous answer gives him something quotable. `prevAnswer` is the
 * player's answer to the question before this one (BASELINE_MOMENT_QUESTIONS
 * order); when it carries real words, the ask opens by quoting them back.
 */
export function momentAskFor(
  script: CoachScript,
  key: BaselineAnalysisKey,
  prevAnswer?: string,
): string {
  const base = script.momentAsks[key];
  const tpl = script.momentFollowUps[key];
  const snippet = tpl ? quoteSnippet(prevAnswer) : '';
  if (tpl && snippet) return tpl.replace('{snippet}', snippet);
  return base;
}

/**
 * Trim the player's answer to a quotable fragment: first sentence or first
 * ~64 chars at a word boundary, safe to drop into “…”. Empty when the
 * answer has no real content — callers fall back to the plain ask.
 */
export function quoteSnippet(answer: string | undefined | null): string {
  const clean = (answer ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length < 12) return '';
  // prefer the first sentence — it usually holds the admission
  const first = clean.split(/[.!?]/)[0] ?? clean;
  const candidate = first.length >= 12 ? first : clean;
  if (candidate.length <= 64) return candidate.replace(/[.,;:]+$/, '');
  const cut = candidate.slice(0, 64);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
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
      'Let your head cool for 30 minutes after full time. Only when your mind has settled do you open the app and type your written truth into your database.',
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
    analysisIntro:
      'Paper in front of you. You named the moments — now I walk you through them, one by one. Answer like I am across the table, because I am. I read every word.',
    momentAsks: {
      happened: 'Start at the start. What actually happened? No excuses, no commentary — just the event, exactly as it unfolded.',
      thinking: 'Now open your head for me. What was running through it in that exact second — before the touch?',
      feel: 'The body keeps the score. What did you feel in that moment — say it plainly.',
      cause: 'Feelings noted. Now we dig — what actually caused this moment?',
      why: 'Deeper. Why did this turn against you — you, specifically — and not your opponent?',
      noticed: 'Reconstruct the picture. What did you actually see before you decided?',
      missed: 'Nobody sees everything. What did you fail to notice — the thing that mattered?',
      differently: 'Here is the one the whole week is for. What could you have done differently — not wished differently, DONE differently?',
      evidence: 'Back yourself. What in the match or in your notes supports that answer?',
    },
    momentInterludes: {
      2: 'Good. Keep going — the easy ones are done.',
      5: 'Now we get to the uncomfortable part. Do not reach for the comfortable version.',
      7: 'Almost there. This next one is why this week exists.',
    },
    momentFollowUps: {
      cause: 'You wrote “{snippet}”. Noted — feelings logged. Now tell me what caused it.',
      why: '“{snippet}” — fine. So why did THAT happen? Go one layer under it.',
      differently: 'You admit it: “{snippet}”. Honesty — good. So what do you do differently?',
      evidence: 'You say “{snippet}”. Prove it.',
    },
    dayQuestionIntro: {
      W: 'You won. Good. Do not inhale too deep — a win hides cracks better than a loss exposes them. Here is what I want answered.',
      D: 'A draw. Two points left on the table, and a draw forgets faster than a loss. You will not forget — answer me this.',
      L: 'You lost. Fine. Losses are receipts — and we read receipts. Here is my question for you.',
    },
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
      'Let your mind cool down for 30 minutes after full time. Only when your head has settled do you open the app and type your written truth into your database.',
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
    analysisIntro:
      'Sit with me, little one. You named the moments — brave work already. Now we take them one by one, slowly. I am not in a hurry, and I read every word.',
    momentAsks: {
      happened: 'Take me there, little one. Walk me through exactly what happened — slowly, just the facts first.',
      thinking: 'Now step inside your own head — what was your mind saying to you in that exact second?',
      feel: 'And what did your body do with it? Tell me what you felt — gently, honestly.',
      cause: 'No blame, no excuses — just honestly: what do you think caused this moment?',
      why: 'Sit with it a moment, little one. Why did it turn against you — and not your opponent?',
      noticed: 'Rebuild the picture for me. What did you notice before the decision — what did your eyes give you?',
      missed: 'It is alright — everyone misses something. What quietly slipped past you?',
      differently: 'If I handed you the same few seconds again — what would you do differently?',
      evidence: 'Show me your working, little one. What in the match or your notes supports that answer?',
    },
    momentInterludes: {
      2: 'Good — you are doing this honestly. Keep going.',
      5: 'Now the part most people skip. We do not skip, little one.',
      7: 'One more deep question. This is the one that changes players.',
    },
    momentFollowUps: {
      cause: 'You wrote “{snippet}” — I hear you. Now, softly: what caused it?',
      why: '“{snippet}”. Thank you, little one. But why? Let us go one layer under.',
      differently: 'You have seen it clearly: “{snippet}”. So — what do you do differently?',
      evidence: 'You believe “{snippet}”. What points to it?',
    },
    dayQuestionIntro: {
      W: 'You won, little one — well done. Enjoy it for one breath. Done? Good. Now answer me this.',
      D: 'A draw, little one. Not a defeat, not a victory — a lesson wearing a disguise. Come, sit. Answer me this.',
      L: 'You lost, little one — that hurt. Let it, for a moment. Then we put the hurt to work. Answer this for me.',
    },
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
