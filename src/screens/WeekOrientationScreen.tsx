import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import ArtBand from '../components/ArtBand';
import { Coach } from '../data/coaches';
import { sfx } from '../audio/sound';
import { colors, monoFont, displayFont, bodyFont, bodyFontHeavy } from '../theme';

// the tunnel — orientation looks down the road the week opens onto
const TUNNEL = require('../../assets/art/journey-tunnel.jpg');

// ─────────────────────────────────────────────────────────────
// WEEK ORIENTATION — the 30-second handshake between the coach's
// story and the Baseline Week. Three short cards: what the next
// seven days look like, how the mirror works, and what follows.
// Shown exactly once (session.orientationDone), skip anytime.
// ─────────────────────────────────────────────────────────────

const CARDS: { eyebrow: string; title: string; body: string; tone?: 'green' | 'gold' }[] = [
  {
    eyebrow: 'THE NEXT 7 DAYS',
    title: '5 MATCHES · 2 REST DAYS',
    body: 'Days 1–3: Matches 1–3, build momentum. Day 4: rest and mid-week reflection. Day 5: Match 4. Day 6: rest before the finale. Day 7: Match 5 — the Finale — and your profile seals.',
    tone: 'green',
  },
  {
    eyebrow: 'THE CHINEDU WAY',
    title: 'PEN TO PAPER BEFORE YOU TYPE',
    body: 'Record your match, watch the tape, pen your moments with a biro, cool down 24–30 minutes, then type your truth into your database. The hard way is the easy way.',
  },
  {
    eyebrow: 'WHAT FOLLOWS',
    title: 'YOUR ROAD + THE STANDARD',
    body: 'The week builds your profile. Then the Journey opens: six stages graded by your receipts, The Standard beside you, and the Till when you are ready — first stages free, the pass opens the full road.',
    tone: 'gold',
  },
];

export default function WeekOrientationScreen({ coach, onDone }: { coach: Coach; onDone: () => void }) {
  const [i, setI] = useState(0);
  const card = CARDS[i];
  const last = i >= CARDS.length - 1;
  const first = coach.name.split(' ')[0].toUpperCase();
  const { width: winW } = useWindowDimensions();
  const bandW = Math.min(winW, 430);

  return (
    <View style={styles.root}>
      <GridBackground />
      {/* the road-ahead band — orientation looks down the tunnel the week opens */}
      <ArtBand source={TUNNEL} width={bandW} height={132} warmAt={{ x: bandW * 0.5, y: 40, r: bandW * 0.6 }}>
        <Text style={styles.eyebrow}>BEFORE THE WEEK · {first} IS YOUR GUIDE</Text>
        <Text style={styles.kicker}>ORIENTATION · {i + 1} / {CARDS.length}</Text>
      </ArtBand>

      <View style={styles.inner}>

        <Animated.View key={card.eyebrow} entering={FadeInRight.duration(280)} style={[styles.card, card.tone === 'gold' && styles.cardGold]}>
          <Text style={[styles.cardEyebrow, card.tone === 'gold' && { color: colors.warm }]}>{card.eyebrow}</Text>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.cardBody}>{card.body}</Text>
        </Animated.View>

        <View style={styles.dots}>
          {CARDS.map((c, idx) => (
            <View key={c.eyebrow} style={[styles.dot, idx === i && styles.dotOn]} />
          ))}
        </View>

        <Pressable
          onPress={() => {
            sfx('tap');
            if (last) onDone();
            else setI((n) => n + 1);
          }}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.ctaTxt}>{last ? 'START DAY 1 ›' : 'NEXT ›'}</Text>
        </Pressable>

        <Pressable onPress={onDone} hitSlop={10}>
          <Text style={styles.skip}>SKIP — I ALREADY KNOW THE DRILL</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 36, justifyContent: 'center' },
  eyebrow: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: 'rgba(238,242,236,0.9)',
  },
  kicker: {
    marginTop: 6,
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 2.2,
    color: colors.primary,
  },
  card: {
    marginTop: 28,
    borderWidth: 1.2,
    borderColor: 'rgba(57,255,106,0.4)',
    borderRadius: 18,
    backgroundColor: 'rgba(15,26,19,0.9)',
    padding: 22,
    minHeight: 190,
  },
  cardGold: {
    borderColor: 'rgba(242,192,120,0.5)',
    backgroundColor: 'rgba(20,16,8,0.92)',
  },
  cardEyebrow: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 2.6,
    color: colors.accent,
  },
  cardTitle: { marginTop: 12, fontFamily: displayFont, fontSize: 27, lineHeight: 28, letterSpacing: 0.6, color: colors.fg },
  cardBody: {
    marginTop: 14,
    fontFamily: bodyFont,
    fontSize: 13,
    lineHeight: 20,
    color: '#b9cabe',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 22 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(143,184,155,0.3)' },
  dotOn: { backgroundColor: colors.primary, width: 16 },
  cta: {
    marginTop: 22,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.3,
    borderColor: colors.primary,
    backgroundColor: 'rgba(57,255,106,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTxt: {
    fontFamily: bodyFontHeavy,
    fontSize: 13.5,
    letterSpacing: 1.2,
    color: colors.primary,
  },
  skip: {
    marginTop: 16,
    textAlign: 'center',
    fontFamily: bodyFont,
    fontSize: 11.5,
    color: colors.muted,
  },
});
