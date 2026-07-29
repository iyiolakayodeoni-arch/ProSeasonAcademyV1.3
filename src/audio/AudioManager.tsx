import { Audio, AVPlaybackStatus } from 'expo-av';
import { useEffect, useRef } from 'react';

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

/** One looping bed at a time. All beds are deliberately mixed quietly. */
export function useAmbientAudio(scene: AudioScene, enabled = true): void {
  const sound = useRef<Audio.Sound | null>(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  useEffect(() => {
    let alive = true;
    const start = async () => {
      if (!enabled) return;
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: false, staysActiveInBackground: false });
      const source = Array.isArray(TRACKS[scene])
        ? TRACKS[scene][Math.floor(Math.random() * TRACKS[scene].length)]
        : TRACKS[scene];
      const { sound: next } = await Audio.Sound.createAsync(source, {
        isLooping: true,
        volume: scene === 'film-room' ? 0.16 : 0.10,
        shouldPlay: true,
      });
      if (!alive) { await next.unloadAsync(); return; }
      sound.current = next;
    };
    void start();
    return () => { alive = false; const old = sound.current; sound.current = null; if (old) void old.stopAsync().then(() => old.unloadAsync()); };
  }, [scene, enabled]);
}

export async function playUiSound(soundFile: any, volume = 0.24): Promise<void> {
  const { sound } = await Audio.Sound.createAsync(soundFile, { volume, shouldPlay: true });
  sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) void sound.unloadAsync();
  });
}

export const UI_SOUNDS = {
  typing: require('../../assets/audio/coach-typing.wav'),
};
