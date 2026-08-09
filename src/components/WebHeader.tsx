import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LogoMark from './LogoMark';
import { HomeIcon, JourneyIcon, ScanGlyphIcon, WavesGlyphIcon, GearIcon, BellIcon, HelpIcon } from './Icons';
import { colors, monoFont, displayFont, bodyFontBold, bodyFontHeavy } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useSettings, setToggle } from '../data/settings';
import { syncMusicToSettings, sfx } from '../audio/sound';
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

const NAV_ITEMS: { id: MainNavTab; label: string; icon: any }[] = [
  { id: 'today', label: 'TODAY', icon: HomeIcon },
  { id: 'journey', label: '6-MONTH PROGRESS', icon: JourneyIcon },
  { id: 'tracker', label: 'EVIDENCE & CHECKPOINTS', icon: ScanGlyphIcon },
  { id: 'community', label: 'CLUBHOUSE', icon: WavesGlyphIcon },
  { id: 'settings', label: 'SETTINGS', icon: GearIcon },
];

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
  const { isWide, isLaptopUp } = useResponsive();
  const settings = useSettings();
  const musicOn = settings.toggles.music;

  const toggleSound = () => {
    sfx('toggle');
    const next = !musicOn;
    setToggle('music', next);
    syncMusicToSettings();
  };

  const initials = (settings.displayName || 'PLAYER')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="psa-web-header-root" style={{ width: '100%', zIndex: 50 }}>
      <View style={styles.header}>
        {/* Left: Brand mark & title */}
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
              <Text style={styles.brandTitle}>PROSEASON ACADEMY</Text>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveTxt}>S1 · LIVE</Text>
              </View>
            </View>
            {isWide && (
              <Text style={styles.brandSub}>
                COACH {coach?.name.toUpperCase() || 'CHINEDU OKAFOR'} · FC 26 REVIEW PRACTICE
              </Text>
            )}
          </View>
        </Pressable>

        {/* Center: Desktop Navigation Bar (visible on tablet / laptop / desktop) */}
        {isWide && (
          <View style={styles.navBar}>
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    sfx('tab');
                    onSelectTab(id);
                  }}
                  style={({ pressed }) => [
                    styles.navItem,
                    active && styles.navItemActive,
                    pressed && styles.navItemPressed,
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Icon size={15} color={active ? colors.primary : 'rgba(143,184,155,0.7)'} />
                  <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
                  {active && <View style={styles.activeIndicator} />}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Right: Controls & User Profile */}
        <View style={styles.rightGroup}>
          {/* Sound / Ambient Bed Controller */}
          <Pressable
            onPress={toggleSound}
            style={({ pressed }) => [
              styles.soundBtn,
              musicOn && styles.soundBtnOn,
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={musicOn ? 'Mute ambient sound' : 'Unmute ambient sound'}
          >
            <View style={styles.soundWave}>
              <View style={[styles.soundBar, styles.soundBar1, musicOn && styles.soundBarAnim]} />
              <View style={[styles.soundBar, styles.soundBar2, musicOn && styles.soundBarAnim]} />
              <View style={[styles.soundBar, styles.soundBar3, musicOn && styles.soundBarAnim]} />
            </View>
            {isLaptopUp && (
              <Text style={[styles.soundTxt, musicOn && styles.soundTxtOn]}>
                {musicOn ? 'AUDIO ON' : 'MUTED'}
              </Text>
            )}
          </Pressable>

          {/* Quick Guide */}
          {isLaptopUp && onOpenGuide && (
            <Pressable
              onPress={() => {
                sfx('tap');
                onOpenGuide();
              }}
              style={({ pressed }) => [styles.iconActionBtn, pressed && { opacity: 0.75 }]}
              accessibilityRole="button"
              accessibilityLabel="Open Guide"
            >
              <HelpIcon size={14} color={colors.muted} />
            </Pressable>
          )}

          {/* FC Updates shortcut */}
          {isLaptopUp && onOpenUpdates && (
            <Pressable
              onPress={() => {
                sfx('tap');
                onOpenUpdates();
              }}
              style={({ pressed }) => [styles.iconActionBtn, pressed && { opacity: 0.75 }]}
              accessibilityRole="button"
              accessibilityLabel="Open FC Updates"
            >
              <BellIcon size={14} color={colors.accent} />
            </Pressable>
          )}

          {/* Founder Desk Pill (if founder) */}
          {isFounder && onOpenFounderDesk && (
            <Pressable
              onPress={() => {
                sfx('tap');
                onOpenFounderDesk();
              }}
              style={styles.founderPill}
            >
              <Text style={styles.founderPillTxt}>★ FOUNDER</Text>
            </Pressable>
          )}

          {/* User Profile Pill */}
          <Pressable
            onPress={() => {
              sfx('tab');
              onSelectTab('settings');
            }}
            style={({ pressed }) => [
              styles.profilePill,
              activeTab === 'settings' && styles.profilePillActive,
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="My Profile and Settings"
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
    backgroundColor: 'rgba(7, 12, 8, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(57, 255, 106, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  crestGlow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  crestRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    padding: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestInner: {
    flex: 1,
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#031a14',
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextCol: {
    gap: 2,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontFamily: displayFont,
    fontSize: 18,
    letterSpacing: 1.2,
    color: colors.fg,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(57,255,106,0.1)',
    borderColor: 'rgba(57,255,106,0.3)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  liveTxt: {
    fontFamily: monoFont,
    fontSize: 6.5,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: colors.primary,
  },
  brandSub: {
    fontFamily: monoFont,
    fontSize: 6.2,
    letterSpacing: 1.2,
    color: 'rgba(143,184,155,0.7)',
  },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 26, 19, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 106, 0.14)',
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
    backgroundColor: 'rgba(57, 255, 106, 0.12)',
    borderColor: 'rgba(57, 255, 106, 0.28)',
    borderWidth: 1,
  },
  navItemPressed: {
    opacity: 0.8,
  },
  navLabel: {
    fontFamily: bodyFontHeavy,
    fontSize: 10.5,
    letterSpacing: 1.1,
    color: 'rgba(143,184,155,0.8)',
  },
  navLabelActive: {
    color: colors.primary,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -5,
    left: '25%',
    right: '25%',
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  soundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.22)',
    backgroundColor: 'rgba(12,20,14,0.6)',
  },
  soundBtnOn: {
    borderColor: 'rgba(57,255,106,0.35)',
    backgroundColor: 'rgba(57,255,106,0.08)',
  },
  soundWave: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 12,
  },
  soundBar: {
    width: 2.5,
    borderRadius: 1.5,
    backgroundColor: colors.muted,
  },
  soundBar1: { height: 6 },
  soundBar2: { height: 12 },
  soundBar3: { height: 8 },
  soundBarAnim: {
    backgroundColor: colors.primary,
  },
  soundTxt: {
    fontFamily: monoFont,
    fontSize: 6.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.muted,
  },
  soundTxtOn: {
    color: colors.primary,
  },

  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.22)',
    backgroundColor: 'rgba(12,20,14,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  founderPill: {
    backgroundColor: 'rgba(242,192,120,0.12)',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  founderPillTxt: {
    fontFamily: monoFont,
    fontSize: 6.8,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: colors.accent,
  },

  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.22)',
    backgroundColor: 'rgba(15,26,19,0.85)',
  },
  profilePillActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(57,255,106,0.12)',
  },
  profileAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarTxt: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
    color: '#040805',
  },
  profileMetaCol: {
    gap: 1,
    maxWidth: 90,
  },
  profileName: {
    fontFamily: bodyFontBold,
    fontSize: 11,
    color: colors.fg,
  },
  profileId: {
    fontFamily: monoFont,
    fontSize: 6.2,
    color: colors.muted,
  },
});
