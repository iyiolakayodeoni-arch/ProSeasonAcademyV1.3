// ─────────────────────────────────────────────────────────────
// LESSON BUILDER — turns an approved bot find into the structured
// coaching-room payload the app's Coaching Screen consumes:
//   name · headline · why · 3-step tiles · rule · clip · scan targets
//
// Deterministic topic knowledge base — no AI service involved.
// Topic defaults track the CURRENT live meta (refresh when the meta
// moves, same routine as config.BUCKETS).
// ─────────────────────────────────────────────────────────────

export const LESSON_KINDS = ['SKILL_MOVE', 'EXPLOIT', 'TRICK_OF_THE_WEEK'];

// topic detection — first hit wins; falls through to the kind default.
const TOPIC_KEYS = [
  ['kickoff-lane', ['kickoff', 'kick-off', 'kick off']],
  ['tactics-window', ['tactic', 'tactics', 'custom tactic', 'ranks']],
  ['lane-change', ['lane change']],
  ['step-over', ['step over', 'stepover']],
  ['elastico', ['elastico']],
  ['lofted-through', ['lofted through', 'through ball', 'through pass']],
  ['headers-timing', ['header', 'crossing']],
];

const KIND_DEFAULT_TOPIC = {
  SKILL_MOVE: 'lane-change', // lane change + step over are the live skill meta post-update
  EXPLOIT: 'kickoff-lane',
  TRICK_OF_THE_WEEK: 'kickoff-lane',
};

