// ─────────────────────────────────────────────────────────────
// SOUND — the academy's ear.
//   · SFX ......... short UI sounds (tap, pop, whistle…), lazily
//                   created, fire-and-forget, silent when toggled off.
//   · MUSIC ....... the dark 24s ambient pad that loops under
//                   the home tab; ducks under voice notes; pauses
//                   when the tab is hidden.
//   · VOICE ....... per-coach voice-note assets (consumed by the
//                   briefing screen itself).
//
// Web: uses a tiny HTML5 Audio shim when `expo-audio` isn't available
// (expo-audio is a native module and does not run in the browser).
// Every entry point is fail-soft — sound is seasoning, never the meal.
// ─────────────────────────────────────────────────────────────
import { AppState, Platform } from 'react-native';
import { getSettings } from '../data/settings';
// Lazy-load expo-audio — on web our Metro aliases resolve this to the web shim,
// and on native it resolves to real expo-audio. We import lazily so a missing
// audio module during SSR/tests can never crash boot.
function getAudio(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-audio');
  } catch {
    return null;
  }
}

export type SfxName =
  | 'tap'
  | 'tab'
  | 'toggle'
  | 'pop'
  | 'whoosh'
  | 'whistle'
  | 'success'
  | 'fail'
  | 'like';

const SFX_SOURCE: Record<SfxName, number> = {
  tap: require('../../assets/sounds/sfx-tap.wav'),
  tab: require('../../assets/sounds/sfx-tab.wav'),
  toggle: require('../../assets/sounds/sfx-toggle.wav'),
  pop: require('../../assets/sounds/sfx-pop.wav'),
  whoosh: require('../../assets/sounds/sfx-whoosh.wav'),
  whistle: require('../../assets/sounds/sfx-whistle.wav'),
  success: require('../../assets/sounds/sfx-success.wav'),
  fail: require('../../assets/sounds/sfx-fail.wav'),
  like: require('../../assets/sounds/sfx-like.wav'),
};

const MUSIC_SOURCE = require('../../assets/sounds/music-home.wav');

/** the briefing-room voice note — the academy's coach, Chinedu */
export function voiceNoteSource(): number {
  return require('../../assets/sounds/voice-chinedu.mp3');
}

// Resolve a Metro-required asset to a URI the browser/audio engine can play.
function resolveAssetUri(src: any): string | null {
  try {
    if (!src) return null;
    if (typeof src === 'string') return src;
    if (typeof src.uri === 'string') return src.uri;
    if (typeof src.default === 'string') return src.default;
    // RN asset
    if (src && typeof src === 'object') {
      const Asset = require('expo-asset');
      const a = Asset.Asset ? Asset.Asset.fromMetadata(src) : Asset.fromModule(src);
      if (a && (a.uri || a.localUri)) return a.uri || a.localUri;
      a?.downloadAsync?.().catch(() => {});
      return a?.uri ?? null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

// ── Native (expo-audio) backend ──────────────────────────────
type AnyPlayer = {
  play: () => void;
  pause: () => void;
  seekTo?: (ms: number) => Promise<void> | void;
  playing?: boolean;
  loop?: boolean;
  volume?: number;
};

let nativeApi:
  | {
      createAudioPlayer: (src: any) => AnyPlayer;
      setAudioModeAsync: (mode: any) => Promise<void>;
    }
  | null = undefined as any;
function getNativeApi() {
  if (nativeApi !== (undefined as any)) return nativeApi;
  const api = getAudio();
  // On web our shim returns createAudioPlayer/setAudioModeAsync (HTML-backed),
  // but for sound.ts we intentionally use the hand-written web path below so
  // we can control asset URI resolution. Force nativeApi = null on web.
  if (Platform.OS === 'web') {
    nativeApi = null;
    return null;
  }
  nativeApi = api ?? null;
  return nativeApi;
}

// ── Web (HTMLAudioElement) backend ───────────────────────────
type WebBank = {
  players: Map<SfxName, HTMLAudioElement>;
  music: HTMLAudioElement | null;
  musicReady: boolean;
};
const webBank: WebBank = { players: new Map(), music: null, musicReady: false };

function ensureWeb(): WebBank | null {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  if (!webBank.musicReady) {
    webBank.musicReady = true;
    const onVis = () => {
      if (document.hidden) webBank.music?.pause();
      else if (musicWanted) void safeMusicPlay();
    };
    document.addEventListener('visibilitychange', onVis);
  }
  return webBank;
}

function webPlayerFor(name: SfxName): HTMLAudioElement | null {
  const bank = ensureWeb();
  if (!bank) return null;
  let p = bank.players.get(name);
  if (!p) {
    const uri = resolveAssetUri(SFX_SOURCE[name]);
    if (!uri) return null;
    p = new Audio(uri);
    p.preload = 'auto';
    bank.players.set(name, p);
  }
  return p;
}

function webMusic(): HTMLAudioElement | null {
  const bank = ensureWeb();
  if (!bank) return null;
  if (!bank.music) {
    const uri = resolveAssetUri(MUSIC_SOURCE);
    if (!uri) return null;
    const m = new Audio(uri);
    m.loop = true;
    bank.music = m;
  }
  return bank.music;
}

// ── Shared state ─────────────────────────────────────────────
let ready = false;
let musicWanted = false;
let musicDucked = false;
const MUSIC_VOLUME = 0.32;
const MUSIC_DUCKED_VOLUME = 0.1;

/** call once at app start — sets audio session policy */
export function initAudio(): void {
  if (ready) return;
  ready = true;
  const api = getNativeApi();
  if (api) {
    void api
      .setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        shouldPlayInBackground: false,
      })
      .catch(() => {});
    AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        if (musicWanted) void safeMusicPlay();
      } else {
        try {
          nativeApi && (getMusicPlayerNative() as any)?.pause?.();
        } catch {
          /* noop */
        }
      }
    });
  } else {
    ensureWeb();
  }
}

