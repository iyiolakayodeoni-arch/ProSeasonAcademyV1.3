import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
import { colors, monoFont } from '../theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

type Props = {
  onBack: () => void;
  /** fired once the player locks the coach — the choice is PERMANENT */
  onLocked: (coachId: string) => void;
};

// ─────────────────────────────────────────────────────────────
// ONE COACH. Chinedu Okafor is the academy's only coach — your
// permanent guide AND the benchmark you are climbing toward. He
// walks the whole road with you. This screen reveals him (as the
// foil Standard card) and locks him in — once, permanently.
// ─────────────────────────────────────────────────────────────
export default function CoachSelectScreen({ onBack, onLocked }: Props) {
  const coach = getCoach();
  const [confirming, setConfirming] = useState(false);
  const [locked, setLocked] = useState(false);
  const { loopProps, glowStyle } = useTrailLoop({ pathLength: 260, drawMs: 1800, eraseMs: 1800 });

  const lockIn = useCallback(() => {
    sfx('whistle');
    setConfirming(false);
    setLocked(true);
    // brief "PATH LOCKED" beat, then hand off to the app shell
    setTimeout(() => onLocked(coach.id), 1150);
  }, [onLocked, coach.id]);

  if (locked) return <LockedOverlay coach={coach} />;

  return (
    <View style={styles.flex}>
      <GridBackground />

      <View style={styles.crestWrap}>
        <LogoMark size={38} loopProps={loopProps} glowStyle={glowStyle} />
      </View>

      <ScrollViewSafe>
        <Pressable onPress={onBack} hitSlop={10} style={styles.chevBtn}>
          <Text style={styles.chev}>‹</Text>
        </Pressable>

        <Animated.Text entering={FadeIn.duration(320)} style={styles.eyebrow}>
          MEET YOUR COACH
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(80).duration(360)} style={styles.headline}>
          THE ONE WHO WALKS THE ROAD WITH YOU
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(160).duration(360)} style={styles.sub}>
          ONE COACH. PERMANENTLY. HE IS ALSO THE BENCHMARK — THE STANDARD YOU CHASE.
        </Animated.Text>

        {/* the foil card — the Standard revealed, who guides you */}
        <Animated.View entering={FadeInDown.delay(240).duration(480)} style={styles.cardHolder}>
          <RoleModelCard coach={coach} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(420).duration(400)}>
          <Text style={styles.name}>{coach.name}</Text>
          <Text style={styles.role}>{coach.title}</Text>
          <Text style={styles.meta}>{coach.metaLine}</Text>
          <Text style={styles.quote}>“{coach.oneLiner}”</Text>

          <View style={styles.benchmarkRow}>
            <Text style={styles.benchmarkTag}>THE BENCHMARK · WORLD #1 ARCHETYPE</Text>
            <Text style={styles.benchmarkBody}>
              COMPOSURE UNDER PRESSURE. CUT-AND-PRESS DEFENDING. A WINNING STREAK BUILT ON
              DISCIPLINE, NOT LUCK. CLEAN ATTACKING. RUTHLESS WHEN IT MATTERS. THAT IS THE
              STANDARD HE HOLDS YOU TO — AND WALKS YOU TOWARD.
            </Text>
          </View>
        </Animated.View>
      </ScrollViewSafe>

      {/* lock CTA */}
      <View style={styles.bar}>
        <LockButton label={`LOCK IN ${coach.name.split(' ')[0]} ›`} onPress={() => { sfx('tap'); setConfirming(true); }} />
      </View>
      <Text style={styles.micro}>NO SWITCHING ONCE YOU START — THIS IS THE VOICE IN YOUR CORNER ALL SEASON.</Text>

      <View style={styles.footerRow}>
        <Text style={styles.footer}>PROSEASONACADEMY</Text>
        <Text style={styles.footer}>VERSION {APP_VERSION}</Text>
      </View>

      {confirming && (
        <ConfirmSheet coach={coach} onCancel={() => setConfirming(false)} onLock={lockIn} />
      )}
    </View>
  );
}

// a thin ScrollView wrapper so the long content scrolls on small screens
function ScrollViewSafe({ children }: { children: React.ReactNode }) {
  return (
    <Animated.ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {children}
    </Animated.ScrollView>
  );
}

function LockButton({ label, onPress }: { label: string; onPress: () => void }) {
  const press = useSharedValue(0);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.04 }] }));
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

