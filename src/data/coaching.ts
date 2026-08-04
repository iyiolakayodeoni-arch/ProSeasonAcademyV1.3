import { Coach } from './coaches';
import { BASELINE_SCRIPTS, beatKey } from './baselineScan';
import { MatchResult } from './matches';
import { coachQuip } from './humor';

// ─────────────────────────────────────────────────────────────
// COACHING ROOM DATA LAYER
// TODAY'S MECHANIC is NEVER hardcoded here. It is selected from the
// live, approved MetaBot export (src/data/liveFeed.json) — newest
// SKILL_MOVE / EXPLOIT / TRICK_OF_THE_WEEK with a `lesson` block,
// not already claimed by another stage, and not stale. If nothing
// qualifies the screen renders a clearly-marked placeholder.
// ─────────────────────────────────────────────────────────────

export interface LessonTileData {
  icon: 'target' | 'waves' | 'arrow';
  title: string;
  desc: string;
}

export interface ScanTargetData {
  label: string;
  target: string; // e.g. "5+", "0 FLAGS"
}

export interface LessonClipData {
  variant: 'pitchRun' | 'pitchFade' | 'kickoff';
  duration: string; // "04:37"
  caption: string;
  subcaption: string;
}

interface LessonBlock {
  topic: string;
  name: string;
  headline: string;
  why: string;
  tiles: LessonTileData[];
  rule: string;
  clip: LessonClipData;
  scan: ScanTargetData[];
}

