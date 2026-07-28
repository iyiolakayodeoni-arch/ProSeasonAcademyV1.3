// PAY-WEBHOOK — payments grant access automatically.
//
// The founder: "the payment should be automatic i dont have the time
// to be validating payments."
//
// Paystack (₦) and Flutterwave ($/international) both POST here when a
// charge succeeds. We verify the signature, look up what was bought,
// and call grant_tier — the same function the Founder Desk uses, so
// there is exactly one way access is granted and one audit trail.
//
// SETUP (once per provider):
//   Paystack     → Settings → API Keys & Webhooks → Webhook URL:
//                  https://<project>.supabase.co/functions/v1/pay-webhook?p=paystack
//                  Secret: PAYSTACK_SECRET
//   Flutterwave  → Settings → Webhooks → same URL with ?p=flutterwave
//                  Secret: FLW_SECRET_HASH
//
// The member's Academy ID must ride along on the payment. Put it in
// the payment link's metadata/reference as `academy_id`, and the
// product code as `product`. The app's till shows the member their ID
// precisely so they can paste it at checkout.
import { json } from '../_shared/cors.ts';
import { service } from '../_shared/admin.ts';

/** constant-time compare so a signature cannot be guessed by timing */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha512Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  const provider = new URL(req.url).searchParams.get('p') ?? 'paystack';
  const raw = await req.text();

  // ── 1 · prove it really came from the provider ──────────────
  if (provider === 'paystack') {
    const secret = Deno.env.get('PAYSTACK_SECRET');
    const sent = req.headers.get('x-paystack-signature') ?? '';
    if (!secret) return json({ ok: false, error: 'PAYSTACK_SECRET not set' }, 500);
    if (!safeEqual(await hmacSha512Hex(secret, raw), sent)) {
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
  const succeeded =
    (provider === 'paystack' && event === 'charge.success') ||
    (provider === 'flutterwave' && (status === 'successful' || event === 'charge.completed'));
  if (!succeeded) return json({ ok: true, ignored: event || status });

  // ── 3 · who paid, and for what ──────────────────────────────
  const meta = data.metadata ?? data.meta ?? {};
  const academyId = String(
    meta.academy_id ?? meta.academyId ?? data.customer?.name ?? '',
  ).toUpperCase().trim();
  const product = String(meta.product ?? meta.product_code ?? '').toUpperCase().trim();
  const reference = String(data.reference ?? data.tx_ref ?? data.id ?? '');

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
