// AUTH-DELETE — member self-service account wipe.
// Marks profile removed, then deletes the auth user (cascades profile).
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

const service = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  const auth = req.headers.get('authorization') ?? '';
  // Validate the caller's session with the SERVICE client, passing the token
  // explicitly (same pattern as founder-broadcast). This avoids the
  // apikey/header-forwarding gotchas of an anon client with custom headers.
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return json({ ok: false, error: 'auth required' }, 401);
  const sb = service();
  const { data: { user }, error: uerr } = await sb.auth.getUser(token);
  if (uerr || !user) return json({ ok: false, error: 'auth required' }, 401);

  const { data: profile } = await sb
    .from('profiles')
    .select('id, academy_id, is_founder')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile) return json({ ok: false, error: 'NO_PROFILE' }, 404);
  if (profile.is_founder || profile.academy_id === 'PSA-FOUNDER') {
    return json({ ok: false, error: 'FOUNDER_PROTECTED' }, 403);
  }

  try {
    await sb.rpc('delete_my_account');
  } catch (_) {
    await sb.from('profiles').update({ status: 'removed' }).eq('id', profile.id);
    await sb.from('push_tokens').delete().eq('user_id', profile.id);
  }

  // hard-delete the auth user (cascades remaining profile rows)
  const { error: derr } = await sb.auth.admin.deleteUser(user.id);
  if (derr) return json({ ok: false, error: 'DELETE_FAILED', detail: derr.message }, 500);

  return json({ ok: true });
});