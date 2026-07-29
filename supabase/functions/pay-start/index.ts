// PAY-START — creates a checkout at TODAY'S price.
//
// STRIPE IS THE DEFAULT. PayPal is still here as a fallback, because a
// working second rail costs nothing to keep and a dead checkout costs
// a sale.
//
// WHY STRIPE LEADS
//   Most members are Nigerian. Since July 2025 Nigerian banks allow
//   international payments on ordinary naira cards again (GTBank, UBA,
//   Access, First Bank, Zenith, Wema...), but PayPal's own risk layer
//   stays conservative about Nigeria regardless of what the issuing
//   bank permits — a card that works on Netflix can still be refused
//   by PayPal. Stripe is a plain card checkout: the member types his
//   card and HIS BANK decides. It is also cheaper on every pass
//   (1.5%+20p UK / 3.25%+20p international vs PayPal's ~2.9%+30p).
//
// WHY THE ORDER IS CREATED SERVER-SIDE
//   A hosted button has a fixed amount baked in, so the moment the
//   rate moves the app shows one number and charges another — which
//   looks like a bait and switch. The price comes from the DATABASE
//   (price_now), never from the phone, so a tampered client cannot
//   buy PRO for a penny.
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ── helpers, inlined on purpose ──────────────────────────────
// The Supabase DASHBOARD deploys one file and cannot resolve
// '../_shared/...'. Keeping these here means this file deploys by
// copy-paste as well as by CLI. Do not re-extract them.
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

/** Which rail to use. Stripe unless explicitly asked otherwise. */
function chooseProvider(asked: string): 'stripe' | 'paypal' {
  const want = asked.toLowerCase();
  if (want === 'paypal') return 'paypal';
  if (want === 'stripe') return 'stripe';
  return Deno.env.get('STRIPE_SECRET') ? 'stripe' : 'paypal';
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
  const provider = chooseProvider(String(body.provider ?? ''));

  // ── the price comes from the DATABASE, never from the client ──
  const { data: priced, error: perr } = await sb.rpc('price_now', { p_product: product }).single();
  if (perr || !priced) return json({ ok: false, error: 'unknown product' }, 404);

  const p = priced as any;
  const amount = Number(p.amount);
  const currency = String(p.currency ?? 'GBP');
  if (!(amount > 0)) return json({ ok: false, error: 'no price' }, 500);

  // Neither rail can charge naira: NGN is not on PayPal's currency list
  // at all, and this account settles in GBP. price_now() always returns
  // GBP now; this refuses loudly if a product is ever mis-configured.
  if (currency !== 'GBP') {
    return json({
      ok: false,
      error: 'misconfigured price',
      detail:
        `product ${product} is set to charge ${currency}, but this account ` +
        `only accepts GBP. Fix products.charge_currency — see supabase/fx3.sql.`,
    }, 500);
  }

  const value = amount.toFixed(2);
  // the webhook reads this back and grants exactly this pass
  const customId = `${profile.academy_id}|${product}`;

  // ════════════════════ STRIPE ════════════════════
  if (provider === 'stripe') {
    const key = Deno.env.get('STRIPE_SECRET');
    if (!key) return json({ ok: false, error: 'stripe not configured' }, 500);

    // Stripe takes the amount in the smallest unit — pence.
    const pence = Math.round(amount * 100);

    const form = new URLSearchParams({
      mode: 'payment',
      'payment_method_types[0]': 'card',
      // survives the round trip and comes back on the webhook
      client_reference_id: customId,
      'metadata[academy_id]': profile.academy_id,
      'metadata[product]': product,
      // mirrored onto the PaymentIntent so a charge-level event also
      // carries the identity — belt and braces if the session event
      // is ever missed
      'payment_intent_data[metadata][academy_id]': profile.academy_id,
      'payment_intent_data[metadata][product]': product,
      'payment_intent_data[description]': `ProSeasonAcademy · ${product}`,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'gbp',
      'line_items[0][price_data][unit_amount]': String(pence),
      'line_items[0][price_data][product_data][name]': `PROSEASONACADEMY · ${product}`,
      'line_items[0][price_data][product_data][description]':
        `${p.display ?? ''}${p.compare ? ' — ' + p.compare : ''}`.trim() || product,
      success_url: 'proseasonacademy://paid',
      cancel_url: 'proseasonacademy://cancelled',
    });

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/x-www-form-urlencoded',
        // a double-tap cannot create two sessions for the same purchase
        'idempotency-key': `${profile.academy_id}-${product}-${pence}`,
      },
      body: form,
    });

    if (!r.ok) {
      const detail = await r.text();
      return json(
        { ok: false, error: 'stripe rejected the checkout', detail: detail.slice(0, 300) },
        502,
      );
    }

    const session = await r.json();
    if (!session.url) return json({ ok: false, error: 'no checkout url' }, 502);

    await sb.rpc('audit', {
      p_action: 'pay_start',
      p_target: profile.academy_id,
      p_detail: { provider: 'stripe', product, amount: value, currency, session: session.id },
    });

    return json({
      ok: true,
      provider: 'stripe',
      orderId: session.id,
      approveUrl: session.url,
      amount: value,
      currency,
      display: p.display,
    });
  }

  // ════════════════════ PAYPAL (fallback) ════════════════════
  const token = await paypalToken();
  if (!token) return json({ ok: false, error: 'paypal not configured' }, 500);

  const orderRes = await fetch(`${PAYPAL_API()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'PayPal-Request-Id': `${profile.academy_id}-${product}-${value}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        custom_id: customId,
        description: `ProSeasonAcademy · ${product}`,
        amount: { currency_code: currency, value },
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
    p_detail: { provider: 'paypal', product, amount: value, currency, order: order.id },
  });

  return json({
    ok: true,
    provider: 'paypal',
    orderId: order.id,
    approveUrl: approve.href,
    amount: value,
    currency,
    display: p.display,
  });
});
