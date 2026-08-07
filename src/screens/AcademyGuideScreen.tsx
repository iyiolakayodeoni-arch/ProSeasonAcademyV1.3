import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import ArtBand from '../components/ArtBand';
import GridBackground from '../components/GridBackground';
import { CheckIcon, ChevronLeftIcon } from '../components/Icons';
import { bodyFont, bodyFontBold, bodyFontHeavy, colors, displayFont, monoFont } from '../theme';

// This screen exists because a branded name should never make a member guess
// what a feature is for. It is deliberately plain-spoken and always reachable.
const TOUCHLINE = require('../../assets/art/coach-touchline.jpg');

type Props = {
  onClose: () => void;
};

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}><Text style={styles.stepNumberTxt}>{number}</Text></View>
      <View style={styles.stepCopy}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

function Term({ name, meaning }: { name: string; meaning: string }) {
  return (
    <View style={styles.termRow}>
      <Text style={styles.termName}>{name}</Text>
      <Text style={styles.termMeaning}>{meaning}</Text>
    </View>
  );
}

export default function AcademyGuideScreen({ onClose }: Props) {
  const { width } = useWindowDimensions();
  const bandWidth = Math.min(width, 430);

  return (
    <View style={styles.root}>
      <GridBackground />
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.backBtn}>
          <ChevronLeftIcon size={16} color={colors.fg} />
          <Text style={styles.backTxt}>BACK</Text>
        </Pressable>
        <Text style={styles.headerBrand}>PLAIN-ENGLISH GUIDE</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ArtBand
          source={TOUCHLINE}
          width={bandWidth}
          height={150}
          warmAt={{ x: bandWidth * 0.7, y: 38, r: bandWidth * 0.55 }}
          style={styles.heroBand}
        >
          <Text style={styles.heroEyebrow}>START HERE</Text>
          <Text style={styles.heroTitle}>WHAT IS THIS{`\n`}ACADEMY FOR?</Text>
          <Text style={styles.heroSub}>A SHORT ANSWER, BEFORE THE BRAND WORDS.</Text>
        </ArtBand>

        <Animated.View entering={FadeInUp.duration(260)} style={styles.answerCard}>
          <Text style={styles.kicker}>THE SIMPLE ANSWER</Text>
          <Text style={styles.answerTitle}>IT HELPS YOU LEARN FROM THE MATCH YOU JUST PLAYED.</Text>
          <Text style={styles.answerBody}>
            ProSeasonAcademy is a private review practice for EA FC console players. It does not play for you, analyse your mind with AI, or promise a shortcut. It helps you notice your own repeated decisions and take one useful lesson into the next match.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(40).duration(280)}>
          <Text style={styles.sectionLabel}>WHAT YOU DO AFTER A MATCH</Text>
          <View style={styles.card}>
            <Step number="01" title="PLAY" body="Play a real FC console match as normal. Record it if you want to review it later." />
            <Step number="02" title="REVIEW" body="Use the Mirror Session to name one focus, the pattern you saw, and the moments you chose." />
            <Step number="03" title="CARRY" body="Write one lesson in your own words. The next session asks whether it held or broke." />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(80).duration(280)}>
          <Text style={styles.sectionLabel}>THE FOUR NAMES YOU WILL SEE</Text>
          <View style={styles.card}>
            <Term name="MIRROR SESSION" meaning="The short before, during and after-match review. It structures your reflection; it never writes it for you." />
            <Term name="THE THREAD" meaning="Your one-line lesson from the last match. You carry it into the next one." />
            <Term name="MATCH VAULT" meaning="The record of your scores and match receipts. This is evidence, not a highlight reel." />
            <Term name="PROGRESS" meaning="Six development chapters. A chapter moves only when your own evidence meets its target." />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).duration(280)} style={styles.notCard}>
          <Text style={styles.notTitle}>WHAT IT IS NOT</Text>
          <View style={styles.notRow}><CheckIcon size={11} color={colors.accent} /><Text style={styles.notCopy}>Not a news feed you need to keep up with.</Text></View>
          <View style={styles.notRow}><CheckIcon size={11} color={colors.accent} /><Text style={styles.notCopy}>Not a social app you need to perform in.</Text></View>
          <View style={styles.notRow}><CheckIcon size={11} color={colors.accent} /><Text style={styles.notCopy}>Not a stats card generator pretending to be coaching.</Text></View>
          <Text style={styles.notBottom}>Updates, halls and detailed stats exist to support the work—not replace it.</Text>
        </Animated.View>

        <Pressable onPress={onClose} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.8 }]}>
          <Text style={styles.ctaTxt}>I KNOW WHAT TO DO NOW</Text>
        </Pressable>
        <Text style={styles.footer}>WHEN IN DOUBT: PLAY ONE MATCH · REVIEW IT HONESTLY · CARRY ONE LESSON.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { height: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(57,255,106,0.18)' },
  backBtn: { minWidth: 62, flexDirection: 'row', alignItems: 'center', gap: 3 },
  backTxt: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '900', letterSpacing: 1.5, color: colors.fg },
  headerBrand: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.7, color: colors.primary },
  headerSpacer: { width: 62 },
  scroll: { paddingBottom: 32 },
  heroBand: { borderRadius: 0, overflow: 'hidden' },
  heroEyebrow: { fontFamily: bodyFontHeavy, fontSize: 9, letterSpacing: 2, color: colors.primary },
  heroTitle: { marginTop: 7, fontFamily: displayFont, fontSize: 28, lineHeight: 29, letterSpacing: 0.6, color: colors.fg },
  heroSub: { marginTop: 7, fontFamily: monoFont, fontSize: 6.1, letterSpacing: 1.35, color: 'rgba(238,242,236,0.86)' },
  answerCard: { marginHorizontal: 16, marginTop: 15, borderWidth: 1.2, borderColor: 'rgba(57,255,106,0.46)', borderRadius: 15, padding: 15, backgroundColor: 'rgba(13,25,16,0.9)' },
  kicker: { fontFamily: monoFont, fontSize: 6.7, fontWeight: '900', letterSpacing: 1.8, color: colors.primary },
  answerTitle: { marginTop: 7, fontFamily: bodyFontHeavy, fontSize: 14.5, lineHeight: 19, letterSpacing: 0.4, color: colors.fg },
  answerBody: { marginTop: 8, fontFamily: bodyFont, fontSize: 12.3, lineHeight: 18.5, color: '#c4d3c8' },
  sectionLabel: { marginTop: 19, marginHorizontal: 18, fontFamily: bodyFontHeavy, fontSize: 9, letterSpacing: 1.8, color: colors.muted },
  card: { marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderColor: 'rgba(57,255,106,0.2)', borderRadius: 14, backgroundColor: 'rgba(12,21,14,0.8)', overflow: 'hidden' },
  stepRow: { padding: 13, flexDirection: 'row', gap: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(57,255,106,0.1)' },
  stepNumber: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(57,255,106,0.12)', borderWidth: 1, borderColor: 'rgba(57,255,106,0.35)' },
  stepNumberTxt: { fontFamily: monoFont, fontSize: 7.2, fontWeight: '900', letterSpacing: 0.7, color: colors.primary },
  stepCopy: { flex: 1 },
  stepTitle: { fontFamily: bodyFontHeavy, fontSize: 11.5, letterSpacing: 1, color: colors.fg },
  stepBody: { marginTop: 4, fontFamily: bodyFont, fontSize: 11.2, lineHeight: 16, color: colors.muted },
  termRow: { padding: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(57,255,106,0.1)' },
  termName: { fontFamily: bodyFontHeavy, fontSize: 10.4, letterSpacing: 1.25, color: colors.primary },
  termMeaning: { marginTop: 5, fontFamily: bodyFont, fontSize: 11.4, lineHeight: 16.5, color: '#c2d2c6' },
  notCard: { marginHorizontal: 16, marginTop: 17, borderWidth: 1, borderColor: 'rgba(242,192,120,0.36)', borderRadius: 14, backgroundColor: 'rgba(36,28,11,0.57)', padding: 14 },
  notTitle: { fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 1.7, color: colors.accent },
  notRow: { marginTop: 9, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  notCopy: { flex: 1, fontFamily: bodyFont, fontSize: 11.5, lineHeight: 16, color: '#e1d7c3' },
  notBottom: { marginTop: 11, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(242,192,120,0.18)', fontFamily: monoFont, fontSize: 6.3, lineHeight: 10, letterSpacing: 1.05, color: 'rgba(242,192,120,0.85)' },
  cta: { marginHorizontal: 16, marginTop: 18, minHeight: 51, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  ctaTxt: { fontFamily: bodyFontHeavy, fontSize: 11, letterSpacing: 1.6, color: '#07110a' },
  footer: { marginTop: 15, paddingHorizontal: 24, textAlign: 'center', fontFamily: monoFont, fontSize: 6.1, lineHeight: 10, letterSpacing: 1.1, color: 'rgba(143,184,155,0.52)' },
});
