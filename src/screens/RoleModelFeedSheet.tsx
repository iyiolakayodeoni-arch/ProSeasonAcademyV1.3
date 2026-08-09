import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import ArtBand from '../components/ArtBand';
import ScreenFlash from '../components/ScreenFlash';
import RoleModelCard from '../components/RoleModelCard';

// the match moment — the stream is an ongoing night, not a lesson plan
const VAULT_ART = require('../../assets/art/vault-match.jpg');
import { ChevronLeftIcon, PlayIcon, CheckRingIcon, RouteIcon } from '../components/Icons';
import { Coach } from '../data/coaches';
import {
  RoleFeedEntry,
  roleModelFeed,
  roleLessonFor,
  roleTimeLabel,
  ROLE_TYPE_LABEL,
} from '../data/roleModelFeed';
import { SideLesson } from '../data/sideLesson';
import SideLessonSheet from './SideLessonSheet';
import RoleModelSheet from './RoleModelSheet';
import { sfx } from '../audio/sound';
import { colors, monoFont, displayFont } from '../theme';

// ─────────────────────────────────────────────────────────────
// ROLE MODEL FEED — Chinedu's ongoing, serialized story stream.
//
// Reachable from the Role Model card on the Journey screen. This
// reads like following a real pro's journey — his matches, his
// life beats, the tricks he is known for, and teasers for side
// quests you have not unlocked yet — EXCEPT it is the academy's
// own fictional character, not real athlete coverage. A persistent
// "ROLE MODEL STORY" label + a small fictional-character note keep
// it clearly distinct from the sourced, real FC 26 intel elsewhere
// in the app. The mechanics he shows are the same verified side
// quests the Journey teaches — the personal story around them is
// original and invented.
// ─────────────────────────────────────────────────────────────

type Props = {
  coach: Coach;
  onClose: () => void;
  /** open the existing finish/sheet (his full backstory, stage 7) */
  onOpenFinish?: () => void;
};

const TYPE_COLOR: Record<RoleFeedEntry['type'], string> = {
  match: colors.warm,
  life: colors.accent,
  trick: colors.primary,
  sneak: '#6fd0c9',
};

const TYPE_BORDER: Record<RoleFeedEntry['type'], string> = {
  match: 'rgba(255,207,122,0.5)',
  life: 'rgba(242,192,120,0.45)',
  trick: 'rgba(57,255,106,0.45)',
  sneak: 'rgba(111,208,201,0.4)',
};

function LiveDot() {
  const o = React.useRef(1).current;
  return <Animated.View style={styles.liveDot} />;
}

