import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Constants from 'expo-constants';
import Animated from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import LogoMark from '../components/LogoMark';
import PhotoVeil from '../components/PhotoVeil';
import RotatingArtImage from '../components/RotatingArtImage';
import { useSplashAnimation } from '../hooks/useSplashAnimation';
import { colors, monoFont } from '../theme';

// the same night the splash opened on — the boot keeps the world continuous
const HERO = require('../../assets/art/splash-hero.png');

// Version comes from app.json at runtime — never hardcode it here.
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const SETUP_MS = 2600;

type Props = {
  /** first name of the locked coach — makes the setup feel personal */
  coachFirstName: string;
  onDone: () => void;
};

/**
 * Post-onboarding boot loader. Same cinematic shell as the intro splash,
 * but the status line makes clear what it's doing: setting up the coaches
 * and the season hub before the main app opens.
 */
export default function SetupLoaderScreen({ coachFirstName, onDone }: Props) {
  const [statusIdx, setStatusIdx] = useState(0);
  const { width: scrW, height: scrH } = useWindowDimensions();

  const statuses = useMemo(
    () => [
      'Setting up your coaches…',
      `Waking up ${coachFirstName}…`,
      'Preparing your season hub…',
      'Almost there, Player…',
    ],
    [coachFirstName],
  );

  const finishing = useRef(false);
  const finish = () => {
    if (!finishing.current) {
      finishing.current = true;
      onDone();
    }
  };

  const { AnimatedTextInput, animatedFillStyle, pctProps, loopProps, glowStyle } = useSplashAnimation({
    duration: SETUP_MS,
    onComplete: finish,
  });

  // rotate the status line as the bar advances
  useEffect(() => {
    const timers = [
      setTimeout(() => setStatusIdx(1), SETUP_MS * 0.3),
      setTimeout(() => setStatusIdx(2), SETUP_MS * 0.6),
      setTimeout(() => setStatusIdx(3), SETUP_MS * 0.88),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <View style={styles.root}>
      <GridBackground />

      {/* the splash's night, dimmed — booting feels like staying inside the
          same room, not a jump to a progress screen */}
      <RotatingArtImage sources={[HERO, require('../../assets/art/journey-tunnel.jpg'), require('../../assets/art/locker-room.jpg')]} style={{ position: 'absolute', width: scrW, height: scrH, opacity: 0.42 }} resizeMode="cover" />
      <PhotoVeil width={scrW} height={scrH} warmAt={{ x: scrW * 0.5, y: scrH * 0.34, r: scrW * 0.8 }} grain={0.05} />

      {/* what this loader is for — small kicker over the crest */}
      <Text style={styles.kicker}>SETTING UP THE MAIN APP</Text>

      <View style={styles.center}>
        <LogoMark size={132} loopProps={loopProps} glowStyle={glowStyle} />

        {/* thin HUD divider */}
        <View style={styles.dividerRow}>
          <View style={styles.divLine} />
          <View style={styles.divTick} />
          <View style={styles.divLine} />
        </View>

        {/* progress bar */}
        <View style={styles.track}>
          <Animated.View style={[styles.fill, animatedFillStyle]} />
        </View>

        {/* status row */}
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>{statuses[statusIdx]}</Text>
          <AnimatedTextInput
            style={styles.pctText}
            animatedProps={pctProps}
            editable={false}
            underlineColorAndroid="transparent"
          />
        </View>
      </View>

      <Text style={styles.footer}>PROSEASONACADEMY • VERSION {APP_VERSION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    position: 'absolute',
    top: 150,
    alignSelf: 'center',
    fontFamily: monoFont,
    fontSize: 7.5,
    letterSpacing: 3.4,
    color: 'rgba(143,184,155,0.65)',
  },
  center: {
    alignItems: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 34,
    marginBottom: 26,
    gap: 8,
  },
  divLine: {
    width: 52,
    height: 1,
    backgroundColor: 'rgba(57,255,106,0.22)',
  },
  divTick: {
    width: 5,
    height: 11,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(57,255,106,0.4)',
    borderRadius: 3,
  },
  track: {
    width: 252,
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(31,122,61,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.28)',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  statusRow: {
    width: 252,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    flexShrink: 1,
    fontFamily: monoFont,
    fontSize: 11.5,
    letterSpacing: 0.6,
    color: colors.muted,
    includeFontPadding: false,
  },
  pctText: {
    width: 46,
    marginLeft: 10,
    textAlign: 'right',
    fontFamily: monoFont,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.primary,
    textShadowColor: 'rgba(57,255,106,0.7)',
    textShadowRadius: 7,
  },
  footer: {
    position: 'absolute',
    bottom: 46,
    alignSelf: 'center',
    fontFamily: monoFont,
    fontSize: 8.5,
    letterSpacing: 3.2,
    color: 'rgba(143,184,155,0.5)',
  },
});
