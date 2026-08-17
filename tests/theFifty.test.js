const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');

execSync(
  `npx tsc --ignoreConfig src/data/theFifty.ts --outDir tests/.build --module commonjs --target es2019 --skipLibCheck --esModuleInterop --moduleResolution node --ignoreDeprecations 6.0 --types node`,
  { cwd: root, stdio: 'inherit' },
);

const F = require('./.build/theFifty.js');

assert.equal(F.THE_FIFTY.length, 50, `expected 50 players, got ${F.THE_FIFTY.length}`);
const ids = new Set(F.THE_FIFTY.map((p) => p.id));
assert.equal(ids.size, 50, 'player ids must be unique');
const handles = new Set(F.THE_FIFTY.map((p) => p.handle.toLowerCase()));
assert.equal(handles.size, 50, 'handles must be unique');

const champ = F.playerById('rvplegend');
assert.ok(champ);
assert.ok(champ.titles.some((t) => /world champion/i.test(t)));

const vej = F.playerById('vejrgang');
assert.ok(vej);
assert.ok(vej.titles.some((t) => /open 26/i.test(t)));
assert.ok(vej.titles.some((t) => /echampions league 2026/i.test(t)));

const feed = F.sceneFeed();
assert.ok(feed.length >= 8);
assert.equal(feed[0].date >= feed[feed.length - 1].date, true, 'feed is newest first');
for (const post of feed) {
  assert.ok(post.sourceUrl.startsWith('http'), `source url missing on ${post.id}`);
  assert.ok(post.body.length > 40, `thin body on ${post.id}`);
}

const noon = Date.parse('2026-08-17T12:00:00Z');
assert.equal(F.sceneTimeLabel('2026-08-17T12:00:00Z', noon), 'TODAY');
assert.equal(F.sceneTimeLabel('2026-08-16T12:00:00Z', noon), '1D AGO');

execSync(
  `npx tsc --ignoreConfig src/data/fcMechanics.ts --outDir tests/.build --module commonjs --target es2019 --skipLibCheck --esModuleInterop --moduleResolution node --ignoreDeprecations 6.0 --types node`,
  { cwd: root, stdio: 'inherit' },
);
const M = require('./.build/fcMechanics.js');
assert.ok(M.FC_MECHANICS.length >= 16, `expected a full mechanics book, got ${M.FC_MECHANICS.length}`);
for (const mech of M.FC_MECHANICS) {
  assert.ok(mech.name && mech.why && mech.rule && mech.learn.length === 3, `thin mechanic ${mech.id}`);
  assert.ok(mech.sourceUrl.startsWith('http'), `no source on ${mech.id}`);
}
assert.ok(M.FC_MECHANICS.some((m) => m.id === 'mx-explosive-stepover'));
assert.ok(M.FC_MECHANICS.some((m) => m.id === 'mx-driven-pass'));
console.log('PASS · THE FIFTY is 50 unique current names with a sourced scene feed and a mechanics book');