export default function RoleModelFeedSheet({ coach, onClose, onOpenFinish }: Props) {
  const feed = useMemo(() => roleModelFeed(coach), [coach]);
  const [lesson, setLesson] = useState<SideLesson | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const coachFirst = coach.name.split(' ')[0];
  const { width: winW } = useWindowDimensions();
  const bandW = Math.min(winW, 430);

  return (
    <Animated.View entering={FadeIn.duration(240)} style={styles.root}>
      <GridBackground />
      <ScreenFlash />
      {/* the match band — persistent ROLE MODEL STORY label, on the night itself */}
      <ArtBand source={[VAULT_ART, require('../../assets/art/scan-boots.jpg'), require('../../assets/art/home-pitch.png')]} width={bandW} height={140} warmAt={{ x: bandW * 0.22, y: 42, r: bandW * 0.55 }} style={{ marginTop: -50 }}>
        <Text style={styles.eyebrow}>ROLE MODEL STORY · SERIALIZED</Text>
        <Text style={styles.bandTitle}>CHINEDU'S STREAM</Text>
        <Text style={styles.subtitle}>{coach.name.toUpperCase()} · {coach.title} — AN ONGOING STORY, NOT A LESSON</Text>
      </ArtBand>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scroll}>

        {/* the card + the honest note that this is a character, not a real athlete */}
        <Animated.View entering={FadeInUp.delay(100).duration(380)} style={styles.cardWrap}>
          <RoleModelCard coach={coach} />
          <View style={styles.fictPill}>
            <Text style={styles.fictPillTxt}>
              FICTIONAL CHARACTER · IN-APP NARRATIVE — THE MECHANICS ARE REAL, THE STORY IS OUR OWN
            </Text>
          </View>
        </Animated.View>

        {/* live status line */}
        <View style={styles.liveRow}>
          <LiveDot />
          <Text style={styles.liveTxt}>FOLLOWING {coachFirst.toUpperCase()} · RUNNING ALONGSIDE YOUR SEASON</Text>
        </View>

        {/* the feed — newest first */}
        <View style={styles.feedList}>
          {feed.map((e, i) => (
            <RoleFeedEntryCard
              key={e.id}
              entry={e}
              delay={i * 40}
              onOpenTrick={() => {
                const l = roleLessonFor(e);
                if (l) {
                  sfx('whoosh');
                  setLesson(l);
                }
              }}
            />
          ))}
        </View>

        {/* his full story — the existing finish sheet (stage 7), open to everyone */}
        <Pressable onPress={() => { sfx('tap'); onOpenFinish?.(); setFinishOpen(true); }} hitSlop={6}>
          <View style={styles.finishCard}>
            <View style={styles.finishHeader}>
              <RouteIcon size={14} color={colors.accent} />
              <Text style={styles.finishTag}>THE FINISH · HIS FULL STORY</Text>
            </View>
            <Text style={styles.finishBody}>
              The whole arc — where the card comes from and why it ends your map. Read it whenever you
              want; it is open to you.
            </Text>
            <Text style={styles.finishCta}>READ HIS FULL STORY ›</Text>
          </View>
        </Pressable>

        {/* closing disclaimer — always keeps the fiction clear */}
        <Text style={styles.disclaimer}>
          THIS IS PROSEASONACADEMY'S OWN CHARACTER STREAM — ORIGINAL NARRATIVE, NEVER A REPORT ON A REAL
          PLAYER. THE MECHANICS HE SHOWS ARE OPTIONAL FC 26 TIPS YOU CAN TRY WHEN THEY HELP.
        </Text>
        <View style={{ height: 20 }} />
      </ScrollView>

      <Pressable onPress={onClose} hitSlop={10} style={styles.backBtn}>
        <ChevronLeftIcon size={15} color={colors.fg} />
      </Pressable>

      {/* a trick entry opens the REAL side-quest debrief, in-app */}
      {lesson && (
        <View style={StyleSheet.absoluteFill}>
          <SideLessonSheet
            coach={coach}
            lesson={lesson}
            origin="stage"
            onClose={() => { sfx('tap'); setLesson(null); }}
          />
        </View>
      )}

      {/* his full story — open to everyone, no lock */}
      {finishOpen && (
        <View style={StyleSheet.absoluteFill}>
          <RoleModelSheet
            coach={coach}
            onClose={() => { sfx('tap'); setFinishOpen(false); }}
            onWalkCurrent={() => { sfx('tap'); setFinishOpen(false); }}
          />
        </View>
      )}
    </Animated.View>
  );
}

