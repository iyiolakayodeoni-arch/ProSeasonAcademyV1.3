// TILL-TOPUP — bank alert confirmed → credits into the player's wallet.
import { json } from '../_shared/cors.ts';
import { service, founderOk } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (!founderOk(req)) return json({ ok: false, error: 'founder key required' }, 403);

  const body = await req.json().catch(() => ({}));
  const academyId = String(body.academyId ?? '').toUpperCase().trim();
  const credits = Math.round(Number(body.credits));
  if (!academyId || !Number.isFinite(credits) || credits <= 0) {
    return json({ ok: false, error: 'academyId + positive credits required' }, 400);
  }
  const sb = service();
  const { data, error } = await sb.rpc('till_topup', {
    p_academy: academyId,
    p_delta: credits,
    p_reason: body.reason ? String(body.reason).slice(0, 60) : 'FOUNDER TOP-UP',
    p_ref: body.ref ? String(body.ref).slice(0, 60) : null,
    p_actor: 'founder',
  });
  if (error) {
    const unknown = String(error.message).includes('unknown academy id');
    return json({ ok: false, error: unknown ? 'unknown academy id' : String(error.message) }, unknown ? 404 : 500);
  }
  return json({ ok: true, academyId, balance: data });
});
