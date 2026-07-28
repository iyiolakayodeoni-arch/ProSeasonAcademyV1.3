// FOUNDER-DESK — the running-the-academy actions, all behind one key.
// Reading the private inbox, replying to a member, issuing and revoking
// invite codes, and muting/removing someone. Every call is key-checked
// and written to audit_log, so there is a trace of every founder move.
import { json } from '../_shared/cors.ts';
import { service, founderOk } from '../_shared/admin.ts';

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

    // ── THE DOOR + THE SEASON ────────────────────────────────
    case 'set_config': {
      const key = String(body.key ?? '');
      const value = String(body.value ?? '');
      const ALLOWED = [
        'invite_only', 'seat_cap', 'season_name', 'go_live',
        'free_stages', 'stage_unlock_cost', 'trick_unlock_cost',
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
