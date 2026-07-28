// ─────────────────────────────────────────────────────────────
// DB — SQLite (better-sqlite3, WAL). One file on disk, zero
// services to run. This is the whole "database cluster" — and
// at academy scale it is genuinely enough.
// ─────────────────────────────────────────────────────────────
const Database = require('better-sqlite3');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_PATH = process.env.PSA_DB || path.join(__dirname, '..', 'data', 'academy.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  handle TEXT NOT NULL,
  coach_id TEXT,
  platform TEXT,
  region TEXT,
  academy_id TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  gf INTEGER NOT NULL DEFAULT 0,
  ga INTEGER NOT NULL DEFAULT 0,
  mode TEXT,
  opp_style TEXT,
  pass_acc INTEGER,
  no_sprint INTEGER NOT NULL DEFAULT 0,
  mechanics_used INTEGER NOT NULL DEFAULT 0,
  led_at75 INTEGER,
  decisive TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  composure INTEGER,
  note TEXT,
  synced_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  UNIQUE (user_id, client_id)         -- idempotent sync: same match twice = skipped
);

CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  topic TEXT,
  seq INTEGER NOT NULL DEFAULT 0      -- per-channel message cursor
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text',
  text TEXT NOT NULL,
  at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  reactions TEXT,                     -- JSON: {"🔥":["handle1",...]}
  UNIQUE (channel_id, seq)
);

CREATE TABLE IF NOT EXISTS wallets (
  academy_id TEXT PRIMARY KEY,      -- keyed by Academy ID, survives token rotation
  credits INTEGER NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'free',
  plan_renews TEXT,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academy_id TEXT NOT NULL,
  delta INTEGER NOT NULL,           -- + top-up, − spend, 0 = plan change
  reason TEXT NOT NULL,
  ref TEXT,                         -- payment remark / receipt reference
  actor TEXT NOT NULL DEFAULT 'system',  -- who moved it ('founder' for key-gated moves)
  at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_messages_channel_seq ON messages(channel_id, seq);
CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_id, at);
CREATE INDEX IF NOT EXISTS idx_ledger_academy ON ledger(academy_id, at);
`);

// migrate older DBs (added THE MIND columns after first ship)
for (const stmt of [
  `ALTER TABLE matches ADD COLUMN composure INTEGER`,
  `ALTER TABLE matches ADD COLUMN note TEXT`,
]) {
  try { db.exec(stmt); } catch { /* column already exists */ }
}

// ── seed channels (the rooms the app mirrors live) ──────────
const seedChannel = db.prepare(`INSERT OR IGNORE INTO channels (slug, name, topic) VALUES (?, ?, ?)`);
seedChannel.run('dressing-room', 'THE DRESSING ROOM', 'GENERAL — THE WHOLE ACADEMY IN ONE ROOM');
seedChannel.run('match-receipts', 'MATCH RECEIPTS', 'POST YOUR DUBS — RECEIPTS ONLY');
seedChannel.run('the-lab', 'THE LAB', 'LOSSES GO HERE TO DIE — BRING NOTES');
// the pricing halls — founder-led: on JAN 1 the payment system splits by
// region; these rooms are where the community shapes the numbers
seedChannel.run('division-africa', 'DIVISION: AFRICA', 'PRICING HALL — CREDIT PACKS VS SUBS, THE FOUNDER LISTENS');
seedChannel.run('division-world', 'DIVISION: WORLDWIDE', 'PRICING HALL — THE SUBSCRIPTION DEBATE, THE FOUNDER LISTENS');

// the founder identity exists as a real row so founder broadcasts can
// reference it (posts come from the key-gated desk, never from a token)
db.prepare(
  `INSERT OR IGNORE INTO users (token, handle, coach_id, platform, region, academy_id) VALUES (?, ?, ?, ?, ?, ?)`
).run('founder-internal-not-a-login-token', 'FOUNDER', null, null, 'world', 'PSA-FOUNDER');
function founderUser() {
  return db.prepare(`SELECT * FROM users WHERE academy_id = 'PSA-FOUNDER'`).get();
}

// ── users ────────────────────────────────────────────────────
const qUserByToken = db.prepare(`SELECT * FROM users WHERE token = ?`);
const qInsertUser = db.prepare(
  `INSERT INTO users (token, handle, coach_id, platform, region, academy_id) VALUES (?, ?, ?, ?, ?, ?)`
);

function cleanHandle(raw) {
  const base = String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '')
    .slice(0, 14);
  return base || `PLAYER${crypto.randomInt(1000, 9999)}`;
}

function createGuest({ handle, coachId, platform, region }) {
  const token = crypto.randomBytes(24).toString('hex');
  const academyId = `PSA-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const clean = cleanHandle(handle);
  qInsertUser.run(token, clean, coachId || null, platform || null, region || null, academyId);
  return { token, user: qUserByToken.get(token) };
}

