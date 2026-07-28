// ─────────────────────────────────────────────────────────────
// BASELINE SCAN — the 5-match interview that builds the player
// profile card. Semi-automatic BY DESIGN, same principle as the
// Match Vault: THE EYE gets the numbers (score), THE MIND gets
// the truth (composure + a soul-searching answer). We refuse AI
// for the second half on purpose — the manifesto below is the
// product philosophy, said out loud by the coach.
//
// Everything persists to AsyncStorage so a closed app resumes
// mid-baseline. Completed entries ALSO land in the real Match
// Vault (they're real matches — the scan grades them later).
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMatch } from './matches';

const KEY = 'psa.baseline.v1';

export type MatchResult = 'W' | 'D' | 'L';

export interface BaselineEntry {
  gf: number;
  ga: number;
  result: MatchResult;
  composure: number; // 1..5
  question: string; // the deep question that was asked
  answer: string;   // the soul-searching answer (their words, not ours)
  at: number;
}

export interface BaselineCard {
  handle: string;
  coachId: string;
  played: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  avgComposure: number; // 1..5
  tier: string;         // sealed title — computed from THE MIND, not the score
  coachRead: string;    // his verdict line, in his voice
  ambition: string;     // their words — he will bring this up later
  sealedAt: number;
}

export interface BaselineSession {
  coachId: string;
  entries: BaselineEntry[];
  ambition: string | null;
  card: BaselineCard | null;
  startedAt: number;
}

// ── store ────────────────────────────────────────────────────
let session: BaselineSession | null = null;
let hydrated = false;

export async function loadBaseline(coachId: string): Promise<BaselineSession> {
  if (!hydrated) {
    hydrated = true;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) session = JSON.parse(raw);
    } catch {
      /* corrupt → fresh session */
    }
  }
  if (!session || session.coachId !== coachId) {
    session = { coachId, entries: [], ambition: null, card: null, startedAt: Date.now() };
    void persist();
  }
  return session;
}

export function getBaseline(): BaselineSession | null {
  return session;
}

async function persist() {
  await AsyncStorage.setItem(KEY, JSON.stringify(session)).catch(() => {});
}

/** record one debriefed match; also lands in the real vault */
export function recordBaselineMatch(entry: Omit<BaselineEntry, 'at'>): void {
  if (!session) return;
  session = { ...session, entries: [...session.entries, { ...entry, at: Date.now() }] };
  addMatch(
    {
      gf: entry.gf,
      ga: entry.ga,
      mode: 'RANKED',
      oppStyle: 'HARD TO TELL',
      passAcc: null,
      noSprint: false,
      mechanicsUsed: 0,
      ledAt75: null,
      decisive: null,
      composure: entry.composure,
      note: `BASELINE M${session.entries.length} — ${entry.answer}`.slice(0, 140),
    },
    'manual',
  );
  void persist();
}

export async function sealBaseline(handle: string, coachId: string, ambition: string): Promise<BaselineCard> {
  const e = session?.entries ?? [];
  const w = e.filter((m) => m.result === 'W').length;
  const d = e.filter((m) => m.result === 'D').length;
  const l = e.filter((m) => m.result === 'L').length;
  const avg = e.length ? e.reduce((s, m) => s + m.composure, 0) / e.length : 0;
  const card: BaselineCard = {
    handle,
    coachId,
    played: e.length,
    w, d, l,
    gf: e.reduce((s, m) => s + m.gf, 0),
    ga: e.reduce((s, m) => s + m.ga, 0),
    avgComposure: Math.round(avg * 10) / 10,
    tier: tierFor(avg),
    coachRead: coachReadFor(coachId, avg, w, l),
    ambition,
    sealedAt: Date.now(),
  };
  session = { ...(session as BaselineSession), ambition, card };
  await persist();
  return card;
}

export function tierFor(avgComposure: number): string {
  if (avgComposure >= 4.4) return 'ICE VEINS';
  if (avgComposure >= 3.6) return 'STEADY HANDS';
  if (avgComposure >= 2.8) return 'WORKING HEAD';
  if (avgComposure >= 2) return 'HOT HEAD — REPAIRABLE';
  return 'VOLCANO — FOR NOW';
}

function coachReadFor(coachId: string, avg: number, w: number, l: number): string {
  if (coachId === 'chinedu') {
    if (avg >= 3.6) return `Acceptable base. ${w} win${w === 1 ? '' : 's'}, head mostly intact. The scan will find the cracks — that's what it's for.`;
    return `I read the debriefs, not just the scores. Your head goes before your game does. We fix the head first — the rest is mechanics.`;
  }
  if (avg >= 3.6) return `A good foundation, little one. ${w} win${w === 1 ? '' : 's'} and a calm head. Now we sharpen what the calm is protecting.`;
  return `I saw the debriefs, little one. The scores don't worry me — the storms do. Good news: storms can be trained. That's my whole job.`;
}

