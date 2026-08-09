import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import LogoMark from '../components/LogoMark';
import RoleModelCard from '../components/RoleModelCard';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { getCoach } from '../data/coaches';
import { sfx } from '../audio/sound';
import { colors, monoFont, displayFont, bodyFont, bodyFontItalic, bodyFontBold, bodyFontHeavy } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

type Props = {
  onBack: () => void;
  onLocked: (coachId: string) => void;
};

export default function CoachSelectScreen({ onBack, onLocked }: Props) {
  const { isMultiColumn } = useResponsive();
  const coach = getCoach();
  const [confirming, setConfirming] = useState(false);
  const [locked, setLocked] = useState(false);
  const { loopProps, glowStyle } = useTrailLoop({ pathLength: 260, drawMs: 1800, eraseMs: 1800 });

  const lockIn = useCallback(() => {
    sfx('whistle');
    setConfirming(false);
    setLocked(true);
    setTimeout(() => onLocked(coach.id), 1150);
  }, [onLocked, coach.id]);

  if (locked) return <LockedOverlay coach={coach} />;

  return (
    <View style={styles.flex}>
      <GridBackground />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.chevBtn}>
          <Text style={styles.chev}>‹ BACK</Text>
        </Pressable>
        <View style={styles.crestWrap}>
          <LogoMark size={32} loopProps={loopProps} glowStyle={glowStyle} />
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <div className="psa-web-container" style={{ width: '100%' }}>
          <View style={[styles.mainLayout, isMultiColumn && styles.mainLayoutWide]}>
            {/* Left Column (Foil Holographic Coach Card) */}
            <View style={[styles.cardCol, isMultiColumn && styles.cardColWide]}>
              <Animated.View entering={FadeInDown.delay(120).duration(480)} style={styles.cardHolder}>
                <RoleModelCard coach={coach} />
              </Animated.View>
            </View>

            {/* Right Column (Coach Information & Lock Action) */}
            <View style={[styles.infoCol, isMultiColumn && styles.infoColWide]}>
              <Animated.Text entering={FadeIn.duration(320)} style={styles.eyebrow}>
                MEET YOUR PERMANENT COACH
              </Animated.Text>
              <Animated.Text entering={FadeIn.delay(80).duration(360)} style={styles.headline}>
                THE STANDARD YOU ARE CLIMBING TOWARD
              </Animated.Text>
              <Animated.Text entering={FadeIn.delay(140).duration(360)} style={styles.sub}>
                ONE COACH FOR YOUR ENTIRE 6 MONTHS. HE GUIDES YOUR RITUALS, REVIEWS YOUR RECEIPTS, AND HOLDS THE BENCHMARK.
              </Animated.Text>

              <Animated.View entering={FadeInUp.delay(220).duration(400)} style={styles.detailsBox}>
                <Text style={styles.name}>{coach.name}</Text>
                <Text style={styles.role}>{coach.title}</Text>
                <Text style={styles.meta}>{coach.metaLine}</Text>
                <Text style={styles.quote}>“{coach.oneLiner}”</Text>

                <View style={styles.benchmarkRow}>
                  <Text style={styles.benchmarkTag}>WHAT GOOD LOOKS LIKE</Text>
                  <Text style={styles.benchmarkBody}>
                    Calm when the game gets chaotic. Clean defending with zero panic clearances. Winning through habits and patience, not lucky bounces.
                  </Text>
                </View>

                <View style={styles.bar}>
                  <LockButton
                    label={`LOCK IN COACH ${coach.name.split(' ')[0].toUpperCase()} ›`}
                    onPress={() => {
                      sfx('tap');
                      setConfirming(true);
                    }}
                  />
                </View>
                <Text style={styles.micro}>
                  NO SWITCHING ONCE YOU START — THIS IS THE VOICE IN YOUR CORNER FOR YOUR ENTIRE SEASON.
                </Text>
              </Animated.View>
            </View>
          </View>
        </div>

        <View style={styles.footerRow}>
          <Text style={styles.footer}>PROSEASON ACADEMY</Text>
          <Text style={styles.footer}>VERSION {APP_VERSION}</Text>
        </View>
      </ScrollView>

      {confirming && (
        <ConfirmSheet coach={coach} onCancel={() => setConfirming(false)} onLock={lockIn} />
      )}
    </View>
  );
}

