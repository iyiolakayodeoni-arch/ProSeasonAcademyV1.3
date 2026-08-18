import { Coach } from './coaches';
import { journeySeasonFor } from './journey';
import { SideQuest } from './journey';
import { sideLessonFromPlan, SideLesson } from './sideLesson';

// ─────────────────────────────────────────────────────────────
// ROLE MODEL FEED — an ongoing, serialized story stream.
//
// This is NOT reporting on a real person. Chinedu Okafor is the
// academy's own fictional character (and the Standard you climb
// toward). This feed is a living, in-app narrative running beside
// your own FC 26 console journey — his matches, his life beats,
// the tricks he is known for, and teasers for the side quests you
// have not unlocked yet. The personal story here is ORIGINAL and
// INVENTED. The mechanics he shows are real and verified (they
// come from the same researched FC 26 side-quest library used
// elsewhere in the app), but the narrative wrapped around them is
// never real biography.
//
// The feed is serialized: entries appear over time (newest first),
// paced like a real athlete's content stream — weekly match beats,
// slow life-journey milestones, and trick showcases that unlock
// the side quests. A small persistent "ROLE MODEL STORY" label
// everywhere keeps it clearly distinct from the sourced, real FC 26
// intel elsewhere in the app.
// ─────────────────────────────────────────────────────────────

export type RoleFeedType =
  | 'match' // match / result beat — score-line specific, coach-voiced
  | 'life' // life-journey beat — his story arc, paced slowly
  | 'trick' // mechanic showcase — a real, verified side-quest mechanic
  | 'sneak'; // side-quest sneak peek — a teaser for something coming up

export type RoleAccent = 'gold' | 'green' | 'amber';

export interface RoleFeedEntry {
  id: string;
  type: RoleFeedType;
  /** how many days ago this entry "posted" (0 = the freshest) */
  daysAgo: number;
  /** short contextual tag, e.g. 'RIVALS · RANK 1' or 'CINDER ROW' */
  tag: string;
  /** the entry headline */
  headline: string;
  /** coach-voiced serialized narrative body */
  body: string;
  /** an optional one-line quote / spoken beat */
  quote?: string;
  /** a match stat line, e.g. a score line or clean-sheet note */
  statLine?: string;
  accent: RoleAccent;
  /** for TRICK entries — the verified side quest this unlock debriefs */
  sideQuestId?: string;
  /** mechanic name shown on trick cards, e.g. 'THE SHIELD TRAP' */
  mechanicName?: string;
  /** the story chapter this life-beat belongs to */
  chapter?: string;
}

/** relative time label, newest-first (like the rest of the app's feeds) */
export function roleTimeLabel(daysAgo: number): string {
  if (daysAgo <= 0) return 'TODAY';
  if (daysAgo === 1) return '1D AGO';
  return `${daysAgo}D AGO`;
}

