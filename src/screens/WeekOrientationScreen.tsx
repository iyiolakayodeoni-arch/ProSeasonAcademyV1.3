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
    eyebrow: 'WEEK ONE',
    title: '5 GAMES. YOUR PACE.',
    body: 'This is your starting point. You can’t fail it. We just watch how you play — your habits and decisions when it gets tough. There is no schedule: play and review whenever you actually play.',
    tone: 'green',
  },
  {
    eyebrow: 'HOW IT WORKS',
    title: 'PLAY, TYPE, REPEAT',
    body: 'Play your normal game. After, type in your stats and talk about the moments that changed it. Do that 5 times and we make your starting card.',
    steps: ['01  PLAY YOUR GAME', '02  TYPE YOUR STATS', '03  TALK ABOUT KEY MOMENTS', '04  DO IT 5 TIMES', '05  GET YOUR CARD'],
  },
  {
    eyebrow: 'BE HONEST',
    title: 'BAD GAMES COUNT TOO.',
    body: 'Losses and mistakes are useful. There are no perfect answers here. Just tell the truth — that’s what we can actually work with.',
    tone: 'gold',
  },
  {
    eyebrow: 'AFTER 5 GAMES',
    title: 'THEN WE START.',
    body: 'Your 5 games become your starting card. We look for patterns first, then we start fixing them together.',
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
    <ArtBand source={[TUNNEL, require('../../assets/art/home-pitch.png'), require('../../assets/art/coach-touchline.jpg')]} width={bandW} height={132} warmAt={{ x: bandW * 0.5, y: 40, r: bandW * 0.6 }}>
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
        <Text style={styles.ctaTxt}>{last ? 'I UNDERSTAND — START MATCH 1 ›' : 'NEXT ›'}</Text>
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
