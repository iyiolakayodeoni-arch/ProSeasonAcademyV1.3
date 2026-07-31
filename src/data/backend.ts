// ─────────────────────────────────────────────────────────────
// BACKEND SEAM — the ONLY file that knows who the academy talks
// to. Engine: Supabase (Postgres + anonymous auth + realtime +
// edge functions). Every screen keeps calling the same exported
// names as on the custom server; the UI cannot feel the engine.
// Unconfigured (no env) → every call fails soft, app stays
// fully offline-first.
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

const LEGACY_TOKEN_KEY = 'psa.cloud.token.v1';

// ── identity (me) ────────────────────────────────────────────
let me: { id: string; handle: string; academyId: string } | null = null;

export interface CloudUser {
  id: string;
  handle: string;
  academyId: string;
}

export interface SeasonGate {
  season: string;
  cap: number;
  taken: number;
}
let seasonGate: SeasonGate | null = null;
/** non-null when the season is FULL for this player's device */
export function getSeasonGate(): SeasonGate | null {
  return seasonGate;
}

/**
 * Live seat count — visible on the sign-in door. season_seats()
 * counts profiles rows, which only exist AFTER someone completes
 * sign-in via ensure-profile. So the number you see on the door IS
 * actual claimed seats, not visitors browsing. No auth required to
 * read it — it is a public number by design.
 */
export async function liveSeatCount(): Promise<SeasonGate | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('season_seats');
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      season: row.season ?? 'SEASON ONE',
      cap: Number(row.cap) || 1000,
      taken: Number(row.taken) || 0,
    };
  } catch {
    return null;
  }
}

/** the signed-in academy identity, or null when offline/unclaimed */
export function getMe(): CloudUser | null {
  return me;
}

/** hydrate identity after email/password auth (authApi owns the session) */
export function setMeFromProfile(profile: {
  id: string;
  handle: string;
  academyId: string;
}): CloudUser {
  me = {
    id: String(profile.id),
    handle: String(profile.handle),
    academyId: String(profile.academyId),
  };
  seasonGate = null;
  return me;
}

// ── health + auth ────────────────────────────────────────────
export async function probeHealth(timeoutMs = 2500): Promise<boolean> {
  if (!supabase) return false;
  try {
    return await Promise.race([
      supabase.from('channels').select('slug').limit(1).then((r) => !r.error),
      new Promise<boolean>((r) => setTimeout(() => r(false), timeoutMs)),
    ]);
  } catch {
    return false;
  }
}

export async function ensureAuth(
  handle: string,
  coachId: string,
  platform: string,
  region: string,
): Promise<CloudUser | null> {
  if (!supabase) return null;
  try {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      const r = await supabase.auth.signInAnonymously();
      if (r.error || !r.data.session) return null;
    }
    const resp = await supabase.functions.invoke('ensure-profile', {
      body: { handle, coachId, platform, region },
    });
    if (resp.error) {
      // 409 SEASON_FULL arrives as a function error — read its body
      try {
        const ctx: any = (resp.error as any).context;
        const j = ctx?.json ? await ctx.json() : null;
        if (j?.error === 'SEASON_FULL') {
          seasonGate = { season: j.season ?? 'SEASON ONE', cap: j.cap ?? 1000, taken: j.taken ?? j.cap ?? 1000 };
          me = null;
          return null;
        }
      } catch { /* fall through to offline */ }
      return null;
    }
    const p = resp.data?.profile;
    if (!p) return null;
    seasonGate = null;
    me = { id: String(p.id), handle: String(p.handle), academyId: String(p.academy_id) };
    return me;
  } catch {
    return null;
  }
}

// ── match vault sync ─────────────────────────────────────────
export interface ServerMatchRow {
  client_id: string;
  at: number;
  gf: number;
  ga: number;
  mode: string | null;
  opp_style: string | null;
  pass_acc: number | null;
  no_sprint: number;
  mechanics_used: number;
  led_at75: number | null;
  decisive: string | null;
  source: string;
  composure?: number | null;
  note?: string | null;
}

export async function pushMatches(matches: { clientId: string }[]): Promise<boolean> {
  if (!supabase || !me) return false;
  try {
    const rows = matches.map((m: any) => ({
      user_id: me!.id,
      client_id: String(m.clientId ?? m.client_id ?? ''),
      at: new Date(Number(m.at) || Date.now()).toISOString(),
      gf: Math.round(Number(m.gf) || 0),
      ga: Math.round(Number(m.ga) || 0),
      mode: m.mode ?? null,
      opp_style: m.oppStyle ?? m.opp_style ?? null,
      pass_acc: (m.passAcc ?? m.pass_acc) == null ? null : Math.round(Number(m.passAcc ?? m.pass_acc)),
      no_sprint: !!(m.noSprint ?? m.no_sprint),
      mechanics_used: Math.round(Number(m.mechanicsUsed ?? m.mechanics_used) || 0),
      led_at75: (m.ledAt75 ?? m.led_at75) == null ? null : !!(m.ledAt75 ?? m.led_at75),
      decisive: m.decisive ?? null,
      source: m.source === 'watcher' ? 'watcher' : 'manual',
      composure: m.composure == null ? null : Math.round(Number(m.composure)),
      note: m.note ? String(m.note).slice(0, 600) : null,
    }));
    const { error } = await supabase
      .from('matches')
      .upsert(rows, { onConflict: 'user_id,client_id', ignoreDuplicates: true });
    return !error;
  } catch {
    return false;
  }
}

