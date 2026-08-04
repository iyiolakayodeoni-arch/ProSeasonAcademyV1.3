// ProSeasonAcademy — the PLAYER card, derived honestly from receipts.
//
// Principle P1 (receipt-first) and P2 (the player is a card). Every number
// below is computed from the real ledger — the Match Vault, the Loss Journal,
// the Thread, and stage progress. Nothing here is author-set or paintable.
//
// The deliberate split, and why it is the philosophy:
//   • RATING is STAGE-GATED. It rises only when a stage clears from evidence.
//     You cannot grind matches to inflate it — the climb is the rating. This
//     is "progress is earned from receipts" made into an object.
//   • The six STATS are the LIVE readout of how you are actually playing.
//     They move with your receipts between stages, so the card breathes
//     without ever lying about rank. Thin evidence reads as amber, not red —
//     lateness/thinness is shown, never shamed.
//
// Mirrors the Role Model's 6-stat card (`coaches.ts` cardStats) so the player
// approaches the Standard on the same instrument.

import { CardStat } from './coaches';
import { ProgressState } from './progress';

// what we read off the vault/journal/thread at the call site
export interface PlayerEvidence {
  played: number;
  w: number;
  d: number;
  l: number;
  ga: number; // goals conceded
  cleanSheets: number;
  /** matches whose head state was self-rated (composure objective evidence) */
  composureRated: number;
  /** average of self-rated composure 1..5 across rated matches */
  composureAvg: number;
  /** wins banked while leading at 75' (close-outs) */
  closeOuts: number;
  /** wins where the decider went in after 60' */
  decisiveLate: number;
  journalTotal: number;
  journalStreakDays: number;
  threadSettled: number; // held + broke
  threadHeld: number;
  threadBroke: number;
}

export interface PlayerCardData {
  rating: number; // 0..99, stage-gated
  stats: CardStat[]; // six honest 0..99 readouts
  stageN: number; // 1-based current stage
  totalStages: number;
  clearedCount: number;
  /** 0..1 — how close the rating is to the ceiling the Role Model represents */
  ascent: number;
}

const TOTAL_STAGES = 6;
const BASE_RATING = 60; // where every player starts — See Yourself, ungraded
const RATING_STEP = 6; // each cleared stage lifts the rating
const RATING_FLOOR = BASE_RATING; // never below the start
const RATING_CEIL = BASE_RATING + TOTAL_STAGES * RATING_STEP; // = 96 — the most a player can reach
// The STANDARD is the coach/benchmark rating (99) — always above the player's
// reachable ceiling. Ascent is measured toward the Standard, not the player's
// own cap, so a maxed-out player reads ~92%: approaching the benchmark, never
// quite touching it. "Your journey is the evidence. The Standard is the benchmark."
const STANDARD_RATING = 99;

const clamp = (n: number, lo = 0, hi = 99) => Math.max(lo, Math.min(hi, Math.round(n)));

/**
 * Derive the player's card from real evidence. Pure — call from any screen
 * that already holds the ledger. Pass `progress` for the stage gate and the
 * rolled-up `evidence` for the live stats.
 */
