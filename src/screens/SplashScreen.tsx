import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Canvas, Rect, Circle, Fill, LinearGradient, RadialGradient, FractalNoise, vec } from '@shopify/react-native-skia';
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
import LogoMark from '../components/LogoMark';
import { colors, monoFont, displayFont, bodyFontStrong, bodyFontItalic } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// SPLASH v2 (visual POC) — the same gate/article as v1 (progress is real,
// the bar holds at 90% until fonts land, onFinish fires once) wearing a
// human skin: real photography, GPU-rendered light via Skia, film grain,
// and a two-voice type system. Monospace is kept for what it truly is —
// the ledger: the % readout and the version stamp.
// ─────────────────────────────────────────────────────────────────────────

// Version comes from app.json at runtime — never hardcode it here.
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
// Minimum time the splash stays up, so the animation always finishes
// even when there is nothing heavy to preload yet.
const MIN_SPLASH_MS = 2300;

const HERO = require('../../assets/art/splash-hero.png');

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const { width: w, height: h } = useWindowDimensions();

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

  // the crest's ascent trail — draws on and off while the bar earns its fill
  const { loopProps, glowStyle } = useTrailLoop({ pathLength: LOOP_PATH_LENGTH, drawMs: 1700, eraseMs: 1700 });

  // Ken Burns drift on the photograph — 5.6s ease-out, barely perceptible.
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withTiming(1, { duration: 5600, easing: Easing.out(Easing.quad) });
  }, [drift]);
  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1.04 + drift.value * 0.06 }, { translateY: -6 * drift.value }],
  }));

  // The words only appear once their real faces are on the device.
  const ink = useSharedValue(0);
  useEffect(() => {
    if (fontsLoaded) ink.value = withTiming(1, { duration: 520 });
  }, [fontsLoaded, ink]);
  const inkStyle = useAnimatedStyle(() => ({ opacity: ink.value }));

  return (
    <View style={styles.stage}>
      {/* phone-like column on wide screens (web preview), full-bleed on phones */}
      <View style={styles.frame}>
        <Animated.Image source={HERO} style={[styles.photo, photoStyle]} resizeMode="cover" />

        {/* GPU-rendered atmosphere: scrims + light + grain (one static pass) */}
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* legibility scrim, rising from the floor */}
          <Rect x={0} y={0} width={w} height={h}>
            <LinearGradient
              start={vec(0, h * 0.36)}
              end={vec(0, h * 0.95)}
              colors={['rgba(10,15,10,0)', 'rgba(10,15,10,0.55)', 'rgba(10,15,10,0.97)']}
              positions={[0, 0.58, 1]}
            />
          </Rect>
          {/* soft darkening at the very top for the status/notch area */}
          <Rect x={0} y={0} width={w} height={h}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, h * 0.22)}
              colors={['rgba(10,15,10,0.62)', 'rgba(10,15,10,0)']}
            />
          </Rect>
          {/* emerald halo the wordmark sits inside */}
          <Circle cx={w / 2} cy={h * 0.3} r={w * 0.66}>
            <RadialGradient
              c={vec(w / 2, h * 0.3)}
              r={w * 0.66}
              colors={['rgba(57,255,106,0.15)', 'rgba(57,255,106,0)']}
            />
          </Circle>
          {/* warm kiss from the floodlight, upper right where the photo's lamp is */}
          <Circle cx={w * 0.72} cy={h * 0.3} r={w * 0.52}>
            <RadialGradient
              c={vec(w * 0.72, h * 0.3)}
              r={w * 0.52}
              colors={['rgba(242,192,120,0.09)', 'rgba(242,192,120,0)']}
            />
          </Circle>
          {/* film grain — irregularity is what photographs have and terminals don't */}
          <Fill blendMode="overlay" opacity={0.06}>
            <FractalNoise freqX={0.9} freqY={0.9} octaves={3} seed={11} />
          </Fill>
        </Canvas>

        <View style={styles.content}>
          {/* ── the crest + the wordmark, in the dark sky of the photograph ── */}
          <Animated.View style={[styles.masthead, inkStyle]}>
            <LogoMark size={64} loopProps={loopProps} glowStyle={glowStyle} />
            <Text style={[styles.wordmark, { marginTop: 14 }]}>PROSEASON</Text>
            <Text style={[styles.wordmark, styles.wordmarkAccent]}>ACADEMY</Text>
            <View style={styles.rule} />
            <Text style={styles.tagline}>SEE YOURSELF CLEARLY. DO THE WORK.</Text>
          </Animated.View>

          <View style={styles.spacer} />

          {/* ── the loader — real progress, same gate as v1 ── */}
          <View style={styles.loader}>
            <View style={styles.track}>
              <Animated.View style={[styles.fill, animatedFillStyle]} />
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusText}>Almost there, Player…</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
  },
  masthead: {
    marginTop: 92,
  },
  wordmark: {
    fontFamily: displayFont,
    fontSize: 52,
    lineHeight: 50,
    letterSpacing: 1,
    color: colors.fg,
    textTransform: 'uppercase',
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
    color: 'rgba(238,242,236,0.78)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  spacer: { flex: 1 },
  loader: {
    paddingBottom: 74,
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
