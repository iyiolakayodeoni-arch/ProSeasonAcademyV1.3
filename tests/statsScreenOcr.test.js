// Pure-node parser tests for OCR text pulled from post-match stats screenshots.
// Run: npm test
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const root = path.join(__dirname, '..');

execSync(
  `npx tsc --ignoreConfig src/data/statsScreenOcr.ts --outDir tests/.build --module commonjs --target es2019 --skipLibCheck --esModuleInterop --moduleResolution node --ignoreDeprecations 6.0 --types node`,
  { cwd: root, stdio: 'inherit' }
);

const stubDir = path.join(__dirname, '.build', 'node_modules');
fs.mkdirSync(path.join(stubDir, 'react-native'), { recursive: true });
fs.writeFileSync(
  path.join(stubDir, 'react-native', 'index.js'),
  `module.exports = { Platform: { OS: 'web', select: (opts) => opts.web ?? opts.default } };`
);
fs.mkdirSync(path.join(stubDir, 'react'), { recursive: true });
fs.writeFileSync(
  path.join(stubDir, 'react', 'index.js'),
  `exports.useEffect = () => {}; exports.useSyncExternalStore = (_sub, get) => get();`
);
fs.mkdirSync(path.join(stubDir, '@react-native-async-storage', 'async-storage'), { recursive: true });
fs.writeFileSync(
  path.join(stubDir, '@react-native-async-storage', 'async-storage', 'index.js'),
  `module.exports = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };`
);
fs.mkdirSync(path.join(stubDir, 'expo-file-system'), { recursive: true });
fs.writeFileSync(
  path.join(stubDir, 'expo-file-system', 'index.js'),
  `module.exports = { readAsStringAsync: async () => '', EncodingType: { Base64: 'base64' } };`
);

const O = require('./.build/data/statsScreenOcr.js');

function main() {
  // ══ T1 · standard line-by-line OCR text is parsed into the right stats ══
  const raw = `
    Full Time 2 - 1
    Possession 55% 45%
    Shots 10 6
    Shots on Target 6 3
    Pass Accuracy 87% 79%
    Tackles Won 14 11
    Saves 2 4
  `;
  const parsed = O.parseStatsFromOcrText(raw);
  assert.equal(parsed.fields.gf, 2);
  assert.equal(parsed.fields.ga, 1);
  assert.equal(parsed.fields.possession, 55);
  assert.equal(parsed.fields.shots, 10);
  assert.equal(parsed.fields.shotsOnTarget, 6);
  assert.equal(parsed.fields.passAccuracy, 87);
  assert.equal(parsed.fields.tacklesWon, 14);
  assert.equal(parsed.fields.saves, 2);
  assert.equal(parsed.paired.possession.left, 55);
  assert.equal(parsed.paired.possession.right, 45);
  const rightSide = O.fieldsForOcrSide(parsed, 'right');
  assert.equal(rightSide.gf, 1);
  assert.equal(rightSide.ga, 2);
  assert.equal(rightSide.possession, 45);
  const sided = O.parseStatsFromOcrText('You 2-1 Them\nPossession 55 45');
  assert.equal(sided.suggestedSide, 'left');
  console.log('PASS 1 · standard OCR lines are parsed into stats and left/right pairs');

  // ══ T2 · reversed label/value OCR still resolves numbers ══
  const messy = `
    3-2 Result
    61 possession
    9 shots
    4 on target
    84 passing accuracy
    17 tackles won
    1 saves
  `;
  const parsedMessy = O.parseStatsFromOcrText(messy);
  assert.equal(parsedMessy.fields.gf, 3);
  assert.equal(parsedMessy.fields.ga, 2);
  assert.equal(parsedMessy.fields.possession, 61);
  assert.equal(parsedMessy.fields.shotsOnTarget, 4);
  assert.equal(parsedMessy.fields.passAccuracy, 84);
  const pasted = O.parseStatsFromPastedText(messy);
  assert.equal(pasted.fields.passAccuracy, 84);
  console.log('PASS 2 · reversed OCR order still parses');

  // ══ T3 · alternate labels and OCR digit noise still parse ══
  const alt = `
    Score 2-0
    Possession % 6O 40
    Shots 11 8
    Shot on Goal 5 3
    Passing Acc 8l% 76%
    Tackles Successful 13 9
    Goalkeeper Saves 2 4
  `;
  const parsedAlt = O.parseStatsFromOcrText(alt);
  assert.equal(parsedAlt.fields.possession, 60);
  assert.equal(parsedAlt.fields.shotsOnTarget, 5);
  assert.equal(parsedAlt.fields.passAccuracy, 81);
  assert.equal(parsedAlt.fields.tacklesWon, 13);
  assert.equal(parsedAlt.fields.saves, 2);
  console.log('PASS 3 · alternate labels and OCR digit noise are recovered');

  // ══ T4 · out-of-range OCR junk is clamped safely ══
  const wild = `Full Time 27-31 Possession 142% Shots 90 Shots on Target 70 Pass Accuracy 104% Tackles Won 77 Saves 33`;
  const parsedWild = O.parseStatsFromOcrText(wild);
  assert.equal(parsedWild.fields.gf, 20);
  assert.equal(parsedWild.fields.ga, 20);
  assert.equal(parsedWild.fields.possession, 100);
  assert.equal(parsedWild.fields.passAccuracy, 100);
  assert.equal(parsedWild.fields.saves, 20);
  console.log('PASS 4 · OCR junk is clamped, never trusted raw');

  console.log('\nALL STATS SCREEN OCR PARSER TESTS PASS');
}

main();
