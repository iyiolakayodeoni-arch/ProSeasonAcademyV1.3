// ─────────────────────────────────────────────────────────────
// ACADEMY TOUR — one idea per card. Shown once after first hub
// entry (skip anytime), and replayable from Settings → Help.
// Every card teaches the CURRENT product: the universal Journey,
// The Standard, the Mirror Session, The Thread, the receipts.
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const KEY = 'psa.onboarding.done.v1';

export type OnboardCard = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  /** subtle accent — green (primary) or gold (the Standard / founder) */
  tone?: 'green' | 'gold';
};

export const ONBOARD_CARDS: OnboardCard[] = [
  {
    id: 'start',
    eyebrow: 'START HERE',
    title: 'YOUR NEXT MOVE',
    body: 'Your Baseline Week is sealed — the honest part is done. Open JOURNEY and press Stage 1. Your coach is waiting. Nothing unlocks by pressing buttons; every stage is cleared by evidence.',
    tone: 'green',
  },
  {
    id: 'journey',
    eyebrow: 'JOURNEY',
    title: 'YOUR ROAD',
    body: 'One universal six-stage journey: See Yourself → Control Yourself → Read the Game → Build Discipline → Perform Under Pressure → Prove It. Your coach walks it with you — only your matches move it forward.',
  },
  {
    id: 'standard',
    eyebrow: 'THE STANDARD',
    title: 'THE BENCHMARK',
    body: 'Beside your map runs The Standard — what the best in this path learned at each stage. It is not a second track to complete. Read it, then walk your own road.',
    tone: 'gold',
  },
  {
    id: 'chinedu-way',
    eyebrow: 'THE CHINEDU WAY',
    title: 'PEN TO PAPER BEFORE YOU TYPE',
    body: 'A biro and a book hold what typing forgets. Record your match, watch the tape, pen your key moments, cool down 24–30 minutes, then type your truth into your database. The hard way is the easy way.',
    tone: 'green',
  },
  {
    id: 'mirror',
    eyebrow: 'MIRROR SESSION',
    title: 'THE MAIN RITUAL',
    body: 'Before a match you set an intention. You record your match as usual, watch your tape, and write your moments on paper. After your 24–30 minute cool-down, you type your review into your database. The app never thinks for you.',
  },
  {
    id: 'thread',
    eyebrow: 'THE THREAD',
    title: 'YOUR LESSON LOOP',
    body: 'Every session ends with one lesson you swear into The Thread. Your next session opens by asking how it held — or broke. A lesson cannot be created and immediately forgotten.',
  },
  {
    id: 'record',
    eyebrow: 'THE RECORD',
    title: 'VAULT + LOSS JOURNAL',
    body: 'Every match logs to your Match Vault; every loss earns an honest line in the Loss Journal. These receipts are what your stages are graded from. No shortcuts, no painted percentages.',
  },
  {
    id: 'community',
    eyebrow: 'COMMUNITY',
    title: 'THE CLUBHOUSE',
    body: 'Channels, direct messages, reactions and squads. Share your match receipts, read the founder’s official word, keep it real. The founder reads the serious stuff himself.',
  },
  {
    id: 'till',
    eyebrow: 'THE TILL',
    title: 'YOUR SEAT',
    body: 'The first stages are free; a pass opens the full journey. 14-day trial, 3-day grace, refunds for unused time. Season One is capped at 1,000 seats — enforced by the database, not by a button.',
    tone: 'gold',
  },
];

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
