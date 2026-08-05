import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Rect, Circle, Fill, LinearGradient, RadialGradient, FractalNoise, vec } from '@shopify/react-native-skia';
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

export default function PhotoVeil({ width: w, height: h, weight = 'deep', warmAt, grain = 0.06 }: Props) {
  const floor = weight === 'deep'
    ? { start: 0.3, mid: 0.62, colors: ['rgba(10,15,10,0)', 'rgba(10,15,10,0.62)', colors.bg] as const }
    : { start: 0.42, mid: 0.72, colors: ['rgba(10,15,10,0)', 'rgba(10,15,10,0.5)', 'rgba(10,15,10,0.9)'] as const };
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* floor scrim — the photo melts into the page */}
      <Rect x={0} y={0} width={w} height={h}>
        <LinearGradient
          start={vec(0, h * floor.start)}
          end={vec(0, h)}
          colors={[...floor.colors]}
          positions={[0, floor.mid, 1]}
        />
      </Rect>
      {/* cap scrim — quiet zone for status bars / top UI */}
      <Rect x={0} y={0} width={w} height={h}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, h * 0.3)}
          colors={['rgba(10,15,10,0.5)', 'rgba(10,15,10,0)']}
        />
      </Rect>
      {/* warm floodlight kiss — the only "decor", kept whisper-quiet */}
      {warmAt && (
        <Circle cx={warmAt.x} cy={warmAt.y} r={warmAt.r}>
          <RadialGradient
            c={vec(warmAt.x, warmAt.y)}
            r={warmAt.r}
            colors={['rgba(242,192,120,0.10)', 'rgba(242,192,120,0)']}
          />
        </Circle>
      )}
      {/* film grain — the irregular texture photographs have, terminals don't */}
      {grain > 0 && (
        <Fill blendMode="overlay" opacity={grain}>
          <FractalNoise freqX={0.9} freqY={0.9} octaves={3} seed={11} />
        </Fill>
      )}
    </Canvas>
  );
}
