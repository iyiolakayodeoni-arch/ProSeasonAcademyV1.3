// ─────────────────────────────────────────────────────────────
// LIVE BACKEND BATTERY — proves the real Supabase project answers
// exactly the way the app expects. Read-mostly: it claims one
// anonymous seat, exercises the player-facing paths, then leaves
// the seat in place (SEASON ONE counts real people, so we do not
// churn the table).
//
//   node tests/live-backend.test.mjs
//
// Requires .env with EXPO_PUBLIC_PSA_SUPABASE_URL + ANON_KEY.
// ─────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const URL_ = env.EXPO_PUBLIC_PSA_SUPABASE_URL;
const KEY = env.EXPO_PUBLIC_PSA_SUPABASE_ANON_KEY;
if (!URL_ || !KEY) {
  console.error('✗ .env is missing EXPO_PUBLIC_PSA_SUPABASE_URL / _ANON_KEY');
  process.exit(1);
}

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) {
    pass++;
    console.log(`PASS · ${name}${extra ? ` — ${extra}` : ''}`);
  } else {
    fail++;
    console.log(`FAIL · ${name}${extra ? ` — ${extra}` : ''}`);
  }
};

const rest = (path, init = {}, token) =>
  fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      authorization: `Bearer ${token ?? KEY}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

console.log(`\nACADEMY LIVE BATTERY → ${URL_}\n${'─'.repeat(58)}`);

// 1 · the shelves exist
{
  const r = await rest('channels?select=slug,name');
  const rows = await r.json();
  const slugs = (rows ?? []).map((c) => c.slug);
  ok('channels seeded', r.ok && slugs.length === 5, slugs.join(', '));
  ok(
    'app channel map resolves',
    ['dressing-room', 'match-receipts', 'the-lab'].every((s) => slugs.includes(s)),
  );
}

// 2 · season config — the 1,000-seat promise, in the database
{
  const r = await rest('config?select=key,value');
  const cfg = Object.fromEntries((await r.json()).map((c) => [c.key, c.value]));
  ok('seat_cap = 1000', cfg.seat_cap === '1000', `got ${cfg.seat_cap}`);
  ok('season_name = SEASON ONE', cfg.season_name === 'SEASON ONE', cfg.season_name);
  ok('go_live present', !!cfg.go_live, cfg.go_live);
}

// 3 · the seat counter the gate depends on
let seats;
{
  const r = await rest('rpc/season_seats', { method: 'POST', body: '{}' });
  const rows = await r.json();
  seats = Array.isArray(rows) ? rows[0] : rows;
  ok('season_seats() callable by anon', r.ok, JSON.stringify(seats));
  ok('seats.taken excludes the founder row', seats && seats.taken < seats.cap, `${seats?.taken}/${seats?.cap}`);
}

// 4 · price list (the till reads this)
{
  const r = await rest('products?select=code,region,credits,plan,price&order=sort');
  const rows = await r.json();
  ok('products seeded', r.ok && rows.length >= 5, `${rows.length} rows`);
  ok('africa = credit packs', rows.some((p) => p.region === 'africa' && p.credits > 0));
  ok('world = subscription', rows.some((p) => p.region === 'world' && p.plan === 'pro'));
}

// 5 · RLS: a stranger must not read the player tables
{
  const r = await rest('profiles?select=id&limit=1');
  const body = await r.json();
  const blocked = !r.ok || (Array.isArray(body) && body.length === 0);
  ok('profiles not public to anon', blocked, `status ${r.status}`);
}

// 6 · anonymous sign-in — the entire auth model
let token = null;
let uid = null;
{
  const r = await fetch(`${URL_}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ data: {} }),
  });
  const j = await r.json();
  token = j.access_token ?? null;
  uid = j.user?.id ?? null;
  ok('anonymous sign-in enabled', !!token, token ? `uid ${uid?.slice(0, 8)}…` : JSON.stringify(j).slice(0, 120));
}

