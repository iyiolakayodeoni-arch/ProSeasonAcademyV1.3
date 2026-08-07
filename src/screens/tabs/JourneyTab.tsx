import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import GridBackground from '../../components/GridBackground';
import ArtBand from '../../components/ArtBand';
import { CheckIcon, ChevronRightIcon, JournalIcon, LockIcon, PlayIcon, RouteIcon } from '../../components/Icons';
import { Coach } from '../../data/coaches';
import { JourneyStage, journeySeasonFor } from '../../data/journey';
import { objectiveCount, useMatches } from '../../data/matches';
import { useJournal } from '../../data/journal';
import { useLessonThread } from '../../data/lessonThread';
import { useMirrorSession } from '../../data/mirrorSession';
import { useJourneyProgress } from '../../data/progress';
import { standardChapterFor } from '../../data/standard';
import { bodyFont, bodyFontBold, bodyFontHeavy, colors, displayFont, monoFont } from '../../theme';
import EvidenceTrackerScreen from '../EvidenceTrackerScreen';
import LossJournal from '../LossJournal';
import MatchVault from '../MatchVault';

// Progress is intentionally a short path, not a second product. The detailed
// stats tracker survives behind the evidence link for players who need it.
const TUNNEL = require('../../../assets/art/journey-tunnel.jpg');

type Sheet = 'vault' | 'journal' | 'tracker' | null;

type Props = {
  coach: Coach;
  onOpenStage: (stage: JourneyStage, origin: { x: number; y: number }) => void;
};

function StageStatus({ stage, currentN, cleared }: { stage: JourneyStage; currentN: number; cleared: boolean }) {
  if (cleared) {
    return <View style={[styles.stageStatus, styles.stageStatusDone]}><CheckIcon size={9} color="#07110a" /></View>;
  }
  if (stage.n === currentN) return <View style={[styles.stageStatus, styles.stageStatusCurrent]}><Text style={styles.stageStatusCurrentTxt}>NOW</Text></View>;
  return <View style={[styles.stageStatus, styles.stageStatusLocked]}><LockIcon size={10} color="rgba(143,184,155,0.52)" /></View>;
}

