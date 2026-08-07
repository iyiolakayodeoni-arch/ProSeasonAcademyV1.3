// Pure-node unit tests for the MIRROR SESSION state machine.
// Run: npm test (compiles the TS engine, then executes).
//
// These tests prove the anti-self-deception sequence holds:
// the carried lesson is answered first, the intention is captured
// before the score, the match lands in the vault as a receipt, the
// moments are answered in the player's words, the versions are
// placed beside one another, and the sworn lesson takes the Thread.
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const root = path.join(__dirname, '..');

// compile the mirror engine (and its dependency chain) to commonjs
execSync(
  `npx tsc --ignoreConfig src/data/mirrorSession.ts --outDir tests/.build --module commonjs --target es2019 --skipLibCheck --esModuleInterop --moduleResolution node --ignoreDeprecations 6.0 --types node`,
  { cwd: root, stdio: 'inherit' }
);

// the cloud uplink is a runtime concern here — remove it so the vault's
// dynamic require fails soft (which addMatch is designed to survive)
try { fs.unlinkSync(path.join(__dirname, '.build', 'data', 'cloudSync.js')); } catch {}

// stub the two react-native-touching modules for the plain-node runtime
const stubDir = path.join(__dirname, '.build', 'node_modules');
fs.mkdirSync(path.join(stubDir, 'react-native'), { recursive: true });
fs.writeFileSync(
  path.join(stubDir, 'react-native', 'index.js'),
  `module.exports = { NativeModules: {}, NativeEventEmitter: class { addListener() { return { remove() {} }; } }, Platform: { OS: 'ios', select: (options) => options.ios ?? options.default } };`
);
fs.mkdirSync(path.join(stubDir, '@react-native-async-storage', 'async-storage'), { recursive: true });
fs.writeFileSync(
  path.join(stubDir, '@react-native-async-storage', 'async-storage', 'index.js'),
  `module.exports = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };`
);
// react-native-url-polyfill is a no-op in this plain-node state-machine test.
fs.mkdirSync(path.join(stubDir, 'react-native-url-polyfill'), { recursive: true });
fs.writeFileSync(path.join(stubDir, 'react-native-url-polyfill', 'auto.js'), '');

const M = require('./.build/data/mirrorSession.js');
const T = require('./.build/data/lessonThread.js');
const V = require('./.build/data/matches.js');

function fullHalf() {
  return {
    refusing: 'the match wants patience',
    rushing: 'in my own half',
    danger: 'their press',
    afterLoss: 'I chase the ball',
    following: 'no — I abandoned the plan',
    emotion: 'rushed and hot',
    secondHalf: 'slow the first pass down',
    composure: 3,
  };
}
function fullFull() {
  return {
    decided: 'I threw the lead away',
    change: 'the pass before their goal',
    didWell: 'I kept the shape',
    repeated: 'the same long ball',
    emotions: 'I panicked after conceding',
    followed: 'not at the end',
    believe: 'I lost because of bad luck',
    composure: 2,
  };
}
function momentAnswers() {
  const a = {};
  for (const q of M.MOMENT_QUESTIONS) a[q.key] = 'an honest answer long enough to count';
  return a;
}

