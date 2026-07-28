// ENSURE-PROFILE — the academy's front door. Sign-up AND sign-in are
// the same tap (anonymous auth): existing players get their row back
// (fresh flags patched), new players claim a SEASON ONE seat — while
// seats last. Full season → they land on the waitlist instead.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { json } from '../_shared/cors.ts';
import { service, cleanHandle } from '../_shared/admin.ts';

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
  // Two gates, in order:
  //   1. INVITE  — is this person one of ours? (private ecosystem)
  //   2. SEAT    — is there room left? (the season cap)
  // The seat cap alone was never enough: the anon key ships inside
  // every APK, so without an invite anyone who got the file could
  // spend one of the 1,000 seats.
  const { data: inviteOnlyRow } = await sb
    .from('config').select('value').eq('key', 'invite_only').maybeSingle();
  const inviteOnly = String(inviteOnlyRow?.value ?? 'false') === 'true';

  const code = String(body.inviteCode ?? '').toUpperCase().trim();

  if (inviteOnly) {
    if (!code) {
      return json({ ok: false, error: 'INVITE_REQUIRED' }, 403);
    }
    const { data: claimed, error: cerr0 } = await sb.rpc('claim_invite', { p_code: code });
    if (cerr0 || claimed !== true) {
      return json({ ok: false, error: 'INVITE_INVALID' }, 403);
    }
  }

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
    invite_code: code || null,
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

  const { data: seats1 } = await sb.rpc('season_seats').single();
  return json({ ok: true, profile: created, seats: seats1 ?? null });
});
