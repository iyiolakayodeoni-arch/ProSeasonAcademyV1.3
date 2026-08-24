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
  /** set on 'All' feed items — the section label to render before the item */
  sectionLabel?: string;
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
  // ── MORE SKILLS ──
  {
    id: 'skill-cruyff',
    kind: 'skill',
    tags: ['sotw'],
    title: 'The Cruyff Turn',
    subtitle: 'Stop, spin, accelerate. Three touches that erase the defender from the conversation.',
    difficulty: 2,
    media: 'stepover',
    creator: PRO,
    timeAgo: '7d ago',
    likes: 1899,
    comments: 132,
    metric: 'tries',
    steps: [
      { label: 'Dribble forward, bait the first step', combo: ['STICK F'] },
      { label: 'Flick the ball back and out', combo: ['L2', 'X', 'STICK B'] },
      { label: 'Turn and accelerate the other way', combo: ['R1'] },
    ],
  },
  {
    id: 'skill-heelflick',
    kind: 'skill',
    tags: ['sotw'],
    title: 'The Heel Flick Under Pressure',
    subtitle: 'The defender is on your heel? Good — he is now facing the wrong direction.',
    difficulty: 4,
    media: 'rainbow',
    creator: PRO,
    timeAgo: '7d ago',
    likes: 3204,
    comments: 287,
    metric: 'tries',
    steps: [
      { label: 'Let the ball run slightly ahead', combo: ['STICK F'] },
      { label: 'Backheel it up and over your head', combo: ['L2', 'X', 'STICK B'] },
      { label: 'Collect and run at the space he left', combo: ['R1'] },
    ],
  },
  {
    id: 'tactic-giveandgo',
    kind: 'tactic',
    tags: ['sotw'],
    title: 'The Give-and-Go (1-2)',
    subtitle: 'The oldest trick in football and still the one that beats lazy defences.',
    difficulty: 2,
    media: 'tikitaka',
    creator: PRO,
    timeAgo: '8d ago',
    likes: 1204,
    comments: 71,
    metric: 'tries',
    steps: [
      { label: 'Quick pass to your partner', combo: ['△'] },
      { label: 'Run past the defender into space', combo: ['STICK F'] },
      { label: 'First-time return ball', combo: ['△'] },
    ],
  },
  {
    id: 'proseason-challenge-500',
    kind: 'news',
    tags: ['proseason'],
    title: 'Community challenge: 500 Elastico tries, this week',
    body:
      'The whole community attempts the Elastico for seven days. Post your best attempt, track your streak, and the top 10 get pinned to the feed when the week closes. 500 tries between us — the ball does the rest.',
    creator: PRO,
    timeAgo: '8d ago',
    likes: 1540,
    comments: 322,
    metric: 'views',
    media: 'none',
  },
  {
    id: 'skill-maracana',
    kind: 'skill',
    tags: ['sotw'],
    title: 'The Maracanã — two scissors, one exit',
    subtitle: 'Elastico plus, for days when one scissor was not enough.',
    difficulty: 5,
    media: 'elastico',
    creator: PRO,
    timeAgo: '8d ago',
    likes: 2760,
    comments: 240,
    metric: 'tries',
    steps: [
      { label: 'First in-and-out flick', combo: ['L2', 'X', 'STICK L'] },
      { label: 'Immediate second in-and-out', combo: ['L2', 'X', 'STICK R'] },
      { label: 'Exit through the space you carved', combo: ['R1'] },
    ],
  },
  {
    id: 'news-meta-xi',
    kind: 'news',
    tags: ['news'],
    title: 'Meta report: the XI everyone is running this month',
    body:
      'Four-back with wingers who tuck inside, a pivot who never loses a second ball, and a striker who stays nine yards out. The pattern behind 80% of ranked wins this month, broken down position by position.',
    creator: PRO,
    timeAgo: '9d ago',
    likes: 4102,
    comments: 388,
    metric: 'views',
    media: 'none',
  },
  {
    id: 'tactic-overlap',
    kind: 'tactic',
    tags: ['sotw'],
    title: 'The Overlap & Run In Behind',
    subtitle: 'Your winger does the crossing. Your fullback does the crossing. The defender only has one job — pick a player.',
    difficulty: 3,
    media: 'through',
    creator: PRO,
    timeAgo: '9d ago',
    likes: 1677,
    comments: 119,
    metric: 'tries',
    steps: [
      { label: 'Pin the fullback with a hold', combo: ['L2'] },
      { label: 'Winger plays into the overlap', combo: ['L1', '△'] },
      { label: 'Fullback runs in behind and shoots', combo: ['R1', 'O'] },
    ],
  },
  {
    id: 'creator-setpiece',
    kind: 'creator',
    tags: ['creators'],
    title: 'Set Piece Lab',
    subtitle: 'Corners, free kicks, penalties. The 5% of the game that wins 30% of matches.',
    body:
      'Every week: one delivery, one run, one finish. Film it, run it, score it. The most clinical channel in the niche — no fluff, just geometry.',
    media: 'none',
    creator: {
      name: 'Set Piece Lab',
      handle: '@setpicelab',
      isPro: false,
      color: '#9fc2cf',
      followers: '18.3K',
    },
    timeAgo: '10d ago',
    likes: 431,
    comments: 38,
    metric: 'views',
  },
  {
    id: 'skill-pushfeint',
    kind: 'skill',
    tags: ['sotw'],
    title: 'Push Feint + Body Drag',
    subtitle: 'You do not need to move the ball to move the defender. Drag your body, not the ball.',
    difficulty: 2,
    media: 'stepover',
    creator: PRO,
    timeAgo: '10d ago',
    likes: 987,
    comments: 64,
    metric: 'tries',
    steps: [
      { label: 'Body-drag left while dribbling right', combo: ['STICK A'] },
      { label: 'Bait the slide with a shoulder drop', combo: ['STICK B'] },
      { label: 'Accelerate into the opened lane', combo: ['R1'] },
    ],
  },
  {
    id: 'proseason-launch-plan',
    kind: 'news',
    tags: ['proseason'],
    title: 'FC 27 launch day: the ProSeason plan',
    body:
      'Release week is a trap if you are not ready. Our plan: the three-day controller refresher starts the night before, daily 20-minute drills all week, and a community ranked ladder the moment servers open. The early players get the early edge.',
    creator: PRO,
    timeAgo: '11d ago',
    likes: 2210,
    comments: 195,
    metric: 'views',
    media: 'none',
  },
  {
    id: 'skill-chip',
    kind: 'skill',
    tags: ['sotw'],
    title: 'The Chip Over the Keeper',
    subtitle: 'The keeper comes off his line? You are not shooting. You are lobbing.',
    difficulty: 3,
    media: 'finesse',
    creator: PRO,
    timeAgo: '11d ago',
    likes: 1980,
    comments: 156,
    metric: 'tries',
    steps: [
      { label: 'Wait for the keeper to rush out', combo: ['—'] },
      { label: 'Soft touch over his head', combo: ['R1', 'O'] },
      { label: 'Keep your stick slightly down', combo: ['STICK A'] },
    ],
  },
  {
    id: 'news-freekick-db',
    kind: 'news',
    tags: ['news'],
    title: 'The free kick database: 60 spots, ranked by goal rate',
    body:
      'Every free kick spot on the pitch, ranked by how often it ends in a goal. The top five are not where you think — and the #1 spot is one everyone keeps missing in their own matches.',
    creator: PRO,
    timeAgo: '12d ago',
    likes: 3345,
    comments: 297,
    metric: 'views',
    media: 'none',
  },
  {
    id: 'tactic-counterpress',
    kind: 'tactic',
    tags: ['sotw'],
    title: 'Counter-Press Shape',
    subtitle: 'You have 4 seconds after you lose the ball. Here is where your feet should be.',
    difficulty: 3,
    media: 'through',
    creator: PRO,
    timeAgo: '12d ago',
    likes: 1450,
    comments: 108,
    metric: 'tries',
    steps: [
      { label: 'Lose the ball — nearest two close instantly', combo: ['R1'] },
      { label: 'Force the pass back, cut the outside option', combo: ['STICK B'] },
      { label: 'Win it, transition, score', combo: ['R1', 'O'] },
    ],
  },
  {
    id: 'creator-jockey',
    kind: 'creator',
    tags: ['creators'],
    title: 'The Jockey',
    subtitle: 'Defensive content that does not talk. Just shows you where to stand.',
    body:
      '90 seconds per video. One defensive problem, one positioning fix, top-down camera, no commentary. You watch, you copy, you stop getting dribbled.',
    media: 'none',
    creator: {
      name: 'The Jockey',
      handle: '@thejockeyfc',
      isPro: false,
      color: '#b48ce0',
      followers: '27.8K',
    },
    timeAgo: '13d ago',
    likes: 702,
    comments: 54,
    metric: 'views',
  },
  {
    id: 'skill-volley',
    kind: 'skill',
    tags: ['sotw'],
    title: 'The Volley Finish',
    subtitle: 'The ball is in the air — your feet are already deciding.',
    difficulty: 5,
    media: 'finesse',
    creator: PRO,
    timeAgo: '13d ago',
    likes: 5120,
    comments: 441,
    metric: 'tries',
    steps: [
      { label: 'Read the bounce / pass height', combo: ['—'] },
      { label: 'Step into it, plant foot behind', combo: ['STICK F'] },
      { label: 'Strike through, not up', combo: ['O'] },
    ],
  },
  {
    id: 'proseason-weekly-top3',
    kind: 'news',
    tags: ['proseason'],
    title: 'Weekly top 3: the attempts we replayed four times',
    body:
      '1) A through ball so perfectly weighted the striker had to slow down to score. 2) A rainbow over two defenders in a 1v2. 3) A volley so clean it should be illegal. All three are pinned — go learn them.',
    creator: PRO,
    timeAgo: '14d ago',
    likes: 1890,
    comments: 230,
    metric: 'views',
    media: 'none',
  },
  {
    id: 'tactic-wide-overload',
    kind: 'tactic',
    tags: ['sotw'],
    title: 'Wide Overload (3v2)',
    subtitle: 'Build the advantage on the flank, then crash the middle with it.',
    difficulty: 3,
    media: 'tikitaka',
    creator: PRO,
    timeAgo: '14d ago',
    likes: 1320,
    comments: 91,
    metric: 'tries',
    steps: [
      { label: 'Winger + fullback + 10 = three on the wing', combo: ['△'] },
      { label: 'Cycle the ball until the back four shifts', combo: ['△', 'L2'] },
      { label: 'Switch to the overloaded side, cut inside', combo: ['L1', 'R1', '△'] },
    ],
  },
  {
    id: 'creator-setpiece-2',
    kind: 'creator',
    tags: ['creators'],
    title: 'Set Piece Lab — new: "The Bendy Corner"',
    subtitle: 'One delivery that beats four different wall setups. 6 minutes, no filler.',
    body:
      'The short-side corner with a hidden long-side runner. The wall collapses one way, the ball travels the other. Diagrams, angles, and the exact power settings.',
    media: 'none',
    creator: {
      name: 'Set Piece Lab',
      handle: '@setpicelab',
      isPro: false,
      color: '#9fc2cf',
      followers: '18.3K',
    },
    timeAgo: '15d ago',
    likes: 520,
    comments: 41,
    metric: 'views',
  },
  {
    id: 'news-engine-changes',
    kind: 'news',
    tags: ['news'],
    title: 'What the new match engine actually changes (in 60 seconds)',
    body:
      'Tighter defending AI, a live keeper who actually turns, and first touches that punish you. Three things to drill this week so the update feels like an upgrade, not a punishment.',
    creator: PRO,
    timeAgo: '15d ago',
    likes: 2650,
    comments: 205,
    metric: 'views',
    media: 'none',
  },
  {
    id: 'skill-rainbow-offensive',
    kind: 'skill',
    tags: ['sotw'],
    title: 'Rainbow Out of Tight Space',
    subtitle: 'Corners are not escape hatches. They are doors.',
    difficulty: 4,
    media: 'rainbow',
    creator: PRO,
    timeAgo: '16d ago',
    likes: 2340,
    comments: 178,
    metric: 'tries',
    steps: [
      { label: 'Trap it tight to your body', combo: ['L1', '△'] },
      { label: 'Flick up and over the corner defender', combo: ['L2', 'X', 'STICK F'] },
      { label: 'Land and drive toward goal', combo: ['R1'] },
    ],
  },
  {
    id: 'tactic-secondball',
    kind: 'tactic',
    tags: ['sotw'],
    title: 'Second Ball Strategy',
    subtitle: 'The first touch is for your team. The second one is for the goal.',
    difficulty: 2,
    media: 'through',
    creator: PRO,
    timeAgo: '16d ago',
    likes: 1105,
    comments: 76,
    metric: 'tries',
    steps: [
      { label: 'Pass to pin the pressure', combo: ['△'] },
      { label: 'First-timer back to your striker', combo: ['△'] },
      { label: 'Striker holds it up, team arrives', combo: ['L2'] },
    ],
  },
  {
    id: 'proseason-loop-preview',
    kind: 'news',
    tags: ['proseason'],
    title: 'The Loop, previewed: what the FC 27 module looks like',
    body:
      'Same loop, new game. Week one maps the new controls to your old muscle memory, week two builds the five core 1v1 moves, week three is matchplay with daily targets. Members see it first — the public feed gets the weekly recaps.',
    creator: PRO,
    timeAgo: '17d ago',
    likes: 1780,
    comments: 160,
    metric: 'views',
    media: 'none',
  },
];

