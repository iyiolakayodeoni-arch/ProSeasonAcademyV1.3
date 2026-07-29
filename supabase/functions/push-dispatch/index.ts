// PUSH-DISPATCH — drains notification_queue via Expo Push API.
// Call on a schedule (cron) or after founder publish. Service-role only
// (no JWT). Respects quiet hours + per-kind prefs on the token row.
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

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';

function inQuietHours(start: number | null, end: number | null, hourUtc: number): boolean {
  if (start == null || end == null) return false;
  if (start === end) return false;
  if (start < end) return hourUtc >= start && hourUtc < end;
  return hourUtc >= start || hourUtc < end; // wraps midnight
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  // cron / service: require shared secret OR founder session
  const cronSecret = Deno.env.get('PUSH_CRON_SECRET') ?? Deno.env.get('FOUNDER_KEY') ?? '';
  const provided = req.headers.get('x-cron-secret') ?? req.headers.get('x-founder-key') ?? '';
  if (!cronSecret || provided !== cronSecret) {
    return json({ ok: false, error: 'unauthorized' }, 403);
  }

  const sb = service();
  const { data: pending, error } = await sb
    .from('notification_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) return json({ ok: false, error: error.message }, 500);
  if (!pending?.length) return json({ ok: true, sent: 0, skipped: 0 });

  const hourUtc = new Date().getUTCHours();
  let sent = 0;
  let skipped = 0;

  for (const n of pending) {
    let tokensQuery = sb.from('push_tokens').select('token, prefs, quiet_start, quiet_end, academy_id');
    if (n.academy_id) tokensQuery = tokensQuery.eq('academy_id', n.academy_id);
    const { data: tokens } = await tokensQuery.limit(500);

    if (!tokens?.length) {
      await sb.from('notification_queue').update({ status: 'skipped', sent_at: new Date().toISOString() }).eq('id', n.id);
      skipped++;
      continue;
    }

    const messages: { to: string; title: string; body: string; data: Record<string, unknown>; sound: string }[] = [];
    for (const t of tokens) {
      if (inQuietHours(t.quiet_start, t.quiet_end, hourUtc)) continue;
      const prefs = (t.prefs ?? {}) as Record<string, boolean>;
      // kind → pref key
      const prefKey =
        n.kind === 'founder_announcement' ? 'founderAnnouncements'
          : n.kind === 'coach_lesson' ? 'coachMessages'
            : n.kind === 'match_scan' ? 'matchScanResults'
              : n.kind === 'news' ? 'fcMobileNews'
                : n.kind === 'group_session' ? 'groupSessions'
                  : null;
      if (prefKey && prefs[prefKey] === false) continue;
      messages.push({
        to: t.token,
        title: n.title,
        body: n.body,
        data: { ...(n.data ?? {}), deepLink: n.deep_link ?? n.data?.deepLink ?? null, kind: n.kind },
        sound: 'default',
      });
    }

    if (!messages.length) {
      await sb.from('notification_queue').update({ status: 'skipped', sent_at: new Date().toISOString() }).eq('id', n.id);
      skipped++;
      continue;
    }

    try {
      // Expo accepts batches of 100
      for (let i = 0; i < messages.length; i += 100) {
        const chunk = messages.slice(i, i + 100);
        await fetch(EXPO_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(chunk),
        });
      }
      await sb.from('notification_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', n.id);
      sent++;
    } catch {
      await sb.from('notification_queue').update({ status: 'failed' }).eq('id', n.id);
    }
  }

  return json({ ok: true, sent, skipped, drained: pending.length });
});
