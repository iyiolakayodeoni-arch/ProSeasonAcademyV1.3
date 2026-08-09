import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
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
import LogoMark from '../components/LogoMark';
import { colors, monoFont, displayFont, bodyFontStrong, bodyFontItalic } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// SPLASH v3 — full-bleed and cinematic. The same honest gate as before
// (progress is real, the bar holds at 90% until fonts land, onFinish fires
// once) wearing an establishing-shot skin: a landscape arena on wide
// viewports, the portrait hero on phones, a slow dolly-in camera, staggered
// title-card reveals, scrims measured to the real frame, and a floodlight
// that breathes.
// ─────────────────────────────────────────────────────────────────────────

// Version comes from app.json at runtime — never hardcode it here.
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
// Minimum time the splash stays up, so the animation always finishes
// even when there is nothing heavy to preload yet.
const MIN_SPLASH_MS = 2600;

const HERO_PORTRAIT = require('../../assets/art/splash-hero.png');
const HERO_WIDE = require('../../assets/art/splash-hero-wide.png');

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
  // Measure the real frame — the Skia scrims must line up with what the
  // player actually sees, on any viewport.
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

  // ── the camera: a slow dolly-in on the photograph. 7.2s, ease-out — the
  //    arena breathes toward the player instead of snapping at them.
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withTiming(1, { duration: 7200, easing: Easing.out(Easing.quad) });
  }, [drift]);
  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1.08 + drift.value * 0.1 }, { translateY: -8 * drift.value }],
  }));

  // ── the floodlight breathes — a slow sine on the warm halo's opacity.
  const breath = useSharedValue(0.09);
  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(0.17, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.09, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
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
      {/* Full-bleed — the arena owns every pixel of the viewport. */}
      <Animated.Image
        source={isWideFrame ? HERO_WIDE : HERO_PORTRAIT}
        style={[styles.photo, photoStyle]}
        resizeMode="cover"
      />

      {/* GPU-rendered atmosphere measured to the real frame */}
      {w > 0 && h > 0 && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* legibility scrim, rising from the floor — deeper for wide */}
          <Rect x={0} y={0} width={w} height={h}>
            <LinearGradient
              start={vec(0, h * (isWideFrame ? 0.28 : 0.36))}
              end={vec(0, h * 0.96)}
              colors={['rgba(10,15,10,0)', 'rgba(10,15,10,0.6)', 'rgba(10,15,10,0.97)']}
              positions={[0, 0.58, 1]}
            />
          </Rect>
          {/* soft darkening at the very top for the status/notch area */}
          <Rect x={0} y={0} width={w} height={h}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, h * 0.24)}
              colors={['rgba(10,15,10,0.66)', 'rgba(10,15,10,0)']}
            />
          </Rect>
          {/* anamorphic side vignette on wide — the frame pulls in */}
          {isWideFrame && (
            <Rect x={0} y={0} width={w * 0.24} height={h}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(w * 0.24, 0)}
                colors={['rgba(4,8,5,0.55)', 'rgba(4,8,5,0)']}
              />
            </Rect>
          )}
          {isWideFrame && (
            <Rect x={w * 0.76} y={0} width={w * 0.24} height={h}>
              <LinearGradient
                start={vec(w, 0)}
                end={vec(w * 0.76, 0)}
                colors={['rgba(4,8,5,0.55)', 'rgba(4,8,5,0)']}
              />
            </Rect>
          )}
          {/* emerald halo the wordmark sits inside */}
          <Circle cx={w / 2} cy={h * 0.32} r={w * 0.66}>
            <RadialGradient
              c={vec(w / 2, h * 0.32)}
              r={w * 0.66}
              colors={['rgba(57,255,106,0.14)', 'rgba(57,255,106,0)']}
            />
          </Circle>
          {/* warm kiss from the floodlight — slow-breathing */}
          <Group opacity={breath}>
            <Circle cx={w * 0.72} cy={h * 0.3} r={w * 0.52}>
              <RadialGradient
                c={vec(w * 0.72, h * 0.3)}
                r={w * 0.52}
                colors={['rgba(242,192,120,1)', 'rgba(242,192,120,0)']}
              />
            </Circle>
          </Group>
          {/* film grain — irregularity is what photographs have and terminals don't */}
          <Fill blendMode="overlay" opacity={0.06}>
            <FractalNoise freqX={0.9} freqY={0.9} octaves={3} seed={11} />
          </Fill>
        </Canvas>
      )}

      <View style={[styles.content, isWideFrame && styles.contentWide]}>
        {/* ── the crest + the wordmark, as a film title card ── */}
        <View style={[styles.masthead, isWideFrame && styles.mastheadWide]}>
          <Reveal ready={fontsLoaded} delay={60}>
            <LogoMark size={isWideFrame ? 76 : 64} loopProps={loopProps} glowStyle={glowStyle} />
          </Reveal>
          <Reveal ready={fontsLoaded} delay={200}>
            <Text style={[styles.wordmark, isWideFrame && styles.wordmarkWide]}>PROSEASON</Text>
          </Reveal>
          <Reveal ready={fontsLoaded} delay={340}>
            <Text style={[styles.wordmark, styles.wordmarkAccent, isWideFrame && styles.wordmarkWide]}>
              ACADEMY
            </Text>
          </Reveal>
          <Reveal ready={fontsLoaded} delay={500}>
            <View style={styles.rule} />
          </Reveal>
          <Reveal ready={fontsLoaded} delay={620}>
            <Text style={[styles.tagline, isWideFrame && styles.centered]}>THE CONSOLE COACHING ACADEMY</Text>
          </Reveal>
          <Reveal ready={fontsLoaded} delay={740}>
            <Text style={[styles.taglineSub, isWideFrame && styles.centered]}>
              ESPORTS-GRADE REVIEW · ONE MATCH AT A TIME
            </Text>
          </Reveal>
        </View>

        <View style={styles.spacer} />

        {/* ── the loader — real progress, same gate as before ── */}
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
  contentWide: {
    paddingHorizontal: 48,
  },
  masthead: {
    marginTop: 92,
    alignItems: 'flex-start',
  },
  mastheadWide: {
    // film title card — centered on the wide establishing shot
    marginTop: 110,
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
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  wordmarkWide: {
    fontSize: 84,
    lineHeight: 80,
    letterSpacing: 2,
    textAlign: 'center',
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
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  centered: { textAlign: 'center' },
  spacer: { flex: 1 },
  loader: {
    paddingBottom: 74,
  },
  loaderWide: {
    // the rail sits in a measured column, not stretched across a 1440p hall
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
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
