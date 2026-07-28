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

export async function ensureAuth(handle: string, coachId: string, platform: string, region: string): Promise<CloudUser | null> {
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
      note: m.note ? String(m.note).slice(0, 140) : null,
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
  seats?: { season: string; cap: number; taken: number };
  generatedAt: number;
}

async function founderFn(name: string, key: string, body?: unknown): Promise<any | null> {
  if (!supabase) return null;
  try {
    const resp = await supabase.functions.invoke(name, {
      body: body ?? {},
      headers: { 'x-founder-key': key },
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
      supabase.from('products').select('code, region, title, credits, plan, price, pay_link').eq('active', true).order('sort', { ascending: true }),
      supabase.from('config').select('value').eq('key', 'go_live').maybeSingle(),
    ]);
    if (error) return null;
    const goLive = gl?.value ?? '';
    const africa: StoreProductWire[] = [];
    const world: StoreProductWire[] = [];
    for (const p of prods ?? []) {
      const w: StoreProductWire = { code: p.code, title: p.title, credits: p.credits ?? undefined, plan: p.plan ?? undefined, price: p.price, payLink: p.pay_link };
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

let onEvent: ((e: CloudEvent) => void) | null = null;
const rooms = new Map<string, RealtimeChannel>();

/** join a channel room; leaves nothing (rooms are cheap) */
export function joinRoom(slug: string, handler: (e: CloudEvent) => void) {
  if (!supabase || !me) return;
  onEvent = handler; // v1: single active room listener (community tab)
  if (rooms.has(slug)) return;
  const ch = supabase
    .channel(`room:${slug}`, { config: { presence: { key: me.academyId } } })
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_slug=eq.${slug}` },
      (payload) => onEvent?.({ type: 'message', channel: slug, message: mapMsg(payload.new) }),
    )
    .on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState() as Record<string, any[]>;
      const users = Object.values(state).flat().map((u: any) => ({
        id: String(u.academyId ?? u.academy_id ?? ''),
        handle: String(u.handle ?? 'PLAYER'),
        academyId: String(u.academyId ?? u.academy_id ?? ''),
      }));
      onEvent?.({ type: 'presence', channel: slug, users });
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
  onEvent = null;
  me = null;
  seasonGate = null;
  void AsyncStorage.removeItem(LEGACY_TOKEN_KEY).catch(() => {});
}

/** current platform label for server-side stats */
export const DEVICE_LABEL = Platform.select({ ios: 'IOS', android: 'ANDROID', default: 'WEB' });
