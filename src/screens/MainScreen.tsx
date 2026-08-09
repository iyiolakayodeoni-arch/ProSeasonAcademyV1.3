import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
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
import { colors, bodyFontHeavy, bodyFontBold, monoFont } from '../theme';
import { LogoutIcon, PersonIcon } from '../components/Icons';

type Props = {
  coach: Coach;
  onSignOut: () => void;
};

export default function MainScreen({ coach, onSignOut }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  const [tos, setTos] = useState<backend.MyTos | null>(null);
  const checkTos = useCallback(() => {
    void backend.myTos().then(setTos);
  }, []);
  useEffect(checkTos, [checkTos]);

  const [tab, setTabState] = useState<MainTab>('today');
  const { loopProps, glowStyle } = useTrailLoop({
    pathLength: 260,
    drawMs: 1800,
    eraseMs: 1800,
  });
  const onboard = useOnboardingGate();
  usePushRegistration(true);

  useEffect(() => {
    void fetchAnnouncements();
  }, []);

  const setTab = useCallback((t: MainTab) => {
    sfx('tab');
    setTabState(t);
  }, []);

  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [hallsOpen, setHallsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const guideKey = useMemo(
    () => `psa.plain-language-guide.v1.${backend.getMe()?.id ?? 'anon'}`,
    [],
  );

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(guideKey)
      .then((seen) => {
        if (alive && seen !== 'seen') setGuideOpen(true);
      })
      .catch(() => {
        if (alive) setGuideOpen(true);
      });
    return () => {
      alive = false;
    };
  }, [guideKey]);

  const closeGuide = useCallback(() => {
    setGuideOpen(false);
    void AsyncStorage.setItem(guideKey, 'seen').catch(() => {});
  }, [guideKey]);

  useAmbientAudio(hallsOpen ? 'community' : 'home');

  if (tos && !tos.accepted) {
    return <TermsSheet onAccepted={checkTos} />;
  }

  if (onboard.ready && onboard.show) {
    return <OnboardingScreen onDone={onboard.dismiss} />;
  }

  return (
    <View style={styles.root}>
      {/* DESKTOP WEB TOP NAVIGATION BAR */}
      {isDesktop ? (
        <View style={styles.desktopNavbar}>
          <View style={styles.navInner}>
            {/* Brand Logo & Title */}
            <View style={styles.navBrand}>
              <View style={styles.navLogoWrap}>
                <LogoMark size={24} loopProps={loopProps} glowStyle={glowStyle} />
              </View>
              <View>
                <Text style={styles.brandTitle}>PROSEASON ACADEMY</Text>
                <Text style={styles.brandSub}>FC 26/27 CONSOLE TACTICAL LAB</Text>
              </View>
            </View>

            {/* Desktop Navigation Links */}
            <View style={styles.navLinks}>
              <Pressable
                onPress={() => setTab('today')}
                style={[styles.navLink, tab === 'today' && styles.navLinkActive]}
              >
                <Text style={[styles.navLinkTxt, tab === 'today' && styles.navLinkTxtActive]}>
                  TODAY
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setTab('journey')}
                style={[styles.navLink, tab === 'journey' && styles.navLinkActive]}
              >
                <Text style={[styles.navLinkTxt, tab === 'journey' && styles.navLinkTxtActive]}>
                  PROGRESS (180 DAYS)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setHallsOpen(true)}
                style={styles.navLink}
              >
                <Text style={styles.navLinkTxt}>COMMUNITY</Text>
              </Pressable>

              <Pressable
                onPress={() => setUpdatesOpen(true)}
                style={styles.navLink}
              >
                <Text style={styles.navLinkTxt}>FC INTEL</Text>
              </Pressable>

              <Pressable
                onPress={() => setTab('settings')}
                style={[styles.navLink, tab === 'settings' && styles.navLinkActive]}
              >
                <Text style={[styles.navLinkTxt, tab === 'settings' && styles.navLinkTxtActive]}>
                  MY ACCOUNT
                </Text>
              </Pressable>
            </View>

            {/* Right Side: Coach Indicator + Sign Out */}
            <View style={styles.navRight}>
              <View style={styles.coachPill}>
                <View style={styles.coachOnlineDot} />
                <Text style={styles.coachPillTxt}>COACH {coach.name.split(' ')[0]}</Text>
              </View>

              <Pressable onPress={onSignOut} style={styles.signOutBtn} hitSlop={8}>
                <LogoutIcon size={15} color="#9ca3af" />
                <Text style={styles.signOutTxt}>SIGN OUT</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        /* MOBILE TOP CREST */
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
      )}

      {/* Main Content Area — Center-aligned, responsive max-width on web */}
      <View style={[styles.body, { maxWidth: isDesktop ? 1240 : '100%', width: '100%', alignSelf: 'center' }]}>
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

      {/* Mobile Bottom TabBar (hidden on Desktop) */}
      {!isDesktop && <TabBar active={tab} onChange={setTab} />}

      {/* Fullscreen Overlay Sheets */}
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
  root: { flex: 1, backgroundColor: '#070a08' },

  // Desktop Navbar
  desktopNavbar: {
    height: 64,
    backgroundColor: 'rgba(10,14,11,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  navInner: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navLogoWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(57,255,106,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: bodyFontHeavy,
    fontSize: 13,
    letterSpacing: 1.6,
    color: '#ffffff',
  },
  brandSub: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#9ca3af',
  },

  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navLink: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  navLinkActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  navLinkTxt: {
    fontFamily: bodyFontHeavy,
    fontSize: 11,
    letterSpacing: 1.1,
    color: '#9ca3af',
  },
  navLinkTxtActive: {
    color: '#ffffff',
  },

  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  coachPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(57,255,106,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.25)',
  },
  coachOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  coachPillTxt: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.primary,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  signOutTxt: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#9ca3af',
  },

  // Mobile Crest
  crestWrap: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    paddingTop: 42,
    marginBottom: 8,
  },
  crestGlow: {
    borderRadius: 22,
    shadowColor: colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  crestRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestInner: {
    flex: 1,
    width: '100%',
    borderRadius: 17,
    backgroundColor: '#031f18',
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  body: { flex: 1, minHeight: 0 },
});
