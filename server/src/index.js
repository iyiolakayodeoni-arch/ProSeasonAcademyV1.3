// ─────────────────────────────────────────────────────────────
// PROSEASONACADEMY SERVER — your own backend. No frameworks,
// no paid services: node:http + SQLite + ws. ₦0 forever.
//
//   REST  /auth/guest · /me · /matches/sync · /matches
//         /community/channels · /community/:slug/messages · /react
//         /admin/summary · /admin (dashboard, key-gated)
//   WS    /ws?token=   live rooms (join/message/react/typing/presence)
// ─────────────────────────────────────────────────────────────
const http = require('node:http');
const db = require('./db');
const realtime = require('./realtime');
const products = require('./products');

const PORT = Number(process.env.PORT) || 8788;
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me-in-production';

// THE TILL'S OPENING DAY — one env var, one switch. Before this moment the
// store shows prices and takes founder top-ups (stocking the shelves) but
// nothing can be spent or bought; after it, the charge engine is live.
// Set GO_LIVE to any past ISO date to open the till immediately.
const GO_LIVE = process.env.GO_LIVE || '2027-01-01T00:00:00Z';
const tillLive = () => Date.now() >= Date.parse(GO_LIVE);

// ── tiny http toolkit ────────────────────────────────────────
function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization, x-admin-key',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
  });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
    });
  });
}
function auth(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  return db.userByToken(token);
}
function publicUser(u) {
  return { id: u.id, handle: u.handle, academyId: u.academy_id, coachId: u.coach_id, platform: u.platform, region: u.region };
}
function adminGate(req, url, res) {
  const key = req.headers['x-admin-key'] || url.searchParams.get('key');
  if (key !== ADMIN_KEY) {
    json(res, 403, { ok: false, error: 'admin key required' });
    return false;
  }
  return true;
}

