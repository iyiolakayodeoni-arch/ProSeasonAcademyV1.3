import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { HomeIcon, JourneyIcon, ScanGlyphIcon, WavesGlyphIcon, GearIcon } from './Icons';
import { colors, bodyFontBold } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { MainNavTab } from './WebHeader';

const TABS: { id: MainNavTab; label: string; Icon: any }[] = [
  { id: 'today', label: 'TODAY', Icon: HomeIcon },
  { id: 'journey', label: 'PROGRESS', Icon: JourneyIcon },
  { id: 'tracker', label: 'EVIDENCE', Icon: ScanGlyphIcon },
  { id: 'community', label: 'CLUB', Icon: WavesGlyphIcon },
  { id: 'settings', label: 'ME', Icon: GearIcon },
];

const INDICATOR_W = 28;

export default function TabBar({
  active,
  onChange,
}: {
  active: MainNavTab;
  onChange: (tab: MainNavTab) => void;
}) {
  const { isWide } = useResponsive();
  const [barW, setBarW] = useState(0);
  const idx = Math.max(0, TABS.findIndex((tab) => tab.id === active));
  const x = useSharedValue(idx);

  useEffect(() => {
    x.value = withSpring(idx, { damping: 20, stiffness: 240, mass: 0.7 });
  }, [idx, x]);

  // On desktop / wide screens, the top WebHeader handles navigation.
  if (isWide) return null;

  const indicatorStyle = useAnimatedStyle(() => {
    if (barW <= 0) return { opacity: 0 };
    const col = barW / TABS.length;
    return {
      opacity: 1,
      transform: [{ translateX: x.value * col + col / 2 - INDICATOR_W / 2 }],
    };
  });

  return (
    <View style={styles.bar} onLayout={(event) => setBarW(event.nativeEvent.layout.width)}>
      <Animated.View pointerEvents="none" style={[styles.indicator, indicatorStyle]} />
      {TABS.map(({ id, label, Icon }) => {
        const activeTab = active === id;
        const color = activeTab ? colors.primary : 'rgba(143,184,155,0.55)';
        return (
          <Pressable key={id} onPress={() => onChange(id)} style={styles.item} hitSlop={6}>
            <Icon size={18} color={color} />
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
    backgroundColor: 'rgba(8,13,9,0.98)',
    paddingTop: 8,
    paddingBottom: 14,
  },
  indicator: {
    position: 'absolute',
    bottom: 6,
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
  item: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontFamily: bodyFontBold, fontSize: 8.5, letterSpacing: 1.1 },
});