function LockButton({ label, onPress }: { label: string; onPress: () => void }) {
  const press = useSharedValue(0);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.03 }] }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (press.value = withTiming(1, { duration: 90 }))}
      onPressOut={() => (press.value = withSpring(0))}
      style={styles.lockBtnWrap}
    >
      <Animated.View style={[styles.lockBtn, s]}>
        <Text style={styles.lockBtnTxt}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function ConfirmSheet({
  coach,
  onCancel,
  onLock,
}: {
  coach: ReturnType<typeof getCoach>;
  onCancel: () => void;
  onLock: () => void;
}) {
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <Pressable style={styles.overlayBg} onPress={onCancel} />
      <Animated.View
        entering={FadeInUp.duration(280)}
        style={[styles.sheet, { borderColor: 'rgba(242,192,120,0.55)' }]}
      >
        <Text style={styles.lockKicker}>PATH LOCK — PERMANENT</Text>
        <Text style={styles.lockTitle}>LOCK IN COACH {coach.name.split(' ')[0].toUpperCase()}?</Text>
        <Text style={styles.lockBody}>
          Once your season starts there is{' '}
          <Text style={styles.lockBodyHot}>no switching coaches</Text> — no resets, no swaps. Coach{' '}
          {coach.name.split(' ')[0]} is the voice in your corner for the whole 6 months, and the
          benchmark you are measured against.
        </Text>
        <View style={styles.sheetBtns}>
          <Pressable onPress={onCancel} style={styles.ghostBtn}>
            <Text style={styles.ghostBtnTxt}>NOT YET</Text>
          </Pressable>
          <Pressable onPress={onLock} style={styles.hotBtn}>
            <Text style={styles.hotBtnTxt}>LOCK IT IN ›</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

function LockedOverlay({ coach }: { coach: ReturnType<typeof getCoach> }) {
  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.lockedFull}>
      <GridBackground />
      <Text style={styles.lockedKicker}>PATH LOCKED</Text>
      <Text style={styles.lockedName}>{coach.name}</Text>
      <Text style={styles.lockedSub}>YOUR SIX-MONTH SEASON STARTS NOW.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },

  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(57,255,106,0.15)',
  },
  chevBtn: { paddingVertical: 8 },
  chev: { fontFamily: monoFont, fontSize: 8.5, fontWeight: '800', letterSpacing: 1.5, color: colors.primary },
  crestWrap: { alignItems: 'center' },

  body: { flex: 1 },
  bodyContent: { paddingVertical: 24, paddingBottom: 40, alignItems: 'center' },

  mainLayout: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
  },
  mainLayoutWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
    paddingVertical: 20,
  },

  cardCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardColWide: {
    flex: 1,
  },

  infoCol: {
    width: '100%',
    maxWidth: 540,
  },
  infoColWide: {
    flex: 1.2,
  },

  cardHolder: { alignItems: 'center', justifyContent: 'center' },

  eyebrow: {
    fontFamily: bodyFontHeavy,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.accent,
  },
  headline: {
    marginTop: 8,
    fontFamily: displayFont,
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: 1,
    color: colors.fg,
    textTransform: 'uppercase',
  },
  sub: {
    marginTop: 8,
    fontFamily: bodyFont,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(143,184,155,0.9)',
  },

  detailsBox: {
    marginTop: 18,
    padding: 20,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 26, 19, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 106, 0.22)',
  },

  name: {
    fontFamily: displayFont,
    fontSize: 26,
    letterSpacing: 1.2,
    color: colors.fg,
    textTransform: 'uppercase',
  },
  role: {
    marginTop: 4,
    fontFamily: bodyFontHeavy,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.accent,
  },
  meta: {
    marginTop: 4,
    fontFamily: monoFont,
    fontSize: 9.5,
    letterSpacing: 1.4,
    color: 'rgba(143,184,155,0.7)',
  },
  quote: {
    marginTop: 12,
    fontFamily: bodyFontItalic,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#d6e4d8',
  },

  benchmarkRow: {
    marginTop: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.35)',
    borderRadius: 12,
    backgroundColor: 'rgba(38,30,12,0.45)',
  },
  benchmarkTag: { fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 1.6, color: colors.accent },
  benchmarkBody: {
    marginTop: 6,
    fontFamily: bodyFont,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(238,242,236,0.9)',
  },

  bar: { marginTop: 18 },
  lockBtnWrap: { width: '100%' },
  lockBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 6,
  },
  lockBtnTxt: { fontFamily: bodyFontHeavy, fontSize: 13.5, letterSpacing: 2, color: '#05130a' },

  micro: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: bodyFont,
    fontSize: 11,
    color: 'rgba(143,184,155,0.6)',
  },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 900,
    marginTop: 24,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(57,255,106,0.1)',
  },
  footer: { fontFamily: monoFont, fontSize: 8.5, letterSpacing: 2, color: 'rgba(143,184,155,0.45)' },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3,7,4,0.85)' },
  sheet: {
    width: '90%',
    maxWidth: 480,
    backgroundColor: '#0d160f',
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 28,
  },
  lockKicker: { fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 2.6, color: colors.accent },
  lockTitle: {
    marginTop: 8,
    fontFamily: displayFont,
    fontSize: 24,
    letterSpacing: 1.2,
    color: colors.fg,
  },
  lockBody: {
    marginTop: 10,
    fontFamily: bodyFont,
    fontSize: 13,
    lineHeight: 20,
    color: '#c4d4c8',
  },
  lockBodyHot: { color: colors.fg, fontFamily: bodyFontBold },
  sheetBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  ghostBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghostBtnTxt: { fontFamily: bodyFontBold, fontSize: 12, letterSpacing: 1.6, color: colors.muted },
  hotBtn: {
    flex: 1.4,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  hotBtnTxt: { fontFamily: bodyFontHeavy, fontSize: 12.5, letterSpacing: 1.6, color: '#0a0f0a' },

  lockedFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6,11,7,0.98)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedKicker: { fontFamily: bodyFontHeavy, fontSize: 12, letterSpacing: 4, color: colors.accent },
  lockedName: {
    marginTop: 14,
    fontFamily: displayFont,
    fontSize: 38,
    letterSpacing: 2,
    color: colors.fg,
  },
  lockedSub: { marginTop: 10, fontFamily: bodyFont, fontSize: 13, letterSpacing: 2, color: colors.muted },
});