export async function resetBaselineForDev(): Promise<void> {
  session = null;
  hydrated = false;
  await AsyncStorage.removeItem(KEY).catch(() => {});
}

// ═════════════════════════════════════════════════════════════
// CONTENT — the fiction. Coach voices per coaches.ts canon:
// Chinedu = blunt, hates losing. Obinna = calm, "little one".
// ═════════════════════════════════════════════════════════════

export interface CoachScript {
  /** his introduction — shown right after the path lock */
  intro: string[];
  introSignoff: string;
  /** the serious talk before M1: how the baseline works + why it matters */
  talk: string[];
  /** the in-character bluff about honesty (flavor, not an app claim) */
  bluff: string;
  /** deep questions by result — rotated across the 5 matches */
  questions: Record<MatchResult, string[]>;
  /** funny story beats, keyed by scoreline shape (see beatKey) */
  beats: Record<BeatKey, string>;
  /** the ambition ask — final question before the card seals */
  ambitionAsk: string;
}

export type BeatKey = 'winBig' | 'winTight' | 'drawGoals' | 'drawNill' | 'lossBig' | 'lossTight';

export function beatKey(gf: number, ga: number): BeatKey {
  if (gf === ga) return gf === 0 ? 'drawNill' : 'drawGoals';
  if (gf > ga) return gf - ga >= 3 ? 'winBig' : 'winTight';
  return ga - gf >= 3 ? 'lossBig' : 'lossTight';
}

