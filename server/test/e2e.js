// E2E — boots the real server on a scratch DB and walks the full
// stack: guest auth, idempotent vault sync, WS live rooms, reactions,
// admin gate. Run: npm test
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const WebSocket = require('ws');

const PORT = 8899;
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN = 'test-admin-key';
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'psa-e2e-'));

async function j(method, p, { token, body, headers } = {}) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const srv = spawn(process.execPath, ['src/index.js'], {
    env: { ...process.env, PORT: String(PORT), ADMIN_KEY: ADMIN, PSA_DB: path.join(scratch, 't.db') },
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  process.on('exit', () => { try { srv.kill(); } catch { /* noop */ } try { globalThis.__srv2?.kill(); } catch { /* noop */ } });
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) break;
    } catch { /* retry */ }
    await wait(120);
  }
  console.log('server up');

  // ── 1. guest auth ──
  const a = await j('POST', '/auth/guest', { body: { handle: 'e2e!! alpha', coachId: 'chinedu', region: 'africa' } });
  assert.equal(a.status, 200);
  assert.ok(a.body.token);
  assert.ok(/^[A-Z0-9_]{1,14}$/.test(a.body.user.handle), 'handle cleaned');
  assert.ok(a.body.user.academyId.startsWith('PSA-'));
  const b = await j('POST', '/auth/guest', { body: { handle: 'beta' } });
  const me = await j('GET', '/me', { token: a.body.token });
  assert.equal(me.body.user.handle, a.body.user.handle);
  console.log('✓ guest auth (2 users)');

  // ── 2. match vault sync: idempotent upserts (incl. booleans + MIND) ──
  const m1 = { clientId: 'Mtest1', at: Date.now(), gf: 3, ga: 1, mode: 'RANKED', source: 'manual', composure: 4, note: 'STAYED CALM AFTER EQUALIZER', ledAt75: true, noSprint: true };
  const m2 = { clientId: 'Mtest2', at: Date.now() - 3.6e6, gf: 0, ga: 2, mode: 'H2H', ledAt75: null, noSprint: false };
  const s1 = await j('POST', '/matches/sync', { token: a.body.token, body: { matches: [m1, m2] } });
  assert.deepEqual({ inserted: s1.body.inserted, skipped: s1.body.skipped }, { inserted: 2, skipped: 0 });
  const s2 = await j('POST', '/matches/sync', { token: a.body.token, body: { matches: [m1, m2] } });
  assert.deepEqual({ inserted: s2.body.inserted, skipped: s2.body.skipped }, { inserted: 0, skipped: 2 }, 'dup sync skipped');
  const list = await j('GET', '/matches', { token: a.body.token });
  assert.equal(list.body.matches.length, 2);
  const logged = list.body.matches.find((m) => m.client_id === 'Mtest1');
  assert.equal(logged.source, 'manual');
  assert.equal(logged.composure, 4);
  assert.equal(logged.note, 'STAYED CALM AFTER EQUALIZER');
  assert.equal(logged.led_at75, 1);
  assert.equal(logged.no_sprint, 1);
  console.log('✓ match vault sync (idempotent upserts + manual console fields + bool coercion)');

  // ── 3. community realtime: WS join → live message → cursor history ──
  const chans = await j('GET', '/community/channels', { token: a.body.token });
  assert.ok(chans.body.channels.find((c) => c.slug === 'dressing-room'));

  const wsA = new WebSocket(`ws://127.0.0.1:${PORT}/ws?token=${a.body.token}`);
  const wsB = new WebSocket(`ws://127.0.0.1:${PORT}/ws?token=${b.body.token}`);
  const seen = [];
  wsB.on('message', (raw) => seen.push(JSON.parse(String(raw))));
  await Promise.all([
    new Promise((r) => wsA.on('open', r)),
    new Promise((r) => wsB.on('open', r)),
  ]);
  wsA.send(JSON.stringify({ type: 'join', channel: 'dressing-room' }));
  await wait(80);
  wsB.send(JSON.stringify({ type: 'join', channel: 'dressing-room' }));
  await wait(150);
  assert.ok(seen.some((e) => e.type === 'presence' && e.users.length >= 2), 'presence shows both');
  wsA.send(JSON.stringify({ type: 'message', channel: 'dressing-room', text: 'first live ping' }));
  await wait(200);
  const liveMsg = seen.find((e) => e.type === 'message' && e.message?.text === 'first live ping');
  assert.ok(liveMsg, 'B received A live');
  assert.equal(liveMsg.message.author, a.body.user.handle);
  // REST post also fans out
  await j('POST', '/community/dressing-room/messages', { token: b.body.token, body: { text: 'REST fan-out check' } });
  await wait(200);
  assert.ok(seen.some((e) => e.type === 'message' && e.message?.text === 'REST fan-out check'), 'REST → WS fan-out');
  // cursor history
  const hist = await j('GET', '/community/dressing-room/messages?after=0&limit=10', { token: b.body.token });
  assert.equal(hist.body.messages.length, 2);
  assert.ok(hist.body.messages[0].seq < hist.body.messages[1].seq);
  const hist2 = await j('GET', `/community/dressing-room/messages?after=${hist.body.messages[0].seq}&limit=10`, { token: b.body.token });
  assert.equal(hist2.body.messages.length, 1, 'cursor respected');
  console.log('✓ community realtime (WS join → live message → cursor history)');

  // ── 4. reactions ──
  const react = await j('POST', '/community/dressing-room/react', {
    token: a.body.token,
    body: { messageId: liveMsg.message.id, emoji: '🔥' },
  });
  assert.equal(react.status, 200);
  assert.ok(String(react.body.reactions).includes(a.body.user.handle));
  await wait(150);
  assert.ok(seen.some((e) => e.type === 'reaction' && e.messageId === liveMsg.message.id), 'reaction broadcast');
  console.log('✓ reactions');

  // ── 5. admin rollup (key-gated) ──
  const denied = await j('GET', '/admin/summary');
  assert.equal(denied.status, 403);
  const summary = await j('GET', '/admin/summary', { headers: { 'x-admin-key': ADMIN } });
  assert.equal(summary.status, 200);
  assert.equal(summary.body.users, 2);
  assert.equal(summary.body.matches, 2);
  assert.equal(summary.body.matches, 2);
  assert.equal(summary.body.messages, 2);
  const html = await fetch(`${BASE}/admin?key=${ADMIN}`);
  assert.equal(html.status, 200);
  assert.ok((await html.text()).includes('ADMIN DESK'));
  console.log('✓ admin summary (users/matches/manual stats, gated)');

  // ── 6. pricing halls + founder broadcast (key-gated, live fan-out) ──
  assert.deepEqual({ africa: summary.body.regions.africa, unset: summary.body.regions.unset }, { africa: 1, unset: 1 });
  const chanList = await j('GET', '/community/channels', { token: a.body.token });
  const slugs = chanList.body.channels.map((c) => c.slug);
  for (const slug of ['dressing-room', 'match-receipts', 'the-lab', 'division-africa', 'division-world']) {
    assert.ok(slugs.includes(slug), `channel ${slug} seeded`);
  }
  const noKey = await j('POST', '/community/division-africa/founder', { body: { text: 'should be gated' } });
  assert.equal(noKey.status, 403, 'founder post needs the key');
  const liveFounder = await j('POST', '/community/dressing-room/founder', { headers: { 'x-admin-key': ADMIN }, body: { text: 'FOUNDER TOWN HALL — PRICING VOTE FRIDAY' } });
  assert.equal(liveFounder.status, 200);
  assert.equal(liveFounder.body.message.kind, 'founder');
  assert.equal(liveFounder.body.message.author, 'FOUNDER');
  await wait(150);
  assert.ok(seen.some((e) => e.type === 'message' && e.message && e.message.kind === 'founder'), 'founder broadcast fans out live to socket listeners');
  const formal = await j('POST', '/community/division-africa/founder', { headers: { 'x-admin-key': ADMIN }, body: { text: 'CREDITS OR SUBS — AFRICA, WHAT FITS YOUR POCKET?' } });
  assert.equal(formal.status, 200);
  const hall = await j('GET', '/community/division-africa/messages?after=0', { token: a.body.token });
  assert.ok(hall.body.messages.some((m2) => m2.kind === 'founder' && m2.author === 'FOUNDER'), 'hall keeps the founder post in history');
  console.log('✓ pricing halls + founder broadcast (key-gated, kind=founder, live fan-out)');

  // ── 7. the till — charge engine (wallets, ledger, go-live switch) ──
  // main server runs with the default future GO_LIVE → till not open yet
  const cat = await j('GET', '/store/catalog?region=africa', { token: a.body.token });
  assert.equal(cat.status, 200);
  assert.equal(cat.body.live, false, 'till closed before go-live');
  assert.ok(cat.body.goLive.includes('T'), 'go-live date announced');
  assert.ok(cat.body.products.africa.length >= 4, 'africa shelf stocked');
  assert.ok(cat.body.products.africa.every((p) => p.credits > 0 && p.price), 'africa packs carry credits + price');
  assert.equal(cat.body.products.world[0].plan, 'pro', 'world track is the subscription');
  const alphaId = a.body.user.academyId;
  const topNoKey = await j('POST', '/store/topup', { body: { academyId: alphaId, credits: 300 } });
  assert.equal(topNoKey.status, 403, 'top-up needs the founder key');
  const topGhost = await j('POST', '/store/topup', { headers: { 'x-admin-key': ADMIN }, body: { academyId: 'PSA-GHOST1', credits: 100 } });
  assert.equal(topGhost.status, 404, 'no wallets for unknown academy ids');
  const top1 = await j('POST', '/store/topup', { headers: { 'x-admin-key': ADMIN }, body: { academyId: alphaId, credits: 300, ref: 'PAYSTACK-TEST-001' } });
  assert.equal(top1.status, 200);
  assert.equal(top1.body.balance, 300, 'stocking shelves works pre-live');
  await j('POST', '/store/topup', { headers: { 'x-admin-key': ADMIN }, body: { academyId: alphaId, credits: 50 } });
  const bal = await j('GET', '/store/balance', { token: a.body.token });
  assert.equal(bal.body.credits, 350);
  assert.equal(bal.body.plan, 'free');
  assert.equal(bal.body.academyId, alphaId);
  assert.equal(bal.body.ledger.length, 2);
  assert.equal(bal.body.ledger[0].delta, 50, 'newest ledger line first');
  assert.equal(bal.body.ledger[1].ref, 'PAYSTACK-TEST-001', 'receipt reference kept');
  assert.equal(bal.body.ledger[1].actor, 'founder');
  const spendEarly = await j('POST', '/store/spend', { token: a.body.token, body: { amount: 100, reason: 'STAGE SCAN PACK' } });
  assert.equal(spendEarly.status, 403);
  assert.equal(spendEarly.body.error, 'STORE_NOT_LIVE', 'no spending before Jan 1');
  const sum7 = await j('GET', '/admin/summary', { headers: { 'x-admin-key': ADMIN } });
  assert.deepEqual({ w: sum7.body.till.wallets, c: sum7.body.till.creditsOut, p: sum7.body.till.proSubs }, { w: 1, c: 350, p: 0 });
  assert.equal(sum7.body.tillLive, false);
  const html7 = await fetch(`${BASE}/admin?key=${ADMIN}`);
  assert.ok((await html7.text()).includes('TILL'), 'admin desk shows the till');
  console.log('✓ the till — pre-live (catalog live, go-live gate, founder top-ups, ledger, wallet privacy)');

  // second boot with the till OPEN (GO_LIVE in the past) — same code, flipped switch
  const PORT2 = 8898;
  const BASE2 = `http://127.0.0.1:${PORT2}`;
  const srv2 = spawn(process.execPath, ['src/index.js'], {
    env: { ...process.env, PORT: String(PORT2), ADMIN_KEY: ADMIN, PSA_DB: path.join(scratch, 't2.db'), GO_LIVE: '2020-01-01T00:00:00Z' },
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  globalThis.__srv2 = srv2;
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE2}/health`);
      if (r.ok) break;
    } catch { /* retry */ }
    await wait(120);
  }
  const j2 = (method, p, opts = {}) => {
    const url = `${BASE2}${p}`;
    return fetch(url, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
        ...(opts.headers || {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(async (res) => ({ status: res.status, body: await res.json().catch(() => ({})) }));
  };
  const g = await j2('POST', '/auth/guest', { body: { handle: 'gamma', coachId: 'obinna', region: 'world' } });
  const cat2 = await j2('GET', '/store/catalog', { token: g.body.token });
  assert.equal(cat2.body.live, true, 'same code, till open after go-live');
  assert.equal(cat2.body.region, 'world', 'catalog follows the signed-in region');
  const gId = g.body.user.academyId;
  await j2('POST', '/store/topup', { headers: { 'x-admin-key': ADMIN }, body: { academyId: gId, credits: 200 } });
  const spend1 = await j2('POST', '/store/spend', { token: g.body.token, body: { amount: 120, reason: 'STAGE SCAN PACK' } });
  assert.equal(spend1.status, 200);
  assert.equal(spend1.body.credits, 80, 'spend debits atomically');
  const spendBig = await j2('POST', '/store/spend', { token: g.body.token, body: { amount: 999, reason: 'DREAM BIG' } });
  assert.equal(spendBig.status, 402, 'no credit, no spend');
  assert.equal(spendBig.body.credits, 80, 'failed spend leaves balance untouched');
  const sub = await j2('POST', '/store/subscribe', { headers: { 'x-admin-key': ADMIN }, body: { academyId: gId, plan: 'pro', renews: '2027-03-01' } });
  assert.equal(sub.status, 200);
  assert.equal(sub.body.plan, 'pro');
  const balG = await j2('GET', '/store/balance', { token: g.body.token });
  assert.equal(balG.body.plan, 'pro');
  assert.equal(balG.body.planRenews, '2027-03-01');
  assert.ok(balG.body.ledger.some((l) => l.reason === 'PLAN → PRO'), 'plan change is in the book');
  const sumG = await j2('GET', '/admin/summary', { headers: { 'x-admin-key': ADMIN } });
  assert.deepEqual({ w: sumG.body.till.wallets, c: sumG.body.till.creditsOut, p: sumG.body.till.proSubs }, { w: 1, c: 80, p: 1 });
  srv2.kill();
  console.log('✓ the till — live (spend debit, 402 guard, PRO activation, admin rollup)');

  wsA.close(); wsB.close(); srv.kill();
  fs.rmSync(scratch, { recursive: true, force: true });
  console.log('\nALL SERVER TESTS PASSED');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
