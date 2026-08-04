// Pure-node unit tests for THE HONESTY GUARD.
// Run: node tests/honestyGuard.test.js (compiles TS to commonjs and runs).
//
// Proves that nonsense, keyboard mashing, repeated filler, evasion
// phrases, and copied prompts are rejected, while genuine soccer
// reflections pass cleanly.
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');

execSync(
  `npx tsc --ignoreConfig src/data/honestyGuard.ts --outDir tests/.build --module commonjs --target es2019 --skipLibCheck --esModuleInterop --moduleResolution node --ignoreDeprecations 6.0`,
  { cwd: root, stdio: 'inherit' }
);

const H = require('./.build/honestyGuard.js');

function testValidReflections() {
  const valid = [
    'the match wants patience',
    'in my own half',
    'their press',
    'I chase the ball',
    'no — I abandoned the plan',
    'rushed and hot',
    'slow the first pass down',
    'I threw the lead away',
    'the pass before their goal',
    'I kept the shape',
    'the same long ball',
    'I panicked after conceding',
    'not at the end',
    'I lost because of bad luck',
    'an honest answer long enough to count',
    'two rushed passes before the goal — slow the first touch down',
    'an honest moment answer that is long enough',
    'I keep rushing after conceding',
    'I now pause before passing',
    'we lost 2-1 because I rushed the first pass in transition',
    'PANIC PASS',
  ];

  for (const text of valid) {
    const r = H.checkHonesty(text, { minLength: 4 });
    assert.equal(
      r.ok,
      true,
      `Valid reflection should pass: "${text}" (got violation: ${r.violation})`
    );
  }
  console.log('PASS 1 · genuine reflections and soccer terminology pass cleanly');
}

function testTooShort() {
  const r1 = H.checkHonesty('', { minLength: 4 });
  assert.equal(r1.ok, false);
  assert.equal(r1.violation, 'too_short');

  const r2 = H.checkHonesty('bad', { minLength: 10 });
  assert.equal(r2.ok, false);
  assert.equal(r2.violation, 'too_short');

  console.log('PASS 2 · empty or under-length inputs are rejected as too_short');
}

function testKeyboardMash() {
  const mashes = [
    'asdfghjkl zxcvbnm',
    'qwertyuiop',
    'ffffffffffffff',
    '111111111111',
    'bcdfghjk lmnpqr',
  ];
  for (const text of mashes) {
    const r = H.checkHonesty(text, { minLength: 4 });
    assert.equal(
      r.ok,
      false,
      `Keyboard mash should fail: "${text}"`
    );
    assert.equal(r.violation, 'keyboard_mash', `Violation for "${text}" should be keyboard_mash`);
  }
  console.log('PASS 3 · keyboard mashing and consecutive consonant soup are rejected');
}

function testGibberish() {
  const gibs = [
    'aeiouaeiou',
    '1234567890',
    'xzpq wftr mbvl',
  ];
  for (const text of gibs) {
    const r = H.checkHonesty(text, { minLength: 4 });
    assert.equal(r.ok, false, `Gibberish should fail: "${text}"`);
    assert.equal(r.violation, 'gibberish', `Violation for "${text}" should be gibberish`);
  }
  console.log('PASS 4 · vowel/consonant imbalance and symbol-only gibberish are rejected');
}

function testEvasionPhrases() {
  const evasions = [
    'idk',
    'i dont know',
    'i do not know',
    'nothing',
    'nothing happened',
    'no idea',
    'same',
    'same as before',
    'test',
    'testing',
    'n a',
  ];
  for (const text of evasions) {
    const r = H.checkHonesty(text, { minLength: 3 });
    assert.equal(r.ok, false, `Evasion phrase should fail: "${text}"`);
    assert.equal(r.violation, 'filler_phrase', `Violation for "${text}" should be filler_phrase`);
  }

  // But using "nothing" within a full sentence should PASS
  const sentence = 'Nothing worked in our high press after the 60th minute';
  const rOk = H.checkHonesty(sentence, { minLength: 10 });
  assert.equal(rOk.ok, true, `Full sentence with "nothing" should pass: "${sentence}"`);

  console.log('PASS 5 · evasive dismissal phrases ("idk", "nothing") are rejected while legitimate sentences pass');
}

function testRepetitiveSpam() {
  const spams = [
    'test test test test',
    'bad bad bad bad',
    'lost match lost match lost match',
  ];
  for (const text of spams) {
    const r = H.checkHonesty(text, { minLength: 4 });
    assert.equal(r.ok, false, `Repetitive spam should fail: "${text}"`);
    assert.equal(r.violation, 'repetitive', `Violation for "${text}" should be repetitive`);
  }
  console.log('PASS 6 · repetitive spam and low word diversity are rejected');
}

function testCopiedPrompt() {
  const prompt = 'WHAT DID YOU FAIL TO NOTICE?';
  const copied = 'what did you fail to notice';
  const r = H.checkHonesty(copied, { minLength: 4, prompt });
  assert.equal(r.ok, false);
  assert.equal(r.violation, 'copied_prompt');
  console.log('PASS 7 · copying the question/prompt verbatim is rejected');
}

function testFeedbackFormatting() {
  const f1 = H.getHonestyFeedback('idk');
  assert.equal(f1.ok, false);
  assert.equal(f1.isWarning, true);
  assert.ok(f1.text.includes('HONESTY CHECK'));

  const f2 = H.getHonestyFeedback('in my own half');
  assert.equal(f2.ok, true);
  assert.equal(f2.isWarning, false);
  assert.ok(f2.text.includes('HONEST LEDGER'));
  console.log('PASS 8 · UI feedback formats coach warnings and honest ledger confirmations correctly');
}

function main() {
  testValidReflections();
  testTooShort();
  testKeyboardMash();
  testGibberish();
  testEvasionPhrases();
  testRepetitiveSpam();
  testCopiedPrompt();
  testFeedbackFormatting();
  console.log('\nALL HONESTY GUARD TESTS PASS');
}

main();
