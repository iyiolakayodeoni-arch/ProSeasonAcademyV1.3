// ─────────────────────────────────────────────────────────────
// SOUND — the academy's ear. One tiny module owns everything
// audible:
//   · SFX ......... short UI sounds (tap, pop, whistle, coin…),
//                   lazily created, fire-and-forget, and silent
//                   when the player turns SOUND FX off.
//   · MUSIC ....... the dark 24s ambient pad that loops under
//                   the home tab — ducks under voice notes,
//                   pauses in the background, obeys the toggle.
//   · VOICE ....... per-coach assets for the briefing room's
//                   voice note (played by the screen itself via
//                   expo-audio's useAudioPlayer hook).
//
// The assets are generated, not licensed: scripts/make-sounds.py
// synthesises every wav, and the coach voice notes ship in the
// same folder. Never let a sound crash the app — every entry
// point is wrapped.
// ─────────────────────────────────────────────────────────────
import { AppState } from 'react-native';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getSettings } from '../data/settings';

export type SfxName =
  | 'tap' // every generic press
  | 'tab' // switching academy rooms
  | 'toggle' // settings switches
  | 'pop' // a chat bubble landing
  | 'whoosh' // sheets + the stage zoom
  | 'whistle' // lock-in + stage pass — the referee
  | 'success' // scan passed / claim filed
  | 'fail' // scan failed / rejected
  | 'coin' // the academy till
  | 'like'; // the little heart

const SFX_SOURCE: Record<SfxName, number> = {
  tap: require('../../assets/sounds/sfx-tap.wav'),
  tab: require('../../assets/sounds/sfx-tab.wav'),
  toggle: require('../../assets/sounds/sfx-toggle.wav'),
  pop: require('../../assets/sounds/sfx-pop.wav'),
  whoosh: require('../../assets/sounds/sfx-whoosh.wav'),
  whistle: require('../../assets/sounds/sfx-whistle.wav'),
  success: require('../../assets/sounds/sfx-success.wav'),
  fail: require('../../assets/sounds/sfx-fail.wav'),
  coin: require('../../assets/sounds/sfx-coin.wav'),
  like: require('../../assets/sounds/sfx-like.wav'),
};

const MUSIC_SOURCE = require('../../assets/sounds/music-home.wav');

/** the briefing-room voice note — one coach, one voice (real audio, his words) */
export function voiceNoteSource(_coachId: string): number {
  return require('../../assets/sounds/voice-chinedu.mp3');
}

let ready = false;
const players = new Map<SfxName, AudioPlayer>();
let music: AudioPlayer | null = null;
let musicWanted = false; // the screen's wish (toggle + foreground)
let musicDucked = false; // a voice note is talking

const MUSIC_VOLUME = 0.32;
const MUSIC_DUCKED_VOLUME = 0.1;

/** call once at app start — sets the audio session policy */
export function initAudio(): void {
  if (ready) return;
  ready = true;
  void setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'duckOthers',
    shouldPlayInBackground: false,
  }).catch(() => {});
  AppState.addEventListener('change', (s) => {
    if (s === 'active') {
      if (musicWanted) void safeMusicPlay();
    } else {
      music?.pause();
    }
  });
}

function sfxEnabled(): boolean {
  // unread = hydrated defaults (both on) — prefs land on the next frame anyway
  return getSettings().toggles.soundFx;
}

/** fire a UI sound; never throws, never blocks */
export function sfx(name: SfxName): void {
  if (!sfxEnabled()) return;
  try {
    let p = players.get(name);
    if (!p) {
      p = createAudioPlayer(SFX_SOURCE[name]);
      players.set(name, p);
    }
    if (p.playing) void p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    /* sound is seasoning, never the meal */
  }
}

// ── music ────────────────────────────────────────────────────
function safeMusicPlay() {
  try {
    if (!music) {
      music = createAudioPlayer(MUSIC_SOURCE);
      music.loop = true;
    }
    music.volume = musicDucked ? MUSIC_DUCKED_VOLUME : MUSIC_VOLUME;
    if (!music.playing) music.play();
  } catch {
    /* ambient is optional by definition */
  }
}

/** the one knob everything else turns: want the bed playing or not */
export function setMusicEnabled(on: boolean): void {
  musicWanted = on && getSettings().toggles.music;
  if (musicWanted) safeMusicPlay();
  else {
    try {
      music?.pause();
    } catch {
      /* noop */
    }
  }
}

/** sync against the settings toggle (e.g. after hydration or app start) */
export function syncMusicToSettings(): void {
  if (getSettings().toggles.music && musicWanted) safeMusicPlay();
  if (!getSettings().toggles.music) {
    try {
      music?.pause();
    } catch {
      /* noop */
    }
  }
}

/** a coach is talking — pull the bed down; call with false to restore */
export function duckMusic(on: boolean): void {
  musicDucked = on;
  try {
    if (music && (music.playing || musicWanted)) {
      music.volume = on ? MUSIC_DUCKED_VOLUME : MUSIC_VOLUME;
    }
  } catch {
    /* noop */
  }
}
