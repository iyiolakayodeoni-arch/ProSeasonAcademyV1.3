import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import LogoMark from '../components/LogoMark';
import TabBar, { MainTab } from '../components/TabBar';
import HomeTab from './tabs/HomeTab';
import AcademyUpdatesScreen from './AcademyUpdatesScreen';
import AcademyGuideScreen from './AcademyGuideScreen';
import JourneyTab from './tabs/JourneyTab';
import CommunityTab from './tabs/CommunityTab';
import SettingsTab from './tabs/SettingsTab';
import CoachingScreen from './CoachingScreen';
import OnboardingScreen from './OnboardingScreen';
import { useAmbientAudio } from '../audio/AudioManager';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { Coach } from '../data/coaches';
import { JourneyStage } from '../data/journey';
import * as backend from '../data/backend';
import { useOnboardingGate } from '../data/onboarding';
import { usePushRegistration } from '../data/notifications';
import { fetchAnnouncements } from '../data/announcements';
import TermsSheet from './TermsSheet';
import { sfx } from '../audio/sound';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { colors, monoFont } from '../theme';

type Props = {
  coach: Coach;
  onSignOut: () => void;
};

type StageOrigin = { x: number; y: number };
type RoomState = { stage: JourneyStage; origin: StageOrigin };

