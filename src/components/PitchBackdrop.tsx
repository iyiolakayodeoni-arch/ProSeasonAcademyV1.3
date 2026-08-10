import React from 'react';
import { Image, View, StyleSheet, Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────
// PITCH BACKDROP — the dimmed football-pitch background shared by the splash
// and the marketing site. A real pitch / match photograph, darkened so the
// foreground (the crest, the nav, the content) stays the focus. Optional
// blur for the splash opening.
//
// On the scrolling marketing page pass `fixed` so the pitch stays pinned to
// the viewport and covers the whole page behind the content at every scroll
// position (instead of only the first screen).
// ─────────────────────────────────────────────────────────────────────────

const WEB = Platform.OS === 'web';
const PITCH = require('../../assets/art/pitch-bg.png');

type Props = {
  blurred?: boolean;
  dim?: number;
  /** keep the pitch pinned to the viewport on web (full-page background) */
  fixed?: boolean;
};

export default function PitchBackdrop({ blurred = false, dim = 0.72, fixed = false }: Props) {
  const filter = WEB ? `brightness(${0.35 + dim * 0.15}) saturate(0.85)${blurred ? ' blur(14px)' : ''}` : undefined;

  const wrapStyle = fixed
    ? (WEB
        ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 } as any)
        : StyleSheet.absoluteFill)
    : StyleSheet.absoluteFill;

  return (
    <View pointerEvents="none" style={wrapStyle}>
      <Image
        source={PITCH}
        resizeMode="cover"
        style={[
          StyleSheet.absoluteFill,
          WEB && filter ? ({ filter, transform: blurred ? [{ scale: 1.1 }] : undefined } as any) : null,
        ]}
      />
    </View>
  );
}
