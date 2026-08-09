import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';

// Web entry for ProSeason Academy (pure web app).
// The native-OS splash is held until the React splash is mounted to
// avoid a white flash on load.
SplashScreen.preventAutoHideAsync().catch(() => {});

import App from './App';

// React Native Skia renders through CanvasKit (WASM) on web, which must be
// ready before any Skia canvas mounts. The .wasm binary is served by the
// dev/build server itself as a Metro asset (same origin as the app); the
// jsDelivr CDN URL is only a fallback if the asset system ever drops it.
const CANVASKIT_VERSION = '0.41.0'; // pinned to match canvaskit-wasm dep
const CANVASKIT_CDN = `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${CANVASKIT_VERSION}/bin/full`;

function canvaskitWasmUri(): string {
  try {
    // Metro turns this into an asset module whose default export is the URL
    // (resolvable because metro.config.js registers 'wasm' as an asset ext).
    const asset = require('canvaskit-wasm/bin/full/canvaskit.wasm');
    if (typeof asset === 'string') return asset;
    if (asset && typeof asset.uri === 'string') return asset.uri;
    if (asset && typeof asset.default === 'string') return asset.default;
  } catch {
    // not bundled — fall through to CDN
  }
  return `${CANVASKIT_CDN}/canvaskit.wasm`;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
LoadSkiaWeb({ locateFile: () => canvaskitWasmUri() }).then(() => registerRootComponent(App));
