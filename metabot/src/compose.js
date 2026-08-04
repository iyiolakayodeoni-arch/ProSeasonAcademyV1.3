import { cleanOutside } from './util.js';
import { buildLesson } from './lessons.js';

// Deterministic voice composer — no AI service involved.
// Templates + strict cleaning; the human approval gate polishes drafts.

const OPENERS = {
  PATCH_NOTE: ['fresh patch, straight from the source.', 'the lab notes just dropped.'],
  EXPLOIT: ['the community found another crack in the game.', "there's a window open right now."],
  SKILL_MOVE: ['skill lab:', "the move everyone's adding this week:"],
  META_SHIFT: ["the ladder's shifting.", 'the meta moved again, quietly.'],
  TRICK_OF_THE_WEEK: ['trick of the week candidate:'],
};

const TAILS = {
  PATCH_NOTE: ' we went through the changes so you play the update, not read it.',
  EXPLOIT: ' use it before the patch catches up.',
  SKILL_MOVE: ' drill it in the arena before ranked.',
  META_SHIFT: ' flexible players win the shuffle.',
  TRICK_OF_THE_WEEK: ' learn the timing, steal the goal.',
};

const CTAS = {
  PATCH_NOTE: 'READ THE BREAKDOWN ›',
  EXPLOIT: 'DRILL IT ›',
  SKILL_MOVE: 'ADD IT TO YOUR GAME ›',
  META_SHIFT: 'SEE THE SHAPES ›',
  TRICK_OF_THE_WEEK: 'LEARN THE TIMING ›',
};

// used when the source only gave us a title — never echo the headline into the body
const FALLBACKS = {
  PATCH_NOTE: 'the official rundown of everything the new update touches — gameplay, formations, the lot.',
  EXPLOIT: 'full breakdown linked for the scouts — this one is live right now.',
  SKILL_MOVE: 'the clips are linked — watch it once, then go drill it.',
  META_SHIFT: 'ladder-tested and already spreading — details linked for the theorycrafters.',
  TRICK_OF_THE_WEEK: 'full clip linked for the scouts.',
};

const norm = (s) => cleanOutside(s).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');

const pick = (arr, seedStr) => {
  let h = 0;
  for (const c of seedStr) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return arr[h % arr.length];
};

function headlineFrom(rawTitle, kind) {
  let t = cleanOutside(rawTitle)
    // strip channel branding tails: "| FC 26", "| FC 27", "| FC Mobile", "- YouTube", "· Channel"
    .split(/\s[|\-–·]\s/)[0]
    .replace(/[!?]{2,}/g, '')
    .replace(/^\s*(new|must watch|urgent|insane|broken)\s+/i, '$1 ');
  if (t.length > 62) t = t.slice(0, 59).replace(/\s+\S*$/, '') + '…';
  t = t.replace('…', '');
  const up = t.toUpperCase();
  return up.length > 10 ? up : `${kind.replace(/_/g, ' ')} ALERT`;
}

function bodyFrom(finding, kind) {
  const opener = pick(OPENERS[kind], finding.topicKey);
  const src = finding.summary && finding.summary.length > 40 ? finding.summary : finding.title || '';
  let bits = cleanOutside(src)
    .replace(/\b(like and subscribe|subscribe|smash that|check the link|link in (the )?(bio|description)|use code \w+)\b[^.]*[.!?]?/gi, '')
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length > 25 && !/^(welcome|what's up|yo guys|hey guys|in this video)/i.test(s))
    .slice(0, 2)
    .join(' ');
  if (!bits) bits = cleanOutside(finding.title || '');
  // echo guard — if the "summary" is really just the title again, swap in the fallback line
  const tNorm = norm(finding.title || '');
  const bNorm = norm(bits);
  if (bNorm.length < 60 || (tNorm.length > 20 && bNorm.includes(tNorm.slice(0, 40)))) {
    bits = FALLBACKS[kind];
  }
  let body = `${opener} ${bits}`.toLowerCase();
  const tail = TAILS[kind];
  if (body.length + tail.length <= 300) body += tail;
  if (body.length > 300) body = body.slice(0, 297).replace(/\s+\S*$/, '') + '…';
  return body;
}

function blogFrom(finding, headline, body, lesson) {
  const source = finding.sourceName || finding.via || 'source';
  const title = headline.replace(/[.!?]+$/, '');
  const why = lesson?.why || body;
  const steps = lesson?.tiles?.map((t, i) => `${i + 1}. ${t.title}: ${t.desc}`).join('\n') ||
    '1. Watch the source.\n2. Drill it in an unranked match.\n3. Only take it into ranked when the input is clean.';
  const scan = lesson?.scan?.map((s) => `- ${s.label}: ${s.target}`).join('\n') || '- Bring one honest match receipt.';
  return [
    `# ${title}`,
    '',
    `**Why it matters:** ${why}`,
    '',
    '## Train it',
    steps,
    '',
    '## What the academy will check',
    scan,
    '',
    `Source: ${source}`,
  ].join('\n');
}

export function composeDraft(finding) {
  const headline = headlineFrom(finding.title || finding.topicKey, finding.kind);
  const body = bodyFrom(finding, finding.kind);
  const lesson = buildLesson({ kind: finding.kind, headline, body }) ?? undefined;
  return {
    topicKey: finding.topicKey,
    headline,
    body,
    cta: CTAS[finding.kind] ?? 'READ MORE ›',
    blog: blogFrom(finding, headline, body, lesson),
    animationVariant: lesson?.clip?.variant,
    // structured coaching payload for lesson-eligible kinds — the Coaching
    // Screen teaches straight from this block (tiles, rule, scan targets).
    lesson,
  };
}
