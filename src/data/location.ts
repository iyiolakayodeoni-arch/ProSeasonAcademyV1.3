// ─────────────────────────────────────────────────────────────
// LOCATION + COUNTRY PRICING
// Nigeria naira shelf is NG-only. Soft IP verify marks uncertainty.
// Founder override lives on the Desk. Till stays closed until opened.
// ─────────────────────────────────────────────────────────────

import { supabase } from './supabaseClient';
import { PSA_SUPABASE_ANON_KEY, PSA_SUPABASE_URL } from '../config';
import { GeoRegion } from './settings';

export type CountryOption = {
  label: string;
  code: string; // ISO-2
  geo: Exclude<GeoRegion, 'unset'>;
  /** only NG unlocks the nigeria naira shelf */
  nigeriaShelf: boolean;
};

export const COUNTRY_OPTIONS: CountryOption[] = [
  { label: 'NIGERIA', code: 'NG', geo: 'africa', nigeriaShelf: true },
  { label: 'GHANA', code: 'GH', geo: 'africa', nigeriaShelf: false },
  { label: 'KENYA', code: 'KE', geo: 'africa', nigeriaShelf: false },
  { label: 'EGYPT', code: 'EG', geo: 'africa', nigeriaShelf: false },
  { label: 'SOUTH AFRICA', code: 'ZA', geo: 'africa', nigeriaShelf: false },
  { label: 'REST OF AFRICA', code: 'AF', geo: 'africa', nigeriaShelf: false },
  { label: 'UK & IRELAND', code: 'GB', geo: 'world', nigeriaShelf: false },
  { label: 'EUROPE', code: 'EU', geo: 'world', nigeriaShelf: false },
  { label: 'USA & CANADA', code: 'US', geo: 'world', nigeriaShelf: false },
  { label: 'ASIA', code: 'AS', geo: 'world', nigeriaShelf: false },
  { label: 'REST OF WORLD', code: 'XX', geo: 'world', nigeriaShelf: false },
];

export function optionForLabel(label: string | null | undefined): CountryOption | null {
  if (!label) return null;
  return COUNTRY_OPTIONS.find((o) => o.label === label) ?? null;
}

/** what pricing shelf this country unlocks (client-side mirror of SQL) */
export function pricingRegionFor(code: string, geo: string): 'africa' | 'world' | 'unset' {
  const c = code.toUpperCase();
  if (c === 'NG') return 'africa';
  if (geo === 'africa' && c !== 'NG') return 'world';
  if (geo === 'africa') return 'africa';
  if (geo === 'world') return 'world';
  return 'unset';
}

export interface GeoVerifyResult {
  ok: boolean;
  countryCode: string | null;
  pricingRegion: 'africa' | 'world' | 'unset';
  verified: boolean;
  uncertain: boolean;
  nigeriaPricing: boolean;
  note: string;
}

/** soft IP verify after sign-in — never blocks entry */
export async function verifyLocation(input: {
  country: string;
  countryCode: string;
}): Promise<GeoVerifyResult | null> {
  if (!supabase || !PSA_SUPABASE_URL) return null;
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) return null;

    const res = await fetch(`${PSA_SUPABASE_URL}/functions/v1/geo-verify`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: PSA_SUPABASE_ANON_KEY,
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        country: input.country,
        countryCode: input.countryCode,
      }),
    });
    const j = await res.json().catch(() => null);
    if (!j?.ok) return null;
    return {
      ok: true,
      countryCode: j.countryCode ?? null,
      pricingRegion: j.pricingRegion ?? 'world',
      verified: j.verified === true,
      uncertain: j.uncertain === true,
      nigeriaPricing: j.nigeriaPricing === true,
      note: String(j.note ?? ''),
    };
  } catch {
    return null;
  }
}

export async function setMyLocationRpc(input: {
  country: string;
  countryCode: string;
  source?: string;
  uncertain?: boolean;
}): Promise<GeoVerifyResult | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('set_my_location', {
      p_country: input.country,
      p_country_code: input.countryCode,
      p_source: input.source ?? 'manual',
      p_uncertain: input.uncertain ?? false,
    });
    if (error || !data?.ok) return null;
    return {
      ok: true,
      countryCode: data.countryCode ?? null,
      pricingRegion: data.pricingRegion ?? 'world',
      verified: data.verified === true,
      uncertain: data.uncertain === true,
      nigeriaPricing: (data.countryCode ?? '') === 'NG',
      note: '',
    };
  } catch {
    return null;
  }
}

/** till stays closed until founder opens payments */
export async function isTillClosed(): Promise<boolean> {
  if (!supabase) return true;
  try {
    const { data } = await supabase
      .from('config')
      .select('key, value')
      .in('key', ['till_closed', 'go_live']);
    const cfg = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
    if (String(cfg.till_closed ?? 'true') === 'true') return true;
    if (!cfg.go_live) return true;
    const t = Date.parse(cfg.go_live);
    if (!Number.isFinite(t)) return true;
    return Date.now() < t;
  } catch {
    return true;
  }
}
