// ProSeasonAcademy — FOUNDER ASSIST
//
// Automation for the unglamorous operational load — but the founder keeps
// every key decision. This module is the "junior assistant": it triages,
// prioritises, and DRAFTS, so the founder edits + approves instead of
// reading cold and typing from scratch. Nothing here sends a reply, strikes
// a member, or removes a seat. Every action is still the founder's tap.
//
// Design constraints (matches the product):
//   • RULE-BASED, not an LLM. Deterministic keyword/intent heuristics. The
//     "Mirror does not think for you" stance is about not doing the PLAYER's
//     thinking; the founder's own admin tooling automating ops is different.
//   • ZERO-COST & OFFLINE. Pure functions, no network, no API. The founder's
//     phone does the triage when the Desk opens.
//   • HONEST CONFIDENCE. A draft is always offered; confidence says how sure
//     the categorisation is so the founder knows when to look twice.
//
// Feeds: backend.InboxRow (contact inbox) + backend.FlagRow (conduct flags).

import { FlagRow, InboxRow, LapsedRow, ClaimRow, StuckRow } from './backend';

// ── categories, worst (highest priority) first ────────────────
export type DeskCategory =
  | 'PAYMENT'      // a sale you still have — answer first
  | 'ACCESS'       // locked out / can't get in
  | 'INSTALL'      // sideload / APK / update friction
  | 'CONDUCT'      // a report about another member
  | 'BUG'          // something broken
  | 'QUESTION'     // how / what / where
  | 'FEEDBACK'     // a suggestion or praise
  | 'OTHER';

export type Confidence = 'high' | 'medium' | 'low';

export interface InboxTriage {
  category: DeskCategory;
  priority: number;       // 1 = answer first
  confidence: Confidence;
  summary: string;        // one-line "what they want"
  draft: string;          // editable reply pre-fill — founder sends
}

// keyword banks. Order matters only for confidence (more hits = surer).
const KW: Record<Exclude<DeskCategory, 'OTHER'>, string[]> = {
  PAYMENT: ['card', 'refused', 'declined', 'payment', 'pay', 'opay', 'transfer', 'bank', 'stripe', 'paypal', 'paid', 'transaction', 'debit', 'ngn', '₦', 'price', 'charge', 'subscription', 'pass', 'upgrade'],
  ACCESS: ["can't log in", 'cant log in', 'login', 'log in', 'sign in', 'password', 'locked out', 'lockedout', 'reset', 'cannot access', "can't access", 'cant access', 'my account', 'lost my', 'forgot'],
  INSTALL: ['install', 'download', 'sideload', 'side load', 'apk', 'unknown source', 'unknown sources', 'update', "won't open", 'wont open', "can't open", 'cant open', 'not opening'],
  CONDUCT: ['report', 'reported', 'abuse', 'abusive', 'scam', 'scammer', 'cheating', 'cheater', 'hacking', 'hacker', 'threat', 'racist', 'harass', 'bully'],
  BUG: ['bug', 'error', 'glitch', 'broken', 'freeze', 'frozen', 'crash', 'crashed', 'wrong', 'typo', 'lag', 'stuck on', 'white screen'],
  QUESTION: ['how do', 'how to', 'how can', 'what is', 'what does', 'where do', 'when do', 'why', 'can i', 'could i', 'is it', 'are you', '?'],
  FEEDBACK: ['suggestion', 'idea', 'love this', 'love the', 'great app', 'good app', 'wish', 'should add', 'feature', 'would be cool', 'amazing', 'thank'],
};

const PRIORITY: Record<DeskCategory, number> = {
  PAYMENT: 1, ACCESS: 1, INSTALL: 1, CONDUCT: 1,
  BUG: 2, QUESTION: 3, FEEDBACK: 3, OTHER: 4,
};

function countHits(body: string, words: string[]): { cat: string; hits: number } {
  let hits = 0;
  for (const w of words) if (body.includes(w)) hits++;
  return { cat: '', hits };
}

