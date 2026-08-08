import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import GridBackground from '../../components/GridBackground';
import ArtBand from '../../components/ArtBand';
import LogoMark from '../../components/LogoMark';
import { ChevronDownIcon, ChevronRightIcon, PlayIcon } from '../../components/Icons';
import { Coach } from '../../data/coaches';
import { useMatches } from '../../data/matches';
import { useJourneyProgress } from '../../data/progress';
import { useSettings } from '../../data/settings';
import { currentDay, loadDailyProgram } from '../../data/dailyProgram';
import { bodyFont, bodyFontBold, bodyFontHeavy, colors, displayFont, monoFont } from '../../theme';
import { useTrailLoop } from '../../hooks/useTrailLoop';

// The Home tab answers one question: "what should I do next?" — with a
// welcome that treats the player like the king they are, and a gamified
// stat strip so the discipline reads like progress, not homework.
const TOUCHLINE = require('../../../assets/art/coach-touchline.jpg');

type Props = {
  coach: Coach;
  onOpenJourney: () => void;
  onOpenUpdates: () => void;
  onOpenHalls: () => void;
  onOpenGuide: () => void;
  onOpenRole: () => void;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'STILL UP,';
  if (h < 12) return 'GOOD MORNING,';
  if (h < 18) return 'GOOD AFTERNOON,';
  return 'GOOD EVENING,';
}

