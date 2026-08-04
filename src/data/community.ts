import { useSyncExternalStore } from 'react';
import { Coach } from './coaches';
import * as backend from './backend';

// ─────────────────────────────────────────────────────────────
// COMMUNITY DATA LAYER — channels + private DMs + presence.
// Structural rule: a thread is either type 'channel' or 'dm' —
// a private message can NEVER render inside a public channel.
//
// LIVE MODE: when the academy cloud is reachable the three public
// channels (#general / #wins / #losses) mirror real Supabase rooms
// — real players, real messages, realtime fan-out. The scripted
// engine only runs OFFLINE so an empty hall never feels dead.
// DMs remain local in v1 (no per-pair rooms in the schema yet).
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
  kind?: 'text' | 'voice' | 'squad';
  voiceSecs?: number;
  squad?: { members: string[]; slots: number };
  reactions?: { icon: ReactionIcon; count?: number }[];
}

export interface ChannelDef {
  id: string;
  type: 'channel';
  name: string;
  desc: string;
  baseCount: number;
  readOnly?: boolean;
}

export interface DmDef {
  id: string;
  type: 'dm';
  userId: string; // the other participant (you are implied)
}

export type ThreadRef = { type: 'channel' | 'dm'; id: string };

// ── static catalogs ───────────────────────────────────────────

export const CHANNELS: ChannelDef[] = [
  { id: 'general', type: 'channel', name: 'general', desc: 'THE CLUBHOUSE', baseCount: 128 },
  { id: 'wins', type: 'channel', name: 'wins', desc: 'POST YOUR DUBS — RECEIPTS ONLY', baseCount: 86 },
  { id: 'losses', type: 'channel', name: 'losses', desc: 'THE REVIEW ROOM — BRING NOTES', baseCount: 64 },
  { id: 'coach-updates', type: 'channel', name: 'coach-updates', desc: 'FROM YOUR COACH — READ ONLY', baseCount: 205, readOnly: true },
];

export function buildUsers(coach: Coach): Record<string, ChatUser> {
  const coachFirst = coach.name.split(' ')[0];
  return {
    you: { id: 'you', handle: 'YOU', color: '#39FF6A', role: 'you', online: true, tagline: 'THIS IS YOU — ACADEMY PLAYER' },
    uche: { id: 'uche', handle: 'UCHEPRO', color: '#39FF6A', role: 'member', online: true, tagline: 'DIV RIVALS · GRINDS REPS DAILY' },
    p9: { id: 'p9', handle: 'PLAYER_09', color: '#8fb89b', role: 'member', online: true, tagline: 'CONSOLE · ALWAYS STACKING' },
    dre: { id: 'dre', handle: 'DRE_FC', color: '#e0605c', role: 'member', online: true, tagline: 'ROUGH WEEK — THE SCAN KNOWS' },
    p44: { id: 'p44', handle: 'PLAYER_44', color: '#f2c078', role: 'member', online: false, tagline: 'LUCKIEST PERSON IN THE CLUBHOUSE' },
    p12: { id: 'p12', handle: 'PLAYER_12', color: '#39FF6A', role: 'member', online: false, tagline: 'QUIET. WATCHES EVERYTHING.' },
    kojo: { id: 'kojo', handle: 'KOJO_9', color: '#ffcf7a', role: 'member', online: true, tagline: 'FRIENDLY · FIRST TO CONGRATS' },
    coach: { id: 'coach', handle: `COACH_${coachFirst}`, color: '#f2c078', role: 'coach', online: true, tagline: `${coach.title} · RUNS THE FILM ROOM` },
  };
}

// ── seed threads ──────────────────────────────────────────────

let seq = 0;
const mid = () => `m${++seq}-${Date.now().toString(36)}`;
const at = (minAgo: number) => Date.now() - minAgo * 60000;

