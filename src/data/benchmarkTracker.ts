import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────
// BENCHMARK TRACKER — the player's six-month record.
//
// Product direction (Aug 2026): the player no longer walks a
// forward-facing stage map. Instead, the academy builds a truthful
// record backward from evidence: each checkpoint is a 7-match batch
// of post-match stats screens. The screenshots are the proof; the
// card below them is the read.
//
// This file stays engine-agnostic. It owns the local model, naming,
// summaries and archive mechanics. Cloud sync sits beside it, not
// inside it, so the record still works fully offline.
// ─────────────────────────────────────────────────────────────

export const BENCHMARK_MATCH_TARGET = 7;
export const BENCHMARK_CYCLE_MONTHS = 6;
const STORAGE_KEY = 'psa.benchmark-tracker.v1';

const CHECKPOINT_TITLES = [
  'FOUNDATION READ',
  'PATTERN READ',
  'CONTROL READ',
  'PRESSURE READ',
  'SHARPENING READ',
  'PROOF READ',
] as const;

export type StyleConfidence = 'EARLY READ' | 'BUILDING EVIDENCE' | 'SOLID READ';

export interface BenchmarkDraftMatch {
  id: string;
  screenshotName: string | null;
  screenshotUri: string | null;
  gf: number | null;
  ga: number | null;
  possession: number | null;
  shots: number | null;
  shotsOnTarget: number | null;
  passAccuracy: number | null;
  tacklesWon: number | null;
  saves: number | null;
}

export interface BenchmarkMatchRecord {
  id: string;
  screenshotName: string | null;
  screenshotUri: string | null;
  gf: number;
  ga: number;
  possession: number;
  shots: number;
  shotsOnTarget: number;
  passAccuracy: number;
  tacklesWon: number;
  saves: number;
}

export interface PlayingStyleRead {
  key: string;
  label: string;
  read: string;
  focus: string;
  confidence: StyleConfidence;
}

export interface BenchmarkSummary {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  cleanSheets: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  pointsPerMatch: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  avgPossession: number;
  avgShots: number;
  avgShotsOnTarget: number;
  avgPassAccuracy: number;
  avgTacklesWon: number;
  avgSaves: number;
  shotAccuracy: number;
  conversionRate: number;
  style: PlayingStyleRead;
}

export interface BenchmarkIdentity {
  primaryStyle: string;
  secondaryTendency: string;
  temperament: string;
  archetype: string;
}

export interface BenchmarkGap {
  key: string;
  label: string;
  player: number;
  benchmark: number;
  gap: number;
  note: string;
}

export interface BenchmarkProofStamp {
  label: string;
  sublabel: string;
  reliability: number;
  evidenceLine: string;
}

export interface BenchmarkCheckpointMeta {
  checkpoint: number;
  cycle: number;
  month: number;
  title: string;
  label: string;
  monthLabel: string;
}

export interface BenchmarkSnapshot {
  id: string;
  checkpoint: number;
  cycle: number;
  month: number;
  title: string;
  label: string;
  createdAt: number;
  matches: BenchmarkMatchRecord[];
  summary: BenchmarkSummary;
  syncedAt: number | null;
  cloudId: string | null;
}

export interface BenchmarkDelta {
  pointsPerMatch: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  avgPossession: number;
  avgShotsOnTarget: number;
  avgPassAccuracy: number;
  avgTacklesWon: number;
}

interface BenchmarkState {
  checkpoints: BenchmarkSnapshot[]; // newest first
}

