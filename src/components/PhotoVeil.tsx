import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// PHOTOVEIL — the shared GPU atmosphere that makes photography sit natively
// in the app's dark world instead of looking pasted on. One static Skia
// pass: a floor scrim so the photo dissolves into `colors.bg`, a soft cap
// scrim at the top where overlay text/UI lives, an optional warm kiss of
// floodlight, and film grain. Static on purpose — zero per-frame cost.
//
// Mount it absolutely-filled on top of an <Image>, inside a clipped parent
// of known size, and pass that same size in.
//
// On web: pure CSS gradients (CanvasKit worklet init is unreliable in
// react-native-skia v2.x). On native: GPU Skia canvas.
// ─────────────────────────────────────────────────────────────────────────

type Props = {
  width: number;
  height: number;
  /** 'deep' = header bands (photo dissolves into the page); 'light' = cards */
  weight?: 'deep' | 'light';
  /** optional warm floodlight accent, in canvas coords */
  warmAt?: { x: number; y: number; r: number };
  /** grain opacity — 0 disables (default 0.06) */
  grain?: number;
};

/* ── Web fallback — CSS-only, no CanvasKit ── */
function PhotoVeilWeb({ width: w, height: h, weight = 'deep', warmAt, grain = 0.06 }: Props) {
  const isDeep = weight === 'deep';
  const floorStart = isDeep ? '30%' : '42%';
  const floorMid = isDeep ? '62%' : '72%';
  const floorEnd = colors.bg;
  const floorMidColor = isDeep ? 'rgba(10,15,10,0.62)' : 'rgba(10,15,10,0.5)';
  const capColor = 'rgba(10,15,10,0.5)';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* floor scrim */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            // @ts-ignore — backgroundImage is web-only
            backgroundImage: `linear-gradient(to bottom, transparent 0%, ${floorMidColor} ${floorMid}, ${floorEnd} 100%)`,
            backgroundSize: '100% 100%',
          } as any,
        ]}
      />
      {/* cap scrim */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            // @ts-ignore
            backgroundImage: `linear-gradient(to bottom, ${capColor}, transparent)`,
            backgroundSize: `100% ${h * 0.3}px`,
            backgroundRepeat: 'no-repeat',
          } as any,
        ]}
      />
      {/* warm kiss */}
      {warmAt && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              // @ts-ignore
              backgroundImage: `radial-gradient(circle at ${warmAt.x}px ${warmAt.y}px, rgba(242,192,120,0.10), transparent ${warmAt.r}px)`,
            } as any,
          ]}
        />
      )}
      {/* film grain */}
      {grain > 0 && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { opacity: grain, mixBlendMode: 'overlay' } as any,
          ]}
          // @ts-ignore — web-only pseudo via inline SVG data URI
          dataSet={{ psaGrain: '1' }}
        />
      )}
    </View>
  );
}

/* ── Native path — GPU Skia canvas (unchanged) ── */
let SkiaPhotoVeil: React.FC<Props> | null = null;
if (Platform.OS !== 'web') {
  // Lazy require so the Skia module is never imported on web
  const Skia = require('@shopify/react-native-skia');
  const { Canvas, Rect, Circle, Fill, LinearGradient, RadialGradient, FractalNoise, vec } = Skia;
  SkiaPhotoVeil = function PhotoVeilNative({ width: w, height: h, weight = 'deep', warmAt, grain = 0.06 }: Props) {
    const floor = weight === 'deep'
      ? { start: 0.3, mid: 0.62, colors: ['rgba(10,15,10,0)', 'rgba(10,15,10,0.62)', colors.bg] as const }
      : { start: 0.42, mid: 0.72, colors: ['rgba(10,15,10,0)', 'rgba(10,15,10,0.5)', 'rgba(10,15,10,0.9)'] as const };
    return (
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={w} height={h}>
          <LinearGradient
            start={vec(0, h * floor.start)}
            end={vec(0, h)}
            colors={[...floor.colors]}
            positions={[0, floor.mid, 1]}
          />
        </Rect>
        <Rect x={0} y={0} width={w} height={h}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, h * 0.3)}
            colors={['rgba(10,15,10,0.5)', 'rgba(10,15,10,0)']}
          />
        </Rect>
        {warmAt && (
          <Circle cx={warmAt.x} cy={warmAt.y} r={warmAt.r}>
            <RadialGradient
              c={vec(warmAt.x, warmAt.y)}
              r={warmAt.r}
              colors={['rgba(242,192,120,0.10)', 'rgba(242,192,120,0)']}
            />
          </Circle>
        )}
        {grain > 0 && (
          <Fill blendMode="overlay" opacity={grain}>
            <FractalNoise freqX={0.9} freqY={0.9} octaves={3} seed={11} />
          </Fill>
        )}
      </Canvas>
    );
  };
}

export default function PhotoVeil(props: Props) {
  if (Platform.OS === 'web') return <PhotoVeilWeb {...props} />;
  if (SkiaPhotoVeil) return <SkiaPhotoVeil {...props} />;
  return null;
}
