import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  FadeInDown,
  SharedValue,
} from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { colors, monoFont, displayFont } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// THE MIRROR IN THE LOOP — hero visual v2.
//
// The redesign of the hero art: instead of the flat review panel, a chrome
// mirror sphere floats at the crossing point of a living infinity loop —
// the whole idea of the academy in one object. Inside the sphere: the
// player's reflection, a FIFA-style stat radar, a LIVE REVIEW badge and a
// moment ticker. Around it: floating stat chips that keep counting, a comet
// that travels the loop forever, and a pinned promise: NO STOP DATE.
//
// The loop trail draws itself in and out via useTrailLoop (same living
// stroke as the crest); the comet rides a true Bernoulli lemniscate; the
// sphere bobs, the radar sweeps, and on web the whole stage leans toward
// the cursor. Serious idea, dopamine delivery.
// ─────────────────────────────────────────────────────────────────────────

const WEB = Platform.OS === 'web';

// lemniscate geometry (viewBox 0 0 400 200, crossing at 200,100)
const LOOP_A = 80; // half-width of a lobe
const LOOP_H = 60; // half-height of a lobe
const LOOP_D =
  'M200 100 C200 40 120 40 120 100 C120 160 200 160 200 100 C200 160 280 160 280 100 C280 40 200 40 200 100 Z';
const LOOP_PATH_LENGTH = 260;

const MOMENTS = [
  { clock: "0:12", txt: 'LOST THE BALL — CHASING THE PASS, NOT THE SPACE' },
  { clock: "0:47", txt: 'THE SWITCH — STAYED NARROW, THEN PLAYED IT' },
  { clock: "1:22", txt: 'SECOND GOAL — MY SHAPE. MY FAULT. WRITTEN DOWN.' },
  { clock: "1:58", txt: 'ONE LESSON — CARRY IT INTO THE NEXT MATCH' },
];

const CHIPS = [
  { label: 'COMPOSURE', base: 71, suffix: '%', range: [64, 88] },
  { label: 'PASS ACC', base: 84, suffix: '%', range: [78, 92] },
  { label: 'DECISIONS', base: 12, suffix: '', range: [9, 16] },
  { label: 'MOMENTS', base: 3, suffix: '', range: [3, 5], pad: true },
];

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/* ── floating stat chip — pulses whenever its number moves ── */
function StatChip({
  label,
  value,
  suffix,
  pulse,
  style,
  scale,
}: {
  label: string;
  value: number;
  suffix: string;
  pulse: SharedValue<number>;
  style?: object;
  scale: number;
}) {
  const s = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <Animated.View style={[styles.chip, style, s]}>
      <Text style={[styles.chipLabel, { fontSize: 9 * scale }]}>{label}</Text>
      <Text style={[styles.chipValue, { fontSize: 20 * scale }]}>
        {value}
        {suffix}
      </Text>
    </Animated.View>
  );
}

