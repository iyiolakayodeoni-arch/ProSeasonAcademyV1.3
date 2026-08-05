import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect, Path } from 'react-native-svg';

// Full-screen faint grid — an SVG pattern, not an image asset.
// Tinted toward the FC 26-grounded muted teal/steel resting grading
// (docs/FC26_UI_RESEARCH.md §3) while neon green stays the brand's
// live/earned accent on top of it.
const GRID = 'rgba(111,179,168,0.05)';

export default function GridBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <Path
            d="M 48 0 L 0 0 0 48"
            fill="none"
            stroke={GRID}
            strokeWidth="1"
          />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#grid)" />
    </Svg>
  );
}
