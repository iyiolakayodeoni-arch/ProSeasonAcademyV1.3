import { Coach } from './coaches';
import { tickerWit } from './humor';

// ─────────────────────────────────────────────────────────────
// HOME FEED DATA LAYER
//
// The Home page is not fake community filler anymore.
// It has two honest lanes:
//   1) FOUNDER / COACH posts — written by you or generated from
//      actual academy events. These are never pretending to be
//      random members.
//   2) METABOT posts — approved scouting finds from liveFeed.json.
//      MetaBot can collect for free, but nothing reaches players
//      until the founder approves/exports it.
// ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LIVE_FEED: {
  updatedAt: string;
  currentPatch: string;
  posts: {
    id: string;
    kind: string;
    headline: string;
    body: string;
    cta: string;
    patchVersion: string;
    discoveredAt: string;
    sourceName: string;
    sourceUrl: string;
  }[];
} = require('./liveFeed.json');

export type FeedKind =
  | 'EXPLOIT'
  | 'SKILL_MOVE'
  | 'PATCH_NOTE'
  | 'META_SHIFT'
  | 'TRICK_OF_THE_WEEK'
  | 'COACH_UPDATE'
  | 'ACADEMY_NEWS';

export type FeedAccent = 'green' | 'gold' | 'red';

export interface FeedCardData {
  id: string;
  kind: FeedKind;
  tag: string;
  time: string;
  headline: string;
  body?: string;
  cta?: string;
  ctaUrl?: string;
  metaRight?: string;
  accent: FeedAccent;
  thumbnail?: 'pitchRun' | 'pitchFade' | 'kickoff' | null;
  authorHandle?: string;
  avatar?: 'coach';
  reactions?: { icon: 'heart'; count: number };
  live?: boolean;
  origin: 'metabot' | 'coach' | 'academy';
}

export function nextGroupSessionLabel(now = Date.now()): string {
  // Compulsory coach-group film rooms every 4 days. Anchor is stable,
  // then roll forward so every build shows the next real window.
  const anchor = Date.UTC(2026, 6, 29, 18, 0, 0); // 29 Jul 2026, 18:00 UTC
  const every = 4 * 86_400_000;
  const next = anchor + Math.max(0, Math.ceil((now - anchor) / every)) * every;
  const d = new Date(next);
  return `${d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()} · 18:00`;
}

// Founder/coaches only. Replace this with a backend announcements table
// when the Founder Desk message composer is wired into Home.
export function handAuthored(coach: Coach): FeedCardData[] {
  const first = coach.name.split(' ')[0];
  const groupWhen = nextGroupSessionLabel();
  return [
    {
      id: 'founder-state-of-academy',
      kind: 'ACADEMY_NEWS',
      tag: 'FROM THE FOUNDER',
      time: 'PINNED',
      headline: 'Testing first. No January promise. No broken money flow.',
      body:
        'The academy opens when the UX, backend, paywall, lessons, songs and match scan are ready. I will post every official academy announcement here myself.',
      cta: 'READ FOUNDER NOTE ›',
      metaRight: 'IMPORTANT',
      accent: 'gold',
      origin: 'academy',
    },
    {
      id: 'coach-group-session',
      kind: 'COACH_UPDATE',
      tag: 'GROUP FILM ROOM',
      time: groupWhen,
      headline: `${first}'s next compulsory group session`,
      body:
        'Every player on the same coach path comes into the film room together: same lesson, shared notes, questions, receipts and accountability.',
      cta: 'SESSION DETAILS ›',
      metaRight: 'EVERY 4 DAYS',
      accent: 'green',
      avatar: 'coach',
      live: false,
      origin: 'coach',
    },
  ];
}

export const HERO_FALLBACK = {
  headline: 'Founder channel is warming up',
  body:
    'When the bot exports fresh approved finds, the newest mechanic appears here. When the founder needs to speak, Home reads like an announcement board — not fake member noise.',
  cta: 'OPEN THE LATEST NOTE ›',
  meta: 'FOUNDER',
  duration: 'LOOP',
};

const KIND_TAG: Record<string, string> = {
  EXPLOIT: 'EXPLOIT',
  SKILL_MOVE: 'SKILL MOVE',
  PATCH_NOTE: 'PATCH NOTE',
  META_SHIFT: 'META SHIFT',
  TRICK_OF_THE_WEEK: 'TRICK OF THE WEEK',
};

function timeAgo(isoDate: string): string {
  const days = Math.max(0, Math.round((Date.now() - new Date(isoDate).getTime()) / 86400000));
  if (days <= 0) return 'TODAY';
  if (days === 1) return '1D AGO';
  if (days < 7) return `${days}D AGO`;
  return `${Math.floor(days / 7)}W AGO`;
}

export function metabotPosts(): FeedCardData[] {
  return LIVE_FEED.posts.map((p) => ({
    id: p.id,
    kind: (p.kind as FeedKind) ?? 'META_SHIFT',
    tag: KIND_TAG[p.kind] ?? 'META WATCH',
    time: timeAgo(p.discoveredAt),
    headline: p.headline,
    body: p.body,
    cta: p.cta,
    ctaUrl: p.sourceUrl,
    accent: 'green' as FeedAccent,
    thumbnail: p.kind === 'EXPLOIT' || p.kind === 'SKILL_MOVE' ? ('pitchRun' as const) : null,
    origin: 'metabot' as const,
  }));
}

export function buildFeed(coach: Coach): FeedCardData[] {
  const hands = handAuthored(coach);
  const bot = metabotPosts();
  const ordered: FeedCardData[] = [];

  // Founder note first, then fresh bot/meta, then coach/group session.
  const founder = hands.find((c) => c.kind === 'ACADEMY_NEWS');
  if (founder) ordered.push(founder);
  ordered.push(...bot);
  const coachPost = hands.find((c) => c.kind === 'COACH_UPDATE');
  if (coachPost) ordered.push(coachPost);

  const seen = new Set<string>();
  return ordered.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}

// ticker line = coach notes first, then the freshest meta headlines,
// with one line of house wit threaded through the middle
export function buildTicker(coach: Coach): string[] {
  const first = coach.name.split(' ')[0];
  const manual = [
    'FOUNDER NOTE: TESTING FIRST, NO RUSHED LAUNCH',
    `NEXT ${first.toUpperCase()} GROUP SESSION: ${nextGroupSessionLabel()}`,
  ];
  const botHeads = metabotPosts()
    .slice(0, 4)
    .map((p) => p.headline.replace(/[!?]+$/, ''));
  const out = [...manual];
  if (botHeads.length) out.push(botHeads[0]);
  out.push(tickerWit());
  out.push(...botHeads.slice(1));
  return out;
}

export const FEED_UPDATED_AT = LIVE_FEED.updatedAt;
export const FEED_CURRENT_PATCH = LIVE_FEED.currentPatch;
