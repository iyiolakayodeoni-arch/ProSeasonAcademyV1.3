import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import LogoMark from '../components/LogoMark';
import { Coach } from '../data/coaches';
import { BASELINE_SCRIPTS } from '../data/baselineScan';
import { ChevronRightIcon } from '../components/Icons';
import { sfx } from '../audio/sound';
import { colors, monoFont } from '../theme';

// ─────────────────────────────────────────────────────────────
// COACH INTRO — the first screen after the front door. THE ONE
// COACH (Chinedu) introduces himself, the game, the Mirror Method
// and the academy's philosophy — in his own voice. There is no
// selection before this; he is the single voice by design.
// Then: "your story starts now" → the Baseline Scan gate.
// ─────────────────────────────────────────────────────────────

export default function CoachIntroScreen({ coach, onDone }: { coach: Coach; onDone: () => void }) {
  const script = useMemo(() => BASELINE_SCRIPTS[coach.id] ?? BASELINE_SCRIPTS.chinedu, [coach.id]);
  const first = coach.name.split(' ')[0].toUpperCase();
  const base = 350 + script.intro.length * 420; // the beat after his intro speech

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
      <View style={styles.crest}>
        <LogoMark size={30} />
      </View>

      <Animated.View entering={FadeIn.duration(350)} style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>ONE COACH · ONE VOICE — HE SPEAKS FIRST</Text>

          <Animated.View entering={FadeInUp.delay(150).duration(320)} style={styles.headRow}>
            <Image source={coach.portrait} style={styles.portrait} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.name}>{first} {coach.name.split(' ').slice(1).join(' ').toUpperCase()}</Text>
              <Text style={[styles.title, { color: coach.cardAccent }]}>{coach.title}</Text>
              <Text style={styles.rating}>{coach.rating} RATED · {coach.metaLine}</Text>
            </View>
          </Animated.View>

          {script.intro.map((beat, i) => (
            <Animated.View key={i} entering={FadeInUp.delay(350 + i * 420).duration(320)} style={styles.beat}>
              <View style={[styles.quoteBar, { backgroundColor: coach.cardAccent }]} />
              <Text style={styles.beatTxt}>{beat}</Text>
            </Animated.View>
          ))}

          <Animated.Text entering={FadeInUp.delay(base).duration(320)} style={styles.signoff}>
            — {script.introSignoff}
          </Animated.Text>

          {/* ── HIS STORY — where he came from, why he can be trusted ── */}
          <Animated.View entering={FadeInUp.delay(base + 260).duration(320)} style={styles.doctrine}>
            <Text style={[styles.doctrineTag, { color: coach.cardAccent }]}>HIS STORY — WHO I AM</Text>
            <Text style={styles.doctrineLine}>
              FROM CINDER ROW TO THE TOP — AND STILL COACHABLE
            </Text>
            <Text style={styles.doctrineBody}>
              I learned the ball on Cinder Row: night games on broken concrete, Mama Ukae watching
              from her shopfront step. She never blew a whistle — she just looked, and I could not
              hide a thing from her. That look is the whole academy. Every scan you sit through is
              that same shopfront look, shipped to your pocket. I stayed at the top for ten seasons
              because I never stopped answering for my own matches. Now you answer for yours.
            </Text>
          </Animated.View>

          {/* ── THE MIRROR METHOD — what this academy actually is ── */}
          <Animated.View entering={FadeInUp.delay(base + 480).duration(320)} style={styles.doctrine}>
            <Text style={[styles.doctrineTag, { color: coach.cardAccent }]}>THE MIRROR METHOD</Text>
            <Text style={styles.doctrineLine}>
              “THE MACHINE RECORDS THE EVIDENCE. YOU DO THE SEEING.”
            </Text>
            <Text style={styles.doctrineBody}>
              Before every match you set an intention. At half-time and full-time the session stops
              you and asks what is actually happening in your head. Then you divide the match into
              your own key moments and review them in your own words — before, half-time, full-time,
              after review, all sitting side by side — until you see the gaps yourself. I never write
              your thinking for you. That part is yours, and that is the whole point.
            </Text>
          </Animated.View>

          {/* ── THE PHILOSOPHY — one voice, one path ── */}
          <Animated.View entering={FadeInUp.delay(base + 700).duration(320)} style={styles.doctrine}>
            <Text style={[styles.doctrineTag, { color: coach.cardAccent }]}>OUR PHILOSOPHY — ONE VOICE, ONE PATH</Text>
            <Text style={styles.doctrineBody}>
              You will never be asked to choose a coach. Not here, not ever. I have been at the top
              of this game for a long time, and I learned one thing: the only decision you should be
              carrying is the one that moves you forward — your training, your thinking, the programme
              ahead of you. Not which voice you listen to. My road is the benchmark. Your journey is
              the evidence. We walk the same six chapters; you write your own receipts.
            </Text>
          </Animated.View>

          {/* ── THE PROGRAMME — what this academy actually is ── */}
          <Animated.View entering={FadeInUp.delay(base + 920).duration(320)} style={styles.doctrine}>
            <Text style={[styles.doctrineTag, { color: coach.cardAccent }]}>THE PROGRAMME — SIX CHAPTERS, ONE SEASON</Text>
            <Text style={styles.doctrineLine}>
              WHAT THIS ACADEMY ACTUALLY IS
            </Text>
            <Text style={styles.doctrineBody}>
              We are not a tips page. This is a private programme, and here is the whole of it: six
              chapters — See Yourself, Control Yourself, Read the Game, Build Discipline, Perform
              Under Pressure, Prove It. Each one is cleared by evidence, never by tapping. Every day
              the scouts hand me what is working in the game right now, and I teach it to you in the
              film room. Around it: the Mirror Session before every match, the Thread that carries
              your lesson forward, the clubhouse where your people are, and the Till that keeps the
              academy running. First stages are free; the pass opens the full road. A thousand seats,
              one coach, one programme — and one of those seats is yours.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(base + 1140).duration(320)}>
            <Pressable onPress={onDone} style={styles.cta}>
              <Text style={styles.ctaTxt}>CONTINUE TO THE BASELINE GATE</Text>
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
  doctrine: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.35)',
    backgroundColor: 'rgba(15,26,19,0.85)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 13,
  },
  doctrineTag: { fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  doctrineLine: {
    color: colors.fg,
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 7,
  },
  doctrineBody: {
    color: 'rgba(238,242,236,0.88)',
    fontFamily: monoFont,
    fontSize: 10.5,
    lineHeight: 17,
    letterSpacing: 0.3,
    marginTop: 7,
  },
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
