// ─────────────────────────────────────────────────────────────
// ACADEMY TOUR — one idea per card. Shown once after first hub
// entry (skip anytime), and replayable from Settings → TUTORIAL.
// Every card teaches the CURRENT product: the academy itself,
// the rituals (Mirror, Thread, Scan, Film Room, Record), the
// progress system, the clubhouse, and the season/till.
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const KEY = 'psa.onboarding.done.v1';

export const ONBOARD_SECTIONS = [
  'THE ACADEMY',
  'THE RITUALS',
  'YOUR PROGRESS',
  'THE CLUBHOUSE',
  'THE SEASON',
] as const;

export type OnboardCard = {
  id: string;
  section: (typeof ONBOARD_SECTIONS)[number];
  eyebrow: string;
  title: string;
  body: string;
  /** subtle accent — green (primary) or gold (the benchmark / founder / till) */
  tone?: 'green' | 'gold';
};

export const ONBOARD_CARDS: OnboardCard[] = [
  // ══════════ THE ACADEMY ══════════
  {
    id: 'start',
    section: 'THE ACADEMY',
    eyebrow: 'WELCOME, PLAYER',
    title: 'YOU MADE IT',
    body: 'Your Baseline Week is sealed — the honest part is done. This tour shows you how the academy works: where your evidence lives, what moves your journey, and what your coach will ask of you. Two minutes, then the floor is yours.',
    tone: 'green',
  },
  {
    id: 'academy',
    section: 'THE ACADEMY',
    eyebrow: 'THE ACADEMY',
    title: 'WHAT THIS IS',
    body: 'A private coaching programme for FC Mobile players — not a tips app. One coach (Chinedu Okafor), one universal six-chapter journey, one season at a time. Season One is capped at 1,000 seats, so every player inside can actually be coached and spoken to. That is the whole promise.',
  },
  {
    id: 'coach',
    section: 'THE ACADEMY',
    eyebrow: 'YOUR COACH',
    title: 'CHINEDU OKAFOR',
    body: 'THE DISCIPLINARIAN, 92 rated. Top of the game for 10+ seasons — he stayed there because he stayed coachable. He talks one-way: he teaches, you answer with your matches. His road is the benchmark; your journey is the evidence.',
    tone: 'gold',
  },
  {
    id: 'journey',
    section: 'THE ACADEMY',
    eyebrow: 'JOURNEY',
    title: 'YOUR ROAD',
    body: 'Six chapters, in order: See Yourself → Control Yourself → Read the Game → Build Discipline → Perform Under Pressure → Prove It. Nothing unlocks by tapping; every stage is cleared by evidence — matches logged, lines written, lessons held.',
  },

  // ══════════ THE RITUALS ══════════
  {
    id: 'mirror',
    section: 'THE RITUALS',
    eyebrow: 'MIRROR SESSION',
    title: 'THE MAIN RITUAL',
    body: 'Before a match you set an intention. The session stops you at half-time and full-time and asks what is happening in your head. Then you divide the match into your own key moments, review each one in your own words, and place every version beside the evidence — before / half-time / full-time / after review — until you see the gaps yourself. The app never thinks for you.',
    tone: 'green',
  },
  {
    id: 'thread',
    section: 'THE RITUALS',
    eyebrow: 'THE THREAD',
    title: 'YOUR LESSON LOOP',
    body: 'Every session ends with one lesson you swear into The Thread. Your next session opens by asking how it held — or broke. A lesson cannot be created and immediately forgotten. That loop is the entire method.',
  },
  {
    id: 'scan',
    section: 'THE RITUALS',
    eyebrow: 'MATCH SCAN',
    title: 'THE EYE + THE MIND',
    body: 'The watcher counts goals on your device — no cloud, no AI. It cannot read your head, so you report that part: composure, key moments, the honest line. The scan grades this stage’s objectives against your vault, live. “The scan will know” is not a threat. It is the point.',
  },
  {
    id: 'filmroom',
    section: 'THE RITUALS',
    eyebrow: 'FILM ROOM',
    title: "TODAY'S MECHANIC",
    body: 'Every day the scouts (MetaBot) find what is actually working in the game right now. Chinedu teaches it to you in the film room: why it works, three steps, the rule, the clip, the source. If it gets patched out, he tells you instead of teaching stale tape.',
  },
  {
    id: 'record',
    section: 'THE RITUALS',
    eyebrow: 'THE RECORD',
    title: 'VAULT + LOSS JOURNAL',
    body: 'Every match logs to your Match Vault in about 15 seconds: score, mode, their style, pass accuracy, the honor chips you kept. Every loss earns one honest line in the Loss Journal — 90 characters, no essays. These receipts are what your stages are graded from.',
  },

  // ══════════ YOUR PROGRESS ══════════
  {
    id: 'xp',
    section: 'YOUR PROGRESS',
    eyebrow: 'XP & BADGES',
    title: 'EVIDENCE BANKED',
    body: 'Pass a stage and it pays out once: XP, a chapter badge, and your player card rises. Replays never double-pay — the receipts have to be new. Badges go into your cabinet permanently.',
  },
  {
    id: 'standard',
    section: 'YOUR PROGRESS',
    eyebrow: 'HIS ROAD',
    title: 'THE BENCHMARK',
    body: 'Beside your map runs Chinedu’s own road — what he actually learned at each of the six chapters, season after season at the top. It is not a second track to complete. Read it, then walk your own road.',
    tone: 'gold',
  },
  {
    id: 'baseline',
    section: 'YOUR PROGRESS',
    eyebrow: 'THE BASELINE WEEK',
    title: 'THE GATE YOU CLEARED',
    body: 'One match a day for five days, each next day sealed 24 hours after the last — so the thinking has time to land. Day 6 was the reflection, Day 7 sealed your profile card. You already did the hardest part: you showed up honestly.',
  },

  // ══════════ THE CLUBHOUSE ══════════
  {
    id: 'community',
    section: 'THE CLUBHOUSE',
    eyebrow: 'COMMUNITY',
    title: 'THE CLUBHOUSE',
    body: '#general, #wins, #losses and the read-only #coach-updates. Direct messages, reactions, typing indicators, squads. Share your match receipts, celebrate wins, bring notes to the loss room. If the hall is offline it says so — you will never be fooled into thinking bots are people.',
  },
  {
    id: 'founder',
    section: 'THE CLUBHOUSE',
    eyebrow: 'THE FOUNDER',
    title: 'WHO RUNS THIS',
    body: 'The founder reads the serious stuff himself: flags, contact messages, the pricing consultation. Founder broadcasts land on your Home feed with a gold badge. “Talk to a human” in Help & support is a real line, not a button that does nothing.',
  },

  // ══════════ THE SEASON ══════════
  {
    id: 'till',
    section: 'THE SEASON',
    eyebrow: 'THE TILL',
    title: 'YOUR SEAT',
    body: 'The first stages are free; a pass opens the full road. 14-day trial, 3-day grace after expiry, refunds for unused time. Season One is capped at 1,000 seats — enforced by the database, not by a button. If it is full, you train solo on the waitlist and keep every receipt.',
    tone: 'gold',
  },
  {
    id: 'settings',
    section: 'THE SEASON',
    eyebrow: 'SETTINGS',
    title: 'YOUR CONTROL ROOM',
    body: 'Edit your profile, set platform and region, tune music and sound effects, choose which notifications you hear, set quiet hours, and find your seat number under Password & security. Everything that matters is in here — nothing hides from you.',
  },
  {
    id: 'firstweek',
    section: 'THE SEASON',
    eyebrow: 'YOUR FIRST WEEK',
    title: 'THE NEXT 7 DAYS',
    body: 'Today: open JOURNEY and tap Stage 1. Play your ranked match inside a Mirror Session — intention first. Log every match in the vault, one honest line per loss. Check the film room daily for the fresh mechanic. Drop into the clubhouse when you want company. You do not need to learn it all tonight — the coach moves at your pace, and your pace is set by your matches.',
    tone: 'green',
  },
];

/** the card index for a given id — used by Settings quick links */
export function onboardingStartIndex(id: string): number {
  const idx = ONBOARD_CARDS.findIndex((c) => c.id === id);
  return idx < 0 ? 0 : idx;
}

export async function isOnboardingDone(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1').catch(() => {});
}

/** forget the tour was seen — used by Delete Account so a brand-new
 *  account gets the tutorial again */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best effort */
  }
}

export function useOnboardingGate(): {
  ready: boolean;
  show: boolean;
  dismiss: () => void;
} {
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    void isOnboardingDone().then((done) => {
      setShow(!done);
      setReady(true);
    });
  }, []);

  return {
    ready,
    show,
    dismiss: () => {
      setShow(false);
      void markOnboardingDone();
    },
  };
}
