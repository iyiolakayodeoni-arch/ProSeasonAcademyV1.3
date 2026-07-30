import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────
// THE THREAD — the lesson ledger. The MAIN QUEST of the academy.
//
// Side quests (mechanics, tricks) come from the live feed; the
// thread can only come from YOU. Every stage match scan ends the
// same way: you jot the lesson you carry into your next match.
// The next scan asks how it held — HELD or BROKE — and a new
// lesson takes the thread. That loop is the whole psychology:
// nobody can hand it to you, because only your matches teach it.
//
// Per-coach persistence, same offline-first pattern as the
// Match Vault. Baseline writes NOTHING here — the 5-match trial
// collects psychology data only; the thread starts at stage 1.
// ─────────────────────────────────────────────────────────────

export type ThreadVerdict = 'held' | 'broke';

export interface ThreadEntry {
  id: string;
  stageN: number; // stage whose scan produced the lesson
  lesson: string; // the one signed line, in the player's own words
  swornAt: number;
  matchId: string | null; // the vault receipt it was born from
  status: 'carried' | ThreadVerdict; // 'carried' = currently your main quest
  verdictNote: string | null; // what the next scan said about it
  verdictAt: number | null;
}

export interface ThreadState {
  entries: ThreadEntry[]; // newest first
}

const KEY_BASE = 'psa.thread.v1';
let coachKey = 'unset';
const storageKey = () => `${KEY_BASE}.${coachKey}`;

let state: ThreadState = { entries: [] };
let hydrated = false;

const listeners = new Set<() => void>();
const getState = () => state;
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function set(next: Partial<ThreadState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
  void AsyncStorage.setItem(storageKey(), JSON.stringify(state)).catch(() => {});
}

function revive(raw: string): ThreadState {
  try {
    const s = JSON.parse(raw) as Partial<ThreadState>;
    if (!s || !Array.isArray(s.entries)) return { entries: [] };
    const entries = s.entries
      .filter(
        (e): e is ThreadEntry =>
          !!e &&
          typeof e.id === 'string' &&
          typeof e.lesson === 'string' &&
          typeof e.swornAt === 'number' &&
          (e.status === 'carried' || e.status === 'held' || e.status === 'broke'),
      )
      .map((e) => ({
        ...e,
        stageN: typeof e.stageN === 'number' ? e.stageN : 1,
        matchId: typeof e.matchId === 'string' ? e.matchId : null,
        verdictNote: typeof e.verdictNote === 'string' ? e.verdictNote : null,
        verdictAt: typeof e.verdictAt === 'number' ? e.verdictAt : null,
      }));
    return { entries };
  } catch {
    return { entries: [] };
  }
}
function entriesCarriedIndex(entries: ThreadEntry[]): number {
  return entries.findIndex((e) => e && e.status === 'carried');
}

/** bind the thread to the locked coach + pull it off the disk */
export async function hydrateThread(coachId: string): Promise<void> {
  const next = coachId || 'unset';
  if (hydrated && next === coachKey) return;
  coachKey = next;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(storageKey());
    state = raw ? revive(raw) : { entries: [] };
    // one carried lesson max — settle stragglers as held, no note
    const carried = entriesCarriedIndex(state.entries);
    if (carried > 0) {
      state = {
        entries: state.entries.map((e, i) =>
          e.status === 'carried' && i !== carried ? { ...e, status: 'held' as const } : e,
        ),
      };
    }
  } catch {
    state = { entries: [] };
  }
  listeners.forEach((l) => l());
}

let seq = 1;

/** a new lesson takes the thread — called only by a completed match scan */
export function swearLesson(input: { stageN: number; lesson: string; matchId: string | null }): ThreadEntry {
  const entry: ThreadEntry = {
    id: `T${Date.now().toString(36)}${(seq++).toString(36)}`,
    stageN: input.stageN,
    lesson: input.lesson.trim().slice(0, 140),
    swornAt: Date.now(),
    matchId: input.matchId,
    status: 'carried',
    verdictNote: null,
    verdictAt: null,
  };
  // defensive: a new lesson never leaves an older one still "carried"
  const settled = state.entries.map((e) =>
    e.status === 'carried' ? { ...e, status: 'held' as const } : e,
  );
  set({ entries: [entry, ...settled] });
  return entry;
}

/** the next scan answers for the carried lesson — HELD or BROKE, in your words */
export function settleCarried(id: string, verdict: ThreadVerdict, note: string): void {
  set({
    entries: state.entries.map((e) =>
      e.id === id && e.status === 'carried'
        ? { ...e, status: verdict, verdictNote: note.trim().slice(0, 160), verdictAt: Date.now() }
        : e,
    ),
  });
}

export function useLessonThread(): ThreadState & {
  current: ThreadEntry | null;
  heldCount: number;
  brokeCount: number;
} {
  const s = useSyncExternalStore(subscribe, getState);
  return {
    ...s,
    current: s.entries.find((e) => e.status === 'carried') ?? null,
    heldCount: s.entries.filter((e) => e.status === 'held').length,
    brokeCount: s.entries.filter((e) => e.status === 'broke').length,
  };
}

/** imperative read for non-React code */
export function getThread(): ThreadState {
  return state;
}

/** DANGER ZONE — delete account unwinds the thread too */
export async function wipeThread(): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey());
  } catch {
    /* ignore */
  }
  state = { entries: [] };
  hydrated = false;
  listeners.forEach((l) => l());
}
