import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors } from '../theme';

// ─────────────────────────────────────────────────────────────
// SCREEN FLASH — a one-beat neon-blue wipe on entering a full-screen
// surface, matching how current console FC 26 flashes its transition
// colour as you move between menus (docs/FC26_UI_RESEARCH.md §5).
// Pure cosmetic cue; it fades in and out immediately and never blocks.
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