// tile icons: 'target' | 'waves' | 'arrow' — fixed glyph set in the app.
const TOPIC_LESSONS = {
  'lane-change': {
    name: 'THE LANE CHANGE',
    headline: 'Beat the press in one snap of the stick.',
    why: "AFTER THE UPDATE THE DEFENSIVE AI OVER-COMMITS TO YOUR FIRST DIRECTION. LURE IT, SNAP ACROSS, AND THE LANE IS YOURS — THAT'S WHY EVERYONE ON THE LADDER IS ADDING IT THIS WEEK.",
    tiles: [
      { icon: 'target', title: 'LURE', desc: 'CARRY AT THE DEFENDER’S SHOULDER · BAIT THE COMMIT' },
      { icon: 'waves', title: 'SNAP', desc: 'FLICK HARD ACROSS · ONE BEAT, NO DOUBLE TOUCH' },
      { icon: 'arrow', title: 'EXIT', desc: 'EXPLODE INTO THE OPEN LANE · SPRINT ON' },
    ],
    rule: 'THREE BEATS MAX — LURE, SNAP, EXIT — EVERY CHANGE HAS AN EXIT',
    clip: {
      variant: 'pitchRun',
      duration: '03:58',
      caption: 'WATCH IT LIVE · THE LANE CHANGE IN RANKED PLAY',
      subcaption: 'SEE THE LURE SET THE SNAP UP — THEN DON’T REPLY, GO DO IT',
    },
    scan: [
      { label: 'Lane changes completed in the final third', target: '5+' },
      { label: 'Shots created within 6s of a lane change', target: '2+' },
      { label: 'Skill-spam flags (3+ moves in one carry)', target: '0 FLAGS' },
    ],
  },
  'kickoff-lane': {
    name: 'THE 7-SECOND KICK-OFF LANE',
    headline: 'Seven seconds is a whole attack.',
    why: 'THE PATCH BROKE THE AI PRESS OFF RESTARTS — SPRINT THE CHANNEL STRAIGHT OFF KICK-OFF AND THE FULLBACK JUST WATCHES. THERE’S A WINDOW, AND WINDOWS CLOSE.',
    tiles: [
      { icon: 'target', title: 'SPOT IT', desc: 'READ THE FLAT FULLBACK · CHANNEL OPEN' },
      { icon: 'waves', title: 'SEND IT', desc: 'SPRINT THE CHANNEL · FIRST THREE SECONDS' },
      { icon: 'arrow', title: 'CUT IN', desc: 'ENTER THE LANE · SHOOT ACROSS THE KEEPER' },
    ],
    rule: 'SEVEN SECONDS, NO MORE — IF THE LANE ISN’T OPEN BY THEN, PLAY NORMAL',
    clip: {
      variant: 'kickoff',
      duration: '04:37',
      caption: 'WATCH IT LIVE · THE 7-SECOND KICK-OFF LANE',
      subcaption: 'SEE THE TOUCH SET UP THE WHOLE RUN — THEN DON’T REPLY, GO DO IT',
    },
    scan: [
      { label: 'Kick-off lane entries attacked', target: '2+' },
      { label: 'Shots inside 8s of your kick-off', target: '1+' },
      { label: 'Forced kick-off restarts (spam flags)', target: '0 FLAGS' },
    ],
  },
  'tactics-window': {
    name: 'THE TACTIC WINDOW',
    headline: 'One spring-loaded shape wins ranked nights.',
    why: 'THE COMMUNITY FOUND A CUSTOM-TACTICS SETUP THAT HOLDS FROM DIVISION 10 TO TOP RANKS — SIT NARROW, TRIGGER THE RUN, PUNISH THE GAP BEFORE THE PATCH CATCHES UP.',
    tiles: [
      { icon: 'target', title: 'SET', desc: 'NARROW SHAPE · FORWARDS ON GET-IN-BEHIND' },
      { icon: 'waves', title: 'TRIGGER', desc: 'MANUAL RUN ON THE REGAIN · 8-SECOND WINDOW' },
      { icon: 'arrow', title: 'PUNISH', desc: 'THROUGH THE CHANNEL · FINISH ACROSS GOAL' },
    ],
    rule: 'ONE WINDOW PER ATTACK — SET IT, SPRING IT, DEFEND WHAT IT EARNS',
    clip: {
      variant: 'pitchFade',
      duration: '05:21',
      caption: 'WATCH IT LIVE · THE TACTIC WINDOW AGAINST THE PRESS',
      subcaption: 'SEE THE TRIGGER TIMING — THEN DON’T REPLY, GO DO IT',
    },
    scan: [
      { label: 'Counters started within 8s of a regain', target: '4+' },
      { label: 'Through-balls into open channels', target: '3+' },
      { label: 'Panic long balls under no pressure', target: '0 FLAGS' },
    ],
  },
  'step-over': {
    name: 'THE STEP OVER',
    headline: 'Freeze a defender without touching the ball.',
    why: 'STEP OVERS SURVIVED THE UPDATE — THE AI BITES ON THE FIRST FEINT. ONE CLEAN STEP OVER IN THE LANE BUYS THE HALF-YARD THAT RANKED DEFENDERS NEVER GIVE BACK.',
    tiles: [
      { icon: 'target', title: 'SQUARE UP', desc: 'BALL DEAD · DEFENSOR SET IN FRONT OF YOU' },
      { icon: 'waves', title: 'STEP', desc: 'ONE CLEAN LOOP AROUND THE BALL · SELL IT' },
      { icon: 'arrow', title: 'GO', desc: 'PUSH PAST THE FROZEN HIP · HEAD UP' },
    ],
    rule: 'ONE STEP, ONE EXIT — TWO STEPS IS SHOWBOATING AND LOSING THE BALL',
    clip: {
      variant: 'pitchRun',
      duration: '03:24',
      caption: 'WATCH IT LIVE · THE STEP OVER IN RANKED PLAY',
      subcaption: 'SEE THE FREEZE — THEN DON’T REPLY, GO DO IT',
    },
    scan: [
      { label: 'Step overs that beat a defender', target: '4+' },
      { label: 'Progressive carries after the step over', target: '3+' },
      { label: 'Skill-spam flags (3+ moves in one carry)', target: '0 FLAGS' },
    ],
  },
  elastico: {
    name: 'THE ELASTICO',
    headline: 'Out-in, gone — 5★ skills only.',
    why: 'ON 5★ SKILLERS THE ELASTICO IS STILL UNDEFENDED POST-PATCH. IT’S THE ONE FLASH MOVE WORTH THE PRACTICE — EVERYTHING ELSE FLASHY GOT TUNED OUT.',
    tiles: [
      { icon: 'target', title: 'ANGLE', desc: 'APPROACH AT 45° · 5★ SKILLER ON THE BALL' },
      { icon: 'waves', title: 'FLICK OUT-IN', desc: 'OUT THEN IN · ONE FLUID INPUT' },
      { icon: 'arrow', title: 'SEPARATION', desc: 'EXPLODE LOW · STRIKE BEFORE THE AI RECOVERS' },
    ],
    rule: 'ELASTICO IS A FINISH MOVE — IF THE BOX ISN’T OPEN, DON’T THROW IT',
    clip: {
      variant: 'pitchFade',
      duration: '03:47',
      caption: 'WATCH IT LIVE · THE ELASTICO AT THE EDGE OF THE BOX',
      subcaption: 'SEE THE SEPARATION — THEN DON’T REPLY, GO DO IT',
    },
    scan: [
      { label: 'Elasticos completed in attacking third', target: '2+' },
      { label: 'Shots within 4s of the elastico', target: '1+' },
      { label: 'Skill-spam flags (3+ moves in one carry)', target: '0 FLAGS' },
    ],
  },
  'lofted-through': {
    name: 'THE LOFTED THROUGH BALL',
    headline: 'The high line has an attic — use it.',
    why: 'POST-PATCH THE LOFTED THROUGH IS ATTRIBUTE-GATED, NOT DEAD. WITH AN ELITE PASSER IT STILL SPLITS THE HIGH LINE — THE COMMUNITY IS ALREADY AUTOMATING IT.',
    tiles: [
      { icon: 'target', title: 'CHECK THE ARM', desc: 'PASSER 85+ VISION · RUNNER ALREADY MOVING' },
      { icon: 'waves', title: 'LIFT', desc: 'LOFTED THROUGH · LEAD THE CHANNEL' },
      { icon: 'arrow', title: 'CHASE', desc: 'ATTACK THE DROP · FIRST-TIME FINISH' },
    ],
    rule: 'NO PASSER, NO PASS — THE GATE IS REAL NOW, STOP FORCING IT',
    clip: {
      variant: 'kickoff',
      duration: '04:02',
      caption: 'WATCH IT LIVE · THE LOFTED THROUGH OVER THE HIGH LINE',
      subcaption: 'SEE THE TIMING GATE — THEN DON’T REPLY, GO DO IT',
    },
    scan: [
      { label: 'Lofted through balls completed', target: '3+' },
      { label: 'Chances created from balls over the top', target: '1+' },
      { label: 'Blocked lofted attempts with a low-rated passer', target: '0 FLAGS' },
    ],
  },
  'headers-timing': {
    name: 'THE TIMED HEADER',
    headline: 'Headers are a timing skill again, not a lottery.',
    why: 'THE REBALANCE PUT HEADERS BACK ON TIMING AND POSITIONING. EARLY CROSS, GREEN TIMING, NEAR-POST RUN — REPEATABLE AERIAL GOALS WITHOUT PERFECT CARDS.',
    tiles: [
      { icon: 'target', title: 'LOAD THE BOX', desc: 'WINGER WIDE · TARGET MAN ON THE NEAR POST' },
      { icon: 'waves', title: 'CROSS EARLY', desc: 'EARLY CROSS · BEFORE THE AI SETS' },
      { icon: 'arrow', title: 'RISE', desc: 'GREEN TIMING · POWER INTO THE CORNER' },
    ],
    rule: 'EARLY CROSS OR NO CROSS — THE LATE CROSS IS WHERE AI WINS',
    clip: {
      variant: 'pitchFade',
      duration: '04:15',
      caption: 'WATCH IT LIVE · THE TIMED HEADER ROUTINE',
      subcaption: 'SEE THE NEAR-POST RUN — THEN DON’T REPLY, GO DO IT',
    },
    scan: [
      { label: 'Early crosses delivered', target: '4+' },
      { label: 'Header attempts on target', target: '2+' },
      { label: 'Late hopeful crosses into a set box', target: '0 FLAGS' },
    ],
  },
};

export function detectLessonTopic(kind, headline, body) {
  const t = ` ${(headline || '').toLowerCase()} ${(body || '').toLowerCase()} `;
  for (const [topic, keys] of TOPIC_KEYS) if (keys.some((k) => t.includes(k))) return topic;
  return KIND_DEFAULT_TOPIC[kind] ?? null;
}

/**
 * Build the structured lesson payload for a post, or null when the kind
 * isn't lesson-eligible. Pure function — safe to call at export time too.
 */
export function buildLesson({ kind, headline, body }) {
  if (!LESSON_KINDS.includes(kind)) return null;
  const topic = detectLessonTopic(kind, headline, body);
  const base = topic ? TOPIC_LESSONS[topic] : null;
  if (!base) return null;
  return { topic, ...base };
}

// staleness shared with the app: a lesson is teachable while its source post
// is fresh/aging — anything else means the mechanic got patched out.
export function lessonStale(lifecycle) {
  return !['fresh', 'aging'].includes(lifecycle);
}
