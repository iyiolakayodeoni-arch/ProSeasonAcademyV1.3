import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import ArtBand from '../components/ArtBand';
import { ONBOARD_CARDS } from '../data/onboarding';
import { sfx } from '../audio/sound';
import { colors, monoFont, displayFont, bodyFont, bodyFontHeavy } from '../theme';

// the dressing room — the tour's front door
const LOCKERS = require('../../assets/art/locker-room.jpg');

type Props = { onDone: () => void };

export default function OnboardingScreen({ onDone }: Props) {
  const [i, setI] = useState(0);
  const card = ONBOARD_CARDS[i];
  const last = i >= ONBOARD_CARDS.length - 1;
  const { width: winW } = useWindowDimensions();
  const bandW = Math.min(winW, 430);

  return (
    <View style={styles.root}>
      <GridBackground />
      {/* the dressing-room band — the tour starts where every kit hangs */}
      <ArtBand source={LOCKERS} width={bandW} height={132} warmAt={{ x: bandW * 0.5, y: 36, r: bandW * 0.55 }}>
        <Text style={styles.brand}>PROSEASONACADEMY</Text>
        <Text style={styles.kicker}>ACADEMY TOUR · {i + 1} / {ONBOARD_CARDS.length}</Text>
      </ArtBand>
      <View style={styles.inner}>

        <Animated.View key={card.id} entering={FadeInRight.duration(280)} style={[styles.card, card.tone === 'gold' && styles.cardGold]}>
          <Text style={[styles.eyebrow, card.tone === 'gold' && { color: colors.warm }]}>{card.eyebrow}</Text>
          <Text style={styles.title}>{card.title}</Text>
          <Text style={styles.body}>{card.body}</Text>
        </Animated.View>

        <View style={styles.dots}>
          {ONBOARD_CARDS.map((c, idx) => (
            <View key={c.id} style={[styles.dot, idx === i && styles.dotOn]} />
          ))}
        </View>

        <Pressable
          onPress={() => {
            sfx('tap');
            if (last) onDone();
            else setI((n) => n + 1);
          }}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.ctaTxt}>{last ? 'ENTER THE FLOOR ›' : 'NEXT ›'}</Text>
        </Pressable>

        <Pressable onPress={onDone} hitSlop={10}>
          <Animated.View entering={FadeIn.delay(200)}>
            <Text style={styles.skip}>SKIP TOUR — I'LL FIND MY WAY</Text>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 36, justifyContent: 'center' },
  brand: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 3,
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
    minHeight: 200,
  },
  cardGold: {
    borderColor: 'rgba(242,192,120,0.5)',
    backgroundColor: 'rgba(20,16,8,0.92)',
  },
  eyebrow: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 2.6,
    color: colors.accent,
  },
  title: {
    marginTop: 12,
    fontFamily: displayFont,
    fontSize: 27,
    lineHeight: 28,
    letterSpacing: 0.6,
    color: colors.fg,
  },
  body: {
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
