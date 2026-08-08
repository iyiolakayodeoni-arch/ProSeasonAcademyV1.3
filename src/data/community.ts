import { useSyncExternalStore } from 'react';
import * as backend from './backend';

// ─────────────────────────────────────────────────────────────
// COMMUNITY DATA LAYER — a simple Discord-style community.
//
// · ONE general room where everyone chats (real Supabase room).
// · REAL per-pair private DMs — tap a player and you get a private
//   chat shared by just the two of you.
// · NO simulation. Nothing is scripted. A message renders only when
//   a real human sent it. Offline = the rooms are closed and the UI
//   says so — it never fakes a send or a crowd.
// ─────────────────────────────────────────────────────────────

/** the single public room */
export const GENERAL_SLUG = 'dressing-room';

export interface ChatUser {
  id: string;
  handle: string;
  color: string;
  role: 'you' | 'member' | 'coach';
  online: boolean;
  tagline: string;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  at: number;
  text: string;
}

/** the one guaranteed user: you */
export function buildUsers(): Record<string, ChatUser> {
  return {
    you: { id: 'you', handle: 'YOU', color: '#39FF6A', role: 'you', online: true, tagline: 'THIS IS YOU — ACADEMY PLAYER' },
  };
}

// ── the store ────────────────────────────────────────────────
// threadId: 'general' = the public room · `dm:<academyId>` = a DM
export interface CommunityState {
  messages: Record<string, ChatMessage[]>;
  unreads: Record<string, number>;
  /** live online count in the general room */
  presence: number;
  /** true once the general room mirrors a real Supabase room */
  live: boolean;
  /** threads that are open (DM threads join their room when opened) */
  openThreads: string[];
}

let state: CommunityState = {
  messages: {},
  unreads: {},
  presence: 0,
  live: false,
  openThreads: ['general'],
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

// ── realtime bridge — real Supabase rooms ────────────────────
const REMOTE_COLORS = ['#8fb89b', '#f2c078', '#ffcf7a', '#7fd4ff', '#57d07c'];
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
    tagline: isFounder ? 'THE FOUNDER' : `ACADEMY PLAYER · ${key}`,
  };
  remoteUsers.set(key, u);
  return u;
}

/** a DM is a real per-pair room — deterministic, sorted, private to the pair */
export function dmSlugFor(a: string, b: string): string {
  const [x, y] = [a, b].sort();
  return `dm:${x}:${y}`;
}

function wireToMessage(m: backend.ServerMessage): ChatMessage {
  const mine = !!myAcademyId && m.academyId === myAcademyId;
  const author = mine ? 'you' : remoteUser(m.author, m.academyId ?? '', m.kind).id;
  return {
    id: `srv-${m.id}`,
    authorId: author,
    at: typeof m.at === 'number' ? m.at : Date.parse(String(m.at)) || Date.now(),
    text: m.text,
  };
}

function mergeThread(threadId: string, slug: string, rows: backend.ServerMessage[]) {
  if (!rows.length) return;
  const existing = state.messages[threadId] ?? [];
  const seen = new Set(existing.map((m) => m.id));
  const incoming = rows.map(wireToMessage).filter((m) => !seen.has(m.id));
  if (!incoming.length) return;
  const merged = [...existing, ...incoming].sort((a, b) => a.at - b.at);
  set({ messages: { ...state.messages, [threadId]: merged } });
  // the open general room never unreads itself
  if (threadId !== 'general' && threadId !== state.openThreads[0]) {
    const add = incoming.filter((m) => m.authorId !== 'you').length;
    if (add) set({ unreads: { ...state.unreads, [threadId]: (state.unreads[threadId] ?? 0) + add } });
  }
}

const joined = new Set<string>();
const handlers = new Map<string, (e: backend.CloudEvent) => void>();

/** join a room (general or a DM pair) and wire its history + realtime */
export async function openThread(threadId: string, otherId?: string): Promise<boolean> {
  if (threadId === 'general') {
    return startLiveRooms();
  }
  // DM
  if (!myAcademyId) {
    const me = backend.getMe();
    if (me?.academyId) myAcademyId = me.academyId;
  }
  if (!myAcademyId || !otherId || otherId === myAcademyId) return false;
  const slug = dmSlugFor(myAcademyId, otherId);
  await backend.ensureChannel(slug, 'PRIVATE CHAT', '1-ON-1 BETWEEN TWO PLAYERS');
  if (!joined.has(slug)) {
    const history = await backend.pullMessages(slug, 0, 50);
    if (history) mergeThread(threadId, slug, history);
    backend.joinRoom(slug, (e) => {
      if (e.type === 'message') mergeThread(threadId, slug, [e.message]);
    });
    joined.add(slug);
  }
  if (!state.openThreads.includes(threadId)) set({ openThreads: [...state.openThreads, threadId] });
  return true;
}

export function isThreadOpen(threadId: string): boolean {
  return state.openThreads.includes(threadId);
}

let liveStarted = false;

/** Attach the general room to its real Supabase room. Offline = closed. */
export async function startLiveRooms(): Promise<boolean> {
  if (liveStarted) return state.live;
  if (!myAcademyId) {
    const me = backend.getMe();
    if (!me) return false;
    myAcademyId = me.academyId;
  }
  if (!myAcademyId) return false;
  const channels = await backend.listChannels();
  if (!channels) return false;
  liveStarted = true;
  set({ live: true });

  const history = await backend.pullMessages(GENERAL_SLUG, 0, 50);
  if (history) mergeThread('general', GENERAL_SLUG, history);
  backend.joinRoom(GENERAL_SLUG, (e) => {
    if (e.type === 'message') mergeThread('general', GENERAL_SLUG, [e.message]);
    else if (e.type === 'presence') set({ presence: e.users.length });
  });
  return true;
}

export function isLive(): boolean {
  return state.live;
}

/** send into a REAL room. Offline, or not a real thread → refuses (no echo). */
export function sendText(threadId: string, text: string) {
  const t = text.trim();
  if (!t || !state.live) return;
  if (threadId === 'general') {
    backend.sendRoomMessage(GENERAL_SLUG, t);
  } else if (threadId.startsWith('dm:')) {
    backend.sendRoomMessage(threadId, t);
  }
}

/** the room slug behind a threadId (general or a DM thread) */
export function slugFor(threadId: string): string {
  return threadId === 'general' ? GENERAL_SLUG : threadId;
}

export function hhmm(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