function seedMessages(): Record<string, ChatMessage[]> {
  return {
    general: [
      { id: mid(), authorId: 'uche', at: at(12), text: '9–1 this weekend. DIV 2 secured. took all ten games by the throat' },
      {
        id: mid(),
        authorId: 'uche',
        at: at(12),
        text: 'the press-break pattern from the hub actually works. coach was right the whole time',
        reactions: [
          { icon: 'fire', count: 24 },
          { icon: 'laugh', count: 6 },
          { icon: 'eye', count: 11 },
        ],
      },
      { id: mid(), authorId: 'p9', at: at(10), text: 'anyone tryna run a few games rn' },
      { id: mid(), authorId: 'p9', at: at(10), text: 'need one more for a 3 stack, mic optional, vibes mandatory' },
      { id: mid(), authorId: 'dre', at: at(9), text: "nah i'm retired after last night. 1–4. my match scan already told the coach", reactions: [{ icon: 'eye' }] },
      { id: mid(), authorId: 'p44', at: at(7), text: 'bro I just packed an icon — who was I even praying to', reactions: [{ icon: 'laugh', count: 2 }] },
      { id: mid(), authorId: 'p9', at: at(6), text: 'show it' },
      {
        id: mid(),
        authorId: 'coach',
        at: at(5),
        text: 'focus up — film room in 10. @DRE_FC bring your loss notes, all four of them.',
      },
      {
        id: mid(),
        authorId: 'coach',
        at: at(5),
        text: 'and congrats @UCHEPRO. div 2 is where excuses stop working. see you there.',
      },
      { id: mid(), authorId: 'p12', at: at(5), text: 'screenshots ready. sitting front row for this one', reactions: [{ icon: 'eye' }] },
      { id: mid(), authorId: 'p44', at: at(4), text: 'sir yes sir' },
    ],
    wins: [
      { id: mid(), authorId: 'kojo', at: at(140), text: 'first clean sheet all season. the shape holds when you trust it' },
      { id: mid(), authorId: 'uche', at: at(90), text: 'DIV 2. ten-game unbeaten run locked. receipts in the clips channel', reactions: [{ icon: 'fire', count: 18 }] },
    ],
    losses: [
      { id: mid(), authorId: 'dre', at: at(300), text: '1–4 tonight. all four goals came off MY sprint habits. scan flagged every one', reactions: [{ icon: 'eye', count: 7 }] },
      { id: mid(), authorId: 'p12', at: at(260), text: 'same slide last week. the fix was literally just… stop sprinting' },
    ],
    'coach-updates': [
      { id: mid(), authorId: 'coach', at: at(60 * 22), text: 'NEW INTAKE FRIDAY — vets get first pick of review slots. log your week.' },
      { id: mid(), authorId: 'coach', at: at(60 * 4), text: 'FILM ROOM 6PM TOMORROW — the lane change, live reps. nobody watches alone.' },
    ],
    'dm-dre': [
      { id: mid(), authorId: 'dre', at: at(50), text: 'the scan flagged me again lol. you passing yours?' },
    ],
    'dm-coach': [
      { id: mid(), authorId: 'coach', at: at(60 * 6), text: 'film room moved to 6. your stage notes are on your file.' },
    ],
  };
}

const SEED_DMS: DmDef[] = [
  { id: 'dm-dre', type: 'dm', userId: 'dre' },
  { id: 'dm-coach', type: 'dm', userId: 'coach' },
];

// ── the store ─────────────────────────────────────────────────

export interface CommunityState {
  activeThreadId: string;
  messages: Record<string, ChatMessage[]>;
  unreads: Record<string, number>;
  typing: Record<string, string[]>; // threadId → userIds composing right now
  toggled: Record<string, ReactionIcon[]>;
  muted: string[];
  presence: Record<string, number>;
  dms: DmDef[];
  joinedSquads: Record<string, boolean>;
  /** true once a public channel is mirroring a real Supabase room */
  live: boolean;
}

