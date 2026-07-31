import { useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

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

/**
 * One looping bed at a time — expo-audio edition.
 * Replaces the old expo-av implementation which caused the native
 * module misalignment (app opening then closing itself):
 * - expo-av pulls @react-native-async-storage/async-storage@^3, old RN, old worklets
 * - the rest of SDK 57 expects async-storage 2.2.0, RN 0.86.2, reanimated 4.5.1, worklets 0.10.1
 * By moving fully to expo-audio we drop the legacy native module.
 */
export function useAmbientAudio(scene: AudioScene, enabled = true): void {
  const playerRef = useRef<AudioPlayer | null>(null);
  const mountedRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    let alive = true;

    const start = async () => {
      if (!enabled) return;
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'duckOthers',
        });
      } catch {
        /* audio mode is best-effort */
      }
      try {
        const src =
          Array.isArray(TRACKS[scene])
            ? TRACKS[scene][Math.floor(Math.random() * TRACKS[scene].length)]
            : TRACKS[scene];
        const player = createAudioPlayer(src);
        player.loop = true;
        player.volume = scene === 'film-room' ? 0.16 : 0.10;
        player.play();
        if (!alive) {
          try {
            player.pause();
          } catch {}
          try {
            player.release();
          } catch {}
          try {
            (player as any).remove?.();
          } catch {}
          return;
        }
        mountedRef.current = player;
        playerRef.current = player;
      } catch {
        /* ambient is optional — never crash boot */
      }
    };

    void start();

    return () => {
      alive = false;
      const old = mountedRef.current ?? playerRef.current;
      mountedRef.current = null;
      playerRef.current = null;
      if (old) {
        try {
          old.pause();
        } catch {}
        try {
          old.release();
        } catch {}
        try {
          (old as any).remove?.();
        } catch {}
      }
    };
  }, [scene, enabled]);
}

export async function playUiSound(soundFile: any, volume = 0.24): Promise<void> {
  try {
    const player = createAudioPlayer(soundFile);
    player.volume = volume;
    player.play();

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      try {
        sub?.remove();
      } catch {}
      try {
        player.release();
      } catch {}
      try {
        (player as any).remove?.();
      } catch {}
    };

    const sub = player.addListener('playbackStatusUpdate', (status: any) => {
      if (status?.isLoaded && status.didJustFinish) {
        cleanup();
      }
    });

    // absolute fallback — if the status never fires (Android quirk), release after 6s
    setTimeout(cleanup, 6000);
  } catch {
    /* fire-and-forget */
  }
}

export const UI_SOUNDS = {
  typing: require('../../assets/audio/coach-typing.wav'),
};