export async function pullMatches(): Promise<ServerMatchRow[] | null> {
  if (!supabase || !me) return null;
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('user_id', me.id)
      .order('at', { ascending: false })
      .limit(500);
    if (error) return null;
    return (data ?? []).map((m: any) => ({
      client_id: m.client_id,
      at: new Date(m.at).getTime(),
      gf: m.gf,
      ga: m.ga,
      mode: m.mode,
      opp_style: m.opp_style,
      pass_acc: m.pass_acc,
      no_sprint: m.no_sprint ? 1 : 0,
      mechanics_used: m.mechanics_used,
      led_at75: m.led_at75 === null ? null : m.led_at75 ? 1 : 0,
      decisive: m.decisive,
      source: m.source,
      composure: m.composure,
      note: m.note,
    })) as ServerMatchRow[];
  } catch {
    return null;
  }
}

// ── community ────────────────────────────────────────────────
export interface ServerMessage {
  id: number;
  seq: number;
  kind: string;
  text: string;
  at: number;
  author: string;
  academyId: string;
  reactions?: string | null;
}

export interface ServerChannel {
  id: number;
  slug: string;
  name: string;
  topic: string | null;
  seq: number;
}

const mapMsg = (m: any): ServerMessage => ({
  id: Number(m.id),
  seq: Number(m.id), // message id IS the cursor (monotonic)
  kind: m.kind,
  text: m.text,
  at: new Date(m.at).getTime(),
  author: m.handle,
  academyId: m.academy_id ?? '',
  reactions: m.reactions ? (typeof m.reactions === 'string' ? m.reactions : JSON.stringify(m.reactions)) : null,
});

export async function listChannels(): Promise<ServerChannel[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('channels').select('slug, name, topic');
    if (error) return null;
    return (data ?? []).map((c: any, i: number) => ({ id: i + 1, slug: c.slug, name: c.name, topic: c.topic, seq: 0 }));
  } catch {
    return null;
  }
}

export async function pullMessages(slug: string, afterSeq: number, limit = 50): Promise<ServerMessage[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, kind, text, at, handle, academy_id, reactions')
      .eq('channel_slug', slug)
      .gt('id', Number(afterSeq) || 0)
      .order('id', { ascending: true })
      .limit(Math.min(limit, 200));
    if (error) return null;
    return (data ?? []).map(mapMsg);
  } catch {
    return null;
  }
}

export async function postMessage(slug: string, text: string): Promise<boolean> {
  if (!supabase || !me) return false;
  try {
    const clean = String(text ?? '').trim().slice(0, 500);
    if (!clean) return false;
    const { error } = await supabase.from('messages').insert({
      channel_slug: slug,
      user_id: me.id,
      handle: me.handle,
      academy_id: me.academyId,
      kind: 'text',
      text: clean,
    });
    return !error;
  } catch {
    return false;
  }
}

/** validated emoji toggle — the database only ever flips YOUR handle */
export async function toggleCloudReaction(messageId: number, emoji: string): Promise<string | null> {
  if (!supabase || !me) return null;
  try {
    const { data, error } = await supabase.rpc('toggle_reaction', { p_message_id: messageId, p_emoji: emoji });
    if (error) return null;
    return typeof data === 'string' ? data : JSON.stringify(data ?? {});
  } catch {
    return null;
  }
}

// ── founder desk (key-gated, YOUR admin powers) ─────────────
export interface AdminSummary {
  users: number;
  matches: number;
  watcherMatches: number;
  messages: number;
  matchesThisWeek: number;
  regions: { africa: number; world: number; unset: number };
  coaches: { coach: string | null; n: number }[];
  topScorersWeek: { handle: string; goals: number; played: number }[];
  recentMatches: { handle: string; gf: number; ga: number; mode: string | null; source: string; composure: number | null; note: string | null; at: number }[];
  till: { wallets: number; creditsOut: number; proSubs: number; recentLedger: TillLedgerRow[] };
  tillLive: boolean;
  goLive: string;
  seats?: { season: string; cap: number; taken: number; waiting?: number; isFull?: boolean };
  generatedAt: number;
}

async function founderFn(name: string, _key: string, body?: unknown): Promise<any | null> {
  if (!supabase) return null;
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return null;
    const resp = await supabase.functions.invoke(name, {
      body: body ?? {},
      // Supabase attaches the current bearer session to the request.
      // FOUNDER_KEY is deliberately never shipped to the app.
    });
    if (resp.error) return null;
    return resp.data;
  } catch {
    return null;
  }
}

