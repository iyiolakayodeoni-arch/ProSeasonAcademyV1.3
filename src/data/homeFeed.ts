import { Coach } from './coaches';
import { tickerWit } from './humor';

// ─────────────────────────────────────────────────────────────
// HOME FEED DATA LAYER
// Two sources, merged at render:
//   1) HAND-AUTHORED posts — you/the coaches write straight into
//      HAND_AUTHORED below (community wins/losses, coach updates,
//      academy news, coach-picked tricks). Never touched by the bot.
//   2) METABOT posts — src/data/liveFeed.json, regenerated ONLY by
//      `npm run export` in metabot/ after you approve drafts.
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
  | 'COMMUNITY_WIN'
  | 'COMMUNITY_LOSS'
  | 'COACH_UPDATE'
  | 'ACADEMY_NEWS';

export type FeedAccent = 'green' | 'gold' | 'red';

export interface FeedCardData {
  id: string;
  kind: FeedKind;
  tag: string; // display tag in the card's top row
  time: string; // "4H AGO" / "TODAY"
  headline: string;
  body?: string;
  cta?: string;
  ctaUrl?: string; // metabot cards open the real source link
  metaRight?: string; // right-aligned meta ("18 WATCHING", "2 MIN")
  accent: FeedAccent;
  thumbnail?: 'pitchRun' | 'pitchFade' | null;
  authorHandle?: string; // community cards
  avatar?: 'coach';
  reactions?: { icon: 'heart'; count: number };
  live?: boolean;
  origin: 'metabot' | 'coach' | 'community' | 'academy';
}

// ── hand-authored: coach picks + community + academy news ─────
// Edit freely — coaches' posts are always yours, never the bot's.
export function handAuthored(coach: Coach): FeedCardData[] {
  const first = coach.name.split(' ')[0];
  return [
    {
      id: 'hand-exploit-backpost',
      kind: 'EXPLOIT',
      tag: 'EXPLOIT',
      time: '1H AGO',
      headline: 'Back-post far tap-in: the new high-percentage finish',
      cta: 'WATCH 40s CLIP ›',
      metaRight: '2.1K SAVES',
      accent: 'green',
      thumbnail: 'pitchFade',
      origin: 'coach',
    },
    {
      id: 'hand-win-uchepro',
      kind: 'COMMUNITY_WIN',
      tag: 'COMMUNITY · WIN',
      time: '4H AGO',
      headline: 'Went 9-1 this weekend — promoted to DIV 2',
      body: 'Started the press-break pattern on Friday. Coincidence? Nobody thinks so.',
      cta: 'CONGRATULATE ›',
      accent: 'green',
      authorHandle: 'UCHEPRO  CONSOLE · DIV RIVALS',
      reactions: { icon: 'heart', count: 86 },
      origin: 'community',
    },
    {
      id: 'hand-coach-drill',
      kind: 'COACH_UPDATE',
      tag: 'COACH UPDATE',
      time: 'LIVE NOW',
      headline: `Coach ${first} shared a new finishing drill`,
      body: '"Film Room is open — new near-post drill, 10 reps, no excuses. Bring your loss notes too."',
      cta: 'JOIN ROOM ›',
      metaRight: '18 WATCHING',
      accent: 'green',
      avatar: 'coach',
      live: true,
      origin: 'coach',
    },
    {
      id: 'hand-loss-dre',
      kind: 'COMMUNITY_LOSS',
      tag: 'COMMUNITY · LOSS',
      time: '6H AGO',
      headline: 'Rough night in ranked — 1-4 slide after the patch',
      body: `${first === 'OBINNA' ? 'Obinna' : first} booked a group review for tomorrow 6PM. Bring your loss notes — losses are data.`,
      cta: 'RSVP TO REVIEW ›',
      metaRight: '12 SPOTS LEFT',
      accent: 'red',
      authorHandle: 'DRE_FC  CONSOLE · DIV RIVALS',
      origin: 'community',
    },
    {
      id: 'hand-news-intake',
      kind: 'ACADEMY_NEWS',
      tag: 'ACADEMY NEWS',
      time: 'YESTERDAY',
      headline: 'Doors open Friday — 50 new players join the season',
      body: 'New intake means fresh lobbies and fresh rivalries. Vets get first pick of review slots — log your week so your coach has your file ready.',
      cta: 'READ THE ANNOUNCEMENT ›',
      metaRight: '2 MIN',
      accent: 'green',
      origin: 'academy',
    },
    {
      id: 'hand-win-tunde',
      kind: 'COMMUNITY_WIN',
      tag: 'COMMUNITY · WIN',
      time: '8H AGO',
      headline: 'Man celebrated a 0–0 draw like a cup final',
      body: 'Fourth clean sheet in a row. He plays centre-back. The team voted 11–0 to let him have this one. Defence is a personality now.',
      cta: 'RESPECT THE GRIND ›',
      accent: 'gold',
      authorHandle: 'TUNDE_CB  CONSOLE · DIV RIVALS',
      reactions: { icon: 'heart', count: 214 },
      origin: 'community',
    },
  ];
}

// hero slot — hand-authored trick of the week unless the bot ships a fresher one
export const HERO_FALLBACK = {
  headline: 'The 7-second kick-off lane nobody is defending yet',
  body: 'Patch 4.2 broke the AI press — sprint the left channel straight off kick-off and the fullback just watches. The Disciplinarian tested it 40 games straight. Full pattern + counters inside.',
  cta: 'READ THE BREAKDOWN ›',
  meta: '6 MIN READ',
  duration: '04:37',
};

// ── metabot normalization ─────────────────────────────────────
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
    tag: KIND_TAG[p.kind] ?? 'META',
    time: timeAgo(p.discoveredAt),
    headline: p.headline,
    body: p.body,
    cta: p.cta,
    ctaUrl: p.sourceUrl, // opens the real source — traceable by design
    accent: 'green' as FeedAccent,
    thumbnail: p.kind === 'EXPLOIT' || p.kind === 'SKILL_MOVE' ? ('pitchRun' as const) : null,
    origin: 'metabot' as const,
  }));
}

// ── layout: weave coach/community cards through the bot finds ─
export function buildFeed(coach: Coach): FeedCardData[] {
  const hands = handAuthored(coach);
  const bot = metabotPosts();
  const byKind = (k: FeedKind, src: FeedCardData[]) => src.find((c) => c.kind === k);

  const ordered: (FeedCardData | undefined)[] = [
    byKind('EXPLOIT', hands) ?? byKind('EXPLOIT', bot),
    byKind('COMMUNITY_WIN', hands),
    byKind('COACH_UPDATE', hands),
    byKind('SKILL_MOVE', bot),
    byKind('COMMUNITY_LOSS', hands),
    byKind('ACADEMY_NEWS', hands),
  ];
  // remaining bot posts flow in discovery order, deduped
  const used = new Set(ordered.filter(Boolean).map((c) => (c as FeedCardData).id));
  for (const c of bot) if (!used.has(c.id)) ordered.push(c);
  for (const c of hands) if (!used.has(c.id)) ordered.push(c);
  return ordered.filter(Boolean) as FeedCardData[];
}

// ticker line = coach notes first, then the freshest meta headlines,
// with one line of house wit threaded through the middle
export function buildTicker(coach: Coach): string[] {
  const first = coach.name.split(' ')[0];
  const manual = [`COACH ${first} DROPPED A NEW DRILL`, 'NEW META: BACK-POST FAR TAP-IN'];
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
