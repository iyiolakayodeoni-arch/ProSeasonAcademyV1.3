import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

// ─────────────────────────────────────────────────────────────────────────
// THE INFINITY CREST — Onliversity's broken infinity, rebuilt as crisp SVG.
//
// One continuous loop with the amber dot resting at the crossing — the
// interruption point. Bloom is faked with stacked strokes (wide-dim →
// core) so it renders identically on web and native with no filters and
// no animation libraries: the living pulse comes from a CSS class on the
// wrapper (psa-crest-pulse), which degrades to a calm static mark
// anywhere the class doesn't exist.
// ─────────────────────────────────────────────────────────────────────────

const GREEN = '#39ff6a';
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

export default function InfinityCrest({ size = 140 }: Props) {
  const h = size / 2; // viewBox 240x120 ratio

  return (
    <View {...({ className: 'psa-crest-pulse' } as any)} style={{ width: size, height: h }}>
      <Svg width={size} height={h} viewBox="0 0 240 120" fill="none">
        {/* bloom layers — wide & dim under the core line */}
        <Path d={INFINITY_PATH} stroke={GREEN} strokeWidth={14} strokeOpacity={0.10} strokeLinecap="round" />
        <Path d={INFINITY_PATH} stroke={GREEN} strokeWidth={8} strokeOpacity={0.22} strokeLinecap="round" />
        {/* the quiet base line */}
        <Path d={INFINITY_PATH} stroke={GREEN} strokeWidth={3.5} strokeOpacity={0.35} strokeLinecap="round" />
        {/* the bright core line */}
        <Path d={INFINITY_PATH} stroke={GREEN} strokeWidth={4.5} strokeOpacity={0.95} strokeLinecap="round" />
        {/* amber dot at the crossing — the interruption point */}
        <Circle cx={120} cy={60} r={11} fill={AMBER} opacity={0.18} />
        <Circle cx={120} cy={60} r={6.5} fill={AMBER} opacity={0.9} />
        <Circle cx={118} cy={58} r={2.2} fill="#fff7e8" opacity={0.85} />
      </Svg>
    </View>
  );
}
