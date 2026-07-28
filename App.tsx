import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
import { colors } from './src/theme';

// SPLASH → SIGN IN → COACH SELECTION → HOW DID YOU HEAR → COACH SETUP LOADER → SEASON HUB
type Route = 'signin' | 'coach' | 'intro' | 'scan' | 'hear' | 'setup' | 'hub';

export default function App() {
  // phase-state routing for now — React Navigation lands with the tab bar build
  const [route, setRoute] = useState<Route>('signin');
  const [coachId, setCoachId] = useState<string | null>(null);
  const [referral, setReferral] = useState<string | null>(null);
  const [splashGone, setSplashGone] = useState(false);

  const splashOpacity = useSharedValue(1);
  const appOpacity = useSharedValue(0);

  const markGone = useCallback(() => setSplashGone(true), []);

  // Splash finished its progress run → crossfade to whatever sits underneath.
  const handleSplashFinish = useCallback(() => {
    splashOpacity.value = withTiming(0, { duration: 480, easing: Easing.inOut(Easing.quad) }, (f) => {
      if (f) runOnJS(markGone)();
    });
    appOpacity.value = withTiming(1, { duration: 480, easing: Easing.inOut(Easing.quad) });
  }, [splashOpacity, appOpacity, markGone]);

  const splashStyle = useAnimatedStyle(() => ({ opacity: splashOpacity.value }));
  const appStyle = useAnimatedStyle(() => ({ opacity: appOpacity.value }));

  const lockedCoach = useMemo(
    () => COACHES.find((c) => c.id === coachId) ?? COACHES[0],
    [coachId],
  );

  /** coach lock is PERMANENT — from here onboarding only moves forward */
  const handleLocked = useCallback((id: string) => {
    console.log('[season] coach locked permanently →', id); // TODO(real-persistence)
    setCoachId(id);
    setRoute('intro'); // coach speaks first, then the Baseline Scan gate
  }, []);

  const handleHearDone = useCallback((choice: string | null) => {
    setReferral(choice); // TODO(real-persistence): attach to the player profile
    setRoute('setup');
  }, []);

  const handleSetupDone = useCallback(() => setRoute('hub'), []);

  const handleSignOut = useCallback(() => {
    // TODO(real-auth): auth sign-out goes here; dev reset only
    setCoachId(null);
    setReferral(null);
    setRoute('signin');
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* active route stays mounted underneath the splash for a true crossfade */}
      <Animated.View style={[styles.fill, appStyle]} pointerEvents={splashGone ? 'auto' : 'none'}>
        {route === 'signin' && <SignInScreen onSignedIn={() => setRoute('coach')} />}
        {route === 'coach' && (
          <CoachSelectScreen onBack={() => setRoute('signin')} onLocked={handleLocked} />
        )}
        {route === 'intro' && <CoachIntroScreen coach={lockedCoach} onDone={() => setRoute('scan')} />}
        {route === 'scan' && <BaselineScanScreen coach={lockedCoach} onDone={() => setRoute('hear')} />}
        {route === 'hear' && <HearAboutScreen onDone={handleHearDone} />}
        {route === 'setup' && (
          <SetupLoaderScreen
            coachFirstName={lockedCoach.name.split(' ')[0]}
            onDone={handleSetupDone}
          />
        )}
        {route === 'hub' && (
          <MainScreen coach={lockedCoach} onSignOut={handleSignOut} />
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