export const DEMO_BENCHMARK_SET: BenchmarkDraftMatch[] = [
  { id: 'demo-1', screenshotName: 'match-01.png', screenshotUri: null, gf: 2, ga: 1, possession: 54, shots: 9, shotsOnTarget: 5, passAccuracy: 86, tacklesWon: 15, saves: 2 },
  { id: 'demo-2', screenshotName: 'match-02.png', screenshotUri: null, gf: 1, ga: 1, possession: 57, shots: 8, shotsOnTarget: 4, passAccuracy: 88, tacklesWon: 16, saves: 2 },
  { id: 'demo-3', screenshotName: 'match-03.png', screenshotUri: null, gf: 3, ga: 1, possession: 52, shots: 10, shotsOnTarget: 6, passAccuracy: 84, tacklesWon: 14, saves: 1 },
  { id: 'demo-4', screenshotName: 'match-04.png', screenshotUri: null, gf: 2, ga: 0, possession: 58, shots: 11, shotsOnTarget: 6, passAccuracy: 87, tacklesWon: 17, saves: 1 },
  { id: 'demo-5', screenshotName: 'match-05.png', screenshotUri: null, gf: 1, ga: 0, possession: 56, shots: 7, shotsOnTarget: 3, passAccuracy: 89, tacklesWon: 18, saves: 3 },
  { id: 'demo-6', screenshotName: 'match-06.png', screenshotUri: null, gf: 2, ga: 2, possession: 49, shots: 8, shotsOnTarget: 4, passAccuracy: 82, tacklesWon: 13, saves: 4 },
  { id: 'demo-7', screenshotName: 'match-07.png', screenshotUri: null, gf: 3, ga: 1, possession: 55, shots: 10, shotsOnTarget: 5, passAccuracy: 85, tacklesWon: 15, saves: 2 },
];

export function checkpointMetaFor(checkpoint: number): BenchmarkCheckpointMeta {
  const safe = Math.max(1, Math.round(checkpoint));
  const cycle = Math.floor((safe - 1) / BENCHMARK_CYCLE_MONTHS) + 1;
  const month = ((safe - 1) % BENCHMARK_CYCLE_MONTHS) + 1;
  const title = CHECKPOINT_TITLES[month - 1] ?? CHECKPOINT_TITLES[CHECKPOINT_TITLES.length - 1];
  const monthLabel = cycle > 1 ? `CYCLE ${cycle} · MONTH ${month}` : `MONTH ${month}`;
  return {
    checkpoint: safe,
    cycle,
    month,
    title,
    label: `${monthLabel} · ${title}`,
    monthLabel,
  };
}

export function createDraftBenchmarkMatches(): BenchmarkDraftMatch[] {
  return Array.from({ length: BENCHMARK_MATCH_TARGET }, (_, i) => ({
    id: `draft-${i + 1}`,
    screenshotName: null,
    screenshotUri: null,
    gf: null,
    ga: null,
    possession: null,
    shots: null,
    shotsOnTarget: null,
    passAccuracy: null,
    tacklesWon: null,
    saves: null,
  }));
}

