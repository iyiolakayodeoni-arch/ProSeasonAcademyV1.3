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
    id: 'today',
    eyebrow: 'START HERE',
    title: 'ONE MATCH. ONE REVIEW.',
    body: 'Today always shows the next useful move. Open a Mirror Session before or after your next FC console match — no feed, card or chat comes before that.',
    tone: 'green',
  },
  {
    id: 'mirror',
    eyebrow: 'THE MIRROR SESSION',
    title: 'PLAY · REVIEW · CARRY',
    body: 'Pick one focus, name the pattern at half-time, review the moments you choose, then write one lesson for the next match. The app keeps your receipts; it does not do your thinking.',
  },
  {
    id: 'evidence',
    eyebrow: 'YOUR EVIDENCE',
    title: 'THE RECORD GROWS QUIETLY',
    body: 'Progress holds your chapters, Match Vault and loss notes. Updates, halls and detailed seven-match tracking are there when helpful — they are not the assignment.',
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
