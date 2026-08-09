import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { TrailLoop } from '../hooks/useTrailLoop';

// ─────────────────────────────────────────────────────────────────────────
// THE INFINITY CREST — Onliversity's broken infinity, rebuilt as crisp SVG.
//
// One continuous loop with the amber dot resting at the crossing — the
// interruption point. The green line carries a live trail (useTrailLoop):
// the path draws itself in, erases itself out, forever. Bloom is faked
// with stacked strokes (wide-dim → core) so it renders identically on
// web and native without SVG filter support.
// ─────────────────────────────────────────────────────────────────────────

const AnimatedPath = Animated.createAnimatedComponent(Path);

const GREEN = '#39ff6a';
const AMBER = '#f2c078';

/** One continuous figure-eight; `pathLength=260` normalises dash math so
    useTrailLoop({ pathLength: 260 }) drives the trail exactly. */
const INFINITY_PATH =
  'M 132 44 ' +
  'C 148 24, 186 24, 198 60 ' +
  'C 186 96, 148 96, 120 60 ' +
  'C 92 24, 54 24, 42 60 ' +
  'C 54 96, 92 96, 108 76';

type Props = {
  size?: number;
  trail: TrailLoop;
};

export default function InfinityCrest({ size = 140, trail }: Props) {
  const { loopProps, glowStyle } = trail;
  const h = size / 2; // viewBox 240x120 ratio

  return (
    <Animated.View style={[glowStyle, { width: size, height: h }]}>
      <Svg width={size} height={h} viewBox="0 0 240 120" fill="none">
        {/* bloom layers — wide & dim under the core line */}
        <Path d={INFINITY_PATH} stroke={GREEN} strokeWidth={14} strokeOpacity={0.10} strokeLinecap="round" />
        <Path d={INFINITY_PATH} stroke={GREEN} strokeWidth={8} strokeOpacity={0.22} strokeLinecap="round" />
        {/* the quiet base line */}
        <Path d={INFINITY_PATH} stroke={GREEN} strokeWidth={3.5} strokeOpacity={0.35} strokeLinecap="round" />
        {/* the living trail — draws in, erases out, forever */}
        <AnimatedPath
          d={INFINITY_PATH}
          stroke={GREEN}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeDasharray={260}
          animatedProps={loopProps}
          {...({ pathLength: 260 } as any)}
        />
        {/* amber dot at the crossing — the interruption point */}
        <Circle cx={120} cy={60} r={11} fill={AMBER} opacity={0.18} />
        <Circle cx={120} cy={60} r={6.5} fill={AMBER} opacity={0.9} />
        <Circle cx={118} cy={58} r={2.2} fill="#fff7e8" opacity={0.85} />
      </Svg>
    </Animated.View>
  );
}
