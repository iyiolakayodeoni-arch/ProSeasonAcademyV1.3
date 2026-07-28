import { useSyncExternalStore } from 'react';
import { CURRENT_STAGE, JOURNEY_SEASON } from './journey';

// ─────────────────────────────────────────────────────────────
// JOURNEY PROGRESS STORE — the single source of truth for where
// the player is on the map. Passing a stage's MATCH SCAN is the
// ONLY thing that advances it (the path only moves forward).
// TODO(real-persistence): hydrate + persist via AsyncStorage, then
// sync to the player profile once the real backend lands.
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

let state: ProgressState = {
  currentStage: CURRENT_STAGE,
  completed: {},
  lessonRefs: {},
  xp: 0,
  badges: [],
};

const listeners = new Set<() => void>();
const getState = () => state;
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function set(next: Partial<ProgressState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
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