interface LivePost {
  id: string;
  kind: string;
  headline: string;
  body: string;
  cta: string;
  patchVersion: string;
  discoveredAt: string;
  sourceName: string;
  sourceUrl: string;
  lifecycle: string;
  lesson?: LessonBlock;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LIVE: { updatedAt: string; currentPatch: string; posts: LivePost[] } = require('./liveFeed.json');

export interface LessonPlan {
  contentId: string; // metabot id — stored on the stage for stale-swap tracking
  kind: string;
  patchVersion: string;
  discoveredAt: string;
  sourceName: string;
  sourceUrl: string;
  mechanicName: string; // "THE LANE CHANGE"
  shortName: string; // "lane change" — for flowing coach copy
  headline: string;
  why: string;
  tiles: LessonTileData[];
  rule: string;
  clip: LessonClipData;
  scanTargets: ScanTargetData[];
}

export type StageLessonResult =
  | { status: 'ok'; plan: LessonPlan; fromRef: boolean }
  | { status: 'empty' } // no approved fresh lesson in the feed yet
  | { status: 'stale'; contentId: string; mechanicName: string }; // assigned but patched out

const LESSON_KINDS = ['SKILL_MOVE', 'EXPLOIT', 'TRICK_OF_THE_WEEK'];
const FRESH = ['fresh', 'aging'];

function toPlan(p: LivePost): LessonPlan {
  const l = p.lesson as LessonBlock;
  return {
    contentId: p.id,
    kind: p.kind,
    patchVersion: p.patchVersion,
    discoveredAt: p.discoveredAt,
    sourceName: p.sourceName,
    sourceUrl: p.sourceUrl,
    mechanicName: l.name,
    shortName: l.name.toLowerCase().replace(/^the /, ''),
    headline: l.headline,
    why: l.why,
    tiles: l.tiles,
    rule: l.rule,
    clip: l.clip,
    scanTargets: l.scan,
  };
}

/** is the stage's referenced source item still teachable? */
export function isContentStale(contentId: string): boolean {
  const p = LIVE.posts.find((x) => x.id === contentId);
  return !p || !FRESH.includes(p.lifecycle);
}

export function contentName(contentId: string): string {
  const p = LIVE.posts.find((x) => x.id === contentId);
  return p?.lesson?.name ?? 'THIS MECHANIC';
}

/**
 * Resolve what this stage teaches, given the stage→content refs held by
 * the player. A stage with an assigned ref keeps teaching that item until
 * it goes stale — then the coach must swap in a fresh one (flagged, never
 * silently outdated). Unassigned stages claim the newest eligible item.
 */
export function resolveStageLesson(stageN: number, refs: Record<number, string>): StageLessonResult {
  const ref = refs[stageN];
  if (ref) {
    const p = LIVE.posts.find((x) => x.id === ref);
    if (!p || !FRESH.includes(p.lifecycle) || !p.lesson) {
      return { status: 'stale', contentId: ref, mechanicName: contentName(ref) };
    }
    return { status: 'ok', plan: toPlan(p), fromRef: true };
  }
  const claimed = new Set(Object.values(refs));
  const candidate = LIVE.posts
    .filter((p) => LESSON_KINDS.includes(p.kind) && p.lesson && FRESH.includes(p.lifecycle) && !claimed.has(p.id))
    .sort((a, b) => (a.discoveredAt < b.discoveredAt ? 1 : a.discoveredAt > b.discoveredAt ? -1 : a.id < b.id ? 1 : -1))[0];
  return candidate ? { status: 'ok', plan: toPlan(candidate), fromRef: false } : { status: 'empty' };
}

// ── coach chat copy — written film-room messages around the live mechanic ──
// `**…**` marks the inline highlight; parsed into colored spans at render.

export interface CoachChat {
  greeting: string;
  voiceCaption: string;
  mechanic: string;
  /** the single wink — one line of humour between the lesson and the closer.
   *  Seeded by the mechanic so it's stable for the day, and it always sits
   *  AFTER the structured lesson: the work is serious, the man is not a robot. */
  quip: string;
  closer: string;
  scanIntro: string;
  footer: string;
}

const KIND_ANGLE: Record<string, { chinedu: string; obinna: string }> = {
  SKILL_MOVE: {
    chinedu: 'the one skill that decides if you’re playing the game or the game is playing you.',
    obinna: 'the skill that turns pressure into breathing room.',
  },
  EXPLOIT: {
    chinedu: 'the window the whole ladder is abusing before the next patch closes it.',
    obinna: 'a window that’s open right now — we use it while it lasts, without leaning on it.',
  },
  TRICK_OF_THE_WEEK: {
    chinedu: 'the trick I’m putting in your bag before anyone in your division has seen it.',
    obinna: 'this week’s trick — learned patiently, used precisely.',
  },
};

export function buildCoachChat(coach: Coach, plan: LessonPlan): CoachChat {
  const first = coach.name.split(' ')[0];
  const mech = plan.shortName;
  const angle = KIND_ANGLE[plan.kind] ?? KIND_ANGLE.SKILL_MOVE;
  if (coach.id === 'obinna') {
    return {
      greeting:
        'Come in. Sit down first — today is just **me talking.** No essays, no quizzes. The only thing I need back is one match at the end. And please, let the controller cool down first — it has done nothing wrong.',
      voiceCaption: 'VOICE NOTE · LISTEN ALL THE WAY THROUGH — THE POINT LANDS AT 0:38',
      mechanic: `The side note first, little one. Today’s side quest is **the ${mech}** — ${angle.chinedu} Scroll down, I drew it up for you, and the blog is inside the app. Try it if it fits your thread today — the main thing is still done by you.`,
      quip: coachQuip('obinna', plan.contentId),
      closer: `That’s the whole side note. The real work is yours — start a **Mirror Session**, carry your thread into the match, answer the checkpoints, divide the moments yourself, and swear the next lesson. **The mirror preserves every version of what you thought.** It never writes it for you.`,
      scanIntro:
        'START A MIRROR SESSION — ONE RANKED MATCH, YOUR INTENTION FIRST. THE SESSION CAPTURES WHAT YOU THOUGHT BEFORE THE MATCH, AT HALF-TIME, AT FULL-TIME, AND AFTER YOU REVIEW YOUR OWN MOMENTS. THEN YOU JOT THE LESSON. THAT LESSON IS YOUR THREAD.',
      footer: 'THE SIDE QUESTS ARE MY RESEARCH. THE MAIN QUEST IS YOUR HEAD — ONLY YOUR MATCHES WRITE IT.',
    };
  }
  return {
    greeting:
      'You’re here. Good. Pull up, little bro — today is just **me talking.** No essays, no quizzes. All you owe me is one match at the end. And no, shouting at the referee is not a mechanic.',
    voiceCaption: 'VOICE NOTE · LISTEN TILL THE END — THE JOKE LANDS AT 0:38',
    mechanic: `The side note first. Today’s side quest is **the ${mech}** — ${angle.chinedu} Scroll down, I drew it up for you, blog included, right here in the app. Try it if it serves your thread — the main thing is still on you.`,
    quip: coachQuip('chinedu', plan.contentId),
    closer: `That’s the whole side note. Now the real work — start a **Mirror Session**, carry your thread into the match, answer the checkpoints, mark your own moments, swear the next lesson. **The mirror does not think for you.** It just makes sure you cannot forget what you believed.`,
    scanIntro:
      'START A MIRROR SESSION — ONE RANKED MATCH, YOUR INTENTION FIRST. THE SESSION KEEPS YOUR PRE-MATCH THINKING, YOUR HALF-TIME HEAD, YOUR FULL-TIME MEMORY AND YOUR REVIEWED EVIDENCE SIDE BY SIDE. YOU JOT THE LESSON. THAT LESSON IS YOUR THREAD.',
    footer: 'THE SIDE QUESTS ARE MY RESEARCH, LITTLE BRO. THE MAIN QUEST IS YOUR HEAD — ONLY YOUR MATCHES WRITE IT.',
  };
}

/** placeholder copy when there’s no approved mechanic yet (or it went stale) */
export function buildPrepChat(coach: Coach, staleName?: string): CoachChat {
  const calm = coach.id === 'obinna';
  // The scan grades this stage's OBJECTIVES against the vault, so it works
  // with or without a fresh mechanic. Only the bonus tape is pending.
  const scanIntro =
    'THE SCAN IS LIVE — IT GRADES THIS STAGE’S OBJECTIVES OFF YOUR VAULT AND STILL PULLS YOUR LESSON OUT OF THE MATCH. TODAY’S SIDE QUEST IS STILL BEING CUT; THE MAIN ONE DOESN’T WAIT FOR IT.';
  if (staleName) {
    return {
      greeting: calm
        ? 'Come in — quick one today. The lesson changed under our feet.'
        : 'You’re here. Good. Quick one today — the game moved under us.',
      voiceCaption: 'VOICE NOTE · QUICK ROOM UPDATE — THE PATCH MOVED FIRST',
      mechanic: `**${staleName.toLowerCase()}** got patched out. Do not drill the old tape — I’m cutting the new one now. Your stage objectives are untouched though, and the scan still grades them off the vault.`,
      quip: calm
        ? 'The patch emptied my Saturday too, little one. We both grieve quietly, then we adapt.'
        : 'Yes, the patch ruined my weekend as well. No, I don’t want to talk about it. The scan already knows.',
      closer: `When the fresh tape lands, same rule — **the scan will know.** It always knows.`,
      scanIntro,
      footer: 'THE CHAT IS ONE WAY — THE UPDATED TAPE LANDS HERE FIRST.',
    };
  }
  return {
    greeting: calm
      ? 'Come in — sit down first. Today I’m setting up, so it’s just **me talking.**'
      : 'You’re here. Good. Pull up, little bro — today is just **me talking.**',
    voiceCaption: 'VOICE NOTE · ROOM SETUP — THE SCAN STILL COUNTS',
    mechanic:
      'Today’s extra mechanic isn’t cleared for the room yet — the scouts are still checking the tape. That changes nothing about your job: **the stage objectives below are live**, and the scan reads them straight off your vault. Go and play.',
    quip: calm
      ? 'Even the tape needs time to warm up, little one. It will land — nobody warns the rain either.'
      : "The scouts are arguing about the tape right now. I've seen friendlier derbies. It lands soon.",
    closer: `Do the work now, take the bonus tape when it lands. Either way — **the scan will know.** It always knows.`,
    scanIntro,
    footer: 'THE CHAT IS ONE WAY — THE MECHANIC LANDS HERE THE MOMENT IT’S APPROVED.',
  };
}

/** split "normal **hot** normal" into renderable spans */
export function parseHot(text: string): { t: string; hot: boolean }[] {
  const parts: { t: string; hot: boolean }[] = [];
  let rest = text;
  while (rest.length) {
    const i = rest.indexOf('**');
    if (i < 0) {
      parts.push({ t: rest, hot: false });
      break;
    }
    if (i > 0) parts.push({ t: rest.slice(0, i), hot: false });
    const j = rest.indexOf('**', i + 2);
    if (j < 0) {
      parts.push({ t: rest.slice(i), hot: false });
      break;
    }
    parts.push({ t: rest.slice(i + 2, j), hot: true });
    rest = rest.slice(j + 2);
  }
  return parts;
}

// ─────────────────────────────────────────────────────────────
// STAGE MATCH SCAN v2 — the in-room scan's copy + coach helpers.
// THE HONEST RULE: no AI reads the player's head here either.
// The soul question is the same rotating depth the 5-match
// baseline proved with, the story beat is the coach remembering
// his own scoreline, and the read is HIS line about today's
// mechanic — the answering stays the training.
// ─────────────────────────────────────────────────────────────

export interface StageScanCopy {
  /** the honor-system ask that frames PART 1 */
  ask: string;
  /** in-character bluster about honesty (flavor — never an app claim) */
  bluff: string;
  /** cue above the numbers/honor rows */
  numbersCue: string;
  /** cue above THE MIND + soul question */
  mindCue: string;
  /** the CTA-force line on the log button */
  demand: string;
}

export const STAGE_SCAN_COPY: Record<string, StageScanCopy> = {
  chinedu: {
    ask: 'Tell me the truth about the match you just played. All of it — especially the part that stings.',
    bluff:
      'Answer honestly, little bro. I have sat through two thousand debriefs — I can hear a made-up scoreline clear its throat before it speaks. The scan remembers. It always remembers.',
    numbersCue: 'THE NUMBERS — EASY PART. A MACHINE COULD TAKE THESE. FROM YOU, I TAKE THEM STRAIGHT.',
    mindCue: 'THE MIND — THE PART THAT ACTUALLY CHANGES YOU. THINK, THEN ANSWER.',
    demand: 'LOG IT LIKE IT HAPPENED',
  },
  obinna: {
    ask: 'Walk me back through the match, little one. Slowly. The score, yes — but what the score was made of.',
    bluff:
      'Little one — bring me the real score, not the one that feels better. After a thousand evenings on the water I can smell a dressed-up loss before it docks. Calm water sees everything.',
    numbersCue: 'THE NUMBERS — JUST WEATHER. WRITE THEM DOWN STEADY, EXACTLY AS THEY CAME.',
    mindCue: 'THE MIND — WHERE THE REAL MATCH WAS PLAYED. BE HONEST, BE KIND, BE SPECIFIC.',
    demand: 'SEAL IT WITH THE TRUTH',
  },
};

/** the soul question for this scoreline — rotates the baseline's depth by stage */
export function stageSoulQuestion(
  coachId: string,
  result: MatchResult,
  stageN: number,
  _gf: number,
  _ga: number,
): string {
  const script = BASELINE_SCRIPTS[coachId] ?? BASELINE_SCRIPTS.chinedu;
  const pool = script.questions[result];
  return pool[Math.max(0, stageN - 1) % pool.length];
}

/** the funny story beat this scoreline shakes loose — coach memory, not verdict */
export function stageScoreBeat(coachId: string, gf: number, ga: number): string {
  const script = BASELINE_SCRIPTS[coachId] ?? BASELINE_SCRIPTS.chinedu;
  return script.beats[beatKey(gf, ga)];
}

const READ_LINES: Record<string, Record<MatchResult, string>> = {
  chinedu: {
    W: 'A win banked is a win questioned. {MECH} was your edge today — run it until it is boring, because boring is what wins in March. Write down WHY the edge worked once, not what it felt like twice.',
    D: 'Dropped points teach louder than lost ones. {MECH} was in your hands and the game still slipped a corner — find the minute your discipline blinked, because it blinked before the scoreline did.',
    L: 'Stand still. Losses are tuition, and I do not let players pay twice for the same class. {MECH} did not fail you today — something BEFORE it did. Carry that one thing into the lab tonight, only that one thing.',
  },
  obinna: {
    W: 'Breathe it in, then set it down gently. {MECH} flowed because you stayed calm — calm is a habit, and habits only count if you repeat them on a bad evening too. Note where the calm came from.',
    D: 'A level game is still water with something moving underneath. {MECH} kept you afloat — now find the one ripple where you hurried, because hurried is how calm players drown quietly.',
    L: 'Come here. The water took one today — it gives back to players who watch it closely. {MECH} is still your map; tonight we find where you stopped reading it. One honest line in the lab, then rest.',
  },
};

/** the coach's read of the scan — tied to TODAY'S mechanic when the room has one */
export function stageReadLine(coachId: string, result: MatchResult, mechShort: string | null): string {
  const lines = READ_LINES[coachId] ?? READ_LINES.chinedu;
  const mech = mechShort ? `Today's mechanic, ${mechShort.toUpperCase()},` : 'The work this stage is built on,';
  return lines[result].replace('{MECH}', mech);
}
