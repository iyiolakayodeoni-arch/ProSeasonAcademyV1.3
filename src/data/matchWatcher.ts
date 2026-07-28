// ─────────────────────────────────────────────────────────────
// MATCH WATCHER — the automatic MATCH SCAN.
//
// On Android this arms our own MediaProjection-based screen
// watcher (native module: MatchWatcherService). It reads a
// low-res grayscale copy of the screen ~once a second, feeds it
// to the pure ScoreTracker (frameAnalysis.ts), and counts goals
// automatically — no cloud, no paid AI, no third-party service.
//
// On web / iOS / devices without the native module it reports
// `available: false` and the Match Vault UI degrades gracefully
// to manual logging (which is fully supported).
// ─────────────────────────────────────────────────────────────

import { useSyncExternalStore } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { GrayFrame, ScoreTracker, WatcherEvent } from './frameAnalysis';

export type WatcherStatus = 'unavailable' | 'idle' | 'arming' | 'running' | 'finished';

export interface WatcherSession {
  startedAt: number;
  events: WatcherEvent[];
  scoreL: number;
  scoreR: number;
  frames: number;
}

interface WatcherState {
  status: WatcherStatus;
  session: WatcherSession | null;
  lastError: string | null;
}

const native: any = Platform.OS === 'android' ? (NativeModules as any).MatchWatcher : null;
export const watcherNativeAvailable = !!native;

let state: WatcherState = { status: watcherNativeAvailable ? 'idle' : 'unavailable', session: null, lastError: null };
const listeners = new Set<() => void>();
const getState = () => state;
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function set(next: Partial<WatcherState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

let tracker = new ScoreTracker();
let emitterSub: { remove: () => void } | null = null;

// tiny base64 → bytes decoder (Hermes has no guaranteed atob)
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function fromBase64(s: string): Uint8Array {
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let o = 0;
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < s.length; i++) {
    const v = B64.indexOf(s[i]);
    if (v < 0) continue;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 0xff;
    }
  }
  return out.subarray(0, o);
}

function onFrame(payload: { w: number; h: number; b64: string }) {
  if (!state.session || (state.status !== 'running' && state.status !== 'arming')) return;
  const frame: GrayFrame = { w: payload.w, h: payload.h, data: fromBase64(payload.b64) };
  const events = tracker.ingest(frame, Date.now());
  const s = state.session;
  set({
    status: 'running',
    session: {
      ...s,
      frames: s.frames + 1,
      events: events.length ? [...s.events, ...events] : s.events,
      scoreL: tracker.scoreL,
      scoreR: tracker.scoreR,
    },
  });
}

export async function armWatcher(): Promise<boolean> {
  if (!watcherNativeAvailable) return false;
  if (state.status === 'arming' || state.status === 'running') return true;
  tracker = new ScoreTracker();
  set({ status: 'arming', lastError: null, session: { startedAt: Date.now(), events: [], scoreL: 0, scoreR: 0, frames: 0 } });
  try {
    if (!emitterSub && native) {
      const emitter = new NativeEventEmitter(native);
      emitterSub = emitter.addListener('mw-frame', onFrame);
    }
    const granted = await native.start(); // shows the system screen-capture consent once
    if (!granted) {
      set({ status: 'idle', session: null, lastError: 'Screen capture permission was declined.' });
      return false;
    }
    return true; // status flips to 'running' on the first frame
  } catch (e: any) {
    set({ status: 'idle', session: null, lastError: String(e?.message ?? e) });
    return false;
  }
}

export async function finishWatcher(): Promise<WatcherSession | null> {
  try {
    if (native) await native.stop();
  } catch {
    /* service may already be down */
  }
  const session = state.session;
  set({ status: session && session.frames > 0 ? 'finished' : 'idle' });
  return session;
}

export async function cancelWatcher() {
  try {
    if (native) await native.stop();
  } catch {
    /* noop */
  }
  set({ status: 'idle', session: null, lastError: null });
}

export function useMatchWatcher() {
  const s = useSyncExternalStore(subscribe, getState);
  return {
    available: watcherNativeAvailable,
    status: s.status,
    session: s.session,
    lastError: s.lastError,
    arm: armWatcher,
    finish: finishWatcher,
    cancel: cancelWatcher,
  };
}
