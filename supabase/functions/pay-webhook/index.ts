// PAY-WEBHOOK — payments grant access automatically.
//
// The founder: "the payment should be automatic i dont have the time
// to be validating payments."
//
// STRIPE is the default rail. PayPal, Paystack and Flutterwave are all
// still supported — whichever POSTs here, we verify its signature, read
// who paid and for what, and call grant_tier: the same function the
// Founder Desk uses, so there is exactly one way access is granted and
// one audit trail.
//
// SETUP (once per provider) — the ?p= picks the rail:
//   Stripe       → Developers → Webhooks → Add endpoint:
//                  https://<project>.supabase.co/functions/v1/pay-webhook?p=stripe
//                  Event:  checkout.session.completed
//                  Secret: STRIPE_WEBHOOK_SECRET  (starts whsec_)
//   PayPal       → same URL with ?p=paypal
//                  Event:  PAYMENT.CAPTURE.COMPLETED
//                  Secret: PAYPAL_WEBHOOK_ID
//   Paystack     → same URL with ?p=paystack   · PAYSTACK_SECRET
//   Flutterwave  → same URL with ?p=flutterwave · FLW_SECRET_HASH
//
// TURN OFF "Verify JWT" on this function. A payment provider is not a
// logged-in user and carries no JWT; leaving it on rejects every call
// before it reaches this code — payments arrive, nothing opens, and the
// logs look empty. The function is not unprotected: every request is
// signature-checked above.
//
// The member's Academy ID rides along on the payment automatically —
// pay-start sets it as Stripe's client_reference_id / PayPal's
// custom_id, so nobody types a reference and nothing is reconciled by
// hand. The manual claim flow still exists underneath for anyone who
// pays outside the app.
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

/** constant-time compare so a signature cannot be guessed by timing */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(hash: 'SHA-512' | 'SHA-256', secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const hmacSha512Hex = (secret: string, body: string) => hmacHex('SHA-512', secret, body);
const hmacSha256Hex = (secret: string, body: string) => hmacHex('SHA-256', secret, body);

/**
 * PayPal signs with a certificate, not an HMAC. Rather than implement
 * cert-chain crypto here, we hand the transmission back to PayPal's own
 * verify endpoint and let them confirm it. Slower by one call, but it
 * cannot be got subtly wrong — which matters when it gates access.
 */
async function paypalVerified(req: Request, raw: string): Promise<boolean> {
  const id = Deno.env.get('PAYPAL_CLIENT_ID');
  const secret = Deno.env.get('PAYPAL_SECRET');
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');
  if (!id || !secret || !webhookId) return false;

  const api = Deno.env.get('PAYPAL_API') ?? 'https://api-m.paypal.com';

  const tokRes = await fetch(`${api}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!tokRes.ok) return false;
  const token = (await tokRes.json()).access_token;
  if (!token) return false;

  const vRes = await fetch(`${api}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      auth_algo: req.headers.get('paypal-auth-algo'),
      cert_url: req.headers.get('paypal-cert-url'),
      transmission_id: req.headers.get('paypal-transmission-id'),
      transmission_sig: req.headers.get('paypal-transmission-sig'),
      transmission_time: req.headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: JSON.parse(raw),
    }),
  });
  if (!vRes.ok) return false;
  return (await vRes.json()).verification_status === 'SUCCESS';
}

/**
 * Stripe signs with an HMAC over "timestamp.body" and sends it as
 *     Stripe-Signature: t=1234567890,v1=<hex>,v1=<hex>
 * There can be more than one v1 when signing secrets are being rotated,
 * so every candidate is checked. The timestamp is enforced to stop a
 * captured request being replayed later.
 */