let state: CommunityState = {
  activeThreadId: 'general',
  messages: seedMessages(),
  unreads: { 'dm-dre': 1 },
  typing: {},
  toggled: {},
  muted: [],
  presence: Object.fromEntries(CHANNELS.map((c) => [c.id, c.baseCount])),
  dms: SEED_DMS,
  joinedSquads: {},
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

// ── thread helpers ────────────────────────────────────────────

export function isDm(threadId: string, dms: DmDef[]): boolean {
  return dms.some((d) => d.id === threadId);
}

export function dmUser(threadId: string, dms: DmDef[]): string {
  return dms.find((d) => d.id === threadId)?.userId ?? 'uche';
}

function append(threadId: string, msg: ChatMessage) {
  set({ messages: { ...state.messages, [threadId]: [...(state.messages[threadId] ?? []), msg] } });
  if (threadId !== state.activeThreadId) {
    set({ unreads: { ...state.unreads, [threadId]: (state.unreads[threadId] ?? 0) + 1 } });
  }
}

function setTypingOf(threadId: string, userId: string, on: boolean) {
  const cur = new Set(state.typing[threadId] ?? []);
  if (on) cur.add(userId);
  else cur.delete(userId);
  set({ typing: { ...state.typing, [threadId]: [...cur] } });
}

// ── public actions ────────────────────────────────────────────

export function setActiveThread(threadId: string) {
  set({ activeThreadId: threadId, unreads: { ...state.unreads, [threadId]: 0 } });
}

export function openDm(userId: string): string {
  const existing = state.dms.find((d) => d.userId === userId);
  if (existing) {
    setActiveThread(existing.id);
    return existing.id;
  }
  const id = `dm-${userId}-${Date.now().toString(36)}`;
  set({
    dms: [...state.dms, { id, type: 'dm', userId }],
    messages: { ...state.messages, [id]: [] },
  });
  setActiveThread(id);
  return id;
}

export function sendText(threadId: string, text: string) {
  const t = text.trim();
  if (!t) return;
  const slug = CHANNEL_SLUGS[threadId];
  if (state.live && slug) {
    // LIVE room: the server is the source of truth. Send it up and let
    // realtime echo it back so ordering matches every other player's
    // screen — no optimistic duplicate to reconcile later.
    backend.sendRoomMessage(slug, t);
    return;
  }
  append(threadId, { id: mid(), authorId: 'you', at: Date.now(), text: t });
  maybeReply(threadId);
}

export function sendVoice(threadId: string, secs: number) {
  if (secs < 1) return;
  append(threadId, { id: mid(), authorId: 'you', at: Date.now(), text: '', kind: 'voice', voiceSecs: secs });
  maybeReply(threadId);
}

export function postSquadCard(threadId: string, members: string[], slots: number) {
  if (state.messages[threadId]?.some((m) => m.kind === 'squad')) return;
  append(threadId, {
    id: mid(),
    authorId: 'uche',
    at: Date.now(),
    text: '',
    kind: 'squad',
    squad: { members, slots },
  });
}

export function joinSquad(threadId: string) {
  set({ joinedSquads: { ...state.joinedSquads, [threadId]: true } });
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

export function shareScanResult(threadId: string, text: string) {
  const slug = CHANNEL_SLUGS[threadId];
  if (state.live && slug) {
    backend.sendRoomMessage(slug, text);
    return;
  }
  append(threadId, { id: mid(), authorId: 'you', at: Date.now(), text });
}

// ── LIVE BRIDGE — real Supabase rooms ─────────────────────────
// Remote players are folded into the same ChatUser map the UI
// already renders, so nothing downstream knows the difference
// between a scripted member and a real one.

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
 * Attach the three public channels to their real rooms. Safe to
 * call repeatedly; a failed probe simply leaves the app offline
 * and the scripted engine keeps the hall warm.
 */
export async function startLiveRooms(me: { academyId: string } | null): Promise<boolean> {
  if (liveStarted) return state.live;
  // No claimed seat = no identity to post or subscribe with. Staying
  // offline is the honest outcome: better a warm scripted hall than a
  // real one the player can only stare at.
  if (!me) return false;
  const channels = await backend.listChannels();
  if (!channels) return false; // offline → caller falls back to mock traffic
  liveStarted = true;
  myAcademyId = me.academyId;

  // clear the seeded fiction out of the public rooms — this is a real hall now
  const cleared = { ...state.messages };
  for (const id of Object.keys(CHANNEL_SLUGS)) cleared[id] = [];
  set({ messages: cleared, live: true });

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

// ── mock live traffic — scripted presence + inbound messages ──
let engineStop: (() => void) | null = null;
let mockRunning = false;

/**
 * True while the SCRIPTED demo engine is filling the halls.
 * The UI shows an explicit banner when this is on, so nobody
 * mistakes scripted members for real people.
 */
export function isMockTrafficRunning(): boolean {
  return mockRunning;
}

export function startMockTraffic(coach: Coach) {
  if (engineStop) return engineStop;
  mockRunning = true;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const L = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
  const coachHandle = 'coach';

  L(1600, () => setTypingOf('general', 'kojo', true));
  L(4300, () => {
    setTypingOf('general', 'kojo', false);
    append('general', { id: mid(), authorId: 'kojo', at: Date.now(), text: 'gg on the icon pull @PLAYER_44 — bring that luck to the film room' });
  });
  L(11000, () => setTypingOf('general', 'uche', true));
  L(13900, () => {
    setTypingOf('general', 'uche', false);
    append('general', { id: mid(), authorId: 'uche', at: Date.now(), text: 'lane change rep count: 40 today. thumbs are cooked but the clips look filthy' });
  });
  L(20500, () => setTypingOf('general', coachHandle, true));
  L(23200, () => {
    setTypingOf('general', coachHandle, false);
    append('general', {
      id: mid(),
      authorId: coachHandle,
      at: Date.now(),
      text: 'film room in 5. headsets on. @DRE_FC first clip is yours, iron it out live',
    });
  });
  // background traffic → unread dots on the channel list
  L(8000, () => append('wins', { id: mid(), authorId: 'dre', at: Date.now(), text: '3–0 night back from the dead. scan passed with room to spare' }));
  L(18000, () => append('coach-updates', { id: mid(), authorId: coachHandle, at: Date.now(), text: 'TOMORROW 6PM — group review. one loss clip each. nobody watches alone.' }));
  L(27000, () => append('losses', { id: mid(), authorId: 'p9', at: Date.now(), text: '1–3 tonight. the press break is NOT clicking for me yet' }));
  // coach DMs you after the film room kicks off
  L(31000, () => setTypingOf('dm-coach', coachHandle, true));
  L(33600, () => {
    setTypingOf('dm-coach', coachHandle, false);
    append('dm-coach', { id: mid(), authorId: coachHandle, at: Date.now(), text: 'grass is quiet. the lane change reps you did in ranked? more of that. less sprint.' });
  });

  // presence shimmer
  const iv = setInterval(() => {
    const p = { ...state.presence };
    for (const c of CHANNELS) p[c.id] = c.baseCount + Math.floor(Math.random() * 7) - 2;
    set({ presence: p });
  }, 9000);

  engineStop = () => {
    timers.forEach(clearTimeout);
    clearInterval(iv);
    engineStop = null;
    mockRunning = false;
  };
  return engineStop;
}

// canned DM replies so private chats answer back
const DM_REPLIES: Record<string, string[]> = {
  dre: ["bro same. ran it back and the flags cleared", 'film room is where i die lol. see you there', 'gg. run it tomorrow?'],
  coach: ['noted. log it and bring the clip.', 'good. the scan will confirm it.', 'keep it simple — reps over talk.'],
  uche: ['anytime. we run stacks tonight?', 'lol. clip or it never happened', 'div 2 energy — stay with me.'],
  p9: ['yo', 'down for a few later', 'mic optional, vibes mandatory'],
  p44: ['i am simply built different rn', 'the pack luck is real', 'say less'],
  p12: ['…noted', 'saw that. receipts when?', 'ok'],
  kojo: ['haha gg', 'you good? run a few after film room', 'love to see it'],
};

let replyBudget: Record<string, number> = {};
function maybeReply(threadId: string) {
  const dm = state.dms.find((d) => d.id === threadId);
  if (!dm) return;
  const uses = replyBudget[threadId] ?? 0;
  if (uses >= 3) return;
  replyBudget = { ...replyBudget, [threadId]: uses + 1 };
  const pool = DM_REPLIES[dm.userId] ?? DM_REPLIES.p12;
  const line = pool[uses % pool.length];
  setTimeout(() => setTypingOf(threadId, dm.userId, true), 1200);
  setTimeout(() => {
    setTypingOf(threadId, dm.userId, false);
    append(threadId, { id: mid(), authorId: dm.userId, at: Date.now(), text: line });
  }, 3600);
}

export function hhmm(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function previewOf(threadId: string, msgs: ChatMessage[] | undefined): string {
  const last = msgs?.[msgs.length - 1];
  if (!last) return 'say something first —';
  if (last.kind === 'voice') return `voice note · 0:${String(last.voiceSecs ?? 0).padStart(2, '0')}`;
  if (last.kind === 'squad') return 'squad open — slots left';
  const who = last.authorId === 'you' ? 'you: ' : '';
  return `${who}${last.text}`;
}
