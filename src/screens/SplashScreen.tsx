import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  Canvas,
  Rect,
  Circle,
  Fill,
  Group,
  LinearGradient,
  RadialGradient,
  FractalNoise,
  vec,
} from '@shopify/react-native-skia';
import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton';
import {
  Barlow_500Medium,
  Barlow_500Medium_Italic,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_800ExtraBold,
} from '@expo-google-fonts/barlow';
import { useSplashAnimation, LOOP_PATH_LENGTH } from '../hooks/useSplashAnimation';
import { useTrailLoop } from '../hooks/useTrailLoop';
import InfinityCrest from '../components/InfinityCrest';
import { colors, monoFont, bodyFontItalic } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// SPLASH v4 — the first impression. Two actors on a dimmed stage: the
// infinity crest and the loading bar. The arena photograph sinks into
// near-black behind them; the crest draws its own trail in and out while
// the bar earns its fill. No wordmark, no taglines — restraint is the
// cinema here.
// ─────────────────────────────────────────────────────────────────────────

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const MIN_SPLASH_MS = 2600;

const HERO_PORTRAIT = require('../../assets/art/splash-hero.png');
const HERO_WIDE = require('../../assets/art/splash-hero-wide.png');

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [frame, setFrame] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const w = frame.w;
  const h = frame.h;
  const isWideFrame = w > h * 1.05;

  const [fontsLoaded, fontError] = useFonts({
    Anton_400Regular,
    Barlow_500Medium,
    Barlow_500Medium_Italic,
    Barlow_600SemiBold,
    Barlow_700Bold,
    Barlow_800ExtraBold,
  });

  // Deferred gate (fonts or bust — never hang).
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

  // the crest's living trail — draws on and off while the bar earns its fill
  const trail = useTrailLoop({ pathLength: LOOP_PATH_LENGTH, drawMs: 1700, eraseMs: 1700 });

  // ── the camera: a slow dolly-in on the dimmed photograph.
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withTiming(1, { duration: 7200, easing: Easing.out(Easing.quad) });
  }, [drift]);
  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1.08 + drift.value * 0.1 }, { translateY: -8 * drift.value }],
  }));

  // ── the crest arrives: bloom in from darkness, settle at full presence.
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [enter]);
  const crestStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: 0.86 + 0.14 * enter.value }],
  }));

  // ── the floodlight breathes — dim, behind everything.
  const breath = useSharedValue(0.06);
  useEffect(() => {
    breath.value = withTiming(0.1, { duration: 2600, easing: Easing.inOut(Easing.sin) });
  }, [breath]);

  return (
    <View
      style={styles.stage}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && (width !== frame.w || height !== frame.h)) {
          setFrame({ w: width, h: height });
        }
      }}
    >
      {/* the arena, sunk into darkness */}
      <Animated.Image
        source={isWideFrame ? HERO_WIDE : HERO_PORTRAIT}
        style={[styles.photo, photoStyle]}
        resizeMode="cover"
      />
      <View style={styles.dim} />

      {/* GPU atmosphere, measured to the real frame — quiet now */}
      {w > 0 && h > 0 && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* floor scrim */}
          <Rect x={0} y={0} width={w} height={h}>
            <LinearGradient
              start={vec(0, h * 0.4)}
              end={vec(0, h * 0.98)}
              colors={['rgba(4,8,5,0)', 'rgba(4,8,5,0.72)', 'rgba(4,8,5,0.96)']}
              positions={[0, 0.6, 1]}
            />
          </Rect>
          {/* top scrim */}
          <Rect x={0} y={0} width={w} height={h}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, h * 0.26)}
              colors={['rgba(4,8,5,0.7)', 'rgba(4,8,5,0)']}
            />
          </Rect>
          {/* emerald halo behind the crest — restrained */}
          <Circle cx={w / 2} cy={h * 0.42} r={Math.min(w, h) * 0.5}>
            <RadialGradient
              c={vec(w / 2, h * 0.42)}
              r={Math.min(w, h) * 0.5}
              colors={['rgba(57,255,106,0.10)', 'rgba(57,255,106,0)']}
            />
          </Circle>
          {/* warm kiss, breathing */}
          <Group opacity={breath}>
            <Circle cx={w * 0.74} cy={h * 0.26} r={w * 0.5}>
              <RadialGradient
                c={vec(w * 0.74, h * 0.26)}
                r={w * 0.5}
                colors={['rgba(242,192,120,1)', 'rgba(242,192,120,0)']}
              />
            </Circle>
          </Group>
          {/* film grain */}
          <Fill blendMode="overlay" opacity={0.05}>
            <FractalNoise freqX={0.9} freqY={0.9} octaves={3} seed={11} />
          </Fill>
        </Canvas>
      )}

      {/* ── the two actors ── */}
      <View style={styles.content}>
        <View style={styles.crestZone}>
          <Animated.View style={[crestStyle, styles.crestWrap]}>
            <InfinityCrest size={isWideFrame ? 190 : 150} trail={trail} />
          </Animated.View>
        </View>

        {/* the bar — real progress, same honest gate */}
        <View style={[styles.loader, isWideFrame && styles.loaderWide]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: '#020503',
    overflow: 'hidden',
  },
  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // the dim — the arena becomes texture, not subject
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2,5,3,0.78)',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  crestZone: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crestWrap: {
    shadowColor: colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 0 },
  },
  loader: {
    width: '100%',
    paddingBottom: 84,
  },
  loaderWide: {
    maxWidth: 520,
  },
  track: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(238,242,236,0.12)',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.85,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  statusRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    flexShrink: 1,
    fontFamily: bodyFontItalic,
    fontSize: 12.5,
    letterSpacing: 0.4,
    color: 'rgba(238,242,236,0.55)',
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
});