/** Portrait drill cards for the horizontal shelf (the "Shorts" equivalent). */
export function getDrills(): FeedItem[] {
  return POOL.filter((i) => i.media !== 'none' && i.kind !== 'creator').slice(0, 8);
}

// ── The simulated ranked feed endpoint ──

const PAGE_SIZE = 4;

// The 'All' feed is NOT a random mix — it reads as labelled blocks in
// rotation: New Skill of the Week → FC News → ProSeason News → Creators,
// then the cycle repeats (deeper into each section every pass).
const SECTION_IDS = ['sotw', 'news', 'proseason', 'creators'] as const;
const SECTION_TITLES: Record<string, string> = {
  sotw: 'NEW SKILL OF THE WEEK',
  news: 'FC NEWS',
  proseason: 'PROSEASON NEWS',
  creators: 'CREATORS',
};

export interface FeedPage {
  items: FeedItem[];
  hasMore: boolean;
  section?: { id: string; title: string };
}

/**
 * "Server call". The 'All' feed serves one SECTION per page and loops
 * forever (like a real For-You feed); category feeds end with
 * "all caught up" once exhausted.
 */
export function fetchFeedPage(category: string, page: number): Promise<FeedPage> {
  let items: FeedItem[] = [];
  let hasMore = false;
  let section: { id: string; title: string } | undefined;

  if (category === 'foryou') {
    const secId = SECTION_IDS[page % SECTION_IDS.length];
    const base = POOL.filter((i) => i.tags.includes(secId));
    const passes = Math.floor(page / SECTION_IDS.length);
    const start = passes * PAGE_SIZE;
    for (let i = 0; i < PAGE_SIZE && base.length > 0; i++) {
      const src = base[(start + i) % base.length];
      items.push({ ...src, id: `${src.id}-p${page}`, sectionLabel: SECTION_TITLES[secId] });
    }
    hasMore = base.length > 0;
    section = { id: secId, title: SECTION_TITLES[secId] };
  } else {
    const base = POOL.filter((i) => i.tags.includes(category));
    for (let i = 0; i < PAGE_SIZE; i++) {
      const src = base[page * PAGE_SIZE + i];
      if (!src) break;
      items.push({ ...src });
    }
    hasMore = page * PAGE_SIZE + PAGE_SIZE < base.length;
  }

  const delay = 650 + Math.random() * 500;
  return new Promise((resolve) => setTimeout(() => resolve({ items, hasMore, section }), delay));
}
