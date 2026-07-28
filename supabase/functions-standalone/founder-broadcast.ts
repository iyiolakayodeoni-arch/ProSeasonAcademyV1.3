// ─────────────────────────────────────────────────────────────
// SELF-CONTAINED VERSION — paste this straight into the Supabase
// dashboard. The _shared helpers are inlined below, so there is no
// ../_shared/ import to resolve and no extra files to create.
// Generated from supabase/functions/<name>/index.ts — edit that
// original, then re-generate; do not hand-edit this copy.
// ─────────────────────────────────────────────────────────────
// FOUNDER-BROADCAST — posts into any room wearing the FOUNDER badge.
// kind='founder' inserts are RLS-blocked from phones; only the key opens
// this function, so the badge is physically unforgeable from the app.
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ── inlined from _shared/cors.ts ─────────────────────────────
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
// ── inlined from _shared/admin.ts ────────────────────────────
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
// ── end of inlined helpers ───────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (!founderOk(req)) return json({ ok: false, error: 'founder key required' }, 403);

  const { slug, text } = await req.json().catch(() => ({}));
  const clean = String(text ?? '').trim().slice(0, 500);
  if (!clean) return json({ ok: false, error: 'empty message' }, 400);

  const sb = service();
  const { data: ch } = await sb.from('channels').select('slug').eq('slug', String(slug ?? '')).maybeSingle();
  if (!ch) return json({ ok: false, error: 'unknown room' }, 400);
  const { data: founder } = await sb.from('profiles').select('id').eq('academy_id', 'PSA-FOUNDER').single();
  const { data: message, error } = await sb
    .from('messages')
    .insert({ channel_slug: ch.slug, user_id: founder.id, handle: 'FOUNDER', academy_id: 'PSA-FOUNDER', kind: 'founder', text: clean })
    .select().single();
  if (error) return json({ ok: false, error: String(error.message) }, 500);
  return json({ ok: true, message });
});
