// Expo Metro config, extended so canvaskit's .wasm resolves as an asset on
// web builds (belt-and-braces alongside the CDN locateFile in index.ts).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

module.exports = config;
