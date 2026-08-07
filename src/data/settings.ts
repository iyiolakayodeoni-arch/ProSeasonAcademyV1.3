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

export const PLATFORMS = ['PS5 / XBOX', 'PC / CONSOLE'] as const;
export const REGIONS = [
  'EU WEST · GMT+1',
  'EU EAST · GMT+2',
  'NA EAST · GMT-5',
  'NA WEST · GMT-8',
  'ASIA · GMT+8',
] as const;
export type GeoRegion = 'africa' | 'world' | 'unset';

export interface SettingsState {
  displayName: string;
  email: string | null;
  country: string | null; // picked at sign-up for the member profile
  geo: GeoRegion;         // retained regional profile value for existing records
  academyId: string; // generated once, never changes
  joinedAt: number; // first launch — drives "IN ACADEMY" days
  div: string;
  bestStreak: number;
  platform: (typeof PLATFORMS)[number];
  region: (typeof REGIONS)[number];
  /** ISO-2 country code captured at sign-up */
  countryCode: string | null;
  /** soft IP verify result */
  geoVerified: boolean;
  geoUncertain: boolean;
  toggles: {
    matchScanAutoRead: boolean;
    lossJournal: boolean;
    coachMessages: boolean;
    matchScanResults: boolean;
    filmRoomAlerts: boolean;
    communityMentions: boolean;
    founderAnnouncements: boolean;
    fcMobileNews: boolean;
    groupSessions: boolean;
    /** the ambient pad under the home tab */
    music: boolean;
    /** taps, whistles and lightweight feedback */
    soundFx: boolean;
  };
}

const STORAGE_KEY = 'psa.settings.v1';

const DEFAULTS: SettingsState = {
  displayName: 'PLAYER',
  email: null,
  country: null,
  countryCode: null,
  geo: 'unset',
  geoVerified: false,
  geoUncertain: false,
  academyId: `#PSA-${String(1000 + Math.floor(Math.random() * 9000))}`,
  joinedAt: Date.now(),
  div: 'DIV 4',
  bestStreak: 3,
  platform: 'PS5 / XBOX',
  region: 'EU WEST · GMT+1',
  toggles: {
    matchScanAutoRead: true,
    lossJournal: true,
    coachMessages: true,
    matchScanResults: true,
    filmRoomAlerts: true,
    communityMentions: false,
    founderAnnouncements: true,
    fcMobileNews: true,
    groupSessions: true,
    music: true,
    soundFx: true,
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
      const platform = (saved.platform as unknown as string) === 'CONSOLE' || (saved.platform as unknown as string) === 'MOBILE' || !saved.platform
        ? 'PS5 / XBOX'
        : saved.platform;
      state = {
        ...state,
        ...saved,
        platform,
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

export function setEmail(raw: string | null) {
  const clean = raw ? raw.trim().toLowerCase().slice(0, 80) : null;
  set({ email: clean || null });
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

/** sign-up capture: country and regional profile information */
export function setCountry(country: string, geo: Exclude<GeoRegion, 'unset'>, countryCode?: string) {
  set({ country, geo, countryCode: countryCode ?? state.countryCode });
}

export function setCountryCode(code: string | null) {
  set({ countryCode: code });
}

export function setGeoFlags(flags: { verified?: boolean; uncertain?: boolean }) {
  set({
    geoVerified: flags.verified ?? state.geoVerified,
    geoUncertain: flags.uncertain ?? state.geoUncertain,
  });
}

export function setAcademyId(id: string) {
  if (id) set({ academyId: id.startsWith('#') ? id : id });
}

/** full local wipe for "Delete account" — path, scans and XP go with it */
export async function wipeLocalData() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* best effort */
  }
  state = { ...DEFAULTS, toggles: { ...DEFAULTS.toggles }, academyId: `#PSA-${String(1000 + Math.floor(Math.random() * 9000))}`, joinedAt: Date.now() };
  listeners.forEach((l) => l());
}

/** days spent in the academy (1 on day one — you count from your first session) */
export function daysInAcademy(joinedAt: number): number {
  const d = Math.floor((Date.now() - joinedAt) / 86_400_000);
  return Math.max(1, d + 1);
}
