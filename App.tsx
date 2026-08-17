import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NativeSplash from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import SplashScreen from './src/screens/SplashScreen';
import LandingScreen from './src/screens/LandingScreen';
import SignInScreen from './src/screens/SignInScreen';
import BaselineScanScreen from './src/screens/BaselineScanScreen';
import MainScreen from './src/screens/MainScreen';
import ResponsiveFrame from './src/components/ResponsiveFrame';
import { COACHES, SOLO_COACH_ID } from './src/data/coaches';
import { hydrateProgress } from './src/data/progress';
import { hydrateThread } from './src/data/lessonThread';
import { hydrateMirror } from './src/data/mirrorSession';
import { initCloudSync } from './src/data/cloudSync';
import {
  endSession,
  getSession,
  hydrateSession,
  lockCoach,
  markBaselineDone,
  markSignedIn,
} from './src/data/session';
import { restoreSession, signOutRemote } from './src/data/authApi';
import * as backend from './src/data/backend';
import { setAcademyId, setDisplayName, setEmail } from './src/data/settings';
import { colors } from './src/theme';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import WebAppChrome from './src/components/WebAppChrome';

// Keep the native OS splash as a plain academy background until
// the real React loading screen is ready. This prevents the old
// pre-loader logo flash before the structured loading screen.
void NativeSplash.preventAutoHideAsync().catch(() => {});

// ── CRASH LOG — an uncaught JS error must never be silent. When the app
// closes unexpectedly on a phone, the last errors are saved to AsyncStorage
// (psa.crashlog.v1) so the founder can read the actual cause instead of
// guessing. The handler itself never throws.
if ((globalThis as any).ErrorUtils?.setGlobalHandler) {
  const prev = (globalThis as any).ErrorUtils.getGlobalHandler();
  (globalThis as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    try {
      const entry = {
        at: Date.now(),
        message: String(error?.message ?? error),
        stack: String(error?.stack ?? ''),
      };
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.getItem('psa.crashlog.v1')
        .then((old: string | null) => {
          const list: unknown[] = old ? (JSON.parse(old) as unknown[]) : [];
          list.push(entry);
          return AsyncStorage.setItem('psa.crashlog.v1', JSON.stringify(list.slice(-10)));
        })
        .catch(() => {});
    } catch {
      /* the logger must never crash the crash handler */
    }
    if (isFatal) prev(error, isFatal);
    else console.error('[psa] uncaught', error);
  });
}

// SPLASH → DOSSIER (landing) → SIGN IN → BASELINE WEEK → TODAY.
// No coach. The work is the player's.
// The old coach lore, orientation carousel, referral survey and fake setup
// loader were all extra stops before a player could understand the work.
type Route = 'landing' | 'signin' | 'coach' | 'scan' | 'hub';