/** null = wrong key or backend unreachable (caller stays locked) */
export async function adminSummary(key: string): Promise<AdminSummary | null> {
  return (await founderFn('admin-summary', key)) as AdminSummary | null;
}

/** broadcast as FOUNDER into any channel — kind:'founder', fans out live */
export async function postFounderMessage(key: string, slug: string, text: string): Promise<boolean> {
  const r = await founderFn('founder-broadcast', key, { slug, text });
  return r?.ok === true;
}

// ── the till (charge engine) ───────────────────────────────
export interface StoreProductWire {
  code: string;
  title: string;
  /** the honest explanation of where the number came from */
  priceNote?: string | null;
  credits?: number;
  plan?: string;
  price: string;
  payLink?: string;
}
export interface StoreCatalogWire {
  live: boolean;
  goLive: string;
  region: string;
  products: { africa: StoreProductWire[]; world: StoreProductWire[] };
}
export interface TillLedgerRow {
  id: number;
  delta: number;
  reason: string;
  ref: string | null;
  actor: string;
  at: number;
}
export interface TillBalanceWire {
  live: boolean;
  goLive: string;
  academyId: string;
  credits: number;
  plan: string;
  planRenews: string | null;
  ledger: TillLedgerRow[];
}

const offcut: StoreProductWire[] = [];
export async function storeCatalog(region: string): Promise<StoreCatalogWire | null> {
  if (!supabase) return null;
  try {
    const [{ data: prods, error }, { data: gl }] = await Promise.all([
      supabase.from('products').select('code, region, title, credits, plan, price, pay_link, price_note').eq('active', true).order('sort', { ascending: true }),
      supabase.from('config').select('value').eq('key', 'go_live').maybeSingle(),
    ]);
    if (error) return null;
    const goLive = gl?.value ?? '';
    const africa: StoreProductWire[] = [];
    const world: StoreProductWire[] = [];
    for (const p of prods ?? []) {
      const w: StoreProductWire = { code: p.code, title: p.title, credits: p.credits ?? undefined, plan: p.plan ?? undefined, price: p.price, payLink: p.pay_link, priceNote: p.price_note ?? null };
      if (p.region === 'africa') africa.push(w);
      else world.push(w);
    }
    return { live: goLive ? Date.now() >= Date.parse(goLive) : false, goLive, region, products: { africa: africa.length ? africa : offcut, world } };
  } catch {
    return null;
  }
}

export async function tillBalance(): Promise<TillBalanceWire | null> {
  if (!supabase || !me) return null;
  try {
    const [{ data: w }, { data: gl }, { data: led }] = await Promise.all([
      supabase.from('wallets').select('credits, plan, plan_renews').eq('academy_id', me.academyId).maybeSingle(),
      supabase.from('config').select('value').eq('key', 'go_live').maybeSingle(),
      supabase.from('ledger').select('id, delta, reason, ref, actor, at').eq('academy_id', me.academyId).order('at', { ascending: false }).order('id', { ascending: false }).limit(20),
    ]);
    const goLive = gl?.value ?? '';
    return {
      live: goLive ? Date.now() >= Date.parse(goLive) : false,
      goLive,
      academyId: me.academyId,
      credits: w?.credits ?? 0,
      plan: w?.plan ?? 'free',
      planRenews: w?.plan_renews ?? null,
      ledger: (led ?? []).map((l: any) => ({ id: Number(l.id), delta: l.delta, reason: l.reason, ref: l.ref, actor: l.actor, at: new Date(l.at).getTime() })),
    };
  } catch {
    return null;
  }
}

/** atomic spend + go-live gate, resolved server-side against your own wallet */
export async function tillSpend(amount: number, reason: string): Promise<{ ok: boolean; credits?: number; error?: string } | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('till_spend', { p_amount: Math.round(amount), p_reason: String(reason).slice(0, 60) });
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: row?.ok === true, credits: row?.credits, error: row?.error ?? undefined };
  } catch {
    return null;
  }
}

/** credits the player after a payment alert; founder key on this device only */
export async function tillTopUp(key: string, academyId: string, credits: number, ref?: string): Promise<{ ok: boolean; balance?: number }> {
  const r = await founderFn('till-topup', key, { academyId, credits, reason: 'FOUNDER TOP-UP', ref });
  return { ok: r?.ok === true, balance: r?.balance };
}

/** marks a WORLD-track player PRO after their sub payment lands */
export async function tillSubscribe(key: string, academyId: string, plan: 'pro' | 'free', renews?: string): Promise<boolean> {
  const r = await founderFn('till-subscribe', key, { academyId, plan, renews });
  return r?.ok === true;
}

// ── realtime rooms (presence + live message fan-out) ────────
export type CloudEvent =
  | { type: 'message'; channel: string; message: ServerMessage }
  | { type: 'presence'; channel: string; users: { id: string; handle: string; academyId: string }[] }
  | { type: 'typing'; channel: string; user: { handle: string } };

