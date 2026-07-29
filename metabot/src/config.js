import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = path.join(__dirname, '..', 'data');
export const SNAPSHOT_DIR = path.join(__dirname, '..', 'snapshots');
export const STORE_FILE = path.join(DATA_DIR, 'store.json');
// the seam the app's Home feed will read from (approved + fresh items only)
export const APP_FEED_FILE = path.join(__dirname, '..', '..', 'src', 'data', 'liveFeed.json');

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';
// 'direct' (default — our own collectors, zero third-party services) |
// 'anthropic' (optional AI-search upgrade) | 'manual' (demo snapshots)
export const LLM_PROVIDER = process.env.LLM_PROVIDER ?? 'direct';
export const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL ?? '';

// RSS blogs the direct provider tries (skips any that don't answer)
export const RSS_FEEDS = [
  { name: 'Carry1st FC Mobile', urls: ['https://www.carry1st.com/blog/feed/', 'https://www.carry1st.com/feed/'] },
  { name: 'Sportskeeda FC Mobile', urls: ['https://www.sportskeeda.com/feed', 'https://www.sportskeeda.com/mobile-games/feed'] },
];

// content goes stale fast in a game that patches — default 21 days,
// and anything tied to a previous patch version is auto-flagged immediately.
export const STALE_DAYS = Number(process.env.METABOT_STALE_DAYS ?? 21);

// the kinds the bot is allowed to produce (coach/community posts stay hand-authored)
export const BOT_KINDS = ['EXPLOIT', 'SKILL_MOVE', 'TRICK_OF_THE_WEEK', 'PATCH_NOTE', 'META_SHIFT'];

// fixed search buckets — refreshed every run with the current patch version
// so results don't lag a season behind.
export const BUCKETS = [
  {
    id: 'official-patch',
    makeQueries: ({ currentPatch }) => [
      `EA SPORTS FC Mobile official patch notes update ${currentPatch}`,
      `site:ea.com FC Mobile update patch notes gameplay ${currentPatch}`,
      `FC Mobile official gameplay update passing shooting defending ${currentPatch}`,
    ],
  },
  {
    id: 'community-disco',
    makeQueries: () => [
      `reddit FUTMobile exploit tactic this week`,
      `FC Mobile community discovered trick H2H reddit`,
      `FC Mobile YouTube what works now H2H meta`,
      `FC Mobile ranked H2H new skill move tutorial this week`,
    ],
  },
  {
    id: 'meta-now',
    makeQueries: ({ currentPatch }) => [
      `FC Mobile best meta formation tactic right now ${currentPatch}`,
      `FC Mobile broken tactic new trick after update ${currentPatch}`,
      `FC Mobile H2H gameplay meta after update ${currentPatch}`,
      `FC Mobile best skill move after update ${currentPatch}`,
    ],
  },
  {
    id: 'mechanics',
    makeQueries: () => [
      `FC Mobile kick off routine defending AI behavior after patch`,
      `FC Mobile finishing technique skill move combo meta`,
      `FC Mobile lane change tutorial H2H`,
      `FC Mobile elastico step over tutorial ranked`,
      `FC Mobile cross header timing tutorial`,
    ],
  },
];
