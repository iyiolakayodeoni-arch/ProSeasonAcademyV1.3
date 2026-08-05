import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ─────────────────────────────────────────────────────────────────────────
// EDGE GRADIENT — the 1px "aurora hairline" the current console generation
// runs around its live surfaces, translated into OUR club colours: neon
// green bleeding into gold. Only the border is gradient; the child keeps
// its own surface + radius (bg must be opaque so the edge reads crisp).
// Decoration would be off-brand — this edge carries meaning: it marks the
// surfaces that are LIVE (hero, current stage, the earned reveal).
// ─────────────────────────────────────────────────────────────────────────

export const LIVE_STOPS = ['rgba(57,255,106,0.9)', 'rgba(57,255,106,0.14)', 'rgba(242,192,120,0.65)'] as const;
export const QUIET_STOPS = ['rgba(31,56,38,0.9)', 'rgba(31,56,38,0.9)', 'rgba(31,56,38,0.9)'] as const;

type Props = {
  children: React.ReactNode;
  radius?: number;
  /** line width of the edge (the padding that exposes the gradient) */
  weight?: number;
  stops?: readonly string[];
  style?: StyleProp<ViewStyle>;
};

export default function EdgeGradient({ children, radius = 14, weight = 1.2, stops = LIVE_STOPS, style }: Props) {
  return (
    <LinearGradient
      colors={[...stops] as unknown as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: radius, padding: weight }, style]}
    >
      {children}
    </LinearGradient>
  );
}
