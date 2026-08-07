import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import GridBackground from '../../components/GridBackground';
import ArtBand from '../../components/ArtBand';
import { CheckIcon, ChevronRightIcon, FilmIcon, JournalIcon, PlayIcon, RouteIcon } from '../../components/Icons';
import { Coach } from '../../data/coaches';
import { JourneyStage, journeySeasonFor } from '../../data/journey';
import { objectiveCount, useMatches } from '../../data/matches';
import { useJournal } from '../../data/journal';
import { useLessonThread } from '../../data/lessonThread';
import { useMirrorSession } from '../../data/mirrorSession';
import { useJourneyProgress } from '../../data/progress';
import { useSettings } from '../../data/settings';
import { bodyFont, bodyFontBold, bodyFontHeavy, colors, displayFont, monoFont } from '../../theme';

// The Home tab is deliberately not a feed. It is the answer to one question:
// "What should I do next?" Updates, community and long-range tracking still
// exist, but they are secondary to a player completing an honest review.
const TOUCHLINE = require('../../../assets/art/coach-touchline.jpg');

type Props = {
  coach: Coach;
  onOpenStage: (stage: JourneyStage, origin: { x: number; y: number }) => void;
  onOpenJourney: () => void;
  onOpenUpdates: () => void;
  onOpenHalls: () => void;
  onOpenGuide: () => void;
};

function ObjectiveRow({ stage, index, done, target }: { stage: JourneyStage; index: number; done: number; target: number }) {
  const complete = done >= target;
  return (
    <View style={styles.objectiveRow}>
      <View style={[styles.objectiveMark, complete && styles.objectiveMarkDone]}>
        {complete ? <CheckIcon size={9} color="#07110a" /> : <Text style={styles.objectiveNo}>{index + 1}</Text>}
      </View>
      <Text style={[styles.objectiveLabel, complete && styles.objectiveLabelDone]} numberOfLines={2}>
        {stage.objectives?.[index]?.label}
      </Text>
      <Text style={[styles.objectiveCount, complete && styles.objectiveCountDone]}>{Math.min(done, target)}/{target}</Text>
    </View>
  );
}

