// Web-safe audio player shim.
// On native, CoachingScreen uses expo-audio's useAudioPlayer/useAudioPlayerStatus.
// On web, expo-audio isn't available, so we provide a drop-in hook backed by a
// plain HTMLAudioElement. This mirrors the subset of expo-audio's API that
// CoachingScreen uses: play/pause/seekTo and {playing, currentTime, duration, didJustFinish}.
//
// The native entrypoint (useAudioPlayer.ts) simply re-exports expo-audio.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

export interface PlayerStatus {
  playing: boolean;
  currentTime: number;
  duration: number;
  didJustFinish: boolean;
}

export interface Player {
  play: () => void;
  pause: () => void;
  seekTo: (s: number) => Promise<void>;
  _webAudio?: HTMLAudioElement;
}

function resolveAssetUri(src: any): string | null {
  try {
    if (!src) return null;
    if (typeof src === 'string') return src;
    if (typeof src.uri === 'string') return src.uri;
    if (typeof src.default === 'string') return src.default;
    // expo-asset (RNW asset)
    const Asset = require('expo-asset');
    const a = Asset.Asset ? Asset.Asset.fromMetadata(src) : Asset.fromModule?.(src);
    return a?.uri ?? null;
  } catch {
    return null;
  }
}

export function useAudioPlayer(source: any): Player {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [, setTick] = useState(0);

  if (Platform.OS !== 'web') {
    // Native — this file shouldn't even be loaded (see useAudioPlayer.ts
    // platform resolution), but guard just in case.
    return {
      play: () => {},
      pause: () => {},
      seekTo: async () => {},
    };
  }

  const player = useMemo<Player>(() => {
    if (Platform.OS !== 'web') return { play: () => {}, pause: () => {}, seekTo: async () => {} };
    const uri = resolveAssetUri(source);
    if (!uri) return { play: () => {}, pause: () => {}, seekTo: async () => {} };
    const audio = new Audio(uri);
    audio.preload = 'auto';
    audioRef.current = audio;
    return {
      _webAudio: audio,
      play() {
        const p = audio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      },
      pause() {
        audio.pause();
      },
      async seekTo(s: number) {
        try {
          audio.currentTime = Math.max(0, s);
        } catch {
          /* ignore */
        }
      },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const bump = () => setTick((t) => t + 1);
    const onEnd = () => {
      bump();
    };
    a.addEventListener('play', bump);
    a.addEventListener('pause', bump);
    a.addEventListener('timeupdate', bump);
    a.addEventListener('loadedmetadata', bump);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('play', bump);
      a.removeEventListener('pause', bump);
      a.removeEventListener('timeupdate', bump);
      a.removeEventListener('loadedmetadata', bump);
      a.removeEventListener('ended', onEnd);
      a.pause();
    };
  }, []);

  return player;
}

export function useAudioPlayerStatus(player: Player): PlayerStatus {
  const [status, setStatus] = useState<PlayerStatus>({
    playing: false,
    currentTime: 0,
    duration: 0,
    didJustFinish: false,
  });
  const endedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const a = player._webAudio;
    if (!a) return;

    const tick = () => {
      const dur = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : 0;
      setStatus({
        playing: !a.paused,
        currentTime: a.currentTime || 0,
        duration: dur,
        didJustFinish: endedRef.current,
      });
    };
    const onPlay = () => { endedRef.current = false; tick(); };
    const onPause = () => { tick(); };
    const onTime = () => {
      // reset the "just finished" flag once the user seeks/plays again
      if (!a.paused) endedRef.current = false;
      tick();
    };
    const onMeta = () => tick();
    const onEnd = () => { endedRef.current = true; tick(); };

    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    tick();
    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnd);
    };
  }, [player]);

  return status;
}
