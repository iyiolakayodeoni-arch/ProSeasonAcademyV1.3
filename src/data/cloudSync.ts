// ─────────────────────────────────────────────────────────────
// CLOUD SYNC — keeps the local Match Vault mirrored with YOUR
// academy server. Push on save, pull + merge on boot, offline
// outbox for everything logged while the network was down.
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import * as backend from './backend';
import { getVault, mergeServerMatches, MatchEntry } from './matches';
import { getSettings } from './settings';

export type CloudStatus = 'offline' | 'connecting' | 'online';

interface CloudState {
  status: CloudStatus;
  handle: string | null;
  academyId: string | null;
  syncedAt: number | null; // last successful vault push
}

let state: CloudState = { status: 'offline', handle: null, academyId: null, syncedAt: null };
let started = false;

const listeners = new Set<() => void>();
const getState = () => state;
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function set(next: Partial<CloudState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function useCloud(): CloudState & { online: boolean } {
  const s = useSyncExternalStore(subscribe, getState);
  return { ...s, online: s.status === 'online' };
}

/** imperative read for non-React code */
export function getCloud(): CloudState {
  return state;
}

// ── vault outbox: matches that never reached the server ─────
const OUTBOX_KEY = 'psa.cloud.outbox.v1';

async function readOutbox(): Promise<string[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(OUTBOX_KEY)) ?? '[]');
  } catch {
    return [];
  }
}
async function writeOutbox(ids: string[]) {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(ids)).catch(() => {});
}

/** called by the vault after every manual save (dynamic, see matches.ts) */
export function pushMatch(entry: MatchEntry) {
  if (state.status !== 'online') {
    void readOutbox().then((ids) => {
      if (!ids.includes(entry.id)) void writeOutbox([entry.id, ...ids].slice(0, 500));
    });
    return;
  }
  void backend.pushMatches([entryToWire(entry)]).then((ok) => {
    if (ok) set({ syncedAt: Date.now() });
    else
      void readOutbox().then((ids) => {
        if (!ids.includes(entry.id)) void writeOutbox([entry.id, ...ids].slice(0, 500));
      });
  });
}

function entryToWire(m: MatchEntry) {
  return {
    clientId: m.id,
    at: m.at,
    gf: m.gf,
    ga: m.ga,
    mode: m.mode,
    oppStyle: m.oppStyle,
    passAcc: m.passAcc,
    noSprint: m.noSprint,
    mechanicsUsed: m.mechanicsUsed,
    ledAt75: m.ledAt75,
    decisive: m.decisive,
    source: m.source === 'scan' ? 'scan' : 'manual',
    composure: m.composure,
    note: m.note,
  };
}

async function flushOutbox(): Promise<void> {
  const ids = await readOutbox();
  if (!ids.length) return;
  const vault = getVault().matches;
  const pending = ids.map((id) => vault.find((m) => m.id === id)).filter((m): m is MatchEntry => !!m);
  if (!pending.length) return writeOutbox([]);
  const ok = await backend.pushMatches(pending.map(entryToWire));
  if (ok) {
    set({ syncedAt: Date.now() });
    const remaining = ids.filter((id) => !pending.some((m) => m.id === id));
    await writeOutbox(remaining);
  }
}

// ── boot: probe → auth → merge → push everything missing ────
let identity = { coachId: 'chinedu' };

// every user defaults to the display name PLAYER — which collides in
// the community (everyone would look like "you"). Give each DEVICE a
// persistent, unique handle suffix; respect a custom display name.
const HANDLE_KEY = 'psa.cloud.handle.v1';
async function deviceHandle(displayName: string): Promise<string> {
  if (displayName && displayName !== 'PLAYER') return displayName;
  try {
    const saved = await AsyncStorage.getItem(HANDLE_KEY);
    if (saved) return saved;
    const suffix = Array.from({ length: 4 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'.charAt(Math.floor(Math.random() * 31))).join('');
    const h = `PLAYER_${suffix}`;
    await AsyncStorage.setItem(HANDLE_KEY, h);
    return h;
  } catch {
    return 'PLAYER';
  }
}

export function initCloudSync(id: { coachId: string }): void {
  identity = id;
  if (started) return;
  started = true;
  void boot();
  // gentle periodic re-probe — when wifi returns, the academy reconnects itself
  setInterval(() => {
    if (state.status !== 'online') void boot();
  }, 30000);
}

async function boot(): Promise<void> {
  set({ status: 'connecting' });
  const healthy = await backend.probeHealth();
  if (!healthy) return set({ status: 'offline' });
  const s = getSettings();
  const handle = await deviceHandle(s.displayName);
  const me = await backend.ensureAuth(handle, identity.coachId, backend.DEVICE_LABEL, s.geo);
  if (!me) return set({ status: 'offline' });
  set({ status: 'online', handle: me.handle, academyId: me.academyId });

  // pull: matches logged on other devices land in the vault (merge by id)
  const rows = await backend.pullMatches();
  if (rows) mergeServerMatches(rows);

  // push: everything the server doesn't have yet (upserts are idempotent)
  const all = getVault().matches.map(entryToWire);
  if (all.length) await backend.pushMatches(all);
  await flushOutbox();
  set({ syncedAt: Date.now() });
}
