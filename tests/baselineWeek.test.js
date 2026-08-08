// Pure-node unit tests for the BASELINE WEEK — a player-paced 5-match gate.
// Run: npm test (compiles the TS engine, then executes).
//
// These tests prove the player-paced flow: day 1 opens immediately and every
// later day opens as soon as the previous one is sealed. Old sessions migrate
// without losing progress, and
// the day's moment analysis must be genuinely complete before the
// day can be sealed.
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const root = path.join(__dirname, '..');

execSync(
  `npx tsc --ignoreConfig src/data/baselineScan.ts tests/test-env.d.ts --outDir tests/.build --module commonjs --target es2019 --skipLibCheck --esModuleInterop --moduleResolution node --ignoreDeprecations 6.0 --types node`,
  { cwd: root, stdio: 'inherit' }
);

// the cloud uplink is a runtime concern — remove it so the vault's dynamic
// require fails soft (which addMatch is designed to survive)
try { fs.unlinkSync(path.join(__dirname, '.build', 'data', 'cloudSync.js')); } catch {}

// a STATEFUL AsyncStorage stub so persistence + migration can be tested
const stubDir = path.join(__dirname, '.build', 'node_modules');
fs.mkdirSync(path.join(stubDir, 'react-native'), { recursive: true });
fs.writeFileSync(
  path.join(stubDir, 'react-native', 'index.js'),
  `module.exports = { NativeModules: {}, NativeEventEmitter: class { addListener() { return { remove() {} }; } }, Platform: { OS: 'ios', select: (options) => options.ios ?? options.default } };`
);
fs.mkdirSync(path.join(stubDir, '@react-native-async-storage', 'async-storage'), { recursive: true });
fs.writeFileSync(
  path.join(stubDir, '@react-native-async-storage', 'async-storage', 'index.js'),
  `const store = {};
module.exports = {
  getItem: async (k) => (k in store ? store[k] : null),
  setItem: async (k, v) => { store[k] = String(v); },
  removeItem: async (k) => { delete store[k]; },
  __store: store,
};`
);
fs.mkdirSync(path.join(stubDir, 'react-native-url-polyfill'), { recursive: true });
fs.writeFileSync(path.join(stubDir, 'react-native-url-polyfill', 'auto.js'), '');

const B = require('./.build/data/baselineScan.js');

function entry(at, moments = []) {
  return {
    gf: 1,
    ga: 0,
    result: 'W',
    composure: 4,
    question: 'Q',
    answer: 'an honest answer long enough to count',
    moments,
    at,
  };
}
function namedMoment(name, analysis = {}) {
  const a = {};
  for (const q of B.BASELINE_MOMENT_QUESTIONS) a[q.key] = (analysis[q.key] ?? 'an honest moment answer that is long enough');
  return {
    id: 'M1',
    name,
    startMin: 12,
    endMin: 18,
    tag: 'PANIC PASS',
    when: '12’–18’',
    kind: 'PANIC PASS',
    answer: a.happened ?? '',
    analysis: a,
  };
}

