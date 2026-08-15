import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────
// AURORA VEIN — the soft diagonal band of dyed light the current football
// console drifts through its dark tiles. Rendered on the GPU as one blurred
// gradient beam in the club's colours (green, with a whisper of warm gold).
// Static on purpose: one pass, zero per-frame cost. Use behind thumbnails,
// stage banners and reveals — never on top of text-bearing surfaces.
//
// On web: pure CSS (CanvasKit worklet init is unreliable in
// react-native-skia v2.x). On native: GPU Skia canvas.
// ─────────────────────────────────────────────────────────────────────────

type Props = {
  width: number;
  height: number;
  /** overall strength of the light band (default 0.5) */
  opacity?: number;
  /** warm second vein (floodlight gold) crossing the green one */
  warm?: boolean;
};

/* ── Web fallback — CSS-only, no CanvasKit ── */
function AuroraVeinWeb({ width: w, height: h, opacity = 0.5, warm = false }: Props) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* green vein */}
      <View
        style={{
          position: 'absolute',
          left: w * 0.08,
          top: h * 0.18,
          width: w * 1.25,
          height: h * 0.62,
          borderRadius: h * 0.31,
          opacity,
          transform: [{ rotate: '-24deg' }],
          // @ts-ignore — backgroundImage is web-only
          backgroundImage: 'linear-gradient(to right, rgba(57,255,106,0), rgba(57,255,106,0.55), rgba(18,140,110,0.45), rgba(57,255,106,0))',
          filter: 'blur(22px)',
        } as any}
      />
      {/* warm vein */}
      {warm && (
        <View
          style={{
            position: 'absolute',
            left: w * 0.42,
            top: h * 0.52,
            width: w * 0.9,
            height: h * 0.4,
            borderRadius: h * 0.2,
            opacity: opacity * 0.5,
            transform: [{ rotate: '-24deg' }],
            // @ts-ignore
            backgroundImage: 'linear-gradient(to right, rgba(242,192,120,0), rgba(242,192,120,0.5), rgba(242,192,120,0))',
            filter: 'blur(20px)',
          } as any}
        />
      )}
    </View>
  );
}

/* ── Native path — GPU Skia canvas (unchanged) ── */
let SkiaAuroraVein: React.FC<Props> | null = null;
if (Platform.OS !== 'web') {
  const Skia = require('@shopify/react-native-skia');
  const { Canvas, RoundedRect, LinearGradient, BlurMask, Group, vec } = Skia;
  SkiaAuroraVein = function AuroraVeinNative({ width: w, height: h, opacity = 0.5, warm = false }: Props) {
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
  };
}

export default function AuroraVein(props: Props) {
  if (Platform.OS === 'web') return <AuroraVeinWeb {...props} />;
  if (SkiaAuroraVein) return <SkiaAuroraVein {...props} />;
  return null;
}