export function benchmarkMatchComplete(match: BenchmarkDraftMatch): boolean {
  return [
    match.gf,
    match.ga,
    match.possession,
    match.shots,
    match.shotsOnTarget,
    match.passAccuracy,
    match.tacklesWon,
    match.saves,
  ].every((value) => typeof value === 'number' && Number.isFinite(value));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function normaliseBenchmarkMatch(match: BenchmarkDraftMatch): BenchmarkMatchRecord {
  return {
    id: match.id,
    screenshotName: match.screenshotName?.slice(0, 120) ?? null,
    screenshotUri: typeof match.screenshotUri === 'string' ? match.screenshotUri : null,
    gf: clampInt(match.gf ?? 0, 0, 20),
    ga: clampInt(match.ga ?? 0, 0, 20),
    possession: clampInt(match.possession ?? 0, 0, 100),
    shots: clampInt(match.shots ?? 0, 0, 50),
    shotsOnTarget: clampInt(match.shotsOnTarget ?? 0, 0, 50),
    passAccuracy: clampInt(match.passAccuracy ?? 0, 0, 100),
    tacklesWon: clampInt(match.tacklesWon ?? 0, 0, 50),
    saves: clampInt(match.saves ?? 0, 0, 20),
  };
}

function average(total: number, count: number): number {
  if (!count) return 0;
  return total / count;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function scaleTo100(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const pct = ((value - min) / (max - min)) * 100;
  return clampPct(pct);
}

function inverseScaleTo100(value: number, goodLow: number, badHigh: number): number {
  if (badHigh <= goodLow) return 100;
  const pct = ((badHigh - value) / (badHigh - goodLow)) * 100;
  return clampPct(pct);
}

function confidenceFor(matches: number): StyleConfidence {
  if (matches >= BENCHMARK_MATCH_TARGET) return 'SOLID READ';
  if (matches >= 4) return 'BUILDING EVIDENCE';
  return 'EARLY READ';
}

function inferStyle(summary: Omit<BenchmarkSummary, 'style'>): PlayingStyleRead {
  const { matches, avgPossession, avgPassAccuracy, avgGoalsFor, avgGoalsAgainst, avgShots, avgShotsOnTarget, avgTacklesWon, avgSaves, shotAccuracy } = summary;
  const confidence = confidenceFor(matches);

  if (avgPossession >= 54 && avgPassAccuracy >= 85 && avgShotsOnTarget >= 4.5) {
    return {
      key: 'control-builder',
      label: 'CONTROL BUILDER',
      read: 'This batch says the player likes to control the match first, then attack from stability. The ball stays, the passes stick, and the shot quality is usually earned rather than forced.',
      focus: avgGoalsFor < 2 ? 'Add more killer actions in the final third without losing the control base.' : 'Keep the control identity, then sharpen the final action.',
      confidence,
    };
  }

  if (avgGoalsFor >= 2 && avgPossession <= 49 && avgShots <= 9) {
    return {
      key: 'direct-finisher',
      label: 'DIRECT FINISHER',
      read: 'The player does not need long spells of the ball to hurt people. The profile looks vertical, decisive and quick to turn possession into end product.',
      focus: avgGoalsAgainst > 1.3 ? 'Protect the rest defence so the direct threat is not cancelled out by concessions.' : 'Keep the vertical threat but improve control after the first punch lands.',
      confidence,
    };
  }

  if (avgPossession <= 48 && avgTacklesWon >= 15 && avgGoalsAgainst <= 1.2) {
    return {
      key: 'press-and-punish',
      label: 'PRESS & PUNISH',
      read: 'The stats point to a player who is happy without long possession if the pressure work is there. Tackles are active, the ball turns over often, and transitions look like the attacking weapon.',
      focus: avgPassAccuracy < 80 ? 'Secure the first pass after regaining it so the pressure wins become cleaner attacks.' : 'Hold the regain for one extra beat before forcing the next action.',
      confidence,
    };
  }

  if (avgShots >= 10 && shotAccuracy < 45) {
    return {
      key: 'volume-shooter',
      label: 'VOLUME SHOOTER',
      read: 'The player can manufacture attacks, but the batch says too many of them end early or from poor pictures. There is threat here, but not enough selection.',
      focus: 'Slow the final decision down. Better shot selection is the clearest growth edge on this profile.',
      confidence,
    };
  }

  if (avgGoalsAgainst <= 1 && avgSaves >= 2.5) {
    return {
      key: 'resilient-block',
      label: 'RESILIENT BLOCK',
      read: 'This looks like a player who survives pressure well and keeps games under control defensively. The resistance is real; the next jump is usually adding cleaner attacks on top of it.',
      focus: avgGoalsFor < 1.6 ? 'Build more repeatable attacking volume on top of the defensive platform.' : 'Keep the defensive floor and convert it into more territory.',
      confidence,
    };
  }

  return {
    key: 'balanced-competitor',
    label: 'BALANCED COMPETITOR',
    read: 'The screenshots do not point to one extreme yet. The player looks mixed: some control, some direct play, some pressure work. That is useful because it gives a clear baseline to track from here.',
    focus: avgPassAccuracy < 82
      ? 'Tighten ball security first — it is the cleanest signal available in this batch.'
      : avgGoalsAgainst > 1.4
        ? 'Bring the concession rate down so the rest of the card can breathe.'
        : 'Track one clear identity marker in the next checkpoint and see if it holds.',
    confidence,
  };
}

export function summariseBenchmarkMatches(matches: BenchmarkDraftMatch[]): BenchmarkSummary {
  const complete = matches.filter(benchmarkMatchComplete).map(normaliseBenchmarkMatch);
  const count = complete.length;

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let cleanSheets = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let possession = 0;
  let shots = 0;
  let shotsOnTarget = 0;
  let passAccuracy = 0;
  let tacklesWon = 0;
  let saves = 0;

  for (const match of complete) {
    goalsFor += match.gf;
    goalsAgainst += match.ga;
    possession += match.possession;
    shots += match.shots;
    shotsOnTarget += match.shotsOnTarget;
    passAccuracy += match.passAccuracy;
    tacklesWon += match.tacklesWon;
    saves += match.saves;
    if (match.ga === 0) cleanSheets += 1;
    if (match.gf > match.ga) wins += 1;
    else if (match.gf === match.ga) draws += 1;
    else losses += 1;
  }

  const base = {
    matches: count,
    wins,
    draws,
    losses,
    cleanSheets,
    goalsFor,
    goalsAgainst,
    points: wins * 3 + draws,
    pointsPerMatch: round1(average(wins * 3 + draws, count)),
    avgGoalsFor: round1(average(goalsFor, count)),
    avgGoalsAgainst: round1(average(goalsAgainst, count)),
    avgPossession: round1(average(possession, count)),
    avgShots: round1(average(shots, count)),
    avgShotsOnTarget: round1(average(shotsOnTarget, count)),
    avgPassAccuracy: round1(average(passAccuracy, count)),
    avgTacklesWon: round1(average(tacklesWon, count)),
    avgSaves: round1(average(saves, count)),
    shotAccuracy: shots > 0 ? round1((shotsOnTarget / shots) * 100) : 0,
    conversionRate: shotsOnTarget > 0 ? round1((goalsFor / shotsOnTarget) * 100) : 0,
  };

  return {
    ...base,
    style: inferStyle(base),
  };
}

export function compareBenchmarkSummaries(current: BenchmarkSummary, previous: BenchmarkSummary | null): BenchmarkDelta | null {
  if (!previous) return null;
  return {
    pointsPerMatch: round1(current.pointsPerMatch - previous.pointsPerMatch),
    avgGoalsFor: round1(current.avgGoalsFor - previous.avgGoalsFor),
    avgGoalsAgainst: round1(current.avgGoalsAgainst - previous.avgGoalsAgainst),
    avgPossession: round1(current.avgPossession - previous.avgPossession),
    avgShotsOnTarget: round1(current.avgShotsOnTarget - previous.avgShotsOnTarget),
    avgPassAccuracy: round1(current.avgPassAccuracy - previous.avgPassAccuracy),
    avgTacklesWon: round1(current.avgTacklesWon - previous.avgTacklesWon),
  };
}

export function benchmarkIdentity(summary: BenchmarkSummary): BenchmarkIdentity {
  let secondaryTendency = 'MIXED PROFILE';
  if (summary.avgPassAccuracy >= 85 && summary.avgGoalsFor < 1.8) secondaryTendency = 'CONTROL BEFORE KILL';
  else if (summary.avgShots >= 10 && summary.shotAccuracy < 45) secondaryTendency = 'VOLUME OVER SELECTION';
  else if (summary.avgTacklesWon >= 15 && summary.avgPossession <= 48) secondaryTendency = 'TURNOVER HUNTER';
  else if (summary.avgGoalsAgainst <= 1 && summary.avgSaves >= 2.5) secondaryTendency = 'PROTECTIVE GAME';
  else if (summary.avgGoalsFor >= 2 && summary.avgPossession <= 49) secondaryTendency = 'FIRST-PUNCH PLAYER';

  let temperament = 'READ STILL FORMING';
  if (summary.pointsPerMatch >= 2 && summary.avgGoalsAgainst <= 1.1) temperament = 'STABLE UNDER COMPETITION';
  else if (summary.avgGoalsAgainst > 1.7) temperament = 'OPEN-GAME RISK';
  else if (summary.avgPassAccuracy < 80) temperament = 'RUSHED ON THE BALL';
  else if (summary.cleanSheets >= 2) temperament = 'DEFENSIVE CALM BUILDING';

  let archetype = 'ALL-ROUND MATCH COMPETITOR';
  if (summary.style.key === 'control-builder') archetype = 'CONTROL-LED MATCH MANAGER';
  else if (summary.style.key === 'direct-finisher') archetype = 'VERTICAL PUNISHER';
  else if (summary.style.key === 'press-and-punish') archetype = 'PRESS-FIRST BREAKER';
  else if (summary.style.key === 'volume-shooter') archetype = 'CHANCE HUNTER';
  else if (summary.style.key === 'resilient-block') archetype = 'RESISTANCE-LED COMPETITOR';

  return {
    primaryStyle: summary.style.label,
    secondaryTendency,
    temperament,
    archetype,
  };
}

export function benchmarkGap(summary: BenchmarkSummary): BenchmarkGap[] {
  const control = clampPct(scaleTo100(summary.avgPassAccuracy, 68, 92) * 0.65 + scaleTo100(summary.avgPossession, 44, 62) * 0.35);
  const threat = clampPct(scaleTo100(summary.avgShotsOnTarget, 2, 6.5) * 0.55 + scaleTo100(summary.avgGoalsFor, 0.8, 2.8) * 0.45);
  const execution = clampPct(scaleTo100(summary.conversionRate, 20, 60) * 0.6 + scaleTo100(summary.shotAccuracy, 28, 62) * 0.4);
  const resistance = clampPct(inverseScaleTo100(summary.avgGoalsAgainst, 0.7, 2.4) * 0.6 + scaleTo100(summary.avgTacklesWon, 8, 18) * 0.25 + scaleTo100(summary.avgSaves, 0.5, 4.5) * 0.15);
  const matchControl = clampPct(scaleTo100(summary.pointsPerMatch, 0.8, 2.7) * 0.7 + scaleTo100(summary.cleanSheets / Math.max(1, summary.matches) * 100, 0, 45) * 0.3);

  return [
    { key: 'control', label: 'BALL CONTROL', player: control, benchmark: 90, gap: 90 - control, note: 'POSSESSION + PASS SECURITY' },
    { key: 'threat', label: 'ATTACK THREAT', player: threat, benchmark: 88, gap: 88 - threat, note: 'ON-TARGET VOLUME + GOAL OUTPUT' },
    { key: 'execution', label: 'FINISH EXECUTION', player: execution, benchmark: 86, gap: 86 - execution, note: 'SHOT ACCURACY + CONVERSION' },
    { key: 'resistance', label: 'DEFENSIVE RESISTANCE', player: resistance, benchmark: 87, gap: 87 - resistance, note: 'CONCESSION FLOOR + RECOVERY WORK' },
    { key: 'match', label: 'MATCH CONTROL', player: matchControl, benchmark: 92, gap: 92 - matchControl, note: 'POINTS PER MATCH + CLEAN CONTROL' },
  ];
}

export function benchmarkProofStamp(summary: BenchmarkSummary): BenchmarkProofStamp {
  const screens = `${summary.matches}/${BENCHMARK_MATCH_TARGET} SCREENS`;
  const reliability = clampPct((summary.matches / BENCHMARK_MATCH_TARGET) * 100);
  if (summary.matches >= BENCHMARK_MATCH_TARGET) {
    return {
      label: 'FULL CHECKPOINT',
      sublabel: summary.style.confidence === 'SOLID READ' ? 'STYLE LOCKING IN' : 'FULL DATA, STYLE STILL FORMING',
      reliability,
      evidenceLine: `${screens} · RECEIPT DEPTH ${reliability}%`,
    };
  }
  if (summary.matches >= 4) {
    return {
      label: 'BUILDING DOSSIER',
      sublabel: 'ENOUGH EVIDENCE TO SEE A DIRECTION',
      reliability,
      evidenceLine: `${screens} · RECEIPT DEPTH ${reliability}%`,
    };
  }
  return {
    label: 'EARLY READ',
    sublabel: 'DO NOT OVER-CLAIM THE STORY YET',
    reliability,
    evidenceLine: `${screens} · RECEIPT DEPTH ${reliability}%`,
  };
}

let state: BenchmarkState = { checkpoints: [] };
let hydrated = false;
let seq = 1;

const listeners = new Set<() => void>();
const getState = () => state;
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function set(next: Partial<BenchmarkState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function snapshotFromRaw(raw: BenchmarkSnapshot): BenchmarkSnapshot {
  const meta = checkpointMetaFor(raw.checkpoint);
  return {
    ...raw,
    checkpoint: meta.checkpoint,
    cycle: meta.cycle,
    month: meta.month,
    title: raw.title || meta.title,
    label: raw.label || meta.label,
    syncedAt: raw.syncedAt ?? null,
    cloudId: raw.cloudId ?? null,
  };
}

function reviveSnapshot(raw: unknown): BenchmarkSnapshot | null {
  if (!isRecord(raw)) return null;
  const checkpoint = typeof raw.checkpoint === 'number' ? clampInt(raw.checkpoint, 1, 999) : 1;
  const meta = checkpointMetaFor(checkpoint);
  const createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : Date.now();
  const rawMatches = Array.isArray(raw.matches) ? raw.matches : [];
  const matches = rawMatches.map((m, i) => normaliseBenchmarkMatch({
    id: isRecord(m) && typeof m.id === 'string' ? m.id : `revived-${checkpoint}-${i}`,
    screenshotName: isRecord(m) && typeof m.screenshotName === 'string' ? m.screenshotName : null,
    screenshotUri: isRecord(m) && typeof m.screenshotUri === 'string' ? m.screenshotUri : null,
    gf: isRecord(m) && typeof m.gf === 'number' ? m.gf : 0,
    ga: isRecord(m) && typeof m.ga === 'number' ? m.ga : 0,
    possession: isRecord(m) && typeof m.possession === 'number' ? m.possession : 0,
    shots: isRecord(m) && typeof m.shots === 'number' ? m.shots : 0,
    shotsOnTarget: isRecord(m) && typeof m.shotsOnTarget === 'number' ? m.shotsOnTarget : 0,
    passAccuracy: isRecord(m) && typeof m.passAccuracy === 'number' ? m.passAccuracy : 0,
    tacklesWon: isRecord(m) && typeof m.tacklesWon === 'number' ? m.tacklesWon : 0,
    saves: isRecord(m) && typeof m.saves === 'number' ? m.saves : 0,
  }));

  return {
    id: typeof raw.id === 'string' ? raw.id : `B${createdAt.toString(36)}${seq++}`,
    checkpoint: meta.checkpoint,
    cycle: meta.cycle,
    month: meta.month,
    title: typeof raw.title === 'string' ? raw.title : meta.title,
    label: typeof raw.label === 'string' ? raw.label : meta.label,
    createdAt,
    matches,
    summary: summariseBenchmarkMatches(matches),
    syncedAt: typeof raw.syncedAt === 'number' ? raw.syncedAt : null,
    cloudId: typeof raw.cloudId === 'string' ? raw.cloudId : null,
  };
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw: string | null) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<BenchmarkState>;
      const checkpoints = Array.isArray(saved.checkpoints)
        ? saved.checkpoints.map(reviveSnapshot).filter((item): item is BenchmarkSnapshot => !!item)
        : [];
      state = { checkpoints };
      listeners.forEach((listener) => listener());
    })
    .catch(() => {});
}
void ensureHydrated();

