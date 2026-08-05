import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors } from '../theme';

// ─────────────────────────────────────────────────────────────
// SCREEN FLASH — a one-beat live wipe on entering a full-screen surface.
// A nod to how current console menus flash a transition colour when you
// move between screens (docs/FC26_UI_RESEARCH.md §5) — but it is a brief,
// cosmetic moment in the app's own neon language, never a resting wash.
// Fades in and out immediately and never blocks.
// ─────────────────────────────────────────────────────────────
export default function ScreenFlash() {
  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeIn.duration(90)}
      exiting={FadeOut.duration(380)}
      style={styles.flash}
    />
  );
}

const styles = StyleSheet.create({
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.flash,
    opacity: 0.1,
  },
});
