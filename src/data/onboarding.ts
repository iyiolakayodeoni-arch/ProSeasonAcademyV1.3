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
    title: 'BASELINE IS DONE',
    body: 'The honest part is done. Now you just track your games. Play, type your stats, and your card shows where you are.',
    tone: 'green',
  },
  {
    id: 'journey',
    eyebrow: 'YOUR RECORD',
    title: 'WE TRACK WHAT YOU DID',
    body: 'No stages to chase. We look at your last 7 games — the stats you typed — and show if you’re getting better.',
  },
  {
    id: 'standard',
    eyebrow: 'THE STANDARD',
    title: 'WHAT GOOD LOOKS LIKE',
    body: 'This is what a top player looks like on the same stats. Compare yourself to it, not to a label.',
    tone: 'gold',
  },
  {
    id: 'chinedu-way',
    eyebrow: 'THE CHINEDU WAY',
    title: 'PEN ON PAPER FIRST',
    body: 'Record your game, watch it back, write your key moments with a pen, cool down for 30 minutes, then type it in. Hard way first.',
    tone: 'green',
  },
  {
    id: 'mirror',
    eyebrow: 'EVERY GAME',
    title: 'BE HONEST ABOUT IT',
    body: 'Before you play, pick one thing to focus on. After, tell the truth about what happened. We don’t do the thinking for you.',
  },
  {
    id: 'thread',
    eyebrow: 'ONE LESSON',
    title: 'DID IT HOLD?',
    body: 'Each game ends with one lesson you write down. Next game we ask: did you stick to it or break it? Lessons add up.',
  },
  {
    id: 'record',
    eyebrow: 'YOUR CARD',
    title: '7 GAMES = YOUR CARD',
    body: 'Every game you log counts. After 7 games we make your player card from your real numbers. No fakes — just your trend.',
  },
  {
    id: 'community',
    eyebrow: 'COMMUNITY',
    title: 'REAL PEOPLE',
    body: 'No bots. Just real players sharing results and the founder posting updates. Keep it honest.',
  },
  {
    id: 'till',
    eyebrow: 'YOUR SPOT',
    title: '1,000 SPOTS ONLY',
    body: 'Your pass keeps everything saved. Try free for 14 days, then you have 3 days after launch to pay. Nothing gets deleted while you decide.',
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