let nativeMusic: AnyPlayer | null = null;
function getMusicPlayerNative(): AnyPlayer | null {
  const api = getNativeApi();
  if (!api) return null;
  if (!nativeMusic) {
    try {
      nativeMusic = api.createAudioPlayer(MUSIC_SOURCE);
      if (nativeMusic) nativeMusic.loop = true;
    } catch {
      return null;
    }
  }
  return nativeMusic;
}

function sfxEnabled(): boolean {
  try {
    return getSettings().toggles.soundFx;
  } catch {
    return true;
  }
}

/** fire a UI sound; never throws, never blocks */
export function sfx(name: SfxName): void {
  if (!sfxEnabled()) return;
  const api = getNativeApi();
  try {
    if (api) {
      // Native path — lazily cache per-sfx players
      const cache = (sfx as any)._players || ((sfx as any)._players = new Map());
      let p = cache.get(name);
      if (!p) {
        p = api.createAudioPlayer(SFX_SOURCE[name]);
        cache.set(name, p);
      }
      if (p.playing) void p.seekTo?.(0)?.catch?.(() => {});
      p.play();
      return;
    }
    // Web path
    const p = webPlayerFor(name);
    if (!p) return;
    try {
      p.currentTime = 0;
    } catch {
      /* some browsers throw if not loaded yet */
    }
    const pr = p.play();
    if (pr && typeof pr.catch === 'function') pr.catch(() => {});
  } catch {
    /* sound is seasoning, never the meal */
  }
}

// ── music ────────────────────────────────────────────────────
function safeMusicPlay() {
  try {
    const api = getNativeApi();
    const volume = musicDucked ? MUSIC_DUCKED_VOLUME : MUSIC_VOLUME;
    if (api) {
      const m = getMusicPlayerNative();
      if (!m) return;
      m.volume = volume;
      if (!m.playing) m.play();
      return;
    }
    const m = webMusic();
    if (!m) return;
    m.volume = volume;
    const pr = m.play();
    if (pr && typeof pr.catch === 'function') pr.catch(() => {});
  } catch {
    /* ambient is optional */
  }
}

/** the one knob everything else turns: want the bed playing or not */
export function setMusicEnabled(on: boolean): void {
  musicWanted = on && getSettings().toggles.music;
  if (musicWanted) safeMusicPlay();
  else {
    try {
      const api = getNativeApi();
      if (api) getMusicPlayerNative()?.pause();
      else webMusic()?.pause();
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
      const api = getNativeApi();
      if (api) getMusicPlayerNative()?.pause();
      else webMusic()?.pause();
    } catch {
      /* noop */
    }
  }
}

/** a coach is talking — pull the bed down; call with false to restore */
export function duckMusic(on: boolean): void {
  musicDucked = on;
  try {
    const api = getNativeApi();
    const v = on ? MUSIC_DUCKED_VOLUME : MUSIC_VOLUME;
    if (api) {
      const m = getMusicPlayerNative();
      if (m && (m.playing || musicWanted)) m.volume = v;
    } else {
      const m = webMusic();
      if (m) m.volume = v;
    }
  } catch {
    /* noop */
  }
}
