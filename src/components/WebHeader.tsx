import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import LogoMark from './LogoMark';
import { HomeIcon, JourneyIcon, ScanGlyphIcon, WavesGlyphIcon, GearIcon, BellIcon, HelpIcon } from './Icons';
import { colors, monoFont, displayFont, bodyFontBold, bodyFontHeavy, radii } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useHover } from '../hooks/useHover';
import { useSettings } from '../data/settings';
import { sfx } from '../audio/sound';
import { Coach } from '../data/coaches';

export type MainNavTab = 'today' | 'journey' | 'tracker' | 'community' | 'settings';

interface Props {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  coach?: Coach;
  loopProps?: any;
  glowStyle?: any;
  onOpenUpdates?: () => void;
  onOpenGuide?: () => void;
  onOpenFounderDesk?: () => void;
  isFounder?: boolean;
}

const NAV_ITEMS: { id: MainNavTab; label: string; short: string; icon: any }[] = [
  { id: 'today', label: 'TODAY', short: 'TODAY', icon: HomeIcon },
  { id: 'journey', label: '6-MONTH PROGRESS', short: 'PROGRESS', icon: JourneyIcon },
  { id: 'tracker', label: 'EVIDENCE & CHECKPOINTS', short: 'EVIDENCE', icon: ScanGlyphIcon },
  { id: 'community', label: 'CLUBHOUSE', short: 'CLUB', icon: WavesGlyphIcon },
  { id: 'settings', label: 'SETTINGS', short: 'ME', icon: GearIcon },
];

