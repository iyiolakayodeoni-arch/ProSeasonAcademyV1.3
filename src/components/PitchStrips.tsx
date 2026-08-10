import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, {
  Rect,
  Defs,
  Pattern,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { colors } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// PITCH LINES — the calm green background. A dark pitch washed with thin
// green mowing lines (fine hairlines, not bold stripes) and a faint arena
// grid. It is intentionally STILL — the background never moves. Life lives
// in the foreground elements, never behind them.
//
// Also doubles as the splash backdrop: pass `blurred` to soften it into a
// mysterious green haze that covers the entire screen.
// ─────────────────────────────────────────────────────────────────────────

const WEB = Platform.OS === 'web';
const LINE_W = 56; // gap between thin lines

type Props = {
  style?: any;
  /** true → soften the whole thing into a blurred green haze (splash) */
  blurred?: boolean;
  /** extra dark scrim on top (0..1) — mystery, without killing the lines */
  dim?: number;
};

export default function PitchStrips({ style, blurred = false, dim = 0.42 }: Props) {
  // web blurs with a plain CSS filter (cheap + reliable); native falls back to
  // a heavy scrim + slight scale so the lines read soft rather than sharp.
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
          {/* thin green mowing lines — a dark base with fine hairlines */}
          <Pattern id="psaLines" width={LINE_W} height="100%" patternUnits="userSpaceOnUse">
            <Rect x={0} y={0} width={LINE_W} height="100%" fill="#08130b" />
            <Rect x={LINE_W - 3} y={0} width="3" height="100%" fill="rgba(57,255,106,0.10)" />
          </Pattern>

          {/* faint arena grid, preserved from the site language */}
          <Pattern id="psaGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <Rect width="48" height="48" fill="none" />
            <Rect x="47.5" y="0" width="0.5" height="48" fill="rgba(57,255,106,0.045)" />
            <Rect x="0" y="47.5" width="48" height="0.5" fill="rgba(57,255,106,0.045)" />
          </Pattern>

          <LinearGradient id="psaSheen" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#0f2415" stopOpacity="0.5" />
            <Stop offset="0.5" stopColor="#07110a" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#0f2415" stopOpacity="0.5" />
          </LinearGradient>

          <RadialGradient id="psaAuroraA" cx="82%" cy="0%" r="78%">
            <Stop offset="0%" stopColor="rgba(57,255,106,0.08)" stopOpacity={1} />
            <Stop offset="100%" stopColor="rgba(57,255,106,0)" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="psaAuroraB" cx="10%" cy="100%" r="70%">
            <Stop offset="0%" stopColor="rgba(242,192,120,0.04)" stopOpacity={1} />
            <Stop offset="100%" stopColor="rgba(242,192,120,0)" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* thin green lines base */}
        <Rect width="100%" height="100%" fill="url(#psaLines)" />
        {/* horizontal sheen — softens the banding */}
        <Rect width="100%" height="100%" fill="url(#psaSheen)" />
        {/* faint grid */}
        <Rect width="100%" height="100%" fill="url(#psaGrid)" />
        {/* subtle aurora, static */}
        <Rect width="100%" height="100%" fill="url(#psaAuroraA)" />
        <Rect width="100%" height="100%" fill="url(#psaAuroraB)" />
      </Svg>

      {/* ── dark scrim for depth / mystery ── */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(4,8,5,${dim})` }]} />
    </View>
  );
}
