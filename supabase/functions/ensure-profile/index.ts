// ENSURE-PROFILE — the academy's front door. Sign-up AND sign-in are
// the same tap (anonymous auth): existing players get their row back
// (fresh flags patched), new players claim a SEASON ONE seat — while
// seats last. Full season → they land on the waitlist instead.
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ── helpers, inlined on purpose ──────────────────────────────
// The Supabase DASHBOARD deploys one file and cannot resolve
// '../_shared/...'. Keeping these here means this file deploys
// by copy-paste as well as by CLI. Do not re-extract them.
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

/** service-role client — bypasses RLS, lives only inside functions */
export const service = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

/** every founder move proves the key — same single-secret model as before */
export const founderOk = (req: Request) =>
  !!Deno.env.get('FOUNDER_KEY') && req.headers.get('x-founder-key') === Deno.env.get('FOUNDER_KEY');

export const cleanHandle = (raw: unknown): string => {
  const base = String(raw || '').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 14);
  return base || `PLAYER${Math.floor(1000 + Math.random() * 9000)}`;
};
// ── end helpers ──────────────────────────────────────────────

const REGION = (r: unknown) => (r === 'africa' || r === 'world' ? r : 'unset');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  // who is knocking (anonymous session token from the app)
  const auth = req.headers.get('authorization') ?? '';
  const anon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { authorization: auth } } },
  );
  const { data: { user }, error: uerr } = await anon.auth.getUser();
  if (uerr || !user) return json({ ok: false, error: 'auth required' }, 401);

  const sb = service();
  const body = await req.json().catch(() => ({}));

  // returning player → patch any fresher facts, hand the row back
  const { data: existing } = await sb.from('profiles').select('*').eq('auth_user_id', user.id).maybeSingle();
  if (existing) {
    const patch: Record<string, unknown> = {};
    if (body.handle) {
      const h = cleanHandle(body.handle);
      if (h !== existing.handle) patch.handle = h;
    }
    if (body.coachId && body.coachId !== existing.coach_id) patch.coach_id = String(body.coachId).slice(0, 24);
    if (body.platform && body.platform !== existing.platform) patch.platform = String(body.platform).slice(0, 24);
    if (body.region && REGION(body.region) !== 'unset' && body.region !== existing.region) patch.region = body.region;
    if (Object.keys(patch).length) await sb.from('profiles').update(patch).eq('id', existing.id);
    const { data: seats } = await sb.rpc('season_seats').single();
    return json({ ok: true, profile: { ...existing, ...patch }, seats: seats ?? null });
  }

  // ── NEW PLAYER → THE DOOR ──────────────────────────────────
  // The player does NOT type an invite/token. The app is private by
  // distribution. The only hard gate here is the season cap — not
  // invite codes. Sign-up is open to anyone with the app, up to the
  // 1,000-seat cap.
  const { data: seats0 } = await sb.rpc('season_seats').single();
  const season = seats0?.season ?? 'SEASON ONE';
  const cap = seats0?.cap ?? 1000;

  const joinWaitlist = async () => {
    await sb.from('waitlist').upsert({
      auth_user_id: user.id,
      handle: cleanHandle(body.handle),
      region: REGION(body.region),
    });
  };

  if ((seats0?.taken ?? 0) >= cap) {
    await joinWaitlist();
    return json({ ok: false, error: 'SEASON_FULL', season, cap, taken: seats0?.taken ?? cap }, 409);
  }

  // unique Academy ID (PSA-XXXXXX), then the seat is theirs forever
  let academy = '';
  for (let i = 0; i < 8; i++) {
    academy = 'PSA-' + Array.from(crypto.getRandomValues(new Uint8Array(3)))
      .map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const { data: clash } = await sb.from('profiles').select('id').eq('academy_id', academy).maybeSingle();
    if (!clash) break;
  }
  const insert = {
    auth_user_id: user.id,
    handle: cleanHandle(body.handle),
    coach_id: body.coachId ? String(body.coachId).slice(0, 24) : null,
    platform: body.platform ? String(body.platform).slice(0, 24) : null,
    region: REGION(body.region),
    academy_id: academy,
  };
  const { data: created, error: cerr } = await sb.from('profiles').insert(insert).select().single();

  if (cerr) {
    // The trigger fired between our check and this insert — someone
    // else took the last seat first. This is the race path, and it
    // now ends honestly instead of over-selling.
    if (String(cerr.message).includes('SEASON_FULL')) {
      await joinWaitlist();
      const { data: sNow } = await sb.rpc('season_seats').single();
      return json(
        { ok: false, error: 'SEASON_FULL', season, cap, taken: sNow?.taken ?? cap },
        409,
      );
    }
    return json({ ok: false, error: String(cerr.message) }, 500);
  }

  // joined during the announced free window → they get the trial too,
  // so nobody who took a seat that week is left out.
  await sb.rpc('grant_trial_one', { p_academy: academy });

  // start their clock and send the welcome + terms to their inbox
  const { data: trialCfg } = await sb
    .from('config').select('value').eq('key', 'trial_days').maybeSingle();
  await sb.rpc('set_deadline', {
    p_academy: academy,
    p_days: Number(trialCfg?.value ?? 14),
  });
  await sb.rpc('welcome_member', { p_academy: academy });

  const { data: seats1 } = await sb.rpc('season_seats').single();
  return json({ ok: true, profile: created, seats: seats1 ?? null });
});
