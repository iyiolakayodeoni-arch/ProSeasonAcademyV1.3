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
    body: 'Your Baseline Week is sealed — the honest part is done. Open TRACKING and build your first seven-match checkpoint. This product now tracks the player backward from evidence, not forward from stages.',
    tone: 'green',
  },
  {
    id: 'journey',
    eyebrow: 'TRACKING',
    title: 'YOUR RECORD',
    body: 'There is no forward stage map for the player. The academy builds a six-month record from seven-match checkpoints, each one formed from post-match stats screens and the numbers you confirm.',
  },
  {
    id: 'standard',
    eyebrow: 'THE STANDARD',
    title: 'THE BENCHMARK',
    body: 'The benchmark keeps the reference story because that road has already been walked. You do not chase labels. You track your own evidence, compare it to the benchmark, and adjust from what the screenshots prove.',
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
    eyebrow: 'MATCH REVIEW',
    title: 'THE MAIN RITUAL',
    body: 'Before a match you set an intention. After the match you review honestly, capture the stats screen, and log what happened. The app can organise the evidence, but it never thinks for you.',
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
    title: 'VAULT + CHECKPOINT CARD',
    body: 'Every match logs to your Match Vault; every checkpoint turns seven stats screens into a player card and a possible playing-style read. No shortcuts, no painted percentages — just the trend the receipts support.',
  },
  {
    id: 'community',
    eyebrow: 'COMMUNITY',
    title: 'THE CLUBHOUSE',
    body: 'Real rooms, real players — no bots, no scripts. Share your match receipts, read the founder’s official word, keep it real. The founder reads the serious stuff himself.',
  },
  {
    id: 'till',
    eyebrow: 'THE TILL',
    title: 'YOUR SEAT',
    body: 'A pass opens the full tracking system, the archive and the benchmark record. 14-day trial, 3-day grace, refunds for unused time. Season One is capped at 1,000 seats — enforced by the database, not by a button.',
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
