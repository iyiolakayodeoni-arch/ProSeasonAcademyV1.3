import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Circle as SvgCircle, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { colors, monoFont } from '../../theme';
import type { MediaKind } from '../../data/fcFeed';

// ─────────────────────────────────────────────────────────────
// SKILL MEDIA — the "animated video" of a card.
//
// A miniature top-down pitch where the ball loops through the
// actual mechanic (stepover weave, elastico figure, rainbow arc
// over the defender, through-ball lane, tiki-taka triangle,
// finesse curl) forever. A faint pre-drawn path shows the whole
// move — the playbook line — while the ball rides it.
// ─────────────────────────────────────────────────────────────

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Pt = { x: number; y: number };

interface Actor {
  path: (t: number) => Pt;
  size: number;
  color: string;
  glow?: boolean;
  trail?: boolean;
}

function actorsFor(kind: MediaKind): Actor[] {
  switch (kind) {
    case 'stepover':
      return [
        {
          path: (t) => ({ x: lerp(0.16, 0.76, t), y: 0.5 + 0.17 * Math.sin(t * Math.PI * 2.2) }),
          size: 13,
          color: '#ffffff',
          glow: true,
          trail: true,
        },
      ];
    case 'elastico':
      return [
        {
          path: (t) => ({ x: lerp(0.16, 0.74, t), y: 0.5 + 0.13 * Math.sin(t * Math.PI * 4) }),
          size: 13,
          color: '#ffffff',
          glow: true,
          trail: true,
        },
      ];
    case 'rainbow':
      return [
        {
          path: (t) => ({ x: lerp(0.24, 0.6, t), y: 0.66 - 0.42 * Math.sin(Math.PI * t) }),
          size: 13,
          color: '#ffffff',
          glow: true,
          trail: true,
        },
      ];
    case 'finesse':
      return [
        {
          path: (t) => ({ x: lerp(0.18, 0.88, t) + 0.1 * Math.sin(Math.PI * t), y: lerp(0.72, 0.14, t) }),
          size: 13,
          color: '#ffffff',
          glow: true,
          trail: true,
        },
      ];
    case 'through':
      return [
        {
          path: (t) => ({ x: lerp(0.2, 0.66, t) + 0.08 * Math.sin(Math.PI * t), y: lerp(0.52, 0.4, t) }),
          size: 13,
          color: '#ffffff',
          glow: true,
          trail: true,
        },
        {
          path: (t) => ({ x: lerp(0.48, 0.8, t), y: lerp(0.62, 0.28, t) }),
          size: 12,
          color: colors.primary,
          glow: true,
        },
      ];
    case 'tikitaka': {
      const A = { x: 0.24, y: 0.66 };
      const B = { x: 0.52, y: 0.66 };
      const C = { x: 0.38, y: 0.28 };
      return [
        {
          path: (t) => {
            if (t < 1 / 3) {
              const u = t / (1 / 3);
              return { x: lerp(A.x, B.x, u), y: lerp(A.y, B.y, u) };
            }
            if (t < 2 / 3) {
              const u = (t - 1 / 3) / (1 / 3);
              return { x: lerp(B.x, C.x, u), y: lerp(B.y, C.y, u) };
            }
            const u = (t - 2 / 3) / (1 / 3);
            return { x: lerp(C.x, A.x, u), y: lerp(C.y, A.y, u) };
          },
          size: 13,
          color: '#ffffff',
          glow: true,
          trail: true,
        },
      ];
    }
    default:
      return [];
  }
}

function contextDots(kind: MediaKind): { x: number; y: number; color: string }[] {
  switch (kind) {
    case 'stepover':
      return [{ x: 0.5, y: 0.5, color: colors.loss }];
    case 'elastico':
      return [{ x: 0.5, y: 0.5, color: colors.loss }];
    case 'rainbow':
      return [{ x: 0.42, y: 0.66, color: colors.loss }];
    case 'finesse':
      return [{ x: 0.86, y: 0.5, color: colors.accent }];
    case 'through':
      return [
        { x: 0.44, y: 0.34, color: colors.loss },
        { x: 0.58, y: 0.56, color: colors.loss },
      ];
    case 'tikitaka':
      return [
        { x: 0.24, y: 0.66, color: colors.steel },
        { x: 0.52, y: 0.66, color: colors.steel },
        { x: 0.38, y: 0.28, color: colors.steel },
      ];
    default:
      return [];
  }
}

function pathPoints(path: (t: number) => Pt, samples: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const p = path(i / samples);
    pts.push(`${(p.x * 100).toFixed(2)},${(p.y * 100).toFixed(2)}`);
  }
  return pts.join(' ');
}