/** one handler PER ROOM — the community mirrors 3 rooms at once */
const roomHandlers = new Map<string, (e: CloudEvent) => void>();
const rooms = new Map<string, RealtimeChannel>();
const onEventFor = (slug: string) => roomHandlers.get(slug);

/** join a channel room; leaves nothing (rooms are cheap) */
export function joinRoom(slug: string, handler: (e: CloudEvent) => void) {
  if (!supabase || !me) return;
  roomHandlers.set(slug, handler);
  if (rooms.has(slug)) return;
  const ch = supabase
    .channel(`room:${slug}`, { config: { presence: { key: me.academyId } } })
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_slug=eq.${slug}` },
      (payload) => onEventFor(slug)?.({ type: 'message', channel: slug, message: mapMsg(payload.new) }),
    )
    .on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState() as Record<string, any[]>;
      const users = Object.values(state).flat().map((u: any) => ({
        id: String(u.academyId ?? u.academy_id ?? ''),
        handle: String(u.handle ?? 'PLAYER'),
        academyId: String(u.academyId ?? u.academy_id ?? ''),
      }));
      onEventFor(slug)?.({ type: 'presence', channel: slug, users });
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && me) {
        await ch.track({ handle: me.handle, academyId: me.academyId });
      }
    });
  rooms.set(slug, ch);
}

export function sendRoomMessage(slug: string, text: string) {
  void postMessage(slug, text); // realtime delivers it back to the room
}

/** dev/escape hatch: forget identity + leave every room */
export function cloudReset() {
  if (supabase) {
    for (const ch of rooms.values()) void supabase.removeChannel(ch);
    void supabase.auth.signOut();
  }
  rooms.clear();
  roomHandlers.clear();
  me = null;
  seasonGate = null;
  void AsyncStorage.removeItem(LEGACY_TOKEN_KEY).catch(() => {});
}

// ── CONTACT — the private line to the founder ────────────────
export type ContactKind = 'message' | 'bug' | 'suggestion' | 'question';

/**
 * "My card was refused." One tap, and the founder gets the member's ID,
 * the pass they wanted and the price — so he can reply with a solution
 * instead of a question.
 *
 * Returns 'SENT', 'ALREADY_SENT' (one an hour, so a stuck retry loop
 * cannot flood the inbox), or null if it could not be delivered.
 */
export async function reportPaymentTrouble(
  product?: string,
  note?: string,
): Promise<'SENT' | 'ALREADY_SENT' | null> {
  if (!supabase || !me) return null;
  try {
    const { data, error } = await supabase.rpc('payment_trouble', {
      p_product: product ?? null,
      p_note: note?.trim() ? note.trim().slice(0, 500) : null,
    });
    if (error) return null;
    return data === 'ALREADY_SENT' ? 'ALREADY_SENT' : 'SENT';
  } catch {
    return null;
  }
}

export interface ContactRow {
  id: number;
  kind: string;
  body: string;
  at: number;
  read: boolean;
  replied: boolean;
  reply: string | null;
  /** true when THE ACADEMY sent this (warning, reminder, welcome) */
  fromAcademy: boolean;
}

/** send the founder a private note. Returns an error code, or null on success. */
export async function sendContact(kind: ContactKind, body: string): Promise<string | null> {
  if (!supabase || !me) return 'OFFLINE';
  const text = String(body ?? '').trim().slice(0, 2000);
  if (!text) return 'EMPTY';
  try {
    const { error } = await supabase.from('contact_messages').insert({
      user_id: me.id, handle: me.handle, academy_id: me.academyId, kind, body: text,
    });
    if (error) {
      if (String(error.message).includes('RATE_LIMITED')) return 'RATE_LIMITED';
      return 'FAILED';
    }
    return null;
  } catch {
    return 'FAILED';
  }
}

/** unread messages FROM the academy — drives the Settings badge */
export async function unreadFromAcademy(): Promise<number> {
  if (!supabase || !me) return 0;
  try {
    const { count, error } = await supabase
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('from_academy', true)
      .eq('read', false);
    return error ? 0 : (count ?? 0);
  } catch {
    return 0;
  }
}

/** the member has now seen them */
export async function markAcademyRead(): Promise<void> {
  if (!supabase || !me) return;
  try {
    await supabase.from('contact_messages')
      .update({ read: true }).eq('from_academy', true).eq('read', false);
  } catch { /* best effort */ }
}

/** your own thread — including the founder's replies */
export async function myContactThread(): Promise<ContactRow[] | null> {
  if (!supabase || !me) return null;
  try {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('id, kind, body, at, read, replied, reply, from_academy')
      .order('at', { ascending: false })
      .limit(30);
    if (error) return null;
    return (data ?? []).map((r: any) => ({
      id: Number(r.id), kind: r.kind, body: r.body,
      at: new Date(r.at).getTime(), read: !!r.read,
      replied: !!r.replied, reply: r.reply ?? null,
      fromAcademy: r.from_academy === true,
    }));
  } catch {
    return null;
  }
}

// ── FOUNDER'S WEEK — the December listening window ───────────
export interface FounderWeek {
  live: boolean;
  startsAt: number | null;
  endsAt: number | null;
  note: string;
}

/** is the founder in the halls right now? drives the Community banner */
export async function founderWeek(): Promise<FounderWeek | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('config').select('key, value')
      .in('key', ['founder_week_start', 'founder_week_end', 'founder_week_note']);
    if (error) return null;
    const cfg = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
    const startsAt = cfg.founder_week_start ? Date.parse(cfg.founder_week_start) : null;
    const endsAt = cfg.founder_week_end ? Date.parse(cfg.founder_week_end) : null;
    const now = Date.now();
    return {
      live: !!startsAt && !!endsAt && now >= startsAt && now < endsAt,
      startsAt, endsAt,
      note: cfg.founder_week_note ?? '',
    };
  } catch {
    return null;
  }
}

// ── FOUNDER DESK — inbox, broadcast, the till ────────────────
export interface InboxRow {
  id: number;
  handle: string | null;
  academy_id: string | null;
  kind: string;
  body: string;
  at: string;
  read: boolean;
  replied: boolean;
  reply: string | null;
}

async function deskFn(_key: string, body: Record<string, unknown>): Promise<any | null> {
  // Founder authorization is the Supabase session (is_founder), not a client key.
  return founderFn('founder-desk', _key, body);
}

export async function founderInbox(key: string, unread = false):
  Promise<{ messages: InboxRow[]; unread: number } | null> {
  const r = await deskFn(key, { action: 'inbox', unread });
  return r?.ok ? { messages: r.messages ?? [], unread: r.unread ?? 0 } : null;
}

export async function founderReply(key: string, id: number, reply: string): Promise<boolean> {
  const r = await deskFn(key, { action: 'reply', id, reply });
  return r?.ok === true;
}

export async function founderSetStatus(
  key: string, academyId: string, status: 'active' | 'muted' | 'removed',
): Promise<boolean> {
  const r = await deskFn(key, { action: 'set_status', academyId, status });
  return r?.ok === true;
}

export interface PackRow {
  code: string;
  title: string;
  region: string;
  credits: number | null;
  plan: string | null;
  price: string;
  items: string[];
}

/** every pack with the tricks/stages bundled inside it */
export async function founderPacks(key: string): Promise<PackRow[] | null> {
  const r = await deskFn(key, { action: 'packs' });
  return r?.ok ? (r.packs ?? []) : null;
}

/**
 * Payment landed → give them the whole pack: credits AND the tricks
 * inside it, atomically. Replaces the credits-only top-up for packs.
 */
export async function founderGrantPack(
  key: string, academyId: string, pack: string, ref?: string,
): Promise<{ ok: boolean; balance?: number; error?: string }> {
  const r = await deskFn(key, { action: 'grant_pack', academyId, pack, ref });
  if (!r) return { ok: false, error: 'UNREACHABLE' };
  return r.ok ? { ok: true, balance: r.balance } : { ok: false, error: String(r.error ?? 'FAILED') };
}

/** re-cut what a pack contains (season to season, as the meta moves) */
export async function founderSetPackItems(
  key: string, pack: string, items: string[],
): Promise<boolean> {
  const r = await deskFn(key, { action: 'pack_set_items', pack, items });
  return r?.ok === true;
}

/** what a member sees before buying — public */
export async function packContents(pack: string): Promise<string[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('pack_contents', { p_pack: pack });
    if (error) return null;
    return (data ?? []).map((r: any) => String(r.item));
  } catch {
    return null;
  }
}

// ── TERMS, DEADLINE, CONDUCT ─────────────────────────────────
export interface MyTos {
  version: number;
  body: string;
  accepted: boolean;
  deadlineAt: number | null;
  strikes: number;
}

/** the terms + this member's standing (deadline, warnings) */
export async function myTos(): Promise<MyTos | null> {
  if (!supabase || !me) return null;
  try {
    const { data, error } = await supabase.rpc('my_tos');
    if (error) return null;
    const r = Array.isArray(data) ? data[0] : data;
    if (!r) return null;
    return {
      version: Number(r.version ?? 1),
      body: String(r.body ?? ''),
      accepted: r.accepted === true,
      deadlineAt: r.deadline_at ? new Date(r.deadline_at).getTime() : null,
      strikes: Number(r.strikes ?? 0),
    };
  } catch {
    return null;
  }
}

export async function acceptTos(version: number): Promise<boolean> {
  if (!supabase || !me) return false;
  try {
    const { data, error } = await supabase.rpc('accept_tos', { p_version: version });
    return !error && data === true;
  } catch {
    return false;
  }
}

// ── FOUNDER: enforcement ─────────────────────────────────────
export async function founderSweep(key: string): Promise<{ academy_id: string; handle: string; reason: string }[] | null> {
  const r = await deskFn(key, { action: 'sweep' });
  return r?.ok ? (r.removed ?? []) : null;
}

export interface FlagRow {
  id: number; handle: string | null; academy_id: string | null;
  channel: string | null; text: string; matched: string; at: string; reviewed: boolean;
}

export async function founderFlags(key: string): Promise<FlagRow[] | null> {
  const r = await deskFn(key, { action: 'flags' });
  return r?.ok ? (r.flags ?? []) : null;
}

export async function founderStrike(
  key: string, academyId: string, reason: string, severity: 'warning' | 'severe' = 'warning',
): Promise<number | null> {
  const r = await deskFn(key, { action: 'strike', academyId, reason, severity });
  return r?.ok ? Number(r.strikes ?? 0) : null;
}

export async function founderRemove(
  key: string, academyId: string, reason: string,
): Promise<{ ok: boolean; refundDays?: number; error?: string }> {
  const r = await deskFn(key, { action: 'remove', academyId, reason });
  if (!r) return { ok: false, error: 'UNREACHABLE' };
  return r.ok ? { ok: true, refundDays: r.refundDays } : { ok: false, error: String(r.error) };
}

export async function founderReviewFlag(key: string, id: number, action: string): Promise<boolean> {
  const r = await deskFn(key, { action: 'flag_review', id, decision: action });
  return r?.ok === true;
}

// ── THE PRICING TABLE — deciding it together ─────────────────
export interface ConsultQ {
  slug: string;
  prompt: string;
  helper: string | null;
  kind: 'choice' | 'price' | 'text';
  options: string[] | null;
  myChoice: string | null;
  myAmount: number | null;
  myNote: string | null;
  answered: boolean;
}

/** the open questions, with whatever this member already said */
export async function myConsult(): Promise<ConsultQ[] | null> {
  if (!supabase || !me) return null;
  try {
    const { data, error } = await supabase.rpc('my_consult');
    if (error) return null;
    return (data ?? []).map((r: any) => ({
      slug: r.slug,
      prompt: r.prompt,
      helper: r.helper ?? null,
      kind: (r.kind ?? 'choice') as ConsultQ['kind'],
      options: Array.isArray(r.options) ? r.options.map(String) : null,
      myChoice: r.my_choice ?? null,
      myAmount: r.my_amount == null ? null : Number(r.my_amount),
      myNote: r.my_note ?? null,
      answered: r.answered === true,
    }));
  } catch {
    return null;
  }
}

/** answer, or change your mind while it is still open */
export async function answerConsult(
  slug: string,
  a: { choice?: string; amount?: number; note?: string },
): Promise<boolean> {
  if (!supabase || !me) return false;
  try {
    const { data, error } = await supabase.rpc('consult_answer', {
      p_slug: slug,
      p_choice: a.choice ?? null,
      p_amount: a.amount ?? null,
      p_note: a.note ?? null,
    });
    return !error && data === true;
  } catch {
    return false;
  }
}

/** founder: the counts, the medians and the quotes */
export async function founderConsultResults(key: string): Promise<any[] | null> {
  const r = await deskFn(key, { action: 'consult_results' });
  return r?.ok ? (r.results ?? []) : null;
}

export async function founderCloseConsult(key: string): Promise<boolean> {
  const r = await deskFn(key, { action: 'consult_close' });
  return r?.ok === true;
}

// ── LIVE PRICING — naira is the master, £ follows the rate ───
export interface LivePrice {
  code: string;
  title: string;
  region: string;
  tier: string;
  durationDays: number;
  /** what they are charged, in their own money — "₦7,800" or "£15.99" */
  display: string;
  amount: number;
  currency: string;
  /** the other side's figure, for context only — "≈ £4.30 TODAY" */
  compare: string | null;
  baseAmount: number;
  baseCurrency: string;
  priceNote: string | null;
  /** the rate is old, so `compare` is hidden — the price itself is fine */
  stale: boolean;
}

/** today's price list, converted at the live rate */
export async function livePrices(region?: string): Promise<LivePrice[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('prices_now', { p_region: region ?? null });
    if (error) return null;
    return (data ?? []).map((r: any) => ({
      code: r.code,
      title: r.title,
      region: r.region,
      tier: r.tier,
      durationDays: Number(r.duration_days ?? 0),
      display: r.display ?? '',
      amount: Number(r.amount ?? 0),
      currency: r.currency ?? 'GBP',
      compare: r.compare ?? null,
      baseAmount: Number(r.base_amount ?? 0),
      baseCurrency: r.base_currency ?? 'GBP',
      priceNote: r.price_note ?? null,
      stale: r.stale === true,
    }));
  } catch {
    return null;
  }
}

/**
 * Start a card checkout at TODAY'S price. The amount is computed
 * server-side from the database, so what was displayed is what gets
 * charged — and a tampered client cannot set its own price.
 *
 * Stripe unless a provider is named. Most members are Nigerian, and a
 * plain card checkout lets their own bank make the decision rather than
 * PayPal's risk layer, which stays wary of Nigeria even now that the
 * banks allow international payments again.
 */
export async function startCheckout(
  product: string,
  provider?: 'stripe' | 'paypal',
): Promise<{
  ok: true; approveUrl: string; display: string; currency: string; provider: string;
} | { ok: false; error: string }> {
  if (!supabase || !me) return { ok: false, error: 'OFFLINE' };
  try {
    const resp = await supabase.functions.invoke('pay-start', {
      body: provider ? { product, provider } : { product },
    });
    if (resp.error) {
      try {
        const ctx: any = (resp.error as any).context;
        const j = ctx?.json ? await ctx.json() : null;
        if (j?.error === 'RATE_STALE') return { ok: false, error: 'RATE_STALE' };
      } catch { /* fall through */ }
      return { ok: false, error: 'FAILED' };
    }
    const d = resp.data;
    if (!d?.ok || !d.approveUrl) return { ok: false, error: 'FAILED' };
    return {
      ok: true,
      approveUrl: String(d.approveUrl),
      display: String(d.display ?? ''),
      currency: String(d.currency ?? 'GBP'),
      provider: String(d.provider ?? 'stripe'),
    };
  } catch {
    return { ok: false, error: 'FAILED' };
  }
}

// ── PAYING — claim, then the founder confirms ────────────────
export interface PayMethod {
  code: string; label: string; region: string | null;
  currency: string; details: string; holder: string | null; note: string | null;
}

export interface MyClaim {
  id: number; product: string; method: string; reference: string;
  amount: string | null; status: 'pending' | 'approved' | 'rejected';
  at: number; decidedNote: string | null;
}

/** where the money actually goes — held in the DB, not the build */
export async function payMethods(region: string): Promise<PayMethod[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('pay_methods')
      .select('code, label, region, currency, details, holder, note')
      .eq('active', true)
      .order('sort');
    if (error) return null;
    return (data ?? []).filter((m: any) => !m.region || m.region === region) as PayMethod[];
  } catch {
    return null;
  }
}

/** "I have paid" — returns the reference to put in the payment */
export async function claimPayment(
  product: string, method: string, amount?: string, note?: string,
): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  if (!supabase || !me) return { ok: false, error: 'OFFLINE' };
  try {
    const { data, error } = await supabase.rpc('claim_payment', {
      p_product: product, p_method: method,
      p_amount: amount ?? null, p_note: note ?? null,
    });
    if (error) {
      if (String(error.message).includes('CLAIM_PENDING')) return { ok: false, error: 'CLAIM_PENDING' };
      return { ok: false, error: 'FAILED' };
    }
    const r = Array.isArray(data) ? data[0] : data;
    return { ok: true, reference: String(r?.reference ?? '') };
  } catch {
    return { ok: false, error: 'FAILED' };
  }
}

export async function myClaims(): Promise<MyClaim[] | null> {
  if (!supabase || !me) return null;
  try {
    const { data, error } = await supabase.rpc('my_claims');
    if (error) return null;
    return (data ?? []).map((r: any) => ({
      id: Number(r.id), product: r.product, method: r.method,
      reference: r.reference, amount: r.amount ?? null,
      status: r.status, at: new Date(r.at).getTime(),
      decidedNote: r.decided_note ?? null,
    }));
  } catch {
    return null;
  }
}

// founder side
export interface ClaimRow {
  id: number; academy_id: string; handle: string | null; product: string;
  method: string; reference: string; amount: string | null;
  sender_note: string | null; status: string; at: string;
}

export async function founderClaims(key: string): Promise<ClaimRow[] | null> {
  const r = await deskFn(key, { action: 'claims' });
  return r?.ok ? (r.claims ?? []) : null;
}

/** somebody whose card was refused and who asked for help */
export interface StuckRow {
  id: number; academy_id: string; handle: string | null;
  body: string; at: string; read: boolean;
  /** they already sent the money manually and are waiting on you */
  has_claim: boolean;
  /** they got in some other way since — you can close this one */
  paid_since: boolean;
}

/**
 * Members who tried to pay and could not. Above the general inbox on
 * purpose: each one is a sale you still have if you answer today.
 */
export async function founderStuck(key: string): Promise<StuckRow[] | null> {
  const r = await deskFn(key, { action: 'stuck' });
  return r?.ok ? (r.stuck ?? []) : null;
}

export async function founderDecideClaim(
  key: string, id: number, approve: boolean, note?: string,
): Promise<{ ok: boolean; tier?: string; error?: string }> {
  const r = await deskFn(key, { action: 'decide_claim', id, approve, note });
  if (!r) return { ok: false, error: 'UNREACHABLE' };
  return r.ok ? { ok: true, tier: r.tier } : { ok: false, error: String(r.error) };
}

// ── TIERS — one ladder, two currencies ───────────────────────
// FREE / ACADEMY / PRO mean the same thing in Lagos and London.
// Only the price tag's currency differs. Access is decided by tier
// + expiry, so two members comparing notes see the same deal.

export interface MyAccess {
  tier: 'free' | 'mid' | 'pro';
  level: number;          // 0 | 1 | 2
  expiresAt: number | null;
  daysLeft: number | null;
  /** active = paid up · grace = expired but inside the cushion · lapsed = shut */
  state: 'active' | 'grace' | 'lapsed';
  graceLeft: number;
  /** when true, a lapsed member cannot use the academy */
  paidOnly: boolean;
}

export async function myAccess(): Promise<MyAccess | null> {
  if (!supabase || !me) return null;
  try {
    const { data, error } = await supabase.rpc('my_access');
    if (error) return null;
    const r = Array.isArray(data) ? data[0] : data;
    if (!r) {
      return { tier: 'free', level: 0, expiresAt: null, daysLeft: null,
               state: 'lapsed', graceLeft: 0, paidOnly: true };
    }
    return {
      tier: (r.tier ?? 'free') as MyAccess['tier'],
      level: Number(r.level ?? 0),
      expiresAt: r.expires_at ? new Date(r.expires_at).getTime() : null,
      daysLeft: r.days_left == null ? null : Number(r.days_left),
      state: (r.state ?? 'lapsed') as MyAccess['state'],
      graceLeft: Number(r.grace_left ?? 0),
      paidOnly: r.paid_only !== false,
    };
  } catch {
    return null;
  }
}

/** may this member open this stage / trick / the film room? */
export async function canAccess(item: string): Promise<boolean> {
  if (!supabase || !me) return false;
  try {
    const { data, error } = await supabase.rpc('can_access', { p_item: item });
    return !error && data === true;
  } catch {
    return false;
  }
}

/** the whole ladder, for the till */
export interface TierRow { key: string; level: number; title: string; blurb: string | null }

export async function tierLadder(): Promise<TierRow[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('tiers').select('key, level, title, blurb').order('level');
    if (error) return null;
    return (data ?? []) as TierRow[];
  } catch {
    return null;
  }
}

export interface LapsedRow {
  academy_id: string; handle: string; tier: string;
  expired_at: string; days_lapsed: number;
}

/** founder: open the free window to every seated member at once */
export async function founderGrantTrial(
  key: string, days?: number, tier?: string,
): Promise<number | null> {
  const r = await deskFn(key, { action: 'grant_trial', days, tier });
  return r?.ok ? Number(r.granted ?? 0) : null;
}

/** founder: who has been lapsed long enough to reclaim their seat */
export async function founderLapsed(key: string): Promise<LapsedRow[] | null> {
  const r = await deskFn(key, { action: 'lapsed' });
  return r?.ok ? (r.lapsed ?? []) : null;
}

/** founder: sell a timed pass (time stacks; upgrades carry days over) */
export async function founderGrantTier(
  key: string, academyId: string, product: string, ref?: string,
): Promise<{ ok: boolean; tier?: string; expiresAt?: string; error?: string }> {
  const r = await deskFn(key, { action: 'grant_tier', academyId, product, ref });
  if (!r) return { ok: false, error: 'UNREACHABLE' };
  return r.ok
    ? { ok: true, tier: r.tier, expiresAt: r.expiresAt }
    : { ok: false, error: String(r.error ?? 'FAILED') };
}

// ── ACCESS — what this member has paid for ───────────────────
/** every item this member owns: 'stage:3', 'trick:mb-…' */
export async function myUnlocks(): Promise<string[] | null> {
  if (!supabase || !me) return null;
  try {
    const { data, error } = await supabase.from('unlocks').select('item');
    if (error) return null;
    return (data ?? []).map((r: any) => String(r.item));
  } catch {
    return null;
  }
}

/** the free/paid split — config rows, so the founder can move them any time */
export interface AccessRules {
  freeStages: number;   // stages open on FREE
  midStages: number;    // stages open on ACADEMY; beyond this is PRO
  stageCost: number;
  trickCost: number;
}

export async function accessRules(): Promise<AccessRules | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('config').select('key, value')
      .in('key', ['free_stages', 'mid_stages', 'stage_unlock_cost', 'trick_unlock_cost']);
    if (error) return null;
    const c = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
    return {
      freeStages: Number(c.free_stages ?? 2),
      midStages: Number(c.mid_stages ?? 6),
      stageCost: Number(c.stage_unlock_cost ?? 50),
      trickCost: Number(c.trick_unlock_cost ?? 20),
    };
  } catch {
    return null;
  }
}

/**
 * Spend credits (or use PRO) to unlock a stage or a trick.
 * Returns the new balance, or an error code the UI can explain.
 */
export async function unlockItem(item: string, cost: number):
  Promise<{ ok: true; credits: number } | { ok: false; error: string }> {
  if (!supabase || !me) return { ok: false, error: 'OFFLINE' };
  try {
    const { data, error } = await supabase.rpc('unlock_item', { p_item: item, p_cost: cost });
    if (error) {
      if (String(error.message).includes('INSUFFICIENT_CREDITS')) {
        return { ok: false, error: 'INSUFFICIENT_CREDITS' };
      }
      return { ok: false, error: 'FAILED' };
    }
    return { ok: true, credits: Number(data ?? 0) };
  } catch {
    return { ok: false, error: 'FAILED' };
  }
}

/** current platform label for server-side stats */
export const DEVICE_LABEL = Platform.select({ ios: 'IOS', android: 'ANDROID', default: 'WEB' });
