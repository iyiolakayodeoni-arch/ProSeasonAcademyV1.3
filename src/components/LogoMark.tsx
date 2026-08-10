import React from 'react';
import { View } from 'react-native';
import InfinityCrest from './InfinityCrest';

type Props = {
  size?: number;
  loopProps?: any;
  glowStyle?: any;
};

// ─────────────────────────────────────────────────────────────────────────
// THE INFINITY CREST — ProSeasonAcademy's signature mark.
//
// One lemniscate that keeps drawing itself in and out, forever: the season
// loops, the review never ends, growth compounds. This is the same mark the
// splash opens on, applied everywhere in the product.
//
// `LogoMark` is kept as a thin wrapper over `InfinityCrest` so every screen
// that already renders <LogoMark/> receives the infinity crest without
// changing its API. `loopProps` / `glowStyle` remain accepted for backward
// compatibility with the old animated usages.
// ─────────────────────────────────────────────────────────────────────────

export default function LogoMark({ size = 132, glowStyle }: Props) {
  return (
    <View style={glowStyle}>
      <InfinityCrest size={size} />
    </View>
  );
}
