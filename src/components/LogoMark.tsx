import React from 'react';
import Animated from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../theme';
import { LOOP_PATH_LENGTH } from '../hooks/useSplashAnimation';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─────────────────────────────────────────────────────────────────────────
// THE FLOODLIGHT CREST — ProSeasonAcademy's club mark.
//
// Three elements, each earned (nothing decorative):
//   • an angular console-era shield in neon — the esports silhouette,
//   • a gold floodlight head — night training; the grind under lights,
//   • a ball and an ascent trail with waypoints rising toward the light —
//     the journey IS the evidence. The white trail is the same animated
//     draw/erase loop the previous mark ran (`loopProps` from useTrailLoop).
//
// API unchanged: every screen that renders <LogoMark/> swaps to the crest.
// ─────────────────────────────────────────────────────────────────────────

// the shield — flat top, chamfered shoulders, pointed base (tall club cut)
const SHIELD = 'M 30 16 H 70 L 76 21 V 52 L 50 84 L 24 52 V 21 Z';
// the road to the light — the animated white trail
const TRAIL = 'M 33 63 C 36 57, 42 55, 45 50 C 49 44, 56 43, 60 38 C 62 36, 64 35, 65 34';

type Props = {
  size?: number;
  loopProps?: any;
  glowStyle?: any;
};

export default function LogoMark({ size = 132, loopProps, glowStyle }: Props) {
  return (
    <Animated.View style={glowStyle}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* the shield — three layered strokes build the neon glow */}
        <Path d={SHIELD} stroke={colors.primary} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="rgba(57,255,106,0.05)" opacity={0.22} />
        <Path d={SHIELD} stroke={colors.primary} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="rgba(57,255,106,0.05)" opacity={0.5} />
        <Path d={SHIELD} stroke={colors.primary} strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" fill="rgba(57,255,106,0.05)" />

        {/* the floodlight — gold mast, angled lamp rail with three heads, two rays */}
        <Path d="M 50 36 L 50 28.5" stroke={colors.accent} strokeWidth="1.8" strokeLinecap="round" />
        <Path d="M 38 30 L 62 27" stroke={colors.accent} strokeWidth="1.8" strokeLinecap="round" />
        <Circle cx="41" cy="29.5" r="1.9" fill={colors.accent} />
        <Circle cx="50" cy="28.6" r="1.9" fill={colors.accent} />
        <Circle cx="59" cy="27.7" r="1.9" fill={colors.accent} />
        <Path d="M 40 33 L 36.5 39.5" stroke={colors.accent} strokeWidth="1" strokeLinecap="round" opacity={0.55} />
        <Path d="M 60 31 L 63.5 37.5" stroke={colors.accent} strokeWidth="1" strokeLinecap="round" opacity={0.55} />

        {/* the ball — where every season starts */}
        <Circle cx="33" cy="66" r="3.4" stroke={colors.fg} strokeWidth="1.6" fill="none" />
        <Circle cx="33" cy="66" r="1" fill={colors.fg} />

        {/* the ascent trail — draws on and off forever */}
        <AnimatedPath
          d={TRAIL}
          stroke={colors.fg}
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${LOOP_PATH_LENGTH} ${LOOP_PATH_LENGTH}`}
          // pathLength is supported by react-native-svg but missing from its
          // TS prop types — inject it untyped.
          {...({ pathLength: LOOP_PATH_LENGTH } as object)}
          animatedProps={loopProps}
          opacity={0.95}
        />
        {/* waypoints up the climb + the gold destination under the light */}
        <Circle cx="47" cy="50" r="1.7" fill={colors.fg} />
        <Circle cx="58" cy="41.5" r="1.7" fill={colors.fg} />
        <Circle cx="64.5" cy="34" r="2.1" fill={colors.accent} />
      </Svg>
    </Animated.View>
  );
}
