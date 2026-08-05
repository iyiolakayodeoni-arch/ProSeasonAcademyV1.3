// FOUNDER-DESK — the running-the-academy actions, all behind one key.
// Reading the private inbox, replying to a member, granting packs/passes,
// and muting/removing someone. Every call is key-checked and written to
// audit_log, so there is a trace of every founder move.
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ── helpers, inlined on purpose ──────────────────────────────
// The Supabase DASHBOARD deploys one file and cannot resolve
// '../_shared/...'. Keeping these here means this file deploys
// by copy-paste as well as by CLI. Do not re-extract them.
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

/** service-role client — bypasses RLS, lives only inside functions */
export const service = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

/** every founder move proves the key — same single-secret model as before */
export const founderOk = async (req: Request) => {
  // Authorization is the Supabase identity + profiles.is_founder.
  // FOUNDER_KEY is never required on the client and is not checked here.
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const sb = service();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return false;
  const { data: profile } = await sb.from('profiles').select('is_founder').eq('auth_user_id', user.id).maybeSingle();
  return profile?.is_founder === true;
}

export const cleanHandle = (raw: unknown): string => {
  const base = String(raw || '').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 14);
  return base || `PLAYER${Math.floor(1000 + Math.random() * 9000)}`;
};
// ── end helpers ──────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (!(await founderOk(req))) return json({ ok: false, error: 'founder key required' }, 403);

  const sb = service();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? '');

  const audit = (target: string | null, detail: unknown) =>
    sb.rpc('audit', { p_action: action, p_target: target, p_detail: detail ?? null });

  switch (action) {
    // ── THE INBOX ────────────────────────────────────────────
    case 'inbox': {
      const onlyUnread = body.unread === true;
      let q = sb
        .from('contact_messages')
        .select('id, handle, academy_id, kind, body, at, read, replied, reply')
        .order('at', { ascending: false })
        .limit(Math.min(Number(body.limit) || 40, 100));
      if (onlyUnread) q = q.eq('read', false);
      const { data, error } = await q;
      if (error) return json({ ok: false, error: error.message }, 500);
      const { count } = await sb
        .from('contact_messages')
        .select('id', { count: 'exact', head: true })
        .eq('read', false);
      return json({ ok: true, messages: data ?? [], unread: count ?? 0 });
    }

    case 'reply': {
      const id = Number(body.id);
      const text = String(body.reply ?? '').trim().slice(0, 2000);
      if (!id || !text) return json({ ok: false, error: 'id + reply required' }, 400);
      const { error } = await sb
        .from('contact_messages')
        .update({ reply: text, replied: true, read: true })
        .eq('id', id);
      if (error) return json({ ok: false, error: error.message }, 500);
      await audit(String(id), { reply: text.slice(0, 120) });
      return json({ ok: true });
    }

    case 'mark_read': {
      const id = Number(body.id);
      if (!id) return json({ ok: false, error: 'id required' }, 400);
      await sb.from('contact_messages').update({ read: true }).eq('id', id);
      return json({ ok: true });
    }

    // ── PACKS — credits + the tricks inside, in one move ─────
    case 'grant_pack': {
      const academyId = String(body.academyId ?? '').toUpperCase().trim();
      const pack = String(body.pack ?? '').toUpperCase().trim();
      if (!academyId || !pack) return json({ ok: false, error: 'academyId + pack required' }, 400);
      const { data, error } = await sb.rpc('grant_pack', {
        p_academy: academyId,
        p_pack: pack,
        p_ref: body.ref ? String(body.ref).slice(0, 60) : null,
      });
      if (error) {
        const msg = String(error.message);
        const known = msg.includes('unknown academy id') || msg.includes('unknown or inactive pack');
        return json({ ok: false, error: known ? msg : 'grant failed' }, known ? 404 : 500);
      }
      await audit(academyId, { pack, balance: data });
      return json({ ok: true, academyId, pack, balance: data });
    }

    case 'packs': {
      const { data: prods, error } = await sb
        .from('products')
        .select('code, title, region, credits, plan, price, sort')
        .eq('active', true)
        .order('sort');
      if (error) return json({ ok: false, error: error.message }, 500);
      const { data: items } = await sb.from('pack_items').select('pack_code, item, sort').order('sort');
      const byPack: Record<string, string[]> = {};
      for (const it of items ?? []) {
        (byPack[it.pack_code] ??= []).push(it.item);
      }
      return json({
        ok: true,
        packs: (prods ?? []).map((p) => ({ ...p, items: byPack[p.code] ?? [] })),
      });
    }

    case 'pack_set_items': {
      const pack = String(body.pack ?? '').toUpperCase().trim();
      const items: string[] = Array.isArray(body.items) ? body.items.map(String) : [];
      if (!pack) return json({ ok: false, error: 'pack required' }, 400);
      await sb.from('pack_items').delete().eq('pack_code', pack);
      if (items.length) {
        const rows = items.map((item, i) => ({ pack_code: pack, item, sort: i + 1 }));
        const { error } = await sb.from('pack_items').insert(rows);
        if (error) return json({ ok: false, error: error.message }, 500);
      }
      await audit(pack, { items });
      return json({ ok: true, pack, items });
    }

    // ── TIER PASSES — the same ladder in both currencies ─────
    case 'grant_tier': {
      const academyId = String(body.academyId ?? '').toUpperCase().trim();
      const product = String(body.product ?? '').toUpperCase().trim();
      if (!academyId || !product) return json({ ok: false, error: 'academyId + product required' }, 400);
      const { data, error } = await sb.rpc('grant_tier', {
        p_academy: academyId,
        p_product: product,
        p_ref: body.ref ? String(body.ref).slice(0, 60) : null,
      });
      if (error) {
        const m = String(error.message);
        if (m.includes('ACTIVE_HIGHER_TIER')) {
          return json({ ok: false, error: 'They already hold a higher, still-active pass.' }, 409);
        }
        const known = m.includes('unknown academy id') || m.includes('unknown or non-tier product');
        return json({ ok: false, error: known ? m : 'grant failed' }, known ? 404 : 500);
      }
      const row = Array.isArray(data) ? data[0] : data;
      await audit(academyId, { product, tier: row?.tier, expiresAt: row?.expires_at });
      return json({ ok: true, academyId, tier: row?.tier, expiresAt: row?.expires_at });
    }

    case 'members': {
      const { data, error } = await sb
        .from('profiles')
        .select('handle, academy_id, region, status, created_at')
        .neq('academy_id', 'PSA-FOUNDER')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) return json({ ok: false, error: error.message }, 500);
      const { data: ents } = await sb.from('entitlements').select('academy_id, tier, expires_at');
      const byId: Record<string, { tier: string; expires_at: string | null }> = {};
      for (const e of ents ?? []) byId[e.academy_id] = { tier: e.tier, expires_at: e.expires_at };
      const now = Date.now();
      return json({
        ok: true,
        members: (data ?? []).map((m) => {
          const e = byId[m.academy_id];
          const live = e?.expires_at ? Date.parse(e.expires_at) > now : e?.tier === 'free';
          return { ...m, tier: live ? (e?.tier ?? 'free') : 'free', expires_at: e?.expires_at ?? null };
        }),
      });
    }

    case 'benchmark_cards': {
      const limit = Math.min(Math.max(Number(body.limit) || 24, 1), 100);
      const { data, error } = await sb.rpc('founder_benchmark_cards', { p_limit: limit });
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, cards: data ?? [] });
    }

    // ── THE FREE WEEK + LAPSED SEATS ─────────────────────────
    case 'grant_trial': {
      const { data, error } = await sb.rpc('grant_trial', {
        p_days: body.days ? Number(body.days) : null,
        p_tier: body.tier ? String(body.tier) : null,
      });
      if (error) return json({ ok: false, error: error.message }, 500);
      await audit('ALL', { granted: data, days: body.days ?? null });
      return json({ ok: true, granted: data ?? 0 });
    }

    case 'lapsed': {
      const { data, error } = await sb.rpc('lapsed_members');
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, lapsed: data ?? [] });
    }

    // ── THE PRICING TABLE ────────────────────────────────────
    case 'consult_results': {
      const { data, error } = await sb.rpc('consult_results');
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, results: data ?? [] });
    }

    case 'consult_close': {
      const { error } = await sb.from('consult_questions').update({ open: false }).eq('open', true);
      if (error) return json({ ok: false, error: error.message }, 500);
      await audit('ALL', { closed: true });
      return json({ ok: true });
    }

    // ── ENFORCEMENT ──────────────────────────────────────────
    case 'sweep': {
      const { data, error } = await sb.rpc('sweep_unpaid');
      if (error) return json({ ok: false, error: error.message }, 500);
      await audit('ALL', { removed: (data ?? []).length });
      return json({ ok: true, removed: data ?? [] });
    }

    case 'flags': {
      const { data, error } = await sb
        .from('flagged_messages')
        .select('id, handle, academy_id, channel, text, matched, at, reviewed')
        .eq('reviewed', false)
        .order('at', { ascending: false })
        .limit(50);
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, flags: data ?? [] });
    }

    case 'flag_review': {
      const id = Number(body.id);
      if (!id) return json({ ok: false, error: 'id required' }, 400);
      await sb.from('flagged_messages')
        .update({ reviewed: true, action: String(body.decision ?? 'noted') }).eq('id', id);
      return json({ ok: true });
    }

    case 'strike': {
      const academyId = String(body.academyId ?? '').toUpperCase().trim();
      if (!academyId) return json({ ok: false, error: 'academyId required' }, 400);
      const { data, error } = await sb.rpc('add_strike', {
        p_academy: academyId,
        p_reason: String(body.reason ?? 'CONDUCT').slice(0, 120),
        p_detail: body.detail ? String(body.detail).slice(0, 500) : null,
        p_severity: body.severity === 'severe' ? 'severe' : 'warning',
        p_founder: true,
      });
      if (error) return json({ ok: false, error: error.message }, 500);
      await audit(academyId, { strikes: data, reason: body.reason });
      return json({ ok: true, strikes: data });
    }

    case 'remove': {
      const academyId = String(body.academyId ?? '').toUpperCase().trim();
      if (!academyId) return json({ ok: false, error: 'academyId required' }, 400);
      const { data, error } = await sb.rpc('remove_member', {
        p_academy: academyId,
        p_reason: String(body.reason ?? 'REMOVED BY THE FOUNDER').slice(0, 120),
      });
      if (error) return json({ ok: false, error: error.message }, 500);
      const r = data as any;
      if (!r?.ok) return json({ ok: false, error: r?.error ?? 'failed' }, 404);
      return json({ ok: true, refundDays: r.refundDays, tier: r.tier, note: r.note });
    }

    // ── PAYMENT CLAIMS ───────────────────────────────────────
    case 'claims': {
      const { data, error } = await sb
        .from('payment_claims')
        .select('id, academy_id, handle, product, method, reference, amount, sender_note, status, at')
        .eq('status', 'pending')
        .order('at', { ascending: true })
        .limit(50);
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, claims: data ?? [] });
    }

    // People whose card was refused. They are trying to give you money
    // and failing, so they sit above the general inbox — every one of
    // these is a sale you still have if you answer today.
    case 'stuck': {
      const { data, error } = await sb.rpc('stuck_payments');
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, stuck: data ?? [] });
    }

    case 'decide_claim': {
      const id = Number(body.id);
      if (!id) return json({ ok: false, error: 'id required' }, 400);
      const { data, error } = await sb.rpc('decide_claim', {
        p_id: id,
        p_approve: body.approve === true,
        p_note: body.note ? String(body.note).slice(0, 300) : null,
      });
      if (error) return json({ ok: false, error: error.message }, 500);
      const r = data as any;
      if (!r?.ok) return json({ ok: false, error: r?.error ?? 'failed' }, 400);
      return json({ ok: true, approved: r.approved, tier: r.tier });
    }

    // ── THE DOOR + THE SEASON ────────────────────────────────
    case 'set_config': {
      const key = String(body.key ?? '');
      const value = String(body.value ?? '');
      const ALLOWED = [
        'seat_cap', 'season_name', 'go_live',
        'free_stages', 'mid_stages', 'stage_unlock_cost', 'trick_unlock_cost',
        'tricks_min_tier', 'filmroom_min_tier',
        'trial_tier', 'trial_days', 'grace_days', 'lapsed_seat_days', 'paid_only',
        'existing_grace_days', 'strikes_to_remove', 'auto_remove', 'tos_version',
        'founder_week_start', 'founder_week_end', 'founder_week_note',
      ];
      if (!ALLOWED.includes(key)) return json({ ok: false, error: 'key not allowed' }, 400);
      const { error } = await sb.from('config').upsert({ key, value });
      if (error) return json({ ok: false, error: error.message }, 500);
      await audit(key, { value });
      return json({ ok: true, key, value });
    }

    case 'config': {
      const { data, error } = await sb.from('config').select('key, value');
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, config: Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) });
    }

    // ── MEMBERS ──────────────────────────────────────────────
    case 'set_status': {
      const academyId = String(body.academyId ?? '').toUpperCase().trim();
      const status = String(body.status ?? '');
      if (!academyId) return json({ ok: false, error: 'academyId required' }, 400);
      const { data, error } = await sb.rpc('set_member_status', {
        p_academy: academyId, p_status: status,
      });
      if (error) return json({ ok: false, error: error.message }, 500);
      await audit(academyId, { status });
      return json({ ok: true, changed: data === true });
    }

    default:
      return json({ ok: false, error: 'unknown action' }, 400);
  }
});
