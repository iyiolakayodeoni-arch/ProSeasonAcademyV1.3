// TILL-SUBSCRIBE — sub payment confirmed → the wallet turns PRO.
import { json } from '../_shared/cors.ts';
import { service, founderOk } from '../_shared/admin.ts';

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
