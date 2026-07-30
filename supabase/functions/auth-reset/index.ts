// AUTH-RESET — request a password-reset email, or complete a recovery.
import { createClient } from 'jsr:@supabase/supabase-js@2';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? 'request');
  const email = String(body.email ?? '').trim().toLowerCase();

  const anon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );

  if (action === 'request') {
    if (!email || !email.includes('@')) return json({ ok: false, error: 'INVALID_EMAIL' }, 400);
    // Always return ok — never confirm whether the email exists.
    const redirectTo = String(body.redirectTo ?? 'proseasonacademy://reset-password');
    await anon.auth.resetPasswordForEmail(email, { redirectTo }).catch(() => {});
    return json({ ok: true, message: 'IF THAT EMAIL HAS A SEAT, A RESET LINK IS ON ITS WAY.' });
  }

  if (action === 'update') {
    const password = String(body.password ?? '');
    if (password.length < 8) return json({ ok: false, error: 'WEAK_PASSWORD' }, 400);
    const auth = req.headers.get('authorization') ?? '';
    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { authorization: auth } } },
    );
    const { error } = await client.auth.updateUser({ password });
    if (error) return json({ ok: false, error: 'UPDATE_FAILED', detail: error.message }, 400);
    return json({ ok: true });
  }

  return json({ ok: false, error: 'unknown action' }, 400);
});
