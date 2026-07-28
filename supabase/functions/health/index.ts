import { json } from '../_shared/cors.ts';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  return json({ ok: true, at: Date.now() });
});
