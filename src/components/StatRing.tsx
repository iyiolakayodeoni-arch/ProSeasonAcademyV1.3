import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { monoFont, colors } from '../theme';
import { computeRingMetrics } from './statRingUtils';

type Props = {
  label: string;
  value: number; // 0..100
  suffix?: string;
  size?: number;
};

export default function StatRing({ label, value, suffix, size = 64 }: Props) {
  const { value: v, R, C, dash } = computeRingMetrics(value, size);
  return (
    <View style={[styles.wrap, { width: size, height: size }]}> 
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={R} stroke="rgba(255,255,255,0.06)" strokeWidth={Math.max(4, Math.round(size * 0.09))} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={R}
          stroke={colors.primary}
          strokeWidth={Math.max(4, Math.round(size * 0.09))}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${Math.max(1, C - dash)}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.labelWrap} pointerEvents="none">
        <Text style={[styles.value, { fontSize: Math.max(10, Math.round(size * 0.18)) }]}>{v}{suffix ?? ''}</Text>
        <Text style={[styles.label, { fontSize: Math.max(7, Math.round(size * 0.11)) }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  labelWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: monoFont, fontWeight: '900', color: colors.fg },
  label: { marginTop: 2, fontFamily: monoFont, color: colors.muted, letterSpacing: 0.8 },
});

export { computeRingMetrics };
