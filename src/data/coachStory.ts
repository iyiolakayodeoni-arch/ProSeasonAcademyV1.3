// ─────────────────────────────────────────────────────────────
// HIS STORY — the turning points. The canon.
//
// Six moments from Chinedu Okafor's road to the top, one per
// stage of the journey. The same story appears in two places:
//   · the HOME feed — entertainment, the man behind the voice;
//   · the JOURNEY map — HIS STORY sits beside YOUR JOURNEY, so
//     as you move through a stage you see the turning point he
//     faced at the same point of his own road.
//
// Every episode ends with a CUE that hands the story back to the
// player: his story is the benchmark, the player's own evidence
// is the mirror. The app never writes the player's lesson.
// ─────────────────────────────────────────────────────────────

export interface StoryEpisode {
  /** 1..6 — matches the universal journey stages */
  ep: number;
  stageKey: string;   // e.g. 'SEE YOURSELF'
  title: string;      // the turning point's name
  story: string;      // his own words, first person
  cue: string;        // the hand-back: YOUR MOVE …
}

export const STORY_EPISODES: StoryEpisode[] = [
  {
    ep: 1,
    stageKey: 'SEE YOURSELF',
    title: 'THE THREE PAGES',
    story:
      'Cinder Row, 6–1 down to a team that laughed at us. I sat on the bus home and wrote three pages about it. Page four was tears. Pages one to three got me a clean sheet the next week. We write it down, or it writes YOU down.',
    cue: 'LOG THE MATCH. NAME THE MOMENT. WRITE THE LINE. THE MIRROR KEEPS IT.',
  },
  {
    ep: 2,
    stageKey: 'CONTROL YOURSELF',
    title: 'THE 2–0 THAT BECAME 2–2',
    story:
      'I led 2–0 and “managed the game” so brilliantly we drew 2–2. My legs remembered the plan. My brain went on holiday. The first goal is never the problem — the second one is: the one you concede to your own head.',
    cue: 'RATE YOUR HEAD STATE. FIND THE MINUTE THE DISCIPLINE BLINKED. NOT THE SCORE — THE SEQUENCE.',
  },
  {
    ep: 3,
    stageKey: 'READ THE GAME',
    title: 'THE MAN TYING HIS BOOT',
    story:
      'A cup final, 1–0, lost to a deflection off a man tying his boot. True story. The lesson was never the bounce — it was the ninety minutes before it. I stopped watching the ball and started reading the picture.',
    cue: 'NAME THE DANGER BEFORE IT ARRIVES. WHAT REPEATED? PLAY THE PICTURE, NOT THE BALL.',
  },
  {
    ep: 4,
    stageKey: 'BUILD DISCIPLINE',
    title: 'THE BUS REVIEW',
    story:
      'Won 5–0 and my coach made me write the review on the bus home. “You enjoyed that too much,” he said. He was right. Motivation is a mood. The routine is the talent — boring wins.',
    cue: 'DO THE WORK ON THE NIGHT YOU DO NOT FEEL LIKE IT. SAME PREP. SAME STANDARDS. SAME HONEST LEDGER.',
  },
  {
    ep: 5,
    stageKey: 'PERFORM UNDER PRESSURE',
    title: 'THE CLEAN SHEET',
    story:
      'The week after the 6–1 I kept a clean sheet. Not because the game was kind — because pages one to three were done. Under pressure you do not rise to the occasion. You sink to your highest level of preparation.',
    cue: 'TEST THE WORK IN RANKED. CLOSE THE LEAD AT 75. DECIDE THE GAME IN THE MINUTES THAT BREAK OTHERS.',
  },
  {
    ep: 6,
    stageKey: 'PROVE IT',
    title: 'STILL COACHABLE',
    story:
      'Ten seasons at the top, and the secret is boring: I stayed coachable. The day I think I know everything is the day the ladder starts eating me. I never graduated. I re-enrolled. The top is not a destination — it is how the work is done, every single day.',
    cue: 'LOOK AT THE WHOLE RECORD. COUNT WHAT HELD AND WHAT BROKE. SET THE NEXT STANDARD. THE ROAD NEVER ENDS.',
  },
];

/** the turning point matching a player's current stage (clamped 1..6) */
export function storyForStage(stageN: number): StoryEpisode {
  const n = Math.max(1, Math.min(STORY_EPISODES.length, stageN));
  return STORY_EPISODES.find((e) => e.ep === n) ?? STORY_EPISODES[0];
}