async function main() {
  // ══ T0 · a baseline moment is useful without nine essay boxes ══
  assert.equal(B.BASELINE_MOMENT_QUESTIONS.length, 3, 'three focused moment prompts');
  assert.equal(B.baselineStatsComplete({ possession: 52, shots: 8, shotsOnTarget: 4, passAccuracy: 81 }), true, 'four core stats are enough');
  assert.equal(B.baselineStatsComplete({ possession: 52, shots: 8, shotsOnTarget: 4, passAccuracy: null }), false, 'a missing core stat still blocks the receipt');
  console.log('PASS 0 · baseline asks for three reflection prompts and four core stats');

  // ══ T1 · a fresh week opens on MATCH 1, matches 2–5 are future
  await B.resetBaselineForDev();
  const fresh = await B.loadBaseline('chinedu');
  assert.equal(B.currentBaselineDay(fresh), 1, 'fresh session starts on match 1');
  assert.equal(B.dayStatus(fresh, 1), 'today', 'match 1 is ready');
  assert.equal(B.dayStatus(fresh, 2), 'future', 'match 2 is future');
  assert.equal(B.dayStatus(fresh, 4), 'future', 'match 4 is future');
  assert.equal(B.dayStatus(fresh, 5), 'future', 'match 5 is future');
  assert.equal(B.isWeekComplete(fresh), false, 'the week is not complete');
  assert.equal(B.isBaselineRestDay(4), false, 'there are no rest days');
  assert.equal(B.BASELINE_DAYS, 5, 'the week is five matches, not seven days');
  console.log('PASS 1 · fresh week opens on MATCH 1, matches 2–5 are future');

  // ══ T2 · sealing match 1 immediately opens match 2 ══
  B.recordBaselineMatch(entry(Date.now()), null);
  B.sealBaselineDay(1);
  const after1 = await B.loadBaseline('chinedu');
  assert.equal(B.currentBaselineDay(after1), 2, 'match 1 sealed → match 2 is current');
  assert.equal(B.dayStatus(after1, 2), 'today', 'match 2 is available immediately');
  const d2 = after1.days.find((d) => d.day === 2);
  const d1 = after1.days.find((d) => d.day === 1);
  assert.equal(d2.unlockedAt, d1.sealedAt, 'match 2 opens when match 1 is sealed');
  assert.equal(d1.entryIndex, 0, 'match 1 is linked to its vault entry');
  assert.equal(B.matchNumberForDay(after1, 1), 1, 'day 1 is match number 1');
  console.log('PASS 2 · sealing match 1 immediately opens match 2');

  // ══ T3 · every completed match immediately opens the next one ══
  B.recordBaselineMatch(entry(Date.now()));
  B.sealBaselineDay(2);
  const after2 = await B.loadBaseline('chinedu');
  const d3 = after2.days.find((d) => d.day === 3);
  const d2s = after2.days.find((d) => d.day === 2);
  assert.equal(d3.unlockedAt, d2s.sealedAt, 'match 3 opens when match 2 is sealed');
  assert.equal(B.currentBaselineDay(after2), 3, 'match 3 is current even when late');
  assert.equal(B.matchNumberForDay(after2, 3), 3, 'day 3 is match number 3');
  console.log('PASS 3 · sealing any match immediately opens the next');

  // ══ T4 · a moment analysis is only complete when EVERY question is answered ══
  const full = namedMoment('CONCEDED AFTER A PANIC PASS');
  assert.equal(B.baselineMomentComplete(full), true, 'all focused prompts answered → complete');
  const partial = { ...full, analysis: { ...full.analysis, differently: 'short' } };
  assert.equal(B.baselineMomentComplete(partial), false, 'one short answer → not complete');
  console.log('PASS 4 · moment analysis requires every question answered in full');

  // ══ T5 · old (pre-week) sessions migrate without losing progress ══
  await B.resetBaselineForDev();
  const store = require('./.build/node_modules/@react-native-async-storage/async-storage/index.js').__store;
  const at = Date.now() - 1000;
  const old = {
    coachId: 'chinedu',
    entries: [entry(at, [namedMoment('A')]), entry(at + 1000, [namedMoment('B')])],
    ambition: null,
    card: null,
    startedAt: at - 1000,
    // no `days` — this is a pre-week session
  };
  store['psa.baseline.v1'] = JSON.stringify(old);
  const migrated = await B.loadBaseline('chinedu');
  assert.equal(B.currentBaselineDay(migrated), 3, 'migration: 2 sealed entries → day 3 current');
  assert.equal(B.dayStatus(migrated, 1), 'done', 'day 1 done after migration');
  assert.equal(B.dayStatus(migrated, 2), 'done', 'day 2 done after migration');
  assert.equal(B.dayStatus(migrated, 3), 'today', 'match 3 is available after migration');
  assert.equal(migrated.entries.length, 2, 'no progress lost');
  assert.equal(migrated.days.length, 5, 'migrated session is rebuilt as a 5-match schedule');
  console.log('PASS 5 · pre-week sessions migrate to the 5-match schedule without losing progress');

  // ══ T6 · the week completes across 5 matches, at the player's own pace ══
  assert.equal(B.isBaselineMatchDay(3), true, 'match 3 is a match day');
  assert.equal(B.isBaselineMatchDay(5), true, 'match 5 is a match day');
  assert.equal(B.isBaselineRestDay(4), false, 'there is no rest day between matches');
  B.recordBaselineMatch(entry(Date.now()));
  B.sealBaselineDay(3);
  const after3 = await B.loadBaseline('chinedu');
  assert.equal(B.currentBaselineDay(after3), 4, 'match 3 sealed → match 4 is current immediately');
  assert.equal(B.dayStatus(after3, 4), 'today', 'match 4 is ready at the player\'s pace');
  assert.equal(B.matchNumberForDay(after3, 4), 4, 'day 4 is match number 4');
  B.recordBaselineMatch(entry(Date.now()));
  B.sealBaselineDay(4);
  const after4 = await B.loadBaseline('chinedu');
  assert.equal(B.currentBaselineDay(after4), 5, 'match 4 sealed → match 5 (finale) is current');
  assert.equal(B.dayStatus(after4, 5), 'today', 'match 5 is available immediately');
  const d5 = after4.days.find((d) => d.day === 5);
  assert.equal(d5.sealedAt, null, 'match 5 not yet sealed');
  assert.equal(B.matchNumberForDay(after4, 5), 5, 'day 5 is match number 5');
  assert.equal(B.isWeekComplete(after4), false, 'the week completes only after match 5');
  B.recordBaselineMatch(entry(Date.now()));
  B.sealBaselineDay(5);
  const after5 = await B.loadBaseline('chinedu');
  assert.equal(B.currentBaselineDay(after5), 6, 'match 5 sealed → the week is complete');
  assert.equal(B.isWeekComplete(after5), true, 'the week is complete after 5 matches');
  console.log('PASS 6 · the week completes across 5 matches at the player\'s own pace, with no waits');

  await B.resetBaselineForDev();
  console.log('\nALL BASELINE WEEK TESTS PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
