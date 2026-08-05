import { useSyncExternalStore } from 'react';
import * as backend from './backend';

// ─────────────────────────────────────────────────────────────
// COMMUNITY DATA LAYER — real rooms, real people, nothing else.
//
// P1 HONESTY RULE (founder's order, 2026-08):
//   · NO scripted people. NO scripted messages. NO canned replies.
//     The fictional roster (UCHEPRO, DRE_FC, KOJO_9, the coach DM
//     persona…) is gone for good — a chat that performs people is a
//     scam, and this academy's whole pitch is receipts, not theatre.
//   · A message renders only if a real human sent it: you, a seated
//     player, or the founder — through a real Supabase room.
//   · Offline ≠ fake crowd. When the cloud is unreachable the rooms
//     are CLOSED and the UI says so, instead of warming the hall with
//     scripted banter.
//   · Nothing pretends to send. If there is no live room, the
//     composer is closed — your words never echo to nobody.
//   · Typing state stays wired for the day it's REAL (a live player
//     composing). It is never scripted. Until then it stays silent.
//   · Private DMs return in v2 with real per-pair plumbing. A local
//     echo dressed as a delivered message is a lie, so v1 has none —
//     you call people out in the open room, where it's real.
//   · Squads return when the rooms have real players to fill them.
//     A squad tool in an empty hall is a toy, so v1 ships without it.
// ─────────────────────────────────────────────────────────────

/** local channel id → the server room slug seeded in schema.sql */
export const CHANNEL_SLUGS: Record<string, string> = {
  general: 'dressing-room',
  wins: 'match-receipts',
  losses: 'the-lab',
};
const SLUG_TO_CHANNEL: Record<string, string> = Object.fromEntries(
  Object.entries(CHANNEL_SLUGS).map(([id, slug]) => [slug, id]),
);

export type ReactionIcon = 'fire' | 'laugh' | 'eye';

export interface ChatUser {
  id: string;
  handle: string;
  color: string; // accent — ring + username
  role: 'you' | 'member' | 'coach';
  online: boolean;
  tagline: string;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  at: number;
  text: string;
  kind?: 'text' | 'voice'; // 'voice' lands in v2 as REAL recorded audio
  voiceSecs?: number;
  reactions?: { icon: ReactionIcon; count?: number }[];
}

export interface ChannelDef {
  id: string;
  type: 'channel';
  name: string;
  desc: string;
}

// ── static catalog ────────────────────────────────────────────
// Exactly three rooms — the three that exist in the real schema.
// (The old scripted '#coach-updates' board is gone: the founder
// speaks through founder_announcements, which Home already reads,
// or live in these rooms as himself.)

export const CHANNELS: ChannelDef[] = [
  { id: 'general', type: 'channel', name: 'general', desc: 'THE CLUBHOUSE' },
  { id: 'wins', type: 'channel', name: 'wins', desc: 'POST YOUR DUBS — RECEIPTS ONLY' },
  { id: 'losses', type: 'channel', name: 'losses', desc: 'THE REVIEW ROOM — BRING NOTES' },
];

/** The only guaranteed user: you. Everyone else appears when a real
 *  message arrives from the live rooms (see remoteUser below). */
export function buildUsers(): Record<string, ChatUser> {
  return {
    you: { id: 'you', handle: 'YOU', color: '#39FF6A', role: 'you', online: true, tagline: 'THIS IS YOU — ACADEMY PLAYER' },
  };
}

// ── the store ─────────────────────────────────────────────────

export interface CommunityState {
  activeThreadId: string;
  messages: Record<string, ChatMessage[]>;
  unreads: Record<string, number>;
  typing: Record<string, string[]>; // threadId → userIds composing right now (REAL events only — never scripted)
  toggled: Record<string, ReactionIcon[]>;
  muted: string[];
  presence: Record<string, number>;
  /** true once the public channels are mirroring real Supabase rooms */
  live: boolean;
}

let state: CommunityState = {
  activeThreadId: 'general',
  messages: {},
  unreads: {},
  typing: {},
  toggled: {},
  muted: [],
  presence: Object.fromEntries(CHANNELS.map((c) => [c.id, 0])),
  live: false,
};

const listeners = new Set<() => void>();
const getState = () => state;
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function set(partial: Partial<CommunityState>) {
  state = { ...state, ...partial };
  listeners.forEach((l) => l());
}

export function useCommunityState(): CommunityState {
  return useSyncExternalStore(subscribe, getState);
}

// ── public actions ────────────────────────────────────────────

export function setActiveThread(threadId: string) {
  set({ activeThreadId: threadId, unreads: { ...state.unreads, [threadId]: 0 } });
}

/** Wiring for REAL typing events (future: live-room composing pings).
 *  Never call this on a timer — an indicator without a human is the
 *  exact scam this layer was rebuilt to kill. */
export function setTypingOf(threadId: string, userId: string, on: boolean) {
  const cur = new Set(state.typing[threadId] ?? []);
  if (on) cur.add(userId);
  else cur.delete(userId);
  set({ typing: { ...state.typing, [threadId]: [...cur] } });
}

