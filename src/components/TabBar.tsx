import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { HomeIcon, JourneyIcon, FriendsIcon, GearIcon } from './Icons';
import { colors, bodyFontBold } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// TAB BAR — four rooms, one live hairline. The indicator is a single
// traveling light that slides to wherever you are (console shell grammar:
// you never press a button, you glide between rooms). Icons + labels dim
// when their room isn't the one you're in.
// ─────────────────────────────────────────────────────────────────────────

export type MainTab = 'home' | 'journey' | 'community' | 'settings';

const TABS: { id: MainTab; label: string; Icon: typeof HomeIcon }[] = [
  { id: 'home', label: 'HOME', Icon: HomeIcon },
  { id: 'journey', label: 'TRACKING', Icon: JourneyIcon },
  { id: 'community', label: 'COMMUNITY', Icon: FriendsIcon },
  { id: 'settings', label: 'SETTINGS', Icon: GearIcon },
];

const INDICATOR_W = 30;

export default function TabBar({ active, onChange }: { active: MainTab; onChange: (t: MainTab) => void }) {
  const [barW, setBarW] = useState(0);
  const idx = Math.max(0, TABS.findIndex((t) => t.id === active));
  const x = useSharedValue(idx);

  useEffect(() => {
    x.value = withSpring(idx, { damping: 20, stiffness: 240, mass: 0.7 });
  }, [idx, x]);

  const indicatorStyle = useAnimatedStyle(() => {
    if (barW <= 0) return { opacity: 0 };
    const col = barW / TABS.length;
    return {
      opacity: 1,
      transform: [{ translateX: x.value * col + col / 2 - INDICATOR_W / 2 }],
    };
  });

  return (
    <View style={styles.bar} onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
      {/* the traveling light — one light, wherever the player is */}
      <Animated.View pointerEvents="none" style={[styles.indicator, indicatorStyle]} />
      {TABS.map(({ id, label, Icon }) => {
        const on = active === id;
        const color = on ? colors.primary : 'rgba(143,184,155,0.55)';
        return (
          <Pressable key={id} onPress={() => onChange(id)} style={styles.item} hitSlop={6}>
            <Icon size={19} color={color} />
            <Text style={[styles.label, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(31,56,38,0.9)',
    backgroundColor: 'rgba(8,13,9,0.96)',
    paddingTop: 9,
    paddingBottom: 16,
  },
  indicator: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    width: INDICATOR_W,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.95,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontFamily: bodyFontBold, fontSize: 9.5, letterSpacing: 1.2 },
});
