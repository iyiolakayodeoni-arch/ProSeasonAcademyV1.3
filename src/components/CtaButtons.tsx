import React from 'react';
import { Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, bodyFontBold, radii } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// THE HOUSE CTAs — the brand-green pill and its outlined sibling.
// Extracted from LandingScreen so the Hero (and any future section) reuses
// the exact same primitives instead of growing duplicate style variants.
// ─────────────────────────────────────────────────────────────────────────

export function CtaPrimary({ label, onPress }: { label: string; onPress: () => void }) {
  const phone = useWindowDimensions().width < 720;
  const hov = useSharedValue(0);
  const s = useAnimatedStyle(() => ({
    transform: [{ translateY: hov.value * -1.5 }],
    boxShadow: `0 0 ${14 + hov.value * 16}px rgba(57,255,106,${0.25 + hov.value * 0.3})`,
  }));
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => (hov.value = withTiming(1, { duration: 160 }))}
      onHoverOut={() => (hov.value = withTiming(0, { duration: 160 }))}
    >
      <Animated.View style={[styles.ctaPrimary, phone && styles.ctaPhone, s]}>
        <Text style={[styles.ctaPrimaryTxt, phone && styles.ctaTxtPhone]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function CtaSecondary({ label, onPress }: { label: string; onPress: () => void }) {
  const phone = useWindowDimensions().width < 720;
  const hov = useSharedValue(0);
  const s = useAnimatedStyle(() => ({
    borderColor: `rgba(57,255,106,${0.5 + hov.value * 0.4})`,
  }));
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => (hov.value = withTiming(1))}
      onHoverOut={() => (hov.value = withTiming(0))}
    >
      <Animated.View style={[styles.ctaSecondary, phone && styles.ctaPhone, s]}>
        <Text style={[styles.ctaSecondaryTxt, phone && styles.ctaTxtPhone]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ctaPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 26,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  ctaPrimaryTxt: {
    fontFamily: bodyFontBold,
    fontSize: 13.5,
    letterSpacing: 1.5,
    color: '#03140a',
    textTransform: 'uppercase',
  },
  ctaSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.5)',
    paddingVertical: 15,
    paddingHorizontal: 26,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  ctaSecondaryTxt: {
    fontFamily: bodyFontBold,
    fontSize: 13.5,
    letterSpacing: 1.5,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  ctaPhone: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  ctaTxtPhone: {
    fontSize: 11.5,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
