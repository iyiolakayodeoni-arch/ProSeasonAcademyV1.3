// Pure-node unit tests for the Match Watcher's frame analysis.
// Run: npm run test:watcher  (compiles the TS engine, then executes)
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
execSync(
  `npx tsc --ignoreConfig src/data/frameAnalysis.ts --outDir tests/.build --module commonjs --target es2019 --skipLibCheck`,
  { cwd: root, stdio: 'inherit' }
);
const { ScoreTracker, DEFAULT_ROI_LEFT, DEFAULT_ROI_RIGHT, sampleRegion, changedFraction } = require('./.build/frameAnalysis.js');

// ── synthetic frame factory ──────────────────────────────────
const W = 96;
const H = 54;
function blankFrame() {
  return { w: W, h: H, data: new Uint8Array(W * H).fill(120) };
}
function paint(frame, roi, value) {
  const x0 = Math.floor(roi.x * W);
  const y0 = Math.floor(roi.y * H);
  const x1 = Math.ceil((roi.x + roi.w) * W);
  const y1 = Math.ceil((roi.y + roi.h) * H);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) frame.data[y * W + x] = value;
  return frame;
}
// a digit pattern per score value (score 0 = untouched grey box)
const DIGIT = [null, 10, 250, 40, 220, 60];
/** frame of the scorebug showing `l`-`r`. Unlike naive flashes, the
 *  scoring side's digit STAYS changed afterwards — as it really does. */
function scoreFrame(l, r) {
  const f = blankFrame();
  if (l > 0) paint(f, DEFAULT_ROI_LEFT, DIGIT[l]);
  if (r > 0) paint(f, DEFAULT_ROI_RIGHT, DIGIT[r]);
  return f;
}
const goalFrame = (side) => (side === 'L' ? scoreFrame(1, 0) : scoreFrame(0, 1));

let t = 1_000_000;
const tick = (tracker, frame, steps = 1, stepMs = 1000) => {
  const events = [];
  for (let i = 0; i < steps; i++) {
    t += stepMs;
    events.push(...tracker.ingest(frame, t));
  }
  return events;
};

// ── 1. baseline: stable frames = no goals ────────────────────
{
  const tr = new ScoreTracker();
  const ev = tick(tr, blankFrame(), 15);
  assert.equal(ev.length, 0, 'stable scorebug must not fire');
  assert.equal(tr.scoreL + tr.scoreR, 0);
  console.log('PASS 1 · stable frames produce zero goals');
}

// ── 2. sustained change = exactly one goal ───────────────────
{
  const tr = new ScoreTracker();
  tick(tr, blankFrame(), 5); // establish reference
  const ev = tick(tr, goalFrame('L'), 6); // hold the new digit
  assert.equal(ev.length, 1, 'one sustained change = one goal');
  assert.equal(ev[0].type, 'goal-left');
  assert.equal(ev[0].scoreL, 1);
  assert.equal(tr.scoreL, 1);
  assert.equal(tr.scoreR, 0);
  // holding it longer must NOT double-count
  const ev2 = tick(tr, goalFrame('L'), 6, 4000);
  assert.equal(ev2.length, 0, 'settled new digit must not re-fire');
  console.log('PASS 2 · sustained digit change counts exactly one goal');
}

// ── 3. one-frame flicker (replay wipe) = no goal ─────────────
{
  const tr = new ScoreTracker();
  tick(tr, blankFrame(), 5);
  const ev = tick(tr, goalFrame('L'), 2); // brief flash below confirmTicks
  assert.equal(ev.length, 0);
  const ev2 = tick(tr, blankFrame(), 5); // back to normal
  assert.equal(ev2.length, 0);
  assert.equal(tr.scoreL + tr.scoreR, 0);
  console.log('PASS 3 · short flashes are ignored');
}

// ── 4. cooldown blocks unrealistically fast goals ────────────
{
  const tr = new ScoreTracker();
  tick(tr, blankFrame(), 5);
  const g1 = tick(tr, goalFrame('L'), 6);
  assert.equal(g1.length, 1);
  // right side flips just 5s later — inside the 20s cooldown
  const g2 = tick(tr, scoreFrame(1, 1), 6, 1000);
  assert.equal(g2.length, 0, 'goal inside cooldown rejected');
  // …but once 20s elapse and it stays changed, it must count
  const g3 = tick(tr, scoreFrame(1, 1), 25, 1000);
  assert.equal(g3.length, 1);
  assert.equal(tr.scoreR, 1);
  console.log('PASS 4 · 20s cooldown enforced, real goal counts after');
}

// ── 5. gradual lighting drift never trips the detector ───────
{
  const tr = new ScoreTracker();
  tick(tr, blankFrame(), 5);
  let ev = [];
  for (let b = 0; b <= 40; b += 4) {
    const f = blankFrame();
    for (let i = 0; i < f.data.length; i++) f.data[i] = 120 - b;
    ev = ev.concat(tick(tr, f, 2, 1000));
  }
  assert.equal(ev.length, 0, 'slow global drift must not fire');
  console.log('PASS 5 · lighting drift is absorbed by reference blending');
}

// ── 6. a second goal on the same side counts again ───────────
{
  const tr = new ScoreTracker({ cooldownMs: 2000 });
  tick(tr, scoreFrame(0, 0), 4);
  const a = tick(tr, scoreFrame(1, 0), 5);
  assert.equal(a.length, 1);
  // settle so the tracker adopts the new reference
  tick(tr, scoreFrame(1, 0), 6);
  const b = tick(tr, scoreFrame(2, 0), 5, 1000); // digit changes again
  assert.equal(b.length, 1, 'second flip on same side counts');
  assert.equal(tr.scoreL, 2);
  console.log('PASS 6 · repeat goals on one side keep counting');
}

// ── 7. low-level helpers behave ──────────────────────────────
{
  const f = blankFrame();
  const a = sampleRegion(f, DEFAULT_ROI_LEFT);
  assert.ok(a.length > 0);
  assert.equal(changedFraction(a, a, 48), 0);
  const b = a.map(() => 0);
  assert.equal(changedFraction(a, b, 48), 1);
  console.log('PASS 7 · sampleRegion / changedFraction sane');
}

console.log('\nALL WATCHER FRAME TESTS PASS');