function RoleFeedEntryCard({
  entry,
  delay,
  onOpenTrick,
}: {
  entry: RoleFeedEntry;
  delay: number;
  onOpenTrick: () => void;
}) {
  const c = TYPE_COLOR[entry.type];
  const b = TYPE_BORDER[entry.type];
  const type = ROLE_TYPE_LABEL[entry.type];
  const isTrick = entry.type === 'trick';
  const isSneak = entry.type === 'sneak';
  const isMatch = entry.type === 'match';

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(340)} style={[styles.entry, { borderColor: b }]}>
      {/* top row — type badge + time */}
      <View style={styles.entryTop}>
        <View style={[styles.typeBadge, { borderColor: c }]}>
          <Text style={[styles.typeBadgeTxt, { color: c }]}>{type}</Text>
        </View>
        <Text style={styles.entryTime}>{roleTimeLabel(entry.daysAgo)}</Text>
      </View>

      <Text style={[styles.entryTag, { color: c }]}>{entry.tag}</Text>
      <Text style={styles.entryHeadline}>{entry.headline}</Text>

      {entry.statLine && (
        <View style={[styles.statLine, { borderColor: c }]}>
          <Text style={[styles.statLineTxt, { color: c }]}>{entry.statLine}</Text>
        </View>
      )}

      <Text style={styles.entryBody}>{entry.body}</Text>

      {entry.quote && (
        <Text style={styles.entryQuote}>“{entry.quote}”</Text>
      )}

      {/* trick → the real side-quest debrief */}
      {isTrick && (
        <Pressable onPress={onOpenTrick} hitSlop={6}>
          <View style={styles.debriefBtn}>
            <PlayIcon size={13} color="#05130a" />
            <Text style={styles.debriefTxt}>READ THE DEBRIEF — THE REAL MECHANIC ›</Text>
          </View>
        </Pressable>
      )}

      {/* sneak → an open peek, part of his story */}
      {isSneak && (
        <View style={styles.sneakRow}>
          <Text style={styles.sneakTxt}>PART OF HIS STORY — READ FREELY, WHENEVER YOU LIKE</Text>
        </View>
      )}

      {isMatch && (
        <View style={styles.resultRow}>
          <CheckRingIcon size={11} color={colors.warm} />
          <Text style={styles.resultTxt}>LOGGED IN HIS TAPE · THE SAME RITUAL YOU TRAIN</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, paddingTop: 50 },
  scroll: { paddingHorizontal: 16, paddingBottom: 26 },

  eyebrow: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '800', letterSpacing: 2.4, color: 'rgba(238,242,236,0.85)' },
  bandTitle: { marginTop: 5, fontFamily: displayFont, fontSize: 30, lineHeight: 31, letterSpacing: 0.8, color: colors.fg, textShadowColor: 'rgba(242,192,120,0.45)', textShadowRadius: 10 },
  subtitle: { marginTop: 7, fontFamily: monoFont, fontSize: 5.8, fontWeight: '700', letterSpacing: 1.4, color: 'rgba(238,242,236,0.85)', lineHeight: 10.5 },

  cardWrap: { marginTop: 18, alignItems: 'center' },
  fictPill: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.45)',
    borderRadius: 9,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(242,192,120,0.05)',
  },
  fictPillTxt: { fontFamily: monoFont, fontSize: 5.4, fontWeight: '800', letterSpacing: 1.2, color: 'rgba(242,192,120,0.75)', textAlign: 'center' },

  liveRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  liveTxt: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '800', letterSpacing: 1.6, color: colors.primary },

  feedList: { marginTop: 12 },

  entry: {
    marginTop: 10,
    borderWidth: 1.2,
    borderRadius: 15,
    backgroundColor: 'rgba(12,20,14,0.92)',
    padding: 13,
  },
  entryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  typeBadgeTxt: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 1.6 },
  entryTime: { fontFamily: monoFont, fontSize: 6.4, letterSpacing: 1.4, color: 'rgba(143,184,155,0.55)' },
  entryTag: { marginTop: 9, fontFamily: monoFont, fontSize: 5.8, fontWeight: '800', letterSpacing: 1.6 },
  entryHeadline: { marginTop: 4, fontSize: 15.5, fontWeight: '900', lineHeight: 20, color: colors.fg },
  statLine: {
    marginTop: 9,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: 'rgba(10,17,12,0.6)',
  },
  statLineTxt: { fontFamily: monoFont, fontSize: 7.4, fontWeight: '900', letterSpacing: 1.6 },
  entryBody: { marginTop: 9, fontSize: 10.8, lineHeight: 16.5, fontWeight: '600', color: '#ccd9cf' },
  entryQuote: {
    marginTop: 9,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(242,192,120,0.5)',
    paddingLeft: 9,
    fontSize: 10,
    lineHeight: 15,
    fontStyle: 'italic',
    color: 'rgba(242,192,120,0.9)',
  },

  debriefBtn: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  debriefTxt: { fontFamily: monoFont, fontSize: 7.4, fontWeight: '900', letterSpacing: 1.4, color: '#0a0f0a' },

  sneakRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  sneakTxt: { flex: 1, fontFamily: monoFont, fontSize: 6.2, fontWeight: '800', letterSpacing: 1.3, color: '#6fd0c9' },

  resultRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  resultTxt: { flex: 1, fontFamily: monoFont, fontSize: 6.2, fontWeight: '800', letterSpacing: 1.3, color: 'rgba(255,207,122,0.8)' },

  finishCard: {
    marginTop: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(242,192,120,0.5)',
    borderRadius: 15,
    backgroundColor: 'rgba(242,192,120,0.05)',
    padding: 14,
    shadowColor: colors.accent,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  finishHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  finishTag: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '900', letterSpacing: 1.6, color: colors.accent },
  finishBody: { marginTop: 8, fontSize: 10.5, lineHeight: 16, fontWeight: '600', color: '#c9d6cc' },
  finishCta: { marginTop: 9, fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.5, color: colors.accent },

  disclaimer: {
    marginTop: 14,
    fontFamily: monoFont,
    fontSize: 5.6,
    lineHeight: 9.5,
    letterSpacing: 1,
    textAlign: 'center',
    color: '#42584a',
    paddingHorizontal: 8,
  },

  backBtn: {
    position: 'absolute', top: 58, left: 16, width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.2, borderColor: 'rgba(143,184,155,0.4)', backgroundColor: 'rgba(10,17,12,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
});
