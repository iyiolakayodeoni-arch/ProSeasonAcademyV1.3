// ADMIN-SUMMARY — the Founder Desk's live page. One key check, one SQL
// rollup, plus the till's go-live state resolved here (server clock).
import { json } from '../_shared/cors.ts';
import { service, founderOk } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST' && req.method !== 'GET') return json({ ok: false, error: 'method' }, 405);
  if (!founderOk(req)) return json({ ok: false, error: 'founder key required' }, 403);

  const sb = service();
  const { data, error } = await sb.rpc('admin_rollup');
  if (error) return json({ ok: false, error: String(error.message) }, 500);
  const { data: gl } = await sb.from('config').select('value').eq('key', 'go_live').maybeSingle();
  const goLive = gl?.value ?? null;
  return json({ ...data, goLive, tillLive: goLive ? Date.now() >= Date.parse(goLive) : false });
});
