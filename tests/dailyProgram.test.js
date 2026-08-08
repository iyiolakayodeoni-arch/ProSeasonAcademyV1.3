// Pure-node unit tests for the DAILY PROGRAM — the simple 6-month tracker.
// Run: node tests/dailyProgram.test.js
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const root = path.join(__dirname, '..');

execSync(
  `npx tsc --ignoreConfig src/data/dailyProgram.ts tests/test-env.d.ts --outDir tests/.build --module commonjs --target es2019 --skipLibCheck --esModuleInterop --moduleResolution node --ignoreDeprecations 6.0 --types node`,
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

const D = require('./.build/dailyProgram.js');

function prog(daysDone = [], startedAt = 1000, pausedMs = 0) {
  const days = Array.from({ length: D.TOTAL_DAYS }, (_, i) => ({
    day: i + 1,
    sealedAt: daysDone.includes(i + 1) ? startedAt + (i + 1) * 1000 : null,
  }));
  return { startedAt, days, paused: false, pausedAt: null, pausedMs };
}

async function main() {
  assert.equal(D.TOTAL_DAYS, 180, 'six months of thirty days = 180');
  assert.equal(D.MONTHS, 6, 'six months');
  assert.equal(D.monthOf(1), 1, 'day 1 is month 1');
  assert.equal(D.monthOf(30), 1, 'day 30 is month 1');
  assert.equal(D.monthOf(31), 2, 'day 31 is month 2');
  assert.equal(D.monthOf(180), 6, 'day 180 is month 6');
  console.log('PASS 0 · program is 180 days across 6 months of 30');

  // T1 · day 1 is unlocked immediately, later days are future
  const p0 = prog();
  assert.equal(D.currentDay(p0), 1, 'starts on day 1');
  assert.equal(D.isUnlocked(p0, 1, 2000), true, 'day 1 is open');
  assert.equal(D.status(p0, 1), 'current', 'day 1 is current');
  assert.equal(D.status(p0, 2), 'future', 'day 2 is future');
  assert.equal(D.isComplete(p0), false, 'not complete');
  console.log('PASS 1 · day 1 opens immediately; the rest stay hidden');

  // T2 · sealing day 1 starts a 24h hard lock before day 2
  const sealAt = 10_000;
  const p1 = { ...prog(), days: prog().days.map((d) => (d.day === 1 ? { ...d, sealedAt: sealAt } : d)) };
  assert.equal(D.currentDay(p1), 2, 'after day 1, day 2 is current');
  assert.equal(D.isUnlocked(p1, 2, sealAt + D.COOLDOWN_MS - 1000), false, 'day 2 still locked before 24h');
  assert.equal(D.isUnlocked(p1, 2, sealAt + D.COOLDOWN_MS), true, 'day 2 opens at exactly 24h');
  assert.equal(D.unlockAt(p1, 2), sealAt + D.COOLDOWN_MS, 'unlock time = seal + 24h');
  console.log('PASS 2 · a hard 24h lock sits between days');

  // T3 · pause freezes the countdown
  const p2 = { ...p1 };
  const pauseAt = sealAt + 1000; // 1s into the wait
  const paused = D.pauseProgram({ ...p2, paused: false, pausedAt: null }, pauseAt);
  // while paused, remaining is frozen at pauseAt
  const frozenRemaining = D.remainingMs(paused, 2, sealAt + D.COOLDOWN_MS - 1);
  assert.equal(frozenRemaining, D.unlockAt(paused, 2) - pauseAt, 'clock frozen at pause moment');
  // after a long pause, resume stretches the unlock
  const resumed = D.resumeProgram(paused, pauseAt + 50_000); // 50s away
  assert.equal(resumed.paused, false, 'resumed');
  assert.equal(resumed.pausedMs, 50_000, 'paused time banked');
  assert.equal(D.unlockAt(resumed, 2), sealAt + D.COOLDOWN_MS + 50_000, 'unlock stretched by pause');
  console.log('PASS 3 · pause freezes the 24h clock and resumes without pressure');

  // T4 · one day at a time — only the current day is ever 'current'
  const p3 = prog([1, 2, 3], 1000);
  assert.equal(D.currentDay(p3), 4, 'current is day 4 after 1-3 sealed');
  assert.equal(D.status(p3, 1), 'done');
  assert.equal(D.status(p3, 2), 'done');
  assert.equal(D.status(p3, 3), 'done');
  assert.equal(D.status(p3, 4), 'current');
  assert.equal(D.status(p3, 5), 'future');
  assert.equal(D.doneCount(p3), 3, 'three done');
  assert.equal(D.daysLeft(p3), D.TOTAL_DAYS - 3, 'days left correct');
  console.log('PASS 4 · only one day is ever shown as current');

  // T5 · the program completes only after all 180 days
  const all = prog(Array.from({ length: D.TOTAL_DAYS }, (_, i) => i + 1));
  assert.equal(D.isComplete(all), true, 'complete after 180 days');
  assert.equal(D.currentDay(all), D.TOTAL_DAYS + 1, 'no current day when complete');
  assert.equal(D.daysLeft(all), 0, 'no days left');
  console.log('PASS 5 · completes after all 180 days');

  // T6 · every day carries a light card (line + task)
  for (const day of [1, 2, 15, 40, 100, 180]) {
    const c = D.dailyContent(day);
    assert.ok(c.line && c.line.length > 0, `day ${day} has a line`);
    assert.ok(c.task && c.task.length > 0, `day ${day} has a task`);
  }
  assert.ok(D.dailyContent(1).line.toLowerCase().includes('side hustle'), 'day 1 is warm + personal');
  console.log('PASS 6 · every day carries a light coach line + task');

  await D.resetDailyProgramForDev();
  console.log('\nALL DAILY PROGRAM TESTS PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