// One nav item — the hover veil eases in/out on fine pointers so desktop
// users feel the surface respond; the active item carries its own fill.
function NavItem({
  id,
  label,
  Icon,
  active,
  onSelect,
}: {
  id: MainNavTab;
  label: string;
  Icon: any;
  active: boolean;
  onSelect: (tab: MainNavTab) => void;
}) {
  const { hovered, bind } = useHover();
  const { isTV } = useResponsive();
  const hov = useSharedValue(0);

  useEffect(() => {
    hov.value = withTiming(hovered && !active ? 1 : 0, { duration: 150 });
  }, [hovered, active, hov]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: hov.value }));

  return (
    <Pressable
      onPress={() => {
        sfx('tab');
        onSelect(id);
      }}
      style={({ pressed }) => [
        styles.navItem,
        isTV && styles.navItemTV,
        active && styles.navItemActive,
        pressed && styles.navItemPressed,
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      {...bind}
    >
      <Animated.View pointerEvents="none" style={[styles.navHoverVeil, veilStyle]} />
      <Icon size={isTV ? 18 : 14} color={active ? colors.primary : 'rgba(143,184,155,0.65)'} />
      <Text style={[styles.navLabel, isTV && styles.navLabelTV, active && styles.navLabelActive]}>{label}</Text>
      {active && <View style={styles.activeIndicator} />}
    </Pressable>
  );
}

export default function WebHeader({
  activeTab,
  onSelectTab,
  coach,
  loopProps,
  glowStyle,
  onOpenUpdates,
  onOpenGuide,
  onOpenFounderDesk,
  isFounder = false,
}: Props) {
  const { isWide, isLaptopUp, isTV, w } = useResponsive();
  const settings = useSettings();
  const initials = (settings.displayName || 'PLAYER').slice(0, 2).toUpperCase();

  return (
    <header className="psa-web-header-root" style={{ width: '100%', zIndex: 50 }}>
      <View style={[styles.header, isTV && styles.headerTV, Platform.OS === 'web' && (styles.headerWeb as any)]}>
        {/* Left: Brand */}
        <Pressable
          onPress={() => onSelectTab('today')}
          style={({ pressed }) => [styles.brandGroup, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="ProSeason Academy Home"
        >
          <View style={styles.crestGlow}>
            <LinearGradient
              colors={['#39ff6a', '#f2c078', '#39ff6a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.crestRing}
            >
              <View style={styles.crestInner}>
                <LogoMark size={24} loopProps={loopProps} glowStyle={glowStyle} />
              </View>
            </LinearGradient>
          </View>
          <View style={styles.brandTextCol}>
            <View style={styles.brandTitleRow}>
              {/* fit a 320px handset without ellipsising the wordmark */}
              <Text style={[styles.brandTitle, w < 400 && { fontSize: 13, letterSpacing: 0.6 }]}>
                PROSEASON ACADEMY
              </Text>
              {w >= 360 && (
                <View style={styles.livePill}>
                  <View style={[styles.liveDot, styles.liveDotPulse]} />
                  <Text style={styles.liveTxt}>S1 · LIVE</Text>
                </View>
              )}
            </View>
            {isLaptopUp && (
              <Text style={styles.brandSub}>
                FC 26 REVIEW PRACTICE · THE LOOP
              </Text>
            )}
          </View>
        </Pressable>

        {/* Center: Desktop Nav — tablets get the short labels so five
            destinations + brand + profile never collide at 768–1023px. */}
        {isWide && (
          <View style={styles.navBar}>
            {NAV_ITEMS.map(({ id, label, short, icon: Icon }) => (
              <NavItem
                key={id}
                id={id}
                label={isLaptopUp ? label : short}
                Icon={Icon}
                active={activeTab === id}
                onSelect={onSelectTab}
              />
            ))}
          </View>
        )}

        {/* Right: Controls */}
        <View style={styles.rightGroup}>

          {isLaptopUp && onOpenGuide && (
            <Pressable
              onPress={() => { sfx('tap'); onOpenGuide(); }}
              style={({ pressed }) => [styles.iconActionBtn, pressed && { opacity: 0.75 }]}
            >
              <HelpIcon size={14} color={colors.muted} />
            </Pressable>
          )}

          {isLaptopUp && onOpenUpdates && (
            <Pressable
              onPress={() => { sfx('tap'); onOpenUpdates(); }}
              style={({ pressed }) => [styles.iconActionBtn, pressed && { opacity: 0.75 }]}
            >
              <View>
                <BellIcon size={14} color={colors.accent} />
                <View style={styles.bellDot} />
              </View>
            </Pressable>
          )}

          {isFounder && onOpenFounderDesk && (
            <Pressable onPress={() => { sfx('tap'); onOpenFounderDesk(); }} style={styles.founderPill}>
              <Text style={styles.founderPillTxt}>★ FOUNDER</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => { sfx('tab'); onSelectTab('settings'); }}
            style={({ pressed }) => [
              styles.profilePill,
              activeTab === 'settings' && styles.profilePillActive,
              pressed && { opacity: 0.82, transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarTxt}>{initials}</Text>
            </View>
            {isLaptopUp && (
              <View style={styles.profileMetaCol}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {settings.displayName || 'PLAYER'}
                </Text>
                <Text style={styles.profileId} numberOfLines={1}>
                  {settings.academyId ? `ID: ${settings.academyId.slice(0, 10)}` : 'PRO MEMBER'}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </header>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    backgroundColor: 'rgba(7, 12, 8, 0.72)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(57, 255, 106, 0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    // subtle premium shadow
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  headerWeb: {
    backdropFilter: 'blur(16px) saturate(1.2)',
  } as any,
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  crestGlow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  crestRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    padding: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestInner: {
    flex: 1,
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#071a12',
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextCol: { gap: 2 },
  brandTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandTitle: { fontFamily: displayFont, fontSize: 17, letterSpacing: 1, color: colors.fg },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(57,255,106,0.10)',
    borderColor: 'rgba(57,255,106,0.22)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  liveDotPulse: {
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  liveTxt: { fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', letterSpacing: 1.2, color: colors.primary },
  brandSub: { fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.2, color: 'rgba(143,184,155,0.65)' },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 26, 19, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 106, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: 'rgba(57, 255, 106, 0.11)',
    borderColor: 'rgba(57, 255, 106, 0.22)',
    borderWidth: 1,
  },
  navItemPressed: { opacity: 0.82 },
  // 10-foot mode: bigger pads and labels so nav reads from the sofa
  headerTV: { height: 76, paddingHorizontal: 28 },
  navItemTV: { paddingHorizontal: 18, paddingVertical: 12, gap: 8 },
  navLabelTV: { fontSize: 13.5, letterSpacing: 1.4 },
  navHoverVeil: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 10,
    backgroundColor: 'rgba(57,255,106,0.09)',
    opacity: 0,
  },
  navLabel: { fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 1.1, color: 'rgba(143,184,155,0.75)' },
  navLabelActive: { color: colors.primary },
  activeIndicator: {
    position: 'absolute',
    bottom: -5,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },

  rightGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.18)',
    backgroundColor: 'rgba(12,20,14,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: '#070c08',
  },
  founderPill: {
    backgroundColor: 'rgba(242,192,120,0.12)',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  founderPillTxt: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '900', letterSpacing: 1.2, color: colors.accent },

  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.18)',
    backgroundColor: 'rgba(15,26,19,0.85)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  profilePillActive: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.10)' },
  profileAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  profileAvatarTxt: { fontFamily: monoFont, fontSize: 10, fontWeight: '900', color: '#040805' },
  profileMetaCol: { gap: 1, maxWidth: 96 },
  profileName: { fontFamily: bodyFontBold, fontSize: 11, color: colors.fg },
  profileId: { fontFamily: monoFont, fontSize: 6.2, color: colors.muted },
});