export function addBenchmarkCheckpoint(matches: BenchmarkDraftMatch[]): BenchmarkSnapshot {
  const complete = matches.filter(benchmarkMatchComplete).slice(0, BENCHMARK_MATCH_TARGET);
  const meta = checkpointMetaFor(state.checkpoints.length + 1);
  const createdAt = Date.now();
  const normalised = complete.map(normaliseBenchmarkMatch);
  const snapshot: BenchmarkSnapshot = {
    id: `B${createdAt.toString(36)}${seq++}`,
    checkpoint: meta.checkpoint,
    cycle: meta.cycle,
    month: meta.month,
    title: meta.title,
    label: meta.label,
    createdAt,
    matches: normalised,
    summary: summariseBenchmarkMatches(normalised),
    syncedAt: null,
    cloudId: null,
  };
  set({ checkpoints: [snapshot, ...state.checkpoints] });
  return snapshot;
}

export function markBenchmarkCheckpointSynced(id: string, syncedAt = Date.now(), cloudId?: string | null) {
  set({
    checkpoints: state.checkpoints.map((checkpoint) =>
      checkpoint.id === id
        ? { ...checkpoint, syncedAt, cloudId: cloudId ?? checkpoint.cloudId }
        : checkpoint,
    ),
  });
}

export function mergeBenchmarkCheckpoints(incoming: BenchmarkSnapshot[]) {
  const byId = new Map<string, BenchmarkSnapshot>();
  const merged = [...state.checkpoints, ...incoming.map(snapshotFromRaw)];
  for (const snapshot of merged) {
    const existing = byId.get(snapshot.id);
    if (!existing) {
      byId.set(snapshot.id, snapshot);
      continue;
    }
    const currentStamp = existing.syncedAt ?? existing.createdAt;
    const nextStamp = snapshot.syncedAt ?? snapshot.createdAt;
    if (nextStamp >= currentStamp) byId.set(snapshot.id, snapshot);
  }
  const checkpoints = Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
  set({ checkpoints });
}