// the tabbed academy core: shared crest on top, tab bar on bottom,
// tab bodies in between. Tapping a Journey node doesn't navigate —
// the node ZOOMS open into the Coaching Screen (shared-element style),
// and the back chevron zooms straight back out onto the map.
export default function MainScreen({ coach, onSignOut }: Props) {
  const [tos, setTos] = useState<backend.MyTos | null>(null);
  const checkTos = useCallback(() => { void backend.myTos().then(setTos); }, []);
  useEffect(checkTos, [checkTos]);

  const [tab, setTabState] = useState<MainTab>('today');
  const { loopProps, glowStyle } = useTrailLoop({ pathLength: 260, drawMs: 1800, eraseMs: 1800 });
  const onboard = useOnboardingGate();
  usePushRegistration(true);
  useEffect(() => {
    void fetchAnnouncements();
  }, []);

  // SFX only here; ambient beds stay owned by AudioManager so we do not run two music loops.
  const setTab = useCallback((t: MainTab) => {
    sfx('tab');
    setTabState(t);
  }, []);

  // Secondary destinations are available, but deliberately do not compete
  // with the core Today → Mirror Session journey in the primary tab bar.
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [hallsOpen, setHallsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const guideKey = useMemo(() => `psa.plain-language-guide.v1.${backend.getMe()?.id ?? 'anon'}`, []);

  // A player should never have to discover the product by wandering around
  // the tabs. The first Home entry opens the plain-language guide; it stays
  // replayable from Today and Settings afterwards.
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(guideKey)
      .then((seen) => {
        if (alive && seen !== 'seen') setGuideOpen(true);
      })
      .catch(() => {
        if (alive) setGuideOpen(true);
      });
    return () => { alive = false; };
  }, [guideKey]);

  const closeGuide = useCallback(() => {
    setGuideOpen(false);
    void AsyncStorage.setItem(guideKey, 'seen').catch(() => {});
  }, [guideKey]);

  // ── stage-zoom transition state ──
  const [room, setRoom] = useState<RoomState | null>(null);
  useAmbientAudio(room ? 'film-room' : hallsOpen ? 'community' : 'home');
  const zoom = useSharedValue(0);
  const { width: W, height: H } = useWindowDimensions();
  const ox = room?.origin.x ?? W / 2;
  const oy = room?.origin.y ?? H / 3;

  const openStage = useCallback(
    (stage: JourneyStage, origin: StageOrigin) => {
      sfx('whoosh');
      setRoom({ stage, origin });
      zoom.value = 0;
      zoom.value = withTiming(1, { duration: 470, easing: Easing.out(Easing.cubic) });
    },
    [zoom],
  );

  const closeRoom = useCallback(() => {
    zoom.value = withTiming(0, { duration: 380, easing: Easing.inOut(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(setRoom)(null);
    });
  }, [zoom]);

  // the whole screen scales/expands FROM the tapped node's position
  const shellStyle = useAnimatedStyle(() => {
    const z = zoom.value;
    return {
      transform: [
        { translateX: (ox - W / 2) * (1 - z) },
        { translateY: (oy - H / 2) * (1 - z) },
        { scale: 0.055 + 0.945 * z },
      ],
      borderRadius: 30 + 430 * (1 - z),
      borderWidth: 2 * (1 - z),
      opacity: interpolate(z, [0, 0.05], [0, 1]),
      backgroundColor: interpolateColor(z, [0, 0.9, 1], ['#12301c', colors.bg, colors.bg]),
    };
  });
  // the node itself blooms as the shell grows (the "morph" read)
  const ghostStyle = useAnimatedStyle(() => ({
    opacity: interpolate(zoom.value, [0, 0.3], [1, 0]),
    transform: [{ scale: interpolate(zoom.value, [0, 0.3], [1, 3.4]) }],
  }));
  // screen content fades in during the back half of the zoom
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(zoom.value, [0.3, 0.8], [0, 1]),
  }));

  // The terms come first. Training is never blocked — members can always
  // return to their own evidence.
  if (tos && !tos.accepted) {
    return <TermsSheet onAccepted={checkTos} />;
  }

  // first-time walkthrough — short cards, skip anytime
  if (onboard.ready && onboard.show) {
    return <OnboardingScreen onDone={onboard.dismiss} />;
  }

  return (
    <View style={styles.root}>
      {/* shared brand crest — top center of every tab */}
      <View style={styles.crestWrap}>
        <LogoMark size={30} loopProps={loopProps} glowStyle={glowStyle} />
      </View>

      <View style={styles.body}>
        {/* each tab is its own boundary — one tab crashing shows a reload
            card instead of taking the whole app down */}
        {tab === 'today' && (
          <ErrorBoundary key="today">
            <HomeTab
              coach={coach}
              onOpenStage={openStage}
              onOpenJourney={() => setTab('journey')}
              onOpenUpdates={() => setUpdatesOpen(true)}
              onOpenHalls={() => setHallsOpen(true)}
              onOpenGuide={() => setGuideOpen(true)}
            />
          </ErrorBoundary>
        )}
        {tab === 'journey' && (
          <ErrorBoundary key="journey">
            <JourneyTab coach={coach} onOpenStage={openStage} />
          </ErrorBoundary>
        )}
        {tab === 'settings' && (
          <ErrorBoundary key="settings">
            <SettingsTab
              coach={coach}
              onSignOut={onSignOut}
              onOpenJourney={() => setTab('journey')}
              onOpenGuide={() => setGuideOpen(true)}
            />
          </ErrorBoundary>
        )}
      </View>

      <TabBar active={tab} onChange={setTab} />

      {/* ── the zoomed-in stage room (covers tabs + crest) ── */}
      {room && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={[styles.zoomShell, shellStyle]}>
            <Animated.View style={[styles.zoomContent, contentStyle]}>
              <CoachingScreen coach={coach} stage={room.stage} onClose={closeRoom} />
            </Animated.View>
          </Animated.View>
          {/* node ghost — blooms out of the map as the shell takes over */}
          <Animated.View pointerEvents="none" style={[styles.zoomGhost, { left: ox - 24, top: oy - 24 }, ghostStyle]}>
            <Text style={styles.zoomGhostNum}>{room.stage.n}</Text>
          </Animated.View>
        </View>
      )}

      {updatesOpen && (
        <View style={StyleSheet.absoluteFill}>
          <AcademyUpdatesScreen coach={coach} onClose={() => setUpdatesOpen(false)} />
        </View>
      )}

      {hallsOpen && (
        <View style={StyleSheet.absoluteFill}>
          <CommunityTab coach={coach} onClose={() => setHallsOpen(false)} />
        </View>
      )}

      {guideOpen && (
        <View style={StyleSheet.absoluteFill}>
          <AcademyGuideScreen onClose={closeGuide} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 46 },
  crestWrap: { alignItems: 'center', height: 36, justifyContent: 'center' },
  body: { flex: 1, minHeight: 0 },

  zoomShell: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderColor: colors.primary,
    backgroundColor: colors.bg,
  },
  zoomContent: { flex: 1 },
  zoomGhost: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  zoomGhostNum: { fontFamily: monoFont, fontSize: 14, fontWeight: '900', color: '#05130a' },
});
