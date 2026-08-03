// ─────────────────────────────────────────────────────────────
// AUTH-REGISTER BATTERY — proves the email/password academy door
// works against the REAL Supabase project, end to end:
//
//   node tests/auth-register.test.mjs
//
// Creates ONE throwaway seat, exercises register → duplicate
// checks → login → wrong-password → delete, then hard-deletes the
// account so the seat count returns to exactly where it started.
// Requires .env with EXPO_PUBLIC_PSA_SUPABASE_URL + _ANON_KEY.
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

const fn = (name, body, token) =>
  fetch(`${URL_}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      authorization: token ? `Bearer ${token}` : `Bearer ${KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));

const seats = async () => {
  const r = await fetch(`${URL_}/rest/v1/rpc/season_seats?apikey=${KEY}`);
  const j = await r.json();
  return j?.[0]?.taken ?? -1;
};

// one throwaway identity per run — never reuses, so re-runs are safe
const ts = Date.now().toString(36).toUpperCase().slice(-7); // 7 chars
const USERNAME = `BAT${ts}`; // ≤ 14 chars, matches cleanHandle()
const EMAIL = `battery.${ts.toLowerCase()}@example.com`;
const PASSWORD = 'BatteryTest!2026';
let accessToken = null; // captured so cleanup runs even on failure

console.log(`\nAUTH-REGISTER BATTERY → ${URL_}\n${'─'.repeat(58)}`);

try {
  const baseline = await seats();
  ok('season_seats() readable (baseline)', baseline >= 0, `taken ${baseline}`);

  // 1 · register — the real door
  const reg = await fn('auth-register', {
    username: USERNAME,
    email: EMAIL,
    password: PASSWORD,
    country: 'Nigeria',
    countryCode: 'NG',
    region: 'africa',
    platform: 'CI',
  });
  const p = reg.json?.profile;
  ok('register → ok:true', reg.json?.ok === true, `status ${reg.status}`);
  ok('academy token PSA-XXXXXX', /^PSA-[0-9A-F]{6}$/.test(reg.json?.academyToken ?? ''), reg.json?.academyToken);
  ok('profile row with handle + email + academy_id', !!p && p.handle === USERNAME && p.email === EMAIL && p.academy_id === reg.json?.academyToken, `${p?.handle} · ${p?.academy_id}`);
  accessToken = reg.json?.session?.access_token ?? null;
  ok('session issued (signed in immediately)', !!accessToken, accessToken ? `token ${accessToken.slice(0, 12)}…` : 'no session');

  // 2 · duplicate username → USERNAME_TAKEN (different email)
  const dupName = await fn('auth-register', {
    username: USERNAME,
    email: `other.${ts.toLowerCase()}@example.com`,
    password: PASSWORD,
    country: 'Ghana',
    countryCode: 'GH',
    region: 'africa',
    platform: 'CI',
  });
  ok('duplicate username → USERNAME_TAKEN', dupName.json?.error === 'USERNAME_TAKEN', `status ${dupName.status}`);

  // 3 · duplicate email → EMAIL_TAKEN (different username)
  const dupMail = await fn('auth-register', {
    username: `OTH${ts}`,
    email: EMAIL,
    password: PASSWORD,
    country: 'Nigeria',
    countryCode: 'NG',
    region: 'africa',
    platform: 'CI',
  });
  ok('duplicate email → EMAIL_TAKEN', dupMail.json?.error === 'EMAIL_TAKEN', `status ${dupMail.status}`);

  // 4 · login with the right password
  const good = await fn('auth-login', { email: EMAIL, password: PASSWORD });
  ok('login (right password) → ok:true', good.json?.ok === true && !!good.json?.session?.access_token, `status ${good.status}`);
  ok('login returns same academy token', good.json?.academyToken === reg.json?.academyToken, good.json?.academyToken);
  if (!accessToken) accessToken = good.json?.session?.access_token ?? null;

  // 5 · login with a wrong password
  const bad = await fn('auth-login', { email: EMAIL, password: 'WrongPass!999' });
  ok('login (wrong password) → BAD_CREDENTIALS', bad.json?.error === 'BAD_CREDENTIALS', `status ${bad.status}`);

  // 6 · delete the seat (uses the live session, like the app's delete button)
  if (accessToken) {
    const del = await fn('auth-delete', {}, accessToken);
    ok('delete account → ok:true', del.json?.ok === true, `status ${del.status}`);
  } else {
    ok('delete account → ok:true', false, 'no session captured — cannot clean up!');
  }

  // 7 · the account is really gone
  const afterDel = await fn('auth-login', { email: EMAIL, password: PASSWORD });
  ok('login after delete fails', afterDel.json?.ok === false, `status ${afterDel.status} · ${afterDel.json?.error}`);

  // 8 · seat count returned to baseline (no litter)
  const final = await seats();
  ok('seat count back to baseline', final === baseline, `baseline ${baseline} → final ${final}`);
} finally {
  // safety net — never leave a throwaway seat behind
  if (accessToken) {
    try {
      await fn('auth-delete', {}, accessToken);
      const final = await seats();
      console.log(`[cleanup] throwaway seat removed — seats now ${final}`);
    } catch (e) {
      console.error('[cleanup] FAILED to delete throwaway account:', e?.message);
      console.error('[cleanup] delete it manually in the Supabase dashboard → Authentication → Users.');
    }
  }
}

console.log(`\n${'─'.repeat(58)}\n${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);