function userByToken(token) {
  return token ? qUserByToken.get(token) : undefined;
}

// ── matches ──────────────────────────────────────────────────
const qInsertMatch = db.prepare(`
  INSERT OR IGNORE INTO matches
    (user_id, client_id, at, gf, ga, mode, opp_style, pass_acc, no_sprint, mechanics_used, led_at75, decisive, source, composure, note)
  VALUES
    (@user_id, @client_id, @at, @gf, @ga, @mode, @opp_style, @pass_acc, @no_sprint, @mechanics_used, @led_at75, @decisive, @source, @composure, @note)
`);
const qMatches = db.prepare(`SELECT * FROM matches WHERE user_id = ? ORDER BY at DESC LIMIT 500`);

function syncMatches(userId, wireMatches) {
  let inserted = 0;
  const tx = db.transaction((rows) => {
    for (const m of rows) {
      const r = qInsertMatch.run({
        user_id: userId,
        client_id: String(m.clientId ?? m.client_id ?? ''),
        at: Number(m.at) || Date.now(),
        gf: intOr(m.gf, 0),
        ga: intOr(m.ga, 0),
        mode: m.mode ?? null,
        opp_style: m.oppStyle ?? m.opp_style ?? null,
        pass_acc: m.passAcc == null ? null : intOr(m.passAcc ?? m.pass_acc, null),
        no_sprint: (m.noSprint ?? m.no_sprint) ? 1 : 0,
        mechanics_used: intOr(m.mechanicsUsed ?? m.mechanics_used, 0),
        led_at75: (m.ledAt75 ?? m.led_at75) == null ? null : (m.ledAt75 ?? m.led_at75) ? 1 : 0,
        decisive: m.decisive ?? null,
        source: m.source === 'watcher' ? 'watcher' : 'manual',
        composure: m.composure == null ? null : intOr(m.composure, null),
        note: m.note ? String(m.note).slice(0, 140) : null,
      });
      if (r.changes > 0) inserted++;
    }
  });
  tx(wireMatches);
  return { inserted, skipped: wireMatches.length - inserted };
}
function intOr(v, d) {
  // better-sqlite3 rejects booleans — coerce defensively
  if (v === true) return 1;
  if (v === false) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : d;
}

function listMatches(userId) {
  return qMatches.all(userId).map((m) => ({ ...m, led_at75: m.led_at75 === null ? null : m.led_at75 ? 1 : 0 }));
}

// ── community ────────────────────────────────────────────────
const qChannel = db.prepare(`SELECT * FROM channels WHERE slug = ?`);
const qChannels = db.prepare(`SELECT * FROM channels ORDER BY id`);
const qBumpSeq = db.prepare(`UPDATE channels SET seq = seq + 1 WHERE id = ? RETURNING seq`);
const qInsertMsg = db.prepare(`
  INSERT INTO messages (channel_id, seq, user_id, handle, kind, text, at)
  VALUES (@channel_id, @seq, @user_id, @handle, @kind, @text, @at)
  RETURNING *
`);
const qMsgsAfter = db.prepare(`
  SELECT m.id, m.seq, m.kind, m.text, m.at, m.handle AS author, u.academy_id AS academyId, m.reactions
  FROM messages m JOIN users u ON u.id = m.user_id
  WHERE m.channel_id = ? AND m.seq > ?
  ORDER BY m.seq ASC LIMIT ?
`);
const qMsgById = db.prepare(`SELECT * FROM messages WHERE id = ? AND channel_id = ?`);

