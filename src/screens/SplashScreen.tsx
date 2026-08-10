import React, { Component, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton';
import {
  Barlow_500Medium,
  Barlow_500Medium_Italic,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_800ExtraBold,
} from '@expo-google-fonts/barlow';
import { useSplashAnimation } from '../hooks/useSplashAnimation';
import InfinityCrest from '../components/InfinityCrest';
import PitchBackdrop from '../components/PitchBackdrop';
import { useResponsive } from '../hooks/useResponsive';
import { colors, monoFont } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// SPLASH — the infinity-crest pitch opening. A dimmed, blurred football
// pitch fills the stage; the animated InfinityCrest breathes at centre with
// a pulsing green glow, and the real loader sits below it.
//
// The honest gate is unchanged: progress is real, the bar holds at 90%
// until the fonts land, and onFinish fires exactly once.
//
// GPU safety: the crest renders through plain vector SVG — it never needs
// the Skia/CanvasKit pipeline — and it is additionally wrapped in a
// fail-soft boundary: if the animated mark ever fails to draw, a static
// crest takes its place so the splash (and the boot) can never deadlock.
// ─────────────────────────────────────────────────────────────────────────

// Minimum time the splash stays up, so the animation always finishes
// even when there is nothing heavy to preload yet.
const MIN_SPLASH_MS = 2600;

// the lemniscate path — mirrored from InfinityCrest for the static fallback
const CREST_D =
  'M60 30 C60 10 30 10 30 30 C30 50 60 50 60 30 C60 50 90 50 90 30 C90 10 60 10 60 30 Z';

/** The safe fallback — a still vector crest, no animation, no GPU demand. */
function StaticCrest({ size }: { size: number }) {
  return (
    <Svg width={size} height={size * 0.5} viewBox="0 0 120 60">
      <Path
        d={CREST_D}
        fill="none"
        stroke="rgba(57,255,106,0.3)"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <Path d={CREST_D} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

/** Fail-soft wrapper: animated crest in, static crest out — never a hole. */
class SafeCrest extends Component<{ size: number }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.warn('[psa] splash crest fell back to the static mark', error);
  }

  render() {
    return this.state.failed ? (
      <StaticCrest size={this.props.size} />
    ) : (
      <InfinityCrest size={this.props.size} />
    );
  }
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

  // Responsive crest: phones get a compact mark, wide screens a broadcast one.
  const { w } = useResponsive();
  const crestSize = Math.round(Math.min(400, Math.max(190, w * 0.38)));

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

  // The green halo behind the crest — breathing in and out, forever.
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    return () => {
      cancelAnimation(pulse);
    };
  }, [pulse]);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + pulse.value * 0.5,
    transform: [{ scale: 0.92 + pulse.value * 0.12 }],
  }));
  const glowW = Math.round(crestSize * 1.7);
  const glowH = Math.round(crestSize * 1.05);

  return (
    <View style={styles.stage}>
      {/* the pitch — dimmed and blurred so the crest owns the stage */}
      <PitchBackdrop blurred dim={0.72} />
      {/* one more veil of dark between the photograph and the mark */}
      <View style={styles.veil} pointerEvents="none" />

      <View style={styles.content}>
        {/* ── the crest, centred ── */}
        <View style={styles.crestWrap}>
          <View style={styles.crestBlock}>
            <Animated.View
              pointerEvents="none"
              style={[styles.crestGlow, glowStyle, { width: glowW, height: glowH }]}
            >
              <Svg width={glowW} height={glowH} style={StyleSheet.absoluteFill}>
                <Defs>
                  <RadialGradient id="splashCrestGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor="rgba(57,255,106,0.5)" stopOpacity={0.6} />
                    <Stop offset="55%" stopColor="rgba(57,255,106,0.22)" stopOpacity={0.32} />
                    <Stop offset="100%" stopColor="rgba(57,255,106,0)" stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#splashCrestGlow)" />
              </Svg>
            </Animated.View>
            <SafeCrest size={crestSize} />
          </View>
        </View>

        {/* ── the loader — real progress, same gate as before ── */}
        <View style={styles.loader}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, animatedFillStyle]} />
          </View>
          <View style={styles.statusRow}>
            <AnimatedTextInput
              style={styles.pctText}
              animatedProps={pctProps}
              editable={false}
              underlineColorAndroid="transparent"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  veil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(1,4,2,0.42)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
  },
  crestWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crestBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestGlow: {
    position: 'absolute',
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
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  pctText: {
    width: 48,
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
});