export default function App() {
  // phase-state routing for now — React Navigation lands with the tab bar build
  const [route, setRoute] = useState<Route>('landing');
  // On web, every fresh page load starts at the public homepage. Keep the
  // authenticated destination separately so "Enter the academy" can resume a
  // returning player without making them sign in again.
  const [entryRoute, setEntryRoute] = useState<Route>('signin');
  const [coachId, setCoachId] = useState<string | null>(null);
  const [splashGone, setSplashGone] = useState(false);
  /** false until the saved session has been read off the disk */
  const [restored, setRestored] = useState(false);

  const splashOpacity = useSharedValue(1);
  const appOpacity = useSharedValue(0);

  const markGone = useCallback(() => setSplashGone(true), []);

  // Release the OS splash only after React has mounted the custom splash
  // screen. SplashScreen.tsx owns the visible animation and must not hide
  // the native splash during its own first effect, otherwise Android can
  // reveal the launcher icon/background between the two splash layers.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void NativeSplash.hideAsync().catch(() => {});
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // ── RESTORE: remember where this player left off ──
  // Runs while the splash is still on screen. Native resumes that saved
  // destination immediately; web keeps it ready behind the homepage CTA.
  // EVERY step is fail-soft: a dead network, corrupt storage or a
  // bad server reply must never strand or take down the whole app —
  // boot always lands on a real screen.
  useEffect(() => {
    let alive = true;
    void (async () => {
      await hydrateSession().catch(() => {});
      // restore Supabase email/password session if the token is still valid
      const cloud = await restoreSession().catch(() => null);
      if (cloud && alive) {
        backend.setMeFromProfile(cloud);
        setDisplayName(cloud.handle);
        setAcademyId(cloud.academyId);
        if (cloud.email) setEmail(cloud.email);
        markSignedIn();
      }
      if (!alive) return;
      const s = getSession();
      const pathId = s.coachId || SOLO_COACH_ID;
      if (!s.coachId) lockCoach(SOLO_COACH_ID);
      await hydrateProgress(pathId).catch(() => {});
      await hydrateThread(pathId).catch(() => {});
      await hydrateMirror(pathId).catch(() => {});
      if (!alive) return;
      setCoachId(pathId);
      // Only a verified server session (restored from Supabase auth) allows
      // the user to skip the sign-in door. The local `signedIn` boolean alone
      // is no longer sufficient — this removes the local-only fallback path.
      const signedIn = !!cloud;
      const destination: Route = !signedIn
        ? 'signin'
        : !s.baselineDone
          ? 'scan'
          : 'hub';

      setEntryRoute(destination);
      // `npm start` launches the web build. Always show that build's public
      // homepage first instead of dropping a restored session directly into
      // the main app. Native launches continue to resume where the player left.
      setRoute(Platform.OS === 'web' ? 'landing' : destination);
      setRestored(true);
    })().catch(() => {
      // absolute last resort — land on the public door, never a dead screen
      setRoute('landing');
      setRestored(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // ── CLOUD: start the academy's uplink once a coach is known ──
  // Idempotent + fail-soft: no network just means offline-first.
  useEffect(() => {
    if (coachId) initCloudSync({ coachId });
  }, [coachId]);

  // ── splash hand-off ──
  // The splash only leaves when two things are true: its own progress
  // run has finished AND the route underneath has actually rendered
  // (restored). No player ever stares into a dead-black void.
  const splashDone = useRef(false);
  const finishRequested = useRef(false);
  const restoredRef = useRef(false);
  restoredRef.current = restored;

  const doFinish = useCallback(() => {
    if (splashDone.current) return;
    splashDone.current = true;
    splashOpacity.value = withTiming(0, { duration: 480, easing: Easing.inOut(Easing.quad) }, (f) => {
      if (f) runOnJS(markGone)();
    });
    appOpacity.value = withTiming(1, { duration: 480, easing: Easing.inOut(Easing.quad) });
  }, [splashOpacity, appOpacity, markGone]);

  const handleSplashFinish = useCallback(() => {
    finishRequested.current = true;
    if (restoredRef.current) doFinish();
  }, [doFinish]);

  // boot work finished after the splash did → release it now
  useEffect(() => {
    if (restored && finishRequested.current) doFinish();
  }, [restored, doFinish]);

  // absolute failsafe: the splash can never trap the app
  useEffect(() => {
    const t = setTimeout(doFinish, 8000);
    return () => clearTimeout(t);
  }, [doFinish]);

  // Web keyboard shortcuts: ESC acts like a "soft back" — from hub → sign-out
  // guard (no destructive action without user choosing), from scan/coach →
  // previous onboarding gate is already reachable on screen. We also listen
  // for "?" to focus the first focusable element as a quick laptop/TV jump.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // don't steal ESC from inputs/menus
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        // no routing change — ESC simply blurs any active focus/overlay so the
        // user lands back on the frame. Individual sheets can override.
        if (document.activeElement && (document.activeElement as HTMLElement).blur) {
          (document.activeElement as HTMLElement).blur();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const splashStyle = useAnimatedStyle(() => ({ opacity: splashOpacity.value }));
  const appStyle = useAnimatedStyle(() => ({ opacity: appOpacity.value }));

  const lockedCoach = useMemo(
    () => COACHES.find((c) => c.id === coachId) ?? COACHES[0],
    [coachId],
  );

  const handleSignedIn = useCallback(() => {
    markSignedIn();
    const s = getSession();
    // a returning player who already locked in skips straight to his floor
    if (!s.coachId) lockCoach(SOLO_COACH_ID);
    const pathId = getSession().coachId || SOLO_COACH_ID;
    setCoachId(pathId);
    void hydrateProgress(pathId);
    void hydrateThread(pathId);
    void hydrateMirror(pathId);
    const destination: Route = s.baselineDone ? 'hub' : 'scan';
    setEntryRoute(destination);
    setRoute(destination);
  }, []);

  const handleBaselineDone = useCallback(() => {
    markBaselineDone();
    setRoute('hub');
  }, []);

  const handleSignOut = useCallback(() => {
    // the ledger and the coach lock survive — only the floor is left
    void signOutRemote();
    endSession();
    setEntryRoute('signin');
    setRoute('landing');
  }, []);

  return (
    <ErrorBoundary>
      <ResponsiveFrame>
        <View style={styles.root}>
          <StatusBar style="light" />

          {/* Web-only side chrome (keyboard hints + device badge). Invisible on native. */}
          <WebAppChrome visibleRoute={route} />

          {/* active route stays mounted underneath the splash for a true crossfade */}
          <Animated.View style={[styles.fill, appStyle]} pointerEvents={splashGone ? 'auto' : 'none'}>
            {restored && (
              <>
                {route === 'landing' && <LandingScreen onEnter={() => setRoute(entryRoute)} />}
                {route === 'signin' && <SignInScreen onSignedIn={handleSignedIn} />}
                {route === 'coach' && <SignInScreen onSignedIn={handleSignedIn} />}
                {route === 'scan' && <BaselineScanScreen coach={lockedCoach} onDone={handleBaselineDone} />}
                {route === 'hub' && <MainScreen coach={lockedCoach} onSignOut={handleSignOut} />}
              </>
            )}
          </Animated.View>

          {!splashGone && (
            <Animated.View style={[styles.fill, splashStyle]} pointerEvents="none">
              <SplashScreen onFinish={handleSplashFinish} />
            </Animated.View>
          )}
        </View>
      </ResponsiveFrame>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  // The "phone column" cap of 430 used to hard-lock web to 430px. ResponsiveFrame
  // now decides width per breakpoint, so the fill takes whatever its parent gives
  // it and centers horizontally. Native stays full-screen because ResponsiveFrame
  // is a plain <View> with flex:1 there.
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignSelf: 'center',
    width: '100%',
    backgroundColor: colors.bg,
  },
});