async function stripeVerified(req: Request, raw: string): Promise<boolean> {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) return false;

  const header = req.headers.get('stripe-signature') ?? '';
  const parts = new Map<string, string[]>();
  for (const chunk of header.split(',')) {
    const [k, v] = chunk.split('=', 2);
    if (!k || !v) continue;
    const key = k.trim();
    parts.set(key, [...(parts.get(key) ?? []), v.trim()]);
  }

  const timestamp = parts.get('t')?.[0];
  const sent = parts.get('v1') ?? [];
  if (!timestamp || sent.length === 0) return false;

  // replay guard — five minutes, the tolerance Stripe itself recommends
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = await hmacSha256Hex(secret, `${timestamp}.${raw}`);
  return sent.some((s) => safeEqual(expected, s));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  // Stripe is the default rail; ?p= still selects the others.
  const provider = new URL(req.url).searchParams.get('p') ?? 'stripe';
  const raw = await req.text();

  // ── 1 · prove it really came from the provider ──────────────
  if (provider === 'paystack') {
    const secret = Deno.env.get('PAYSTACK_SECRET');
    const sent = req.headers.get('x-paystack-signature') ?? '';
    if (!secret) return json({ ok: false, error: 'PAYSTACK_SECRET not set' }, 500);
    if (!safeEqual(await hmacSha512Hex(secret, raw), sent)) {
      return json({ ok: false, error: 'bad signature' }, 401);
    }
  } else if (provider === 'stripe') {
    if (!Deno.env.get('STRIPE_WEBHOOK_SECRET')) {
      return json({ ok: false, error: 'STRIPE_WEBHOOK_SECRET not set' }, 500);
    }
    if (!(await stripeVerified(req, raw))) {
      return json({ ok: false, error: 'bad signature' }, 401);
    }
  } else if (provider === 'paypal') {
    if (!(await paypalVerified(req, raw))) {
      return json({ ok: false, error: 'bad signature' }, 401);
    }
  } else if (provider === 'flutterwave') {
    const secret = Deno.env.get('FLW_SECRET_HASH');
    const sent = req.headers.get('verif-hash') ?? '';
    if (!secret) return json({ ok: false, error: 'FLW_SECRET_HASH not set' }, 500);
    if (!safeEqual(secret, sent)) return json({ ok: false, error: 'bad signature' }, 401);
  } else {
    return json({ ok: false, error: 'unknown provider' }, 400);
  }

  let body: any = {};
  try { body = JSON.parse(raw); } catch { return json({ ok: false, error: 'bad json' }, 400); }

  // ── 2 · only act on a completed charge ──────────────────────
  const event = String(body.event ?? body['event.type'] ?? '');
  const data = body.data ?? {};
  const status = String(data.status ?? '').toLowerCase();
  const eventType = String(body.event_type ?? body.type ?? '');

  // Stripe wraps the payload in data.object and names the event in `type`.
  // Only 'completed' means the money actually moved — 'checkout.session
  // .created' or an async session that later fails must never grant.
  const stripeObj = provider === 'stripe' ? (data.object ?? {}) : {};
  const stripePaid =
    provider === 'stripe' &&
    (eventType === 'checkout.session.completed' ||
     eventType === 'checkout.session.async_payment_succeeded') &&
    String(stripeObj.payment_status ?? '').toLowerCase() === 'paid';

  const succeeded =
    stripePaid ||
    (provider === 'paystack' && event === 'charge.success') ||
    (provider === 'flutterwave' && (status === 'successful' || event === 'charge.completed')) ||
    (provider === 'paypal' && eventType === 'PAYMENT.CAPTURE.COMPLETED');
  if (!succeeded) {
    return json({
      ok: true,
      ignored: eventType || event || status,
      ...(provider === 'stripe' && eventType.startsWith('checkout.session')
        ? { payment_status: stripeObj.payment_status ?? null }
        : {}),
    });
  }

  // ── 3 · who paid, and for what ──────────────────────────────
  // PayPal carries our data in resource.custom_id as "ACADEMYID|PRODUCT"
  const resource = body.resource ?? {};
  const custom = String(resource.custom_id ?? resource.invoice_id ?? '');
  const [ppAcademy, ppProduct] = custom.includes('|') ? custom.split('|') : [custom, ''];

  // Stripe carries it in client_reference_id, same "ACADEMYID|PRODUCT"
  // shape, with metadata as the backup if that is ever missing.
  const sRef = String(stripeObj.client_reference_id ?? '');
  const [sAcademy, sProduct] = sRef.includes('|') ? sRef.split('|') : [sRef, ''];
  const sMeta = stripeObj.metadata ?? {};

  const meta = data.metadata ?? data.meta ?? {};
  const academyId = String(
    sAcademy || sMeta.academy_id ||
    ppAcademy || meta.academy_id || meta.academyId || data.customer?.name || '',
  ).toUpperCase().trim();
  const product = String(
    sProduct || sMeta.product ||
    ppProduct || meta.product || meta.product_code || '',
  ).toUpperCase().trim();
  const reference = String(
    // the PaymentIntent is the stable money-moved id; the session id is
    // the fallback. Either way it is unique per purchase, which is what
    // the idempotency check below depends on.
    stripeObj.payment_intent ?? stripeObj.id ??
    resource.id ?? data.reference ?? data.tx_ref ?? data.id ?? '',
  );

  const sb = service();

  // idempotent: providers retry, and a retry must not extend a pass twice
  const { data: seen } = await sb
    .from('ledger').select('id').eq('ref', reference).limit(1).maybeSingle();
  if (seen) return json({ ok: true, duplicate: true, reference });

  if (!academyId || !product) {
    // money arrived but we cannot match it — never silently drop it
    await sb.from('contact_messages').insert({
      handle: 'PAYMENT', academy_id: academyId || null, kind: 'bug',
      body: `UNMATCHED PAYMENT · ${provider} · ref ${reference} · ` +
            `academy_id="${academyId}" product="${product}" · ` +
            `amount ${data.amount ?? '?'} ${data.currency ?? ''}`,
    });
    return json({ ok: false, error: 'missing academy_id or product', reference }, 202);
  }

  // ── 4 · grant it — same path as the Founder Desk ────────────
  const { data: granted, error } = await sb.rpc('grant_tier', {
    p_academy: academyId,
    p_product: product,
    p_ref: reference,
  });

  if (error) {
    await sb.from('contact_messages').insert({
      handle: 'PAYMENT', academy_id: academyId, kind: 'bug',
      body: `PAYMENT RECEIVED BUT NOT GRANTED · ${academyId} · ${product} · ` +
            `ref ${reference} · ${error.message}`,
    });
    return json({ ok: false, error: error.message, reference }, 202);
  }

  const row = Array.isArray(granted) ? granted[0] : granted;

  // paying clears the removal deadline
  await sb.from('profiles').update({ deadline_at: null }).eq('academy_id', academyId);

  await sb.rpc('audit', {
    p_action: 'auto_payment',
    p_target: academyId,
    p_detail: { provider, product, reference, tier: row?.tier, expiresAt: row?.expires_at },
  });

  return json({ ok: true, academyId, tier: row?.tier, expiresAt: row?.expires_at });
});
