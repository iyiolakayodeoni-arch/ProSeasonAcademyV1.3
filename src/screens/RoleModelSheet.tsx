import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import ArtBand from '../components/ArtBand';
import ScreenFlash from '../components/ScreenFlash';
import RoleModelCard from '../components/RoleModelCard';
import { ChevronLeftIcon, LockIcon, RouteIcon } from '../components/Icons';
import { Coach } from '../data/coaches';
import { journeySeasonFor } from '../data/journey';
import { useJourneyProgress } from '../data/progress';
import { useMatches } from '../data/matches';
import { useLessonThread } from '../data/lessonThread';
import { sfx } from '../audio/sound';
import { colors, monoFont, displayFont } from '../theme';

// the tunnel — the finish of the path is a walk-out, not a menu item
const TUNNEL = require('../../assets/art/journey-tunnel.jpg');

// ─────────────────────────────────────────────────────────────
// ROLE MODEL SHEET — STAGE 7, THE FINISH.
//
// The path ends in a PERSON on purpose. A player climbing six
// honest stages needs something tangible to look up to — a story
// he can hold, not a leaderboard he can envy. But the card is
// the one thing it can never be: a route. Every road to the top
// of the same game is different, so the academy never asks you
// to walk HIS — it walks YOURS with you, scan by scan, lesson
// by lesson. The card is proof that a road like yours ends
// somewhere like this. Mirror, not map.
// ─────────────────────────────────────────────────────────────

interface RoleStory {
  /** shown while the climb is still locked — why the card exists at all */
  teaser: string;
  /** the finish-is-a-person contract, in his voice */
  contract: string;
  /** the three beats of his legend, told once the climb is done */
  story: [string, string, string];
  /** his closing line under YOUR OWN ROAD receipts */
  signoff: string;
}

const STORIES: Record<string, RoleStory> = {
  chinedu: {
    teaser:
      'Cinder Row made me. Night games on broken concrete, Mama Ukae watching from her shopfront step — she never blew a whistle, little bro, she just LOOKED. I was never the best player on that row. I was the first one who stopped lying to himself after full time. Every scan you sit through is that same shopfront look, shipped to your pocket.',
    contract:
      'WHY THE FINISH IS A PERSON, NOT A PLACE — walk MY road and you fail twice: once because it was never yours, and once more because you expected it to work. The card up top exists for one job only: on the nights the climb feels pointless, there is a face and a story proving the work lands somewhere. Look up when you need to. Then walk YOUR road. Six stages first — the card opens when the climb is done, not before.',
    story: [
      'You want to know why my card ends your map? Because a finish line you can SEE keeps your legs honest. I learned that under Mama Ukae’s shop light on Cinder Row. Every badge on this card was earned in a town that gave me nothing — the pace is thirty metres of broken concrete at full sprint, every evening, for years. The clutch is swallowing my own excuses after a 6–1 and writing three pages about it on the bus home.',
      'But hear the part that matters: you were never meant to walk the Ashfault Ascent the way I walked it. My road had salt pits and locksmiths; yours has ranked queues at 1 a.m. and a phone that overheats on extra time. Copy my road and you will drown in somebody else’s river. Not once did this academy ask you to become me — it asked you to answer for your own matches, and you did.',
      'That is the whole point of the card. Not a path — a proof. Proof that a player who scans his own games, answers the hard questions and writes his own lessons ends up somewhere worth putting on a wall. You did not borrow my story to get here. You built your own, line by line, and nobody can take it off you.',
    ],
    signoff: 'Now carry it. And when a younger player one day asks how you got here — you know what to tell him. The scan knows. It always knows.',
  },
  obinna: {
    teaser:
      'The harbour made me, little one. I learned the ball where the tide gives minutes, not hours — and when my knee ended my own playing at nineteen, I spent two years angry at the water itself before I learned to read it instead of fight it. Everything I ask of you — the calm, the debriefs, the little lines you write — is that lesson, worn smooth by time.',
    contract:
      'WHY THE FINISH IS A PERSON, NOT A PLACE — a sailor needs a light that stays put, little one, not another boat’s wake to follow. Follow MY road and you steer by fog that was mine, in weather that was mine, and you will ground yourself on rocks I never met. The card exists so that on the grey evenings the climb feels endless, there is a face and a story proving calm work lands somewhere. Six stages first — the card opens when the harbour is crossed, not before.',
    story: [
      'Why does my card end your map, little one? Because every long road needs proof it ends somewhere real. Every stat on this card was earned on water that never once apologized — the vision is a thousand fog nights reading ships by sound, the workrate is hauling nets when the catch was already lost. Calm is not soft. Calm is trained, the way you have been training it.',
      'But listen to me carefully: you were never asked to sail the Merehaven Way the way I sailed it. My road had fog gates and light-keepers; yours has tilt queues and a cracked screen protector and matches at hours no harbourmaster would bless. Not once did this academy ask you to become me — it asked you to sit with your own matches and tell the truth about them, and you did.',
      'So the card is not instructions — it is weather-proofing. Proof that a player who scans his games, answers honestly and carries his own lessons forward becomes someone worth looking up to. You never needed my journey, little one. You needed to believe your own could carry you this far. It just did.',
    ],
    signoff: 'Rest a moment, then carry it calmly. Somewhere out there is a player who will one day need YOUR card on his wall — make the story behind it worth reading.',
  },
};