export function getBenchmarkSnapshots(): BenchmarkSnapshot[] {
  return state.checkpoints;
}

export function removeBenchmarkCheckpoint(id: string) {
  const checkpoints = state.checkpoints
    .filter((checkpoint) => checkpoint.id !== id)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((checkpoint, index) => {
      const meta = checkpointMetaFor(index + 1);
      return {
        ...checkpoint,
        checkpoint: meta.checkpoint,
        cycle: meta.cycle,
        month: meta.month,
        title: meta.title,
        label: meta.label,
      };
    })
    .reverse();
  set({ checkpoints });
}

export async function wipeBenchmarkTracker() {
  state = { checkpoints: [] };
  listeners.forEach((listener) => listener());
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

export function useBenchmarkTracker() {
  useEffect(ensureHydrated, []);
  const s = useSyncExternalStore(subscribe, getState);
  const completedInFirstCycle = Math.min(BENCHMARK_CYCLE_MONTHS, s.checkpoints.length);
  return {
    ...s,
    latest: s.checkpoints[0] ?? null,
    oldest: s.checkpoints[s.checkpoints.length - 1] ?? null,
    nextCheckpoint: s.checkpoints.length + 1,
    completedInFirstCycle,
    monthsTarget: BENCHMARK_CYCLE_MONTHS,
    matchTarget: BENCHMARK_MATCH_TARGET,
  };
}
