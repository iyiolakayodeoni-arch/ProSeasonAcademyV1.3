// FOUNDER-DESK — the running-the-academy actions, all behind one key.
// Reading the private inbox, replying to a member, issuing and revoking
// invite codes, and muting/removing someone. Every call is key-checked
// and written to audit_log, so there is a trace of every founder move.
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
export const founderOk = (req: Request) =>
  !!Deno.env.get('FOUNDER_KEY') && req.headers.get('x-founder-key') === Deno.env.get('FOUNDER_KEY');

export const cleanHandle = (raw: unknown): string => {
  const base = String(raw || '').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 14);
  return base || `PLAYER${Math.floor(1000 + Math.random() * 9000)}`;
};
// ── end helpers ──────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (!founderOk(req)) return json({ ok: false, error: 'founder key required' }, 403);

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

    // ── INVITES ──────────────────────────────────────────────
    case 'invites': {
      const { data, error } = await sb
        .from('invites')
        .select('code, label, uses, max_uses, expires_at, revoked, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, invites: data ?? [] });
    }

    case 'invite_create': {
      const label = String(body.label ?? '').slice(0, 60) || null;
      const maxUses = Math.max(1, Math.min(Number(body.maxUses) || 1, 500));
      const days = Number(body.expiresDays) || 0;
      const expires = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;

      // readable, unambiguous codes — no O/0/I/1 confusion when spoken aloud
      const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const gen = () =>
        'PSA-' +
        Array.from(crypto.getRandomValues(new Uint8Array(6)))
          .map((b) => ALPHABET[b % ALPHABET.length])
          .join('');

      let code = '';
      for (let i = 0; i < 8; i++) {
        code = gen();
        const { data: clash } = await sb.from('invites').select('code').eq('code', code).maybeSingle();
        if (!clash) break;
      }
      const { error } = await sb.from('invites').insert({
        code, label, max_uses: maxUses, expires_at: expires,
      });
      if (error) return json({ ok: false, error: error.message }, 500);
      await audit(code, { label, maxUses, expires });
      return json({ ok: true, code, label, maxUses, expiresAt: expires });
    }

    case 'invite_revoke': {
      const code = String(body.code ?? '').toUpperCase().trim();
      if (!code) return json({ ok: false, error: 'code required' }, 400);
      const { error } = await sb.from('invites').update({ revoked: true }).eq('code', code);
      if (error) return json({ ok: false, error: error.message }, 500);
      await audit(code, { revoked: true });
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
        'invite_only', 'seat_cap', 'season_name', 'go_live',
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