// ─────────────────────────────────────────────────────────────
// THE FEED — newest first. Chinedu is at the top of the FC 26
// console ladder right now, defending his #1. His current "season"
// runs in the same timeframe as the player's own Rivals/Champs
// climb, so his stream feels like it is progressing alongside the
// user's. The pressure storyline (the weight of staying on top)
// is the arc currently building — it is set up here, paced slowly
// across life beats, and telegraphed (not resolved) via the older
// honesty beats, so a crisis → comeback can grow out of it later
// without contradicting any of today's results.
// ─────────────────────────────────────────────────────────────
export const ROLE_MODEL_FEED: RoleFeedEntry[] = [
  // ── THE FRESHEST — today ──────────────────────────────────
  {
    id: 'rm-20',
    type: 'trick',
    daysAgo: 0,
    tag: 'TRICK SHOWCASE · THE LOOP',
    headline: 'The Tackle Personality play — patience is a button, and I held it.',
    body:
      'Everyone in my DMs swears I press B faster than them. Wrong. I press it a full second later, and that second is the whole trick. FC 26 punished the panic lunge — miss, and the recovery lag hands your man three free yards. So I jockey, L2/LT, track the touch, and only when they take a heavy one do I strike. A clean tackle with the elite animation beats ten desperate ones every single time. The ladder does not reward the fastest thumb. It rewards the one that waits.',
    quote: 'One clean tackle is worth ten desperate lunges. The discipline is the talent.',
    accent: 'green',
    sideQuestId: 'sq-4',
    mechanicName: 'TACKLE PERSONALITY',
    statLine: 'JOCKEY L2/LT → STRIKE ON THE HEAVY TOUCH',
  },
  {
    id: 'rm-19',
    type: 'sneak',
    daysAgo: 0,
    tag: 'COMING UP · YOUR JOURNEY',
    headline: 'Next in your bag: the Box Crash Run.',
    body:
      'I keep my strikers quiet and let my midfield do the scoring. When they park the bus and swallow your striker whole, the answer is not more speed at the top — it is a ghost arriving from deep. The Box Crasher CDM trails in unmarked while every defender chases the bait in front. I am breaking this one down for you soon. It is coming up on your path, and it is going to feel like cheating the first time you pull it off.',
    accent: 'amber',
    sideQuestId: 'sq-3',
    mechanicName: 'THE BOX CRASH RUN',
    statLine: 'COMING UP · STAGE 3',
  },

  // ── yesterday ─────────────────────────────────────────────
  {
    id: 'rm-18',
    type: 'match',
    daysAgo: 1,
    tag: 'RIVALS · RANK 1 DEFENCE',
    headline: '3–1. The decider at 82’ when the chaser thought I was done.',
    body:
      'Two-nil up and I felt the game getting away from me. Classic. You relax, the opponent nicks one, the crowd noise gets louder in your own head. The young one chasing me turned it into a 2–1 and started sprinting at my back line like it was over. I did not speed up. I slowed down, got the ball, kept it moving through the thirds, and at 82’ I carved them open for the third. The lead is not yours until the whistle. Remember that on your own ranked nights.',
    statLine: '3–1 · DECIDER AT 82’',
    accent: 'gold',
    quote: 'The lead is not yours until the whistle. I remind myself of that every single week.',
  },

  // ── two days ago ──────────────────────────────────────────
  {
    id: 'rm-17',
    type: 'life',
    daysAgo: 2,
    tag: 'THE STANDARD · PRESSURE',
    headline: 'The #1 is the heaviest thing I have ever carried.',
    body:
      'Nobody tells you the crown is the weight, little bro. On Cinder Row I chased everything with nothing on my shoulders. Up here, there is a new kid born every night who thinks he can take what I built, and some nights I look in the mirror and the discipline is the only thing holding the whole thing up. People ask me if it gets easier at the top. It does not. It gets quieter. That quiet is where I win — and it is where you are training right now, whether you know it yet or not.',
    chapter: 'THE STANDARD · CHAPTER 2 — THE WEIGHT',
    accent: 'gold',
    quote: 'It does not get easier at the top. It gets quieter — and that quiet is where I win.',
  },

  // ── three days ago ────────────────────────────────────────
  {
    id: 'rm-16',
    type: 'match',
    daysAgo: 3,
    tag: 'CUT-AND-PRESS DEFENDING',
    headline: 'A 0–0 that became a 1–0. This is how I grind.',
    body:
      'For sixty minutes it was a wall. Cut the lane, press in a line, never stop at one blocked pass — the opponent kept recycling and finding nothing, because I was not chasing the ball, I was closing the options one by one. When their shape finally cracked, I took the one clean opening and made it count. Defending is not sexy and the highlights never show it. It is how you win the boring games that decide seasons. Learn to love the boring games.',
    statLine: '1–0 · CLEAN SHEET',
    accent: 'gold',
    quote: 'Defending is not sexy. It is how you win the boring games that decide seasons.',
  },
  {
    id: 'rm-15',
    type: 'trick',
    daysAgo: 3,
    tag: 'TRICK SHOWCASE · THE LOOP',
    headline: 'The Shield Trap — stand your ground and let them break on you.',
    body:
      'You receive the ball with a defender breathing down your neck and your instinct is to run. Stop it. In FC 26, hold L2/LT as the ball arrives and you trigger Shield Trapping — your body becomes the wall and the strength model does the rest. They come in hard, they bounce off your back, and suddenly you have a free second to turn, dribble, or find the outlet. It is the same lesson as the tackle: the person who is calm wins the physical fight.',
    quote: 'Let them bring the force. You provide the wall.',
    accent: 'green',
    sideQuestId: 'sq-1',
    mechanicName: 'THE SHIELD TRAP',
    statLine: 'HOLD L2/LT ON RECEIPT',
  },

  // ── four days ago ─────────────────────────────────────────
  {
    id: 'rm-14',
    type: 'sneak',
    daysAgo: 4,
    tag: 'COMING UP · YOUR JOURNEY',
    headline: 'The Inverted Overload is the next thing I want you stealing.',
    body:
      'Your fullback is a wasted weapon if he only hugs the line. Invert him, let him drift central in possession, and you suddenly have a three-man midfield against a two-man block. It opens channels the defensive AI simply does not expect. I have been living in those channels all week. When this one unlocks on your path, do not just read it — take it into a match the same night.',
    accent: 'amber',
    sideQuestId: 'sq-2',
    mechanicName: 'THE INVERTED OVERLOAD',
    statLine: 'COMING UP · STAGE 2',
  },

  // ── five days ago ─────────────────────────────────────────
  {
    id: 'rm-13',
    type: 'life',
    daysAgo: 5,
    tag: 'CINDER ROW · CHAPTER 1',
    headline: 'Where it started: Mama Ukae’s shop light and thirty metres of broken concrete.',
    body:
      'People see the card and think it fell out of the sky. It did not. It was made on Cinder Row, where I sprinted thirty metres of broken concrete every evening because there was no pitch and no coach and no one to say well done at the end of it. Mama Ukae never blew a whistle — she just watched from her shopfront step, and her looking was the only audience I ever needed. Every badge you see up there was earned on that stretch of road. Nobody hands you the top. You walk to it.',
    chapter: 'CINDER ROW · CHAPTER 1 — THE MADE, NOT BORN',
    accent: 'gold',
    quote: 'The scan knows. It always knows. I learned that on Cinder Row.',
  },

  // ── six days ago ──────────────────────────────────────────
  {
    id: 'rm-12',
    type: 'match',
    daysAgo: 6,
    tag: 'THE COMEBACK',
    headline: '4–2, a week after the loss. This is the answer to a bad day.',
    body:
      'Last week I logged a loss and it sat in me like a stone. So this week I did the only thing that has ever worked: I went back to the tape, wrote down where I lied to myself, and fixed it. Four-two. Two of them built from the exact channels I had left open the week before. This is the whole point of the pen-to-paper ritual, little bro. The loss was not the end of the story. It was the first line of the comeback. Your last loss is the same thing, if you write about it.',
    statLine: '4–2 · THE RESPONSE',
    accent: 'gold',
    quote: 'A loss is not the end of the story. It is the first line of the comeback.',
  },
  {
    id: 'rm-11',
    type: 'trick',
    daysAgo: 6,
    tag: 'TRICK SHOWCASE · THE LOOP',
    headline: 'The Inverted Overload — my fullback is my best playmaker.',
    body:
      'Invert your wingback and watch the midfield suddenly look three-versus-two. As your RB drifts central with the ball under R1 close control, the opponent’s winger has to decide between following him or leaving the flank naked — either way you win. Once the defender commits inward, the diagonal is already open behind him. This is the highest-value thing I have added to my game this season, and I want it in yours too.',
    quote: 'Overload the centre to release the flanks. The space is where they are not.',
    accent: 'green',
    sideQuestId: 'sq-2',
    mechanicName: 'THE INVERTED OVERLOAD',
    statLine: 'INVERT THE WINGBACK → R1 → DIAGONAL',
  },

  // ── a week+ ago ───────────────────────────────────────────
  {
    id: 'rm-10',
    type: 'match',
    daysAgo: 8,
    tag: 'THE HONEST LOSS',
    headline: '0–1. I logged it, because that is the discipline.',
    body:
      'I lost. Not a close one, not an unlucky one — I got outworked, and the score said 0–1 the way it should have. It is easy to pretend otherwise, to blame the servers or the patch. The discipline is not winning every week; nobody does that. The discipline is the night you lose and you still sit down, watch the tape, and write the truth about why. I did. And that is why next week went the way it did. This is the part of my game nobody posts about, and it is the part that keeps me here.',
    statLine: '0–1 · THE LOSS LOGGED',
    accent: 'gold',
    quote: 'The discipline is not winning every week. It is losing and still writing the truth.',
  },

  // ── nine days ago ─────────────────────────────────────────
  {
    id: 'rm-9',
    type: 'life',
    daysAgo: 9,
    tag: 'THE ROUTINE · THE TALENT',
    headline: 'The routine is the talent. I say it until it is boring, because it is true.',
    body:
      'Same time. Same three matches. Same cooldown. Same pen on the same kind of paper. People think talent is the flashy first touch; it is actually the boring, repeatable night that makes the flashy touch look effortless. On the nights I do not feel like it — and there are more of those than you would believe — I do it anyway, because the routine is the talent. Build the routine small and keep it sacred. That is the whole secret, and it is not a secret at all.',
    chapter: 'THE ROUTINE · CHAPTER 1 — SACRED',
    accent: 'gold',
    quote: 'The hard way is the easy way. I have believed that since Cinder Row.',
  },
  {
    id: 'rm-8',
    type: 'trick',
    daysAgo: 9,
    tag: 'TRICK SHOWCASE · THE LOOP',
    headline: 'The Box Crash Run — how I score against the teams that refuse to come out.',
    body:
      'The parked bus is a wall until it is not. Keep the ball with your striker, let the defenders man-mark him tight inside the box, and your Box Crasher CDM ghosts in from deep completely unmarked. The defensive AI is busy wrestling the decoy, so the second wave arrives free. Hit the lofted through ball and finish it one touch. I have ended more parked buses this season this way than any other way — it is a get-out-of-parking-free card when you use it right.',
    quote: 'Bait the front line, trigger the back. The unmarked runner is the killer.',
    accent: 'green',
    sideQuestId: 'sq-3',
    mechanicName: 'THE BOX CRASH RUN',
    statLine: 'HOLD → WAIT → LOFTED THROUGH BALL',
  },

  // ── earlier in the arc ────────────────────────────────────
  {
    id: 'rm-7',
    type: 'match',
    daysAgo: 12,
    tag: 'CHAMPS · THE FINALS',
    headline: 'The Champions run: five straight, zero goals conceded.',
    body:
      'The best weekend of the season so far. Five matches, five wins, and the only number I am proud of is the zero in the conceded column. Not because clean sheets are flashy — because they mean I did the boring work: cut the lane, press in a line, never stop at one blocked pass. The attacking game takes care of itself when the back line does not panic. Defend first, and the results come looking for you.',
    statLine: '5–0–0 · 0 CONCEDED',
    accent: 'gold',
    quote: 'The attacking game takes care of itself when the back line does not panic.',
  },
  {
    id: 'rm-6',
    type: 'life',
    daysAgo: 13,
    tag: 'THE STANDARD · CHAPTER 1',
    headline: 'What being the benchmark means — and why I never wanted a seat at the table.',
    body:
      'I did not start this to be a role model, little bro. I started it because I could not stand losing to myself. Somewhere along the climb the discipline became the standard other players measure against, and now the card up top sits there as a proof: a road like mine ends somewhere worth putting on a wall. I never wanted to be a seat at a table. I wanted to be a proof that the work lands. That is what I am for you — not a path to copy. A proof that your own road can end somewhere real.',
    chapter: 'THE STANDARD · CHAPTER 1 — THE PROOF',
    accent: 'gold',
    quote: 'I am not a path to copy. I am a proof that your own road can end somewhere real.',
  },
  {
    id: 'rm-5',
    type: 'trick',
    daysAgo: 14,
    tag: 'TRICK SHOWCASE · THE LOOP',
    headline: 'Why I stopped tackle-spamming — and the 85+ detail that changed my defence.',
    body:
      'I used to press the tackle button like it owed me money. FC 26 cured me of that: a missed lunge now costs you a real recovery delay, and the game rewards patience with Tackle Personality — defenders with an elite Stand Tackle unlock premium stop-them-dead animations. So I pick the right centre-back, jockey, and only commit when the gap is certain. Since I stopped spamming, my clean-sheet rate has doubled. Patience is literally a stat in this game.',
    quote: 'Wait for the heavy touch. The discipline is the talent.',
    accent: 'green',
    sideQuestId: 'sq-4',
    mechanicName: 'TACKLE PERSONALITY',
    statLine: '85+ STAND TACKLE · JOCKEY → STRIKE',
  },
  {
    id: 'rm-4',
    type: 'sneak',
    daysAgo: 16,
    tag: 'COMING UP · YOUR JOURNEY',
    headline: 'Coming up on your path: the Shield Trap.',
    body:
      'The first thing I will hand you is the thing I lean on every single game — protecting the ball on receipt. So many of you receive with a defender already on you and immediately try to run, and that is how you lose it. There is a better move and it is coming up early on your journey. Get your receipt right and half your turnovers disappear overnight.',
    accent: 'amber',
    sideQuestId: 'sq-1',
    mechanicName: 'THE SHIELD TRAP',
    statLine: 'COMING UP · STAGE 1',
  },

  // ── the open — where his feed "starts" this season ─────────
  {
    id: 'rm-3',
    type: 'match',
    daysAgo: 19,
    tag: 'SEASON OPEN',
    headline: 'Opening night: a statement 3–0 and a first clean sheet of the season.',
    body:
      'New season, same standard. The opening fixture is a statement before it is a result — you set the tone for your whole campaign in that first ninety. Three-nil, controlled, no panic at the back, and a clean sheet to say I am still here. Every season the ladder resets and a thousand players think this is their year. Let them think it. The work is the same as it was on Cinder Row, and the work never resets.',
    statLine: '3–0 · CLEAN SHEET · SEASON OPENER',
    accent: 'gold',
    quote: 'The work is the same as it was on Cinder Row — and the work never resets.',
  },
  {
    id: 'rm-2',
    type: 'life',
    daysAgo: 20,
    tag: 'CINDER ROW · CHAPTER 2',
    headline: 'The night everything changed — the first time someone told me I could not.',
    body:
      'I remember the exact night, little bro. A man who should have been my role model looked at a sixteen-year-old me sprinting that broken road and said the reason I would never make it was that I came from a place like this. He said it kindly, which made it worse. I went home, wrote three pages about it on paper, and decided that was the last time anyone got to decide my ceiling for me. That is where the pen-to-paper ritual was born — not in a boardroom. In my own stubbornness.',
    chapter: 'CINDER ROW · CHAPTER 2 — THE SLIGHT',
    accent: 'gold',
    quote: 'That was the last time anyone got to decide my ceiling for me.',
  },
  {
    id: 'rm-1',
    type: 'life',
    daysAgo: 22,
    tag: 'CINDER ROW · CHAPTER 1',
    headline: 'The beginning of the feed: who this man is and why he coaches.',
    body:
      'Since this feed is about to run alongside your own season, you should know who is talking. I am Chinedu — the academy’s coach and the Standard you are climbing toward. I never was the most talented player on Cinder Row; I was the first one who stopped lying to himself after full time. That is the whole job here. I am not here to make you me. I am here to stand at the top of the ladder with a face and a story so you know the work lands. Welcome to the stream, little bro. Your season starts today.',
    chapter: 'CINDER ROW · CHAPTER 1 — THE MADE, NOT BORN',
    accent: 'gold',
    quote: 'Welcome to the stream. Your season starts today.',
  },
];

