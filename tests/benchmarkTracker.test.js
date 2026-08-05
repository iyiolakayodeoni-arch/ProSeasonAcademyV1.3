// Pure-node unit tests for the BENCHMARK TRACKER model.
// Run: npm test
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const root = path.join(__dirname, '..');

execSync(
  `npx tsc --ignoreConfig src/data/benchmarkTracker.ts --outDir tests/.build --module commonjs --target es2019 --skipLibCheck --esModuleInterop --moduleResolution node --ignoreDeprecations 6.0 --types node`,
  { cwd: root, stdio: 'inherit' }
);

const stubDir = path.join(__dirname, '.build', 'node_modules');
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

const B = require('./.build/benchmarkTracker.js');

async function main() {
  // ══ T1 · fresh draft always opens with seven empty matches ══
  const draft = B.createDraftBenchmarkMatches();
  assert.equal(draft.length, 7, 'seven match slots are created');
  assert.equal(B.benchmarkMatchComplete(draft[0]), false, 'empty slot is not complete');
  console.log('PASS 1 · seven-match draft opens empty and incomplete');

  // ══ T2 · the demo set produces a stable control-heavy read ══
  const demo = B.summariseBenchmarkMatches(B.DEMO_BENCHMARK_SET);
  assert.equal(demo.matches, 7, 'demo set is fully complete');
  assert.equal(demo.style.label, 'CONTROL BUILDER', 'demo batch reads as CONTROL BUILDER');
  assert.equal(demo.wins, 5, 'demo win count is right');
  assert.equal(demo.draws, 2, 'demo draw count is right');
  assert.equal(demo.losses, 0, 'demo loss count is right');
  console.log('PASS 2 · demo stats produce the expected card and style');

  // ══ T3 · direct low-possession scoring reads as DIRECT FINISHER ══
  const direct = Array.from({ length: 7 }, (_, i) => ({
    id: `d-${i}`,
    screenshotName: null,
    screenshotUri: null,
    gf: 2,
    ga: i % 2,
    possession: 46,
    shots: 8,
    shotsOnTarget: 5,
    passAccuracy: 78,
    tacklesWon: 12,
    saves: 2,
  }));
  const directSummary = B.summariseBenchmarkMatches(direct);
  assert.equal(directSummary.style.label, 'DIRECT FINISHER', 'low-possession high-output batch is read as DIRECT FINISHER');
  console.log('PASS 3 · direct-output profile is classified correctly');

  // ══ T4 · comparison tells the truth about improvement and decline ══
  const delta = B.compareBenchmarkSummaries(directSummary, demo);
  assert.ok(delta, 'delta exists when a previous summary exists');
  assert.equal(delta.avgPossession < 0, true, 'possession fell versus the demo set');
  assert.equal(delta.avgGoalsFor > 0, false, 'direct batch does not outscore the demo set');
  console.log('PASS 4 · benchmark deltas keep honest up/down movement');

  // ══ T5 · premium identity / benchmark gap helpers produce a dossier ══
  const identity = B.benchmarkIdentity(demo);
  assert.equal(identity.primaryStyle, 'CONTROL BUILDER', 'identity keeps the primary style');
  assert.ok(identity.secondaryTendency.length > 0, 'identity adds a secondary tendency');
  const gaps = B.benchmarkGap(demo);
  assert.equal(gaps.length, 5, 'five benchmark gap lines exist');
  assert.ok(gaps.every((g) => g.player >= 0 && g.player <= 100), 'gap scores are bounded');
  const proof = B.benchmarkProofStamp(demo);
  assert.equal(proof.label, 'FULL CHECKPOINT', 'seven screenshots earn the full proof stamp');
  console.log('PASS 5 · premium identity, benchmark gap and proof stamp helpers work');

  // ══ T6 · saving a checkpoint persists and numbers it correctly ══
  await B.wipeBenchmarkTracker();
  const first = B.addBenchmarkCheckpoint(B.DEMO_BENCHMARK_SET);
  const second = B.addBenchmarkCheckpoint(direct);
  assert.equal(first.checkpoint, 1, 'first save is checkpoint 1');
  assert.equal(first.title, 'FOUNDATION READ', 'first save gets the right automatic title');
  assert.equal(second.checkpoint, 2, 'second save is checkpoint 2');
  assert.equal(second.month, 2, 'second save lands in month slot 2');
  assert.equal(second.label.includes('MONTH 2'), true, 'second save gets the right automatic month label');
  console.log('PASS 6 · saved checkpoints number themselves and keep their month slot');

  await B.wipeBenchmarkTracker();
  console.log('\nALL BENCHMARK TRACKER TESTS PASS');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