/** triage a single inbox message into category + priority + an editable draft */
export function triageMessage(m: InboxRow): InboxTriage {
  const body = String(m.body ?? '').toLowerCase();
  const scores: { cat: Exclude<DeskCategory, 'OTHER'>; hits: number }[] = (
    Object.keys(KW) as Exclude<DeskCategory, 'OTHER'>[]
  ).map((cat) => ({ cat, hits: countHits(body, KW[cat]).hits }));

  scores.sort((a, b) => b.hits - a.hits);
  const best = scores[0];
  const category: DeskCategory = best && best.hits > 0 ? best.cat : 'OTHER';
  const priority = PRIORITY[category];

  // confidence: a strong single signal (e.g. "refused", "can't log in") or
  // 2+ keyword hits = high; 1 hit = medium; none = low.
  const strong = category !== 'OTHER' && KW[category].some((w) => body.includes(w) && w.length > 4);
  const confidence: Confidence = best.hits >= 2 || strong ? 'high' : best.hits === 1 ? 'medium' : 'low';

  const id = m.academy_id ?? m.handle ?? 'YOUR ID';
  return {
    category,
    priority,
    confidence,
    summary: summaryFor(category, m),
    draft: draftFor(category, id),
  };
}

function summaryFor(cat: DeskCategory, m: InboxRow): string {
  const who = m.handle ?? 'PLAYER';
  switch (cat) {
    case 'PAYMENT': return `${who}: card/payment blocked — a sale to save.`;
    case 'ACCESS': return `${who}: can't get into their account.`;
    case 'INSTALL': return `${who}: stuck installing/updating.`;
    case 'CONDUCT': return `${who}: reporting another member — read it.`;
    case 'BUG': return `${who}: something broken — needs detail.`;
    case 'QUESTION': return `${who}: asking how/what.`;
    case 'FEEDBACK': return `${who}: a suggestion or praise.`;
    default: return `${who}: read and decide.`;
  }
}

// editable drafts. {ID} is the member's academy reference. Bracketed [..]
// tokens are the bits only the founder can fill (amount, the founder's OPay
// number, the specific answer). The draft does the scaffolding; the founder
// personalises and SENDS.
function draftFor(cat: DeskCategory, id: string): string {
  switch (cat) {
    case 'PAYMENT':
      return `Your card was refused — no problem. Send the [amount] to OPay with your academy ID ${id} as the reference, then tap "I'VE PAID" in the app. I confirm the moment it lands. Your seat is safe.`;
    case 'ACCESS':
      return `Sorry you're locked out. On the sign-in screen tap RESET — a link goes to your email. If that doesn't work, reply with exactly what you see and I'll sort it personally.`;
    case 'INSTALL':
      return `To install: download the APK, then phone SETTINGS → "INSTALL UNKNOWN APPS" → allow your browser, then open the file. Tell me which step you're stuck on and I'll walk you through it.`;
    case 'CONDUCT':
      return `Thanks for flagging this — I take it seriously. I've read it and I'll handle it directly. I won't tell them it was you.`;
    case 'BUG':
      return `Thanks for catching this. Two things so I can fix it fast: what you tapped right before it happened, and what device you're on. I'll get it patched.`;
    case 'QUESTION':
      return `Good question. [answer it in one line here]. Anything else, just ask — I read these myself.`;
    case 'FEEDBACK':
      return `Appreciate you taking the time to write this. I read every one of these myself — keep them coming.`;
    default:
      return `Thanks for writing — I've got this and I'll get back to you.`;
  }
}

/** sort the inbox so the things that matter most sit at the top */
export function sortInboxByPriority(rows: InboxRow[]): InboxRow[] {
  return [...rows].sort((a, b) => {
    const ta = triageMessage(a);
    const tb = triageMessage(b);
    if (ta.priority !== tb.priority) return ta.priority - tb.priority;
    // within a priority tier, unread first, then newest
    if (a.read !== b.read) return a.read ? 1 : -1;
    return new Date(b.at).getTime() - new Date(a.at).getTime();
  });
}

// ── FLAG TRIAGE — the conduct filter only catches extreme things (sexual /
//    hate), so most flags are real. The assistant's job is narrow: flag the
//    ones that look QUOTED/DISCUSSED (possible false alarm) so the founder
//    reads before warning. The founder still taps WARN or FALSE ALARM.
export type FlagSeverity = 'CLEAR' | 'POSSIBLY_QUOTED';
export interface FlagTriage {
  severity: FlagSeverity;
  recommendation: 'WARN' | 'READ_FIRST';
  confidence: Confidence;
  reason: string;
}

