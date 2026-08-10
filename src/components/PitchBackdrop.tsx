import React from 'react';
import { Image, View, StyleSheet, Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────
// PITCH BACKDROP — the dimmed football-pitch background shared by the splash
// and the marketing site. A real pitch / match photograph, darkened so the
// foreground (the crest, the nav, the content) stays the focus. Optional
// blur for the splash opening.
// ─────────────────────────────────────────────────────────────────────────

const WEB = Platform.OS === 'web';
const PITCH = require('../../assets/art/pitch-bg.png');

type Props = {
  blurred?: boolean;
  dim?: number;
};

export default function PitchBackdrop({ blurred = false, dim = 0.72 }: Props) {
  const filter = WEB ? `brightness(${0.35 + dim * 0.15}) saturate(0.85)${blurred ? ' blur(14px)' : ''}` : undefined;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
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
