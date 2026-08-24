// ─────────────────────────────────────────────────────────────
// FC 27 FEED — the paid home screen (design approved v4).
//
// An Instagram/YouTube-style infinite feed for aspiring pros:
// skill moves, tactics, ProSeason News, FC News and niche
// creators in one scroll.
//
// HOW THE INFINITE SCROLL WORKS (the Instagram/YouTube mechanism):
// 1. A ranked pool of content (newest + best first).
// 2. The client renders a PAGE of items at a time.
// 3. An invisible "sentinel" at the bottom of the feed is watched
//    with IntersectionObserver. ~600px before the user runs out
//    of content, the next page is requested — so scrolling never
//    visibly stops (Instagram preloads the same way).
// 4. Items append, the sentinel moves down, loop until the feed
//    is out of content → "all caught up".
//
// fetchFeedPage() is a LOCAL SIMULATION of the ranked feed
// endpoint (same contract, real latency) so the UI never changes
// when a real backend arrives. Content is mock data for now.
// ─────────────────────────────────────────────────────────────

export type MediaKind =
  | 'stepover'
  | 'elastico'
  | 'rainbow'
  | 'through'
  | 'tikitaka'
  | 'finesse'
  | 'none';

export type ItemKind = 'skill' | 'tactic' | 'news' | 'creator';

export interface Creator {
  name: string;
  handle: string;
  isPro: boolean; // true = ProSeason Academy ("us")
  color: string;
  followers: string;
  bio?: string;
}

export interface Step {
  label: string;
  combo: string[]; // button names, e.g. ['L2', 'X', 'STICK R']
}

export interface FeedItem {
  id: string;
  kind: ItemKind;
  tags: string[]; // category ids this item belongs to
  title: string;
  subtitle?: string;
  body?: string;
  steps?: Step[];
  difficulty?: number; // 1..5
  media: MediaKind;
  creator: Creator;
  timeAgo: string;
  likes: number;
  comments: number;
  metric: 'tries' | 'views';
}

export interface FeedCategory {
  id: string;
  label: string;
}

export const FEED_CATEGORIES: FeedCategory[] = [
  { id: 'foryou', label: 'All' },
  { id: 'proseason', label: 'ProSeason News' },
  { id: 'news', label: 'FC News' },
  { id: 'sotw', label: 'New Skill of the Week' },
  { id: 'creators', label: 'Creators' },
];

const PRO: Creator = {
  name: 'ProSeason Academy',
  handle: '@proseasonacademy',
  isPro: true,
  color: '#39FF6A',
  followers: '48.2K',
};

