// AUTH-REGISTER — email/password sign-up with auto academy token.
// Returns the generated academy_id so the app can show it once securely.
// Duplicate username / email are rejected with clear codes.
import { createClient } from 'jsr:@supabase/supabase-js@2';

export const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, x-founder-key',
  'access-control-allow-methods': 'POST, OPTIONS',
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors },
  });

const service = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const cleanHandle = (raw: unknown): string => {
  const base = String(raw || '').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 14);
  return base || `PLAYER${Math.floor(1000 + Math.random() * 9000)}`;
};

const REGION = (r: unknown) => (r === 'africa' || r === 'world' ? r : 'unset');

const mapAuthError = (msg: string): { code: string; status: number } => {
  const m = msg.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user already'))
    return { code: 'EMAIL_TAKEN', status: 409 };
  if (m.includes('password') && (m.includes('weak') || m.includes('least') || m.includes('short')))
    return { code: 'WEAK_PASSWORD', status: 400 };
  if (m.includes('email') && (m.includes('invalid') || m.includes('format')))
    return { code: 'INVALID_EMAIL', status: 400 };
  if (m.includes('rate') || m.includes('too many'))
    return { code: 'RATE_LIMITED', status: 429 };
  return { code: 'SIGNUP_FAILED', status: 400 };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  const sb = service();
  const body = await req.json().catch(() => ({}));

  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const username = cleanHandle(body.username ?? body.handle);
  const country = String(body.country ?? '').trim().slice(0, 40);
  const countryCode = String(body.countryCode ?? '').trim().toUpperCase().slice(0, 2);
  const region = REGION(body.region);
  const platform = body.platform ? String(body.platform).slice(0, 24) : null;

  if (!email || !email.includes('@')) return json({ ok: false, error: 'INVALID_EMAIL' }, 400);
  if (password.length < 8) return json({ ok: false, error: 'WEAK_PASSWORD' }, 400);
  if (username.length < 3) return json({ ok: false, error: 'USERNAME_SHORT' }, 400);

  // duplicate username (case-insensitive)
  const { data: nameClash } = await sb
    .from('profiles')
    .select('id')
    .or(`username.ilike.${username},handle.ilike.${username}`)
    .maybeSingle();
  if (nameClash) return json({ ok: false, error: 'USERNAME_TAKEN' }, 409);

  // seat gate
  const { data: seats0 } = await sb.rpc('season_seats').single();
  const season = seats0?.season ?? 'SEASON ONE';
  const cap = seats0?.cap ?? 1000;
  if ((seats0?.taken ?? 0) >= cap) {
    return json({ ok: false, error: 'SEASON_FULL', season, cap, taken: seats0?.taken ?? cap }, 409);
  }

  // create auth user (email confirmation depends on project Auth settings)
  const { data: created, error: aerr } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, country, country_code: countryCode },
  });
  if (aerr || !created.user) {
    const mapped = mapAuthError(String(aerr?.message ?? 'failed'));
    return json({ ok: false, error: mapped.code, detail: aerr?.message }, mapped.status);
  }
  const user = created.user;

  // academy token
  let academy = '';
  for (let i = 0; i < 8; i++) {
    academy = 'PSA-' + Array.from(crypto.getRandomValues(new Uint8Array(3)))
      .map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const { data: clash } = await sb.from('profiles').select('id').eq('academy_id', academy).maybeSingle();
    if (!clash) break;
  }

  // resolve pricing region (NG-only for nigeria shelf)
  let pricingRegion = region;
  try {
    const { data: pr } = await sb.rpc('pricing_region_for', { p_code: countryCode, p_geo: region });
    if (pr === 'africa' || pr === 'world') pricingRegion = pr;
  } catch { /* fall back to client region */ }

  const insert = {
    auth_user_id: user.id,
    handle: username,
    username,
    email,
    coach_id: null as string | null,
    platform,
    region: pricingRegion,
    country: country || null,
    country_code: countryCode || null,
    geo_source: 'manual',
    geo_verified: false,
    geo_uncertain: false,
    academy_id: academy,
    is_founder: false,
  };

  const { data: profile, error: perr } = await sb.from('profiles').insert(insert).select().single();
  if (perr) {
    // roll back auth user so they can retry cleanly
    try { await sb.auth.admin.deleteUser(user.id); } catch (_) {}
    if (String(perr.message).includes('SEASON_FULL')) {
      return json({ ok: false, error: 'SEASON_FULL', season, cap, taken: seats0?.taken ?? cap }, 409);
    }
    if (String(perr.message).toLowerCase().includes('unique') || String(perr.message).includes('duplicate')) {
      return json({ ok: false, error: 'USERNAME_TAKEN' }, 409);
    }
    return json({ ok: false, error: 'PROFILE_FAILED', detail: perr.message }, 500);
  }

  // trial + welcome (best effort — older DBs may lack these RPCs).
  // NOTE: never chain .catch() on sb.rpc() — some edge-runtime builds of
  // supabase-js return a builder without .catch(). try/catch + await works
  // with any thenable and any real promise, so this cannot throw.
  try { await sb.rpc('grant_trial_one', { p_academy: academy }); } catch (_) {}
  const { data: trialCfg } = await sb.from('config').select('value').eq('key', 'trial_days').maybeSingle();
  try {
    await sb.rpc('set_deadline', {
      p_academy: academy,
      p_days: Number(trialCfg?.value ?? 14),
    });
  } catch (_) {}
  try { await sb.rpc('welcome_member', { p_academy: academy }); } catch (_) {}

  // issue a session so the app is signed in immediately
  let sess = null;
  try {
    const r = await sb.auth.signInWithPassword({ email, password });
    sess = r.data?.session ?? null;
  } catch (_) {
    sess = null;
  }
  if (!sess) {
    // profile exists — they can log in manually
    return json({
      ok: true,
      needsLogin: true,
      academyToken: academy,
      profile,
      message: 'ACCOUNT CREATED — SIGN IN WITH YOUR EMAIL AND PASSWORD.',
    });
  }

  return json({
    ok: true,
    academyToken: academy,
    profile,
    session: {
      access_token: sess.access_token,
      refresh_token: sess.refresh_token,
      expires_at: sess.expires_at,
    },
  });
});