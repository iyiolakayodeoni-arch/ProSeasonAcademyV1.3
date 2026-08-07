// ─────────────────────────────────────────────────────────────
// FOUNDERS WEEK — the pricing discussion window.
//
// After Baseline Week is sealed, every player enters Founders Week:
//
//   1. WELCOME — founder's note (config founder_week_note), dates
//   2. TOUR — 3-card academy tour (what it is, how it works, the pricing promise)
//   3. PRICING DISCUSSION — the consult questions (myConsult/answerConsult)
//   4. AWAIT + GRACE — once the founder sets the price (go_live), 3-day grace
//
// This file owns ONLY the local progress (AsyncStorage). Remote truth
// (founder_week live, consult answers, go_live, myAccess grace) is
// read live from Supabase at render time. Offline = show cached + re-try.
// ─────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as backend from './backend';

const KEY_BASE = 'psa.foundersWeek.v1';

function key(coachId?: string): string {
  const me = backend.getMe();
  const suffix = me?.id ? `.${me.id}` : coachId ? `.${coachId}` : '';
  return `${KEY_BASE}${suffix}`;
}

export interface FoundersWeekProgress {
  enteredAt: number | null;
  welcomeSeen: boolean;
  tourDone: boolean;
  consultSeen: boolean;
  completedAt: number | null; // player tapped "Continue" — hub unlocked
}

const EMPTY: FoundersWeekProgress = {
  enteredAt: null,
  welcomeSeen: false,
  tourDone: false,
  consultSeen: false,
  completedAt: null,
};

let state: FoundersWeekProgress = { ...EMPTY };
let coachKey = '';
let hydrated = false;

function emit() {}
export async function loadFoundersWeek(coachId: string): Promise<FoundersWeekProgress> {
  const k = key(coachId);
  if (hydrated && coachKey === k) return state;
  coachKey = k;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(k);
    if (raw) {
      const p = JSON.parse(raw) as Partial<FoundersWeekProgress>;
      state = {
        enteredAt: typeof p.enteredAt === 'number' ? p.enteredAt : Date.now(),
        welcomeSeen: p.welcomeSeen === true,
        tourDone: p.tourDone === true,
        consultSeen: p.consultSeen === true,
        completedAt: typeof p.completedAt === 'number' ? p.completedAt : null,
      };
    } else {
      state = { ...EMPTY, enteredAt: Date.now() };
      await AsyncStorage.setItem(k, JSON.stringify(state));
    }
  } catch {
    state = { ...EMPTY, enteredAt: Date.now() };
  }
  return state;
}

export function getFoundersWeek(): FoundersWeekProgress {
  return state;
}

async function persist() {
  try {
    await AsyncStorage.setItem(key(), JSON.stringify(state));
  } catch {}
}

export async function markFoundersWelcomeSeen(): Promise<void> {
  state = { ...state, welcomeSeen: true };
  await persist();
}
export async function markFoundersTourDone(): Promise<void> {
  state = { ...state, tourDone: true };
  await persist();
}
export async function markFoundersConsultSeen(): Promise<void> {
  state = { ...state, consultSeen: true };
  await persist();
}
export async function markFoundersCompleted(): Promise<void> {
  state = { ...state, completedAt: Date.now() };
  await persist();
}

export function isFoundersWeekComplete(s: FoundersWeekProgress | null): boolean {
  return !!s?.completedAt;
}

export async function resetFoundersWeekForDev(): Promise<void> {
  state = { ...EMPTY };
  hydrated = false;
  coachKey = '';
  try {
    await AsyncStorage.removeItem(key());
  } catch {}
}