async function main() {
  // ══ T0 · the ritual stays focused instead of becoming a questionnaire ══
  assert.equal(M.INTENTION_QUESTIONS.length, 1, 'one pre-match focus');
  assert.equal(M.HALF_TIME_QUESTIONS.length, 2, 'two half-time prompts');
  assert.equal(M.FULL_TIME_QUESTIONS.length, 2, 'two full-time prompts');
  assert.equal(M.MOMENT_QUESTIONS.length, 3, 'three prompts per player-chosen moment');
  console.log('PASS 0 · focused Mirror Session uses 1 + 2 + 2 + 3 prompts');

  // ══ T1 · a fresh session opens on INTENTION (no carried lesson) ══
  await M.wipeMirror();
  M.startMirrorSession(1);
  assert.equal(M.getMirrorSession().phase, 'intention', 'no carried lesson → intention first');
  console.log('PASS 1 · fresh session opens on INTENTION');

  // ══ T2 · a carried lesson must be answered before the match ══
  T.swearLesson({ stageN: 1, lesson: 'stay patient under pressure', matchId: null });
  M.startMirrorSession(2);
  assert.equal(M.getMirrorSession().phase, 'thread-check', 'carried lesson → thread-check gate');
  M.answerCarriedLesson('broke', 'conceded twice after rushing');
  assert.equal(M.getMirrorSession().phase, 'intention', 'answer → intention');
  const settled = T.getThread().entries.find((e) => e.lesson === 'stay patient under pressure');
  assert.ok(settled && settled.status === 'broke', 'the carried lesson is settled as BROKE');
  console.log('PASS 2 · carried lesson answered HELD/BROKE before the match');

  // ══ T3 · intention is captured BEFORE the score, and the versions hold it ══
  M.saveIntention({
    practice: 'no-sprint defending',
    pressure: 'I rush my passes',
    avoid: 'chasing the ball',
    useful: 'one calm sequence',
    attention: 'my first touch under pressure',
    composure: 4,
  });
  const versions = M.buildVersions();
  assert.equal(versions.length, 4, 'four versions exist');
  assert.ok(versions.find((v) => v.key === 'before').text.includes('rush'), 'BEFORE version carries the player’s own words');
  console.log('PASS 3 · intention captured; BEFORE version holds the player’s words');

  // ══ T4 · the full session sequence ══
  assert.equal(M.getMirrorSession().phase, 'intention', 'saved intention → ready to start the console match');
  M.beginMatch();
  assert.equal(M.getMirrorSession().phase, 'live', 'begin → live');
  M.atHalfTime();
  assert.equal(M.getMirrorSession().phase, 'half-time', 'atHalfTime → half-time');
  M.saveHalfTime(fullHalf());
  assert.equal(M.getMirrorSession().phase, 'second-half', 'half-time answers → second half');
  M.openScorePhase();
  assert.equal(M.getMirrorSession().phase, 'score', 'full time → score logging');
  M.atFullTime(2, 1);
  const s = M.getMirrorSession();
  assert.equal(s.phase, 'full-time', 'score logged → full-time reflection');
  assert.ok(s.matchId, 'the match has a vault receipt');
  const receiptMatch = V.getVault().matches.find((m) => m.id === s.matchId);
  assert.ok(receiptMatch && receiptMatch.gf === 2 && receiptMatch.ga === 1, 'the receipt landed in the real vault');
  M.saveFullTime(fullFull());
  assert.equal(M.getMirrorSession().phase, 'division', 'memory captured → division');

  M.addMoment('CONCEDED AFTER A PANIC PASS', 27, 31);
  M.addMoment('CALM SEQUENCE', 12, 18);
  assert.equal(M.getMirrorSession().moments.length, 2, 'player divides the match themselves');
  for (const m of M.getMirrorSession().moments) {
    const a = momentAnswers();
    for (const q of M.MOMENT_QUESTIONS) M.answerMoment(m.id, q.key, a[q.key]);
  }
  assert.ok(M.allMomentsComplete(), 'all moments answered in the player’s words');
  M.openReviewPhase();
  assert.equal(M.getMirrorSession().phase, 'review', 'division done → review');
  M.openComparePhase();
  assert.equal(M.getMirrorSession().phase, 'compare', 'review done → compare');
  const versions2 = M.buildVersions();
  assert.ok(versions2.find((v) => v.key === 'full').text.includes('bad luck'), 'FULL-TIME version keeps the “bad luck” belief');
  assert.ok(versions2.find((v) => v.key === 'review').text, 'AFTER REVIEW version exists after the moments');
  M.setClosestVersion('review');
  M.openLessonPhase();
  assert.equal(M.getMirrorSession().phase, 'lesson', 'comparison done → lesson');

  M.finishMirrorLesson('two rushed passes before the goal — slow the first touch down');
  const done = M.getMirrorSession();
  assert.equal(done.phase, 'done', 'lesson sworn → done');
  assert.equal(done.closestVersion, 'review', 'the player chose which version is closest to the evidence');
  assert.equal(done.receipts.length, 1, 'one receipt preserved');
  assert.equal(done.receipts[0].moments, 2, 'receipt counts reviewed moments');
  const carriedNow = T.getThread().entries.find((e) => e.status === 'carried');
  assert.ok(carriedNow && carriedNow.lesson.includes('rushed passes'), 'the sworn lesson takes the Thread');
  console.log('PASS 4 · full sequence: start → live → half-time → second half → score → memory → division → review → compare → lesson → receipt');

  // ══ T5 · a new session opens by asking about the lesson that was just sworn ══
  M.startMirrorSession(2);
  assert.equal(M.getMirrorSession().phase, 'thread-check', 'next session opens on the Thread — the lesson cannot be forgotten');
  console.log('PASS 5 · the next session opens by asking how the sworn lesson held');

  console.log('\nALL MIRROR SESSION TESTS PASS');
  await M.wipeMirror();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