function postMessage(channelSlug, user, { kind = 'text', text }) {
  const ch = qChannel.get(channelSlug);
  if (!ch) return null;
  const clean = String(text ?? '').trim().slice(0, 500);
  if (!clean) return null;
  const tx = db.transaction(() => {
    const { seq } = qBumpSeq.get(ch.id);
    return qInsertMsg.get({ channel_id: ch.id, seq, user_id: user.id, handle: user.handle, kind, text: clean, at: Date.now() });
  });
  const row = tx();
  return { id: row.id, seq: row.seq, kind: row.kind, text: row.text, at: row.at, author: user.handle, academyId: user.academy_id, reactions: row.reactions };
}

function messagesAfter(channelSlug, afterSeq, limit = 50) {
  const ch = qChannel.get(channelSlug);
  if (!ch) return [];
  return qMsgsAfter.all(ch.id, Number(afterSeq) || 0, Math.min(Number(limit) || 50, 200));
}

function toggleReaction(channelSlug, messageId, user, emoji) {
  const ch = qChannel.get(channelSlug);
  if (!ch) return null;
  const msg = qMsgById.get(Number(messageId), ch.id);
  if (!msg) return null;
  const reactions = msg.reactions ? JSON.parse(msg.reactions) : {};
  const list = new Set(reactions[emoji] || []);
  if (list.has(user.handle)) list.delete(user.handle);
  else list.add(user.handle);
  if (list.size) reactions[emoji] = [...list];
  else delete reactions[emoji];
  const json = Object.keys(reactions).length ? JSON.stringify(reactions) : null;
  db.prepare(`UPDATE messages SET reactions = ? WHERE id = ?`).run(json, msg.id);
  return { id: msg.id, seq: msg.seq, reactions: json };
}

// ── the till (charge engine) — wallets + ledger. Money itself ──
// never touches this server: payments happen on the founder's own
// Paystack/Flutterwave links and land in HIS bank; this ledger is
// the academy's own book of credits, which he controls alone.
const qWallet = db.prepare(`SELECT * FROM wallets WHERE academy_id = ?`);
const qEnsureWallet = db.prepare(`INSERT OR IGNORE INTO wallets (academy_id) VALUES (?)`);
const qUserByAcademy = db.prepare(`SELECT * FROM users WHERE academy_id = ?`);
const qLedger = db.prepare(`SELECT * FROM ledger WHERE academy_id = ? ORDER BY at DESC, id DESC LIMIT ?`);
const clampAmount = (v) => Math.max(1, Math.min(100000, Math.round(Number(v) || 0)));

/** get-or-create a player's wallet */
function walletFor(academyId) {
  qEnsureWallet.run(academyId);
  return qWallet.get(academyId);
}

/** founder top-up: money confirmed in the bank → credits move here */
function topUp(academyId, deltaIn, reasonIn, refIn, actorIn = 'founder') {
  const user = qUserByAcademy.get(academyId);
  if (!user || academyId === 'PSA-FOUNDER') return null; // only real players hold wallets
  const delta = clampAmount(deltaIn);
  const reason = String(reasonIn || 'FOUNDER TOP-UP').slice(0, 60);
  const ref = refIn ? String(refIn).slice(0, 60) : null;
  const actor = String(actorIn).slice(0, 24);
  const tx = db.transaction(() => {
    qEnsureWallet.run(academyId);
    db.prepare(`UPDATE wallets SET credits = credits + ?, updated_at = ? WHERE academy_id = ?`).run(delta, Date.now(), academyId);
    db.prepare(`INSERT INTO ledger (academy_id, delta, reason, ref, actor, at) VALUES (?,?,?,?,?,?)`).run(academyId, delta, reason, ref, actor, Date.now());
    return qWallet.get(academyId);
  });
  return tx();
}

/** WORLD track: mark a player PRO (or back to free) after a sub payment */
function activatePlan(academyId, planIn, renewsIn, actorIn = 'founder') {
  const user = qUserByAcademy.get(academyId);
  if (!user || academyId === 'PSA-FOUNDER') return null;
  const plan = planIn === 'pro' ? 'pro' : 'free';
  const renews = renewsIn ? String(renewsIn).slice(0, 40) : null;
  const actor = String(actorIn).slice(0, 24);
  const tx = db.transaction(() => {
    qEnsureWallet.run(academyId);
    db.prepare(`UPDATE wallets SET plan = ?, plan_renews = ?, updated_at = ? WHERE academy_id = ?`).run(plan, renews, Date.now(), academyId);
    db.prepare(`INSERT INTO ledger (academy_id, delta, reason, ref, actor, at) VALUES (?,?,?,?,?,?)`)
      .run(academyId, 0, `PLAN → ${plan.toUpperCase()}`, renews, actor, Date.now());
    return qWallet.get(academyId);
  });
  return tx();
}

