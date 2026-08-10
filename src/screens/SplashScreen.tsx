import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton';
import {
  Barlow_500Medium,
  Barlow_500Medium_Italic,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_800ExtraBold,
} from '@expo-google-fonts/barlow';
import { useSplashAnimation } from '../hooks/useSplashAnimation';
import LogoMark from '../components/LogoMark';
import { colors, monoFont, displayFont, bodyFontStrong, bodyFontItalic } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// SPLASH — the blackout intro. A totally black stage — no photography, no
// atmosphere, nothing competing with the crest. The crest + wordmark sit
// center-stage like a broadcast ident, and the loader below is the only
// motion. The honest gate is unchanged: progress is real, the bar holds
// at 90% until fonts land, onFinish fires once.
// ─────────────────────────────────────────────────────────────────────────

// Version comes from app.json at runtime — never hardcode it here.
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
// Minimum time the splash stays up, so the animation always finishes
// even when there is nothing heavy to preload yet.
const MIN_SPLASH_MS = 2600;

/** One line of the title card — fades and rises once the faces are ready. */
function Reveal({
  ready,
  delay = 0,
  distance = 18,
  children,
}: {
  ready: boolean;
  delay?: number;
  distance?: number;
  children?: React.ReactNode;
}) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!ready) return;
    v.value = withDelay(delay, withTiming(1, { duration: 680, easing: Easing.out(Easing.cubic) }));
  }, [ready, delay, v]);
  const s = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * distance }],
  }));
  return <Animated.View style={s}>{children}</Animated.View>;
}

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [fontsLoaded, fontError] = useFonts({
    Anton_400Regular,
    Barlow_500Medium,
    Barlow_500Medium_Italic,
    Barlow_600SemiBold,
    Barlow_700Bold,
    Barlow_800ExtraBold,
  });

  // Deferred gate the animation hook waits on (fonts or bust — never hang).
  const gate = useRef<{ promise: Promise<unknown>; resolve: () => void } | null>(null);
  if (!gate.current) {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    gate.current = { promise, resolve };
  }
  const gatePromise = gate.current.promise;
  useEffect(() => {
    if (fontsLoaded || fontError) gate.current?.resolve();
  }, [fontsLoaded, fontError]);

  const finishing = useRef(false);
  const finish = () => {
    if (!finishing.current) {
      finishing.current = true;
      onFinish();
    }
  };

  const { AnimatedTextInput, animatedFillStyle, pctProps } = useSplashAnimation({
    duration: MIN_SPLASH_MS,
    waitFor: gatePromise,
    onComplete: finish,
  });

  return (
    <View style={styles.stage}>
      <View style={styles.content}>
        {/* ── the crest + the wordmark, as a broadcast ident on pure black ── */}
        <View style={styles.mastheadWrap}>
          <View style={styles.masthead}>
            <Reveal ready={fontsLoaded} delay={60}>
              <LogoMark size={84} />
            </Reveal>
            <Reveal ready={fontsLoaded} delay={200}>
              <Text style={styles.wordmark}>PROSEASON</Text>
            </Reveal>
            <Reveal ready={fontsLoaded} delay={340}>
              <Text style={[styles.wordmark, styles.wordmarkAccent]}>ACADEMY</Text>
            </Reveal>
            <Reveal ready={fontsLoaded} delay={500}>
              <View style={styles.rule} />
            </Reveal>
            <Reveal ready={fontsLoaded} delay={620}>
              <Text style={styles.tagline}>THE CONSOLE COACHING ACADEMY</Text>
            </Reveal>
            <Reveal ready={fontsLoaded} delay={740}>
              <Text style={styles.taglineSub}>ESPORTS-GRADE REVIEW · ONE MATCH AT A TIME</Text>
            </Reveal>
          </View>
        </View>

        {/* ── the loader — real progress, same gate as before ── */}
        <View style={styles.loader}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, animatedFillStyle]} />
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>Loading the academy…</Text>
            <AnimatedTextInput
              style={styles.pctText}
              animatedProps={pctProps}
              editable={false}
              underlineColorAndroid="transparent"
            />
          </View>
        </View>
      </View>

      <Text style={styles.footer}>PROSEASONACADEMY • VERSION {APP_VERSION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
  },
  mastheadWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  masthead: {
    alignItems: 'center',
    alignSelf: 'center',
  },
  wordmark: {
    marginTop: 14,
    fontFamily: displayFont,
    fontSize: 52,
    lineHeight: 50,
    letterSpacing: 1,
    color: colors.fg,
    textTransform: 'uppercase',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  wordmarkAccent: {
    color: colors.primary,
    letterSpacing: 4.5,
  },
  rule: {
    width: 34,
    height: 2,
    marginTop: 18,
    marginBottom: 12,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
  tagline: {
    fontFamily: bodyFontStrong,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.primary,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  taglineSub: {
    marginTop: 8,
    fontFamily: bodyFontStrong,
    fontSize: 8.5,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: 'rgba(238,242,236,0.72)',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  loader: {
    paddingBottom: 74,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
  },
  track: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(238,242,236,0.13)',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.85,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  statusRow: {
    marginTop: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    flexShrink: 1,
    fontFamily: bodyFontItalic,
    fontSize: 13.5,
    letterSpacing: 0.3,
    color: 'rgba(238,242,236,0.72)',
    includeFontPadding: false,
  },
  pctText: {
    width: 48,
    marginLeft: 10,
    padding: 0,
    textAlign: 'right',
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.primary,
    textShadowColor: 'rgba(57,255,106,0.6)',
    textShadowRadius: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 26,
    alignSelf: 'center',
    fontFamily: monoFont,
    fontSize: 8.5,
    letterSpacing: 3.2,
    color: 'rgba(143,184,155,0.55)',
  },
});
