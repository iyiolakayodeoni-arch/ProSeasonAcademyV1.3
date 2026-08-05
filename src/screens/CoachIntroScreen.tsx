import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import ArtBand from '../components/ArtBand';
import { Coach } from '../data/coaches';
import { BASELINE_SCRIPTS } from '../data/baselineScan';
import { ChevronRightIcon } from '../components/Icons';
import { sfx } from '../audio/sound';
import { colors, monoFont, displayFont, bodyFont, bodyFontItalic, bodyFontHeavy } from '../theme';

// the touchline — where every coach in this academy actually lives
const TOUCHLINE = require('../../assets/art/coach-touchline.jpg');

// ─────────────────────────────────────────────────────────────
// COACH INTRO — first screen after the path lock. He tells you
// who he is, in his own voice, through his fictional character.
// Then: "your story starts now" → the Baseline Scan gate.
// ─────────────────────────────────────────────────────────────

export default function CoachIntroScreen({ coach, onDone }: { coach: Coach; onDone: () => void }) {
  const script = useMemo(() => BASELINE_SCRIPTS[coach.id] ?? BASELINE_SCRIPTS.chinedu, [coach.id]);
  const first = coach.name.split(' ')[0].toUpperCase();
  const { width: winW } = useWindowDimensions();
  const bandW = Math.min(winW, 430);

  // each line of his speech lands with a soft pop, on its animation beat
  useEffect(() => {
    const timers = script.intro.map((_, i) =>
      setTimeout(() => sfx('pop'), 350 + i * 420),
    );
    return () => timers.forEach(clearTimeout);
  }, [script]);

  return (
    <View style={styles.root}>
      <GridBackground />

      {/* the touchline band — he speaks from where he stands, not from a crest */}
      <ArtBand source={TOUCHLINE} width={bandW} height={176} warmAt={{ x: bandW * 0.76, y: 40, r: bandW * 0.5 }}>
        <Text style={styles.eyebrow}>PATH LOCKED — YOUR COACH SPEAKS FIRST</Text>
      </ArtBand>

      <Animated.View entering={FadeIn.duration(350)} style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

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
  sheet: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  scroll: { paddingBottom: 40 },
  eyebrow: { color: 'rgba(238,242,236,0.9)', fontFamily: monoFont, fontSize: 9, letterSpacing: 2 },
  headRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  portrait: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  name: { color: colors.fg, fontFamily: displayFont, fontSize: 24, lineHeight: 25, letterSpacing: 0.6 },
  title: { fontFamily: bodyFontHeavy, fontSize: 11, letterSpacing: 1.4, marginTop: 4 },
  rating: { color: colors.muted, fontFamily: monoFont, fontSize: 9, letterSpacing: 1.4, marginTop: 4 },
  beat: { flexDirection: 'row', marginTop: 14, gap: 12 },
  quoteBar: { width: 3, borderRadius: 2, opacity: 0.7 },
  beatTxt: { flex: 1, color: '#dbe7dd', fontFamily: bodyFont, fontSize: 13.5, lineHeight: 21 },
  signoff: { color: colors.muted, fontFamily: bodyFontItalic, fontSize: 12.5, marginTop: 18, textAlign: 'right' },
  cta: {
    marginTop: 22,
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaTxt: { color: '#0a0f0a', fontFamily: bodyFontHeavy, fontSize: 13.5, letterSpacing: 0.8 },
});