// 7 · ensure-profile — claims a SEASON ONE seat
let profile = null;
if (token) {
  const r = await fetch(`${URL_}/functions/v1/ensure-profile`, {
    method: 'POST',
    headers: { apikey: KEY, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ handle: 'BATTERY_BOT', coachId: 'chinedu', platform: 'CI', region: 'world' }),
  });
  const j = await r.json();
  profile = j.profile ?? null;
  ok('ensure-profile deployed + claims a seat', r.ok && !!profile, profile ? `${profile.handle} ${profile.academy_id}` : JSON.stringify(j).slice(0, 160));
  ok('academy id format PSA-XXXXXX', /^PSA-[0-9A-F]{6}$/.test(profile?.academy_id ?? ''), profile?.academy_id);

  // idempotence: a second call must return the SAME seat, not burn another
  const r2 = await fetch(`${URL_}/functions/v1/ensure-profile`, {
    method: 'POST',
    headers: { apikey: KEY, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ handle: 'BATTERY_BOT', coachId: 'chinedu', platform: 'CI', region: 'world' }),
  });
  const j2 = await r2.json();
  ok('re-entry reuses the same seat', j2.profile?.academy_id === profile?.academy_id, j2.profile?.academy_id);
}

// 8 · the vault round-trips (idempotent by client_id, like the app)
if (token && profile) {
  const clientId = `battery-${Date.now()}`;
  const row = {
    user_id: profile.id,
    client_id: clientId,
    at: new Date().toISOString(),
    gf: 2,
    ga: 1,
    mode: 'RANKED',
    opp_style: 'LOW BLOCK',
    pass_acc: 71,
    no_sprint: true,
    mechanics_used: 2,
    led_at75: true,
    decisive: 'AFTER 60',
    source: 'manual',
    composure: 4,
    note: 'battery run',
  };
  const r = await rest('matches', { method: 'POST', body: JSON.stringify(row), headers: { prefer: 'resolution=ignore-duplicates' } }, token);
  ok('vault insert accepted under RLS', r.ok || r.status === 201 || r.status === 409, `status ${r.status}`);

  const r2 = await rest(`matches?select=client_id,gf,ga&client_id=eq.${clientId}`, {}, token);
  const rows = await r2.json();
  ok('vault row reads back', Array.isArray(rows) && rows.length === 1, JSON.stringify(rows?.[0] ?? rows).slice(0, 120));

  const dupe = await rest('matches', { method: 'POST', body: JSON.stringify(row), headers: { prefer: 'resolution=ignore-duplicates' } }, token);
  const after = await (await rest(`matches?select=client_id&client_id=eq.${clientId}`, {}, token)).json();
  ok('sync is idempotent (no duplicate)', after.length === 1, `${after.length} row(s), dupe status ${dupe.status}`);

  // cleanup — the battery leaves no litter in the ledger
  await rest(`matches?client_id=eq.${clientId}`, { method: 'DELETE' }, token);
}

// 9 · the founder badge cannot be forged from a phone
if (token && profile) {
  const r = await rest(
    'messages',
    {
      method: 'POST',
      body: JSON.stringify({
        channel_slug: 'dressing-room',
        user_id: profile.id,
        handle: profile.handle,
        academy_id: profile.academy_id,
        kind: 'founder', // ← the attack
        text: 'i am definitely the founder',
      }),
    },
    token,
  );
  ok('RLS rejects a forged founder message', !r.ok, `status ${r.status}`);
}

// 10 · founder-only functions refuse an unauthenticated caller
{
  const r = await fetch(`${URL_}/functions/v1/admin-summary`, {
    method: 'POST',
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: '{}',
  });
  ok('admin-summary demands the founder key', r.status === 403 || r.status === 401, `status ${r.status}`);

  const r2 = await fetch(`${URL_}/functions/v1/till-topup`, {
    method: 'POST',
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json', 'x-founder-key': 'obviously-wrong' },
    body: JSON.stringify({ academyId: 'PSA-000000', credits: 999999 }),
  });
  ok('till-topup rejects a wrong founder key', r2.status === 403, `status ${r2.status}`);
}

console.log('─'.repeat(58));
console.log(`${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
