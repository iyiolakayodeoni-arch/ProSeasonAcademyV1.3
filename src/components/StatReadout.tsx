import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, monoFont, gradeColor } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─────────────────────────────────────────────────────────────
// STAT READOUTS — the visual language for receipt-driven numbers.
//
// Principle P1: every readout is fed a real value/target. The fill animates
// from EMPTY to the graded amount on mount — so a "0" reads as a genuinely
// empty ring, never a shimmer pretending progress exists. Colour is earned
// via gradeColor(): green when the evidence holds, amber when thin, red only
// when genuinely short (read as "not yet", never "you failed").
// ─────────────────────────────────────────────────────────────

/** A circular evidence readout. `value`/`target` are the honest ledger. */
export function EvidenceRing({
  value,
  target,
  size = 64,
  stroke = 5,
  label,
  sublabel,
  delay = 0,
  glyph,
}: {
  value: number;
  target: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  delay?: number;
  glyph?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const ratio = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
  const met = target > 0 && value >= target;
  const track = met ? colors.primary : 'rgba(57,255,106,0.14)';

  const offset = useSharedValue(C);
  useEffect(() => {
    offset.value = withDelay(delay, withTiming(C * (1 - ratio), { duration: 620, easing: Easing.out(Easing.cubic) }));
  }, [ratio, C, delay, offset]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  const fill = met ? colors.primary : gradeColor(ratio * 100);

  return (
    <View style={[styles.ringWrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={`er-${met ? 'met' : 'go'}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={fill} stopOpacity={0.65} />
            <Stop offset="100%" stopColor={fill} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={met ? colors.primary : `url(#er-go)`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={C}
          // start at top
          {...({ transform: `rotate(-90 ${size / 2} ${size / 2})` } as object)}
          animatedProps={props}
        />
      </Svg>
      <View style={styles.ringCenter}>
        {glyph ?? (
          <View style={styles.ringTextWrap}>
            <Animated.Text style={[styles.ringLabel, { color: fill }]}>{label ?? `${value}`}</Animated.Text>
            {!!sublabel && <Animated.Text style={styles.ringSub}>{sublabel}</Animated.Text>}
          </View>
        )}
      </View>
    </View>
  );
}

/** A 0..99 attribute bar — the player card's six stats. Honest value, earned colour. */
export function StatBar({
  value,
  label,
  delay = 0,
  compact = false,
}: {
  value: number;
  label: string;
  delay?: number;
  compact?: boolean;
}) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(delay, withTiming(Math.max(2, Math.min(100, value)), { duration: 620 }));
  }, [value, delay, w]);
  const style = useAnimatedProps(() => ({ width: `${w.value}%` })) as any;
  const fill = gradeColor(value);
  return (
    <View style={styles.barRow}>
      <Animated.Text style={[styles.barLabel, compact && styles.barLabelSm]}>{label}</Animated.Text>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: fill, shadowColor: fill },
            style,
          ]}
        />
      </View>
      <Animated.Text style={[styles.barVal, { color: fill }]}>{value}</Animated.Text>
    </View>
  );
}

/** A linear meter for a single honest quantity (honesty weight, ascent, etc.). */
export function EvidenceMeter({
  value,
  max = 100,
  height = 8,
  tint,
  delay = 0,
}: {
  value: number;
  max?: number;
  height?: number;
  tint?: string;
  delay?: number;
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(delay, withTiming(ratio * 100, { duration: 620 }));
  }, [ratio, delay, w]);
  const style = useAnimatedProps(() => ({ width: `${w.value}%` })) as any;
  const fill = tint ?? gradeColor(ratio * 100);
  return (
    <View style={[styles.meterTrack, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.meterFill, { backgroundColor: fill, shadowColor: fill }, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringTextWrap: { alignItems: 'center' },
  ringLabel: { fontFamily: monoFont, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  ringSub: { fontFamily: monoFont, fontSize: 6, letterSpacing: 1, color: colors.muted, marginTop: 1 },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontFamily: monoFont, fontSize: 7, fontWeight: '800', letterSpacing: 1.4, color: colors.muted, width: 62 },
  barLabelSm: { fontSize: 6, width: 50 },
  barTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(57,255,106,0.12)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    shadowOpacity: 0.7,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  barVal: { fontFamily: monoFont, fontSize: 9, fontWeight: '900', width: 22, textAlign: 'right' },

  meterTrack: { width: '100%', backgroundColor: 'rgba(57,255,106,0.12)', overflow: 'hidden' },
  meterFill: { height: '100%', shadowOpacity: 0.6, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } },
});
