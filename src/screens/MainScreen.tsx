import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LogoMark from '../components/LogoMark';
import TabBar, { MainTab } from '../components/TabBar';
import HomeTab from './tabs/HomeTab';
import AcademyUpdatesScreen from './AcademyUpdatesScreen';
import AcademyGuideScreen from './AcademyGuideScreen';
import TrackerTab from './tabs/TrackerTab';
import RoleModelFeedSheet from './RoleModelFeedSheet';
import CommunityTab from './tabs/CommunityTab';
import SettingsTab from './tabs/SettingsTab';
import OnboardingScreen from './OnboardingScreen';
import { useAmbientAudio } from '../audio/AudioManager';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { Coach } from '../data/coaches';
import * as backend from '../data/backend';
import { useOnboardingGate } from '../data/onboarding';
import { usePushRegistration } from '../data/notifications';
import { fetchAnnouncements } from '../data/announcements';
import TermsSheet from './TermsSheet';
import { sfx } from '../audio/sound';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { colors } from '../theme';

type Props = {
  coach: Coach;
  onSignOut: () => void;
};

// the tabbed academy core: shared crest on top, tab bar on bottom,
// tab bodies in between.
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
  const [roleOpen, setRoleOpen] = useState(false);
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

  useAmbientAudio(hallsOpen ? 'community' : 'home');

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
      {/* shared brand crest — top center of every tab, wrapped in a premium
          metallic ring + soft glow so the mark reads as the academy's seal */}
      <View style={styles.crestWrap}>
        <View style={styles.crestGlow}>
          <LinearGradient
            colors={['#39ff6a', '#f2c078', '#39ff6a', '#5dff8a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.crestRing}
          >
            <View style={styles.crestInner}>
              <LogoMark size={28} loopProps={loopProps} glowStyle={glowStyle} />
            </View>
          </LinearGradient>
        </View>
      </View>

      <View style={styles.body}>
        {/* each tab is its own boundary — one tab crashing shows a reload
            card instead of taking the whole app down */}
        {tab === 'today' && (
          <ErrorBoundary key="today">
            <HomeTab
              coach={coach}
              onOpenJourney={() => setTab('journey')}
              onOpenUpdates={() => setUpdatesOpen(true)}
              onOpenHalls={() => setHallsOpen(true)}
              onOpenGuide={() => setGuideOpen(true)}
              onOpenRole={() => setRoleOpen(true)}
            />
          </ErrorBoundary>
        )}
        {tab === 'journey' && (
          <ErrorBoundary key="journey">
            <TrackerTab coach={coach} />
          </ErrorBoundary>
        )}
        {tab === 'settings' && (
          <ErrorBoundary key="settings">
            <SettingsTab onSignOut={onSignOut} />
          </ErrorBoundary>
        )}
      </View>

      <TabBar active={tab} onChange={setTab} />

      {updatesOpen && (
        <View style={StyleSheet.absoluteFill}>
          <AcademyUpdatesScreen coach={coach} onClose={() => setUpdatesOpen(false)} />
        </View>
      )}

      {hallsOpen && (
        <View style={StyleSheet.absoluteFill}>
          <CommunityTab onClose={() => setHallsOpen(false)} />
        </View>
      )}

      {roleOpen && (
        <View style={StyleSheet.absoluteFill}>
          <RoleModelFeedSheet coach={coach} onClose={() => setRoleOpen(false)} />
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
  crestWrap: { alignItems: 'center', height: 40, justifyContent: 'center' },
  crestGlow: {
    borderRadius: 22,
    shadowColor: colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  crestRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestInner: {
    flex: 1,
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#031f18',
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  body: { flex: 1, minHeight: 0 },
});