export function triageFlag(f: FlagRow): FlagTriage {
  const text = String(f.text ?? '').toLowerCase();
  // signals the term is being discussed/quoted rather than used at someone
  const quoted =
    text.includes('what does') ||
    text.includes('what is') ||
    text.includes('means') ||
    text.includes('"') ||
    text.includes("'") && text.includes('said') ||
    text.includes('reported') ||
    text.includes('is this') ||
    text.length > 160; // long, contextual messages rarely aim a slur at someone
  if (quoted) {
    return {
      severity: 'POSSIBLY_QUOTED',
      recommendation: 'READ_FIRST',
      confidence: 'medium',
      reason: 'Looks discussed/quoted, not aimed — read before warning.',
    };
  }
  return {
    severity: 'CLEAR',
    recommendation: 'WARN',
    confidence: 'high',
    reason: 'Direct use of a flagged term — warn (your call).',
  };
}

// ── a small priority legend for the UI ─────────────────────────
export const PRIORITY_LABEL: Record<number, string> = {
  1: 'ANSWER FIRST',
  2: 'BUG',
  3: 'ROUTINE',
  4: 'READ',
};

export const CATEGORY_COLOR: Record<DeskCategory, string> = {
  PAYMENT: '#f2c078',
  ACCESS: '#f2c078',
  INSTALL: '#f2c078',
  CONDUCT: '#e0605c',
  BUG: '#6fd0c9',
  QUESTION: '#8fb89b',
  FEEDBACK: '#8fb89b',
  OTHER: '#8fb89b',
};

// ─────────────────────────────────────────────────────────────
// LAPSED-SEAT RECOMMENDATIONS — the sweep runs nightly by itself,
// but REMOVING a person is the founder's call. The assistant looks
// at how long a seat has been empty + the tier and recommends
// RELEASE / GRACE / WAIT with a reason. The founder still taps.
// ─────────────────────────────────────────────────────────────
export type LapsedAction = 'RELEASE' | 'GRACE' | 'WAIT';
export interface LapsedRec {
  action: LapsedAction;
  confidence: Confidence;
  reason: string;
}

export function lapsedRecommendation(row: LapsedRow): LapsedRec {
  const days = Number(row.days_lapsed ?? 0);
  const tier = String(row.tier ?? '').toUpperCase();
  const paidBefore = tier === 'PRO' || tier === 'ACADEMY';
  if (days >= 30) {
    return {
      action: 'RELEASE',
      confidence: 'high',
      reason: paidBefore
        ? `${days}d lapsed — past the 30-day line, but they once paid. Reclaiming frees a waitlister; they keep their vault.`
        : `${days}d lapsed and never paid — past the 30-day reclaim line. Seat returns to the waitlist.`,
    };
  }
  if (days >= 14) {
    return {
      action: 'GRACE',
      confidence: 'medium',
      reason: `${days}d lapsed — inside a fair window. A reminder is cheaper than losing someone who may still pay.`,
    };
  }
  return {
    action: 'WAIT',
    confidence: 'high',
    reason: `${days}d — only just lapsed. Give it a few more days before you reclaim.`,
  };
}

// ─────────────────────────────────────────────────────────────
// THE DAILY DIGEST — one screen, one pass. Counts every queue and
// lists the recommended ORDER to work them (money first, then
// conduct, then seats). This is the "do it once a day" rhythm the
// audit said is right at scale.
// ─────────────────────────────────────────────────────────────
export interface DeskDigest {
  stuck: number;
  claims: number;
  flags: number;
  lapsed: number;
  inbox: number;
  total: number;
  clear: boolean;
  /** ordered work list — only entries with work outstanding */
  actions: { label: string; tone: 'payment' | 'flag' | 'seat' | 'inbox'; count: number }[];
  headline: string;
}

