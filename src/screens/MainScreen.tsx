import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import WebHeader, { MainNavTab } from '../components/WebHeader';
import TabBar from '../components/TabBar';
import HomeTab from './tabs/HomeTab';
import TrackerTab from './tabs/TrackerTab';
import EvidenceTrackerScreen from './EvidenceTrackerScreen';
import CommunityTab from './tabs/CommunityTab';
import SettingsTab from './tabs/SettingsTab';
import AcademyUpdatesScreen from './AcademyUpdatesScreen';
import AcademyGuideScreen from './AcademyGuideScreen';
import RoleModelFeedSheet from './RoleModelFeedSheet';
import ContactSheet from './ContactSheet';
import FounderDesk from './FounderDesk';
import TermsSheet from './TermsSheet';
import OnboardingScreen from './OnboardingScreen';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { Coach } from '../data/coaches';
import * as backend from '../data/backend';
import { useOnboardingGate } from '../data/onboarding';
import { usePushRegistration } from '../data/notifications';
import { fetchAnnouncements } from '../data/announcements';
import { isFounder } from '../data/founderAuth';
import { sfx } from '../audio/sound';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { colors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

type Props = { coach: Coach; onSignOut: () => void; };

export default function MainScreen({ coach, onSignOut }: Props) {
  const { isWide } = useResponsive();
  const [tos, setTos] = useState<backend.MyTos | null>(null);
  const checkTos = useCallback(() => { void backend.myTos().then(setTos); }, []);
  useEffect(checkTos, [checkTos]);

  const [tab, setTabState] = useState<MainNavTab>('today');
  const { loopProps, glowStyle } = useTrailLoop({ pathLength: 260, drawMs: 1800, eraseMs: 1800 });
  const onboard = useOnboardingGate();
  usePushRegistration(true);
  const [founderAllowed, setFounderAllowed] = useState(false);
  useEffect(() => { void fetchAnnouncements(); void isFounder().then(setFounderAllowed); }, []);
  const setTab = useCallback((t: MainNavTab) => { sfx('tab'); setTabState(t); }, []);

  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [deskOpen, setDeskOpen] = useState(false);

  const guideKey = useMemo(() => `psa.plain-language-guide.v1.${backend.getMe()?.id ?? 'anon'}`, []);
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(guideKey).then((seen) => { if (alive && seen !== 'seen') setGuideOpen(true); }).catch(() => { if (alive) setGuideOpen(true); });
    return () => { alive = false; };
  }, [guideKey]);
  const closeGuide = useCallback(() => { setGuideOpen(false); void AsyncStorage.setItem(guideKey, 'seen').catch(() => {}); }, [guideKey]);

  if (tos && !tos.accepted) return <TermsSheet onAccepted={checkTos} />;
  if (onboard.ready && onboard.show) return <OnboardingScreen onDone={onboard.dismiss} />;

  return (
    <View style={styles.root}>
      <WebHeader
        activeTab={tab} onSelectTab={setTab} coach={coach} loopProps={loopProps} glowStyle={glowStyle}
        onOpenUpdates={() => setUpdatesOpen(true)} onOpenGuide={() => setGuideOpen(true)}
        onOpenFounderDesk={() => setDeskOpen(true)} isFounder={founderAllowed}
      />
      <View style={styles.body}>
        <div className="psa-web-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, width: '100%' }}>
          <Animated.View key={tab} entering={FadeIn.duration(260)} style={{ flex: 1 }}>
            {tab === 'today' && <ErrorBoundary key="today"><HomeTab coach={coach} onOpenJourney={() => setTab('journey')} onOpenTracker={() => setTab('tracker')} onOpenUpdates={() => setUpdatesOpen(true)} onOpenHalls={() => setTab('community')} onOpenGuide={() => setGuideOpen(true)} onOpenRole={() => setRoleOpen(true)} /></ErrorBoundary>}
            {tab === 'journey' && <ErrorBoundary key="journey"><TrackerTab coach={coach} /></ErrorBoundary>}
            {tab === 'tracker' && <ErrorBoundary key="tracker"><EvidenceTrackerScreen coach={coach} onClose={() => setTab('today')} /></ErrorBoundary>}
            {tab === 'community' && <ErrorBoundary key="community"><CommunityTab onClose={() => setTab('today')} /></ErrorBoundary>}
            {tab === 'settings' && <ErrorBoundary key="settings"><SettingsTab onSignOut={onSignOut} /></ErrorBoundary>}
          </Animated.View>
        </div>
      </View>
      <TabBar active={tab} onChange={setTab} />

      {updatesOpen && <ModalWrapper onClose={() => setUpdatesOpen(false)}><AcademyUpdatesScreen coach={coach} onClose={() => setUpdatesOpen(false)} /></ModalWrapper>}
      {roleOpen && <ModalWrapper onClose={() => setRoleOpen(false)}><RoleModelFeedSheet coach={coach} onClose={() => setRoleOpen(false)} /></ModalWrapper>}
      {guideOpen && <ModalWrapper onClose={closeGuide}><AcademyGuideScreen onClose={closeGuide} /></ModalWrapper>}
      {contactOpen && <ModalWrapper onClose={() => setContactOpen(false)}><ContactSheet onClose={() => setContactOpen(false)} /></ModalWrapper>}
      {deskOpen && <ModalWrapper onClose={() => setDeskOpen(false)}><FounderDesk founderKey="authenticated-founder" onForgetKey={() => setDeskOpen(false)} onClose={() => setDeskOpen(false)} /></ModalWrapper>}
    </View>
  );
}

function ModalWrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const { isWide } = useResponsive();
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
        <Pressable style={[styles.modalBackdrop, Platform.OS === 'web' && (styles.backdropBlur as any)]} onPress={onClose} />
      </Animated.View>
      <Animated.View entering={FadeInUp.duration(360).springify().damping(20)} style={[styles.modalContent, isWide && styles.modalContentWide]}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, minHeight: 0, width: '100%', paddingBottom: 0 },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3, 7, 4, 0.78)' },
  backdropBlur: { backdropFilter: 'blur(14px) saturate(1.1)' } as any,
  modalContent: { flex: 1, width: '100%', height: '100%' },
  modalContentWide: {
    alignSelf: 'center',
    maxWidth: 900,
    maxHeight: '88%',
    marginTop: 'auto',
    marginBottom: 'auto',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 106, 0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
    elevation: 24,
    backgroundColor: '#0a130d',
  },
});
