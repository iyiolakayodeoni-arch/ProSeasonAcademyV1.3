#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = fs.existsSync(path.join(__dirname, '..', 'package.json'))
  ? path.resolve(__dirname, '..')
  : process.cwd();

const PLUGIN = path.join(ROOT, 'plugins', 'withMatchWatcher.js');
const OUT_DIR = path.join(
  ROOT,
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'onliversity',
  'proseasonacademy'
);

const log = (...a) => console.log('[fix-matchwatcher]', ...a);
function fail(msg) {
  console.error('[fix-matchwatcher] ERROR: ' + msg);
  process.exit(1);
}

if (process.cwd() !== ROOT) {
  log(
    'note: you are not in the project root (' + ROOT + ') — the script auto-detected ' +
      'it, but `expo prebuild` must be run from the root, not from inside android/.'
  );
}

if (!fs.existsSync(PLUGIN)) {
  fail('plugins/withMatchWatcher.js not found. Run from the project root.');
}
let plugin = fs.readFileSync(PLUGIN, 'utf8');

if (!plugin.includes('reactApplicationContext.currentActivity')) {
  fail(
    'plugins/withMatchWatcher.js is the OLD version (pre v1.3.1). Get the fixed ' +
      "one first:\n    git checkout main -- plugins/withMatchWatcher.js\n  " +
      "then re-run this script."
  );
}
log('plugins/withMatchWatcher.js: fixed version confirmed ✓');

const IMPORT = 'import android.view.Display\n';
const ANCHOR = 'import android.util.Base64\n';
if (!plugin.includes(IMPORT)) {
  if (!plugin.includes(ANCHOR)) {
    fail('could not find the import anchor in the service template.');
  }
  plugin = plugin.replace(ANCHOR, ANCHOR + IMPORT);
  fs.writeFileSync(PLUGIN, plugin, 'utf8');
  log('patched plugins/withMatchWatcher.js: added ' + IMPORT.trim());
} else {
  log('plugins/withMatchWatcher.js: Display import already present ✓');
}

function extractTemplate(constName) {
  const re = new RegExp('const ' + constName + ' = `([\\s\\S]*?)`\\n');
  const m = plugin.match(re);
  if (!m) fail('could not extract ' + constName + ' from the plugin.');
  return m[1];
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const files = {
  'MatchWatcherModule.kt': 'MATCH_WATCHER_MODULE_KT',
  'MatchWatcherService.kt': 'MATCH_WATCHER_SERVICE_KT',
  'MatchWatcherPackage.kt': 'MATCH_WATCHER_PACKAGE_KT',
};
for (const [file, constName] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT_DIR, file), extractTemplate(constName), 'utf8');
  log('wrote ' + file);
}

// Self-verify: the written Kotlin must be the RN 0.86-compatible version, otherwise
// :app:compileReleaseKotlin will fail again with the same errors.
const written = (f) => fs.readFileSync(path.join(OUT_DIR, f), 'utf8');
const moduleKt = written('MatchWatcherModule.kt');
const serviceKt = written('MatchWatcherService.kt');
const checks = [
  ['MatchWatcherModule.kt implements onNewIntent', moduleKt.includes('override fun onNewIntent(intent: Intent)')],
  ['MatchWatcherModule.kt has exactly one onActivityResult', (moduleKt.match(/fun onActivityResult\(/g) || []).length === 1],
  ['MatchWatcherModule.kt defines emit()', moduleKt.includes('internal fun emit(name: String, map: WritableMap)')],
  ['MatchWatcherModule.kt uses reactApplicationContext.currentActivity', moduleKt.includes('reactApplicationContext.currentActivity')],
  ['MatchWatcherService.kt uses ImageFormat.RGBA_8888', serviceKt.includes('ImageFormat.RGBA_8888')],
  ['MatchWatcherService.kt imports android.view.Display', serviceKt.includes('import android.view.Display')],
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  fail(
    'the files just written are NOT the RN 0.86 fixed version — ' +
      failed.map(([name]) => name).join('; ') +
      '. Is plugins/withMatchWatcher.js up to date?'
  );
}
for (const [name] of checks) log('verified: ' + name + ' ✓');

const mainApp = path.join(OUT_DIR, '..', 'MainApplication.kt');
if (fs.existsSync(mainApp)) {
  const ma = fs.readFileSync(mainApp, 'utf8');
  if (!ma.includes('MatchWatcherPackage')) {
    log(
      'WARNING: MainApplication.kt does not mention MatchWatcherPackage — ' +
        'regenerate with `npx expo prebuild --platform android` if unexpected.'
    );
  } else {
    log('MainApplication.kt: MatchWatcherPackage registered ✓');
  }
}

log('Done. Build now with:  cd android && ./gradlew assembleRelease');