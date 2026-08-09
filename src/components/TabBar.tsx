import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
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

const INDICATOR_W = 30;

export default function TabBar({ active, onChange }: { active: MainNavTab; onChange: (tab: MainNavTab) => void }) {
  const { isWide } = useResponsive();
  const [barW, setBarW] = useState(0);
  const idx = Math.max(0, TABS.findIndex((tab) => tab.id === active));
  const x = useSharedValue(idx);
  useEffect(() => { x.value = withSpring(idx, { damping: 20, stiffness: 240, mass: 0.7 }); }, [idx, x]);
  if (isWide) return null;
  const indicatorStyle = useAnimatedStyle(() => {
    if (barW <= 0) return { opacity: 0 };
    const col = barW / TABS.length;
    return { opacity: 1, transform: [{ translateX: x.value * col + col / 2 - INDICATOR_W / 2 }] };
  });
  return (
    <View style={styles.wrap}>
      <View style={[styles.barGlass, Platform.OS === 'web' && (styles.blur as any)]} onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
        <LinearGradient colors={['rgba(57,255,106,0.35)', 'rgba(242,192,120,0.22)', 'rgba(57,255,106,0.12)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hairline} />
        <Animated.View pointerEvents="none" style={[styles.indicator, indicatorStyle]} />
        {TABS.map(({ id, label, Icon }) => {
          const activeTab = active === id;
          const color = activeTab ? colors.primary : 'rgba(143,184,155,0.62)';
          return (
            <Pressable key={id} onPress={() => onChange(id)} style={styles.item} hitSlop={8}>
              <View style={[styles.iconWrap, activeTab && styles.iconWrapActive]}>
                <Icon size={17} color={color} />
              </View>
              <Text style={[styles.label, { color }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(57,255,106,0.10)',
    backgroundColor: 'rgba(7, 12, 8, 0.96)',
  },
  barGlass: {
    flexDirection: 'row',
    backgroundColor: 'rgba(7, 12, 8, 0.88)',
    paddingTop: 7,
    paddingBottom: 10,
    paddingHorizontal: 4,
  },
  blur: { backdropFilter: 'blur(18px) saturate(1.2)' } as any,
  hairline: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, opacity: 0.9 },
  indicator: {
    position: 'absolute', bottom: 4, left: 0, width: INDICATOR_W, height: 2.5, borderRadius: 999,
    backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.9, shadowRadius: 8,
  },
  item: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  iconWrap: { width: 30, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: 'rgba(57,255,106,0.14)', borderWidth: 1, borderColor: 'rgba(57,255,106,0.22)' },
  label: { fontFamily: bodyFontBold, fontSize: 7.5, letterSpacing: 1.05 },
});