// ─────────────────────────────────────────────────────────────
// HELPERS — map a feed entry's side quest to a real in-app lesson.
//
// TRICK entries unlock the ACTUAL side-quest debrief (the same
// verified FC 26 mechanics content used by the Journey), so the
// feed's mechanics never contradict the researched library.
// ─────────────────────────────────────────────────────────────

const _sideQuestIndex: Record<string, SideQuest> = (() => {
  const idx: Record<string, SideQuest> = {};
  for (const stage of journeySeasonFor('chinedu').stages) {
    for (const sq of stage.sideQuests ?? []) {
      idx[sq.id] = sq;
    }
  }
  return idx;
})();

/** the feed, newest first */
export function roleModelFeed(_coach: Coach): RoleFeedEntry[] {
  return [...ROLE_MODEL_FEED].sort((a, b) => a.daysAgo - b.daysAgo);
}

/** the latest entry (used for the Home cross-post highlight) */
export function roleModelLatest(_coach: Coach): RoleFeedEntry | undefined {
  return roleModelFeed(_coach)[0];
}

/** turn a feed TRICK entry into the real side-quest lesson it debriefs */
export function roleLessonFor(entry: RoleFeedEntry): SideLesson | undefined {
  const sq = entry.sideQuestId ? _sideQuestIndex[entry.sideQuestId] : undefined;
  if (!sq) return undefined;
  return sideLessonFromPlan({
    contentId: `rm-${sq.id}`,
    kind: 'SKILL_MOVE',
    patchVersion: sq.internalPatchVersion,
    discoveredAt: 'ACADEMY VERIFIED · FC 26 SIDE QUEST',
    sourceName: sq.internalSource,
    sourceUrl: '',
    mechanicName: sq.name.toUpperCase(),
    headline: sq.name,
    why: sq.why,
    tiles: sq.tiles,
    rule: sq.rule,
    clip: sq.clip,
  });
}

/** human-facing type label for the entry badge */
export const ROLE_TYPE_LABEL: Record<RoleFeedType, string> = {
  match: 'MATCH · RESULT',
  life: 'LIFE · JOURNEY',
  trick: 'TRICK · SHOWCASE',
  sneak: 'SNEAK PEEK · COMING UP',
};
