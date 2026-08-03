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
  const anon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { authorization: auth } } },
  );
  const { data: { user }, error: uerr } = await anon.auth.getUser();
  if (uerr || !user) return json({ ok: false, error: 'auth required' }, 401);

  const sb = service();
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