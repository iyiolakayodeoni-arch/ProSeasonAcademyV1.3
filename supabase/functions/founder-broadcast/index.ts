// FOUNDER-BROADCAST — posts into any room wearing the FOUNDER badge.
// kind='founder' inserts are RLS-blocked from phones; only the key opens
// this function, so the badge is physically unforgeable from the app.
import { json } from '../_shared/cors.ts';
import { service, founderOk } from '../_shared/admin.ts';

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