/** spend: atomic check-and-debit; returns null when credits run short */
function spendFor(user, amountIn, reasonIn) {
  const amount = clampAmount(amountIn);
  const reason = String(reasonIn || 'ACADEMY SPEND').slice(0, 60);
  const tx = db.transaction(() => {
    qEnsureWallet.run(user.academy_id);
    const w = qWallet.get(user.academy_id);
    if (w.credits < amount) return { ok: false, credits: w.credits };
    db.prepare(`UPDATE wallets SET credits = credits - ?, updated_at = ? WHERE academy_id = ?`).run(amount, Date.now(), user.academy_id);
    db.prepare(`INSERT INTO ledger (academy_id, delta, reason, ref, actor, at) VALUES (?,?,?,?,?,?)`)
      .run(user.academy_id, -amount, reason, null, user.handle, Date.now());
    return { ok: true, credits: w.credits - amount };
  });
  return tx();
}

function ledgerFor(academyId, limit = 20) {
  return qLedger.all(academyId, Math.min(Number(limit) || 20, 100));
}

function tillSummary() {
  const wallets = db.prepare(`SELECT COUNT(*) AS n FROM wallets WHERE academy_id != 'PSA-FOUNDER'`).get().n;
  const creditsOut = db.prepare(`SELECT COALESCE(SUM(credits),0) AS n FROM wallets WHERE academy_id != 'PSA-FOUNDER'`).get().n;
  const proSubs = db.prepare(`SELECT COUNT(*) AS n FROM wallets WHERE plan = 'pro'`).get().n;
  const recentLedger = db.prepare(`SELECT * FROM ledger ORDER BY at DESC, id DESC LIMIT 8`).all();
  return { wallets, creditsOut, proSubs, recentLedger };
}

// ── admin rollup ─────────────────────────────────────────────
function adminSummary() {
  const users = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE academy_id != 'PSA-FOUNDER'`).get().n;
  const matches = db.prepare(`SELECT COUNT(*) AS n FROM matches`).get().n;
  const watcherMatches = db.prepare(`SELECT COUNT(*) AS n FROM matches WHERE source = 'watcher'`).get().n;
  const messages = db.prepare(`SELECT COUNT(*) AS n FROM messages`).get().n;
  const weekAgo = Date.now() - 7 * 86400000;
  const matchesThisWeek = db.prepare(`SELECT COUNT(*) AS n FROM matches WHERE at > ?`).get(weekAgo).n;
  // who the academy is made of — the JAN 1 payment split runs on this
  const regions = { africa: 0, world: 0, unset: 0 };
  for (const r of db.prepare(`SELECT region, COUNT(*) AS n FROM users WHERE academy_id != 'PSA-FOUNDER' GROUP BY region`).all()) {
    if (r.region === 'africa' || r.region === 'world') regions[r.region] = r.n;
    else regions.unset += r.n;
  }
  const coaches = db.prepare(`SELECT coach_id AS coach, COUNT(*) AS n FROM users WHERE academy_id != 'PSA-FOUNDER' GROUP BY coach_id`).all();
  const topScorersWeek = db.prepare(`
    SELECT u.handle, SUM(m.gf) AS goals, COUNT(*) AS played
    FROM matches m JOIN users u ON u.id = m.user_id
    WHERE m.at > ?
    GROUP BY m.user_id ORDER BY goals DESC LIMIT 5
  `).all(weekAgo);
  const recentMatches = db.prepare(`
    SELECT u.handle, m.gf, m.ga, m.mode, m.source, m.composure, m.note, m.at
    FROM matches m JOIN users u ON u.id = m.user_id
    ORDER BY m.at DESC LIMIT 10
  `).all();
  return { users, matches, watcherMatches, messages, matchesThisWeek, regions, coaches, topScorersWeek, recentMatches, till: tillSummary(), generatedAt: Date.now() };
}

module.exports = { db, createGuest, userByToken, founderUser, syncMatches, listMatches, qChannels: () => qChannels.all(), qChannel: (s) => qChannel.get(s), postMessage, messagesAfter, toggleReaction, adminSummary, walletFor, topUp, activatePlan, spendFor, ledgerFor, tillSummary };
