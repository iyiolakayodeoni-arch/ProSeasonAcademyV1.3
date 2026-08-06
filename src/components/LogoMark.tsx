import React from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

const LOGO = require('../../assets/logo-mirror-journal.png');

type Props = {
  size?: number;
  loopProps?: any;
  glowStyle?: any;
};

// ─────────────────────────────────────────────────────────────────────────
// THE MIRROR JOURNAL MARK — ProSeasonAcademy's concept in one icon.
//
// A footballer sits with pen and notebook, facing a glowing mirror that
// reflects the pitch and the ball. It captures the whole product idea:
// play the match, watch yourself honestly, write the truth down, then turn
// that reflection into disciplined progress.
//
// The API intentionally stays the same so every screen that already renders
// <LogoMark/> now receives the new football/mirror/journal identity.
// `loopProps` remains accepted for backwards compatibility with the old
// animated crest usage.
// ─────────────────────────────────────────────────────────────────────────

export default function LogoMark({ size = 132, glowStyle }: Props) {
  return (
    <Animated.View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.22 }, glowStyle]}>
      <Animated.Image
        source={LOGO}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#031f18',
  },
});
