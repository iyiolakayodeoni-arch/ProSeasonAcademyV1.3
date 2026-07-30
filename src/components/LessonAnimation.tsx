import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Rect, Stop, RadialGradient } from 'react-native-svg';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, monoFont } from '../theme';

// ─────────────────────────────────────────────────────────────
// LESSON ANIMATION — zero-cost silent mechanic explainers.
// No video hosting, no AI video bill, no copyrighted clips.
// It draws a tiny pitch and animates dots/paths like a coaching
// board: attacker, defender, ball, run lane and finish point.
// ─────────────────────────────────────────────────────────────

type Variant = 'pitchRun' | 'pitchFade' | 'kickoff';

type Point = { x: number; y: number };

type Scene = {
  title: string;
  path: string;
  start: Point;
  mid: Point;
  end: Point;
  defenderA: Point;
  defenderB: Point;
  target: Point;
};

const SCENES: Record<Variant, Scene> = {
  pitchRun: {
    title: 'LANE RUN',
    path: 'M 16 82 C 30 74, 35 60, 48 51 C 62 40, 74 30, 88 18',
    start: { x: 16, y: 82 },
    mid: { x: 48, y: 51 },
    end: { x: 88, y: 18 },
    defenderA: { x: 45, y: 62 },
    defenderB: { x: 66, y: 37 },
    target: { x: 91, y: 15 },
  },
  pitchFade: {
    title: 'BACK POST',
    path: 'M 15 27 C 33 34, 44 51, 59 60 C 71 68, 82 76, 91 88',
    start: { x: 15, y: 27 },
    mid: { x: 59, y: 60 },
    end: { x: 91, y: 88 },
    defenderA: { x: 45, y: 45 },
    defenderB: { x: 75, y: 68 },
    target: { x: 92, y: 91 },
  },
  kickoff: {
    title: 'KICK OFF',
    path: 'M 52 94 C 48 74, 61 58, 56 42 C 53 30, 50 20, 52 10',
    start: { x: 52, y: 94 },
    mid: { x: 56, y: 42 },
    end: { x: 52, y: 10 },
    defenderA: { x: 41, y: 54 },
    defenderB: { x: 67, y: 35 },
    target: { x: 52, y: 8 },
  },
};

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function point(scene: Scene, t: number): Point {
  if (t < 0.55) {
    const q = t / 0.55;
    return { x: mix(scene.start.x, scene.mid.x, q), y: mix(scene.start.y, scene.mid.y, q) };
  }
  const q = (t - 0.55) / 0.45;
  return { x: mix(scene.mid.x, scene.end.x, q), y: mix(scene.mid.y, scene.end.y, q) };
}