export default function MirrorOrb({ width = 380 }: { width?: number }) {
  const w = width;
  const s = Math.min(1.25, Math.max(0.78, w / 380));
  const D = w * 0.6; // sphere diameter

  // ── the loop trail (draw in, erase out, forever) ──
  const { loopProps } = useTrailLoop({ pathLength: LOOP_PATH_LENGTH, drawMs: 2600, eraseMs: 2600 });

  // ── the comet — rides the lemniscate forever ──
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(2 * Math.PI, { duration: 7000, easing: Easing.linear }), -1, false);
  }, [t]);
  const cometProps = useAnimatedProps(() => {
    const sin = Math.sin(t.value);
    const cos = Math.cos(t.value);
    const denom = 1 + sin * sin;
    const cx = 200 + LOOP_A * (cos / denom);
    const cy = 100 + LOOP_H * ((sin * cos) / denom / 0.353);
    return { cx, cy };
  });

  // ── sphere bob ──
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(withTiming(-w * 0.018, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [bob, w]);

  // ── stage tilt: idle sway everywhere, mouse parallax on web ──
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  useEffect(() => {
    rx.value = withRepeat(withTiming(6, { duration: 3400, easing: Easing.inOut(Easing.sin) }), -1, true);
    if (!WEB) {
      ry.value = withDelay(700, withRepeat(withTiming(-5, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true));
    }
  }, [rx, ry]);
  const stageStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateX: `${rx.value}deg` }, { rotateY: `${ry.value}deg` }],
  }));
  const bobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));

  // ── radar sweep + specular sweep ──
  const sweep = useSharedValue(0);
  const spec = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(withTiming(360, { duration: 7000, easing: Easing.linear }), -1, false);
    spec.value = withRepeat(withTiming(360, { duration: 13000, easing: Easing.linear }), -1, false);
  }, [sweep, spec]);
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${sweep.value}deg` }] }));
  const specStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spec.value}deg` }] }));

  // ── stat chips keep counting ──
  const [chipVals, setChipVals] = useState<number[]>(CHIPS.map((c) => c.base));
  const p0 = useSharedValue(1);
  const p1 = useSharedValue(1);
  const p2 = useSharedValue(1);
  const p3 = useSharedValue(1);
  const pulses = [p0, p1, p2, p3];
  useEffect(() => {
    const iv = setInterval(() => {
      setChipVals((cur) =>
        cur.map((v, i) => {
          const [lo, hi] = CHIPS[i].range;
          const next = Math.round(v + (Math.random() - 0.45) * (hi - lo) * 0.6);
          return Math.min(hi, Math.max(lo, next));
        }),
      );
      pulses.forEach((p) => {
        p.value = withSequence(withTiming(1.13, { duration: 160 }), withTiming(1, { duration: 340 }));
      });
    }, 3200);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── moment ticker inside the sphere ──
  const [mi, setMi] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setMi((i) => (i + 1) % MOMENTS.length), 2600);
    return () => clearInterval(iv);
  }, []);

  // ── web mouse parallax — the mirror leans toward you ──
  const rigRef = useRef<View>(null);
  const onWebMouseMove = (e: any) => {
    if (WEB && rigRef.current) {
      const node = (rigRef.current as unknown) as { getBoundingClientRect?: () => DOMRect };
      const rect = node.getBoundingClientRect?.();
      if (rect) {
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        ry.value = withTiming(nx * 9, { duration: 160 });
        rx.value = withTiming(-ny * 7, { duration: 160 });
      }
    }
  };
  const onWebMouseLeave = () => {
    if (WEB) {
      ry.value = withTiming(0, { duration: 320 });
      rx.value = withTiming(0, { duration: 320 });
    }
  };

  return (
    <View
      ref={rigRef}
      {...(WEB ? { onMouseMove: onWebMouseMove, onMouseLeave: onWebMouseLeave } : {})}
      style={[styles.rig, { width: w, height: w * 1.04 }]}
    >
      {/* ── the infinity loop — two lobes around the crossing ── */}
      <View style={[styles.loop, { width: w * 0.98, height: w * 0.49, top: w * 0.09, left: w * 0.01 }]}>
        <Svg width="100%" height="100%" viewBox="0 0 400 200">
          {/* faint base — the loop is always there */}
          <Path d={LOOP_D} fill="none" stroke="rgba(57,255,106,0.22)" strokeWidth={3} strokeLinecap="round" {...({ pathLength: LOOP_PATH_LENGTH } as object)} />
          {/* the living trail — draws in and out, forever */}
          <AnimatedPath
            animatedProps={loopProps}
            d={LOOP_D}
            fill="none"
            stroke={colors.primary}
            strokeWidth={4}
            strokeLinecap="round"
            {...({ pathLength: LOOP_PATH_LENGTH } as object)}
          />
          {/* the comet — never stops travelling the loop */}
          <AnimatedCircle animatedProps={cometProps} r={12} fill="rgba(57,255,106,0.22)" />
          <AnimatedCircle animatedProps={cometProps} r={5.5} fill={colors.primary} />
        </Svg>
      </View>

      {/* ── the 3D stage ── */}
      <Animated.View style={[styles.stage, stageStyle, { width: w, height: w * 0.64, top: w * 0.02 }]}>
        <Animated.View style={[styles.sphereWrap, bobStyle]}>
          <View style={[styles.sphere, { width: D, height: D, borderRadius: D / 2 }]}>
            {/* chrome shading */}
            <LinearGradient
              style={StyleSheet.absoluteFill}
              colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.05)', 'rgba(10,22,13,0.2)']}
              start={{ x: 0.15, y: 0.05 }}
              end={{ x: 0.85, y: 0.95 }}
            />
            <LinearGradient
              style={StyleSheet.absoluteFill}
              colors={['transparent', 'rgba(0,0,0,0.88)']}
              start={{ x: 0.5, y: 0.42 }}
              end={{ x: 0.5, y: 1 }}
            />
            <LinearGradient
              style={StyleSheet.absoluteFill}
              colors={['rgba(57,255,106,0.10)', 'transparent']}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
            />

            {/* specular sweep */}
            <Animated.View style={[styles.sweep, sweepStyle]}>
              <Svg width="100%" height="100%" viewBox="0 0 240 240">
                <Path
                  d="M120 120 L120 18 A102 102 0 0 1 205 74 Z"
                  fill="rgba(255,255,255,0.07)"
                />
                <Path
                  d="M120 120 L120 18 A102 102 0 0 1 205 74 Z"
                  fill="none"
                  stroke="rgba(255,255,255,0.30)"
                  strokeWidth={1.5}
                />
              </Svg>
            </Animated.View>

            {/* FIFA post-match radar */}
            <View style={styles.radarWrap}>
              <Svg width="100%" height="100%" viewBox="0 0 240 240">
                <Circle cx={120} cy={120} r={112} fill="none" stroke="rgba(57,255,106,0.16)" strokeWidth={1} />
                <Circle cx={120} cy={120} r={78} fill="none" stroke="rgba(57,255,106,0.16)" strokeWidth={1} />
                <Circle cx={120} cy={120} r={44} fill="none" stroke="rgba(57,255,106,0.16)" strokeWidth={1} />
                {/* four stat petals — composure, pass acc, decisions, positioning */}
                <Path d="M120 120 L120 26" {...({ pathLength: 100 } as object)} strokeDasharray="71 100" stroke={colors.primary} strokeWidth={7} strokeLinecap="round" fill="none" />
                <Path d="M120 120 L218 120" {...({ pathLength: 100 } as object)} strokeDasharray="84 100" stroke={colors.primary} strokeWidth={7} strokeLinecap="round" fill="none" />
                <Path d="M120 120 L120 214" {...({ pathLength: 100 } as object)} strokeDasharray="63 100" stroke={colors.primary} strokeWidth={7} strokeLinecap="round" fill="none" />
                <Path d="M120 120 L22 120" {...({ pathLength: 100 } as object)} strokeDasharray="58 100" stroke={colors.primary} strokeWidth={7} strokeLinecap="round" fill="none" />
                <Circle cx={120} cy={26} r={4} fill={colors.primary} />
                <Circle cx={218} cy={120} r={4} fill={colors.primary} />
                <Circle cx={120} cy={214} r={4} fill={colors.primary} />
                <Circle cx={22} cy={120} r={4} fill={colors.primary} />
              </Svg>
            </View>

            {/* rotating scan sweep inside the radar */}
            <Animated.View style={[styles.sweep, sweepStyle, styles.radarSweep]}>
              <Svg width="100%" height="100%" viewBox="0 0 240 240">
                <Path d="M120 120 L120 20 A100 100 0 0 1 204 79 Z" fill="rgba(57,255,106,0.09)" />
              </Svg>
            </Animated.View>

            {/* the reflection — you */}
            <View style={styles.reflectionWrap}>
              <Svg width={D * 0.24} height={D * 0.3} viewBox="0 0 84 110" fill="none">
                <Circle cx={42} cy={22} r={15} fill="rgba(57,255,106,0.9)" />
                <Path d="M14 104 C14 72 26 52 42 52 C58 52 70 72 70 104 Z" fill="rgba(57,255,106,0.6)" />
                <Path d="M30 70 L14 96 M54 70 L70 96 M42 62 L42 84" stroke="rgba(57,255,106,0.8)" strokeWidth={5} strokeLinecap="round" />
              </Svg>
              <Text style={[styles.reflectionYou, { fontSize: 9 * s }]}>YOU</Text>
            </View>

            {/* live badge */}
            <View style={[styles.liveBadge, { top: D * 0.05 }]}>
              <View style={styles.liveDot} />
              <Text style={[styles.liveTxt, { fontSize: 8.5 * s }]}>LIVE REVIEW</Text>
            </View>

            {/* moment ticker */}
            <View style={[styles.ticker, { bottom: D * 0.045 }]}>
              <Animated.View key={mi} entering={FadeInDown.duration(280)}>
                <Text numberOfLines={1} style={[styles.tickerTxt, { fontSize: 8.5 * s }]}>
                  <Text style={styles.tickerClock}>MOMENT {MOMENTS[mi].clock}</Text>
                  {'  ·  '}
                  {MOMENTS[mi].txt}
                </Text>
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>

      {/* ── floating stat chips (the dopamine layer) ── */}
      <StatChip label={CHIPS[0].label} value={chipVals[0]} suffix={CHIPS[0].suffix} pulse={p0} scale={s} style={[styles.chipPos, { top: w * 0.06, left: -w * 0.02 }]} />
      <StatChip label={CHIPS[1].label} value={chipVals[1]} suffix={CHIPS[1].suffix} pulse={p1} scale={s} style={[styles.chipPos, styles.chipTiltR, { top: w * 0.33, right: -w * 0.05 }]} />
      <StatChip label={CHIPS[2].label} value={chipVals[2]} suffix={CHIPS[2].suffix} pulse={p2} scale={s} style={[styles.chipPos, styles.chipTiltL, { top: w * 0.56, left: -w * 0.07 }]} />
      <StatChip label={CHIPS[3].label} value={chipVals[3]} suffix={CHIPS[3].suffix} pulse={p3} scale={s} style={[styles.chipPos, styles.chipTiltR, { top: w * 0.72, right: -w * 0.03 }]} />

      {/* ── the promise pinned under the loop ── */}
      <View style={[styles.noEnd, { bottom: w * 0.005 }]}>
        <Text style={[styles.noEndInf, { fontSize: 15 * s }]}>∞</Text>
        <Text style={[styles.noEndTxt, { fontSize: 9.5 * s }]}>NO STOP DATE · THE LEARNING IS INFINITE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rig: {
    position: 'relative',
  },
  loop: {
    position: 'absolute',
  },
  stage: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sphereWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sphere: {
    overflow: 'hidden',
    backgroundColor: '#0a130d',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 18 },
    elevation: 16,
  },
  sweep: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  radarWrap: {
    position: 'absolute',
    width: '74%',
    height: '74%',
    alignSelf: 'center',
    top: '13%',
  },
  radarSweep: {
    opacity: 0.9,
  },
  reflectionWrap: {
    position: 'absolute',
    top: '18%',
    alignItems: 'center',
    gap: 2,
  },
  reflectionYou: {
    fontFamily: monoFont,
    letterSpacing: 3,
    color: colors.primary,
    opacity: 0.9,
  },
  liveBadge: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(5,10,6,0.6)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  liveTxt: {
    fontFamily: monoFont,
    letterSpacing: 2.2,
    color: colors.primary,
  },
  ticker: {
    position: 'absolute',
    alignSelf: 'center',
    width: '86%',
    backgroundColor: 'rgba(5,10,6,0.62)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 9,
    alignItems: 'center',
  },
  tickerTxt: {
    fontFamily: monoFont,
    letterSpacing: 1.4,
    color: colors.fg,
  },
  tickerClock: {
    color: colors.primary,
  },
  chip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 13,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  chipPos: {
    position: 'absolute',
  },
  chipTiltR: {
    transform: [{ rotate: '2.5deg' }],
  },
  chipTiltL: {
    transform: [{ rotate: '-2.5deg' }],
  },
  chipLabel: {
    fontFamily: monoFont,
    letterSpacing: 2,
    color: colors.mutedDim,
  },
  chipValue: {
    fontFamily: displayFont,
    color: colors.primary,
    textShadowColor: 'rgba(57,255,106,0.5)',
    textShadowRadius: 10,
  },
  noEnd: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(5,10,6,0.72)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 17,
    shadowColor: colors.primary,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  noEndInf: {
    color: colors.primary,
  },
  noEndTxt: {
    fontFamily: monoFont,
    letterSpacing: 2,
    color: colors.primary,
    textTransform: 'uppercase' as const,
  },
});
