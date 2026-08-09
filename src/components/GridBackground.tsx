import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Rect, Path, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../theme';

// Premium ambient background — grid + aurora orbs. Cheap grid alone felt flat;
// the aurora gives depth without stealing focus from the ledger.
export default function GridBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Aurora orbs — subtle, premium depth */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="orbGreen" cx="85%" cy="0%" r="70%">
            <Stop offset="0%" stopColor="rgba(57,255,106,0.10)" stopOpacity={1} />
            <Stop offset="100%" stopColor="rgba(57,255,106,0)" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="orbGold" cx="12%" cy="100%" r="65%">
            <Stop offset="0%" stopColor="rgba(242,192,120,0.07)" stopOpacity={1} />
            <Stop offset="100%" stopColor="rgba(242,192,120,0)" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="orbCenter" cx="50%" cy="50%" r="80%">
            <Stop offset="0%" stopColor="rgba(12,30,18,0.35)" stopOpacity={1} />
            <Stop offset="100%" stopColor="rgba(5,10,6,0)" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#orbGreen)" />
        <Rect width="100%" height="100%" fill="url(#orbGold)" />
        <Rect width="100%" height="100%" fill="url(#orbCenter)" />
      </Svg>

      {/* Faint grid */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <Path d="M 48 0 L 0 0 0 48" fill="none" stroke={colors.gridLine} strokeWidth="1" />
          </Pattern>
          <Pattern id="gridBold" width="192" height="192" patternUnits="userSpaceOnUse">
            <Path d="M 192 0 L 0 0 0 192" fill="none" stroke="rgba(57,255,106,0.025)" strokeWidth="1" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#gridBold)" />
        <Rect width="100%" height="100%" fill="url(#grid)" />
      </Svg>

      {/* Bottom vignette — grounds the page */}
      <View style={styles.vignette} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  vignette: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 280,
    backgroundColor: 'transparent',
    // CSS gradient via RN Web style hack — fallback to transparent on native
    // @ts-ignore
    backgroundImage: 'linear-gradient(180deg, transparent 0%, rgba(5,10,6,0.55) 100%)',
  } as any,
});
