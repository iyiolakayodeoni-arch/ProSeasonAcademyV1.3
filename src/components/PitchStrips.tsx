import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, {
  Rect,
  Defs,
  Pattern,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// PITCH STRIPS — the living green background. A full-bleed wall of football
// mowing stripes (alternating dark greens, like a freshly-cut pitch) under a
// faint arena grid and two slow aurora orbs. The whole thing breathes: the
// aurora drifts side to side and a cool spotlight glows, so the background
// never sits still — it just never gets loud enough to fight the content.
//
// Also doubles as the splash backdrop: pass `blurred` to soften it into a
// mysterious green haze that covers the entire screen.
// ─────────────────────────────────────────────────────────────────────────

const WEB = Platform.OS === 'web';
const STRIP_W = 46;

type Props = {
  style?: any;
  /** true → soften the whole thing into a blurred green haze (splash) */
  blurred?: boolean;
  /** extra dark scrim on top (0..1) — mystery, without killing the strips */
  dim?: number;
  /** keep the living aurora/grid (true) or a calm flat haze (false) */
  animated?: boolean;
};

export default function PitchStrips({ style, blurred = false, dim = 0.42, animated = true }: Props) {
  // ── the living drift — two cool orbs slide across the pitch, breathing ──
  const orbA = useSharedValue(0);
  const orbB = useSharedValue(0);
  const breathe = useSharedValue(0.5);
  useEffect(() => {
    if (!animated) return;
    orbA.value = withRepeat(withTiming(1, { duration: 24000, easing: Easing.inOut(Easing.sin) }), -1, true);
    orbB.value = withRepeat(withTiming(1, { duration: 30000, easing: Easing.inOut(Easing.sin) }), -1, true);
    breathe.value = withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [animated, orbA, orbB, breathe]);

  const orbAStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: orbA.value * 220 }, { scale: 1 + orbA.value * 0.35 }],
  }));
  const orbBStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: orbB.value * -180 }, { scale: 1 + orbB.value * 0.3 }],
  }));
  const breatheStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + breathe.value * 0.45,
  }));

  // web blurs with a plain CSS filter (cheap + reliable); native falls back to
  // a heavy scrim + slight scale so the strips read soft rather than sharp.
  const webFilter = blurred ? 'blur(18px) brightness(0.9)' : undefined;
  const nativeScale = blurred ? 1.12 : 1;

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        style,
        WEB && webFilter ? ({ filter: webFilter, transform: [{ scale: nativeScale }] } as any) : null,
      ]}
    >
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          {/* the mowing stripes — two greens, tiled across */}
          <Pattern id="psaStrips" width={STRIP_W * 2} height="100%" patternUnits="userSpaceOnUse">
            <Rect x={0} y={0} width={STRIP_W} height="100%" fill="#0a1f12" />
            <Rect x={STRIP_W} y={0} width={STRIP_W} height="100%" fill="#10301d" />
          </Pattern>

          {/* faint arena grid, preserved from the site language */}
          <Pattern id="psaGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <Rect width="48" height="48" fill="none" />
            <Rect x="47.5" y="0" width="0.5" height="48" fill="rgba(57,255,106,0.05)" />
            <Rect x="0" y="47.5" width="48" height="0.5" fill="rgba(57,255,106,0.05)" />
          </Pattern>

          <LinearGradient id="psaSheen" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#14331d" stopOpacity="0.55" />
            <Stop offset="0.5" stopColor="#0b2013" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#14331d" stopOpacity="0.55" />
          </LinearGradient>

          <RadialGradient id="psaAuroraA" cx="82%" cy="0%" r="78%">
            <Stop offset="0%" stopColor="rgba(57,255,106,0.14)" stopOpacity={1} />
            <Stop offset="100%" stopColor="rgba(57,255,106,0)" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="psaAuroraB" cx="10%" cy="100%" r="70%">
            <Stop offset="0%" stopColor="rgba(242,192,120,0.07)" stopOpacity={1} />
            <Stop offset="100%" stopColor="rgba(242,192,120,0)" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* stripes base */}
        <Rect width="100%" height="100%" fill="url(#psaStrips)" />
        {/* horizontal sheen — softens the banding */}
        <Rect width="100%" height="100%" fill="url(#psaSheen)" />
        {/* faint grid */}
        <Rect width="100%" height="100%" fill="url(#psaGrid)" />
        {/* aurora orbs */}
        <Rect width="100%" height="100%" fill="url(#psaAuroraA)" />
        <Rect width="100%" height="100%" fill="url(#psaAuroraB)" />
      </Svg>

      {/* ── the living glow — two cool orbs drifting and breathing ── */}
      {animated && (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, breatheStyle, styles.breathe]} />
          <Animated.View style={[styles.orbA, orbAStyle]} />
          <Animated.View style={[styles.orbB, orbBStyle]} />
        </>
      )}

      {/* ── dark scrim for depth / mystery ── */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(4,8,5,${dim})` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  breathe: {
    // a broad soft green veil that slowly swells
    backgroundColor: 'rgba(57,255,106,0.06)',
  },
  orbA: {
    position: 'absolute',
    top: '-25%',
    bottom: '-25%',
    width: 500,
    left: -160,
    borderRadius: 999,
    backgroundColor: 'rgba(57,255,106,0.05)',
  } as any,
  orbB: {
    position: 'absolute',
    top: '5%',
    bottom: '5%',
    width: 340,
    right: -120,
    borderRadius: 999,
    backgroundColor: 'rgba(242,192,120,0.04)',
  } as any,
});
