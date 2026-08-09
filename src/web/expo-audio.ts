// Web shim for expo-audio that forwards to our HTML5-backed hook.
// CoachingScreen imports from '../audio/useAudioPlayer' which resolves to
// useAudioPlayer.webshim.ts, but other modules (sound.ts, AudioManager.tsx)
// still require('expo-audio') defensively — return an empty stub so requires
// don't throw at runtime on web.

export function createAudioPlayer(_source: any) {
  if (typeof document === 'undefined') return null;
  try {
    const a = new Audio();
    return {
      play: () => { const p = a.play(); if (p && p.catch) p.catch(() => {}); },
      pause: () => a.pause(),
      seekTo: async (s: number) => { try { a.currentTime = s; } catch { /* noop */ } },
      get playing() { return !a.paused; },
      set loop(v: boolean) { a.loop = v; },
      set volume(v: number) { a.volume = v; },
    };
  } catch {
    return null;
  }
}

export async function setAudioModeAsync(_mode: any): Promise<void> {
  /* web has no audio-session policy — no-op */
}

export function useAudioPlayer(_source: any) {
  // Real implementation lives in src/audio/useAudioPlayer.webshim.ts.
  return { play: () => {}, pause: () => {}, seekTo: async () => {} };
}

export function useAudioPlayerStatus(_player: any) {
  return { playing: false, currentTime: 0, duration: 0, didJustFinish: false };
}

export const InterruptionMode = { DuckOthers: 'duckOthers', DoNotMix: 'doNotMix' };
