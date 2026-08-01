import { useSyncExternalStore } from 'react';
import { useJourneyProgress } from './progress';

// ─────────────────────────────────────────────────────────────
// THE STANDARD — the parallel benchmark journey.
//
// MIRROR DIRECTION §4.2: a visible, authored journey based on the
// behaviours, decisions, discipline and development habits of the
// best people in the player's chosen field or path. For Pro
// Season that is an elite FC Mobile professional — a FICTIONAL
// COMPOSITE Role Model, never a copy of one real person.
//
// The Standard is NOT a second progression track: no player
// objectives, no XP, no badges, no second route to complete. It
// moves alongside the player's Journey and reveals the chapter
// that matches the player's current stage.
//
//   "Your Journey is the evidence. The Standard is the benchmark."
//   "Read the Standard. Walk your own road."
// ─────────────────────────────────────────────────────────────

export interface StandardChapter {
  n: number;
  stageKey: string; // matches the universal Journey stage key
  chapterTitle: string;
  /** what the best in the path learn at a comparable point */
  whatTheyLearn: string;
  /** the professional behaviour to study */
  behaviourToStudy: string[];
  /** the standard the player is approaching — a one-line benchmark */
  benchmark: string;
  /** the composite's own line about this chapter */
  voice: string;
}

export interface StandardModel {
  /** the composite elite Role Model of the path */
  name: string;
  title: string;
  /** what the composite represents — never one real player */
  credo: string[];
  /** the professional standards the composite embodies */
  pillars: string[];
  chapters: StandardChapter[];
}

export const STANDARD: StandardModel = {
  name: 'THE STANDARD',
  title: 'A COMPOSITE OF THE BEST IN THE PATH',
  credo: [
    'Deliberate practice over volume.',
    'Honest match review over comfortable stories.',
    'Emotional control under pressure.',
    'Preparation before talent.',
    'Consistency when nobody is watching.',
  ],
  pillars: [
    'DELIBERATE PRACTICE',
    'HONEST REVIEW',
    'EMOTIONAL CONTROL',
    'PREPARATION',
    'CONSISTENCY',
    'DECISIONS UNDER PRESSURE',
    'RECOVERY AFTER FAILURE',
    'DISCIPLINED REPETITION',
    'PROFESSIONAL CONDUCT',
  ],
  chapters: [
    {
      n: 1,
      stageKey: 'SEE YOURSELF',
      chapterTitle: 'SEE YOURSELF',
      whatTheyLearn:
        'Elite players keep a truthful baseline before they try to improve. They log the match, the score, the head state and the moments — including the embarrassing ones. The record is written in the moment, not reconstructed from memory at the end of the week.',
      behaviourToStudy: [
        'Log every match, win or loss, while it is fresh.',
        'Write the honest line about the loss, not the excuse.',
        'Name their own repeated behaviour before blaming the game.',
      ],
      benchmark: 'They can look at their own record without flinching — and they do, daily.',
      voice: 'The Standard does not feel the loss and then forget it. It feels it, writes it down, and studies it tomorrow.',
    },
    {
      n: 2,
      stageKey: 'CONTROL YOURSELF',
      chapterTitle: 'CONTROL YOURSELF',
      whatTheyLearn:
        'Elite players know exactly what pressure does to their decisions. They do not pretend the second goal is bad luck — they study the sequence, the emotion and the rushed input that created it. The head is the first game they learn to win.',
      behaviourToStudy: [
        'Rate their own head state, honestly, mid-match.',
        'Find the minute the discipline blinked before the scoreline did.',
        'Defend the next three actions, not the last mistake.',
      ],
      benchmark: 'One mistake is an event, not an emergency. They study the next three actions instead of tilting.',
      voice: 'The Standard concedes. Then it does not concede twice to the same emotion.',
    },
    {
      n: 3,
      stageKey: 'READ THE GAME',
      chapterTitle: 'READ THE GAME',
      whatTheyLearn:
        'The best read patterns, danger, space, tempo and decision context — and act before the picture changes. They play the picture, not the ball, and they build that vision by counting what repeats.',
      behaviourToStudy: [
        'Notice the run before it starts, the danger before it arrives.',
        'Break the low block with patience, not panic.',
        'Choose the pass that serves the next three seconds.',
      ],
      benchmark: 'They see the game three seconds ahead, because they studied the two seconds behind.',
      voice: 'The Standard does not react to the game. It reads it, and the game does what it expects.',
    },
    {
      n: 4,
      stageKey: 'BUILD DISCIPLINE',
      chapterTitle: 'BUILD DISCIPLINE',
      whatTheyLearn:
        'Elite players turn awareness into repeatable behaviour. The routine is the talent: the same preparation, the same standards, the same honest ledger — on the nights they feel like it and on the nights they do not.',
      behaviourToStudy: [
        'Do the work on the night they do not feel like it.',
        'Keep the ledger honest even after a win.',
        'Repeat the process until it is boring — boring wins.',
      ],
      benchmark: 'They do not rely on motivation. They rely on the routine that makes motivation unnecessary.',
      voice: 'The Standard trains when nobody is watching. That is exactly when it is built.',
    },
    {
      n: 5,
      stageKey: 'PERFORM UNDER PRESSURE',
      chapterTitle: 'PERFORM UNDER PRESSURE',
      whatTheyLearn:
        'Under pressure, players do not rise to the occasion — they sink to their highest level of preparation. The best test their work in real competitive situations, close out leads, and decide games in the minutes that break others.',
      behaviourToStudy: [
        'Take ranked seriously — it is the exam, not a warm-up.',
        'Close out the lead at 75’ with discipline, not panic.',
        'Decide the game in the late minutes, deliberately.',
      ],
      benchmark: 'When the pressure arrives, the Standard is already prepared — so it looks calm.',
      voice: 'The Standard does not get more nervous in the big moments. It gets more prepared.',
    },
    {
      n: 6,
      stageKey: 'PROVE IT',
      chapterTitle: 'PROVE IT',
      whatTheyLearn:
        'The best review the accumulated evidence of a whole period and set the next professional standard. They prove it with receipts — matches, lessons held and broken, clean sheets — and then they raise the bar again.',
      behaviourToStudy: [
        'Look at the whole record, not the last match.',
        'Count the lessons that held against the ones that broke.',
        'Define the next standard with the evidence in hand.',
      ],
      benchmark: 'They never graduate. They set the next standard and walk toward it.',
      voice: 'The Standard is not a destination. It is the way the work is done, every single day.',
    },
  ],
};

/** the Standard chapter that mirrors the player's CURRENT stage */
export function standardChapterFor(stageN: number): StandardChapter {
  const n = Math.max(1, Math.min(STANDARD.chapters.length, stageN));
  return STANDARD.chapters.find((c) => c.n === n) ?? STANDARD.chapters[0];
}

export interface StandardView {
  model: StandardModel;
  /** the chapter revealed at the player's current stage */
  current: StandardChapter;
  /** stages the player has fully cleared */
  clearedCount: number;
}

/** live view — The Standard moves with the player's own progress */
export function useStandard(): StandardView {
  const progress = useJourneyProgress();
  return {
    model: STANDARD,
    current: standardChapterFor(progress.currentStage),
    clearedCount: progress.completedCount,
  };
}

/** imperative read for non-React code */
export function getStandardChapter(stageN: number): StandardChapter {
  return standardChapterFor(stageN);
}