type Props = {
  coach: Coach;
  onClose: () => void;
  /** jump straight into the current stage room (the climb continues) */
  onWalkCurrent: () => void;
};

export default function RoleModelSheet({ coach, onClose, onWalkCurrent }: Props) {
  const prog = useJourneyProgress();
  const vault = useMatches();
  const { width: winW } = useWindowDimensions();
  const bandW = Math.min(winW, 430);
  const thread = useLessonThread();
  const SEASON = journeySeasonFor(coach.id);
  const cleared = prog.completedCount >= SEASON.totalStages;
  const story = STORIES[coach.id] ?? STORIES.chinedu;
  const coachFirst = coach.name.split(' ')[0];

  return (
    <Animated.View entering={FadeIn.duration(240)} style={styles.root}>
      <GridBackground />
      <ScreenFlash />
      {/* the tunnel band — the finish is somewhere you walk out to */}
      <ArtBand source={TUNNEL} width={bandW} height={140} warmAt={{ x: bandW * 0.5, y: 42, r: bandW * 0.6 }} style={{ marginTop: -50 }}>
        <Text style={styles.eyebrow}>AFTER CHAPTER {SEASON.totalStages} · WHAT GOOD LOOKS LIKE</Text>
        <Text style={styles.bandTitle}>WHAT GOOD LOOKS LIKE</Text>
        <Text style={styles.subtitle}>{SEASON.title} — WHERE THIS PATH ENDS</Text>
      </ArtBand>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scroll}>

        {/* the card itself, centered */}
        <Animated.View entering={FadeInUp.delay(120).duration(380)} style={styles.cardWrap}>
          <RoleModelCard coach={coach} />
          <Text style={styles.cardHint}>
            {cleared ? `YOUR PROGRESS IS COMPLETE — LEARN, DO NOT COPY` : `AVAILABLE AFTER CHAPTER ${SEASON.totalStages} · ${prog.completedCount}/${SEASON.totalStages} COMPLETE`}
          </Text>
        </Animated.View>

        {!cleared ? (
          <>
            <Animated.View entering={FadeInUp.delay(200).duration(360)} style={styles.lockPill}>
              <LockIcon size={10} color="rgba(143,184,155,0.75)" />
              <Text style={styles.lockPillTxt}>THE FULL STORY OPENS AFTER CHAPTER {SEASON.totalStages}</Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(260).duration(360)} style={styles.proseCard}>
              <Text style={styles.proseTag}>{coachFirst.toUpperCase()} · A WORD FROM THE TOP OF YOUR MAP</Text>
              <Text style={styles.prose}>{story.teaser}</Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(320).duration(360)} style={styles.contractCard}>
              <Text style={styles.contractTxt}>{story.contract}</Text>
            </Animated.View>

            {/* THE LEGEND PATH PREVIEW — LOCKED */}
            <Animated.View entering={FadeInUp.delay(360).duration(360)} style={styles.legendCard}>
              <View style={styles.legendHeader}>
                <LockIcon size={12} color="#f2c078" />
                <Text style={styles.legendTag}>THE LEGEND PATH (LOCKED — PREVIEW)</Text>
              </View>
              <Text style={styles.legendTitle}>BECOME A LEGEND YOURSELF FIRST</Text>
              <Text style={styles.legendBody}>
                Clear all 6 stages of your coach's road to unlock the next level of your career:
              </Text>
              <View style={styles.legendBullet}>
                <Text style={styles.legendBulletTitle}>1. THE ROAD TO PROSEASON FC</Text>
                <Text style={styles.legendBulletBody}>
                  Step-by-step guidance on how to actually get into ProSeason in FC.
                </Text>
              </View>
              <View style={styles.legendBullet}>
                <Text style={styles.legendBulletTitle}>2. COACH THE NEXT GENERATION (OPTIONAL & PAID)</Text>
                <Text style={styles.legendBulletBody}>
                  Entirely optional: if you choose to share your expertise, you can earn by hosting voluntary group session calls every 4 days per squad. Zero pressure, no obligation, and absolutely no recruitment required. You take 80%, we take 20% of the call proceeds.
                </Text>
              </View>
              <Text style={styles.legendFooter}>
                CONTRACT STATUS: LOCKED · PREPARING SQUAD ASSIGNMENTS
              </Text>
            </Animated.View>

            <Pressable
              onPress={() => {
                sfx('whoosh');
                onWalkCurrent();
              }}
            >
              <View style={styles.cta}>
                <RouteIcon size={12} color="#0a0f0a" />
                <Text style={styles.ctaTxt}>BACK TO CHAPTER {prog.currentStage} ›</Text>
              </View>
            </Pressable>
            <Text style={styles.footNote}>
              NO SKIPPING — HIS ROAD IS ALREADY WALKED. YOURS IS THE ONE THAT ISN'T FINISHED YET.
            </Text>
          </>
        ) : (
          <>
            <Animated.View entering={FadeInUp.delay(200).duration(360)} style={styles.clearedPill}>
              <Text style={styles.clearedPillTxt}>THE CLIMB IS DONE — {coachFirst.toUpperCase()} TELLS IT HIMSELF</Text>
            </Animated.View>

            {story.story.map((beat, i) => (
              <Animated.View key={i} entering={FadeInUp.delay(260 + i * 90).duration(360)} style={styles.proseCard}>
                <Text style={styles.proseTag}>
                  {i === 0 ? 'WHY HIS CARD ENDS YOUR MAP' : i === 1 ? 'WHY IT WAS NEVER HIS ROAD YOU WALKED' : 'WHAT THE CARD IS FOR'}
                </Text>
                <Text style={styles.prose}>{beat}</Text>
              </Animated.View>
            ))}

            {/* YOUR OWN ROAD — the receipts that got you here */}
            <Animated.View entering={FadeInUp.delay(560).duration(360)} style={styles.receiptCard}>
              <Text style={styles.receiptTag}>YOUR OWN ROAD — THE RECEIPTS</Text>
              <View style={styles.receiptRow}>
                <View style={styles.receiptStat}>
                  <Text style={styles.receiptV}>{vault.played}</Text>
                  <Text style={styles.receiptL}>MATCHES LOGGED</Text>
                </View>
                <View style={styles.receiptStat}>
                  <Text style={styles.receiptV}>{vault.w}–{vault.d}–{vault.l}</Text>
                  <Text style={styles.receiptL}>W · D · L</Text>
                </View>
                <View style={styles.receiptStat}>
                  <Text style={styles.receiptV}>{thread.entries.length}</Text>
                  <Text style={styles.receiptL}>LESSONS SWORN</Text>
                </View>
              </View>
              <View style={styles.receiptRow}>
                <View style={styles.receiptStat}>
                  <Text style={styles.receiptV}>{thread.heldCount}✓</Text>
                  <Text style={styles.receiptL}>LESSONS HELD</Text>
                </View>
                <View style={styles.receiptStat}>
                  <Text style={styles.receiptV}>{thread.brokeCount}✗</Text>
                  <Text style={styles.receiptL}>LESSONS BROKE</Text>
                </View>
                <View style={styles.receiptStat}>
                  <Text style={styles.receiptV}>{prog.xp}</Text>
                  <Text style={styles.receiptL}>XP BANKED</Text>
                </View>
              </View>
              <Text style={styles.receiptNote}>
                NOBODY WALKED THIS FOR YOU — EVERY NUMBER HERE CAME OUT OF YOUR OWN MATCHES, YOUR OWN ANSWERS, YOUR OWN LESSONS.
              </Text>
            </Animated.View>

            {/* THE LEGEND PATH — LOCKED */}
            <Animated.View entering={FadeInUp.delay(600).duration(360)} style={styles.legendCard}>
              <View style={styles.legendHeader}>
                <LockIcon size={12} color="#f2c078" />
                <Text style={styles.legendTag}>NEXT: THE LEGEND PATH (COMING LATER)</Text>
              </View>
              <Text style={styles.legendTitle}>YOU ARE A LEGEND YOURSELF NOW</Text>
              <Text style={styles.legendBody}>
                You have finished your climb and ended your session! You are ready for the next stage of your journey:
              </Text>
              <View style={styles.legendBullet}>
                <Text style={styles.legendBulletTitle}>1. THE ROAD TO PROSEASON FC</Text>
                <Text style={styles.legendBulletBody}>
                  We will guide you step-by-step on how to actually get into ProSeason in FC.
                </Text>
              </View>
              <View style={styles.legendBullet}>
                <Text style={styles.legendBulletTitle}>2. COACH THE NEXT GENERATION (OPTIONAL & PAID)</Text>
                <Text style={styles.legendBulletBody}>
                  Entirely optional: if you choose to give back, you can host voluntary group session calls every 4 days per squad. Zero pressure, no obligations, and absolutely no recruitment or pyramid structure—just direct, rewarded coaching. You take 80%, we take 20% of the call proceeds.
                </Text>
              </View>
              <Text style={styles.legendFooter}>
                CONTRACT STATUS: LOCKED · PREPARING SQUAD ASSIGNMENTS FOR SEASON 2
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(660).duration(360)} style={styles.proseCard}>
              <Text style={styles.prose}>{story.signoff}</Text>
            </Animated.View>

            <Pressable onPress={() => { sfx('tap'); onClose(); }}>
              <View style={styles.cta}>
                <Text style={styles.ctaTxt}>HANG THE CARD — BACK TO THE MAP ›</Text>
              </View>
            </Pressable>
            <Text style={styles.footNote}>
              EVERY ROAD TO THE TOP OF THE SAME GAME IS DIFFERENT — THAT WAS THE DESIGN ALL ALONG.
            </Text>
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      <Pressable onPress={onClose} hitSlop={10} style={styles.backBtn}>
        <ChevronLeftIcon size={15} color={colors.fg} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, paddingTop: 50 },
  scroll: { paddingHorizontal: 16, paddingBottom: 26 },

  eyebrow: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '800', letterSpacing: 2.4, color: 'rgba(238,242,236,0.85)' },
  bandTitle: { marginTop: 5, fontFamily: displayFont, fontSize: 30, lineHeight: 31, letterSpacing: 0.8, color: colors.fg, textShadowColor: 'rgba(242,192,120,0.45)', textShadowRadius: 10 },
  subtitle: { marginTop: 7, fontFamily: monoFont, fontSize: 6, fontWeight: '700', letterSpacing: 1.6, color: 'rgba(238,242,236,0.85)' },

  cardWrap: { marginTop: 18, alignItems: 'center' },
  cardHint: { marginTop: 13, fontFamily: monoFont, fontSize: 5.8, fontWeight: '800', letterSpacing: 1.8, color: 'rgba(143,184,155,0.6)', textAlign: 'center' },

  lockPill: {
    marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderWidth: 1, borderColor: 'rgba(143,184,155,0.35)', borderRadius: 10, paddingVertical: 9,
  },
  lockPillTxt: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '900', letterSpacing: 1.6, color: 'rgba(143,184,155,0.8)' },
  clearedPill: {
    marginTop: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingVertical: 9,
    backgroundColor: 'rgba(57,255,106,0.06)',
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  clearedPillTxt: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '900', letterSpacing: 1.6, color: colors.primary },

  proseCard: {
    marginTop: 12, borderWidth: 1.1, borderColor: 'rgba(57,255,106,0.35)', borderRadius: 14,
    backgroundColor: 'rgba(12,20,14,0.92)', padding: 14,
  },
  proseTag: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 2, color: colors.primary },
  prose: { marginTop: 9, fontSize: 11, lineHeight: 17.5, fontWeight: '600', color: '#ccd9cf' },

  contractCard: {
    marginTop: 12, borderWidth: 1.2, borderColor: 'rgba(242,192,120,0.5)', borderRadius: 14,
    backgroundColor: 'rgba(242,192,120,0.06)', padding: 14,
    shadowColor: colors.accent, shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
  },
  contractTxt: { fontFamily: monoFont, fontSize: 6.6, lineHeight: 12.5, fontWeight: '800', letterSpacing: 1.2, color: colors.warm },

  receiptCard: {
    marginTop: 12, borderWidth: 1.2, borderColor: colors.primary, borderRadius: 14,
    backgroundColor: 'rgba(57,255,106,0.05)', padding: 14,
    shadowColor: colors.primary, shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
  },
  receiptTag: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 2, color: colors.primary, textAlign: 'center' },
  receiptRow: { marginTop: 12, flexDirection: 'row' },
  receiptStat: { flex: 1, alignItems: 'center' },
  receiptV: { fontFamily: monoFont, fontSize: 15, fontWeight: '900', letterSpacing: 1, color: colors.fg },
  receiptL: { marginTop: 3, fontFamily: monoFont, fontSize: 5.2, fontWeight: '800', letterSpacing: 1.4, color: colors.muted },
  receiptNote: { marginTop: 13, fontFamily: monoFont, fontSize: 5.6, lineHeight: 10, fontWeight: '800', letterSpacing: 1.1, color: 'rgba(143,184,155,0.7)', textAlign: 'center' },

  cta: {
    marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13,
    shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  ctaTxt: { fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.8, color: '#0a0f0a' },
  footNote: { marginTop: 10, fontFamily: monoFont, fontSize: 5.4, lineHeight: 9.5, fontWeight: '700', letterSpacing: 1.1, textAlign: 'center', color: '#42584a' },

  legendCard: {
    marginTop: 12, borderWidth: 1.2, borderColor: '#f2c078', borderRadius: 14,
    backgroundColor: 'rgba(242,192,120,0.04)', padding: 14,
  },
  legendHeader: { flexDirection: 'row', alignItems: 'center' },
  legendTag: { fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', letterSpacing: 1.6, color: '#f2c078', marginLeft: 6 },
  legendTitle: { marginTop: 10, fontSize: 13, fontWeight: '900', letterSpacing: 0.6, color: colors.fg },
  legendBody: { marginTop: 6, fontSize: 11, lineHeight: 16.5, fontWeight: '600', color: '#ccd9cf' },
  legendBullet: { marginTop: 10, paddingLeft: 8, borderLeftWidth: 1.5, borderLeftColor: 'rgba(242,192,120,0.3)' },
  legendBulletTitle: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.4, color: '#f2c078' },
  legendBulletBody: { marginTop: 3, fontSize: 10.5, lineHeight: 15, fontWeight: '600', color: '#b8c9bf' },
  legendFooter: { marginTop: 12, fontFamily: monoFont, fontSize: 5.6, letterSpacing: 1.2, color: 'rgba(143,184,155,0.6)', textAlign: 'center' },

  backBtn: {
    position: 'absolute', top: 58, left: 16, width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.2, borderColor: 'rgba(143,184,155,0.4)', backgroundColor: 'rgba(10,17,12,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
});