export function deskDigest(args: {
  stuck: StuckRow[] | null;
  claims: ClaimRow[] | null;
  flags: FlagRow[] | null;
  lapsed: LapsedRow[] | null;
  inboxUnread: number;
}): DeskDigest {
  const stuckWaiting = (args.stuck ?? []).filter((s) => !s.paid_since);
  const claimsWaiting = (args.claims ?? []).filter((c) => c.status === 'pending' || c.status === 'waiting');
  const flagsPending = (args.flags ?? []).filter((f) => !f.reviewed);
  const lapsedReclaimable = (args.lapsed ?? []).filter((m) => Number(m.days_lapsed ?? 0) >= 30);

  const actions: DeskDigest['actions'] = [];
  if (stuckWaiting.length) actions.push({ label: 'CARD-REFUSED PAYMENTS', tone: 'payment', count: stuckWaiting.length });
  if (claimsWaiting.length) actions.push({ label: 'PAYMENT CLAIMS TO CONFIRM', tone: 'payment', count: claimsWaiting.length });
  if (flagsPending.length) actions.push({ label: 'FLAGGED CONTENT', tone: 'flag', count: flagsPending.length });
  if (lapsedReclaimable.length) actions.push({ label: 'SEATS PAST 30D TO RECLAIM', tone: 'seat', count: lapsedReclaimable.length });
  if (args.inboxUnread) actions.push({ label: 'UNREAD INBOX', tone: 'inbox', count: args.inboxUnread });

  const total = actions.reduce((n, a) => n + a.count, 0);
  const clear = total === 0;
  return {
    stuck: stuckWaiting.length,
    claims: claimsWaiting.length,
    flags: flagsPending.length,
    lapsed: lapsedReclaimable.length,
    inbox: args.inboxUnread,
    total,
    clear,
    actions,
    headline: clear
      ? 'THE DESK IS CLEAR — NOTHING NEEDS YOU TODAY.'
      : `${total} THING${total === 1 ? '' : 'S'} NEED YOU — ONE PASS, TOP TO BOTTOM.`,
  };
}

// ─────────────────────────────────────────────────────────────
// PRICING-DIGEST — turn the member pricing consultation into a
// one-line read: who has spoken, what the strongest signal is,
// and which question is too thin to trust yet. The founder still
// sets the actual price; this just saves reading every answer.
// ─────────────────────────────────────────────────────────────
export interface PricingDigest {
  totalAnswers: number;
  top: { prompt: string; median: number | null; answers: number; region: string | null }[];
  read: string;
}

export function pricingDigest(consult: any[] | null): PricingDigest | null {
  if (!consult || consult.length === 0) return null;
  const rows = consult
    .map((r) => ({
      prompt: String(r.prompt ?? ''),
      median: r.median != null ? Number(r.median) : null,
      answers: Number(r.answers ?? 0),
      region: r.region ? String(r.region) : null,
    }))
    .filter((r) => r.answers > 0);

  const totalAnswers = rows.reduce((n, r) => n + r.answers, 0);
  const sorted = [...rows].sort((a, b) => b.answers - a.answers);
  const top = sorted.slice(0, 3);

  if (top.length === 0) {
    return { totalAnswers: 0, top: [], read: 'NO ANSWERS YET — THE TABLE IS EMPTY.' };
  }
  const strongest = top[0];
  const thin = sorted[sorted.length - 1];
  const parts: string[] = [
    `${totalAnswers} ANSWER${totalAnswers === 1 ? '' : 'S'} SO FAR.`,
    `STRONGEST SIGNAL: ${strongest.prompt}${strongest.median != null ? ` → ${Number(strongest.median).toLocaleString()}` : ''} (${strongest.answers} RESPONSE${strongest.answers === 1 ? '' : 'S'}).`,
  ];
  if (thin && thin.answers < 5 && thin.prompt !== strongest.prompt) {
    parts.push(`THIN: "${thin.prompt}" ONLY HAS ${thin.answers} — DON'T TRUST IT YET.`);
  }
  return { totalAnswers, top, read: parts.join(' ') };
}

// seed for the founder's canned-reply library — the same drafts above,
// genericised ({ACADEMY_ID} placeholder). The founder overrides these.
export const CANNED_SEED: { category: DeskCategory; body: string }[] = (
  ['PAYMENT', 'ACCESS', 'INSTALL', 'CONDUCT', 'BUG', 'QUESTION', 'FEEDBACK', 'OTHER'] as DeskCategory[]
).map((c) => ({ category: c, body: draftFor(c, '{ACADEMY_ID}') }));
