import React from 'react';
import Animated from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../theme';
import { LOOP_PATH_LENGTH } from '../hooks/useSplashAnimation';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// The twin-arc journey crest: two neon loops + winding white trail + gold flag.
// `loopProps`/`glowStyle` come from useTrailLoop (or useSplashAnimation on the splash).

type Props = {
  size?: number;
  loopProps?: any;
  glowStyle?: any;
};

export default function LogoMark({ size = 132, loopProps, glowStyle }: Props) {
  return (
    <Animated.View style={glowStyle}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* left loop — layered strokes for the neon glow */}
        <Path
          d="M 44 36 C 38 26, 30 24, 22 24 C 10 24, 4 36, 4 50 C 4 64, 10 76, 22 76 C 30 76, 38 74, 44 64"
          stroke={colors.primary} strokeWidth="9" strokeLinecap="round" fill="none" opacity={0.22}
        />
        <Path
          d="M 44 36 C 38 26, 30 24, 22 24 C 10 24, 4 36, 4 50 C 4 64, 10 76, 22 76 C 30 76, 38 74, 44 64"
          stroke={colors.primary} strokeWidth="6.5" strokeLinecap="round" fill="none" opacity={0.5}
        />
        <Path
          d="M 44 36 C 38 26, 30 24, 22 24 C 10 24, 4 36, 4 50 C 4 64, 10 76, 22 76 C 30 76, 38 74, 44 64"
          stroke={colors.primary} strokeWidth="4.6" strokeLinecap="round" fill="none"
        />
        {/* right loop */}
        <Path
          d="M 56 36 C 62 26, 70 24, 78 24 C 90 24, 96 36, 96 50 C 96 64, 90 76, 78 76 C 70 76, 62 74, 56 64"
          stroke={colors.primary} strokeWidth="9" strokeLinecap="round" fill="none" opacity={0.22}
        />
        <Path
          d="M 56 36 C 62 26, 70 24, 78 24 C 90 24, 96 36, 96 50 C 96 64, 90 76, 78 76 C 70 76, 62 74, 56 64"
          stroke={colors.primary} strokeWidth="6.5" strokeLinecap="round" fill="none" opacity={0.5}
        />
        <Path
          d="M 56 36 C 62 26, 70 24, 78 24 C 90 24, 96 36, 96 50 C 96 64, 90 76, 78 76 C 70 76, 62 74, 56 64"
          stroke={colors.primary} strokeWidth="4.6" strokeLinecap="round" fill="none"
        />
        {/* winding white journey trail — animates in/out forever */}
        <AnimatedPath
          d="M 30 82 C 12 62, 48 58, 48 48 C 48 38, 84 34, 68 14"
          stroke={colors.fg}
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${LOOP_PATH_LENGTH} ${LOOP_PATH_LENGTH}`}
          // pathLength is supported by react-native-svg but missing from its
          // TS prop types — inject it untyped.
          {...({ pathLength: LOOP_PATH_LENGTH } as object)}
          animatedProps={loopProps}
          opacity={0.95}
        />
        {/* waypoint dots + gold destination flag */}
        <Circle cx="30" cy="82" r="3.6" fill={colors.fg} opacity={0.5} />
        <Circle cx="38" cy="62" r="2.8" fill={colors.fg} />
        <Circle cx="48" cy="48" r="2.8" fill={colors.fg} />
        <Circle cx="62" cy="32" r="2.8" fill={colors.fg} />
        <Circle cx="68" cy="14" r="4.6" fill={colors.accent} />
        <Path d="M 68 14 L 71.5 9.5 L 75 14 L 71.5 18.5 Z" fill={colors.accent} />
      </Svg>
    </Animated.View>
  );
}
