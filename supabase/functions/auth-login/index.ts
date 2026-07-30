// AUTH-LOGIN — email/password sign-in with clear error codes.
// Also used after password reset. Returns profile + academy token.
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

const mapLoginError = (msg: string): string => {
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('wrong password'))
    return 'BAD_CREDENTIALS';
  if (m.includes('email not confirmed') || m.includes('not confirmed'))
    return 'EMAIL_NOT_CONFIRMED';
  if (m.includes('rate') || m.includes('too many'))
    return 'RATE_LIMITED';
  if (m.includes('user not found') || m.includes('no user'))
    return 'NO_ACCOUNT';
  return 'LOGIN_FAILED';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!email || !password) return json({ ok: false, error: 'MISSING_FIELDS' }, 400);

  const anon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );

  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    return json({ ok: false, error: mapLoginError(String(error?.message ?? 'failed')) }, 401);
  }

  const sb = service();
  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('auth_user_id', data.user.id)
    .maybeSingle();

  if (!profile) {
    return json({ ok: false, error: 'NO_PROFILE' }, 404);
  }
  if (profile.status === 'removed') {
    return json({ ok: false, error: 'ACCOUNT_REMOVED' }, 403);
  }

  // patch email onto profile if missing (legacy seats)
  if (!profile.email) {
    await sb.from('profiles').update({ email }).eq('id', profile.id);
  }

  return json({
    ok: true,
    academyToken: profile.academy_id,
    isFounder: profile.is_founder === true,
    profile,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  });
});
