// TILL-SUBSCRIBE — sub payment confirmed → the wallet turns PRO.
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
export const founderOk = async (req: Request) => {
  // Authorization is the Supabase identity + profiles.is_founder.
  // FOUNDER_KEY is never required on the client and is not checked here.
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const sb = service();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return false;
  const { data: profile } = await sb.from('profiles').select('is_founder').eq('auth_user_id', user.id).maybeSingle();
  return profile?.is_founder === true;
}

export const cleanHandle = (raw: unknown): string => {
  const base = String(raw || '').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 14);
  return base || `PLAYER${Math.floor(1000 + Math.random() * 9000)}`;
};
// ── end helpers ──────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (!(await founderOk(req))) return json({ ok: false, error: 'founder key required' }, 403);

  const body = await req.json().catch(() => ({}));
  const academyId = String(body.academyId ?? '').toUpperCase().trim();
  const plan = body.plan === 'pro' ? 'pro' : 'free';
  if (!academyId) return json({ ok: false, error: 'academyId required' }, 400);

  const sb = service();
  const { error } = await sb.rpc('till_plan', {
    p_academy: academyId,
    p_plan: plan,
    p_renews: body.renews ? String(body.renews).slice(0, 40) : null,
    p_actor: 'founder',
  });
  if (error) {
    const unknown = String(error.message).includes('unknown academy id');
    return json({ ok: false, error: unknown ? 'unknown academy id' : String(error.message) }, unknown ? 404 : 500);
  }
  return json({ ok: true, academyId, plan, planRenews: body.renews ?? null });
});
