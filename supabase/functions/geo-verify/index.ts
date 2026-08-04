// GEO-VERIFY — soft IP → country lookup for pricing enforcement.
// Never blocks entry; marks geo_uncertain when the signal is weak/VPN-like.
// Founder Desk can override. Nigeria shelf only when country_code = NG.
import { createClient } from 'jsr:@supabase/supabase-js@2';

export const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, x-founder-key, x-forwarded-for, cf-ipcountry',
  'access-control-allow-methods': 'POST, OPTIONS',
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors },
  });

const service = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  const auth = req.headers.get('authorization') ?? '';
  const anon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { authorization: auth } } },
  );
  const { data: { user } } = await anon.auth.getUser();
  if (!user) return json({ ok: false, error: 'auth required' }, 401);

  const body = await req.json().catch(() => ({}));
  // Prefer edge-provided country (Cloudflare / Supabase) over client claim
  const headerCountry = (req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country') || '')
    .toUpperCase()
    .trim();
  const claimedCode = String(body.countryCode ?? '').toUpperCase().trim().slice(0, 2);
  const claimedCountry = String(body.country ?? '').trim().slice(0, 40);

  let code = headerCountry && headerCountry !== 'XX' && headerCountry !== 'T1' ? headerCountry : claimedCode;
  let uncertain = false;
  let source = headerCountry && headerCountry !== 'XX' ? 'ip' : 'manual';

  // Cloudflare T1 = tor; XX = unknown
  if (headerCountry === 'T1' || headerCountry === 'XX' || !code) {
    uncertain = true;
    source = headerCountry === 'T1' ? 'vpn' : source;
    code = claimedCode || code;
  }

  // mismatch between claim and IP → uncertain, prefer IP for pricing
  if (headerCountry && claimedCode && headerCountry !== claimedCode && headerCountry !== 'XX' && headerCountry !== 'T1') {
    uncertain = true;
    code = headerCountry;
    source = 'ip';
  }

  const sb = service();
  let geo = null;
  try { ({ data: geo } = await sb.rpc('geo_for_country', { p_code: code })); } catch (_) {}
  let price = null;
  try { ({ data: price } = await sb.rpc('pricing_region_for', { p_code: code, p_geo: geo ?? 'unset' })); } catch (_) {}

  const pricingRegion = price === 'africa' || price === 'world' ? price : (geo === 'africa' || geo === 'world' ? geo : 'unset');

  await sb.from('profiles').update({
    country: claimedCountry || null,
    country_code: code || null,
    region: pricingRegion === 'unset' ? 'world' : pricingRegion,
    geo_verified: source === 'ip' && !uncertain,
    geo_source: source,
    geo_uncertain: uncertain,
  }).eq('auth_user_id', user.id);

  return json({
    ok: true,
    countryCode: code || null,
    pricingRegion: pricingRegion === 'unset' ? 'world' : pricingRegion,
    verified: source === 'ip' && !uncertain,
    uncertain,
    source,
    // Nigeria naira shelf is locked to NG only
    nigeriaPricing: code === 'NG',
    note: uncertain
      ? 'LOCATION UNCERTAIN — WORLD PRICING APPLIES UNTIL THE FOUNDER CONFIRMS.'
      : code === 'NG'
        ? 'NIGERIA PRICING UNLOCKED.'
        : 'WORLD PRICING APPLIES.',
  });
});