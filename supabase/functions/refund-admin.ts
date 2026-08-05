// REFUND-ADMIN — founder-only refund endpoint for Stripe
// Deploy as a Supabase Edge Function. Requires:
//  - Deno.env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET
//  - Caller must be a founder (auth token in Authorization header)

import { createClient } from 'jsr:@supabase/supabase-js@2';

export const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, x-founder-key',
  'access-control-allow-methods': 'POST, OPTIONS',
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors } });

const service = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const founderOk = async (req: Request) => {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const sb = service();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return false;
  const { data: profile } = await sb.from('profiles').select('is_founder').eq('auth_user_id', user.id).maybeSingle();
  return profile?.is_founder === true;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (!(await founderOk(req))) return json({ ok: false, error: 'founder required' }, 403);

  const sb = service();
  const body = await req.json().catch(() => ({}));
  const paymentProvider = String(body.provider ?? 'stripe');

  // Support Stripe refunds now. Body must include payment_intent or charge.
  if (paymentProvider === 'stripe') {
    const stripeSecret = Deno.env.get('STRIPE_SECRET');
    if (!stripeSecret) return json({ ok: false, error: 'stripe secret not set' }, 500);
    const refundPayload = new URLSearchParams();
    if (body.payment_intent) refundPayload.append('payment_intent', String(body.payment_intent));
    else if (body.charge) refundPayload.append('charge', String(body.charge));
    else return json({ ok: false, error: 'payment_intent or charge required' }, 400);

    if (body.amount) refundPayload.append('amount', String(body.amount));
    if (body.reason) refundPayload.append('reason', String(body.reason));

    const r = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stripeSecret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: refundPayload.toString(),
    }).catch((e) => ({ ok: false, error: String(e) }));

    if (!('ok' in r) && r && r.status && r.status >= 400) {
      const txt = await r.text().catch(() => '');
      await sb.rpc('audit', { p_action: 'refund', p_target: body.payment_intent ?? body.charge ?? null, p_detail: { provider: 'stripe', status: r.status, body: txt } });
      return json({ ok: false, error: 'refund failed', detail: txt }, 502);
    }

    const data = await r.json().catch(() => null);
    await sb.rpc('audit', { p_action: 'refund', p_target: body.payment_intent ?? body.charge ?? null, p_detail: { provider: 'stripe', result: data } });
    return json({ ok: true, refund: data });
  }

  return json({ ok: false, error: 'unsupported provider' }, 400);
});
