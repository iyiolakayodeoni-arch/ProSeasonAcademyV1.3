// Pure-node unit tests for the BASELINE WEEK — the honest 7-day gate.
// Run: npm test (compiles the TS engine, then executes).
//
// These tests prove the pacing contract: day 1 opens immediately,
// every later day unlocks 24h AFTER the previous day is sealed (the
// enforced gap that gives the player time to think), lateness is
// never punished, old sessions migrate without losing progress, and
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

const DAY = B.BASELINE_DAY_MS;

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
  // ══ T1 · a fresh week opens on DAY 1, days 2–7 are future ══
  await B.resetBaselineForDev();
  const fresh = await B.loadBaseline('chinedu');
  assert.equal(B.currentBaselineDay(fresh), 1, 'fresh session starts on day 1');
  assert.equal(B.dayStatus(fresh, 1), 'today', 'day 1 is today');
  assert.equal(B.dayStatus(fresh, 2), 'future', 'day 2 is future');
  assert.equal(B.isWeekComplete(fresh), false, 'the week is not complete');
  console.log('PASS 1 · fresh week opens on DAY 1, days 2–7 are future');

  // ══ T2 · sealing day 1 unlocks day 2 exactly 24h later ══
  B.recordBaselineMatch(entry(Date.now()), null);
  B.sealBaselineDay(1);
  const after1 = await B.loadBaseline('chinedu');
  assert.equal(B.currentBaselineDay(after1), 2, 'day 1 sealed → day 2 is current');
  assert.equal(B.dayStatus(after1, 2), 'locked', 'day 2 is locked (unlock in 24h)');
  const d2 = after1.days.find((d) => d.day === 2);
  const d1 = after1.days.find((d) => d.day === 1);
  assert.equal(d2.unlockedAt - d1.sealedAt, DAY, 'day 2 unlocks exactly 24h after day 1 was sealed');
  assert.equal(d1.entryIndex, 0, 'day 1 is linked to its vault entry');
  console.log('PASS 2 · sealing day 1 unlocks day 2 exactly 24h later (the honesty gap)');

  // ══ T3 · lateness is not punished — sealing late still unlocks +24h from THAT seal ══
  B.recordBaselineMatch(entry(Date.now()));
  B.sealBaselineDay(2);
  const after2 = await B.loadBaseline('chinedu');
  const d3 = after2.days.find((d) => d.day === 3);
  const d2s = after2.days.find((d) => d.day === 2);
  assert.equal(d3.unlockedAt - d2s.sealedAt, DAY, 'day 3 unlocks 24h after the (late) day-2 seal');
  assert.equal(B.currentBaselineDay(after2), 3, 'day 3 is current even when late');
  console.log('PASS 3 · lateness is never punished — the gap is always 24h from the actual seal');

  // ══ T4 · a moment analysis is only complete when EVERY question is answered ══
  const full = namedMoment('CONCEDED AFTER A PANIC PASS');
  assert.equal(B.baselineMomentComplete(full), true, 'all nine answered → complete');
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
  assert.equal(B.dayStatus(migrated, 3), 'locked', 'day 3 locked (unlock = day-2 seal + 24h)');
  assert.equal(migrated.entries.length, 2, 'no progress lost');
  console.log('PASS 5 · pre-week sessions migrate to the 7-day schedule without losing progress');

  // ══ T6 · the week completes across 7 days: Matches 1–3 → Rest 1 → Match 4 → Rest 2 → Match 5 Finale ══
  assert.equal(B.isBaselineMatchDay(3), true, 'day 3 is a match day');
  assert.equal(B.isBaselineRestDay(4), true, 'day 4 is a rest day');
  B.recordBaselineMatch(entry(Date.now()));
  B.sealBaselineDay(3);
  const after3 = await B.loadBaseline('chinedu');
  assert.equal(B.currentBaselineDay(after3), 4, 'match 3 sealed → day 4 (rest day 1) is current');
  B.saveBaselineReflection(4, 'I keep rushing after conceding', 'I now pause before passing');
  B.sealBaselineDay(4);
  const after4 = await B.loadBaseline('chinedu');
  assert.equal(B.currentBaselineDay(after4), 5, 'rest day 1 sealed → day 5 (match 4) is current');
  B.recordBaselineMatch(entry(Date.now()));
  B.sealBaselineDay(5);
  const after5 = await B.loadBaseline('chinedu');
  assert.equal(B.currentBaselineDay(after5), 6, 'match 4 sealed → day 6 (rest day 2) is current');
  B.saveBaselineReflection(6, 'My standard for finale is zero panic passes', 'I will hold composure');
  B.sealBaselineDay(6);
  const after6 = await B.loadBaseline('chinedu');
  assert.equal(B.currentBaselineDay(after6), 7, 'rest day 2 sealed → day 7 (match 5 finale) is current');
  assert.equal(B.isBaselineMatchDay(7), true, 'day 7 is match 5 (the finale)');
  assert.equal(B.matchNumberForDay(after6, 7), 5, 'day 7 corresponds to match number 5');
  const d7 = after6.days.find((d) => d.day === 7);
  assert.equal(d7.sealedAt, null, 'day 7 not yet sealed');
  assert.equal(B.dayStatus(after6, 7), 'locked', 'day 7 unlocks 24h after rest day 2');
  const refl4 = after6.days.find((d) => d.day === 4).reflection;
  assert.ok(refl4 && refl4.repeated.includes('rushing'), 'day 4 reflection persisted');
  const refl6 = after6.days.find((d) => d.day === 6).reflection;
  assert.ok(refl6 && refl6.repeated.includes('standard'), 'day 6 reflection persisted');
  console.log('PASS 6 · the week flows Matches 1–3 → Rest 1 → Match 4 → Rest 2 → Match 5 Finale, each gated by 24h');

  await B.resetBaselineForDev();
  console.log('\nALL BASELINE WEEK TESTS PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
