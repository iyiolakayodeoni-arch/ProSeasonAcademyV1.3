import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import LogoMark from '../components/LogoMark';
import { Coach } from '../data/coaches';
import { BASELINE_SCRIPTS } from '../data/baselineScan';
import { ChevronRightIcon } from '../components/Icons';
import { colors, monoFont } from '../theme';

// ─────────────────────────────────────────────────────────────
// COACH INTRO — first screen after the path lock. He tells you
// who he is, in his own voice, through his fictional character.
// Then: "your story starts now" → the Baseline Scan gate.
// ─────────────────────────────────────────────────────────────

export default function CoachIntroScreen({ coach, onDone }: { coach: Coach; onDone: () => void }) {
  const script = useMemo(() => BASELINE_SCRIPTS[coach.id] ?? BASELINE_SCRIPTS.obinna, [coach.id]);
  const first = coach.name.split(' ')[0].toUpperCase();

  return (
    <View style={styles.root}>
      <GridBackground />
      <View style={styles.crest}>
        <LogoMark size={30} />
      </View>

      <Animated.View entering={FadeIn.duration(350)} style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>PATH LOCKED — YOUR COACH SPEAKS FIRST</Text>

          <Animated.View entering={FadeInUp.delay(150).duration(320)} style={styles.headRow}>
            <Image source={coach.portrait} style={styles.portrait} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.name}>{first} {coach.name.split(' ').slice(1).join(' ').toUpperCase()}</Text>
              <Text style={[styles.title, { color: coach.cardAccent }]}>{coach.title}</Text>
              <Text style={styles.rating}>{coach.rating} RATED · {coach.journeyTag}</Text>
            </View>
          </Animated.View>

          {script.intro.map((beat, i) => (
            <Animated.View key={i} entering={FadeInUp.delay(350 + i * 420).duration(320)} style={styles.beat}>
              <View style={[styles.quoteBar, { backgroundColor: coach.cardAccent }]} />
              <Text style={styles.beatTxt}>{beat}</Text>
            </Animated.View>
          ))}

          <Animated.Text entering={FadeInUp.delay(350 + script.intro.length * 420).duration(320)} style={styles.signoff}>
            — {script.introSignoff}
          </Animated.Text>

          <Animated.View entering={FadeInUp.delay(500 + script.intro.length * 420).duration(320)}>
            <Pressable onPress={onDone} style={styles.cta}>
              <Text style={styles.ctaTxt}>HEAR ABOUT THE BASELINE SCAN</Text>
              <ChevronRightIcon size={14} color="#0a0f0a" />
            </Pressable>
          </Animated.View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  crest: { alignItems: 'center', paddingTop: 58 },
  sheet: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  scroll: { paddingBottom: 40 },
  eyebrow: { color: colors.muted, fontFamily: monoFont, fontSize: 9, letterSpacing: 2, textAlign: 'center' },
  headRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 8 },
  portrait: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  name: { color: colors.fg, fontFamily: monoFont, fontSize: 16, fontWeight: '700', letterSpacing: 1.2 },
  title: { fontFamily: monoFont, fontSize: 10, letterSpacing: 2, marginTop: 3 },
  rating: { color: colors.muted, fontFamily: monoFont, fontSize: 9, letterSpacing: 1.4, marginTop: 3 },
  beat: { flexDirection: 'row', marginTop: 14, gap: 12 },
  quoteBar: { width: 3, borderRadius: 2, opacity: 0.7 },
  beatTxt: { flex: 1, color: colors.fg, fontFamily: monoFont, fontSize: 12, lineHeight: 20, letterSpacing: 0.3 },
  signoff: { color: colors.muted, fontFamily: monoFont, fontSize: 11, letterSpacing: 0.6, marginTop: 18, textAlign: 'right', fontStyle: 'italic' },
  cta: {
    marginTop: 22,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaTxt: { color: '#0a0f0a', fontFamily: monoFont, fontSize: 12, letterSpacing: 1.6, fontWeight: '700' },
});
