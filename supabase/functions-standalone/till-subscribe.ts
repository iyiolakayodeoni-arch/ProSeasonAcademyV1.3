// ─────────────────────────────────────────────────────────────
// SELF-CONTAINED VERSION — paste this straight into the Supabase
// dashboard. The _shared helpers are inlined below, so there is no
// ../_shared/ import to resolve and no extra files to create.
// Generated from supabase/functions/<name>/index.ts — edit that
// original, then re-generate; do not hand-edit this copy.
// ─────────────────────────────────────────────────────────────
// TILL-SUBSCRIBE — sub payment confirmed → the wallet turns PRO.
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ── inlined from _shared/cors.ts ─────────────────────────────
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
// ── inlined from _shared/admin.ts ────────────────────────────
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
// ── end of inlined helpers ───────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (!founderOk(req)) return json({ ok: false, error: 'founder key required' }, 403);

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
