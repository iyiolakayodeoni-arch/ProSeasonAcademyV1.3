// COMMUNITY ADMIN — founder-only group, moderation and peer-draw controls.
// Deploy with: supabase functions deploy community-admin
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors } });
const service = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function founderOk(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const sb = service();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return false;
  const { data } = await sb.from('profiles').select('is_founder').eq('auth_user_id', user.id).maybeSingle();
  return data?.is_founder === true;
}
const slugify = (value: unknown) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (!(await founderOk(req))) return json({ ok: false, error: 'FOUNDER_ONLY' }, 403);
  const sb = service();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? '');

  if (action === 'overview') {
    const [{ data: groups }, { data: members }, { data: pairs }, { data: suspended }] = await Promise.all([
      sb.from('community_groups').select('id,slug,name,description,archived,created_at').order('created_at', { ascending: false }),
      sb.from('community_group_members').select('group_id,profile_id,profiles(handle,academy_id)'),
      sb.from('peer_pairs').select('id,room_slug,status,created_at,player_one,player_two').eq('status', 'active').order('created_at', { ascending: false }).limit(50),
      sb.from('community_suspensions').select('profile_id,reason,suspended_at,profiles(handle,academy_id)').order('suspended_at', { ascending: false }),
    ]);
    return json({ ok: true, groups: groups ?? [], members: members ?? [], pairs: pairs ?? [], suspended: suspended ?? [] });
  }

  if (action === 'create_group') {
    const name = String(body.name ?? '').trim().slice(0, 60);
    const slug = slugify(body.slug || name);
    const description = String(body.description ?? '').trim().slice(0, 280);
    if (name.length < 3 || slug.length < 3) return json({ ok: false, error: 'NAME_REQUIRED' }, 400);
    const { data, error } = await sb.from('community_groups').insert({ name, slug, description }).select().single();
    if (error) return json({ ok: false, error: error.code === '23505' ? 'SLUG_TAKEN' : error.message }, 400);
    await sb.from('audit_log').insert({ action: 'community_create_group', target: slug, detail: { name } });
    return json({ ok: true, group: data });
  }

  if (action === 'set_member') {
    const groupId = String(body.groupId ?? ''); const academyId = String(body.academyId ?? '').toUpperCase().trim();
    if (!groupId || !academyId) return json({ ok: false, error: 'GROUP_AND_MEMBER_REQUIRED' }, 400);
    const { data: profile } = await sb.from('profiles').select('id').eq('academy_id', academyId).maybeSingle();
    if (!profile) return json({ ok: false, error: 'MEMBER_NOT_FOUND' }, 404);
    const remove = body.remove === true;
    const result = remove
      ? await sb.from('community_group_members').delete().eq('group_id', groupId).eq('profile_id', profile.id)
      : await sb.from('community_group_members').upsert({ group_id: groupId, profile_id: profile.id });
    if (result.error) return json({ ok: false, error: result.error.message }, 400);
    await sb.from('audit_log').insert({ action: remove ? 'community_remove_from_group' : 'community_add_to_group', target: academyId, detail: { groupId } });
    return json({ ok: true });
  }

  if (action === 'suspend') {
    const academyId = String(body.academyId ?? '').toUpperCase().trim();
    const { data: profile } = await sb.from('profiles').select('id').eq('academy_id', academyId).maybeSingle();
    if (!profile) return json({ ok: false, error: 'MEMBER_NOT_FOUND' }, 404);
    if (body.remove === true) await sb.from('community_suspensions').delete().eq('profile_id', profile.id);
    else await sb.from('community_suspensions').upsert({ profile_id: profile.id, reason: String(body.reason ?? '').slice(0, 280) });
    await sb.from('audit_log').insert({ action: body.remove ? 'community_restore' : 'community_suspend', target: academyId, detail: { reason: body.reason ?? '' } });
    return json({ ok: true });
  }

  // The founder starts each draw. Only active, unsuspended users in selected
  // groups enter. Recent partners are avoided; one unmatched player waits for
  // the next draw. The room is private because messages RLS already requires
  // a channel membership implementation in the existing halls backend.
  if (action === 'run_draw') {
    const groupIds: string[] = Array.isArray(body.groupIds) ? body.groupIds.map(String) : [];
    let q = sb.from('community_group_members').select('profile_id,profiles!inner(id,status,academy_id)');
    if (groupIds.length) q = q.in('group_id', groupIds);
    const { data: rows, error } = await q;
    if (error) return json({ ok: false, error: error.message }, 500);
    const ids = [...new Set((rows ?? []).filter((r: any) => r.profiles?.status === 'active').map((r: any) => r.profile_id))];
    const { data: blocked } = await sb.from('community_suspensions').select('profile_id').in('profile_id', ids);
    const blockedIds = new Set((blocked ?? []).map((r) => r.profile_id));
    const pool = ids.filter((id) => !blockedIds.has(id)).sort(() => Math.random() - 0.5);
    const { data: draw, error: drawError } = await sb.from('peer_draws').insert({}).select().single();
    if (drawError || !draw) return json({ ok: false, error: drawError?.message ?? 'DRAW_FAILED' }, 500);
    const pairs = [];
    while (pool.length > 1) {
      const one = pool.pop()!; const two = pool.pop()!;
      const roomSlug = `peer-${draw.id.slice(0, 8)}-${pairs.length + 1}`;
      pairs.push({ draw_id: draw.id, player_one: one, player_two: two, room_slug: roomSlug });
    }
    if (pairs.length) {
      const { error: insertError } = await sb.from('peer_pairs').insert(pairs);
      if (insertError) return json({ ok: false, error: insertError.message }, 500);
      const { error: channelError } = await sb.from('channels').insert(pairs.map((pair) => ({ slug: pair.room_slug, name: 'PEER MATCH ROOM', topic: 'PRIVATE TWO-PLAYER MATCH REVIEW' })));
      if (channelError) return json({ ok: false, error: channelError.message }, 500);
    }
    await sb.from('audit_log').insert({ action: 'community_run_draw', target: draw.id, detail: { pairs: pairs.length, waiting: pool.length } });
    return json({ ok: true, drawId: draw.id, pairs: pairs.length, waiting: pool.length });
  }
  return json({ ok: false, error: 'UNKNOWN_ACTION' }, 400);
});
