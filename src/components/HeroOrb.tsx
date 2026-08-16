import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Path,
  Circle,
  Ellipse,
  Line,
  Rect,
  Defs,
  RadialGradient,
  Stop,
  G,
} from 'react-native-svg';
import { colors, monoFont, displayFont } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// THE HUD ORB — hero visual v5, matched to mockups/hero-v2/hero-redesign.png
//
//   · a chrome/glass sphere with a bright specular highlight top-left,
//     built from SVG radial gradients so it reads as a reflective 3D ball
//   · inside it: a football player in mid-dribble, drawn as a thin
//     neon-green wireframe standing over a small ball
//   · two elliptical orbit rings crossing diagonally through the sphere,
//     glowing green, each carrying a bright comet head — both rotate
//     slowly and forever (the loop never ends)
//   · three floating HUD stat cards — COMPOSURE / PASS ACC / MOMENTS —
//     drifting gently on their own phase-shifted float loops
//   · decorative low-opacity widgets near the sphere's left edge: a tiny
//     radar/target dial and a mini bar-chart panel
//
// All copy/stat values live in the STATS constant at the top so real
// numbers can be swapped in without touching the drawing code.
// ─────────────────────────────────────────────────────────────────────────

const WEB = Platform.OS === 'web';

export type HeroStat = { label: string; value: string };

export const HERO_STATS: HeroStat[] = [
  { label: 'COMPOSURE', value: '71%' },
  { label: 'PASS ACC', value: '84%' },
  { label: 'MOMENTS', value: '03' },
];

/* ── the player in mid-dribble — thin neon wireframe, ball at his feet ── */
function PlayerWireframe({ size }: { size: number }) {
  return (
    <Svg width={size} height={size * 1.3} viewBox="0 0 120 156" fill="none">
      {/* glow underlay — the same figure, wide and faint */}
      <G stroke="rgba(57,255,106,0.28)" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Circle cx={60} cy={20} r={10} />
        <Path d="M60 31 C59 46 56 60 55 72" />
        <Path d="M58 38 C48 46 40 56 36 68" />
        <Path d="M62 38 C74 44 84 42 92 32" />
        <Path d="M55 72 C50 88 46 102 44 122" />
        <Path d="M56 72 C66 84 76 94 84 106" />
      </G>
      {/* the figure — thin bright outline */}
      <G stroke={colors.primary} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* head */}
        <Circle cx={60} cy={20} r={10} />
        {/* torso */}
        <Path d="M60 31 C59 46 56 60 55 72" />
        {/* back arm — swings low */}
        <Path d="M58 38 C48 46 40 56 36 68" />
        {/* front arm — raised for balance */}
        <Path d="M62 38 C74 44 84 42 92 32" />
        {/* standing leg */}
        <Path d="M55 72 C50 88 46 102 44 122" />
        <Path d="M44 122 L36 126" />
        {/* dribbling leg — reaching the ball */}
        <Path d="M56 72 C66 84 76 94 84 106" />
        <Path d="M84 106 L92 112" />
      </G>
      {/* the ball at his feet */}
      <Circle cx={96} cy={122} r={9} stroke={colors.primary} strokeWidth={2} fill="rgba(57,255,106,0.12)" />
      <Path d="M92 118 L100 118 L102 124 L96 129 L90 124 Z" stroke={colors.primary} strokeWidth={1} fill="none" opacity={0.8} />
      {/* ground shadow */}
      <Ellipse cx={68} cy={132} rx={34} ry={5} fill="rgba(57,255,106,0.08)" />
    </Svg>
  );
}

