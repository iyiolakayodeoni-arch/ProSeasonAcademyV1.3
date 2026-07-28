import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { HomeIcon, JourneyIcon, FriendsIcon, GearIcon } from './Icons';
import { colors, monoFont } from '../theme';

export type MainTab = 'home' | 'journey' | 'community' | 'settings';

const TABS: { id: MainTab; label: string; Icon: typeof HomeIcon }[] = [
  { id: 'home', label: 'HOME', Icon: HomeIcon },
  { id: 'journey', label: 'JOURNEY', Icon: JourneyIcon },
  { id: 'community', label: 'COMMUNITY', Icon: FriendsIcon },
  { id: 'settings', label: 'SETTINGS', Icon: GearIcon },
];

export default function TabBar({ active, onChange }: { active: MainTab; onChange: (t: MainTab) => void }) {
  return (
    <View style={styles.bar}>
      {TABS.map(({ id, label, Icon }) => {
        const on = active === id;
        const color = on ? colors.primary : 'rgba(143,184,155,0.55)';
        return (
          <Pressable key={id} onPress={() => onChange(id)} style={styles.item} hitSlop={6}>
            <Icon size={19} color={color} />
            <Text style={[styles.label, { color }]}>{label}</Text>
            <View style={[styles.underline, on && styles.underlineOn]} />
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
    paddingBottom: 14,
  },
  item: { flex: 1, alignItems: 'center', gap: 3.5 },
  label: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '700', letterSpacing: 1.6 },
  underline: { width: 26, height: 2, borderRadius: 1, backgroundColor: 'transparent' },
  underlineOn: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});
