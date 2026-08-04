// ─────────────────────────────────────────────────────────────
// HUMOR — the academy's pulse. The app is serious about coaching;
// it is NOT serious about itself. One line of wit in the right
// places, rotating DETERMINISTICALLY (seeded by the day) so the
// greeting doesn't flicker on every re-render — it changes when
// the calendar does, like a manager's pre-match quote.
//
// Rules of the house voice: punchy, football-smart, self-aware.
// Never punch down. Fullbacks are fair game. Always.
// ─────────────────────────────────────────────────────────────

/** stable picker: same day → same line, next day → a new mood */
function dailyPick<T>(pool: T[], salt = 0, d = new Date()): T {
  const seed =
    d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate() * 7 + salt * 13 + pool.length;
  return pool[Math.abs(seed) % pool.length];
}

function withName(t: string, name: string): string {
  return t.replace('{NAME}', name);
}

// ── the homepage greeting — time-aware, name-aware, mildly unhinged ──
const NIGHT: string[] = [
  "STILL AWAKE? GOOD. YOUR NEXT OPPONENT ISN'T.",
  'MIDNIGHT SESSIONS BUILD LEGENDS. AND EYEBAGS.',
  'THE LADDER NEVER SLEEPS. UNFORTUNATELY, NEITHER DO YOU.',
  'IT IS {H}:00. THE SCAN RESPECTS THE COMMITMENT.',
];
const MORNING: string[] = [
  'MORNING, {NAME}. BOOTS LACED, EGO CHECKED AT THE DOOR.',
  'EARLY SESSION. THE FULLBACKS ARE STILL ASLEEP. STRIKE NOW.',
  'MORNING, {NAME}. COFFEE FIRST. THEN WE FIX THE DEFENDING.',
  'UP EARLY. THE META FEAR PLAYERS WHO WARM UP BEFORE IT.',
];
const AFTERNOON: string[] = [
  "AFTERNOON, {NAME}. SOMEWHERE A FULLBACK FEELS SAFE. HE ISN'T.",
  "LUNCH-HOUR RANKED? YOUR COACH APPROVES. YOUR BOSS MIGHT NOT.",
  'AFTERNOON, {NAME}. PERFECT LIGHT FOR RUINING A 4-3-3.',
];
const EVENING: string[] = [
  'EVENING, {NAME}. PRIME RANKED HOURS — CHOOSE CALM VIOLENCE.',
  "EVENING, {NAME}. THE DIVISION IS EATING DINNER. YOU'RE SCOUTING.",
  'EVENING, {NAME}. THE SERVERS ARE FULL OF PEOPLE ABOUT TO LEARN.',
];
const WEEKDAY_OVERRIDES: Partial<Record<number, string>> = {
  1: 'MONDAY. NEW WEEK, SAME DELUSIONAL FULLBACKS.',
  5: 'FRIDAY. THE WEEKEND-LEAGUE DEMONS ARE LOGGING IN EARLY.',
  0: 'SUNDAY. RECOVERY DAY FOR THEM. TAPE DAY FOR YOU.',
};

/**
 * The greeting line under the crest. Returns something like
 * "EVENING, KAY — 21:47 GMT+1" where the first half is the wink
 * and the clock stays because the clock is genuinely useful.
 */
export function greetingLine(name: string, stamp: string, d = new Date()): string {
  const h = d.getHours();
  const special = WEEKDAY_OVERRIDES[d.getDay()];
  let line: string;
  if (special && dailyPick([0, 1], 99, d) === 0) {
    line = withName(special, name);
  } else if (h >= 23 || h < 5) {
    line = withName(dailyPick(NIGHT, 1, d).replace('{H}', String(h)), name);
  } else if (h < 12) {
    line = withName(dailyPick(MORNING, 2, d), name);
  } else if (h < 17) {
    line = withName(dailyPick(AFTERNOON, 3, d), name);
  } else {
    line = withName(dailyPick(EVENING, 4, d), name);
  }
  return `${line}  ·  ${stamp} GMT+1`;
}

// ── ticker wit — folded into the live marquee between the real notes ──
export const TICKER_WIT: string[] = [
  'REMINDER: RAGE-QUITTING IS NOT A MECHANIC',
  'THE SCAN SEES ALL. IT ACCEPTS NO BRIBES (IT ACCEPTS GOOD DEBRIEFS)',
  'FULLBACK AWARENESS WEEK CONTINUES',
  'HYDRATION CHECK — YOUR COACH HEARD THE CRISP PACKET',
  'LOSSES ARE DATA. VERY RUDE DATA, BUT DATA',
];

export function tickerWit(d = new Date()): string {
  return dailyPick(TICKER_WIT, 5, d);
}

// ── the feed's dead end — a small reward for reading everything ──
const CAUGHT_UP: string[] = [
  "— YOU'RE ALL CAUGHT UP. GO OUTSIDE (AFTER ONE MORE MATCH) ▮",
  '— NOTHING LEFT HERE. THE VAULT IS CALLING ▮',
  "— CAUGHT UP. YOUR COACH IS ALREADY SUSPICIOUS OF THIS MUCH REST ▮",
  "— END OF FEED. THIS IS WHERE THE OBSESSED FIND OUT ▮",
];

export function caughtUpLine(d = new Date()): string {
  return dailyPick(CAUGHT_UP, 6, d);
}

// ── brand-tap easter egg — tap the wordmark, the founder mutters ──
const BRAND_MUTTERS: string[] = [
  'PSST. YEAH. THE LOGO NOTICED YOU.',
  "FOUNDER'S NOTE: BUILT AFTER ONE RAGE-QUIT TOO MANY.",
  'FUN FACT: THE CREST IS WATCHING YOUR COMPOSURE.',
  'OK, GENUINELY — GO TRAIN. THE SCAN IS PATIENT, NOT FORGETFUL.',
];

/** tap n (1-based) of the secret handshake; null means the joke is over */
export function brandMutter(tapCount: number): string | null {
  if (tapCount < 3) return null; // nobody confesses before three taps
  return BRAND_MUTTERS[(tapCount - 3) % BRAND_MUTTERS.length];
}

// ── coach briefing quips — one garnish line per lesson, seeded by the
// mechanic's id so it never changes mid-read but varies by day/stage ──
const QUIPS: Record<string, string[]> = {
  chinedu: [
    "One day you'll teach ME something. Today is not that day. Scroll.",
    'I drilled this until my thumbs filed a formal complaint. Your turn.',
    "If anyone asks — yes, this IS the fun part. I'm practically famous for my fun.",
    'My old coach made me run this on the team bus. You have a sofa and Wi-Fi. Grateful? Scroll.',
    'I once explained this at a wedding. The couple is still married. The guests are all better players.',
    "Read it twice. I'll know. I have a sense for these things. (It's the scan. It's always the scan.)",
  ],
  obinna: [
    'I practised saying all that in one breath. The steering wheel was very impressed.',
    "Even the rain can't interrupt us today — mostly because we're indoors, but let me have this.",
    'If you smile once while drilling, the rep counts double. Academy rule. I just made it up, but it works.',
    'Somewhere right now a rival is skipping this exact lesson. Grand. More ladder for us.',
    'I told this mechanic to my nephew. He beat his dad 4–0. The family is healing. Slowly.',
  ],
};

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** the coach's single wink for this briefing — stable per mechanic/prep state */
export function coachQuip(coachId: string, seedKey: string): string {
  const pool = QUIPS[coachId] ?? QUIPS.chinedu;
  return pool[hash(seedKey) % pool.length];
}
