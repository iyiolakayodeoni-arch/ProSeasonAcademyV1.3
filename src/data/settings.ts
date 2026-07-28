import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────
// SETTINGS STORE — the player's account + preference state, kept
// separately from journey progress. Everything the Settings tab
// shows lives here so toggles/choices are REAL app state (and any
// other screen can read them), not dead switches on a mockup.
// Persisted to AsyncStorage; swap the backend in `wipeLocalData`
// and the auth seam when real accounts land.
// ─────────────────────────────────────────────────────────────

export const PLATFORMS = ['CONSOLE', 'MOBILE'] as const;
export const REGIONS = [
  'EU WEST · GMT+1',
  'EU EAST · GMT+2',
  'NA EAST · GMT-5',
  'NA WEST · GMT-8',
  'ASIA · GMT+8',
] as const;
export const PLANS = ['PRO', 'ROOKIE'] as const;

export type GeoRegion = 'africa' | 'world' | 'unset';

export interface SettingsState {
  displayName: string;
  country: string | null; // picked at sign-up — drives the JAN 1 pricing split
  geo: GeoRegion;         // 'africa' → credits · 'world' → subscription · unset until picked
  academyId: string; // generated once, never changes
  joinedAt: number; // first launch — drives "IN ACADEMY" days
  div: string;
  bestStreak: number;
  platform: (typeof PLATFORMS)[number];
  region: (typeof REGIONS)[number];
  plan: (typeof PLANS)[number];
  toggles: {
    matchScanAutoRead: boolean;
    lossJournal: boolean;
    coachMessages: boolean;
    matchScanResults: boolean;
    filmRoomAlerts: boolean;
    communityMentions: boolean;
  };
}

const STORAGE_KEY = 'psa.settings.v1';

const DEFAULTS: SettingsState = {
  displayName: 'PLAYER',
  country: null,
  geo: 'unset',
  academyId: `#PSA-${String(1000 + Math.floor(Math.random() * 9000))}`,
  joinedAt: Date.now(),
  div: 'DIV 4',
  bestStreak: 3,
  platform: 'CONSOLE',
  region: 'EU WEST · GMT+1',
  plan: 'PRO',
  toggles: {
    matchScanAutoRead: true,
    lossJournal: true,
    coachMessages: true,
    matchScanResults: true,
    filmRoomAlerts: true,
    communityMentions: false,
  },
};

let state: SettingsState = { ...DEFAULTS, toggles: { ...DEFAULTS.toggles } };
let hydrated = false;

const listeners = new Set<() => void>();
const getState = () => state;
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function set(next: Partial<SettingsState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
}

// hydrate once per app run (first subscriber wins)
function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw: string | null) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<SettingsState>;
      state = {
        ...state,
        ...saved,
        toggles: { ...state.toggles, ...(saved.toggles ?? {}) },
      };
      listeners.forEach((l) => l());
    })
    .catch(() => {});
}

export type ToggleKey = keyof SettingsState['toggles'];

/** imperative read for non-React code (cloud identity) */
export function getSettings(): SettingsState {
  return state;
}

export function useSettings(): SettingsState {
  useEffect(ensureHydrated, []);
  return useSyncExternalStore(subscribe, getState);
}

export function setToggle(key: ToggleKey, on: boolean) {
  set({ toggles: { ...state.toggles, [key]: on } });
}

export function setDisplayName(raw: string) {
  const clean = raw.replace(/[^a-z0-9_]/gi, '').toUpperCase().slice(0, 12);
  if (clean) set({ displayName: clean });
}

export function setPlatform(p: SettingsState['platform']) {
  // TODO(real-scan-ingest): route match scanning by platform
  console.log('[settings] platform →', p);
  set({ platform: p });
}

export function setRegion(r: SettingsState['region']) {
  // TODO(real-matchmaking): scan windows follow the region
  set({ region: r });
}

/** sign-up capture: their country + which JAN 1 pricing track it maps to */
export function setCountry(country: string, geo: Exclude<GeoRegion, 'unset'>) {
  set({ country, geo });
}

export function setPlan(p: SettingsState['plan']) {
  // TODO(real-billing): plan changes go through the store receipt flow
  console.log('[settings] plan →', p);
  set({ plan: p });
}

/** full local wipe for "Delete account" — path, scans and XP go with it */
export async function wipeLocalData() {
  // TODO(real-backend): delete the server-side profile + auth row
  console.log('[settings] DELETE ACCOUNT — local data wiped (backend seam)');
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* best effort */
  }
}

/** days spent in the academy (1 on day one — you count from your first session) */
export function daysInAcademy(joinedAt: number): number {
  const d = Math.floor((Date.now() - joinedAt) / 86_400_000);
  return Math.max(1, d + 1);
}