export default function LessonAnimation({
  width,
  height,
  variant = 'pitchRun',
  color = colors.primary,
  playing = true,
  showLabel = true,
}: {
  width: number;
  height: number;
  variant?: Variant;
  color?: string;
  playing?: boolean;
  showLabel?: boolean;
}) {
  const scene = SCENES[variant] ?? SCENES.pitchRun;
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = 0;
    if (playing) p.value = withRepeat(withTiming(1, { duration: 2600 }), -1, false);
    else p.value = withTiming(0.42, { duration: 360 });
  }, [p, playing, variant]);

  const ballStyle = useAnimatedStyle(() => {
    const q = p.value % 1;
    const pt = point(scene, q);
    return {
      opacity: interpolate(q, [0, 0.08, 0.92, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: (pt.x / 104) * width - 5 },
        { translateY: (pt.y / 104) * height - 5 },
        { scale: interpolate(q, [0, 0.55, 1], [0.8, 1.08, 0.72]) },
      ],
    };
  });

  const runnerStyle = useAnimatedStyle(() => {
    const q = Math.min(1, (p.value % 1) * 1.08);
    const pt = point(scene, q);
    return {
      opacity: 0.95,
      transform: [
        { translateX: (pt.x / 104) * width - 7 },
        { translateY: (pt.y / 104) * height - 7 },
      ],
    };
  });

  const targetStyle = useAnimatedStyle(() => {
    const q = p.value % 1;
    return {
      opacity: interpolate(q, [0, 0.45, 0.7, 1], [0.28, 0.28, 1, 0.28]),
      transform: [
        { translateX: (scene.target.x / 104) * width - 12 },
        { translateY: (scene.target.y / 104) * height - 12 },
        { scale: interpolate(q, [0, 0.65, 1], [0.9, 1.35, 0.9]) },
      ],
    };
  });

  const defenderShift = useAnimatedStyle(() => {
    const q = p.value % 1;
    return {
      transform: [
        { translateX: interpolate(q, [0, 0.7, 1], [0, variant === 'pitchFade' ? -5 : 5, 0]) },
        { translateY: interpolate(q, [0, 0.7, 1], [0, 3, 0]) },
      ],
    };
  });

  const dims = useMemo(() => ({ width, height }), [width, height]);

  return (
    <View style={[styles.wrap, dims]}>
      <Svg width="100%" height="100%" viewBox="0 0 104 104">
        <Defs>
          <RadialGradient id="la_glow" cx="50%" cy="45%" r="72%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.16} />
            <Stop offset="74%" stopColor={color} stopOpacity={0.03} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="104" height="104" fill="url(#la_glow)" />
        <Rect x="12" y="5" width="80" height="94" rx="4" stroke="rgba(57,255,106,0.24)" strokeWidth="1.1" fill="none" />
        <Line x1="12" y1="52" x2="92" y2="52" stroke="rgba(57,255,106,0.18)" strokeWidth="1" />
        <Circle cx="52" cy="52" r="11" stroke="rgba(57,255,106,0.18)" strokeWidth="1" fill="none" />
        <Rect x="34" y="5" width="36" height="13" stroke="rgba(57,255,106,0.22)" strokeWidth="1" fill="none" />
        <Rect x="34" y="86" width="36" height="13" stroke="rgba(57,255,106,0.22)" strokeWidth="1" fill="none" />
        <Path d={scene.path} stroke={color} strokeWidth="1.8" strokeDasharray="4 3" strokeLinecap="round" fill="none" />
        <Circle cx={scene.start.x} cy={scene.start.y} r="2" fill="rgba(238,242,236,0.7)" />
        <Circle cx={scene.end.x} cy={scene.end.y} r="2.4" fill={color} />
      </Svg>

      <Animated.View pointerEvents="none" style={[styles.target, { borderColor: color }, targetStyle]} />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.defender,
          {
            left: (scene.defenderA.x / 104) * width - 7,
            top: (scene.defenderA.y / 104) * height - 7,
          },
          defenderShift,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.defender,
          styles.defenderDim,
          {
            left: (scene.defenderB.x / 104) * width - 7,
            top: (scene.defenderB.y / 104) * height - 7,
          },
          defenderShift,
        ]}
      />

      <Animated.View pointerEvents="none" style={[styles.runner, { borderColor: color }, runnerStyle]} />
      <Animated.View pointerEvents="none" style={[styles.ball, { backgroundColor: color, shadowColor: color }, ballStyle]} />

      {showLabel && (
        <View style={styles.labelPill}>
          <Text style={styles.labelTxt}>{scene.title}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(9,17,11,0.74)',
  },
  ball: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOpacity: 0.9,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
  runner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    backgroundColor: 'rgba(238,242,236,0.16)',
  },
  defender: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(224,96,92,0.74)',
  },
  defenderDim: { opacity: 0.55 },
  target: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.4,
    backgroundColor: 'rgba(57,255,106,0.06)',
  },
  labelPill: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.28)',
    backgroundColor: 'rgba(10,15,10,0.84)',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  labelTxt: {
    fontFamily: monoFont,
    fontSize: 5.8,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: 'rgba(238,242,236,0.82)',
  },
});