/* ── one orbit ring — a tilted glowing ellipse with a comet head ── */
function OrbitRing({
  size,
  tilt,
  duration,
  reverse = false,
}: {
  size: number;
  tilt: string;
  duration: number;
  reverse?: boolean;
}) {
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration, easing: Easing.linear }), -1, false);
  }, [spin, duration]);
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${tilt}` }, { rotate: `${reverse ? -spin.value : spin.value}deg` }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.ring, { width: size, height: size }, spinStyle]}>
      <Svg width="100%" height="100%" viewBox="0 0 400 400">
        <Defs>
          <RadialGradient id="comet" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#eafff0" stopOpacity="1" />
            <Stop offset="30%" stopColor={colors.primary} stopOpacity="0.9" />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {/* halo → base → hot core, layered so the ring reads as lit neon */}
        <Ellipse cx={200} cy={200} rx={190} ry={62} fill="none" stroke="rgba(57,255,106,0.10)" strokeWidth={12} />
        <Ellipse cx={200} cy={200} rx={190} ry={62} fill="none" stroke="rgba(57,255,106,0.35)" strokeWidth={4} />
        <Ellipse cx={200} cy={200} rx={190} ry={62} fill="none" stroke="rgba(120,255,160,0.75)" strokeWidth={1.6} />
        {/* the comet — a bright radial-gradient head riding the ring */}
        <Circle cx={390} cy={200} r={22} fill="url(#comet)" />
        <Circle cx={390} cy={200} r={5} fill="#eafff0" />
      </Svg>
    </Animated.View>
  );
}

/* ── one floating HUD stat card ── */
function StatCard({
  stat,
  float,
  style,
  scale,
}: {
  stat: HeroStat;
  float: SharedValue<number>;
  style?: object;
  scale: number;
}) {
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
  return (
    <Animated.View style={[styles.statCard, style, s]}>
      <Text style={[styles.statLabel, { fontSize: 8.5 * scale }]}>{stat.label}</Text>
      <Text style={[styles.statValue, { fontSize: 24 * scale }]}>{stat.value}</Text>
    </Animated.View>
  );
}

/* ── tiny radar/target dial — decorative ── */
function RadarWidget({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60" opacity={0.55}>
      <Circle cx={30} cy={30} r={26} stroke="rgba(57,255,106,0.5)" strokeWidth={1} fill="rgba(5,10,6,0.4)" />
      <Circle cx={30} cy={30} r={17} stroke="rgba(57,255,106,0.35)" strokeWidth={1} fill="none" />
      <Circle cx={30} cy={30} r={8} stroke="rgba(57,255,106,0.35)" strokeWidth={1} fill="none" />
      <Line x1={30} y1={2} x2={30} y2={58} stroke="rgba(57,255,106,0.25)" strokeWidth={1} />
      <Line x1={2} y1={30} x2={58} y2={30} stroke="rgba(57,255,106,0.25)" strokeWidth={1} />
      <Circle cx={38} cy={22} r={2.6} fill={colors.primary} />
    </Svg>
  );
}

/* ── mini bar/dot stats panel — decorative ── */
function MiniBars({ width }: { width: number }) {
  const bars = [12, 20, 9, 16, 22];
  return (
    <Svg width={width} height={width * 0.62} viewBox="0 0 70 44" opacity={0.5}>
      <Rect x={0} y={0} width={70} height={44} rx={6} fill="rgba(5,10,6,0.5)" stroke="rgba(57,255,106,0.2)" strokeWidth={1} />
      {bars.map((h, i) => (
        <Rect key={i} x={8 + i * 11} y={32 - h} width={5} height={h} rx={1.5} fill="rgba(57,255,106,0.7)" />
      ))}
      {bars.map((_, i) => (
        <Circle key={`d${i}`} cx={10.5 + i * 11} cy={38} r={1.4} fill={i < 3 ? colors.primary : 'rgba(57,255,106,0.25)'} />
      ))}
    </Svg>
  );
}

export default function HeroOrb({
  width = 440,
  stats = HERO_STATS,
  compact = false,
}: {
  width?: number;
  /** the three HUD stat cards — swap real numbers in via this prop */
  stats?: HeroStat[];
  /** small screens: drop the third card + decorations */
  compact?: boolean;
}) {
  const w = width;
  const s = Math.min(1.15, Math.max(0.72, w / 440));
  const D = w * 0.72; // sphere diameter (~320px at the 440 desktop width)
  const ringSize = w * 1.06;

  // ── float loops for the stat cards — same motion, shifted phases ──
  const f0 = useSharedValue(0);
  const f1 = useSharedValue(0);
  const f2 = useSharedValue(0);
  useEffect(() => {
    const drift = (v: SharedValue<number>, delay: number, ms: number) => {
      v.value = withDelay(
        delay,
        withRepeat(withTiming(-8, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, true),
      );
    };
    drift(f0, 0, 3200);
    drift(f1, 700, 3800);
    drift(f2, 1400, 3500);
  }, [f0, f1, f2]);

  return (
    <View style={[styles.rig, { width: w, height: w * 1.02 }]}>
      {/* ── orbit ring behind the sphere ── */}
      <View style={[styles.ringLayer, { width: ringSize, height: ringSize }]}>
        <OrbitRing size={ringSize} tilt="-28deg" duration={26000} />
      </View>

      {/* ── the chrome sphere ── */}
      <View style={[styles.sphereWrap, { width: D, height: D }]}>
        <Svg width={D} height={D} viewBox="0 0 240 240">
          <Defs>
            {/* chrome body — dark steel lifted toward the top-left light */}
            <RadialGradient id="chrome" cx="36%" cy="28%" r="80%">
              <Stop offset="0%" stopColor="#9aa6a0" stopOpacity="1" />
              <Stop offset="28%" stopColor="#525d57" stopOpacity="1" />
              <Stop offset="62%" stopColor="#1c2420" stopOpacity="1" />
              <Stop offset="100%" stopColor="#05080a" stopOpacity="1" />
            </RadialGradient>
            {/* specular highlight — the hot spot */}
            <RadialGradient id="specular" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <Stop offset="55%" stopColor="#ffffff" stopOpacity="0.18" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </RadialGradient>
            {/* green pitch-light bounce from below */}
            <RadialGradient id="bounce" cx="50%" cy="100%" r="70%">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.22" />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={120} cy={120} r={118} fill="url(#chrome)" />
          <Circle cx={120} cy={120} r={118} fill="url(#bounce)" />
          {/* rim light */}
          <Circle cx={120} cy={120} r={117.5} fill="none" stroke="rgba(57,255,106,0.30)" strokeWidth={1} />
          {/* specular hot spot, top-left */}
          <Ellipse cx={78} cy={58} rx={52} ry={34} fill="url(#specular)" transform="rotate(-24 78 58)" />
          {/* horizon reflection line inside the glass */}
          <Path d="M18 158 Q120 118 222 158" stroke="rgba(255,255,255,0.10)" strokeWidth={1.6} fill="none" />
          <Path d="M28 178 Q120 138 212 178" stroke="rgba(57,255,106,0.10)" strokeWidth={1.4} fill="none" />
        </Svg>

        {/* the player standing inside the glass */}
        <View style={styles.playerWrap}>
          <PlayerWireframe size={D * 0.42} />
        </View>
      </View>

      {/* ── orbit ring in front of the sphere ── */}
      <View pointerEvents="none" style={[styles.ringLayer, { width: ringSize, height: ringSize }]}>
        <OrbitRing size={ringSize} tilt="24deg" duration={32000} reverse />
      </View>

      {/* ── decorative widgets near the sphere's left side ── */}
      {!compact && (
        <>
          <View style={[styles.decor, { top: w * 0.26, left: w * 0.005 }]}>
            <RadarWidget size={44 * s} />
          </View>
          <View style={[styles.decor, { top: w * 0.62, left: w * 0.03 }]}>
            <MiniBars width={62 * s} />
          </View>
        </>
      )}

      {/* ── floating HUD stat cards ── */}
      <StatCard stat={stats[0]} float={f0} scale={s} style={{ top: w * 0.30, left: -w * 0.015 }} />
      <StatCard stat={stats[1]} float={f1} scale={s} style={{ top: w * 0.40, right: -w * 0.02 }} />
      {!compact && stats[2] && (
        <StatCard stat={stats[2]} float={f2} scale={s} style={{ top: w * 0.74, right: w * 0.06 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rig: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    ...(WEB ? ({ filter: 'drop-shadow(0 0 10px rgba(57,255,106,0.45))' } as object) : null),
  },
  sphereWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 22 },
    elevation: 16,
  },
  playerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '6%',
    ...(WEB ? ({ filter: 'drop-shadow(0 0 6px rgba(57,255,106,0.55))' } as object) : null),
  },
  decor: {
    position: 'absolute',
  },
  statCard: {
    position: 'absolute',
    backgroundColor: 'rgba(12,20,14,0.85)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  statLabel: {
    fontFamily: monoFont,
    letterSpacing: 2,
    color: colors.muted,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: displayFont,
    color: colors.primary,
    textShadowColor: 'rgba(57,255,106,0.5)',
    textShadowRadius: 12,
  },
});
