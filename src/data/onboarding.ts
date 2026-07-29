// ─────────────────────────────────────────────────────────────
// NEW-MEMBER ONBOARDING — short walkthrough, one idea per card.
// Shown once after first hub entry. Skip anytime.
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const KEY = 'psa.onboarding.done.v1';

export type OnboardCard = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
};

export const ONBOARD_CARDS: OnboardCard[] = [
  {
    id: 'home',
    eyebrow: 'HOME',
    title: 'THE FEED',
    body: 'Founder announcements sit at the top. Below them: approved FC Mobile news and academy updates. No noise.',
  },
  {
    id: 'journey',
    eyebrow: 'JOURNEY',
    title: 'YOUR PATH',
    body: 'Six stages with your coach. Clear a stage to unlock the next. The lock on your coach is permanent — by design.',
  },
  {
    id: 'vault',
    eyebrow: 'MATCH VAULT',
    title: 'YOUR MATCHES',
    body: 'Log score, style and composure in under 15 seconds. The vault feeds your progress — honesty over polish.',
  },
  {
    id: 'scan',
    eyebrow: 'MATCH SCAN',
    title: 'THE GRADE',
    body: 'Each stage grades your vault against the coach’s objectives. Pass → XP + badge. Fail → run it back.',
  },
  {
    id: 'film',
    eyebrow: 'FILM ROOM',
    title: 'TODAY’S MECHANIC',
    body: 'Open a stage node to sit with your coach. Written guidance, one mechanic, then the scan.',
  },
  {
    id: 'community',
    eyebrow: 'COMMUNITY',
    title: 'THE HALLS',
    body: 'Dressing room, match receipts, the lab. Talk football. The founder reads the serious stuff himself.',
  },
  {
    id: 'announce',
    eyebrow: 'FOUNDER',
    title: 'OFFICIAL WORD',
    body: 'When Pocolastones posts, it lands on Home with a gold badge — never mixed into community chat.',
  },
  {
    id: 'notif',
    eyebrow: 'ALERTS',
    title: 'YOUR NOISE LEVEL',
    body: 'Toggle coach, scan, news and founder pings in Settings. Quiet hours are there when you need them.',
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
