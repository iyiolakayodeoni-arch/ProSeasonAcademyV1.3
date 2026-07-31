import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
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
import SignInScreen from './src/screens/SignInScreen';
import CoachSelectScreen from './src/screens/CoachSelectScreen';
import HearAboutScreen from './src/screens/HearAboutScreen';
import CoachIntroScreen from './src/screens/CoachIntroScreen';
import BaselineScanScreen from './src/screens/BaselineScanScreen';
import SetupLoaderScreen from './src/screens/SetupLoaderScreen';
import MainScreen from './src/screens/MainScreen';
import { COACHES } from './src/data/coaches';
import { hydrateProgress } from './src/data/progress';
import { hydrateThread } from './src/data/lessonThread';
import { initCloudSync } from './src/data/cloudSync';
import { initAudio } from './src/audio/sound';
import {
  endSession,
  getSession,
  hydrateSession,
  lockCoach,
  markBaselineDone,
  markIntroDone,
  markSignedIn,
  setReferral as persistReferral,
} from './src/data/session';
import { restoreSession, signOutRemote } from './src/data/authApi';
import * as backend from './src/data/backend';
import { setAcademyId, setDisplayName, setEmail } from './src/data/settings';
import { colors } from './src/theme';
import { useAmbientAudio, AudioScene } from './src/audio/AudioManager';

// Keep the native OS splash as a plain academy background until
// the real React loading screen is ready. This prevents the old
// pre-loader logo flash before the structured loading screen.
void NativeSplash.preventAutoHideAsync().catch(() => {});

// SPLASH → SIGN IN → COACH SELECTION → COACH INTRO → BASELINE SCAN
//        → HOW DID YOU HEAR → COACH SETUP LOADER → SEASON HUB
type Route = 'signin' | 'coach' | 'intro' | 'scan' | 'hear' | 'setup' | 'hub';

export default function App() {
  // phase-state routing for now — React Navigation lands with the tab bar build
  const [route, setRoute] = useState<Route>('signin');
  const [coachId, setCoachId] = useState<string | null>(null);
  const [splashGone, setSplashGone] = useState(false);
  /** false until the saved session has been read off the disk */
  const [restored, setRestored] = useState(false);

  const splashOpacity = useSharedValue(1);
  const appOpacity = useSharedValue(0);

  const audioScene: AudioScene = !splashGone
    ? 'splash'
    : route === 'signin'
      ? 'seat'
      : route === 'coach'
        ? 'coach-select'
        : route === 'hub'
          ? 'home'
          : 'seat';
  // MainScreen owns the home/film-room bed so only one loop is active.
  useAmbientAudio(audioScene, route !== 'hub');

  const markGone = useCallback(() => setSplashGone(true), []);

  // wake the academy's ear (audio session policy) — once per launch
  useEffect(() => {
    initAudio();
  }, []);

  // ── RESTORE: pick up exactly where this player left off ──
  // Runs while the splash is still on screen, so a returning
  // player never sees the sign-in door or re-sits the baseline.
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
      if (s.coachId) {
        // the lock is permanent — his ledger AND his lesson thread load
        // before the map renders; a bad file must not block the boot
        await hydrateProgress(s.coachId).catch(() => {});
        await hydrateThread(s.coachId).catch(() => {});
        if (!alive) return;
        setCoachId(s.coachId);
      }
      const signedIn = s.signedIn || !!cloud;
      if (!signedIn) setRoute('signin');
      else if (!s.coachId) setRoute('coach');
      else if (!s.introDone) setRoute('intro');
      else if (!s.baselineDone) setRoute('scan');
      else setRoute('hub');
      setRestored(true);
    })().catch(() => {
      // absolute last resort — land on the sign-in door, never a dead screen
      setRoute('signin');
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
    if (s.coachId && s.baselineDone) setRoute('hub');
    else if (s.coachId && s.introDone) setRoute('scan');
    else if (s.coachId) setRoute('intro');
    else setRoute('coach');
  }, []);

  /** coach lock is PERMANENT — from here onboarding only moves forward */
  const handleLocked = useCallback((id: string) => {
    lockCoach(id); // persisted; a second call can never overwrite it
    setCoachId(id);
    void hydrateProgress(id);
    void hydrateThread(id);
    setRoute('intro'); // coach speaks first, then the Baseline Scan gate
  }, []);

  const handleIntroDone = useCallback(() => {
    markIntroDone();
    setRoute('scan');
  }, []);

  const handleBaselineDone = useCallback(() => {
    markBaselineDone();
    setRoute('hear');
  }, []);

  const handleHearDone = useCallback((choice: string | null) => {
    persistReferral(choice);
    setRoute('setup');
  }, []);

  const handleSetupDone = useCallback(() => setRoute('hub'), []);

  const handleSignOut = useCallback(() => {
    // the ledger and the coach lock survive — only the floor is left
    void signOutRemote();
    endSession();
    setRoute('signin');
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* active route stays mounted underneath the splash for a true crossfade */}
      <Animated.View style={[styles.fill, appStyle]} pointerEvents={splashGone ? 'auto' : 'none'}>
        {restored && (
          <>
            {route === 'signin' && <SignInScreen onSignedIn={handleSignedIn} />}
            {route === 'coach' && (
              <CoachSelectScreen onBack={() => setRoute('signin')} onLocked={handleLocked} />
            )}
            {route === 'intro' && <CoachIntroScreen coach={lockedCoach} onDone={handleIntroDone} />}
            {route === 'scan' && <BaselineScanScreen coach={lockedCoach} onDone={handleBaselineDone} />}
            {route === 'hear' && <HearAboutScreen onDone={handleHearDone} />}
            {route === 'setup' && (
              <SetupLoaderScreen
                coachFirstName={lockedCoach.name.split(' ')[0]}
                onDone={handleSetupDone}
              />
            )}
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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
