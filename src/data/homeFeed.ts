import { Coach } from './coaches';
import { tickerWit } from './humor';
import { SideLesson, sideLessonFromPost } from './sideLesson';
import { roleModelFeed, roleTimeLabel, ROLE_TYPE_LABEL } from './roleModelFeed';

// ─────────────────────────────────────────────────────────────
// HOME FEED DATA LAYER — CONSOLE FC 26 COMPETITIVE FOCUS
//
// The Home page is calibrated specifically for PS5 & Xbox Series X|S
// competitive play. No mobile-first framing, no touch-tap language.
// Tactical debriefs, custom formations, Weekend League (Champs)
// qualification, Division Rivals ladder climbing, and controller inputs
// govern every note.
// ─────────────────────────────────────────────────────────────

interface LiveLessonBlock {
  topic: string;
  name: string;
  headline: string;
  why: string;
  tiles: SideLesson['tiles'];
  rule: string;
  clip: SideLesson['clip'];
  scan: { label: string; target: string }[];
}

interface LivePostRow {
  id: string;
  kind: string;
  headline: string;
  body: string;
  cta: string;
  patchVersion: string;
  discoveredAt: string;
  sourceName: string;
  sourceUrl: string;
  lesson?: LiveLessonBlock;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LIVE_FEED: {
  updatedAt: string;
  currentPatch: string;
  posts: LivePostRow[];
} = require('./liveFeed.json');

export type FeedKind =
  | 'EXPLOIT'
  | 'SKILL_MOVE'
  | 'PATCH_NOTE'
  | 'META_SHIFT'
  | 'TRICK_OF_THE_WEEK'
  | 'COACH_UPDATE'
  | 'ACADEMY_NEWS'
  | 'ROLE_MODEL'; // the role model story stream — clearly distinct from real FC 26 intel

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
  /** the in-app SIDE NOTE — when present, the card opens the lesson + blog inside the app */
  sideLesson?: SideLesson;
}

export function nextGroupSessionLabel(now = Date.now()): string {
  // Group session windows every 4 days. Anchor is stable,
  // then roll forward so every build shows the next real window.
  const anchor = Date.UTC(2026, 6, 29, 18, 0, 0); // 29 Jul 2026, 18:00 UTC
  const every = 4 * 86_400_000;
  const next = anchor + Math.max(0, Math.ceil((now - anchor) / every)) * every;
  const d = new Date(next);
  return `${d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()} · 18:00`;
}

// Hand-authored items focusing strictly on console FC 26
export function handAuthored(coach: Coach): FeedCardData[] {
  const first = coach.name.split(' ')[0];
  const groupWhen = nextGroupSessionLabel();
  return [
    {
      id: 'founder-console-positioning',
      kind: 'ACADEMY_NEWS',
      tag: 'CONSOLES ONLY · PS5 & XBOX',
      time: 'PINNED',
      headline: 'Mainline FC 26 competitive training sandbox.',
      body:
        'This academy is calibrated exclusively for PS5 and Xbox Series X|S competitive play. Every tactic, controller button-combo, and Match Scan targets the mainline console gameplay — Division Rivals, Champions, and Clubs session debriefs.',
      cta: 'SWEAR THE CONSOLE STANDARD ›',
      metaRight: 'MAINLINE FC 26',
      accent: 'gold',
      origin: 'academy',
    },
    {
      id: 'coach-group-session',
      kind: 'COACH_UPDATE',
      tag: 'CO-OP & CLUBS TACTICAL LAB',
      time: groupWhen,
      headline: `${first}'s Elite Rivals & Champs debrief`,
      body:
        'Controllers in hand, squad. We are dissecting the 4-3-2-1 Inverted Wingback overloads, analyzing the frame data of Tackle Personality, and sharing raw Match Vault receipts. Mandatory attendance for the competitive ladder.',
      cta: 'ENTER THE TACTIC LAB ›',
      metaRight: 'COACH\'S ROOM',
      accent: 'green',
      avatar: 'coach',
      live: false,
      origin: 'coach',
    },
  ];
}

