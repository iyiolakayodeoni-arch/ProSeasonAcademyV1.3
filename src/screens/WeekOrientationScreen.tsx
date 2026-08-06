import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import ArtBand from '../components/ArtBand';
import { Coach } from '../data/coaches';
import { sfx } from '../audio/sound';
import { colors, monoFont, displayFont, bodyFont, bodyFontHeavy } from '../theme';

const TUNNEL = require('../../assets/art/journey-tunnel.jpg');

type Card = { eyebrow: string; title: string; body: string; tone?: 'green' | 'gold'; steps?: string[] };

const CARDS: Card[] = [
  {
    eyebrow: 'YOUR STARTING POINT',
    title: 'THIS IS NOT A TEST.',
    body: 'Baseline Week is a five-match assessment across seven days. You cannot fail it. We use it to understand the player you are today — your habits, decisions and head under pressure.',
    tone: 'green',
  },
  {
    eyebrow: 'HOW THE WEEK WORKS',
    title: 'PLAY → REFLECT → LEARN',
    body: 'Play your normal match. Come back while it is fresh. Scan the moments that changed it, then answer honestly. Repeat for five matches and your starting profile takes shape.',
    steps: ['01  PLAY A NORMAL MATCH', '02  RETURN & SCAN IT', '03  NAME THE KEY MOMENTS', '04  REPEAT ×5', '05  RECEIVE YOUR BASELINE'],
  },
  {
    eyebrow: 'WHAT WE NEED FROM YOU',
    title: 'TRUTH OVER IMPRESSION.',
    body: 'Losses, rushed passes, frustration and poor decisions belong here too. There is no perfect answer and nobody is grading you. Honest evidence gives your coach something real to work with.',
    tone: 'gold',
  },
  {
    eyebrow: 'AFTER MATCH FIVE',
    title: 'YOUR ROAD OPENS.',
    body: 'Your answers become your starting profile for coaching and tracking. We find patterns before we prescribe improvement — so the next work is built around your actual game.',
    tone: 'green',
  },
];

export default function WeekOrientationScreen({ coach, onDone }: { coach: Coach; onDone: () => void }) {
  const [i, setI] = useState(0);
  const card = CARDS[i];
  const last = i >= CARDS.length - 1;
  const first = coach.name.split(' ')[0].toUpperCase();
  const { width: winW } = useWindowDimensions();
  const bandW = Math.min(winW, 430);

  return <View style={styles.root}>
    <GridBackground />
    <ArtBand source={TUNNEL} width={bandW} height={132} warmAt={{ x: bandW * 0.5, y: 40, r: bandW * 0.6 }}>
      <Text style={styles.eyebrow}>BEFORE THE WEEK · {first} IS YOUR GUIDE</Text>
      <Text style={styles.kicker}>ORIENTATION · {i + 1} / {CARDS.length}</Text>
    </ArtBand>
    <View style={styles.inner}>
      <Animated.View key={card.eyebrow} entering={FadeInRight.duration(280)} style={[styles.card, card.tone === 'gold' && styles.cardGold]}>
        <Text style={[styles.cardEyebrow, card.tone === 'gold' && { color: colors.warm }]}>{card.eyebrow}</Text>
        <Text style={styles.cardTitle}>{card.title}</Text>
        <Text style={styles.cardBody}>{card.body}</Text>
        {card.steps && <View style={styles.timeline}>
          {card.steps.map((step, index) => <View key={step} style={styles.timelineRow}>
            <View style={[styles.timelineDot, index === 0 && styles.timelineDotOn]}><Text style={styles.timelineNo}>{index + 1}</Text></View>
            <Text style={styles.timelineTxt}>{step}</Text>
          </View>)}
        </View>}
      </Animated.View>
      <View style={styles.dots}>{CARDS.map((c, idx) => <View key={c.eyebrow} style={[styles.dot, idx === i && styles.dotOn]} />)}</View>
      <Pressable onPress={() => { sfx('tap'); if (last) onDone(); else setI(n => n + 1); }} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
        <Text style={styles.ctaTxt}>{last ? 'I UNDERSTAND — START DAY 1 ›' : 'NEXT ›'}</Text>
      </Pressable>
      <Pressable onPress={onDone} hitSlop={10}><Text style={styles.skip}>SKIP ORIENTATION</Text></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg }, inner: { flex: 1, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 36, justifyContent: 'center' },
  eyebrow: { fontFamily: monoFont, fontSize: 8, fontWeight: '800', letterSpacing: 2.4, color: 'rgba(238,242,236,0.9)' },
  kicker: { marginTop: 6, fontFamily: monoFont, fontSize: 7, fontWeight: '800', letterSpacing: 2.2, color: colors.primary },
  card: { marginTop: 22, borderWidth: 1.2, borderColor: 'rgba(57,255,106,0.4)', borderRadius: 18, backgroundColor: 'rgba(15,26,19,0.9)', padding: 22, minHeight: 218 },
  cardGold: { borderColor: 'rgba(242,192,120,0.5)', backgroundColor: 'rgba(20,16,8,0.92)' },
  cardEyebrow: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 2.6, color: colors.accent },
  cardTitle: { marginTop: 12, fontFamily: displayFont, fontSize: 27, lineHeight: 28, letterSpacing: 0.6, color: colors.fg },
  cardBody: { marginTop: 14, fontFamily: bodyFont, fontSize: 13, lineHeight: 20, color: '#b9cabe' },
  timeline: { marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(143,184,155,0.18)', paddingTop: 10 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 }, timelineDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(143,184,155,0.4)', alignItems: 'center', justifyContent: 'center', marginRight: 9 }, timelineDotOn: { backgroundColor: colors.primary, borderColor: colors.primary }, timelineNo: { color: colors.fg, fontFamily: monoFont, fontSize: 7, fontWeight: '800' }, timelineTxt: { color: '#dbe7dd', fontFamily: monoFont, fontSize: 8.5, letterSpacing: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 18 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(143,184,155,0.3)' }, dotOn: { backgroundColor: colors.primary, width: 16 },
  cta: { marginTop: 22, height: 52, borderRadius: 26, borderWidth: 1.3, borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.08)', alignItems: 'center', justifyContent: 'center' }, ctaTxt: { fontFamily: bodyFontHeavy, fontSize: 13.5, letterSpacing: 1.2, color: colors.primary }, skip: { marginTop: 16, textAlign: 'center', fontFamily: bodyFont, fontSize: 11.5, color: colors.muted },
});
