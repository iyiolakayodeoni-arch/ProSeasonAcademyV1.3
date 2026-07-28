import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect, Path } from 'react-native-svg';
import { colors } from '../theme';

// Full-screen faint green grid — an SVG pattern, not an image asset.
export default function GridBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <Path
            d="M 48 0 L 0 0 0 48"
            fill="none"
            stroke={colors.gridLine}
            strokeWidth="1"
          />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#grid)" />
    </Svg>
  );
}
