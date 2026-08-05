import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, RoundedRect, LinearGradient, BlurMask, Group, vec } from '@shopify/react-native-skia';

// ─────────────────────────────────────────────────────────────────────────
// AURORA VEIN — the soft diagonal band of dyed light the current football
// console drifts through its dark tiles. Rendered on the GPU as one blurred
// gradient beam in the club's colours (green, with a whisper of warm gold).
// Static on purpose: one pass, zero per-frame cost. Use behind thumbnails,
// stage banners and reveals — never on top of text-bearing surfaces.
// ─────────────────────────────────────────────────────────────────────────

type Props = {
  width: number;
  height: number;
  /** overall strength of the light band (default 0.5) */
  opacity?: number;
  /** warm second vein (floodlight gold) crossing the green one */
  warm?: boolean;
};

export default function AuroraVein({ width: w, height: h, opacity = 0.5, warm = false }: Props) {
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group transform={[{ translateX: w * 0.08 }, { translateY: h * 0.18 }, { rotate: -0.42 }]}>
        <RoundedRect x={0} y={0} width={w * 1.25} height={h * 0.62} r={h * 0.31} opacity={opacity}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(w * 1.25, 0)}
            colors={['rgba(57,255,106,0)', 'rgba(57,255,106,0.55)', 'rgba(18,140,110,0.45)', 'rgba(57,255,106,0)']}
          />
          <BlurMask blur={22} style="normal" />
        </RoundedRect>
      </Group>
      {warm && (
        <Group transform={[{ translateX: w * 0.42 }, { translateY: h * 0.52 }, { rotate: -0.42 }]}>
          <RoundedRect x={0} y={0} width={w * 0.9} height={h * 0.4} r={h * 0.2} opacity={opacity * 0.5}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(w * 0.9, 0)}
              colors={['rgba(242,192,120,0)', 'rgba(242,192,120,0.5)', 'rgba(242,192,120,0)']}
            />
            <BlurMask blur={20} style="normal" />
          </RoundedRect>
        </Group>
      )}
    </Canvas>
  );
}
