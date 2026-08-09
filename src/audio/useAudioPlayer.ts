// Platform entrypoint: native uses real expo-audio; web uses our HTML5 shim.
// Metro resolves .web.ts on web and this file on iOS/Android — but since the
// project is web-only now, both resolve to the web shim. The re-export is kept
// so any future native work (or Storybook on native) doesn't need rewiring.
export { useAudioPlayer, useAudioPlayerStatus } from './useAudioPlayer.webshim';
export type { Player, PlayerStatus } from './useAudioPlayer.webshim';
