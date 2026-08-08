import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import ArtBand from '../components/ArtBand';
import ScreenFlash from '../components/ScreenFlash';
import LessonAnimation from '../components/LessonAnimation';

// the mirror drill — a side note is a quiet technique, practiced alone
const MIRROR_ART = require('../../assets/art/mirror-drill.jpg');
import {
  ArrowOutIcon,
  ChevronLeftIcon,
  ClockGlyphIcon,
  PauseGlyphIcon,
  TargetGlyphIcon,
  WavesGlyphIcon,
} from '../components/Icons';
import { Coach } from '../data/coaches';
import { SideLesson } from '../data/sideLesson';
import { InputCombo, ControllerButton } from '../components/ButtonGlyph';
import { sfx } from '../audio/sound';
import { colors, monoFont, displayFont } from '../theme';

// ─────────────────────────────────────────────────────────────
// SIDE LESSON SHEET — the SIDE QUEST, read INSIDE the academy.
//
// The same bot that drops tricks in Home researches this; the
// founder approves it; the player reads it here: the silent
// animated board, the breakdown, the blog in academy words and
// the source credit. It is deliberately framed as a SIDE NOTE —
// something extra to try. The main thing is never done by the
// bot: the main quest is your own thread, written by your scans.
// ─────────────────────────────────────────────────────────────