const POOL: FeedItem[] = [
  // ── SKILLS & TACTICS (ProSeason animated explainers) ──
  {
    id: 'skill-stepover',
    kind: 'skill',
    tags: ['sotw'],
    title: 'Double Stepover — the workhorse move',
    subtitle: 'Two quick touches, one broken defender. The move pros use in 9 out of 10 1v1s.',
    difficulty: 2,
    media: 'stepover',
    creator: PRO,
    timeAgo: '2h ago',
    likes: 1284,
    comments: 96,
    metric: 'tries',
    steps: [
      { label: 'First flick — ball out to your right', combo: ['L2', 'X', 'STICK R'] },
      { label: 'Second flick — bring it back left', combo: ['L2', 'X', 'STICK L'] },
      { label: 'Finish through with the inside of your foot', combo: ['O'] },
    ],
  },
  {
    id: 'proseason-prep-week1',
    kind: 'news',
    tags: ['proseason'],
    title: 'FC 27 Prep Week 1 — Skill Drills Start Now',
    body:
      'The new game lands this autumn and every aspiring pro faces the same question: how do you enter FC 27 already ahead? The answer is boring and it works — 20 minutes a day on the fundamentals. Week 1 is 1v1 moves. Post your daily reps so the feed tracks your streak.',
    creator: PRO,
    timeAgo: '4h ago',
    likes: 892,
    comments: 214,
    metric: 'views',
    media: 'none',
  },
  {
    id: 'tactic-tikitaka',
    kind: 'tactic',
    tags: ['sotw'],
    title: 'The Tiki-Taka Wall Pass',
    subtitle: 'Two touches, no space lost. The quickest way to turn a dead ball into a dangerous attack.',
    difficulty: 3,
    media: 'tikitaka',
    creator: PRO,
    timeAgo: '9h ago',
    likes: 1560,
    comments: 143,
    metric: 'tries',
    steps: [
      { label: 'Play the quick short pass', combo: ['△'] },
      { label: 'Hold L2 + pass = one-touch wall pass', combo: ['L2', '△'] },
      { label: 'First-time return — don\u2019t let it die', combo: ['△'] },
    ],
  },
  {
    id: 'creator-wallpass',
    kind: 'creator',
    tags: ['creators'],
    title: 'The Wall Pass',
    subtitle: 'Tactical breakdowns with zero fluff. 12-minute videos that make you a better passer.',
    body:
      'Every Sunday: one play, one breakdown, one lesson. If you have ever wondered why a simple one-two beats a flashy skill move, this is the channel that will show you why.',
    media: 'none',
    creator: {
      name: 'The Wall Pass',
      handle: '@thewallpass',
      isPro: false,
      color: '#6fd0c9',
      followers: '31.7K',
    },
    timeAgo: '1d ago',
    likes: 640,
    comments: 51,
    metric: 'views',
  },
  {
    id: 'skill-elastico',
    kind: 'skill',
    tags: ['sotw'],
    title: 'The Elastico — scissors that eat defenders',
    subtitle: 'In-and-out in under half a second. Learn the rhythm and defenders will never see it coming.',
    difficulty: 3,
    media: 'elastico',
    creator: PRO,
    timeAgo: '1d ago',
    likes: 2103,
    comments: 187,
    metric: 'tries',
    steps: [
      { label: 'Flick the ball out to your left', combo: ['L2', 'X', 'STICK L'] },
      { label: 'Instantly flick it back right', combo: ['L2', 'X', 'STICK R'] },
      { label: 'Accelerate past as the defender bites', combo: ['R1'] },
    ],
  },
  {
    id: 'news-controller-map',
    kind: 'news',
    tags: ['news'],
    title: 'The full FC controller map, saved in one post',
    body:
      'PASS △ · SHOOT O · SPRINT R1 · SKILL MOVE L2 + X · THROUGH BALL L1 + R1 · FINESE R1 · LONG BALL L1 + PASS · JOCKEY hold L2 · PRESS X · SLIDE TACKLE △ · FIRST TOUCH L1. Print it. Tattoo it. Master it.',
    creator: PRO,
    timeAgo: '1d ago',
    likes: 3320,
    comments: 268,
    metric: 'views',
    media: 'none',
  },
  {
    id: 'tactic-through',
    kind: 'tactic',
    tags: ['sotw'],
    title: 'Through Ball + Run In Behind',
    subtitle: 'The single highest-value pass in the game. Timing the run is everything.',
    difficulty: 2,
    media: 'through',
    creator: PRO,
    timeAgo: '2d ago',
    likes: 1745,
    comments: 129,
    metric: 'tries',
    steps: [
      { label: 'Find the gap — lead the run', combo: ['STICK UP'] },
      { label: 'Weighted through ball', combo: ['L1', 'R1', '△'] },
      { label: 'First touch into space, then shoot', combo: ['L1', 'O'] },
    ],
  },
  {
    id: 'creator-touch',
    kind: 'creator',
    tags: ['creators'],
    title: 'Touch of Genius',
    subtitle: 'One skill move a day, 365 days a year. The daily-rep channel for finishing your move set.',
    body:
      '30-second drills, top-down pitch view, slow-mo replays of the foot contact. Follow along, post your attempt, and get corrected in the comments.',
    media: 'none',
    creator: {
      name: 'Touch of Genius',
      handle: '@touchofgenius',
      isPro: false,
      color: '#f2c078',
      followers: '54.9K',
    },
    timeAgo: '2d ago',
    likes: 902,
    comments: 77,
    metric: 'views',
  },
  {
    id: 'skill-rainbow',
    kind: 'skill',
    tags: ['sotw'],
    title: 'The Rainbow Flick',
    subtitle: 'Maximum chaos, maximum damage. The move that makes highlight reels — and the timing that makes it land.',
    difficulty: 4,
    media: 'rainbow',
    creator: PRO,
    timeAgo: '3d ago',
    likes: 4102,
    comments: 341,
    metric: 'tries',
    steps: [
      { label: 'Flick up and over as the defender closes', combo: ['L2', 'X', 'STICK FORWARD'] },
      { label: 'Land on the far side of the defender', combo: ['STICK FORWARD'] },
      { label: 'Control and burst before he recovers', combo: ['R1'] },
    ],
  },
  {
    id: 'proseason-loop-term',
    kind: 'news',
    tags: ['proseason'],
    title: 'The Loop — new term opens with the FC 27 season',
    body:
      'The course gets a full refresh when the new game drops. Same loop, sharper drills: daily 20-minute technicals, weekly 1v1 ladders, and a matchday review every Friday. Members get first access to the FC 27 module.',
    creator: PRO,
    timeAgo: '3d ago',
    likes: 1187,
    comments: 94,
    metric: 'views',
    media: 'none',
  },
  {
    id: 'skill-finesse',
    kind: 'skill',
    tags: ['sotw'],
    title: 'The Finesse Shot — the curler',
    subtitle: 'Top corner or bottom corner. One button changes your shot from a save to a goal.',
    difficulty: 3,
    media: 'finesse',
    creator: PRO,
    timeAgo: '4d ago',
    likes: 2870,
    comments: 226,
    metric: 'tries',
    steps: [
      { label: 'Set your angle — slightly off-centre is friendlier', combo: ['STICK A'] },
      { label: 'Hold R1 and shoot', combo: ['R1', 'O'] },
      { label: 'Watch the ball bend past the keeper', combo: ['—'] },
    ],
  },
  {
    id: 'creator-defensivemind',
    kind: 'creator',
    tags: ['creators'],
    title: 'Defensive Mind',
    subtitle: 'Positioning, pressing traps and how to stop the players everyone else is copying.',
    body:
      'Offense gets the highlights, defense wins the tournaments. Weekly breakdowns of pro pressing structures you can copy in your own matches — starting with the 1v1 jockey.',
    media: 'none',
    creator: {
      name: 'Defensive Mind',
      handle: '@defensivemind',
      isPro: false,
      color: '#ff7a6b',
      followers: '22.4K',
    },
    timeAgo: '4d ago',
    likes: 488,
    comments: 40,
    metric: 'views',
  },
  {
    id: 'news-warmup',
    kind: 'news',
    tags: ['news'],
    title: 'How pros warm up in 10 minutes (do this before ranked)',
    body:
      'Minutes 0–3: shooting range, 10 touches per foot. Minutes 3–6: Tiki-Taka drills with a partner. Minutes 6–10: five full-speed 1v1s at low stakes. If you skip the warmup you are gambling with your first five matches of the day.',
    creator: PRO,
    timeAgo: '4d ago',
    likes: 1412,
    comments: 88,
    metric: 'views',
    media: 'none',
  },
  {
    id: 'skill-stepover-jockey',
    kind: 'skill',
    tags: ['sotw'],
    title: 'Stepover Out of the Jockey',
    subtitle: 'The defender is on you? Turn the press into your exit door.',
    difficulty: 3,
    media: 'stepover',
    creator: PRO,
    timeAgo: '5d ago',
    likes: 1655,
    comments: 118,
    metric: 'tries',
    steps: [
      { label: 'Jockey and bait the first press', combo: ['L2'] },
      { label: 'Stepover away from the press direction', combo: ['L2', 'X', 'STICK'] },
      { label: 'Drive straight into the space you just made', combo: ['R1'] },
    ],
  },
  {
    id: 'proseason-community-week',
    kind: 'news',
    tags: ['proseason'],
    title: 'This week in the community: 412 skill attempts posted',
    body:
      'A rainbow flick that cleared the keeper, the wall AND the roof. A stepover so clean the defender simply gave up. A through ball so long it found the goalkeeper\u2019s manager. Best attempts get pinned every Friday — post yours.',
    creator: PRO,
    timeAgo: '5d ago',
    likes: 976,
    comments: 152,
    metric: 'views',
    media: 'none',
  },
  {
    id: 'tactic-firsttouch',
    kind: 'tactic',
    tags: ['sotw'],
    title: 'First Touch Control — the unglamorous skill that wins games',
    subtitle: 'You cannot do any of the other moves if the ball bounces three metres away.',
    difficulty: 1,
    media: 'finesse',
    creator: PRO,
    timeAgo: '6d ago',
    likes: 1320,
    comments: 61,
    metric: 'tries',
    steps: [
      { label: 'Cushion the ball with a soft pass touch', combo: ['L1', '△'] },
      { label: 'Set the ball one step ahead, not on you', combo: ['STICK A'] },
      { label: 'Now decide: keep, pass or shoot', combo: ['—'] },
    ],
  },
  {
    id: 'news-patch',
    kind: 'news',
    tags: ['news'],
    title: 'Patch 3.1: gameplay adjustments every ranked player needs to know',
    body:
      'Skill move cooldowns, first-touch distance, and the jockey response timing all shifted in 3.1. The moves that relied on old timings feel mushy until you re-learn them — start with the stepover, it changed the most.',
    creator: PRO,
    timeAgo: '6d ago',
    likes: 2210,
    comments: 301,
    metric: 'views',
    media: 'none',
  },
  {
    id: 'creator-wallpass-2',
    kind: 'creator',
    tags: ['creators'],
    title: 'The Wall Pass — new episode: "Why your one-two dies"',
    subtitle: 'Three frames apart, one bad angle. The most common Tiki-Taka mistake, fixed in 4 minutes.',
    body:
      'The wall pass only works if your body is open to the return. This episode breaks down the shoulder angle, the touch selection, and the exact stick angle that keeps the ball alive under pressure.',
    media: 'none',
    creator: {
      name: 'The Wall Pass',
      handle: '@thewallpass',
      isPro: false,
      color: '#6fd0c9',
      followers: '31.7K',
    },
    timeAgo: '6d ago',
    likes: 512,
    comments: 36,
    metric: 'views',
  },
];

// ── The simulated ranked feed endpoint ──

const PAGE_SIZE = 4;

export interface FeedPage {
  items: FeedItem[];
  hasMore: boolean;
}

/**
 * "Server call". The 'All' feed loops the pool forever (like a real
 * For-You feed that keeps generating); category feeds end with
 * "all caught up" once exhausted.
 */
export function fetchFeedPage(category: string, page: number): Promise<FeedPage> {
  const base =
    category === 'foryou'
      ? POOL
      : POOL.filter((i) => i.tags.includes(category));

  const items: FeedItem[] = [];
  for (let i = 0; i < PAGE_SIZE; i++) {
    if (base.length === 0) break;
    const src = base[(page * PAGE_SIZE + i) % base.length];
    // 'All' loops forever → unique ids per pass so React keys stay valid.
    items.push({ ...src, id: category === 'foryou' ? `${src.id}-p${page}` : src.id });
  }

  const hasMore =
    category === 'foryou' ? base.length > 0 : page * PAGE_SIZE + PAGE_SIZE < base.length;

  const delay = 650 + Math.random() * 500;
  return new Promise((resolve) => setTimeout(() => resolve({ items, hasMore }), delay));
}