export function toggleReaction(threadId: string, msgId: string, icon: ReactionIcon) {
  const cur = state.toggled[msgId] ?? [];
  const next = cur.includes(icon) ? cur.filter((i) => i !== icon) : [...cur, icon];
  set({ toggled: { ...state.toggled, [msgId]: next } });
}

export function toggleMute(userId: string) {
  set({
    muted: state.muted.includes(userId) ? state.muted.filter((u) => u !== userId) : [...state.muted, userId],
  });
}

/**
 * Send into a REAL room. If the cloud didn't answer (offline, or no
 * claimed seat) there is no room to send into — so this refuses.
 * It never appends a local echo that pretends someone received you.
 */
export function sendText(threadId: string, text: string) {
  const t = text.trim();
  if (!t) return;
  const slug = CHANNEL_SLUGS[threadId];
  if (!state.live || !slug) return; // closed room: never pretend a send
  // The server is the source of truth: send it up and let realtime echo
  // it back, so ordering matches every other player's screen.
  backend.sendRoomMessage(slug, t);
}

export function shareScanResult(threadId: string, text: string) {
  const slug = CHANNEL_SLUGS[threadId];
  if (!state.live || !slug) return; // receipts go to real rooms or nowhere
  backend.sendRoomMessage(slug, text);
}

// ── LIVE BRIDGE — real Supabase rooms ─────────────────────────
// Remote players are folded into the same ChatUser map the UI
// renders: somebody exists in the roster exactly because a real
// message of theirs arrived. No message, no person, no fiction.

const REMOTE_COLORS = ['#39FF6A', '#8fb89b', '#f2c078', '#ffcf7a', '#e0605c', '#7fd4ff'];
/** academyId → synthesized ChatUser id, so colors stay stable per person */
const remoteUsers = new Map<string, ChatUser>();
let myAcademyId: string | null = null;

export function getRemoteUsers(): Record<string, ChatUser> {
  return Object.fromEntries(remoteUsers.entries());
}

function remoteUser(handle: string, academyId: string, kind: string): ChatUser {
  const key = academyId || handle;
  const found = remoteUsers.get(key);
  if (found) return found;
  const isFounder = kind === 'founder' || academyId === 'PSA-FOUNDER';
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const u: ChatUser = {
    id: key,
    handle: handle || 'PLAYER',
    color: isFounder ? '#f2c078' : REMOTE_COLORS[hash % REMOTE_COLORS.length],
    role: isFounder ? 'coach' : 'member',
    online: true,
    tagline: isFounder ? 'THE FOUNDER · SPEAKS FOR THE ACADEMY' : `ACADEMY PLAYER · ${key}`,
  };
  remoteUsers.set(key, u);
  return u;
}

/** server row → the ChatMessage shape the UI already renders */
function wireToMessage(m: backend.ServerMessage): ChatMessage {
  const mine = !!myAcademyId && m.academyId === myAcademyId;
  const author = mine ? 'you' : remoteUser(m.author, m.academyId ?? '', m.kind).id;
  return {
    id: `srv-${m.id}`,
    authorId: author,
    at: typeof m.at === 'number' ? m.at : Date.parse(String(m.at)) || Date.now(),
    text: m.text,
    kind: 'text',
  };
}

function mergeRoom(threadId: string, rows: backend.ServerMessage[]) {
  if (!rows.length) return;
  const existing = state.messages[threadId] ?? [];
  const seen = new Set(existing.map((m) => m.id));
  const incoming = rows.map(wireToMessage).filter((m) => !seen.has(m.id));
  if (!incoming.length) return;
  const merged = [...existing, ...incoming].sort((a, b) => a.at - b.at);
  set({ messages: { ...state.messages, [threadId]: merged } });
  if (threadId !== state.activeThreadId) {
    const add = incoming.filter((m) => m.authorId !== 'you').length;
    if (add) set({ unreads: { ...state.unreads, [threadId]: (state.unreads[threadId] ?? 0) + add } });
  }
}

let liveStarted = false;

/**
 * Attach the three public channels to their real rooms. Safe to call
 * repeatedly; a failed probe simply leaves the rooms CLOSED — which
 * the UI reports honestly instead of papering over with a fake crowd.
 * No claimed seat = no identity to post or subscribe with = closed.
 */
export async function startLiveRooms(me: { academyId: string } | null): Promise<boolean> {
  if (liveStarted) return state.live;
  if (!me) return false;
  const channels = await backend.listChannels();
  if (!channels) return false; // offline → rooms stay closed, honestly
  liveStarted = true;
  myAcademyId = me.academyId;
  set({ live: true });

  for (const [threadId, slug] of Object.entries(CHANNEL_SLUGS)) {
    const history = await backend.pullMessages(slug, 0, 50);
    if (history) mergeRoom(threadId, history);
    backend.joinRoom(slug, (e) => {
      if (e.type === 'message') {
        const tid = SLUG_TO_CHANNEL[e.channel];
        if (tid) mergeRoom(tid, [e.message]);
      } else if (e.type === 'presence') {
        const tid = SLUG_TO_CHANNEL[e.channel];
        if (tid) set({ presence: { ...state.presence, [tid]: e.users.length } });
      }
    });
  }
  return true;
}

export function isLive(): boolean {
  return state.live;
}

export function hhmm(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
