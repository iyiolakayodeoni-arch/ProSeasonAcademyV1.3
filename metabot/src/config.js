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
  { name: 'EA SPORTS FC News', urls: ['https://www.ea.com/games/ea-sports-fc/news/rss', 'https://www.ea.com/feed/'] },
  { name: 'Sportskeeda FC Console', urls: ['https://www.sportskeeda.com/feed', 'https://www.sportskeeda.com/esports/feed'] },
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
      `EA SPORTS FC 26 27 Console official patch notes update ${currentPatch}`,
      `site:ea.com FC 26 27 update patch notes gameplay ${currentPatch}`,
      `FC 26 27 Console official gameplay update passing shooting defending ${currentPatch}`,
    ],
  },
  {
    id: 'community-disco',
    makeQueries: () => [
      `reddit EASportsFC exploit tactic this week`,
      `FC 26 27 Console community discovered trick H2H reddit`,
      `FC 26 27 Console YouTube what works now H2H meta`,
      `FC 26 27 Console ranked H2H new skill move tutorial this week`,
    ],
  },
  {
    id: 'meta-now',
    makeQueries: ({ currentPatch }) => [
      `FC 26 27 Console best meta formation tactic right now ${currentPatch}`,
      `FC 26 27 Console broken tactic new trick after update ${currentPatch}`,
      `FC 26 27 Console H2H gameplay meta after update ${currentPatch}`,
      `FC 26 27 Console best skill move after update ${currentPatch}`,
    ],
  },
  {
    id: 'mechanics',
    makeQueries: () => [
      `FC 26 27 Console kick off routine defending AI behavior after patch`,
      `FC 26 27 Console finishing technique skill move combo meta`,
      `FC 26 27 Console lane change tutorial H2H`,
      `FC 26 27 Console elastico step over tutorial ranked`,
      `FC 26 27 Console cross header timing tutorial`,
    ],
  },
];
