// PAY-START — creates a PayPal order at TODAY'S price.
//
// This is what makes live pricing honest. A hosted PayPal button has a
// fixed amount baked in, so the moment the rate moves the app would
// show one number and charge another — which looks like a bait and
// switch. Instead the order is created here, server-side, at the price
// the member was just shown, with their seat attached.
//
// The price is calculated by the DATABASE (price_now), never sent up
// from the phone, so a tampered client cannot buy PRO for a penny.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors },
  });

const service = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const PAYPAL_API = () => Deno.env.get('PAYPAL_API') ?? 'https://api-m.paypal.com';

async function paypalToken(): Promise<string | null> {
  const id = Deno.env.get('PAYPAL_CLIENT_ID');
  const secret = Deno.env.get('PAYPAL_SECRET');
  if (!id || !secret) return null;
  const r = await fetch(`${PAYPAL_API()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) return null;
  return (await r.json()).access_token ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  // ── who is asking (their own session, not a claim in the body) ──
  const auth = req.headers.get('authorization') ?? '';
  const anon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { authorization: auth } } },
  );
  const { data: { user } } = await anon.auth.getUser();
  if (!user) return json({ ok: false, error: 'auth required' }, 401);

  const sb = service();
  const { data: profile } = await sb
    .from('profiles')
    .select('academy_id, handle, status')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (!profile || profile.status === 'removed') {
    return json({ ok: false, error: 'no active seat' }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const product = String(body.product ?? '').toUpperCase().trim();
  if (!product) return json({ ok: false, error: 'product required' }, 400);

  // ── the price comes from the DATABASE, never from the client ──
  const { data: priced, error: perr } = await sb.rpc('price_now', { p_product: product }).single();
  if (perr || !priced) return json({ ok: false, error: 'unknown product' }, 404);

  const p = priced as any;
  if (p.stale) {
    return json({
      ok: false,
      error: 'RATE_STALE',
      note: 'Today\u2019s rate could not be confirmed. Try again shortly.',
    }, 503);
  }

  const amount = Number(p.amount_gbp);
  if (!(amount > 0)) return json({ ok: false, error: 'no price' }, 500);

  // ── create the order ──
  const token = await paypalToken();
  if (!token) return json({ ok: false, error: 'paypal not configured' }, 500);

  const orderRes = await fetch(`${PAYPAL_API()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      // idempotent per seat+product+price, so a double-tap cannot
      // create two orders for the same purchase
      'PayPal-Request-Id': `${profile.academy_id}-${product}-${amount.toFixed(2)}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        // the webhook reads this back and grants exactly this pass
        custom_id: `${profile.academy_id}|${product}`,
        description: `ProSeasonAcademy · ${product}`,
        amount: { currency_code: 'GBP', value: amount.toFixed(2) },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'PROSEASONACADEMY',
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: 'proseasonacademy://paid',
            cancel_url: 'proseasonacademy://cancelled',
          },
        },
      },
    }),
  });

  if (!orderRes.ok) {
    const detail = await orderRes.text();
    return json({ ok: false, error: 'paypal rejected the order', detail: detail.slice(0, 300) }, 502);
  }

  const order = await orderRes.json();
  const approve = (order.links ?? []).find((l: any) => l.rel === 'payer-action' || l.rel === 'approve');
  if (!approve?.href) return json({ ok: false, error: 'no approval link' }, 502);

  await sb.rpc('audit', {
    p_action: 'pay_start',
    p_target: profile.academy_id,
    p_detail: { product, amount: amount.toFixed(2), order: order.id },
  });

  return json({
    ok: true,
    orderId: order.id,
    approveUrl: approve.href,
    amount: amount.toFixed(2),
    display: p.display,
  });
});