export function playerCardData(
  progress: Pick<ProgressState, 'currentStage' | 'completed'>,
  e: PlayerEvidence,
): PlayerCardData {
  const completed = progress.completed ?? {};
  const clearedCount = Object.keys(completed).length;
  const stageN = Math.min(TOTAL_STAGES, Math.max(1, progress.currentStage ?? 1));

  // ── RATING: stage-gated. Evidence moves the stats, not the rank. ──
  const rating = clamp(BASE_RATING + clearedCount * RATING_STEP, RATING_FLOOR, RATING_CEIL);
  // ascent is measured toward THE STANDARD (99), not the player's own cap (96) —
  // so the card always shows the gap to the benchmark, never a false "100%".
  const ascent = clamp((rating - BASE_RATING) / (STANDARD_RATING - BASE_RATING), 0, 1);

  // ── six stats, each an honest read of a slice of the ledger ──
  const decisions = e.played > 0 ? e.played : 0;

  // 1 · FORM — results. Win rate, but a draw counts half (it is a real result).
  //    No matches yet → 0, reads amber/red honestly.
  const form = e.played > 0 ? ((e.w + 0.5 * e.d) / e.played) * 100 : 0;

  // 2 · DEFENCE — conceded control. Fewer goals against per game = better.
  //    0 ga/game → 99; ~2.5 ga/game → floor. Clean sheets nudge it up.
  const gaPerGame = e.played > 0 ? e.ga / e.played : 2.5;
  const defence = e.played > 0
    ? clamp(99 - gaPerGame * 30 + Math.min(15, e.cleanSheets * 5))
    : 0;

  // 3 · COMPOSURE — your own head, self-rated. Avg of 1..5 → 0..99.
  //    The psychology the machine cannot read; only you can. (MATCH_SCAN §)
  const composure = e.composureRated > 0 ? ((e.composureAvg - 1) / 4) * 100 : 0;

  // 4 · DISCIPLINE — repeatable behaviour. Journal streak + thread held ratio.
  //    Writing the line AND keeping your lesson = the routine is the talent.
  const heldRatio = e.threadSettled > 0 ? e.threadHeld / e.threadSettled : 0;
  const streakCap = Math.min(40, e.journalStreakDays * 8);
  const discipline = clamp(streakCap + heldRatio * 59 + Math.min(10, e.journalTotal * 2));

  // 5 · CLUTCH — proof under pressure. Close-outs + late deciders.
  //    Winning when you were already ahead, and deciding it late.
  const clutch = decisions > 0
    ? clamp(((e.closeOuts + e.decisiveLate) / Math.max(1, decisions)) * 120)
    : 0;

  // 6 · INSIGHT — the seeing. Thread lessons settled + matches you wrote about.
  //    A verdict you agree with is a verdict you forget — so settled > 0 counts.
  const insight = clamp(e.threadSettled * 14 + Math.min(30, e.journalTotal * 3));

  const stats: CardStat[] = [
    { label: 'FORM', value: clamp(form) },
    { label: 'DEFENCE', value: clamp(defence) },
    { label: 'COMPOSURE', value: clamp(composure) },
    { label: 'DISCIPLINE', value: clamp(discipline) },
    { label: 'CLUTCH', value: clamp(clutch) },
    { label: 'INSIGHT', value: clamp(insight) },
  ];

  return { rating, stats, stageN, totalStages: TOTAL_STAGES, clearedCount, ascent };
}

/**
 * Build the evidence roll-up the card needs, straight off the vault. Kept here
 * so screens pass one object instead of reshaping the vault in three places.
 */
export function evidenceFromVault(args: {
  played: number;
  w: number;
  d: number;
  l: number;
  ga: number;
  cleanSheets: number;
  matches: Array<{
    composure: number | null;
    ledAt75: boolean | null;
    decisive: string | null;
    note: string | null;
  }>;
  journalTotal: number;
  journalStreakDays: number;
  threadSettled: number;
  threadHeld: number;
  threadBroke: number;
}): PlayerEvidence {
  const rated = args.matches.filter((m) => m.composure != null);
  const composureAvg =
    rated.length > 0
      ? rated.reduce((s, m) => s + (m.composure ?? 0), 0) / rated.length
      : 0;
  const closeOuts = args.matches.filter((m) => m.ledAt75 === true).length;
  const decisiveLate = args.matches.filter(
    (m) => m.decisive === 'AFTER 60' || m.decisive === 'AFTER 80',
  ).length;
  return {
    played: args.played,
    w: args.w,
    d: args.d,
    l: args.l,
    ga: args.ga,
    cleanSheets: args.cleanSheets,
    composureRated: rated.length,
    composureAvg,
    closeOuts,
    decisiveLate,
    journalTotal: args.journalTotal,
    journalStreakDays: args.journalStreakDays,
    threadSettled: args.threadSettled,
    threadHeld: args.threadHeld,
    threadBroke: args.threadBroke,
  };
}

export const PLAYER_CARD = {
  BASE_RATING,
  RATING_STEP,
  RATING_FLOOR,
  RATING_CEIL,
  STANDARD_RATING,
  TOTAL_STAGES,
};
