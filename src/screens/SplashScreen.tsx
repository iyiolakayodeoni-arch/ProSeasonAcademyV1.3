import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as NativeSplash from 'expo-splash-screen';
import Constants from 'expo-constants';
import Animated from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import LogoMark from '../components/LogoMark';
import { useSplashAnimation } from '../hooks/useSplashAnimation';
import { colors, monoFont } from '../theme';

// Version comes from app.json at runtime — never hardcode it here.
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
// Minimum time the splash stays up, so the animation always finishes
// even when there is nothing heavy to preload yet.
const MIN_SPLASH_MS = 2300;

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const finishing = useRef(false);
  const finish = () => {
    if (!finishing.current) {
      finishing.current = true;
      onFinish();
    }
  };

  const { AnimatedTextInput, animatedFillStyle, pctProps, loopProps, glowStyle } = useSplashAnimation({
    duration: MIN_SPLASH_MS,
    // plug real init later: waitFor={Promise.all([loadFonts(), checkAuthSession()])}
    onComplete: finish,
  });

  useEffect(() => {
    // JS is up and the first frame is rendered — release the native splash.
    NativeSplash.hideAsync().catch(() => {});
  }, []);

  return (
    <View style={styles.root}>
      <GridBackground />

      {/* crest + looping journey trail */}
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
          <Text style={styles.statusText}>Almost there, Player...</Text>
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