function mmss(total: number): string {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const TileIcon = { target: TargetGlyphIcon, waves: WavesGlyphIcon, arrow: ArrowOutIcon };

const COMBO_MAP: Record<string, ControllerButton[]> = {
  'controlled-sprint': ['R1', 'LS'],
  'late-cross': ['L1', 'R1', 'CIRCLE'],
  'driven-pass': ['R1', 'CROSS'],
  'second-ball': ['LS', 'CIRCLE'],
  'lane-change': ['L1', 'RS_FLICK'],
  'tactics-window': ['DPAD_DOWN', 'DPAD_UP'],
  'sq-1': ['L2'],
  'sq-2': ['R1', 'CROSS'],
  'sq-3': ['Y'],
  'sq-4': ['L2', 'CIRCLE'],
};

type Props = {
  coach: Coach;
  lesson: SideLesson;
  origin: 'home' | 'stage';
  onClose: () => void;
};

export default function SideLessonSheet({ coach, lesson, origin, onClose }: Props) {
  const coachFirst = coach.name.split(' ')[0];
  const { width: winW } = useWindowDimensions();
  const bandW = Math.min(winW, 430);

  // ── clip countdown, same pattern as the stage room player ──
  const clipTotal = (() => {
    const [m, s] = lesson.clip.duration.split(':').map((x) => parseInt(x, 10));
    return (m || 0) * 60 + (s || 0);
  })();
  const [clipPlaying, setClipPlaying] = useState(true);
  const [clipLeft, setClipLeft] = useState(clipTotal);
  useEffect(() => {
    if (!clipPlaying) return;
    const id = setInterval(() => {
      setClipLeft((s) => {
        if (s <= 1) {
          setClipPlaying(false);
          return clipTotal;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [clipPlaying, clipTotal]);

  const [clipW, setClipW] = useState(0);

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.root}>
      <GridBackground />
      <ScreenFlash />
      {/* header — the mirror band carries the side note's name */}
      <ArtBand source={MIRROR_ART} width={bandW} height={132} warmAt={{ x: bandW * 0.26, y: 40, r: bandW * 0.5 }} style={{ marginTop: -50 }}>
        <Text style={styles.eyebrow}>
          {origin === 'home' ? 'UPDATES' : 'COACH SCREEN'} — OPTIONAL TIP
        </Text>
        <Text style={styles.bandTitle}>OPTIONAL TIP</Text>
        <Text style={styles.subtitle}>
          RESEARCHED BY THE BOT · APPROVED FOR {coachFirst.toUpperCase()}'S PLAYERS · YOUR MATCH REVIEW IS STILL THE MAIN THING
        </Text>
      </ArtBand>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scroll}>

        {/* the animated board */}
        <View style={[styles.lessonCard, { marginTop: 14 }]}>
          <View style={styles.tagRow}>
            <View style={styles.tagGreen}>
              <Text style={styles.tagGreenTxt}>OPTIONAL TIP · {lesson.kind.replace(/_/g, ' ')}</Text>
            </View>
            <View style={styles.tagGold}>
              <Text style={styles.tagGoldTxt}>{lesson.mechanicName}</Text>
            </View>
          </View>

          <View
            style={[styles.clipWrap, clipPlaying && styles.clipWrapPlaying]}
            onLayout={(e) => setClipW(e.nativeEvent.layout.width)}
          >
            {clipW > 0 && (
              <LessonAnimation width={clipW - 2} height={128} variant={lesson.clip.variant} playing={clipPlaying} />
            )}
            <Pressable
              onPress={() => {
                sfx('pop');
                setClipPlaying((p) => !p);
              }}
              hitSlop={8}
              style={styles.clipHit}
            >
              <View style={[styles.clipPlay, clipPlaying && styles.clipPlayOn]}>
                {clipPlaying ? <PauseGlyphIcon size={11} color="#05130a" /> : <View style={styles.clipTri} />}
              </View>
            </Pressable>
            <View style={styles.clipDur}>
              <Text style={styles.clipDurTxt}>{mmss(clipLeft)}</Text>
            </View>
          </View>
          <Text style={styles.clipCaption}>{lesson.clip.caption}</Text>
          <Text style={styles.clipSubcaption}>{lesson.clip.subcaption}</Text>

          <Text style={styles.headline}>{lesson.headline}</Text>
          {(() => {
            const topicKey = lesson.mechanicName.toLowerCase().replace(/^the /, '').replace(/ /g, '-');
            const combo = COMBO_MAP[topicKey] || COMBO_MAP[lesson.contentId] || COMBO_MAP[`sq-${lesson.contentId.replace('sq-content-', '')}`] || COMBO_MAP[`sq-${lesson.mechanicName.toLowerCase().replace('the ', '')}`];
            if (!combo) return null;
            return (
              <View style={styles.comboRow}>
                <Text style={styles.comboLabel}>CONTROLLER INPUT: </Text>
                <InputCombo combo={combo} size={18} />
              </View>
            );
          })()}
          <Text style={styles.why}>{lesson.why}</Text>

          {/* 3-step breakdown */}
          <View style={styles.tilesRow}>
            {lesson.tiles.map((tile, i) => {
              const Icon = TileIcon[tile.icon] ?? TargetGlyphIcon;
              return (
                <View key={i} style={styles.tile}>
                  <View style={styles.tileIconWrap}>
                    <Icon size={15} color={colors.primary} />
                  </View>
                  <Text style={styles.tileTitle}>{tile.title}</Text>
                  <Text style={styles.tileDesc}>{tile.desc}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.ruleStrip}>
            <ClockGlyphIcon size={12} color={colors.primary} />
            <Text style={styles.ruleTxt}>THE RULE · {lesson.rule}</Text>
          </View>
        </View>

        {/* the blog — the scout's note, in academy words */}
        {lesson.blogBody ? (
          <View style={styles.blogCard}>
            <Text style={styles.blogTag}>THE SCOUT'S BLOG · READ IT, THEN GO DRILL IT</Text>
            <Text style={styles.blogBody}>{lesson.blogBody}</Text>
          </View>
        ) : null}

        {/* the chinedu way: pen to paper */}
        <View style={[styles.sideNote, { borderColor: 'rgba(57,255,106,0.3)', backgroundColor: 'rgba(57,255,106,0.03)' }]}>
          <Text style={[styles.sideNoteTitle, { color: colors.primary }]}>THE CHINEDU WAY · HOW YOU TRAIN</Text>
          <Text style={styles.sideNoteBody}>
            1. RECORD & WATCH: Record your match and watch your tape back. Don't look away from mistakes.
            {'\n'}2. PEN TO PAPER: There is a special connection a biro has to a book that cannot be typed. Pen down how this mechanic felt on paper first.
            {'\n'}3. 30-MINUTE COOL-DOWN: Let your mind cool for 30 minutes after full time.
            {'\n'}4. LOG TO DATABASE: Open the app and type your written truth into your database.
            {'\n\n'}In a world looking for the easy way out, we tell you that the hard way is the easy way, and the easy way is the hard way. Tech is meant to elevate and not make you dormant.
          </Text>
        </View>

        {/* the honest framing — a side note, never the assignment */}
        <View style={styles.sideNote}>
          <Text style={styles.sideNoteTitle}>WHY THIS IS OPTIONAL</Text>
          <Text style={styles.sideNoteBody}>
            The main thing has to be done by you. The bot can find a trick and the board can draw
            it — but your head is only trained by your own matches and your own lessons, and that
            work waits in the MATCH SCAN. Try this if it fits your thread today. If it doesn't,
            leave it here; it will keep.
          </Text>
        </View>

        <Pressable
          onPress={() => Linking.openURL(lesson.sourceUrl).catch(() => {})}
          hitSlop={6}
        >
          <Text style={styles.source}>SOURCE · {lesson.sourceName.toUpperCase()} · {lesson.patchVersion.toUpperCase()} ›</Text>
        </Pressable>
        <Text style={styles.trace}>LIVE FEED ITEM {lesson.contentId} · FOUND {lesson.discoveredAt}</Text>

        <Pressable
          onPress={() => {
            sfx('tap');
            onClose();
          }}
        >
          <View style={styles.logBtn}>
            <Text style={styles.logBtnTxt}>{origin === 'home' ? 'NOTED — BACK TO THE FEED' : 'NOTED — BACK TO THE MAIN QUEST'}</Text>
          </View>
        </Pressable>
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
  bandTitle: { marginTop: 5, fontFamily: displayFont, fontSize: 30, lineHeight: 31, letterSpacing: 0.8, color: colors.fg, textShadowColor: 'rgba(57,255,106,0.5)', textShadowRadius: 10 },
  subtitle: { marginTop: 7, fontFamily: monoFont, fontSize: 5.8, fontWeight: '700', letterSpacing: 1.6, color: 'rgba(238,242,236,0.85)', lineHeight: 10.5 },

  lessonCard: {
    borderWidth: 1.2, borderColor: 'rgba(57,255,106,0.5)', borderRadius: 16,
    backgroundColor: 'rgba(12,20,14,0.94)', padding: 14,
    shadowColor: colors.primary, shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
  },
  tagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  tagGreen: {
    borderWidth: 1, borderColor: colors.primary, borderRadius: 5, paddingHorizontal: 7,
    paddingVertical: 3.5, backgroundColor: 'rgba(57,255,106,0.07)',
  },
  tagGreenTxt: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.6, color: colors.primary },
  tagGold: { borderWidth: 1, borderColor: 'rgba(242,192,120,0.55)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3.5 },
  tagGoldTxt: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.6, color: colors.accent },

  clipWrap: {
    marginTop: 12, height: 130, borderRadius: 12, borderWidth: 1.1,
    borderColor: 'rgba(57,255,106,0.35)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  clipWrapPlaying: { borderColor: colors.primary },
  clipHit: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  clipPlay: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1.6, borderColor: colors.primary,
    backgroundColor: 'rgba(10,15,10,0.8)', alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
  clipPlayOn: { backgroundColor: colors.primary },
  clipTri: {
    width: 0, height: 0, marginLeft: 3, borderLeftWidth: 13, borderTopWidth: 8.5, borderBottomWidth: 8.5,
    borderLeftColor: colors.primary, borderTopColor: 'transparent', borderBottomColor: 'transparent',
  },
  clipDur: {
    position: 'absolute', right: 8, bottom: 8, borderRadius: 5,
    backgroundColor: 'rgba(8,13,9,0.85)', borderWidth: 1, borderColor: 'rgba(143,184,155,0.3)',
    paddingHorizontal: 5, paddingVertical: 2.5,
  },
  clipDurTxt: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '800', letterSpacing: 1, color: 'rgba(238,242,236,0.85)' },
  clipCaption: { marginTop: 9, fontFamily: monoFont, fontSize: 7.4, fontWeight: '900', letterSpacing: 1.5, color: colors.fg },
  clipSubcaption: { marginTop: 4, fontFamily: monoFont, fontSize: 5.9, lineHeight: 10, letterSpacing: 1.1, color: 'rgba(143,184,155,0.7)' },

  headline: { marginTop: 13, fontSize: 19, lineHeight: 22, fontWeight: '900', letterSpacing: 0.2, color: colors.fg },
  comboRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  comboLabel: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '900', letterSpacing: 1.2, color: colors.accent },
  why: { marginTop: 9, fontFamily: monoFont, fontSize: 6.8, lineHeight: 12.6, letterSpacing: 1.3, color: 'rgba(143,184,155,0.85)' },

  tilesRow: { marginTop: 13, flexDirection: 'row', gap: 7 },
  tile: {
    flex: 1, borderWidth: 1.1, borderColor: 'rgba(57,255,106,0.34)', borderRadius: 12,
    backgroundColor: 'rgba(15,26,19,0.6)', paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center',
  },
  tileIconWrap: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1.1, borderColor: 'rgba(57,255,106,0.45)',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(57,255,106,0.06)',
  },
  tileTitle: { marginTop: 7, fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.6, color: colors.fg },
  tileDesc: { marginTop: 4, fontFamily: monoFont, fontSize: 4.9, lineHeight: 8.5, letterSpacing: 1, textAlign: 'center', color: 'rgba(143,184,155,0.72)' },

  ruleStrip: {
    marginTop: 11, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.1, borderColor: 'rgba(57,255,106,0.5)', borderRadius: 10,
    backgroundColor: 'rgba(57,255,106,0.08)', paddingHorizontal: 11, paddingVertical: 9,
  },
  ruleTxt: { flex: 1, fontFamily: monoFont, fontSize: 6.6, lineHeight: 11, fontWeight: '900', letterSpacing: 1.3, color: colors.primary },

  blogCard: {
    marginTop: 12, borderWidth: 1, borderColor: 'rgba(242,192,120,0.4)', borderRadius: 13,
    backgroundColor: 'rgba(22,18,8,0.5)', padding: 13,
  },
  blogTag: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.8, color: colors.accent },
  blogBody: { marginTop: 8, fontSize: 11, lineHeight: 17, color: '#d5dfd8', fontWeight: '600' },

  sideNote: {
    marginTop: 12, borderWidth: 1, borderColor: 'rgba(57,255,106,0.3)', borderRadius: 13,
    backgroundColor: 'rgba(57,255,106,0.05)', padding: 13,
  },
  sideNoteTitle: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.8, color: colors.primary },
  sideNoteBody: { marginTop: 7, fontSize: 10.5, lineHeight: 16, color: '#c9d8cd', fontWeight: '600' },

  source: { marginTop: 13, fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.4, color: colors.primary, textAlign: 'center' },
  trace: { marginTop: 6, fontFamily: monoFont, fontSize: 5.2, letterSpacing: 1.2, color: 'rgba(143,184,155,0.38)', textAlign: 'center' },

  logBtn: {
    marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13,
    shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  logBtnTxt: { fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.8, color: '#0a0f0a' },

  backBtn: {
    position: 'absolute', top: 58, left: 16, width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.2, borderColor: 'rgba(143,184,155,0.4)', backgroundColor: 'rgba(10,17,12,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
});
