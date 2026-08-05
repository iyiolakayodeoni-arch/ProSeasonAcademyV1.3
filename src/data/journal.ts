import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as backend from './backend';
import { isValidReflection } from './honestyGuard';

// ─────────────────────────────────────────────────────────────
// LOSS JOURNAL — the coach's oldest rule: ONE LINE PER LOSS.
// Not a diary, not an essay. You lose, you write one honest line
// about what killed you, and over weeks the pattern you wrote is
// the pattern he fixes. Entries persist on the device; the
// journey objectives ("Log N lines…") read from THIS store live.
// ─────────────────────────────────────────────────────────────

export const LOSS_TAGS = ['DEFENDING', 'FINISHING', 'COMPOSURE', 'KICKOFF GAP', 'BS MOMENT'] as const;
export type LossTag = (typeof LOSS_TAGS)[number];

export interface JournalEntry {
  id: string;
  at: number; // epoch ms
  tag: LossTag;
  text: string;
}

export interface JournalState {
  entries: JournalEntry[]; // newest first
}

const STORAGE_KEY = 'psa.loss-journal.v1';
const MAX_LINE = 90; // one line means ONE line

function journalStorageKey(): string {
  const me = backend.getMe();
  return me?.id ? `${STORAGE_KEY}.${me.id}` : STORAGE_KEY;
}

let state: JournalState = { entries: [] };
let hydrated = false;

const listeners = new Set<() => void>();
const getState = () => state;
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function set(next: Partial<JournalState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
  AsyncStorage.setItem(journalStorageKey(), JSON.stringify(state)).catch(() => {});
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  AsyncStorage.getItem(journalStorageKey())
    .then((raw: string | null) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<JournalState>;
      if (Array.isArray(saved.entries)) {
        state = { entries: saved.entries };
        listeners.forEach((l) => l());
      }
    })
    .catch(() => {});
}
void ensureHydrated();

export function useJournal(): JournalState & {
  total: number;
  thisWeek: number;
  streakDays: number;
} {
  useEffect(ensureHydrated, []);
  const s = useSyncExternalStore(subscribe, getState);
  return { ...s, total: s.entries.length, thisWeek: thisWeekCount(s.entries), streakDays: streakDays(s.entries) };
}

/** imperative read for journey objectives ("Log N lines…") */
export function journalLineCount(): number {
  return state.entries.length;
}

let seq = 1;
export function addEntry(tag: LossTag, rawText: string): JournalEntry | null {
  const text = rawText.replace(/\s+/g, ' ').trim().slice(0, MAX_LINE);
  if (!text || !isValidReflection(text, { minLength: 4, minWords: 2 })) return null;
  const entry: JournalEntry = {
    id: `J${Date.now().toString(36)}${(seq++).toString(36)}`,
    at: Date.now(),
    tag,
    text,
  };
  set({ entries: [entry, ...state.entries] });
  return entry;
}

export function removeEntry(id: string) {
  set({ entries: state.entries.filter((e) => e.id !== id) });
}

export const LOSS_LINE_LIMIT = MAX_LINE;

// ── stats helpers ─────────────────────────────────────────────
function sameDay(a: number, b: number) {
  const A = new Date(a);
  const B = new Date(b);
  return A.getFullYear() === B.getFullYear() && A.getMonth() === B.getMonth() && A.getDate() === B.getDate();
}

function thisWeekCount(entries: JournalEntry[]): number {
  const weekAgo = Date.now() - 7 * 86_400_000;
  return entries.filter((e) => e.at >= weekAgo).length;
}

/** consecutive days (ending today or yesterday) with at least one line logged */
function streakDays(entries: JournalEntry[]): number {
  if (!entries.length) return 0;
  let streak = 0;
  let cursor = Date.now();
  // if nothing logged today yet, the streak counts back from yesterday
  if (!entries.some((e) => sameDay(e.at, cursor))) cursor -= 86_400_000;
  while (entries.some((e) => sameDay(e.at, cursor))) {
    streak += 1;
    cursor -= 86_400_000;
  }
  return streak;
}

/** display grouping label for an entry timestamp */
export function dayLabel(at: number): string {
  const now = Date.now();
  if (sameDay(at, now)) return 'TODAY';
  if (sameDay(at, now - 86_400_000)) return 'YESTERDAY';
  const d = new Date(at);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
