import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENT_STAGE, JOURNEY_SEASON } from './journey';

// ─────────────────────────────────────────────────────────────
// JOURNEY PROGRESS STORE — the single source of truth for where
// the player is on the map. Passing a stage's MATCH SCAN is the
// ONLY thing that advances it (the path only moves forward).
//
// PERSISTED to AsyncStorage (same pattern as matches.ts /
// journal.ts): every stage cleared, all XP and every badge
// survive a force-quit. Progress is per-coach — the key carries
// the coach id, so the two journeys can never bleed into each
// other, and a player's ledger is exactly what his own coach
// walked him through.
// ─────────────────────────────────────────────────────────────

export interface StageCompletion {
  contentId: string | null; // the metabot item the stage taught (traceability)
  passedAt: number;
  xp: number;
  badge?: string;
}

export interface ProgressState {
  currentStage: number; // 1-based stage the player can currently enter
  completed: Record<number, StageCompletion>;
  /** stage → metabot content id that produced its lesson (stale-swap tracking) */
  lessonRefs: Record<number, string>;
  xp: number;
  badges: string[];
}

const KEY_BASE = 'psa.progress.v1';
/** progress is per-coach: the lock is permanent, so is his ledger */
let coachKey = 'unset';
const storageKey = () => `${KEY_BASE}.${coachKey}`;

const EMPTY: ProgressState = {
  currentStage: CURRENT_STAGE,
  completed: {},
  lessonRefs: {},
  xp: 0,
  badges: [],
};

let state: ProgressState = { ...EMPTY, completed: {}, lessonRefs: {}, badges: [] };
let hydrated = false;

const listeners = new Set<() => void>();
const getState = () => state;
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function emit() {
  listeners.forEach((l) => l());
}
function set(next: Partial<ProgressState>) {
  state = { ...state, ...next };
  emit();
  void persist();
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(), JSON.stringify(state));
  } catch {
    /* a full disk must never take the academy down */
  }
}

/** defensive revive — never trust what came off the disk */
function reviveState(raw: string): ProgressState | null {
  try {
    const s = JSON.parse(raw) as Partial<ProgressState>;
    if (!s || typeof s !== 'object') return null;
    const completed: Record<number, StageCompletion> = {};
    for (const [k, v] of Object.entries(s.completed ?? {})) {
      const n = Number(k);
      const c = v as StageCompletion;
      if (!Number.isFinite(n) || n < 1 || n > JOURNEY_SEASON.totalStages) continue;
      if (!c || typeof c.passedAt !== 'number') continue;
      completed[n] = {
        contentId: typeof c.contentId === 'string' ? c.contentId : null,
        passedAt: c.passedAt,
        xp: typeof c.xp === 'number' ? c.xp : 0,
        badge: typeof c.badge === 'string' ? c.badge : undefined,
      };
    }
    const lessonRefs: Record<number, string> = {};
    for (const [k, v] of Object.entries(s.lessonRefs ?? {})) {
      const n = Number(k);
      if (Number.isFinite(n) && typeof v === 'string') lessonRefs[n] = v;
    }
    const badges = Array.isArray(s.badges) ? s.badges.filter((b): b is string => typeof b === 'string') : [];
    const highestCleared = Object.keys(completed).reduce((m, k) => Math.max(m, Number(k)), 0);
    const currentStage = Math.min(
      JOURNEY_SEASON.totalStages,
      Math.max(CURRENT_STAGE, typeof s.currentStage === 'number' ? s.currentStage : 1, highestCleared + 1),
    );
    return {
      currentStage,
      completed,
      lessonRefs,
      xp: typeof s.xp === 'number' && s.xp >= 0 ? s.xp : 0,
      badges,
    };
  } catch {
    return null;
  }
}

/**
 * Bind the store to a coach and pull his ledger off the disk.
 * Called once from the app root as soon as the locked coach is
 * known — before the hub renders, so the map never flashes empty.
 */
export async function hydrateProgress(coachId: string): Promise<void> {
  const next = coachId || 'unset';
  if (hydrated && next === coachKey) return;
  coachKey = next;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(storageKey());
    state = raw ? reviveState(raw) ?? { ...EMPTY, completed: {}, lessonRefs: {}, badges: [] }
                : { ...EMPTY, completed: {}, lessonRefs: {}, badges: [] };
  } catch {
    state = { ...EMPTY, completed: {}, lessonRefs: {}, badges: [] };
  }
  emit();
}

/** record which live metabot item backs this stage's lesson (once) */
export function assignLessonRef(stageN: number, contentId: string) {
  if (state.lessonRefs[stageN] === contentId) return;
  set({ lessonRefs: { ...state.lessonRefs, [stageN]: contentId } });
}

/** MATCH SCAN passed → stage cleared, XP awarded, next node unlocks */
export function recordStagePass(stageN: number, c: StageCompletion) {
  if (state.completed[stageN]) return; // replays never double-pay
  set({
    completed: { ...state.completed, [stageN]: c },
    xp: state.xp + (c.xp ?? 0),
    badges: c.badge && !state.badges.includes(c.badge) ? [...state.badges, c.badge] : state.badges,
    currentStage: Math.min(JOURNEY_SEASON.totalStages, Math.max(state.currentStage, stageN + 1)),
  });
}

export function useJourneyProgress(): ProgressState & { completedCount: number } {
  const s = useSyncExternalStore(subscribe, getState);
  return { ...s, completedCount: Object.keys(s.completed).length };
}

/** imperative read for non-React code (community share actions etc.) */
export function getProgress(): ProgressState {
  return state;
}

/** DANGER ZONE — delete account wipes the ledger too */
export async function wipeProgress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey());
  } catch {
    /* ignore */
  }
  state = { ...EMPTY, completed: {}, lessonRefs: {}, badges: [] };
  hydrated = false;
  emit();
}

/** convenience for screens that mount before hydration finishes */
export function useProgressReady(coachId: string): void {
  useEffect(() => {
    void hydrateProgress(coachId);
  }, [coachId]);
}
