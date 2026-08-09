// Ambient audio beds per scene. On web this uses HTMLAudioElement via the
// expo-audio shim; on native it uses real expo-audio. All code paths are
// fail-soft — ambient beds are seasoning, never required to boot.
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
type AudioPlayer = any;

export type AudioScene = 'splash' | 'seat' | 'coach-select' | 'home' | 'community' | 'film-room';

const TRACKS: Record<AudioScene, any> = {
  splash: require('../../assets/audio/splash-suspense.wav'),
  seat: require('../../assets/audio/seat-ambience.wav'),
  'coach-select': require('../../assets/audio/coach-typing.wav'),
  home: require('../../assets/audio/home-focus.wav'),
  community: [
    require('../../assets/audio/community-gbedu-upbeat.wav'),
    require('../../assets/audio/community-afrofusion-game.wav'),
    require('../../assets/audio/community-happy-percussion.wav'),
    require('../../assets/audio/community-chill-lobby.wav'),
  ],
  'film-room': require('../../assets/audio/filmroom-afro-funk.wav'),
};

function resolveUri(src: any): any {
  if (Platform.OS !== 'web') return src;
  try {
    if (!src) return src;
    if (typeof src === 'string') return src;
    if (src.uri) return src.uri;
    if (src.default?.uri) return src.default.uri;
    const Asset = require('expo-asset');
    const a = Asset.fromModule ? Asset.fromModule(src) : null;
    return a?.uri ?? src;
  } catch {
    return src;
  }
}

function safeStop(p: any) {
  if (!p) return;
  try { p.pause(); } catch { /* noop */ }
  try { if (typeof p.release === 'function') p.release(); } catch { /* noop */ }
}

export function useAmbientAudio(scene: AudioScene, enabled = true): void {
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    let alive = true;
    let player: any = null;

    const start = async () => {
      if (!enabled) return;
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'duckOthers',
        }).catch(() => {});
      } catch {
        /* audio mode is best-effort */
      }
      try {
        const src = Array.isArray(TRACKS[scene])
          ? TRACKS[scene][Math.floor(Math.random() * TRACKS[scene].length)]
          : TRACKS[scene];
        const resolved = resolveUri(src);
        player = createAudioPlayer(resolved);
        if (!player) return;
        player.loop = true;
        const vol = scene === 'film-room' ? 0.16 : 0.1;
        try { player.volume = vol; } catch { /* noop */ }
        try { player.play(); } catch { /* noop — autoplay may be blocked */ }
        if (!alive) { safeStop(player); return; }
        playerRef.current = player;
      } catch {
        /* ambient is optional — never crash boot */
      }
    };

    void start();

    return () => {
      alive = false;
      const old = player ?? playerRef.current;
      playerRef.current = null;
      safeStop(old);
    };
  }, [scene, enabled]);
}

export async function playUiSound(soundFile: any, volume = 0.24): Promise<void> {
  try {
    const resolved = resolveUri(soundFile);
    const player: any = createAudioPlayer(resolved);
    if (!player) return;
    try { player.volume = volume; } catch { /* noop */ }
    try { player.play(); } catch { /* noop */ }
    // Auto-release after a generous timeout (the shim and native both have
    // cleanup paths, but we always want to free the audio node).
    setTimeout(() => safeStop(player), 8000);
  } catch {
    /* fire-and-forget */
  }
}

export const UI_SOUNDS = {
  typing: require('../../assets/audio/coach-typing.wav'),
};
