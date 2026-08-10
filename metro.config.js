// Expo Metro config for web-only ProSeason Academy.
// - registers .wasm as an asset so canvaskit-wasm resolves for Skia on web.
// - aliases native-only Expo modules (notifications, image-picker,
//   file-system, system-ui) to local web shims so the bundle loads cleanly
//   in the browser without pulling in native code.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// Prefer .web.ts/.web.tsx/.web.js resolves explicitly.
const webExts = ['.web.tsx', '.web.ts', '.web.jsx', '.web.js'];
config.resolver.sourceExts = Array.from(new Set([...webExts, ...config.resolver.sourceExts]));

const webShims = {
  'expo-notifications': path.resolve(__dirname, 'src/web/expo-notifications.ts'),
  'expo-image-picker': path.resolve(__dirname, 'src/web/expo-image-picker.ts'),
  'expo-file-system': path.resolve(__dirname, 'src/web/expo-file-system.ts'),
  'expo-system-ui': path.resolve(__dirname, 'src/web/expo-system-ui.ts'),
  'expo-keep-awake': path.resolve(__dirname, 'src/web/expo-keep-awake.ts'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webShims[moduleName]) {
    return context.resolveRequest(context, webShims[moduleName], platform);
  }
  if (originalResolveRequest) return originalResolveRequest(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
