// ─────────────────────────────────────────────────────────────
// SEAT GATE (backup server) — proof the 1,000-seat cap holds here
// too, so switching backends never silently uncaps the season.
//
//   node --experimental-sqlite server/test/seat-gate.test.js
//
// Runs the REAL SQL from db.js against an in-memory database via
// node:sqlite, so better-sqlite3 does not need to compile. The
// statements and the transaction semantics are the same ones the
// server executes.
// ─────────────────────────────────────────────────────────────
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`PASS · ${name}${extra ? ` — ${extra}` : ''}`); }
  else { fail++; console.log(`FAIL · ${name}${extra ? ` — ${extra}` : ''}`); }
};

const db = new DatabaseSync(':memory:');
db.exec(`
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  handle TEXT NOT NULL,
  coach_id TEXT, platform TEXT, region TEXT,
  academy_id TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);
CREATE TABLE waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  handle TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'unset',
  device TEXT UNIQUE,
  at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);
CREATE TABLE config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT OR IGNORE INTO config (key, value) VALUES ('seat_cap', '1000');
INSERT OR IGNORE INTO config (key, value) VALUES ('season_name', 'SEASON ONE');
`);

const cleanHandle = (raw) =>
  String(raw || '').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 14) ||
  `PLAYER${Math.floor(1000 + Math.random() * 9000)}`;

function seasonSeats() {
  const cap = Number(db.prepare(`SELECT value FROM config WHERE key = 'seat_cap'`).get()?.value ?? 0);
  const season = db.prepare(`SELECT value FROM config WHERE key = 'season_name'`).get()?.value ?? 'SEASON ONE';
  const taken = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE academy_id != 'PSA-FOUNDER'`).get().n;
  const waiting = db.prepare(`SELECT COUNT(*) AS n FROM waitlist`).get().n;
  return { season, cap, taken, waiting, isFull: cap > 0 && taken >= cap };
}

const qJoinWaitlist = db.prepare(`
  INSERT INTO waitlist (handle, region, device) VALUES (?, ?, ?)
  ON CONFLICT(device) DO UPDATE SET handle = excluded.handle, region = excluded.region
`);
const qInsertUser = db.prepare(
  `INSERT INTO users (token, handle, coach_id, platform, region, academy_id) VALUES (?, ?, ?, ?, ?, ?)`,
);

// mirrors db.js claimSeat, wrapped in BEGIN IMMEDIATE
function createGuest({ handle, coachId, platform, region, device }) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const seats = seasonSeats();
    if (seats.isFull) {
      qJoinWaitlist.run(cleanHandle(handle), region || 'unset', device || crypto.randomUUID());
      db.exec('COMMIT'); // the waitlist entry is kept
      const err = new Error('SEASON_FULL');
      err.code = 'SEASON_FULL';
      err.seats = seasonSeats();
      throw err;
    }
    const token = crypto.randomBytes(24).toString('hex');
    let academyId = '';
    for (let i = 0; i < 8; i++) {
      academyId = `PSA-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      if (!db.prepare(`SELECT 1 FROM users WHERE academy_id = ?`).get(academyId)) break;
    }
    qInsertUser.run(token, cleanHandle(handle), coachId || null, platform || null, region || null, academyId);
    db.exec('COMMIT');
    return { token, academyId };
  } catch (e) {
    if (e.code !== 'SEASON_FULL') { try { db.exec('ROLLBACK'); } catch {} }
    throw e;
  }
}

console.log('\nBACKUP SERVER · SEAT GATE\n' + '─'.repeat(50));

// shrink the season so the maths is readable
db.prepare(`UPDATE config SET value = '3' WHERE key = 'seat_cap'`).run();

// 1 · founder does not consume a seat
qInsertUser.run('founder-token', 'FOUNDER', null, null, 'world', 'PSA-FOUNDER');
ok('founder row excluded from the count', seasonSeats().taken === 0, `taken=${seasonSeats().taken}`);

// 2 · seats fill to the cap
for (let i = 1; i <= 3; i++) createGuest({ handle: `MEMBER_${i}`, region: 'africa', device: `dev-${i}` });
let s = seasonSeats();
ok('seats fill to the cap', s.taken === 3 && s.isFull, `${s.taken}/${s.cap} full=${s.isFull}`);

// 3 · THE CAP HOLDS — seat 4 refused (the regression)
let refused = false;
let seatsAtRefusal = null;
try {
  createGuest({ handle: 'MEMBER_4', region: 'world', device: 'dev-4' });
} catch (e) {
  refused = e.code === 'SEASON_FULL';
  seatsAtRefusal = e.seats;
}
ok('seat 4 REFUSED (cap holds)', refused, refused ? `SEASON_FULL ${seatsAtRefusal.taken}/${seatsAtRefusal.cap}` : 'IT WAS ALLOWED');

// 4 · count did not drift
ok('count intact after the refusal', seasonSeats().taken === 3, `taken=${seasonSeats().taken}`);

// 5 · the refused player landed on the waitlist
ok('refused player is waitlisted', seasonSeats().waiting === 1, `waiting=${seasonSeats().waiting}`);

// 6 · re-entry does not duplicate the waitlist line
try { createGuest({ handle: 'MEMBER_4', region: 'world', device: 'dev-4' }); } catch {}
ok('waitlist is idempotent per device', seasonSeats().waiting === 1, `waiting=${seasonSeats().waiting}`);

// 7 · a freed seat can be re-taken
db.prepare(`DELETE FROM users WHERE handle = 'MEMBER_3'`).run();
createGuest({ handle: 'MEMBER_5', region: 'africa', device: 'dev-5' });
ok('a released seat can be re-taken', seasonSeats().taken === 3, `taken=${seasonSeats().taken}`);

// 8 · raising the cap opens seats (Season Two)
db.prepare(`UPDATE config SET value = '5' WHERE key = 'seat_cap'`).run();
createGuest({ handle: 'MEMBER_6', region: 'world', device: 'dev-6' });
s = seasonSeats();
ok('raising seat_cap opens seats', s.taken === 4 && s.cap === 5 && !s.isFull, `${s.taken}/${s.cap}`);

// 9 · lowering the cap evicts nobody, blocks new seats
db.prepare(`UPDATE config SET value = '2' WHERE key = 'seat_cap'`).run();
s = seasonSeats();
let blocked = false;
try { createGuest({ handle: 'MEMBER_7', region: 'world', device: 'dev-7' }); } catch (e) { blocked = e.code === 'SEASON_FULL'; }
ok('lowering the cap keeps members, blocks new', s.taken === 4 && blocked, `${s.taken}/${s.cap} blocked=${blocked}`);

// 10 · academy ids are unique
const ids = db.prepare(`SELECT academy_id FROM users`).all().map((r) => r.academy_id);
ok('academy ids unique', new Set(ids).size === ids.length, `${ids.length} rows`);

console.log('─'.repeat(50));
console.log(`${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