export default function JourneyTab({ coach, onOpenStage }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const season = journeySeasonFor(coach.id);
  const progress = useJourneyProgress();
  const vault = useMatches();
  const journal = useJournal();
  const thread = useLessonThread();
  const mirror = useMirrorSession();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [showBenchmark, setShowBenchmark] = useState(false);
  const total = season.totalStages;
  const complete = progress.completedCount >= total;
  const currentN = Math.min(Math.max(1, progress.currentStage), total);
  const current = season.stages.find((stage) => stage.n === currentN) ?? season.stages[0];
  const standard = standardChapterFor(currentN);
  const settledThreadCount = thread.heldCount + thread.brokeCount;
  const activeSession = mirror.phase !== 'idle' && mirror.phase !== 'done';
  const sessionStage = season.stages.find((stage) => stage.n === mirror.stageN) ?? current;

  const currentObjectives = useMemo(
    () =>
      (current.objectives ?? []).map((objective) => ({
        label: objective.label,
        target: objective.target,
        done: objective.check
          ? objectiveCount(objective.check, vault.matches, journal.total, settledThreadCount)
          : objective.done,
      })),
    [current, journal.total, settledThreadCount, vault.matches],
  );

  const openStage = (stage: JourneyStage) => {
    if (!progress.completed[stage.n] && stage.n !== currentN) return;
    onOpenStage(stage, { x: Math.min(windowWidth, 430) * 0.5, y: 276 });
  };

  const openCurrent = () => onOpenStage(activeSession ? sessionStage : current, { x: Math.min(windowWidth, 430) * 0.5, y: 250 });

  return (
    <View style={styles.flex}>
      <GridBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>PROSEASONACADEMY</Text>
          <Text style={styles.brandMeta}>{complete ? 'SEASON ONE · COMPLETE' : `STAGE ${currentN} OF ${total}`}</Text>
        </View>

        <ArtBand
          source={TUNNEL}
          width={Math.min(windowWidth, 430) - 32}
          height={144}
          warmAt={{ x: (Math.min(windowWidth, 430) - 32) * 0.55, y: 38, r: 210 }}
          style={styles.heroBand}
        >
          <Text style={styles.heroEyebrow}>YOUR PROGRESS</Text>
          <Text style={styles.heroTitle}>{complete ? 'THE RECEIPTS ARE IN.' : 'KEEP THE NEXT STEP CLEAR.'}</Text>
          <Text style={styles.heroSub}>SIX CHAPTERS. ONE PRACTICE: PLAY · REVIEW · CARRY.</Text>
        </ArtBand>

        <Animated.View entering={FadeInUp.duration(260)} style={styles.progressGuide}>
          <Text style={styles.progressGuideTitle}>WHAT THIS PAGE IS FOR</Text>
          <Text style={styles.progressGuideCopy}>This is your evidence page, not another task list. Use Today to start or resume a match review. Come here afterwards to see what that work has earned.</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(300)} style={styles.currentCard}>
          <Text style={styles.kicker}>{activeSession ? 'YOUR MIRROR SESSION IS OPEN' : complete ? 'YOUR LAST CHAPTER' : 'CURRENT CHAPTER'}</Text>
          <Text style={styles.currentTitle}>{complete ? 'PROVE IT' : current.name.toUpperCase()}</Text>
          <Text style={styles.currentCopy}>
            {complete
              ? 'Read the matches, moments and lessons that made your season. The next standard comes from this evidence, not a new screen.'
              : current.tagline}
          </Text>
          {!complete && (
            <View style={styles.objectiveBox}>
              <Text style={styles.objectiveBoxLabel}>WHAT THE EVIDENCE STILL NEEDS</Text>
              {currentObjectives.map((objective, index) => {
                const met = objective.done >= objective.target;
                return (
                  <View key={`${current.n}-${index}`} style={styles.objectiveRow}>
                    <View style={[styles.check, met && styles.checkDone]}>
                      {met ? <CheckIcon size={9} color="#07110a" /> : <Text style={styles.checkNo}>{index + 1}</Text>}
                    </View>
                    <Text style={[styles.objectiveText, met && styles.objectiveTextDone]}>{objective.label}</Text>
                    <Text style={[styles.objectiveFigure, met && styles.objectiveFigureDone]}>{Math.min(objective.done, objective.target)}/{objective.target}</Text>
                  </View>
                );
              })}
            </View>
          )}
          <Pressable onPress={openCurrent} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.82 }]}>
            <PlayIcon size={15} color="#07110a" />
            <Text style={styles.primaryTxt}>{activeSession ? 'RESUME MIRROR SESSION' : complete ? 'REVISIT THE FINAL CHAPTER' : 'OPEN THE FILM ROOM'}</Text>
          </Pressable>
          {!complete && <Text style={styles.primaryHint}>The Mirror Session is how a chapter gets its evidence.</Text>}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(50).duration(300)}>
          <Text style={styles.sectionLabel}>THE SIX-CHAPTER PATH</Text>
          <View style={styles.pathCard}>
            {season.stages.map((stage, index) => {
              const cleared = !!progress.completed[stage.n];
              const open = cleared || stage.n === currentN;
              return (
                <Pressable
                  key={stage.n}
                  disabled={!open}
                  onPress={() => openStage(stage)}
                  style={({ pressed }) => [styles.stageRow, index < season.stages.length - 1 && styles.stageRowBorder, stage.n === currentN && styles.stageRowCurrent, pressed && open && { opacity: 0.75 }]}
                >
                  <View style={styles.stageNumberWrap}>
                    <Text style={[styles.stageNumber, (cleared || stage.n === currentN) && { color: colors.primary }]}>{stage.n}</Text>
                  </View>
                  <View style={styles.stageCopyWrap}>
                    <Text style={[styles.stageName, !open && styles.stageNameLocked]}>{stage.name.toUpperCase()}</Text>
                    <Text style={styles.stageHint} numberOfLines={1}>
                      {cleared ? 'EVIDENCE BANKED · TAP TO REVISIT' : stage.n === currentN ? 'YOUR NEXT REVIEW LIVES HERE' : 'UNLOCKS AFTER THE CHAPTER ABOVE'}
                    </Text>
                  </View>
                  <StageStatus stage={stage} currentN={currentN} cleared={cleared} />
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(90).duration(300)} style={styles.benchmarkCard}>
          <View style={styles.benchmarkHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>WHAT GOOD LOOKS LIKE</Text>
              <Text style={styles.benchmarkTitle}>{standard.chapterTitle}</Text>
            </View>
            <Pressable onPress={() => setShowBenchmark((value) => !value)} style={styles.benchmarkToggle}>
              <Text style={styles.benchmarkToggleTxt}>{showBenchmark ? 'LESS' : 'SEE BENCHMARK'}</Text>
            </Pressable>
          </View>
          <Text style={styles.benchmarkQuote}>“{standard.benchmark}”</Text>
          {showBenchmark && (
            <View style={styles.benchmarkMore}>
              <Text style={styles.benchmarkCopy}>{standard.whatTheyLearn}</Text>
              {standard.behaviourToStudy.slice(0, 3).map((behaviour) => (
                <View key={behaviour} style={styles.behaviourRow}>
                  <View style={styles.behaviourDot} />
                  <Text style={styles.behaviourText}>{behaviour}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(130).duration(300)}>
          <Text style={styles.sectionLabel}>EVIDENCE LOCKER</Text>
          <View style={styles.evidenceGrid}>
            <Pressable onPress={() => setSheet('vault')} style={styles.evidenceTile}>
              <RouteIcon size={16} color={colors.primary} />
              <Text style={styles.evidenceTitle}>MATCH VAULT</Text>
              <Text style={styles.evidenceNumber}>{vault.played}</Text>
              <Text style={styles.evidenceSub}>MATCH RECEIPTS</Text>
            </Pressable>
            <Pressable onPress={() => setSheet('journal')} style={styles.evidenceTile}>
              <JournalIcon size={16} color={colors.accent} />
              <Text style={styles.evidenceTitle}>LOSS NOTES</Text>
              <Text style={[styles.evidenceNumber, { color: colors.accent }]}>{journal.total}</Text>
              <Text style={styles.evidenceSub}>HONEST LINES</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => setSheet('tracker')} style={styles.trackerRow}>
            <View>
              <Text style={styles.trackerTitle}>OPEN THE ADVANCED EVIDENCE TRACKER</Text>
              <Text style={styles.trackerSub}>Seven-match checkpoints, screenshots and long-range change — only when you need it.</Text>
            </View>
            <ChevronRightIcon size={14} color={colors.muted} />
          </Pressable>
        </Animated.View>

        <Text style={styles.footer}>THE PATH SHOWS THE NEXT CHAPTER. YOUR RECEIPTS DECIDE WHEN IT IS EARNED.</Text>
      </ScrollView>

      {sheet === 'vault' && <MatchVault coach={coach} onClose={() => setSheet(null)} />}
      {sheet === 'journal' && <LossJournal coach={coach} onClose={() => setSheet(null)} />}
      {sheet === 'tracker' && <EvidenceTrackerScreen coach={coach} onClose={() => setSheet(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 5, paddingBottom: 28 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 },
  brand: { fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 2.4, color: colors.fg },
  brandMeta: { fontFamily: monoFont, fontSize: 6.6, letterSpacing: 1.3, color: colors.primary },
  heroBand: { borderRadius: 16, overflow: 'hidden' },
  heroEyebrow: { fontFamily: bodyFontHeavy, fontSize: 9, letterSpacing: 2, color: colors.primary },
  heroTitle: { marginTop: 7, maxWidth: '88%', fontFamily: displayFont, fontSize: 27, lineHeight: 28, letterSpacing: 0.5, color: colors.fg },
  heroSub: { marginTop: 7, fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.4, color: 'rgba(238,242,236,0.84)' },
  progressGuide: { marginTop: 13, borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: 10, paddingRight: 6 },
  progressGuideTitle: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.5, color: colors.accent },
  progressGuideCopy: { marginTop: 4, fontFamily: bodyFont, fontSize: 11.3, lineHeight: 16, color: '#c8d3c8' },
  currentCard: { marginTop: 14, borderRadius: 16, borderWidth: 1.2, borderColor: 'rgba(57,255,106,0.45)', backgroundColor: 'rgba(13,25,16,0.92)', padding: 14 },
  kicker: { fontFamily: monoFont, fontSize: 6.7, fontWeight: '900', letterSpacing: 1.7, color: colors.primary },
  currentTitle: { marginTop: 6, fontFamily: displayFont, fontSize: 27, lineHeight: 27, letterSpacing: 0.6, color: colors.fg },
  currentCopy: { marginTop: 8, fontFamily: bodyFont, fontSize: 12.3, lineHeight: 18, color: '#c1d0c4' },
  objectiveBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(57,255,106,0.13)', paddingTop: 10, gap: 7 },
  objectiveBoxLabel: { marginBottom: 1, fontFamily: monoFont, fontSize: 6.1, letterSpacing: 1.4, color: colors.muted },
  objectiveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  check: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(143,184,155,0.38)', alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkNo: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', color: colors.muted },
  objectiveText: { flex: 1, fontFamily: bodyFont, fontSize: 11.1, lineHeight: 15, color: '#c2d0c5' },
  objectiveTextDone: { color: 'rgba(143,184,155,0.58)' },
  objectiveFigure: { fontFamily: monoFont, fontSize: 8.5, fontWeight: '800', color: colors.accent },
  objectiveFigureDone: { color: colors.primary },
  primaryBtn: { marginTop: 14, minHeight: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryTxt: { fontFamily: bodyFontHeavy, fontSize: 11, letterSpacing: 1.25, color: '#07110a' },
  primaryHint: { marginTop: 8, textAlign: 'center', fontFamily: bodyFont, fontSize: 10.2, color: colors.muted },
  sectionLabel: { marginTop: 18, marginLeft: 2, fontFamily: bodyFontHeavy, fontSize: 9, letterSpacing: 1.9, color: colors.muted },
  pathCard: { marginTop: 8, borderWidth: 1, borderColor: 'rgba(57,255,106,0.2)', borderRadius: 14, backgroundColor: 'rgba(12,21,14,0.8)', overflow: 'hidden' },
  stageRow: { minHeight: 62, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  stageRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(57,255,106,0.09)' },
  stageRowCurrent: { backgroundColor: 'rgba(57,255,106,0.07)' },
  stageNumberWrap: { width: 19, alignItems: 'center' },
  stageNumber: { fontFamily: displayFont, fontSize: 17, color: 'rgba(143,184,155,0.42)' },
  stageCopyWrap: { flex: 1, minWidth: 0 },
  stageName: { fontFamily: bodyFontBold, fontSize: 12.2, letterSpacing: 0.5, color: colors.fg },
  stageNameLocked: { color: 'rgba(143,184,155,0.5)' },
  stageHint: { marginTop: 3, fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1.05, color: colors.muted },
  stageStatus: { minWidth: 30, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  stageStatusDone: { backgroundColor: colors.primary },
  stageStatusCurrent: { borderWidth: 1, borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.1)' },
  stageStatusLocked: { borderWidth: 1, borderColor: 'rgba(143,184,155,0.18)', backgroundColor: 'rgba(10,15,10,0.35)' },
  stageStatusCurrentTxt: { fontFamily: monoFont, fontSize: 5.8, fontWeight: '900', letterSpacing: 0.7, color: colors.primary },
  benchmarkCard: { marginTop: 15, borderWidth: 1, borderColor: 'rgba(242,192,120,0.32)', borderRadius: 14, backgroundColor: 'rgba(36,28,11,0.55)', padding: 13 },
  benchmarkHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  benchmarkTitle: { marginTop: 5, fontFamily: bodyFontBold, fontSize: 13, letterSpacing: 0.4, color: colors.fg },
  benchmarkToggle: { borderWidth: 1, borderColor: 'rgba(242,192,120,0.45)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  benchmarkToggleTxt: { fontFamily: monoFont, fontSize: 5.8, fontWeight: '900', letterSpacing: 1, color: colors.accent },
  benchmarkQuote: { marginTop: 10, fontFamily: bodyFont, fontSize: 12.2, lineHeight: 18, color: '#e0d4bd' },
  benchmarkMore: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(242,192,120,0.18)' },
  benchmarkCopy: { fontFamily: bodyFont, fontSize: 11.5, lineHeight: 17, color: '#cfc5b3' },
  behaviourRow: { flexDirection: 'row', gap: 7, alignItems: 'flex-start', marginTop: 8 },
  behaviourDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent, marginTop: 5 },
  behaviourText: { flex: 1, fontFamily: bodyFont, fontSize: 11.1, lineHeight: 16, color: '#e0d4bd' },
  evidenceGrid: { flexDirection: 'row', gap: 10, marginTop: 8 },
  evidenceTile: { flex: 1, minHeight: 132, borderWidth: 1, borderColor: 'rgba(57,255,106,0.2)', borderRadius: 13, backgroundColor: 'rgba(12,21,14,0.8)', padding: 12 },
  evidenceTitle: { marginTop: 10, fontFamily: bodyFontBold, fontSize: 10.5, letterSpacing: 0.65, color: colors.fg },
  evidenceNumber: { marginTop: 8, fontFamily: displayFont, fontSize: 26, color: colors.primary },
  evidenceSub: { marginTop: 3, fontFamily: monoFont, fontSize: 5.7, letterSpacing: 1.05, color: colors.muted },
  trackerRow: { marginTop: 10, minHeight: 62, borderWidth: 1, borderColor: 'rgba(143,184,155,0.18)', borderRadius: 12, backgroundColor: 'rgba(10,15,10,0.5)', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  trackerTitle: { fontFamily: bodyFontBold, fontSize: 10.5, letterSpacing: 0.55, color: colors.fg },
  trackerSub: { marginTop: 4, maxWidth: 285, fontFamily: bodyFont, fontSize: 9.8, lineHeight: 14, color: colors.muted },
  footer: { marginTop: 18, paddingHorizontal: 8, textAlign: 'center', fontFamily: monoFont, fontSize: 6.1, lineHeight: 10, letterSpacing: 1.15, color: 'rgba(143,184,155,0.5)' },
});