// live fan-out for REST-posted messages (bound once below)
let live = { broadcastMessage: () => {}, broadcastReaction: () => {} };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;
  try {
    if (req.method === 'OPTIONS') return json(res, 204, {});

    // ── health ──
    if (path === '/health') return json(res, 200, { ok: true, at: Date.now() });

    // ── auth ──
    if (path === '/auth/guest' && req.method === 'POST') {
      const body = await readBody(req);
      try {
        const { token, user } = db.createGuest(body);
        return json(res, 200, { token, user: publicUser(user), seats: db.seasonSeats() });
      } catch (e) {
        // SEASON gate — same 409 contract as the Supabase edge function,
        // so the app's SEASON FULL panel works on either backend.
        if (e && e.code === 'SEASON_FULL') {
          const s = e.seats || db.seasonSeats();
          return json(res, 409, {
            ok: false, error: 'SEASON_FULL',
            season: s.season, cap: s.cap, taken: s.taken,
          });
        }
        throw e;
      }
    }
    // seat report — public, so the app can show "N seats left"
    if (path === '/season/seats' && req.method === 'GET') {
      return json(res, 200, db.seasonSeats());
    }
    if (path === '/me' && req.method === 'GET') {
      const user = auth(req);
      if (!user) return json(res, 401, { ok: false, error: 'auth required' });
      return json(res, 200, { user: publicUser(user) });
    }

    // ── match vault sync ──
    if (path === '/matches/sync' && req.method === 'POST') {
      const user = auth(req);
      if (!user) return json(res, 401, { ok: false, error: 'auth required' });
      const body = await readBody(req);
      const matches = Array.isArray(body.matches) ? body.matches.slice(0, 500) : [];
      const r = db.syncMatches(user.id, matches);
      return json(res, 200, { ok: true, ...r });
    }
    if (path === '/matches' && req.method === 'GET') {
      const user = auth(req);
      if (!user) return json(res, 401, { ok: false, error: 'auth required' });
      return json(res, 200, { matches: db.listMatches(user.id) });
    }

    // ── community ──
    if (path === '/community/channels' && req.method === 'GET') {
      const user = auth(req);
      if (!user) return json(res, 401, { ok: false, error: 'auth required' });
      return json(res, 200, { channels: db.qChannels() });
    }
    const m = path.match(/^\/community\/([a-z0-9-]+)\/(messages|react)$/);
    if (m) {
      const user = auth(req);
      if (!user) return json(res, 401, { ok: false, error: 'auth required' });
      const [, slug, action] = m;
      if (action === 'messages' && req.method === 'GET') {
        return json(res, 200, { messages: db.messagesAfter(slug, url.searchParams.get('after'), url.searchParams.get('limit')) });
      }
      if (action === 'messages' && req.method === 'POST') {
        const body = await readBody(req);
        const saved = db.postMessage(slug, user, { kind: 'text', text: body.text });
        if (!saved) return json(res, 400, { ok: false, error: 'empty or unknown room' });
        live.broadcastMessage(slug, saved); // REST posts fan out to sockets too
        return json(res, 200, { ok: true, message: saved });
      }
      if (action === 'react' && req.method === 'POST') {
        const body = await readBody(req);
        const r = db.toggleReaction(slug, body.messageId, user, String(body.emoji || '').slice(0, 8));
        if (!r) return json(res, 400, { ok: false, error: 'unknown message' });
        live.broadcastReaction(slug, r);
        return json(res, 200, { ok: true, ...r });
      }
    }

    // ── founder broadcast (key-gated) — the founder posts into any room;
    //    the message wears the FOUNDER badge and fans out live ──
    const f = path.match(/^\/community\/([a-z0-9-]+)\/founder$/);
    if (f && req.method === 'POST') {
      if (!adminGate(req, url, res)) return;
      const [, slug] = f;
      const body = await readBody(req);
      // founder messages are authored by a seeded identity so they never
      // depend on one phone being online or hold a login token
      const founder = db.founderUser();
      if (!founder) return json(res, 500, { ok: false, error: 'founder identity missing' });
      const saved = db.postMessage(slug, founder, { kind: 'founder', text: body.text });
      if (!saved) return json(res, 400, { ok: false, error: 'empty or unknown room' });
      live.broadcastMessage(slug, saved);
      return json(res, 200, { ok: true, message: saved });
    }

    // ── the till (charge engine) — catalog is public, wallets are ──
    //    private to their owner, and EVERY money move is founder-keyed.
    //    No card details ever touch this server: paying happens on the
    //    founder's own payment links; this is the book of credits.
    if (path === '/store/catalog' && req.method === 'GET') {
      const user = auth(req); // optional — the app sends it when signed in
      const region = url.searchParams.get('region') || (user && user.region) || 'unset';
      return json(res, 200, { live: tillLive(), goLive: GO_LIVE, region, products: products.catalog() });
    }
    if (path === '/store/balance' && req.method === 'GET') {
      const user = auth(req);
      if (!user) return json(res, 401, { ok: false, error: 'auth required' });
      const w = db.walletFor(user.academy_id);
      return json(res, 200, {
        live: tillLive(),
        goLive: GO_LIVE,
        academyId: user.academy_id,
        credits: w.credits,
        plan: w.plan,
        planRenews: w.plan_renews,
        ledger: db.ledgerFor(user.academy_id, 20),
      });
    }
    if (path === '/store/spend' && req.method === 'POST') {
      const user = auth(req);
      if (!user) return json(res, 401, { ok: false, error: 'auth required' });
      if (!tillLive()) return json(res, 403, { ok: false, error: 'STORE_NOT_LIVE', goLive: GO_LIVE });
      const body = await readBody(req);
      const r = db.spendFor(user, body.amount, body.reason);
      if (!r.ok) return json(res, 402, { ok: false, error: 'INSUFFICIENT_CREDITS', credits: r.credits });
      return json(res, 200, { ok: true, credits: r.credits });
    }
    if (path === '/store/topup' && req.method === 'POST') {
      if (!adminGate(req, url, res)) return;
      const body = await readBody(req);
      const w = db.topUp(String(body.academyId || '').toUpperCase().trim(), body.credits, body.reason, body.ref);
      if (!w) return json(res, 404, { ok: false, error: 'unknown academy id' });
      return json(res, 200, { ok: true, academyId: w.academy_id, balance: w.credits });
    }
    if (path === '/store/subscribe' && req.method === 'POST') {
      if (!adminGate(req, url, res)) return;
      const body = await readBody(req);
      const w = db.activatePlan(String(body.academyId || '').toUpperCase().trim(), body.plan, body.renews);
      if (!w) return json(res, 404, { ok: false, error: 'unknown academy id' });
      return json(res, 200, { ok: true, academyId: w.academy_id, plan: w.plan, planRenews: w.plan_renews });
    }

    // ── admin (key-gated) ──
    if (path === '/admin/summary' && req.method === 'GET') {
      if (!adminGate(req, url, res)) return;
      return json(res, 200, { ...db.adminSummary(), tillLive: tillLive(), goLive: GO_LIVE });
    }
    if (path === '/admin' && req.method === 'GET') {
      if (!adminGate(req, url, res)) return;
      const s = db.adminSummary();
      const esc = (x) => String(x ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      const rows = s.recentMatches.map((m2) =>
        `<tr><td>${esc(m2.handle)}</td><td>${m2.gf}–${m2.ga}</td><td>${esc(m2.mode)}</td><td>${esc(m2.source)}</td>` +
        `<td>${m2.composure ?? '—'}</td><td>${esc(m2.note || '—')}</td>` +
        `<td>${new Date(m2.at).toLocaleString('en-GB')}</td></tr>`
      ).join('');
      const top = s.topScorersWeek.map((t) => `<li>${esc(t.handle)} — ${t.goals} goals in ${t.played}</li>`).join('');
      const tillRows = s.till.recentLedger.map((l) =>
        `<tr><td>${esc(l.academy_id)}</td><td>${l.delta > 0 ? '+' : ''}${l.delta}</td><td>${esc(l.reason)}</td>` +
        `<td>${esc(l.ref || '—')}</td><td>${esc(l.actor)}</td><td>${new Date(l.at).toLocaleString('en-GB')}</td></tr>`
      ).join('');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><meta charset="utf-8"><title>PSA ADMIN</title>
<body style="background:#0a0f0a;color:#eef2ec;font-family:monospace;padding:32px;max-width:960px;margin:auto">
<h1 style="color:#39FF6A">PROSEASONACADEMY · ADMIN DESK</h1>
<p>players <b>${s.users}</b> · matches <b>${s.matches}</b> · messages <b>${s.messages}</b> · matches this week <b>${s.matchesThisWeek}</b></p>
<p style="color:#f2c078">JAN 1 SPLIT → AFRICA (credits): <b>${s.regions.africa}</b> · WORLD (subscription): <b>${s.regions.world}</b> · region unset: <b>${s.regions.unset}</b></p>
<p style="color:#f2c078">TILL → wallets <b>${s.till.wallets}</b> · credits in players' hands <b>${s.till.creditsOut}</b> · PRO subs <b>${s.till.proSubs}</b> · store <b>${tillLive() ? 'OPEN' : 'OPENS ' + esc(GO_LIVE.slice(0, 10))}</b></p>
<h2 style="color:#f2c078">TOP SCORERS — 7 DAYS</h2><ul>${top || '<li>none yet</li>'}</ul>
<h2 style="color:#f2c078">RECENT VAULT</h2>
<table style="width:100%;border-collapse:collapse;font-size:12px">
<tr style="color:#8fb89b;text-align:left"><th>player</th><th>score</th><th>mode</th><th>source</th><th>head</th><th>their line</th><th>when</th></tr>
${rows || '<tr><td colspan=7>nothing logged yet</td></tr>'}</table>
<h2 style="color:#f2c078">RECENT TILL MOVEMENTS</h2>
<table style="width:100%;border-collapse:collapse;font-size:12px">
<tr style="color:#8fb89b;text-align:left"><th>academy id</th><th>±</th><th>reason</th><th>ref</th><th>by</th><th>when</th></tr>
${tillRows || '<tr><td colspan=6>till is quiet — no movements yet</td></tr>'}</table>
<p style="color:#8fb89b">generated ${new Date(s.generatedAt).toLocaleString('en-GB')} · key-gated · keep the URL secret</p>
</body>`);
    }

    return json(res, 404, { ok: false, error: 'not found' });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e && e.message || e) });
  }
});

// live rooms; REST-posted messages fan out through the same broadcast
live = realtime.attach(server, {
  userByToken: db.userByToken,
  toggleReaction: db.toggleReaction,
  /** persist a WS-posted message through the same path as REST */
  broadcastPersisted: (user, slug, text) => db.postMessage(slug, user, { kind: 'text', text }),
});

module.exports = server;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`[psa-server] listening on :${PORT}`);
    console.log(`[psa-server] admin desk → http://localhost:${PORT}/admin?key=${ADMIN_KEY}`);
  });
}