export default function HomeTab({ coach, onOpenStage, onOpenJourney, onOpenUpdates, onOpenHalls, onOpenGuide }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.min(windowWidth, 430) - 32;
  const settings = useSettings();
  const progress = useJourneyProgress();
  const vault = useMatches();
  const journal = useJournal();
  const thread = useLessonThread();
  const mirror = useMirrorSession();
  const season = journeySeasonFor(coach.id);
  const isComplete = progress.completedCount >= season.totalStages;
  const currentN = Math.min(Math.max(1, progress.currentStage), season.totalStages);
  const currentStage = season.stages.find((stage) => stage.n === currentN) ?? season.stages[0];
  const activeSession = mirror.phase !== 'idle' && mirror.phase !== 'done';
  const launchStage = season.stages.find((stage) => stage.n === mirror.stageN) ?? currentStage;
  const settledThreadCount = thread.heldCount + thread.brokeCount;

  const objectiveProgress = useMemo(
    () =>
      (currentStage.objectives ?? []).map((objective) => ({
        done: objective.check
          ? objectiveCount(objective.check, vault.matches, journal.total, settledThreadCount)
          : objective.done,
        target: objective.target,
      })),
    [currentStage, journal.total, settledThreadCount, vault.matches],
  );

  const openPrimary = () => {
    if (isComplete) {
      onOpenJourney();
      return;
    }
    onOpenStage(launchStage, { x: Math.min(windowWidth, 430) * 0.56, y: 272 });
  };

  return (
    <View style={styles.flex}>
      <GridBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>PROSEASONACADEMY</Text>
          <Text style={styles.brandMeta}>CONSOLE REVIEW PRACTICE</Text>
        </View>

        <ArtBand
          source={TOUCHLINE}
          width={contentWidth}
          height={156}
          warmAt={{ x: contentWidth * 0.7, y: 36, r: contentWidth * 0.55 }}
          style={styles.heroBand}
        >
          <Text style={styles.heroEyebrow}>TODAY</Text>
          <Text style={styles.heroTitle}>ONE MATCH.{"\n"}ONE HONEST REVIEW.</Text>
          <Text style={styles.heroSub}>ONE LESSON TO CARRY FORWARD.</Text>
        </ArtBand>

        <Animated.View entering={FadeInUp.duration(300)} style={styles.definitionStrip}>
          <Text style={styles.definitionTitle}>WHAT THIS APP IS FOR</Text>
          <Text style={styles.definitionCopy}>
            Play a real FC console match. Review it in your own words. Carry one useful lesson into the next one.
          </Text>
          <Pressable onPress={onOpenGuide} hitSlop={8} style={styles.guideLink}>
            <Text style={styles.guideLinkTxt}>NEW HERE? READ THE 60-SECOND GUIDE</Text>
            <ChevronRightIcon size={12} color={colors.primary} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(35).duration(320)} style={styles.startHereCard}>
          <Text style={styles.startHereTag}>STOP HERE FIRST</Text>
          <Text style={styles.startHereTitle}>YOU DO NOT NEED TO LEARN THE WHOLE APP TODAY.</Text>
          <Text style={styles.startHereCopy}>
            {activeSession
              ? 'You already started the important thing. Resume your saved review; the app will take you to the exact next question.'
              : 'Your only decision is whether you have a real match to review. Everything else can wait.'}
          </Text>
          {!activeSession && (
            <View style={styles.choiceBox}>
              <Text style={styles.choiceTitle}>IF YOU HAVE OR JUST FINISHED A MATCH</Text>
              <Text style={styles.choiceCopy}>Tap the green button. The next screen lets you choose the right path.</Text>
              <Text style={styles.choiceTitle}>IF YOU DO NOT HAVE A MATCH TODAY</Text>
              <Text style={styles.choiceCopy}>You do not need to fill anything in. Close the app and return after your next real match.</Text>
            </View>
          )}
          <Pressable onPress={openPrimary} style={styles.startAction}>
            {isComplete ? <RouteIcon size={16} color="#07110a" /> : <PlayIcon size={16} color="#07110a" />}
            <Text style={styles.startActionTxt}>
              {isComplete ? 'SHOW MY PROGRESS' : activeSession ? 'KEEP GOING' : 'START MY MATCH REVIEW'}
            </Text>
          </Pressable>
          <Text style={styles.startActionHint}>
            {isComplete
              ? 'Your season is complete. This opens the evidence you earned.'
              : activeSession
                ? 'Your saved session is ready at the exact next step.'
                : 'Next, choose whether you are about to play or you already finished.'}
          </Text>
          <Pressable onPress={onOpenGuide} style={styles.explainBtn}>
            <Text style={styles.explainBtnTxt}>EXPLAIN MY FIRST SESSION STEP BY STEP</Text>
            <ChevronRightIcon size={12} color={colors.accent} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(50).duration(320)} style={styles.nextCard}>
          <View style={styles.nextTop}>
            <View>
              <Text style={styles.cardKicker}>{activeSession ? 'YOUR SESSION IS WAITING' : isComplete ? 'SEASON ONE COMPLETE' : 'YOUR NEXT MOVE'}</Text>
              <Text style={styles.stageTitle}>
                {isComplete ? 'READ YOUR RECEIPTS' : `CHAPTER ${currentStage.n} · ${currentStage.name.toUpperCase()}`}
              </Text>
            </View>
            {!isComplete && <Image source={coach.portrait} style={[styles.coachFace, { borderColor: coach.cardAccent }]} />}
          </View>
          <Text style={styles.stageTagline}>
            {isComplete
              ? 'You have done the work. Look at the evidence, then choose the standard you will keep next.'
              : currentStage.tagline}
          </Text>

          {!isComplete && objectiveProgress.length > 0 && (
            <View style={styles.objectives}>
              <Text style={styles.objectivesLabel}>WHAT THIS CHAPTER IS TRACKING</Text>
              {objectiveProgress.map((item, index) => (
                <ObjectiveRow
                  key={`${currentStage.n}-${index}`}
                  stage={currentStage}
                  index={index}
                  done={item.done}
                  target={item.target}
                />
              ))}
            </View>
          )}

          {!isComplete && (
            <View style={styles.mirrorExplainer}>
              <Text style={styles.mirrorExplainerTitle}>WHAT IS A MATCH REVIEW?</Text>
              <Text style={styles.mirrorExplainerCopy}>
                A short review: choose one focus, notice the pattern, then write one lesson. It does not tell you what to think.
              </Text>
            </View>
          )}

          {!isComplete && (
            <Pressable onPress={onOpenJourney} style={styles.stageDetailsLink}>
              <Text style={styles.stageDetailsLinkTxt}>SEE WHAT THIS CHAPTER IS TRACKING</Text>
              <ChevronRightIcon size={13} color={colors.primary} />
            </Pressable>
          )}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(90).duration(320)}>
          <Text style={styles.sectionLabel}>THE PRACTICE, NOT THE NOISE</Text>
          <View style={styles.loopRow}>
            <View style={styles.loopTile}>
              <Text style={styles.loopNo}>01</Text>
              <Text style={styles.loopTitle}>PLAY</Text>
              <Text style={styles.loopCopy}>Play one real console match.</Text>
            </View>
            <View style={styles.loopTile}>
              <Text style={styles.loopNo}>02</Text>
              <Text style={styles.loopTitle}>REVIEW</Text>
              <Text style={styles.loopCopy}>Name the moments in your own words.</Text>
            </View>
            <View style={styles.loopTile}>
              <Text style={styles.loopNo}>03</Text>
              <Text style={styles.loopTitle}>CARRY</Text>
              <Text style={styles.loopCopy}>Take one lesson into the next match.</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(130).duration(320)} style={styles.threadCard}>
          <View style={styles.threadHead}>
            <View>
              <Text style={styles.cardKicker}>YOUR LESSON</Text>
              <Text style={styles.threadTitle}>{thread.current ? 'THE LESSON YOU ARE CARRYING' : 'YOUR FIRST LESSON STARTS HERE'}</Text>
            </View>
            <JournalIcon size={19} color={colors.accent} />
          </View>
          <Text style={styles.threadCopy}>
            {thread.current
              ? `“${thread.current.lesson}”`
              : 'Finish one Match Review and write the one line you want to remember next time.'}
          </Text>
          {thread.current && (
            <Text style={styles.threadMeta}>
              NEXT SESSION, YOU WILL SAY WHETHER IT HELD OR BROKE.
            </Text>
          )}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(170).duration(320)} style={styles.evidenceCard}>
          <View style={styles.evidenceHead}>
            <View>
              <Text style={styles.cardKicker}>YOUR RECEIPTS</Text>
              <Text style={styles.evidenceTitle}>EVIDENCE, KEPT SIMPLE</Text>
            </View>
            <FilmIcon size={19} color={colors.primary} />
          </View>
          <View style={styles.evidenceStats}>
            <View style={styles.evidenceStat}>
              <Text style={styles.evidenceValue}>{vault.played}</Text>
              <Text style={styles.evidenceLabel}>MATCHES</Text>
            </View>
            <View style={styles.evidenceStat}>
              <Text style={styles.evidenceValue}>{mirror.sessionsCompleted}</Text>
              <Text style={styles.evidenceLabel}>REVIEWS</Text>
            </View>
            <View style={styles.evidenceStat}>
              <Text style={styles.evidenceValue}>{thread.entries.length}</Text>
              <Text style={styles.evidenceLabel}>LESSONS</Text>
            </View>
            <View style={styles.evidenceStat}>
              <Text style={styles.evidenceValue}>{journal.total}</Text>
              <Text style={styles.evidenceLabel}>LOSS NOTES</Text>
            </View>
          </View>
          <Pressable onPress={onOpenJourney} style={styles.textLink}>
            <Text style={styles.textLinkTxt}>SEE MY PROGRESS & EVIDENCE</Text>
            <ChevronRightIcon size={13} color={colors.primary} />
          </Pressable>
        </Animated.View>

        <View style={styles.secondaryWrap}>
          <Text style={styles.sectionLabel}>WHEN YOU NEED MORE</Text>
          <Pressable onPress={onOpenUpdates} style={styles.secondaryRow}>
            <View>
              <Text style={styles.secondaryTitle}>ACADEMY UPDATES</Text>
              <Text style={styles.secondarySub}>Founder notes, FC news and optional mechanics.</Text>
            </View>
            <ChevronRightIcon size={14} color={colors.muted} />
          </Pressable>
          <Pressable onPress={onOpenHalls} style={styles.secondaryRow}>
            <View>
              <Text style={styles.secondaryTitle}>COMMUNITY</Text>
              <Text style={styles.secondarySub}>Talk to real players when support helps the work.</Text>
            </View>
            <ChevronRightIcon size={14} color={colors.muted} />
          </Pressable>
        </View>

        <Text style={styles.footer}>WELCOME, {settings.displayName.toUpperCase()} · THE NEXT MATCH IS THE ONLY ONE YOU CAN WORK ON.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 5, paddingBottom: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  brand: { fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 2.4, color: colors.fg },
  brandMeta: { fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.35, color: colors.muted },
  heroBand: { borderRadius: 16, overflow: 'hidden' },
  heroEyebrow: { fontFamily: bodyFontHeavy, fontSize: 9.5, letterSpacing: 2.2, color: colors.primary },
  heroTitle: { marginTop: 6, fontFamily: displayFont, fontSize: 29, lineHeight: 29, letterSpacing: 0.5, color: colors.fg },
  heroSub: { marginTop: 7, fontFamily: monoFont, fontSize: 6.7, letterSpacing: 1.65, color: 'rgba(238,242,236,0.85)' },
  definitionStrip: { marginTop: 12, borderLeftWidth: 2, borderLeftColor: colors.primary, paddingLeft: 11, paddingRight: 8 },
  definitionTitle: { fontFamily: bodyFontHeavy, fontSize: 9, letterSpacing: 1.8, color: colors.primary },
  definitionCopy: { marginTop: 4, fontFamily: bodyFont, fontSize: 12.3, lineHeight: 18, color: '#c3d4c7' },
  guideLink: { marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 2 },
  guideLinkTxt: { fontFamily: bodyFontHeavy, fontSize: 9.2, letterSpacing: 1.2, color: colors.primary },
  startHereCard: { marginTop: 14, borderWidth: 1.2, borderColor: 'rgba(242,192,120,0.42)', borderRadius: 15, padding: 14, backgroundColor: 'rgba(37,29,12,0.58)' },
  startHereTag: { fontFamily: monoFont, fontSize: 6.7, fontWeight: '900', letterSpacing: 1.8, color: colors.accent },
  startHereTitle: { marginTop: 7, fontFamily: bodyFontHeavy, fontSize: 14, lineHeight: 19, letterSpacing: 0.3, color: colors.fg },
  startHereCopy: { marginTop: 7, fontFamily: bodyFont, fontSize: 12, lineHeight: 17.5, color: '#e2d7c2' },
  choiceBox: { marginTop: 11, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(242,192,120,0.18)' },
  choiceTitle: { marginTop: 6, fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 1.25, color: colors.accent },
  choiceCopy: { marginTop: 3, fontFamily: bodyFont, fontSize: 10.8, lineHeight: 15, color: '#d8cfbd' },
  startAction: { marginTop: 14, minHeight: 53, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 12 },
  startActionTxt: { fontFamily: bodyFontHeavy, fontSize: 12, letterSpacing: 1.6, color: '#07110a' },
  startActionHint: { marginTop: 7, textAlign: 'center', fontFamily: bodyFont, fontSize: 10.5, lineHeight: 15, color: '#d8cfbd' },
  explainBtn: { marginTop: 13, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderColor: 'rgba(242,192,120,0.46)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
  explainBtnTxt: { fontFamily: bodyFontHeavy, fontSize: 8.5, letterSpacing: 1.05, color: colors.accent },
  nextCard: { marginTop: 15, borderWidth: 1.2, borderColor: 'rgba(57,255,106,0.48)', borderRadius: 16, padding: 14, backgroundColor: 'rgba(13,25,16,0.92)', shadowColor: colors.primary, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  nextTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardKicker: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '900', letterSpacing: 1.8, color: colors.primary },
  stageTitle: { marginTop: 6, fontFamily: displayFont, fontSize: 22, lineHeight: 23, letterSpacing: 0.6, color: colors.fg },
  coachFace: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5 },
  stageTagline: { marginTop: 9, fontFamily: bodyFont, fontSize: 12.4, lineHeight: 18, color: '#bfcec3' },
  objectives: { marginTop: 13, borderTopWidth: 1, borderTopColor: 'rgba(57,255,106,0.14)', paddingTop: 10, gap: 7 },
  objectivesLabel: { fontFamily: monoFont, fontSize: 6.3, fontWeight: '800', letterSpacing: 1.5, color: colors.muted, marginBottom: 1 },
  objectiveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  objectiveMark: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(143,184,155,0.4)', alignItems: 'center', justifyContent: 'center' },
  objectiveMarkDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  objectiveNo: { fontFamily: monoFont, fontSize: 7.2, fontWeight: '900', color: colors.muted },
  objectiveLabel: { flex: 1, fontFamily: bodyFont, fontSize: 11.2, lineHeight: 15, color: '#c0d0c4' },
  objectiveLabelDone: { color: 'rgba(143,184,155,0.58)' },
  objectiveCount: { fontFamily: monoFont, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.6, color: colors.accent },
  objectiveCountDone: { color: colors.primary },
  mirrorExplainer: { marginTop: 12, borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: 9, paddingRight: 2 },
  mirrorExplainerTitle: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.4, color: colors.accent },
  mirrorExplainerCopy: { marginTop: 4, fontFamily: bodyFont, fontSize: 10.8, lineHeight: 15.5, color: '#d5d9c9' },
  stageDetailsLink: { marginTop: 13, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 3 },
  stageDetailsLinkTxt: { fontFamily: bodyFontHeavy, fontSize: 9.2, letterSpacing: 1.15, color: colors.primary },
  sectionLabel: { marginTop: 18, marginLeft: 2, fontFamily: bodyFontHeavy, fontSize: 9, letterSpacing: 1.9, color: colors.muted },
  loopRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  loopTile: { flex: 1, minHeight: 112, borderWidth: 1, borderColor: 'rgba(57,255,106,0.18)', borderRadius: 12, backgroundColor: 'rgba(13,24,16,0.76)', padding: 10 },
  loopNo: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.2, color: colors.primary },
  loopTitle: { marginTop: 8, fontFamily: bodyFontHeavy, fontSize: 11.5, letterSpacing: 1, color: colors.fg },
  loopCopy: { marginTop: 5, fontFamily: bodyFont, fontSize: 10.3, lineHeight: 14.5, color: colors.muted },
  threadCard: { marginTop: 16, borderWidth: 1, borderColor: 'rgba(242,192,120,0.35)', borderRadius: 14, backgroundColor: 'rgba(34,27,12,0.62)', padding: 13 },
  threadHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  threadTitle: { marginTop: 5, fontFamily: bodyFontBold, fontSize: 12.6, letterSpacing: 0.2, color: colors.fg },
  threadCopy: { marginTop: 9, fontFamily: bodyFont, fontSize: 13, lineHeight: 19, color: '#e3d8c5' },
  threadMeta: { marginTop: 8, fontFamily: monoFont, fontSize: 6.3, lineHeight: 10, letterSpacing: 1.1, color: colors.accent },
  evidenceCard: { marginTop: 14, borderWidth: 1, borderColor: 'rgba(57,255,106,0.24)', borderRadius: 14, backgroundColor: 'rgba(13,24,16,0.86)', padding: 13 },
  evidenceHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  evidenceTitle: { marginTop: 5, fontFamily: bodyFontBold, fontSize: 13, letterSpacing: 0.3, color: colors.fg },
  evidenceStats: { flexDirection: 'row', marginTop: 13, borderWidth: 1, borderColor: 'rgba(57,255,106,0.13)', borderRadius: 10, overflow: 'hidden' },
  evidenceStat: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRightWidth: 1, borderRightColor: 'rgba(57,255,106,0.11)' },
  evidenceValue: { fontFamily: displayFont, fontSize: 18, letterSpacing: 0.3, color: colors.primary },
  evidenceLabel: { marginTop: 3, fontFamily: monoFont, fontSize: 5.7, letterSpacing: 1, color: colors.muted },
  textLink: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  textLinkTxt: { fontFamily: bodyFontHeavy, fontSize: 9.5, letterSpacing: 1.2, color: colors.primary },
  secondaryWrap: { marginTop: 2 },
  secondaryRow: { marginTop: 8, minHeight: 59, borderWidth: 1, borderColor: 'rgba(143,184,155,0.17)', borderRadius: 12, backgroundColor: 'rgba(10,16,11,0.5)', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  secondaryTitle: { fontFamily: bodyFontBold, fontSize: 11.5, letterSpacing: 0.8, color: colors.fg },
  secondarySub: { marginTop: 3, fontFamily: bodyFont, fontSize: 10.2, color: colors.muted },
  footer: { marginTop: 18, paddingHorizontal: 10, textAlign: 'center', fontFamily: monoFont, fontSize: 6.1, lineHeight: 10, letterSpacing: 1.2, color: 'rgba(143,184,155,0.5)' },
});
