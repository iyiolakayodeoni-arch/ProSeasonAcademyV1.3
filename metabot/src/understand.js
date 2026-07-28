import { cleanOutside } from './util.js';

// ── classify raw outside content into the feed's kinds ────────
// first match wins, in priority order
const KIND_KEYS = [
  ['PATCH_NOTE', ['patch notes', 'title update', 'update patch', 'season update', 'update is live', 'maintenance', 'deep dive', 'deep-dive', 'update gameplay']],
  ['EXPLOIT', ['kickoff', 'kick-off', 'kick off glitch', 'exploit', 'glitch', 'spam', 'abuse', 'broken tactic', 'op tactic']],
  ['SKILL_MOVE', ['skill move', 'skill moves', 'elastico', 'lane change', 'step over', 'stepover', 'roulette', 'ball roll', 'heel to heel', 'fake shot', 'drag back', 'rainbow']],
  ['META_SHIFT', ['meta', 'best formation', 'tier list', 'best tactic', 'overpowered', 'ranked guide', 'h2h guide']],
  ['TRICK_OF_THE_WEEK', ['tutorial', 'how to score', 'free kick', 'corner routine', 'trick']],
];

export function classify(text) {
  const t = ` ${(text || '').toLowerCase()} `;
  for (const [kind, keys] of KIND_KEYS) if (keys.some((k) => t.includes(k))) return kind;
  return null;
}

// real pro-player / creator identities never enter the app voice.
// (their tips can still inform a post — but never with attribution inside the app)
const HANDLE_DENY = /\b(tekkz|msdossary|ms\s?dossary|moauba|nicolas99|nicolas99fc|ungwar|umut\s?r|dullenmike|fiddle|goalmachine|thestrxnger|gorilla)\b/i;

export function violatesIdentityGuard(text) {
  return HANDLE_DENY.test(text || '');
}

// ── build a stable topic key from a headline-ish string ───────
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'how', 'you', 'your', 'our', 'new', 'fc', 'mobile', 'fifa', 'ea', 'sports', 'best', 'top']);

export function topicKeyFrom(title) {
  const words = cleanOutside(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));
  return words.slice(0, 7).join('-') || 'untitled';
}