export const HERO_FALLBACK = {
  headline: 'Founder console channel is warming up',
  body:
    'When the scouting bot exports fresh approved console clips, the newest mechanic appears here. When the founder speaks, Home reads like an announcement board for serious controller players.',
  cta: 'OPEN THE CONSOLE BRIEFING ›',
  meta: 'FOUNDER',
  duration: 'LOOP',
};

const KIND_TAG: Record<string, string> = {
  EXPLOIT: 'CONSOLE EXPLOIT',
  SKILL_MOVE: 'CONTROLLER SKILL MOVE',
  PATCH_NOTE: 'CONSOLES PATCH NOTE',
  META_SHIFT: 'COMPETITIVE META SHIFT',
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
    tag: KIND_TAG[p.kind] ?? 'CONSOLE META WATCH',
    time: timeAgo(p.discoveredAt),
    headline: p.headline,
    body: p.body,
    // a post with a lesson is a SIDE NOTE — read it in the app, not the browser
    cta: p.lesson ? 'READ THE CONTROLLER DEBRIEF — IN-APP ›' : p.cta,
    ctaUrl: p.sourceUrl,
    accent: 'green' as FeedAccent,
    thumbnail: p.kind === 'EXPLOIT' || p.kind === 'SKILL_MOVE' ? ('pitchRun' as const) : null,
    origin: 'metabot' as const,
    sideLesson: p.lesson
      ? sideLessonFromPost({
          id: p.id,
          kind: p.kind,
          patchVersion: p.patchVersion,
          discoveredAt: p.discoveredAt,
          sourceName: p.sourceName,
          sourceUrl: p.sourceUrl,
          body: p.body,
          lesson: {
            name: p.lesson.name,
            headline: p.lesson.headline,
            why: p.lesson.why,
            tiles: p.lesson.tiles,
            rule: p.lesson.rule,
            clip: p.lesson.clip,
          },
        })
      : undefined,
  }));
}

export function buildFeed(coach: Coach): FeedCardData[] {
  const hands = handAuthored(coach);
  const bot = metabotPosts();
  const ordered: FeedCardData[] = [];

  // Founder note first, then fresh bot/meta, then the role model story
  // cross-posts, then coach/group session.
  const founder = hands.find((c) => c.kind === 'ACADEMY_NEWS');
  if (founder) ordered.push(founder);
  ordered.push(...bot);
  ordered.push(...roleModelCrossPosts(coach));
  const coachPost = hands.find((c) => c.kind === 'COACH_UPDATE');
  if (coachPost) ordered.push(coachPost);

  const seen = new Set<string>();
  return ordered.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}

// ── ROLE MODEL STORY cross-posts — short highlights of Chinedu's ongoing
// serialized feed, surfaced passively into Home so users who don't dig into
// Journey still encounter the story. Distinct kind + gold accent so it reads
// as "his ongoing story," never as coaching content aimed at the player.
const ROLE_MODEL_CROSS_COUNT = 2;

export function roleModelCrossPosts(coach: Coach): FeedCardData[] {
  const first = coach.name.split(' ')[0];
  return roleModelFeed(coach)
    .slice(0, ROLE_MODEL_CROSS_COUNT)
    .map((e) => ({
      id: `rm-cross-${e.id}`,
      kind: 'ROLE_MODEL' as FeedKind,
      tag: `ROLE MODEL STORY · ${ROLE_TYPE_LABEL[e.type].split(' · ')[0]}`,
      time: roleTimeLabel(e.daysAgo),
      headline: e.headline,
      body: e.body,
      cta: 'FOLLOW HIS ONGOING STORY ›',
      metaRight: e.statLine,
      accent: e.type === 'trick' ? ('green' as FeedAccent) : ('gold' as FeedAccent),
      authorHandle: `${first.toUpperCase()} · THE STANDARD`,
      avatar: 'coach' as const,
      live: e.daysAgo <= 0,
      origin: 'coach' as const,
    }));
}

// ticker line = coach notes first, then the freshest meta headlines,
// with one line of house wit threaded through the middle
export function buildTicker(_coach: Coach): string[] {
  const manual = [
    'FOUNDER CONSOLE LOGS: REPOSITIONED FOR CONTROLLER GRINDERS ONLY',
    `NEXT LOOP SESSION: ${nextGroupSessionLabel()}`,
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
