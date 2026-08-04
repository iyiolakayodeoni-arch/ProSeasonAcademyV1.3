import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, G, Polygon, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { colors, glow } from '../theme';

// ─────────────────────────────────────────────────────────────
// BADGE MARKS — the stage badges as real objects, not strings.
//
// Principles P1/P3. Today a cleared stage awards the string
// 'SEE YOURSELF BADGE' which is never rendered. A badge is the
// archetypal thing that should *be* a visual, so each of the six
// universal stages gets an ORIGINAL geometric crest (no real club
// or league likeness — same stance as the Role Model card). An
// unsealed badge is a quiet outline; sealing it fills + lights it.
// ─────────────────────────────────────────────────────────────

export const BADGE_LABELS: Record<number, string> = {
  1: 'SEE YOURSELF',
  2: 'CONTROL YOURSELF',
  3: 'READ THE GAME',
  4: 'BUILD DISCIPLINE',
  5: 'PERFORM UNDER PRESSURE',
  6: 'PROVE IT',
};

// the hex/shield frame every crest sits inside — one consistent silhouette
const FRAME =
  'M 50 6 L 86 24 L 86 58 C 86 76 70 88 50 94 C 30 88 14 76 14 58 L 14 24 Z';

function Crest({ stage, color, dim }: { stage: number; color: string; dim: boolean }) {
  const stroke = color;
  const fill = dim ? 'none' : color;
  const o = dim ? 0.5 : 1;
  switch (stage) {
    case 1: // SEE YOURSELF — an eye: lens + iris + lid
      return (
        <G opacity={o}>
          <Path d="M 28 50 C 36 40 64 40 72 50 C 64 60 36 60 28 50 Z" stroke={stroke} strokeWidth={2.2} fill="none" />
          <Circle cx="50" cy="50" r="7.5" stroke={stroke} strokeWidth={2.2} fill={dim ? 'none' : 'rgba(57,255,106,0.25)'} />
          <Circle cx="50" cy="50" r="3" fill={fill} />
        </G>
      );
    case 2: // CONTROL YOURSELF — a still centre: concentric rings + cross
      return (
        <G opacity={o}>
          <Circle cx="50" cy="50" r="15" stroke={stroke} strokeWidth={2.1} fill="none" />
          <Circle cx="50" cy="50" r="8" stroke={stroke} strokeWidth={2.1} fill={dim ? 'none' : 'rgba(57,255,106,0.2)'} />
          <Line x1="50" y1="33" x2="50" y2="42" stroke={stroke} strokeWidth={2.1} strokeLinecap="round" />
          <Line x1="50" y1="58" x2="50" y2="67" stroke={stroke} strokeWidth={2.1} strokeLinecap="round" />
          <Circle cx="50" cy="50" r="2.6" fill={fill} />
        </G>
      );
    case 3: // READ THE GAME — a lattice: the patterns you learn to count
      return (
        <G opacity={o}>
          {[38, 50, 62].map((y) => (
            <Line key={`h${y}`} x1="32" y1={y} x2="68" y2={y} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
          ))}
          {[38, 50, 62].map((x) => (
            <Line key={`v${x}`} x1={x} y1="36" x2={x} y2="64" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
          ))}
          <Circle cx="50" cy="50" r="2.6" fill={fill} />
        </G>
      );
    case 4: // BUILD DISCIPLINE — stacked layers: the routine is the talent
      return (
        <G opacity={o}>
          <Rect x="34" y="58" width="32" height="7" rx="1.6" stroke={stroke} strokeWidth={1.9} fill={dim ? 'none' : 'rgba(57,255,106,0.16)'} />
          <Rect x="37" y="48" width="26" height="7" rx="1.6" stroke={stroke} strokeWidth={1.9} fill={dim ? 'none' : 'rgba(57,255,106,0.22)'} />
          <Rect x="40" y="38" width="20" height="7" rx="1.6" stroke={stroke} strokeWidth={1.9} fill={dim ? 'none' : 'rgba(57,255,106,0.3)'} />
          <Circle cx="50" cy="32" r="2.4" fill={fill} />
        </G>
      );
    case 5: // PERFORM UNDER PRESSURE — a bar pressed by an arrow: under fire
      return (
        <G opacity={o}>
          <Line x1="32" y1="64" x2="68" y2="64" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
          <Path d="M 50 30 L 50 58 M 42 50 L 50 58 L 58 50" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Circle cx="50" cy="30" r="2.4" fill={fill} />
        </G>
      );
    case 6: // PROVE IT — the summit: a peak under an arc (the standard reached)
      return (
        <G opacity={o}>
          <Path d="M 30 62 L 50 34 L 70 62" stroke={stroke} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Path d="M 50 34 L 50 62" stroke={stroke} strokeWidth={1.6} opacity={0.6} />
          <Path d="M 36 44 C 42 36 58 36 64 44" stroke={stroke} strokeWidth={1.8} fill="none" opacity={0.7} />
          <Polygon points="50,28 52.2,33 57.5,33 53.3,36.2 54.9,41.4 50,38.2 45.1,41.4 46.7,36.2 42.5,33 47.8,33" fill={fill} />
        </G>
      );
    default:
      return null;
  }
}

export default function BadgeMark({
  stage,
  size = 56,
  sealed = false,
  accent,
}: {
  stage: number;
  size?: number;
  /** earned this badge? sealed = lit + filled; unsealed = quiet outline */
  sealed?: boolean;
  accent?: string;
}) {
  const color = sealed ? (accent ?? colors.primary) : 'rgba(143,184,155,0.55)';
  return (
    <Animated.View style={[styles.wrap, sealed && glow.held]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="bm-halo" cx="50%" cy="42%" r="60%">
            <Stop offset="0%" stopColor={color} stopOpacity={sealed ? 0.22 : 0.06} />
            <Stop offset="70%" stopColor={color} stopOpacity={0.02} />
          </RadialGradient>
        </Defs>
        <Path d={FRAME} fill="url(#bm-halo)" />
        <Path
          d={FRAME}
          fill="none"
          stroke={color}
          strokeWidth={sealed ? 2.6 : 1.6}
          strokeOpacity={sealed ? 0.95 : 0.6}
          strokeLinejoin="round"
        />
        <Crest stage={stage} color={color} dim={!sealed} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
