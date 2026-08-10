import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

// ─────────────────────────────────────────────────────────────────────────
// THE INFINITY CREST — Onliversity's broken infinity, premium build.
//
// One continuous loop, amber dot at the crossing (the interruption
// point). The core line wears a phosphor→ice→phosphor gradient; bloom is
// stacked strokes from a 20px whisper up to the core, so the mark glows
// like neon glass on any renderer — no filters, no animation libraries.
// The living pulse is a CSS class on the wrapper (psa-crest-pulse) and
// degrades to a calm static mark where unsupported. Transparent
// background: the crest sits directly on the backdrop, nothing behind it.
// ─────────────────────────────────────────────────────────────────────────

const GREEN = '#39ff6a';
const ICE = '#bafff0';
const AMBER = '#f2c078';

/** One continuous figure-eight. */
const INFINITY_PATH =
  'M 132 44 ' +
  'C 148 24, 186 24, 198 60 ' +
  'C 186 96, 148 96, 120 60 ' +
  'C 92 24, 54 24, 42 60 ' +
  'C 54 96, 92 96, 108 76';

type Props = {
  size?: number;
};

export default function InfinityCrest({ size = 160 }: Props) {
  const h = size / 2; // viewBox 240x120 ratio

  return (
    <View {...({ className: 'psa-crest-pulse' } as any)} style={{ width: size, height: h }}>
      <Svg width={size} height={h} viewBox="0 0 240 120" fill="none">
        <Defs>
          <LinearGradient id="psa-crest-grad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={GREEN} />
            <Stop offset="0.5" stopColor={ICE} />
            <Stop offset="1" stopColor={GREEN} />
          </LinearGradient>
          <LinearGradient id="psa-crest-amber" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#ffe3b0" />
            <Stop offset="1" stopColor={AMBER} />
          </LinearGradient>
        </Defs>

        {/* bloom — wide whispers under the core */}
        <Path d={INFINITY_PATH} stroke={GREEN} strokeWidth={22} strokeOpacity={0.05} strokeLinecap="round" />
        <Path d={INFINITY_PATH} stroke={GREEN} strokeWidth={14} strokeOpacity={0.10} strokeLinecap="round" />
        <Path d={INFINITY_PATH} stroke={GREEN} strokeWidth={8} strokeOpacity={0.22} strokeLinecap="round" />
        {/* the quiet base line */}
        <Path d={INFINITY_PATH} stroke={GREEN} strokeWidth={3.5} strokeOpacity={0.42} strokeLinecap="round" />
        {/* the bright core — phosphor→ice→phosphor */}
        <Path d={INFINITY_PATH} stroke="url(#psa-crest-grad)" strokeWidth={4.5} strokeLinecap="round" />

        {/* the interruption point — amber, softly haloed */}
        <Circle cx={120} cy={60} r={16} fill={AMBER} opacity={0.10} />
        <Circle cx={120} cy={60} r={10.5} fill={AMBER} opacity={0.18} />
        <Circle cx={120} cy={60} r={6.5} fill="url(#psa-crest-amber)" opacity={0.95} />
        <Circle cx={118} cy={58} r={2.2} fill="#fff7e8" opacity={0.9} />
      </Svg>
    </View>
  );
}
