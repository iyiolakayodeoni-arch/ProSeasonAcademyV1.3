import React from 'react';
import { View, Text, StyleSheet, ImageSourcePropType } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, {
  Path,
  Circle,
  Defs,
  ClipPath,
  G,
  LinearGradient,
  Stop,
  Rect,
  Image as SvgImage,
} from 'react-native-svg';
import { Coach } from '../data/coaches';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { colors, monoFont } from '../theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Card geometry (svg units) — FUT cut-corners: diagonal notches top-left & bottom-right
const W = 165;
const H = 250;
const CUT = 16;
const FRAME = `M ${CUT} 2 L ${W - 6} 2 Q ${W - 2} 2 ${W - 2} 6 L ${W - 2} ${H - CUT} L ${W - CUT} ${H - 2} L 6 ${H - 2} Q 2 ${H - 2} 2 ${H - 6} L 2 ${CUT} Z`;

const TRAILS: Record<string, { d: string; dots: [number, number][]; flag?: [number, number]; end: [number, number] }> = {
  a: {
    d: 'M 128 34 C 130 68, 96 66, 84 92 C 70 122, 98 138, 66 168 C 44 188, 62 210, 40 230',
    dots: [[84, 92], [66, 168]],
    end: [40, 230],
  },
  b: {
    d: 'M 36 38 C 40 74, 70 82, 74 110 C 78 142, 112 132, 116 164 C 120 196, 126 212, 127 231',
    dots: [[74, 110], [116, 164]],
    flag: [36, 38],
    end: [127, 231],
  },
};

const TRAIL_PATH_LENGTH = 300;

function Trail({ variant, phaseMs }: { variant: 'a' | 'b'; phaseMs: number }) {
  const t = TRAILS[variant];
  const { loopProps } = useTrailLoop({
    pathLength: TRAIL_PATH_LENGTH,
    drawMs: 3200,
    eraseMs: 3200,
    phaseOffsetMs: phaseMs,
  });
  return (
    <>
      <AnimatedPath
        d={t.d}
        stroke={colors.fg}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${TRAIL_PATH_LENGTH} ${TRAIL_PATH_LENGTH}`}
        {...({ pathLength: TRAIL_PATH_LENGTH } as object)}
        animatedProps={loopProps}
        opacity={0.9}
      />
      {t.dots.map(([cx, cy], i) => (
        <Circle key={i} cx={cx} cy={cy} r="2.2" fill={colors.fg} opacity={0.85} />
      ))}
      {t.flag && (
        <>
          <Circle cx={t.flag[0]} cy={t.flag[1]} r="3" fill={colors.accent} />
          <Path
            d={`M ${t.flag[0]} ${t.flag[1]} l 3.4 -4.4 l 3.4 4.4 l -3.4 4.4 Z`}
            fill={colors.accent}
          />
        </>
      )}
      <Circle cx={t.end[0]} cy={t.end[1]} r="2.6" fill={colors.primary} />
    </>
  );
}

export default function CoachCard({ coach, width }: { coach: Coach; width: number }) {
  // idle border-glow pulse
  const { glowStyle } = useTrailLoop({ pathLength: 10, drawMs: 1600, eraseMs: 1600, phaseOffsetMs: coach.trailPhaseMs });
  const trail = TRAILS[coach.trailVariant];

  return (
    <View style={[styles.card, { width, aspectRatio: W / H }]}>
      {/* card shell: bg, portrait clipped to the notched frame, bottom fade */}
      <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${W} ${H}`} pointerEvents="none">
        <Defs>
          <ClipPath id="frameClip">
            <Path d={FRAME} />
          </ClipPath>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.45" stopColor="#0a0f0a" stopOpacity="0" />
            <Stop offset="0.78" stopColor="#0a0f0a" stopOpacity="0.72" />
            <Stop offset="1" stopColor="#0a0f0a" stopOpacity="0.97" />
          </LinearGradient>
        </Defs>

        <Path d={FRAME} fill="#0c170f" />

        <G clipPath="url(#frameClip)">
          <SvgImage
            href={coach.portrait as ImageSourcePropType}
            x="2"
            y="2"
            width={W - 4}
            height={H * 0.78}
            preserveAspectRatio="xMidYMin slice"
          />
          <Rect x="2" y="2" width={W - 4} height={H - 4} fill="url(#fade)" />
          {/* winding journey trail over the portrait */}
          <Trail variant={coach.trailVariant} phaseMs={coach.trailPhaseMs} />
        </G>
      </Svg>

      {/* glowing border (pulsed) */}
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${W} ${H}`}>
          <Path d={FRAME} fill="none" stroke="rgba(57,255,106,0.22)" strokeWidth="4.5" />
          <Path d={FRAME} fill="none" stroke={colors.primary} strokeWidth="1.4" />
        </Svg>
      </Animated.View>

      {/* rating badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeNum}>{coach.rating}</Text>
        <Text style={styles.badgeLbl}>COACH</Text>
      </View>

      {/* name block */}
      <View style={styles.nameBlock} pointerEvents="none">
        <Text style={styles.name} numberOfLines={1}>{coach.name}</Text>
        <Text style={styles.journeyTag}>{coach.journeyTag}</Text>
        <Text style={styles.meta}>{coach.metaLine}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(10,15,10,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.65)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  badgeNum: {
    fontFamily: monoFont,
    fontSize: 15,
    fontWeight: '900',
    color: colors.primary,
    lineHeight: 17,
  },
  badgeLbl: {
    fontFamily: monoFont,
    fontSize: 5.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(57,255,106,0.8)',
  },
  nameBlock: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
  },
  name: {
    fontFamily: monoFont,
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: colors.fg,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 6,
  },
  journeyTag: {
    marginTop: 3,
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 2.2,
    color: colors.primary,
    textShadowColor: 'rgba(57,255,106,0.6)',
    textShadowRadius: 6,
  },
  meta: {
    marginTop: 3,
    fontFamily: monoFont,
    fontSize: 6,
    letterSpacing: 1.5,
    color: 'rgba(143,184,155,0.75)',
  },
});
