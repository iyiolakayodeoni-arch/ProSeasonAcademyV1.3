import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../theme';

// the little pitch-grid thumbnail used on feed cards + the hero,
// with a dashed run traced across it.

type Props = {
  width: number;
  height: number;
  variant?: 'pitchRun' | 'pitchFade' | 'kickoff'; // run shape
  showPlay?: boolean;
  duration?: string;
  color?: string;
};

const RUNS: Record<string, { d: string; dot: [number, number] }> = {
  pitchRun: { d: 'M 10 84 C 34 78, 44 58, 62 44 C 74 35, 84 24, 92 14', dot: [92, 14] },
  pitchFade: { d: 'M 12 18 C 30 26, 40 52, 58 62 C 72 70, 82 82, 92 90', dot: [92, 90] },
  kickoff: { d: 'M 50 96 C 44 70, 60 52, 56 34 C 54 24, 50 16, 52 8', dot: [52, 8] },
};

export default function MiniPitch({ width, height, variant = 'pitchRun', showPlay, duration, color }: Props) {
  const c = color ?? colors.primary;
  const run = RUNS[variant];
  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg width="100%" height="100%" viewBox="0 0 104 104">
        <Defs>
          <RadialGradient id="pg" cx="50%" cy="45%" r="75%">
            <Stop offset="0%" stopColor={c} stopOpacity={0.14} />
            <Stop offset="70%" stopColor={c} stopOpacity={0.03} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="104" height="104" fill="url(#pg)" />
        {/* pitch markings (vertical half-pitch) */}
        <Rect x="16" y="6" width="72" height="92" stroke="rgba(57,255,106,0.28)" strokeWidth="1.2" fill="none" />
        <Path d="M 16 52 H 88" stroke="rgba(57,255,106,0.22)" strokeWidth="1" />
        <Circle cx="52" cy="52" r="11" stroke="rgba(57,255,106,0.22)" strokeWidth="1" fill="none" />
        <Rect x="34" y="6" width="36" height="13" stroke="rgba(57,255,106,0.25)" strokeWidth="1" fill="none" />
        <Rect x="34" y="85" width="36" height="13" stroke="rgba(57,255,106,0.25)" strokeWidth="1" fill="none" />
        {/* the run */}
        <Path d={run.d} stroke={c} strokeWidth="1.6" strokeDasharray="3.5 3.2" strokeLinecap="round" fill="none" />
        <Circle cx={run.dot[0]} cy={run.dot[1]} r="2.6" fill={c} />
      </Svg>
      {showPlay && (
        <View style={styles.playWrap}>
          <View style={styles.playCircle}>
            <View style={styles.playTri} />
          </View>
        </View>
      )}
      {duration ? (
        <View style={styles.duration}>
          <View style={styles.durationDot} />
          {/* text is supplied by the parent for font control */}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(9,17,11,0.6)',
  },
  playWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  playCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.4,
    borderColor: colors.primary,
    backgroundColor: 'rgba(10,15,10,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  playTri: {
    width: 0,
    height: 0,
    marginLeft: 2,
    borderLeftWidth: 8,
    borderTopWidth: 5.5,
    borderBottomWidth: 5.5,
    borderLeftColor: colors.primary,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  duration: { position: 'absolute', right: 7, bottom: 7, flexDirection: 'row', alignItems: 'center' },
  durationDot: { width: 12, height: 8, borderRadius: 2, borderWidth: 1, borderColor: 'rgba(238,242,236,0.5)' },
});
