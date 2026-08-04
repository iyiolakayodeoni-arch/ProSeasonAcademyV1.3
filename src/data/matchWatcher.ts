// ─────────────────────────────────────────────────────────────
// MATCH WATCHER — THE EYE + THE RECORDING.
//
// On Android this arms our own MediaProjection-based screen
// watcher (native module injected at prebuild by
// plugins/withMatchWatcher.js: MatchWatcherModule + a foreground
// service). It does two things:
//
//   1. THE EYE — streams ~1fps 96×54 grayscale frames to the pure
//      ScoreTracker (frameAnalysis.ts), which counts goals
//      automatically — no cloud, no paid AI, no third-party.
//
//   2. THE RECORDING — the same consent starts a MediaRecorder
//      that ONLY begins after the match is detected (first goal
//      event, or the player confirming MATCH STARTED), so an
//      entire phone session is never recorded up front. The MP4
//      is written to app-private storage and never uploaded by
//      default; finish() resolves the local path for review.
//
// Half-time / full-time checkpoints arrive as "mw-checkpoint"
// events (time-based heuristics) — the Mirror Session pauses at
// them, and the player can always override in the UI.
//
// On web / iOS / devices without the native module everything
// reports `available: false` and the session degrades gracefully
// to manual mode (fully supported).
// ─────────────────────────────────────────────────────────────

import { useSyncExternalStore } from 'react';
import { NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { GrayFrame, ScoreTracker, WatcherEvent } from './frameAnalysis';

export type WatcherStatus = 'unavailable' | 'idle' | 'arming' | 'running' | 'finished';
export type CheckpointKind = 'half' | 'full';

export interface WatcherSession {
  startedAt: number;
  events: WatcherEvent[];
  scoreL: number;
  scoreR: number;
  frames: number;
  /** absolute path to the recorded MP4 (null until recording begins) */
  recordingPath: string | null;
  recording: boolean;
  halfDetectedAt: number | null;
  fullDetectedAt: number | null;
}

interface WatcherState {
  status: WatcherStatus;
  session: WatcherSession | null;
  lastError: string | null;
}

const native: any = null; // Automated match watcher removed — manual observation is where resilience is forged.
export const watcherNativeAvailable = false;

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

function patchSession(patch: Partial<WatcherSession>) {
  if (!state.session) return;
  set({ session: { ...state.session, ...patch } });
}

function onFrame(payload: { w: number; h: number; b64: string }) {
  if (!state.session || (state.status !== 'running' && state.status !== 'arming')) return;
  const frame: GrayFrame = { w: payload.w, h: payload.h, data: fromBase64(payload.b64) };
  const events = tracker.ingest(frame, Date.now());
  patchSession({
    frames: state.session.frames + 1,
    events: events.length ? [...state.session.events, ...events] : state.session.events,
    scoreL: tracker.scoreL,
    scoreR: tracker.scoreR,
  });
  // a goal is strong evidence a real match has started — begin the
  // recording automatically (no-op if the player already confirmed)
  if (events.length && state.session && !state.session.recording && native) {
    try {
      native.beginRecording();
    } catch {
      /* recording is best-effort; manual mode stays first-class */
    }
  }
}

function onCheckpoint(payload: { kind: string }) {
  if (!state.session) return;
  if (payload.kind === 'half' && !state.session.halfDetectedAt) {
    patchSession({ halfDetectedAt: Date.now() });
  } else if (payload.kind === 'full' && !state.session.fullDetectedAt) {
    patchSession({ fullDetectedAt: Date.now() });
  }
}

function onState(payload: { state?: string; path?: string; durationMs?: number }) {
  if (!state.session) return;
  if (payload.state === 'recording') {
    patchSession({ recording: true, recordingPath: payload.path ?? null });
  } else if (payload.state === 'stopped') {
    patchSession({ recording: false, recordingPath: payload.path ?? state.session.recordingPath });
    set({ status: 'finished' });
  }
}

function ensureEmitter() {
  if (emitterSub || !native) return;
  const emitter = new NativeEventEmitter(native);
  const sub = emitter.addListener('mw-frame', onFrame);
  emitterSub = {
    remove: () => {
      try {
        sub.remove();
      } catch {
        /* noop */
      }
    },
  };
  try {
    emitter.addListener('mw-checkpoint', onCheckpoint);
    emitter.addListener('mw-state', onState);
  } catch {
    /* older native builds only emit frames */
  }
}

export async function armWatcher(): Promise<boolean> {
  if (!watcherNativeAvailable) return false;
  if (state.status === 'arming' || state.status === 'running') return true;
  // Android 13+ needs the notification permission for the capture service
  if (Platform.OS === 'android' && (Platform.Version as number) >= 33) {
    try {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    } catch {
      /* denial is not fatal — the service still runs in the task manager */
    }
  }
  tracker = new ScoreTracker();
  set({
    status: 'arming',
    lastError: null,
    session: {
      startedAt: Date.now(),
      events: [],
      scoreL: 0,
      scoreR: 0,
      frames: 0,
      recordingPath: null,
      recording: false,
      halfDetectedAt: null,
      fullDetectedAt: null,
    },
  });
  try {
    ensureEmitter();
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

/** begin the local recording now (the player confirmed MATCH STARTED) */
export function beginMatchRecording(): void {
  if (!native || !state.session) return;
  try {
    native.beginRecording();
  } catch {
    /* noop */
  }
}

export async function finishWatcher(): Promise<WatcherSession | null> {
  if (!native) {
    const s = state.session;
    set({ status: s && s.frames > 0 ? 'finished' : 'idle' });
    return s;
  }
  const before = state.session;
  try {
    native.stop(); // the service resolves its own promise; we await the state event
  } catch {
    /* noop */
  }
  // the native 'mw-state' stopped event flips status to 'finished'
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline && state.status !== 'finished') {
    await new Promise((r) => setTimeout(r, 50));
  }
  const s = state.session ?? before;
  set({ status: s && (s.frames > 0 || s.recordingPath) ? 'finished' : 'idle' });
  return s;
}

export async function cancelWatcher() {
  if (native) {
    try {
      await native.stop();
    } catch {
      /* noop */
    }
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
    beginRecording: beginMatchRecording,
  };
}