// ── PERMANENT lock-in confirmation ────────────────────────────
function ConfirmSheet({ coach, onCancel, onLock }: { coach: ReturnType<typeof getCoach>; onCancel: () => void; onLock: () => void }) {
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <Pressable style={styles.overlayBg} onPress={onCancel} />
      <Animated.View entering={FadeInUp.duration(280)} style={[styles.sheet, { borderColor: 'rgba(242,192,120,0.55)' }]}>
        <Text style={styles.lockKicker}>PATH LOCK — PERMANENT</Text>
        <Text style={styles.lockTitle}>LOCK IN {coach.name.split(' ')[0]}?</Text>
        <Text style={styles.lockBody}>
          Once your season starts there is{' '}
          <Text style={styles.lockBodyHot}>no switching coaches</Text> — no resets, no swaps. {coach.name.split(' ')[0]} is
          the voice in your corner for the whole journey, and the benchmark you are measured against. Make sure you are ready.
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

// ── locked beat ───────────────────────────────────────────────
function LockedOverlay({ coach }: { coach: ReturnType<typeof getCoach> }) {
  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.lockedFull}>
      <GridBackground />
      <Text style={styles.lockedKicker}>PATH LOCKED</Text>
      <Text style={styles.lockedName}>{coach.name}</Text>
      <Text style={styles.lockedSub}>YOUR SEASON STARTS NOW.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 46, paddingBottom: 10 },
  crestWrap: { alignItems: 'center', height: 42 },

  body: { flex: 1, minHeight: 0, marginTop: 4 },
  bodyContent: { paddingBottom: 10, alignItems: 'center' },

  chevBtn: { position: 'absolute', top: -2, left: 0, paddingRight: 8, zIndex: 5 },
  chev: { fontFamily: monoFont, fontSize: 18, color: 'rgba(143,184,155,0.65)', marginTop: -2 },

  eyebrow: {
    fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', letterSpacing: 3.2, color: colors.accent,
    textShadowColor: 'rgba(242,192,120,0.4)', textShadowRadius: 8,
  },
  headline: {
    marginTop: 10, fontSize: 17, fontWeight: '900', letterSpacing: 1.6, color: colors.fg, textAlign: 'center',
  },
  sub: {
    marginTop: 8, fontFamily: monoFont, fontSize: 7.4, lineHeight: 12, letterSpacing: 1.3,
    color: 'rgba(143,184,155,0.78)', textAlign: 'center', paddingHorizontal: 8,
  },

  cardHolder: { alignItems: 'center', justifyContent: 'center', marginTop: 18, paddingVertical: 8 },

  name: { marginTop: 16, fontSize: 20, fontWeight: '900', letterSpacing: 1.2, color: colors.fg, textAlign: 'center' },
  role: { marginTop: 5, fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', letterSpacing: 2, color: colors.accent, textAlign: 'center' },
  meta: { marginTop: 4, fontFamily: monoFont, fontSize: 6.8, letterSpacing: 1.4, color: 'rgba(143,184,155,0.7)', textAlign: 'center' },
  quote: {
    marginTop: 12, paddingHorizontal: 16, fontStyle: 'italic', fontSize: 11, lineHeight: 16,
    color: '#cdd9cf', textAlign: 'center',
  },

  benchmarkRow: {
    marginTop: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.4)', borderRadius: 12, backgroundColor: 'rgba(38,30,12,0.45)',
  },
  benchmarkTag: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.6, color: colors.accent },
  benchmarkBody: {
    marginTop: 7, fontFamily: monoFont, fontSize: 6.8, lineHeight: 11, letterSpacing: 1, color: 'rgba(238,242,236,0.82)',
  },

  bar: { marginTop: 8 },
  lockBtnWrap: { width: '100%' },
  lockBtn: {
    height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  lockBtnTxt: { fontFamily: monoFont, fontSize: 11, fontWeight: '900', letterSpacing: 2.4, color: '#05130a' },

  micro: {
    marginTop: 7, textAlign: 'center', fontFamily: monoFont, fontSize: 6.3, letterSpacing: 1.3,
    color: 'rgba(143,184,155,0.5)',
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 2 },
  footer: { fontFamily: monoFont, fontSize: 8, letterSpacing: 2.5, color: 'rgba(143,184,155,0.42)' },

  // overlays
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  overlayBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(4,8,5,0.78)' },
  sheet: {
    width: '88%', backgroundColor: colors.surface, borderWidth: 1, borderRadius: 18, padding: 18,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.18, shadowRadius: 24,
  },
  lockKicker: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '800', letterSpacing: 2.6, color: colors.accent },
  lockTitle: { marginTop: 8, fontSize: 18, fontWeight: '900', letterSpacing: 1.2, color: colors.fg },
  lockBody: { marginTop: 10, fontFamily: monoFont, fontSize: 9.5, lineHeight: 15, color: '#c4d4c8', letterSpacing: 0.3 },
  lockBodyHot: { color: colors.fg, fontWeight: '800' },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  ghostBtn: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  ghostBtnTxt: { fontFamily: monoFont, fontSize: 8.5, fontWeight: '700', letterSpacing: 1.6, color: colors.muted },
  hotBtn: {
    flex: 1.3, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
  },
  hotBtnTxt: { fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.4, color: '#0a0f0a' },

  lockedFull: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,11,7,0.97)', alignItems: 'center', justifyContent: 'center' },
  lockedKicker: { fontFamily: monoFont, fontSize: 9, fontWeight: '800', letterSpacing: 4, color: colors.accent },
  lockedName: { marginTop: 12, fontSize: 26, fontWeight: '900', letterSpacing: 2, color: colors.fg },
  lockedSub: { marginTop: 10, fontFamily: monoFont, fontSize: 8, letterSpacing: 2.4, color: colors.muted },
});
