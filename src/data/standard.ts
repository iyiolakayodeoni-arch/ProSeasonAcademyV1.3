import { useSyncExternalStore } from 'react';
import { useJourneyProgress } from './progress';

// ─────────────────────────────────────────────────────────────
// HIS ROAD — the benchmark journey.
//
// THE BENCHMARK IS ONE MAN: CHINEDU OKAFOR. Not a fictional
// composite — the road the academy's single coach actually
// walked, season after season, at the top of the game. His
// journey is the benchmark; the player's own journey is the
// evidence. Same six chapters, his receipts vs the player's.
//
// His road is NOT a second progression track: no player
// objectives, no XP, no badges, no second route to complete. It
// moves alongside the player's Journey and reveals the chapter
// that matches the player's current stage.
//
//   "Your Journey is the evidence. His road is the benchmark."
//   "Read his road. Walk your own."
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
  name: 'CHINEDU OKAFOR',
  title: 'HIS ROAD — TOP OF THE GAME, SEASON AFTER SEASON',
  credo: [
    'The honest review came before the highlight reel.',
    'The head was trained before the thumbs were fast.',
    'The routine outlasted every excuse I ever had.',
    'The receipts mattered more than the scoreline.',
    'I stayed at the top because I stayed coachable.',
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
        'Before any tactic, I kept a truthful baseline. I logged every match — the score, my head state, the moments, including the embarrassing ones — written in the moment, never reconstructed from memory at the end of the week. The record did not flatter me. That was the point.',
      behaviourToStudy: [
        'Log every match, win or loss, while it is fresh.',
        'Write the honest line about the loss, not the excuse.',
        'Name their own repeated behaviour before blaming the game.',
      ],
      benchmark: 'They can look at their own record without flinching — and they do, daily.',
      voice: 'I did not feel the loss and forget it. I felt it, wrote it down, and studied it the next morning.',
    },
    {
      n: 2,
      stageKey: 'CONTROL YOURSELF',
      chapterTitle: 'CONTROL YOURSELF',
      whatTheyLearn:
        'I learned exactly what pressure does to decisions. I stopped calling the second goal bad luck and started studying the sequence, the emotion and the rushed input that created it. The head is the first game — I won it before I won any other.',
      behaviourToStudy: [
        'Rate their own head state, honestly, mid-match.',
        'Find the minute the discipline blinked before the scoreline did.',
        'Defend the next three actions, not the last mistake.',
      ],
      benchmark: 'One mistake is an event, not an emergency. They study the next three actions instead of tilting.',
      voice: 'I concede. Then I refuse to concede twice to the same emotion.',
    },
    {
      n: 3,
      stageKey: 'READ THE GAME',
      chapterTitle: 'READ THE GAME',
      whatTheyLearn:
        'I read patterns, danger, space and tempo — and acted before the picture changed. I played the picture, not the ball, and I built that vision by counting what repeated, until reading the game was faster than reacting to it.',
      behaviourToStudy: [
        'Notice the run before it starts, the danger before it arrives.',
        'Break the low block with patience, not panic.',
        'Choose the pass that serves the next three seconds.',
      ],
      benchmark: 'They see the game three seconds ahead, because they studied the two seconds behind.',
      voice: 'I do not react to the game. I read it — and the game does what I expect.',
    },
    {
      n: 4,
      stageKey: 'BUILD DISCIPLINE',
      chapterTitle: 'BUILD DISCIPLINE',
      whatTheyLearn:
        'I turned awareness into repeatable behaviour. The routine is the talent: the same preparation, the same standards, the same honest ledger — on the nights I felt like it and on the nights I did not. Boring wins.',
      behaviourToStudy: [
        'Do the work on the night they do not feel like it.',
        'Keep the ledger honest even after a win.',
        'Repeat the process until it is boring — boring wins.',
      ],
      benchmark: 'They do not rely on motivation. They rely on the routine that makes motivation unnecessary.',
      voice: 'I train when nobody is watching. That is exactly when it gets built.',
    },
    {
      n: 5,
      stageKey: 'PERFORM UNDER PRESSURE',
      chapterTitle: 'PERFORM UNDER PRESSURE',
      whatTheyLearn:
        'Under pressure you do not rise to the occasion — you sink to your highest level of preparation. I tested my work in ranked, closed out leads at 75’, and decided games in the minutes that broke other players. Pressure never made me calm. Preparation did.',
      behaviourToStudy: [
        'Take ranked seriously — it is the exam, not a warm-up.',
        'Close out the lead at 75’ with discipline, not panic.',
        'Decide the game in the late minutes, deliberately.',
      ],
      benchmark: 'When the pressure arrives, the Standard is already prepared — so it looks calm.',
      voice: 'I do not get more nervous in the big moments. I get more prepared.',
    },
    {
      n: 6,
      stageKey: 'PROVE IT',
      chapterTitle: 'PROVE IT',
      whatTheyLearn:
        'I reviewed the whole record — the matches, the lessons held and broken, the clean sheets — and set the next standard. Then I raised the bar again. I never graduated; I re-enrolled. That is how you stay at the top for a long time.',
      behaviourToStudy: [
        'Look at the whole record, not the last match.',
        'Count the lessons that held against the ones that broke.',
        'Define the next standard with the evidence in hand.',
      ],
      benchmark: 'They never graduate. They set the next standard and walk toward it.',
      voice: 'The top is not a destination. It is the way the work is done, every single day.',
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

/** live view — His Road moves with the player's own progress */
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