export default function HomeTab({ coach, onOpenJourney, onOpenUpdates, onOpenHalls, onOpenGuide, onOpenRole }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.min(windowWidth, 430) - 32;
  const [tutOpen, setTutOpen] = useState<string | null>(null);
  const [day, setDay] = useState<number>(1);
  const settings = useSettings();
  const progress = useJourneyProgress();
  const vault = useMatches();
  const { loopProps, glowStyle } = useTrailLoop({ pathLength: 260, drawMs: 2400, eraseMs: 2400 });

  useEffect(() => {
    void loadDailyProgram().then((p) => setDay(Math.min(currentDay(p), 180)));
  }, []);

  const stats = useMemo(
    () => [
      { label: 'XP', value: progress.xp.toLocaleString('en-US'), accent: colors.primary },
      { label: 'STREAK', value: `×${settings.bestStreak}`, accent: colors.accent },
      { label: 'DIV', value: settings.div, accent: colors.warm },
      { label: 'MATCHES', value: String(vault.played), accent: '#7fd4ff' },
    ],
    [progress.xp, settings.bestStreak, settings.div, vault.played],
  );

  return (
    <View style={styles.flex}>
      <GridBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
        {/* ── brand header — the crest + wordmark ── */}
        <View style={styles.brandRow}>
          <View style={styles.brandLockup}>
            <LogoMark size={34} loopProps={loopProps} glowStyle={glowStyle} />
            <View style={styles.brandText}>
              <Text style={styles.brand}>PROSEASONACADEMY</Text>
              <Text style={styles.brandMeta}>CONSOLE REVIEW PRACTICE</Text>
            </View>
          </View>
        </View>

        {/* ── welcome hero — the king is welcome, then we work ── */}
        <Animated.View entering={FadeInUp.duration(300)}>
          <ArtBand source={TOUCHLINE} width={contentWidth} height={150} warmAt={{ x: contentWidth * 0.7, y: 36, r: contentWidth * 0.55 }} style={styles.heroBand}>
            <Text style={styles.heroEyebrow}>TODAY · DAY {day} OF 180</Text>
            <Text style={styles.heroTitle}>{greeting()} {settings.displayName.toUpperCase()}</Text>
            <Text style={styles.heroSub}>ONE REAL MATCH. ONE HONEST REVIEW. WE BUILD FROM THERE.</Text>
          </ArtBand>
        </Animated.View>

        {/* ── gamified stat strip ── */}
        <Animated.View entering={FadeInUp.delay(40).duration(320)} style={styles.statsCard}>
          {stats.map((s, i) => (
            <View key={s.label} style={[styles.statCell, i > 0 && styles.statCellBorder]}>
              <Text style={[styles.statValue, { color: s.accent }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ── your day — the one thing to do today lives in your tracker ── */}
        <Animated.View entering={FadeInUp.delay(60).duration(320)} style={styles.nextCard}>
          <View style={styles.nextTop}>
            <View>
              <Text style={styles.cardKicker}>YOUR NEXT MOVE</Text>
              <Text style={styles.stageTitle}>OPEN MY PROGRESS</Text>
            </View>
            <Image source={coach.portrait} style={[styles.coachFace, { borderColor: coach.cardAccent }]} />
          </View>
          <Text style={styles.stageTagline}>
            Your day-by-day tracker is where the work happens — one day at a time, seal it, and watch your six months fill in. Your day is waiting.
          </Text>
          <Pressable onPress={onOpenJourney} style={styles.startAction}>
            <Text style={styles.startActionTxt}>OPEN MY SIX MONTHS</Text>
          </Pressable>
        </Animated.View>

        {/* ── ROLE MODEL STORY & TEACHINGS ── */}
        <Animated.View entering={FadeInUp.delay(100).duration(320)}>
          <Text style={styles.sectionLabel}>ROLE MODEL STORY & TEACHINGS</Text>
          <View style={styles.roleCard}>
            <View style={styles.roleHeader}>
              <View style={styles.roleAvatar}><Image source={coach.portrait} style={styles.roleAvatarImg} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleName}>{coach.name.toUpperCase()} · HIS OWN JOURNEY</Text>
                <Text style={styles.roleSub}>MATCHES · LIFE BEATS · THE TRICKS HE'S KNOWN FOR</Text>
              </View>
            </View>
            <Pressable onPress={onOpenRole} style={styles.roleBtn}>
              <PlayIcon size={13} color="#07110a" />
              <Text style={styles.roleBtnTxt}>FOLLOW HIS STORY & TEACHINGS</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* ── FC 26 / ACADEMY CONTENT ── */}
        <Animated.View entering={FadeInUp.delay(140).duration(320)}>
          <Text style={styles.sectionLabel}>FC 26 / 27 & ACADEMY</Text>
          <Pressable onPress={onOpenUpdates} style={styles.contentCard}>
            <View style={styles.contentHead}>
              <View style={styles.contentIcon}><Text style={styles.contentIconTxt}>▶</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contentTitle}>ACADEMY UPDATES & FC NEWS</Text>
                <Text style={styles.contentSub}>THE LATEST MECHANICS, FOUNDER NOTES AND META WATCH</Text>
              </View>
            </View>
            <Text style={styles.contentCta}>READ THE FEED ›</Text>
          </Pressable>
        </Animated.View>

        {/* ── LEARN THE BASICS ── */}
        <Animated.View entering={FadeInUp.delay(180).duration(320)}>
          <Text style={styles.sectionLabel}>NEW HERE? LEARN THE BASICS</Text>
          <View style={styles.tutCard}>
            {TUTORIALS.map((t) => {
              const open = tutOpen === t.id;
              return (
                <Pressable key={t.id} onPress={() => { setTutOpen(open ? null : t.id); }} style={styles.tutRow}>
                  <View style={styles.tutRowHead}>
                    <Text style={styles.tutQ}>?  {t.q}</Text>
                    <ChevronDownIcon size={12} color={open ? colors.primary : colors.muted} />
                  </View>
                  {open && <Text style={styles.tutA}>{t.a}</Text>}
                </Pressable>
              );
            })}
            <Pressable onPress={onOpenGuide} hitSlop={8} style={styles.guideLink}>
              <Text style={styles.guideLinkTxt}>READ THE FULL 60-SECOND GUIDE</Text>
              <ChevronRightIcon size={12} color={colors.primary} />
            </Pressable>
          </View>
        </Animated.View>

        {/* ── COMMUNITY ── */}
        <Animated.View entering={FadeInUp.delay(220).duration(320)}>
          <Text style={styles.sectionLabel}>COMMUNITY</Text>
          <Pressable onPress={onOpenHalls} style={styles.contentCard}>
            <View style={styles.contentHead}>
              <View style={[styles.contentIcon, { borderColor: 'rgba(57,255,106,0.5)', backgroundColor: 'rgba(57,255,106,0.08)' }]}><Text style={[styles.contentIconTxt, { color: colors.primary }]}>#</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contentTitle}>THE CLUBHOUSE</Text>
                <Text style={styles.contentSub}>CHAT IN GENERAL · TAP A PLAYER TO MESSAGE PRIVATELY</Text>
              </View>
            </View>
            <Text style={styles.contentCta}>OPEN COMMUNITY ›</Text>
          </Pressable>
        </Animated.View>

        <Text style={styles.footer}>THE KING IS IN THE BUILDING · THE NEXT MATCH IS THE ONLY ONE YOU CAN WORK ON.</Text>
      </ScrollView>
    </View>
  );
}

const TUTORIALS: { id: string; q: string; a: string }[] = [
  { id: 'what', q: 'WHAT IS THIS APP?', a: 'A console review practice for FC 26/27. You play a real match, then review it honestly — one moment, one lesson, carried into the next match. No shortcuts, no filler.' },
  { id: 'coach', q: 'WHO IS YOUR COACH?', a: 'You picked one coach — permanently. He is the voice and accountability on your road. He does not hand you answers; he walks you through your own evidence.' },
  { id: 'sixmonths', q: 'WHAT ARE THE SIX MONTHS (PROGRESS TAB)?', a: 'Your day-by-day tracker. One day unlocks at a time, a new one every 24 hours. Seal the day, watch your calendar fill, and you can Pause any time if life gets busy. The real teaching lives here on Home; the tracker just rewards your discipline.' },
  { id: 'review', q: 'WHAT IS A MATCH REVIEW?', a: 'After a real match, you log the score, type four core stats, name one turning point, and write one honest lesson. That lesson becomes your next match\'s focus.' },
  { id: 'rolemodel', q: 'WHAT IS THE ROLE MODEL STORY?', a: 'The coach\'s own fictional journey — his matches, his life beats, and the real FC 26 tricks he is known for. It runs alongside your season, and every trick opens a full teaching.' },
  { id: 'community', q: 'WHAT IS THE COMMUNITY?', a: 'A clubhouse of real players. No bots, no scripts. Chat in general, or tap a player to message them privately.' },
];

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 5, paddingBottom: 28 },

  brandRow: { marginBottom: 11, alignItems: 'center' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandText: {},
  brand: { fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 2.4, color: colors.fg },
  brandMeta: { marginTop: 2, fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.35, color: colors.muted },

  heroBand: { borderRadius: 16, overflow: 'hidden' },
  heroEyebrow: { fontFamily: bodyFontHeavy, fontSize: 9.5, letterSpacing: 2.2, color: colors.primary },
  heroTitle: { marginTop: 6, fontFamily: displayFont, fontSize: 27, lineHeight: 28, letterSpacing: 0.4, color: colors.fg },
  heroSub: { marginTop: 8, fontFamily: monoFont, fontSize: 6.7, letterSpacing: 1.65, color: 'rgba(238,242,236,0.85)' },

  statsCard: { marginTop: 12, flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(57,255,106,0.22)', borderRadius: 14, backgroundColor: 'rgba(13,24,16,0.86)', overflow: 'hidden' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 11 },
  statCellBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(57,255,106,0.13)' },
  statValue: { fontFamily: displayFont, fontSize: 17, letterSpacing: 0.6 },
  statLabel: { marginTop: 3, fontFamily: bodyFontBold, fontSize: 7.5, letterSpacing: 1.5, color: colors.muted },

  nextCard: { marginTop: 14, borderWidth: 1.2, borderColor: 'rgba(57,255,106,0.5)', borderRadius: 16, padding: 14, backgroundColor: 'rgba(13,25,16,0.92)', shadowColor: colors.primary, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  nextTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardKicker: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '900', letterSpacing: 1.8, color: colors.primary },
  stageTitle: { marginTop: 6, fontFamily: displayFont, fontSize: 22, lineHeight: 23, letterSpacing: 0.6, color: colors.fg },
  coachFace: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5 },
  stageTagline: { marginTop: 9, fontFamily: bodyFont, fontSize: 12.4, lineHeight: 18, color: '#bfcec3' },
  startAction: { marginTop: 13, minHeight: 53, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 12, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  startActionTxt: { fontFamily: bodyFontHeavy, fontSize: 12, letterSpacing: 1.6, color: '#07110a' },
  textLink: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  textLinkTxt: { fontFamily: bodyFontHeavy, fontSize: 9.5, letterSpacing: 1.2, color: colors.primary },

  sectionLabel: { marginTop: 20, marginLeft: 2, fontFamily: bodyFontHeavy, fontSize: 9, letterSpacing: 1.9, color: colors.muted },

  roleCard: { marginTop: 8, borderWidth: 1.2, borderColor: 'rgba(242,192,120,0.5)', borderRadius: 15, backgroundColor: 'rgba(242,192,120,0.05)', padding: 13, shadowColor: colors.accent, shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  roleHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  roleAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.accent, overflow: 'hidden' },
  roleAvatarImg: { width: 44, height: 44 },
  roleName: { fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 1.2, color: colors.fg },
  roleSub: { marginTop: 3, fontFamily: monoFont, fontSize: 5.6, fontWeight: '800', letterSpacing: 1.2, color: colors.accent },
  roleBtn: { marginTop: 12, minHeight: 46, borderRadius: 11, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  roleBtnTxt: { fontFamily: bodyFontHeavy, fontSize: 10.5, letterSpacing: 1.3, color: '#07110a' },

  contentCard: { marginTop: 8, borderWidth: 1.1, borderColor: 'rgba(57,255,106,0.25)', borderRadius: 14, backgroundColor: 'rgba(12,20,14,0.9)', padding: 13 },
  contentHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  contentIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(242,192,120,0.45)', backgroundColor: 'rgba(242,192,120,0.08)', alignItems: 'center', justifyContent: 'center' },
  contentIconTxt: { color: colors.accent, fontFamily: bodyFontHeavy, fontSize: 13 },
  contentTitle: { fontFamily: bodyFontBold, fontSize: 12, letterSpacing: 0.8, color: colors.fg },
  contentSub: { marginTop: 3, fontFamily: bodyFont, fontSize: 10.2, lineHeight: 14, color: colors.muted },
  contentCta: { marginTop: 10, fontFamily: bodyFontHeavy, fontSize: 8.8, letterSpacing: 1.4, color: colors.primary },

  tutCard: { marginTop: 8, borderWidth: 1.1, borderColor: 'rgba(57,255,106,0.25)', borderRadius: 14, backgroundColor: 'rgba(12,20,14,0.9)', padding: 13 },
  tutRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(57,255,106,0.1)' },
  tutRowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  tutQ: { fontFamily: monoFont, fontSize: 7.2, fontWeight: '900', letterSpacing: 1.2, color: colors.primary, flex: 1 },
  tutA: { marginTop: 8, fontFamily: bodyFont, fontSize: 11.5, lineHeight: 17, color: '#c9d6cc' },
  guideLink: { marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 2 },
  guideLinkTxt: { fontFamily: bodyFontHeavy, fontSize: 9.2, letterSpacing: 1.2, color: colors.primary },

  footer: { marginTop: 18, paddingHorizontal: 10, textAlign: 'center', fontFamily: monoFont, fontSize: 6.1, lineHeight: 10, letterSpacing: 1.2, color: 'rgba(143,184,155,0.5)' },
});