export const BASELINE_SCRIPTS: Record<string, CoachScript> = {
  chinedu: {
    intro: [
      'Sit down. My name is Chinedu. They call me THE DISCIPLINARIAN and I earned every letter of it.',
      'I was never the best player on any pitch. Too slow, too small, take your pick. So I became the most honest one instead — and honest players are the ones still standing in April.',
      'I have watched a hundred careers die from one disease: lying to yourself after a match. “The game is rigged.” “My phone lagged.” Maybe. Usually it was your head, and we both know it.',
      'You picked my path. Good. I do not do comfort — I do receipts. And for the record: I am glad you are here. Now let us find out the truth about you.',
    ],
    introSignoff: 'Enough about me. Now you.',
    talk: [
      'Before one tactic. Before one mechanic. Five matches. Yours.',
      'Play them normally. After EACH one, come straight back here. I will take the numbers — the easy part. A machine could take the numbers. What I cannot take is the truth, and that is the part that actually changes a player.',
      'Hear me: we do not use AI to read your head. AI can summarise a match — it cannot build your mentality in a live game. Only you can build that, and you build it by thinking for yourself. That is why my questions will dig. That is not a bug in the scan. That IS the scan.',
      'This gate is real, by the way. The academy does not carry passengers. A player who cannot sit with their own performance for five debriefs will not survive a season — better we know now than in week nine. That is us being serious about what we do.',
    ],
    bluff:
      'One warning. Answer honestly. I have listened to two thousand debriefs — I know what a lie sounds like before you finish the sentence. Try me once and you will not try me twice.',
    questions: {
      W: [
        'Which goal actually mattered — patience, or luck? Pick one and defend it.',
        'What did you do at 1–0 that you normally never do? Be exact.',
        'After you took the lead, did you keep YOUR plan or play THEIR panic? What changed in your head?',
        'A win hides cracks better than a loss exposes them. Name one crack this win is hiding.',
        'If your next opponent watches this match back, what will they punish? Answer for them.',
      ],
      D: [
        'A draw is a mirror. What did they take from you that you quietly allowed?',
        'Point to the minute the game started slipping. What did you do with that feeling?',
        'If this draw were a cup final, where did you lose the trophy?',
        'Which decision would you take back — and why did it feel right at the time?',
        'Did you chase the winner like a pro or like a gambler? What tells you the difference?',
      ],
      L: [
        'The first goal you conceded: before it went in — what were YOU doing? Start there.',
        'After they scored, what changed in your decisions? Not theirs. Yours.',
        'If I watched only your last fifteen minutes, what would I say about your mentality?',
        'Excuse or reason? Take your strongest excuse and argue against it. Now.',
        'What did this loss cost you — points, pride, or patience? Rank them and tell me why.',
      ],
    },
    beats: {
      winBig:
        'A big win? Hah. I once won 5–0 and my coach made me write my review on the BUS home. “You enjoyed that too much,” he said. He was right. Enjoy it — then we look at what THEY did wrong.',
      winTight:
        'One-goal wins build careers. The first trophy I ever held was 1–0 — an own goal. Nobody needs to know I celebrated like I had scored a bicycle kick. Take the win; we audit the nerves.',
      drawGoals:
        'A draw with goals takes me back. I once led 2–0 and “managed the game” so brilliantly we drew 2–2. My legs remembered the plan. My brain went on holiday.',
      drawNill:
        'Zero-zero. The scoreline nobody frames. In my old league we called that “two coaches pretending it was tactical.” One of you blinked in your head — was it you?',
      lossBig:
        'A heavy one. Fine. I once lost 6–1 and wrote three pages about it. Page four was tears, but pages one to three got me a clean sheet the next week. We write it down or it writes YOU down.',
      lossTight:
        'A one-goal loss is a small lie scoreboards tell. I lost a final 1–0 to a deflection off a man tying his boot. True story. The lesson is never the bounce — it is the ninety minutes before it.',
    },
    ambitionAsk:
      'Last question of the baseline, and I want the real one, not the polite one. Where are you going with this? Not “up a division.” Where. I will hold you to it.',
  },

  obinna: {
    intro: [
      'Come in, come in, little one. I am Obinna — THE MOTIVATOR, though between us, I mostly hate watching good players quit on themselves.',
      'I played academy football until my knee ended it at nineteen. For two years I was angry at the world. Then a coach sat me down and asked questions I did not want to answer. That conversation is why I am standing here.',
      'Somebody has to ask you the real questions too — gently, but actually ask them. That is me. For the record: you choosing this path genuinely made my day.',
      'So before tactics, before mechanics — we find out who you are when the goals are going in against you. That player, the one under pressure, is the one I coach.',
    ],
    introSignoff: 'My story is told. Yours starts now, little one.',
    talk: [
      'Here is how we begin: five matches. Just five. Play them exactly as you always do — no performing for me.',
      'After each one, come back here. The score is the easy part; a machine can watch a scoreboard. The important part is what was happening between your ears — and I ask, you answer, because that is how a mind gets strong.',
      'Why not let AI do all this? Because AI can summarise your match, but it cannot grow your mentality, and it will never sit with you after a bad loss and mean it. You grow by thinking for yourself. Free thinkers win real games. So we do this properly — the old way, on purpose.',
      'And hear me well, little one: this gate is real. The academy is serious about what we do — a player who cannot face five honest debriefs is not ready for a season. That is not harshness. That is respect for your time AND mine.',
    ],
    bluff:
      'And little one — be honest with me. I have heard every excuse ever built; I can hear the difference between a player telling the truth and a player performing it. Honest answers make you better and make me better for you. Win-win.',
    questions: {
      W: [
        'Little one, tell me the honest version: which part of that win was YOURS, and which part was the game being kind?',
        'When you went ahead, what did your body do — relax or tighten? Why do you think that is?',
        'What did you do well today that nobody watching would ever notice?',
        'If this win has a lesson you might ignore, what is it?',
        'Who were you in the last ten minutes — the closer or the survivor? What does that tell us?',
      ],
      D: [
        'A draw, little one. Where did you feel the balance tip — and what did you do with that feeling?',
        'What did you give them for free today? Not what they earned — what you gave.',
        'If this draw were a final, where did you leave the trophy?',
        'Was there a moment you played not to lose instead of playing to win? Tell me about it honestly.',
        'What would your teammate say you should have done differently? Answer for them.',
      ],
      L: [
        'Little one, walk me to the first goal — before it went in, where was your attention? Start there.',
        'After they scored, what did the voice in your head say? The real one. I have heard them all.',
        'If I watched only your last fifteen minutes, what would I believe about your heart? Tell me true.',
        'What is the kindest excuse you are telling yourself right now? Now tell me the truth under it.',
        'Losses are tuition, they say. What exactly did this one teach you — in one sentence you would sign?',
      ],
    },
    beats: {
      winBig:
        'A big win, little one! My first ever “big win” was 4–0… in a friendly… against a team that arrived with nine men. I still count it. We do not speak of it. Enjoy yours — THEN we audit it.',
      winTight:
        'A one-goal win — my favourite kind, honestly? You know why? Because somewhere in those minutes, you chose to suffer correctly, and nobody claps for that. I clap for that.',
      drawGoals:
        'A scoring draw! My first draw like that, I sprinted to celebrate OUR equaliser and pulled my hamstring. Missed two weeks. The lesson, little one: celebrate after the debrief.',
      drawNill:
        'Zero-zero — the scoreline that puts crowds to sleep and coaches to work. My old gaffer called it “a chess match where nobody moved.” Prove him wrong with your answers today.',
      lossBig:
        'A heavy loss, little one. My worst was 7–1. My coach bought me dinner after and said, “good — now you know exactly how much work you have.” I never forgot. Neither will you.',
      lossTight:
        'A narrow one. I once lost 1–0 to a goal that came off a man fixing his sock. True story, little one. But we never talk about the bounce — we talk about the ninety minutes before it.',
    },
    ambitionAsk:
      'One more thing, little one, and this stays between us until we need it: where do you want your game to BE when we look back a year from now? Tell me the real dream — I will hold it for you.',
  },
};
