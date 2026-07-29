// REFRESH-FX — pulls today's NGN/GBP rate into the database.
//
// Run it on a schedule (Supabase → Edge Functions → Cron, daily) or hit
// it by hand. It is deliberately boring: fetch, sanity-check, store.
//
// The rate source is free and needs no key. If it is unreachable we
// leave the old rate alone rather than guessing — price_now() flags
// anything older than fx_max_age_hours as stale, and the app falls
// back to the stored price rather than showing a number we cannot
// stand behind.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, x-founder-key',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors },
  });

const service = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

/** two sources; the second only if the first fails */
async function fetchRate(): Promise<{ rate: number; source: string } | null> {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/GBP');
    if (r.ok) {
      const j = await r.json();
      const ngn = Number(j?.rates?.NGN);
      if (j?.result === 'success' && ngn > 0) return { rate: ngn, source: 'er-api' };
    }
  } catch { /* try the next one */ }

  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=GBP&to=NGN');
    if (r.ok) {
      const j = await r.json();
      const ngn = Number(j?.rates?.NGN);
      if (ngn > 0) return { rate: ngn, source: 'frankfurter' };
    }
  } catch { /* give up cleanly */ }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);

  const got = await fetchRate();
  if (!got) {
    return json({ ok: false, error: 'no rate source reachable — keeping the old rate' }, 502);
  }

  const sb = service();
  const { data, error } = await sb.rpc('set_fx', { p_rate: got.rate, p_source: got.source });
  if (error) return json({ ok: false, error: error.message }, 500);

  // set_fx returns false when the move looks implausible (>25% in a day)
  if (data !== true) {
    return json({
      ok: false,
      rejected: true,
      rate: got.rate,
      note: 'move looked implausible — old rate kept, check the Founder Desk',
    }, 202);
  }

  // Re-cost the stored £ fallback for the Africa passes. PayPal cannot
  // charge naira, so those products carry a pence figure alongside the
  // naira headline; this keeps it in step with the rate we just wrote.
  // A failure here is not fatal — the old fallback is still valid.
  const { data: resynced, error: rerr } =
    await sb.rpc('resync_charge_amounts');

  return json({
    ok: true,
    pair: 'NGN/GBP',
    rate: got.rate,
    source: got.source,
    repriced: rerr ? null : resynced,
    ...(rerr ? { reprice_error: rerr.message } : {}),
  });
});