/** Animated translate for one actor. Always called (both slots) so hook order is stable. */
function useActorStyle(progress: SharedValue<number>, actor: Actor | null, W: number, H: number) {
  return useAnimatedStyle(() => {
    if (!actor) return { opacity: 0 };
    const p = actor.path(progress.value);
    return {
      opacity: 1,
      transform: [
        { translateX: p.x * W - actor.size / 2 },
        { translateY: p.y * H - actor.size / 2 },
      ],
    };
  });
}

const LINE = 'rgba(57,255,106,0.14)';

type Props = {
  kind: MediaKind;
  width: number;
  tag: string; // 'SKILL' | 'TACTIC'
  difficulty?: number;
};

export default function SkillMedia({ kind, width, tag, difficulty }: Props) {
  const H = Math.round(width * 0.62);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [progress]);

  const actors = useMemo(() => actorsFor(kind), [kind]);
  const dots = useMemo(() => contextDots(kind), [kind]);
  const trails = useMemo(
    () => actors.filter((a) => a.trail).map((a) => pathPoints(a.path, 48)),
    [actors],
  );

  const s1 = useActorStyle(progress, actors[0] ?? null, width, H);
  const s2 = useActorStyle(progress, actors[1] ?? null, width, H);

  return (
    <View style={[styles.box, { width, height: H }]}>
      {/* pitch */}
      <Svg width={width} height={H} viewBox={`0 0 100 ${Math.round((H / width) * 100)}`}>
        <Rect x={3} y={3} width={94} height={Math.round((H / width) * 100) - 6} fill="none" stroke={LINE} strokeWidth={0.6} />
        <Line x1={50} y1={3} x2={50} y2={Math.round((H / width) * 100) - 3} stroke={LINE} strokeWidth={0.6} />
        <SvgCircle cx={50} cy={Math.round((H / width) * 50)} r={9} fill="none" stroke={LINE} strokeWidth={0.6} />
        {/* left box */}
        <Rect x={3} y={Math.round((H / width) * 22)} width={14} height={Math.round((H / width) * 56)} fill="none" stroke={LINE} strokeWidth={0.6} />
        {/* right box */}
        <Rect x={83} y={Math.round((H / width) * 22)} width={14} height={Math.round((H / width) * 56)} fill="none" stroke={LINE} strokeWidth={0.6} />
        {/* goals — the lit mouth of the net */}
        <Line x1={2} y1={Math.round((H / width) * 38)} x2={2} y2={Math.round((H / width) * 62)} stroke={colors.primary} strokeWidth={1.4} opacity={0.85} />
        <Line x1={98} y1={Math.round((H / width) * 38)} x2={98} y2={Math.round((H / width) * 62)} stroke={colors.primary} strokeWidth={1.4} opacity={0.85} />
        {/* the playbook line — the full move, pre-drawn */}
        {trails.map((pts, i) => (
          <Polyline
            key={i}
            points={pts}
            fill="none"
            stroke={colors.primary}
            strokeWidth={0.9}
            opacity={0.35}
            strokeDasharray="2 2.4"
            strokeLinecap="round"
          />
        ))}
      </Svg>

      {/* context dots — defenders / teammates / keeper */}
      {dots.map((d, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: d.color,
              left: d.x * width - 5,
              top: d.y * H - 5,
              shadowColor: d.color,
              shadowOpacity: 0.6,
            },
          ]}
        />
      ))}

      {/* the ball (and second actor, e.g. the striker on a through ball) */}
      <Animated.View style={[styles.ball, s1, actors[0] ? styles.ballGlow : null]} />
      <Animated.View
        style={[
          styles.ball,
          s2,
          {
            width: actors[1]?.size ?? 0,
            height: actors[1]?.size ?? 0,
            backgroundColor: actors[1]?.color ?? 'transparent',
          },
          actors[1] ? styles.ballGlow : null,
        ]}
      />

      {/* badges */}
      <View style={styles.tagChip}>
        <Text style={styles.tagText}>{tag}</Text>
      </View>
      {typeof difficulty === 'number' && (
        <View style={styles.diffRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={[styles.diffDot, i <= difficulty ? styles.diffDotLit : null]}
            />
          ))}
        </View>
      )}
      <View style={styles.loopChip}>
        <Text style={styles.loopText}>{'\u221E'} LOOP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'relative',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.16)',
    backgroundColor: '#08110b',
    overflow: 'hidden',
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ball: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    left: 0,
    top: 0,
  },
  ballGlow: {
    shadowColor: '#ffffff',
    shadowOpacity: 0.75,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  tagChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(5,10,6,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.25)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.6,
  },
  diffRow: {
    position: 'absolute',
    top: 14,
    right: 12,
    flexDirection: 'row',
    gap: 4,
  },
  diffDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(143,184,155,0.25)',
  },
  diffDotLit: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.7,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  loopChip: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(5,10,6,0.78)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  loopText: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 1.2,
  },
});
