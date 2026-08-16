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
import Svg, { Path, Circle, Polygon, Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { colors, monoFont, displayFont, bodyFontBold } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// THE MIRROR IN THE LOOP — hero visual v4.
//
// Rebuilt to match the approved design image (mockups/hero-v2/hero-redesign.png):
//
//   · a big chrome mirror sphere, centre-right — inside it: a FIFA-style
//     hexagon radar, a small scoreboard strip (YOU 2–1 ELITE), the player's
//     reflection, a LIVE REVIEW badge, moment markers and a moment ticker
//   · the sphere sits at the crossing of a thick, glowing infinity loop —
//     base halo + living trail + a comet that travels the lemniscate forever
//   · three floating stat chips around it — COMPOSURE, PASS ACC, MOMENTS —
//     with mini bars that keep moving
//   · the promise pinned underneath: ∞ NO STOP DATE · INFINITE LEARNING
//
// Same serious idea. Game-grade look. The loop never ends.
// ─────────────────────────────────────────────────────────────────────────

const WEB = Platform.OS === 'web';

// lemniscate geometry (viewBox 0 0 400 200, crossing at 200,100)
const LOOP_A = 80;
const LOOP_H = 60;
const LOOP_D =
  'M200 100 C200 40 120 40 120 100 C120 160 200 160 200 100 C200 160 280 160 280 100 C280 40 200 40 200 100 Z';
const LOOP_PATH_LENGTH = 260;

const MOMENTS = [
  { clock: "0:12", txt: 'LOST THE BALL — CHASING THE PASS, NOT THE SPACE' },
  { clock: "0:47", txt: 'THE SWITCH — STAYED NARROW, THEN PLAYED IT' },
  { clock: "1:22", txt: 'SECOND GOAL — MY SHAPE. MY FAULT. WRITTEN DOWN.' },
  { clock: "1:58", txt: 'ONE LESSON — CARRY IT INTO THE NEXT MATCH' },
];

const MOMENT_MARKERS = [12, 47, 80, 100]; // timeline % positions

// hexagon radar — six attributes, the way a FUT card reads
const HEX_VALS = [71, 84, 63, 58, 76, 45]; // composure, passing, decisions, positioning, pressing, finishing

// the three floating chips (as in the approved image)
const CHIPS = [
  { label: 'COMPOSURE', base: 71, suffix: '%', lo: 64, hi: 88 },
  { label: 'PASS ACC', base: 84, suffix: '%', lo: 78, hi: 92 },
  { label: 'MOMENTS', base: 3, suffix: '', lo: 3, hi: 5 },
];

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/* hexagon helpers (viewBox 240) */
function ringPts(R: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    pts.push(`${(120 + R * Math.cos(a)).toFixed(1)},${(120 + R * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}
function hexPts(vals: number[], R: number): string {
  const pts: string[] = [];
  vals.forEach((v, i) => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    const r = (v / 100) * R;
    pts.push(`${(120 + r * Math.cos(a)).toFixed(1)},${(120 + r * Math.sin(a)).toFixed(1)}`);
  });
  return pts.join(' ');
}
const AXIS_PTS = ringPts(99).split(' ').map((p) => p.split(',').map(Number));

/* ── floating stat chip with a mini bar ── */
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
  const bar = useSharedValue(0);
  useEffect(() => {
    bar.value = withTiming(value, { duration: 900, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const barStyle = useAnimatedStyle(() => ({ width: `${Math.min(96, Math.max(22, bar.value))}%` }));
  return (
    <Animated.View style={[styles.chip, style, s]}>
      <View style={styles.chipTop}>
        <Text style={[styles.chipLabel, { fontSize: 8 * scale }]}>{label}</Text>
        <Text style={[styles.chipValue, { fontSize: 19 * scale }]}>
          {value}
          {suffix}
        </Text>
      </View>
      <View style={[styles.chipTrack, { height: 3 * scale }]}>
        <Animated.View style={[styles.chipFill, barStyle]} />
      </View>
    </Animated.View>
  );
}

export default function MirrorOrb({ width = 380 }: { width?: number }) {
  const w = width;
  const s = Math.min(1.25, Math.max(0.78, w / 380));
  const D = w * 0.62; // sphere diameter

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

  // ── radar sweep + specular sweep + live dot blink ──
  const sweep = useSharedValue(0);
  const spec = useSharedValue(0);
  const liveDot = useSharedValue(1);
  useEffect(() => {
    sweep.value = withRepeat(withTiming(360, { duration: 7000, easing: Easing.linear }), -1, false);
    spec.value = withRepeat(withTiming(360, { duration: 13000, easing: Easing.linear }), -1, false);
    liveDot.value = withRepeat(withSequence(withTiming(0.3, { duration: 600 }), withTiming(1, { duration: 600 })), -1, true);
  }, [sweep, spec, liveDot]);
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${sweep.value}deg` }] }));
  const specStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spec.value}deg` }] }));
  const liveDotStyle = useAnimatedStyle(() => ({ opacity: liveDot.value }));

  // ── chips keep counting (the dopamine layer) ──
  const [chipVals, setChipVals] = useState<number[]>(CHIPS.map((c) => c.base));
  const p0 = useSharedValue(1);
  const p1 = useSharedValue(1);
  const p2 = useSharedValue(1);
  const pulses = [p0, p1, p2];
  useEffect(() => {
    const iv = setInterval(() => {
      setChipVals((cur) =>
        cur.map((v, i) => {
          const next = Math.round(v + (Math.random() - 0.45) * (CHIPS[i].hi - CHIPS[i].lo) * 0.6);
          return Math.min(CHIPS[i].hi, Math.max(CHIPS[i].lo, next));
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
      style={[styles.rig, { width: w, height: w * 1.1 }]}
    >
      {/* ── the infinity loop — thick, glowing, wrapping the sphere ── */}
      <View style={[styles.loop, { width: w * 1.02, height: w * 0.51, top: w * 0.1, left: -w * 0.01 }]}>
        <Svg width="100%" height="100%" viewBox="0 0 400 200">
          {/* soft halo — makes the loop read as a lit sign */}
          <Path d={LOOP_D} fill="none" stroke="rgba(57,255,106,0.14)" strokeWidth={13} strokeLinecap="round" {...({ pathLength: LOOP_PATH_LENGTH } as object)} />
          {/* base line — always faintly visible */}
          <Path d={LOOP_D} fill="none" stroke="rgba(57,255,106,0.32)" strokeWidth={5} strokeLinecap="round" {...({ pathLength: LOOP_PATH_LENGTH } as object)} />
          {/* the living trail — draws in and out, forever */}
          <AnimatedPath
            animatedProps={loopProps}
            d={LOOP_D}
            fill="none"
            stroke={colors.primary}
            strokeWidth={5}
            strokeLinecap="round"
            {...({ pathLength: LOOP_PATH_LENGTH } as object)}
          />
          {/* the comet — never stops travelling the loop */}
          <AnimatedCircle animatedProps={cometProps} r={14} fill="rgba(57,255,106,0.25)" />
          <AnimatedCircle animatedProps={cometProps} r={6} fill={colors.primary} />
        </Svg>
      </View>

      {/* ── the 3D stage ── */}
      <Animated.View style={[styles.stage, stageStyle, { width: w, height: w * 0.68, top: w * 0.08 }]}>
        <Animated.View style={[styles.sphereWrap, bobStyle]}>
          <View style={[styles.sphere, { width: D, height: D, borderRadius: D / 2 }]}>
            {/* chrome base */}
            <LinearGradient
              style={StyleSheet.absoluteFill}
              colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.07)', 'rgba(10,22,13,0.28)']}
              start={{ x: 0.12, y: 0.02 }}
              end={{ x: 0.88, y: 0.98 }}
            />
            <LinearGradient
              style={StyleSheet.absoluteFill}
              colors={['transparent', 'rgba(0,0,0,0.9)']}
              start={{ x: 0.5, y: 0.4 }}
              end={{ x: 0.5, y: 1 }}
            />
            <LinearGradient
              style={StyleSheet.absoluteFill}
              colors={['rgba(57,255,106,0.12)', 'transparent']}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
            />

            {/* specular glint — the console reflection */}
            <View style={styles.specGlint} />

            {/* curved pitch reflection — a stadium bowl inside the sphere */}
            <Svg style={StyleSheet.absoluteFill} viewBox="0 0 240 240">
              <Path d="M30 186 Q120 136 210 186" stroke="rgba(255,255,255,0.09)" strokeWidth={2} fill="none" />
              <Path d="M22 202 Q120 148 218 202" stroke="rgba(57,255,106,0.08)" strokeWidth={2} fill="none" />
              <Path d="M38 218 Q120 172 202 218" stroke="rgba(255,255,255,0.06)" strokeWidth={1.5} fill="none" />
            </Svg>

            {/* rotating specular cone */}
            <Animated.View style={[styles.sweep, specStyle]}>
              <Svg width="100%" height="100%" viewBox="0 0 240 240">
                <Path d="M120 120 L120 18 A102 102 0 0 1 205 74 Z" fill="rgba(255,255,255,0.07)" />
                <Path d="M120 120 L120 18 A102 102 0 0 1 205 74 Z" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
              </Svg>
            </Animated.View>

            {/* small scoreboard strip — inside the sphere, as in the image */}
            <View style={[styles.miniBoard, { top: D * 0.03 }]}>
              <Text style={[styles.miniBoardTeam, { fontSize: 8 * s }]}>YOU</Text>
              <View style={styles.miniBoardCenter}>
                <Text style={[styles.miniBoardScore, { fontSize: 13 * s }]}>2 – 1</Text>
                <Text style={[styles.miniBoardClock, { fontSize: 7 * s }]}>90'</Text>
              </View>
              <Text style={[styles.miniBoardTeam, styles.miniBoardTeamRight, { fontSize: 8 * s }]}>ELITE</Text>
            </View>

            {/* FIFA-style hexagon radar */}
            <View style={[styles.radarWrap, { top: D * 0.115 }]}>
              <Svg width="100%" height="100%" viewBox="0 0 240 240">
                <Polygon points={ringPts(33)} fill="none" stroke="rgba(57,255,106,0.13)" strokeWidth={1} />
                <Polygon points={ringPts(66)} fill="none" stroke="rgba(57,255,106,0.13)" strokeWidth={1} />
                <Polygon points={ringPts(99)} fill="none" stroke="rgba(57,255,106,0.16)" strokeWidth={1} />
                {AXIS_PTS.map(([x, y], i) => (
                  <Line key={i} x1={120} y1={120} x2={x} y2={y} stroke="rgba(57,255,106,0.12)" strokeWidth={1} />
                ))}
                <Polygon
                  points={hexPts(HEX_VALS, 99)}
                  fill="rgba(57,255,106,0.16)"
                  stroke={colors.primary}
                  strokeWidth={1.8}
                  strokeLinejoin="round"
                />
                {hexPts(HEX_VALS, 99)
                  .split(' ')
                  .map((p, i) => {
                    const [x, y] = p.split(',').map(Number);
                    return <Circle key={i} cx={x} cy={y} r={3.2} fill={colors.primary} />;
                  })}
              </Svg>
            </View>

            {/* rotating scan sweep */}
            <Animated.View style={[styles.sweep, sweepStyle, styles.radarSweep]}>
              <Svg width="100%" height="100%" viewBox="0 0 240 240">
                <Path d="M120 120 L120 20 A100 100 0 0 1 204 79 Z" fill="rgba(57,255,106,0.09)" />
              </Svg>
            </Animated.View>

            {/* the reflection — you */}
            <View style={styles.reflectionWrap}>
              <Svg width={D * 0.2} height={D * 0.26} viewBox="0 0 84 110" fill="none">
                <Circle cx={42} cy={22} r={15} fill="rgba(57,255,106,0.9)" />
                <Path d="M14 104 C14 72 26 52 42 52 C58 52 70 72 70 104 Z" fill="rgba(57,255,106,0.6)" />
                <Path d="M30 70 L14 96 M54 70 L70 96 M42 62 L42 84" stroke="rgba(57,255,106,0.8)" strokeWidth={5} strokeLinecap="round" />
              </Svg>
              <Text style={[styles.reflectionYou, { fontSize: 8.5 * s }]}>YOU</Text>
            </View>

            {/* live badge */}
            <View style={[styles.liveBadge, { top: D * 0.03 }]}>
              <View style={styles.liveDot} />
              <Text style={[styles.liveTxt, { fontSize: 8 * s }]}>LIVE REVIEW</Text>
            </View>

            {/* moment markers row */}
            <View style={[styles.markerRow, { bottom: D * 0.125, width: D * 0.64 }]}>
              <View style={styles.markerBar} />
              {MOMENT_MARKERS.map((m, i) => (
                <View key={i} style={[styles.markerDot, { left: `${m}%` }]} />
              ))}
            </View>

            {/* moment lower-third */}
            <View style={[styles.ticker, { bottom: D * 0.045 }]}>
              <Animated.View key={mi} entering={FadeInDown.duration(280)}>
                <Text numberOfLines={1} style={[styles.tickerTxt, { fontSize: 8 * s }]}>
                  <Text style={styles.tickerClock}>MOMENT {MOMENTS[mi].clock}</Text>
                  {'  ·  '}
                  {MOMENTS[mi].txt}
                </Text>
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>

      {/* ── the three floating chips (as in the approved image) ── */}
      <StatChip label={CHIPS[0].label} value={chipVals[0]} suffix={CHIPS[0].suffix} pulse={p0} scale={s} style={[styles.chipPos, styles.chipTiltL, { top: w * 0.1, left: -w * 0.04 }]} />
      <StatChip label={CHIPS[1].label} value={chipVals[1]} suffix={CHIPS[1].suffix} pulse={p1} scale={s} style={[styles.chipPos, styles.chipTiltR, { top: w * 0.44, right: -w * 0.08 }]} />
      <StatChip label={CHIPS[2].label} value={chipVals[2]} suffix={CHIPS[2].suffix} pulse={p2} scale={s} style={[styles.chipPos, styles.chipTiltL, { top: w * 0.72, left: -w * 0.05 }]} />

      {/* ── the promise pinned under the sphere ── */}
      <View style={[styles.noEnd, { bottom: w * 0.005 }]}>
        <Text style={[styles.noEndInf, { fontSize: 16 * s }]}>∞</Text>
        <Text style={[styles.noEndTxt, { fontSize: 9.5 * s }]}>NO STOP DATE · INFINITE LEARNING</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rig: {
    position: 'relative',
  },
  /* ── loop ── */
  loop: {
    position: 'absolute',
  },
  /* ── stage + sphere ── */
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
    borderColor: 'rgba(57,255,106,0.32)',
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 18 },
    elevation: 16,
  },
  specGlint: {
    position: 'absolute',
    top: '5%',
    left: '9%',
    width: '36%',
    height: '20%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    transform: [{ rotate: '-18deg' }],
  },
  sweep: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  radarWrap: {
    position: 'absolute',
    width: '72%',
    height: '72%',
    alignSelf: 'center',
  },
  radarSweep: {
    opacity: 0.9,
  },
  miniBoard: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '70%',
    backgroundColor: 'rgba(5,10,6,0.55)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 7,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  miniBoardTeam: {
    fontFamily: bodyFontBold,
    letterSpacing: 1.2,
    color: colors.fg,
  },
  miniBoardTeamRight: {
    textAlign: 'right',
  },
  miniBoardCenter: {
    alignItems: 'center',
  },
  miniBoardScore: {
    fontFamily: displayFont,
    color: colors.fg,
    lineHeight: 16,
  },
  miniBoardClock: {
    fontFamily: monoFont,
    letterSpacing: 1.4,
    color: colors.muted,
  },
  reflectionWrap: {
    position: 'absolute',
    top: '21%',
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
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  liveTxt: {
    fontFamily: monoFont,
    letterSpacing: 2,
    color: colors.primary,
  },
  markerRow: {
    position: 'absolute',
    alignSelf: 'center',
    height: 8,
  },
  markerBar: {
    position: 'absolute',
    top: 3,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(57,255,106,0.25)',
  },
  markerDot: {
    position: 'absolute',
    top: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: '#03140a',
  },
  ticker: {
    position: 'absolute',
    alignSelf: 'center',
    width: '84%',
    backgroundColor: 'rgba(5,10,6,0.62)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 7,
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tickerTxt: {
    fontFamily: monoFont,
    letterSpacing: 1.2,
    color: colors.fg,
  },
  tickerClock: {
    color: colors.primary,
  },
  /* ── chips ── */
  chip: {
    position: 'absolute',
    backgroundColor: 'rgba(12,20,14,0.82)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
  chipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
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
  chipTrack: {
    marginTop: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(57,255,106,0.12)',
    overflow: 'hidden',
  },
  chipFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  /* ── no-end promise ── */
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
