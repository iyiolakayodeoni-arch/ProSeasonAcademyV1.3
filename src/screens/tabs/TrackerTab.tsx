import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Easing, Platform, useWindowDimensions } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import GridBackground from '../../components/GridBackground';
import ArtBand from '../../components/ArtBand';
import { CheckIcon, LockIcon, PauseGlyphIcon, PlayIcon, RouteIcon } from '../../components/Icons';
import { Coach } from '../../data/coaches';
import {
  DAYS_PER_MONTH,
  MONTHS,
  TOTAL_DAYS,
  DailyProgram,
  currentDay,
  dailyContent,
  daysLeft,
  doneCount,
  fmtCountdown,
  isComplete,
  isUnlocked,
  loadDailyProgram,
  monthLabel,
  monthOf,
  pauseProgram,
  remainingMs,
  resumeProgram,
  sealDay,
  status,
  weekOf,
} from '../../data/dailyProgram';
import { colors, bodyFont, bodyFontBold, bodyFontHeavy, displayFont, monoFont } from '../../theme';
import { BaselineCard, loadBaseline } from '../../data/baselineScan';
import { sfx } from '../../audio/sound';
import { useResponsive } from '../../hooks/useResponsive';
import { useHover } from '../../hooks/useHover';

const TUNNEL = require('../../../assets/art/journey-tunnel.jpg');

type Props = {
  coach: Coach;
};

export default function TrackerTab({ coach }: Props) {
  const { isMultiColumn, isWide } = useResponsive();
  const { height: winH } = useWindowDimensions();
  const scrollH = Platform.OS === 'web' ? winH - 64 : undefined;
  const [prog, setProg] = useState<DailyProgram | null>(null);
  const [now, setNow] = useState(Date.now());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [baseline, setBaseline] = useState<BaselineCard | null>(null);

  // The six-month rail grows into place once, then holds — earned width,
  // eased landing. (Hooks stay above every early return in this file.)
  const railGrow = useSharedValue(0);
  useEffect(() => {
    railGrow.value = withTiming(1, { duration: 950, easing: Easing.out(Easing.cubic) });
  }, [railGrow]);
  const railStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: railGrow.value }] }));

  // The seal button lifts a breath on fine pointers.
  const { hovered: sealHovered, bind: sealBind } = useHover();
  const sealHov = useSharedValue(0);
  useEffect(() => {
    sealHov.value = withTiming(sealHovered ? 1 : 0, { duration: 150 });
  }, [sealHovered, sealHov]);
  const sealLiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -2 * sealHov.value }],
  }));

  useEffect(() => {
    void loadDailyProgram().then(setProg);
    void loadBaseline(coach.id).then((session) => setBaseline(session.card)).catch(() => {});
  }, [coach.id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!prog) return null;

  const complete = isComplete(prog);
  const cur = currentDay(prog);
  const locked = !complete && !isUnlocked(prog, cur, now);
  const waitMs = locked ? remainingMs(prog, cur, now) : 0;
  const content = complete ? null : dailyContent(cur);
  const first = coach.name.split(' ')[0].toUpperCase();
  const currentMonthNum = Math.min(monthOf(Math.min(cur, TOTAL_DAYS)), MONTHS);
  const activeMonth = selectedMonth ?? currentMonthNum;
  const pct = Math.round((doneCount(prog) / TOTAL_DAYS) * 100);

  const onSeal = () => {
    if (locked || complete) return;
    sfx('success');
    setProg(sealDay(prog, cur, Date.now()));
  };
  const onPause = () => {
    sfx('tap');
    setProg(pauseProgram(prog, Date.now()));
  };
  const onResume = () => {
    sfx('tap');
    setProg(resumeProgram(prog, Date.now()));
  };

  return (
    <View style={styles.root}>
      <GridBackground />
      <ScrollView
        style={scrollH != null ? { flexShrink: 1, height: scrollH } : { flex: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Full-width Art Header */}
        <ArtBand
          source={[TUNNEL, require('../../../assets/art/home-pitch.png'), require('../../../assets/art/coach-touchline.jpg')]}
          width={1380}
          height={130}
          style={styles.headerBand}
          warmAt={{ x: 600, y: 40, r: 600 }}
        >
          <Text style={styles.eyebrow}>
            SIX-MONTH PLAYER DEVELOPMENT · {complete ? 'COMPLETED' : monthLabel(currentMonthNum)}
          </Text>
          <Text style={styles.bandTitle}>
            {complete ? 'YOU REACHED THE SUMMIT' : 'ONE HONEST DAY AT A TIME'}
          </Text>
          <Text style={styles.subtitle}>
            {complete
              ? 'ALL 180 DAYS · THE DISCIPLINE LANDED'
              : `${doneCount(prog)} OF ${TOTAL_DAYS} DAYS SEALED · ${daysLeft(prog)} TO GO`}
          </Text>
        </ArtBand>

        {/* Global Progress Track */}
        <View style={styles.pctBarWrap}>
          <Animated.View style={[styles.pctBar, { width: `${Math.max(2, pct)}%` }, railStyle]} />
        </View>
        <Text style={styles.pctTxt}>{pct}% OF YOUR SIX MONTHS COMPLETED</Text>

        {/* Multi-Column Desktop Layout */}
        <View style={[styles.columnsContainer, isMultiColumn && styles.columnsContainerWide]}>
          {/* Left Column (Current Day Action & Baseline) */}
          <View style={[styles.leftCol, isMultiColumn && styles.leftColWide]}>
            {complete ? (
              <Animated.View entering={FadeInUp.duration(300)} style={styles.doneCard}>
                <RouteIcon size={24} color={colors.primary} />
                <Text style={styles.doneTitle}>SIX MONTHS. DONE RIGHT.</Text>
                <Text style={styles.doneBody}>
                  Day after day, one match at a time. That discipline is the reward — and it is yours.
                  Go reset the standard. Coach {coach.name} is still here whenever you play again.
                </Text>
              </Animated.View>
            ) : (
              <>
                <Animated.View entering={FadeInUp.duration(300)} style={styles.dayCard}>
                  <View style={styles.dayCardTop}>
                    <Text style={styles.dayEyebrow}>
                      {first} · MONTH {currentMonthNum} OF {MONTHS} · WEEK {weekOf(cur)} · DAY {cur}
                    </Text>
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeTxt}>TODAY'S MISSION</Text>
                    </View>
                  </View>

                  <Text style={styles.dayTitle}>{content!.theme}</Text>
                  <Text style={styles.dayLine}>{content!.line}</Text>

                  <View style={styles.taskRow}>
                    <View style={styles.taskMark}>
                      <Text style={styles.taskMarkTxt}>!</Text>
                    </View>
                    <Text style={styles.taskTxt}>{content!.task}</Text>
                  </View>

                  {locked ? (
                    <View style={styles.lockBlock}>
                      <View style={styles.lockRow}>
                        <LockIcon size={14} color={colors.accent} />
                        <Text style={styles.lockTxt}>NEXT DAY UNLOCKS IN</Text>
                      </View>
                      <Text style={styles.countdown}>{fmtCountdown(waitMs)}</Text>
                      <Text style={styles.lockHint}>
                        Discipline over rush. Let the lesson settle — the next day will be ready.
                      </Text>
                    </View>
                  ) : (
                    <Animated.View style={sealLiftStyle}>
                      <Pressable
                        onPress={onSeal}
                        style={({ pressed }) => [
                          styles.sealBtn,
                          pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
                        ]}
                        accessibilityRole="button"
                        {...sealBind}
                      >
                        <CheckIcon size={14} color="#07110a" />
                        <Text style={styles.sealTxt}>SEAL DAY {cur} — DONE FOR TODAY</Text>
                      </Pressable>
                    </Animated.View>
                  )}

                  <Pressable
                    onPress={prog.paused ? onResume : onPause}
                    hitSlop={8}
                    style={styles.pauseRow}
                  >
                    {prog.paused ? (
                      <PlayIcon size={12} color={colors.muted} />
                    ) : (
                      <PauseGlyphIcon size={12} color={colors.muted} />
                    )}
                    <Text style={styles.pauseTxt}>
                      {prog.paused
                        ? 'PROGRAM PAUSED — CLICK TO RESUME'
                        : 'PAUSE PROGRAM (LIFE HAPPENS — THE CLOCK WAITS FOR YOU)'}
                    </Text>
                  </Pressable>
                </Animated.View>
              </>
            )}

            {/* Baseline Sealed Card */}
            {baseline && <BaselineResult card={baseline} />}
          </View>

          {/* Right Column (6-Month Calendar & Matrix) */}
          <View style={[styles.rightCol, isMultiColumn && styles.rightColWide]}>
            <View style={styles.matrixCard}>
              <View style={styles.matrixHead}>
                <Text style={styles.matrixTitle}>180-DAY PROGRESS MATRIX</Text>
                <Text style={styles.matrixSub}>{doneCount(prog)} / {TOTAL_DAYS} SEALED</Text>
              </View>

              {/* Month Selector Tabs */}
              <View style={styles.monthTabsRow}>
                {Array.from({ length: MONTHS }).map((_, i) => {
                  const m = i + 1;
                  const active = activeMonth === m;
                  const start = (m - 1) * DAYS_PER_MONTH + 1;
                  const doneInM = Array.from({ length: DAYS_PER_MONTH }).filter(
                    (_, di) => status(prog, start + di) === 'done',
                  ).length;

                  return (
                    <Pressable
                      key={m}
                      onPress={() => {
                        sfx('tap');
                        setSelectedMonth(m);
                      }}
                      style={[styles.monthTab, active && styles.monthTabActive]}
                    >
                      <Text style={[styles.monthTabTitle, active && styles.monthTabTitleActive]}>
                        M{m}
                      </Text>
                      <Text style={[styles.monthTabCount, active && styles.monthTabCountActive]}>
                        {doneInM}/{DAYS_PER_MONTH}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Selected Month 30-Day Grid */}
              <View style={styles.activeMonthBlock}>
                <Text style={styles.activeMonthLabel}>
                  {monthLabel(activeMonth).toUpperCase()} · 30 DAYS
                </Text>
                <View style={styles.matrixGrid}>
                  {Array.from({ length: DAYS_PER_MONTH }).map((_, i) => {
                    const dayNum = (activeMonth - 1) * DAYS_PER_MONTH + (i + 1);
                    const st = complete ? 'done' : status(prog, dayNum);
                    const isDone = st === 'done';
                    const isCurrent = st === 'current';

                    if (isCurrent) {
                      return <PulseCell key={dayNum} day={dayNum} />;
                    }

                    return (
                      <View
                        key={dayNum}
                        style={[styles.cell, isDone && styles.cellDone]}
                      >
                        {isDone ? (
                          <CheckIcon size={11} color="#07110a" />
                        ) : (
                          <Text style={styles.cellNum}>{dayNum}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.gridFooterNote}>
                  GREEN = SEALED · GLOWING = CURRENT ACTIVE DAY · LOCKED = FUTURE SESSIONS
                </Text>
              </View>
            </View>

            {/* Daily Routine Manifesto */}
            <View style={styles.routineCard}>
              <Text style={styles.routineTag}>THE REVIEW ROUTINE</Text>
              <Text style={styles.routineTitle}>HOW TO BUILD THE RECORD</Text>
              <Text style={styles.routineBody}>
                1. Play your normal console match and record your tape.{'\n'}
                2. Put pen to paper on the turning point right away.{'\n'}
                3. Cool down for 30 minutes before opening the app.{'\n'}
                4. Type the 4 core receipts into your database and seal the day.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function BaselineResult({ card }: { card: BaselineCard }) {
  const average = Math.round(
    card.cardStats.reduce((sum, stat) => sum + stat.value, 0) / Math.max(1, card.cardStats.length),
  );
  const destination = card.ambition?.trim() || 'YOUR NEXT LEVEL';

  return (
    <Animated.View entering={FadeInUp.delay(200).duration(450)} style={styles.baselineCard}>
      <View style={styles.baselineTopLine}>
        <Text style={styles.baselineEyebrow}>BASELINE SEALED · STARTING POINT</Text>
        <View style={styles.sealed}>
          <Text style={styles.sealedText}>✓</Text>
        </View>
      </View>
      <Text style={styles.baselineTitle}>THIS IS WHERE YOU START.</Text>
      <Text style={styles.baselineRead}>{card.coachRead}</Text>

      <View style={styles.directionRow}>
        <View style={styles.directionSide}>
          <Text style={styles.directionLabel}>YOU ARE HERE</Text>
          <Text style={styles.directionValue}>{card.tier}</Text>
          <Text style={styles.directionMeta}>{average} / 99 BASE READ</Text>
        </View>
        <View style={styles.directionArrow}>
          <Text style={styles.directionArrowText}>→</Text>
        </View>
        <View style={[styles.directionSide, styles.destinationSide]}>
          <Text style={styles.directionLabel}>YOU'RE GOING</Text>
          <Text numberOfLines={2} style={styles.destinationValue}>{destination}</Text>
          <Text style={styles.directionMeta}>ONE HONEST DAY AT A TIME</Text>
        </View>
      </View>

      <View style={styles.statGrid}>
        {card.cardStats.map((stat) => (
          <View key={stat.key} style={styles.statCell}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <View style={styles.statTrack}>
              <View style={[styles.statFill, { width: `${Math.max(7, stat.value)}%` }]} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.baselineFoot}>
        {card.played} MATCHES · {card.w}W {card.d}D {card.l}L · RECEIPTS IN THE DATABASE.
      </Text>
    </Animated.View>
  );
}

function PulseCell({ day }: { day: number }) {
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })),
      -1,
    );
  }, [glow]);
  const style = useAnimatedStyle(() => ({ opacity: 0.5 + glow.value * 0.5 }));
  return (
    <Animated.View entering={FadeInUp.duration(300)} style={[styles.cell, styles.cellNow, style]}>
      <Text style={styles.cellNumNow}>{day}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingVertical: 14, paddingBottom: 40 },

  headerBand: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  eyebrow: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 2.2,
    color: 'rgba(238,242,236,0.9)',
  },
  bandTitle: {
    marginTop: 6,
    fontFamily: displayFont,
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: 0.8,
    color: colors.fg,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: colors.primary,
  },

  pctBarWrap: {
    marginTop: 14,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(57,255,106,0.12)',
    overflow: 'hidden',
  },
  pctBar: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  pctTxt: {
    marginTop: 8,
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 1.8,
    color: colors.muted,
    textAlign: 'center',
  },

  columnsContainer: {
    marginTop: 18,
    flexDirection: 'column',
    gap: 20,
  },
  columnsContainerWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
  },

  leftCol: {
    flex: 1,
    width: '100%',
  },
  leftColWide: {
    flex: 1.1,
  },

  rightCol: {
    width: '100%',
    gap: 18,
  },
  rightColWide: {
    flex: 1.1,
  },

  dayCard: {
    borderWidth: 1.2,
    borderColor: 'rgba(57,255,106,0.45)',
    borderRadius: 18,
    backgroundColor: 'rgba(15,26,19,0.92)',
    padding: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  dayCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayEyebrow: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 1.8,
    color: colors.primary,
  },
  dayBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(57,255,106,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.3)',
  },
  dayBadgeTxt: {
    fontFamily: monoFont,
    fontSize: 6.5,
    fontWeight: '900',
    color: colors.primary,
  },
  dayTitle: {
    marginTop: 12,
    fontFamily: displayFont,
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: 0.6,
    color: colors.fg,
  },
  dayLine: {
    marginTop: 12,
    fontFamily: bodyFont,
    fontSize: 14,
    lineHeight: 22,
    color: '#d6e0d8',
  },
  taskRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(57,255,106,0.14)',
    paddingTop: 14,
  },
  taskMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskMarkTxt: {
    fontFamily: bodyFontHeavy,
    fontSize: 11,
    color: '#0a0f0a',
  },
  taskTxt: {
    flex: 1,
    fontFamily: monoFont,
    fontSize: 8.5,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.warm,
  },

  lockBlock: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.35)',
    borderRadius: 14,
    backgroundColor: 'rgba(38,30,12,0.5)',
    padding: 16,
    alignItems: 'center',
  },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lockTxt: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 1.8,
    color: colors.accent,
  },
  countdown: {
    marginTop: 8,
    fontFamily: monoFont,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.fg,
  },
  lockHint: {
    marginTop: 8,
    fontFamily: bodyFont,
    fontSize: 12,
    lineHeight: 18,
    color: '#c4b48f',
    textAlign: 'center',
  },

  sealBtn: {
    marginTop: 20,
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  sealTxt: {
    fontFamily: bodyFontHeavy,
    fontSize: 13,
    letterSpacing: 1.6,
    color: '#07110a',
  },

  pauseRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pauseTxt: {
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.muted,
    textAlign: 'center',
  },

  doneCard: {
    borderWidth: 1.2,
    borderColor: colors.primary,
    borderRadius: 18,
    backgroundColor: 'rgba(57,255,106,0.06)',
    padding: 24,
    alignItems: 'center',
  },
  doneTitle: {
    marginTop: 14,
    fontFamily: displayFont,
    fontSize: 26,
    letterSpacing: 0.8,
    color: colors.primary,
    textAlign: 'center',
  },
  doneBody: {
    marginTop: 12,
    fontFamily: bodyFont,
    fontSize: 14,
    lineHeight: 22,
    color: '#cfe0d3',
    textAlign: 'center',
  },

  matrixCard: {
    borderWidth: 1.1,
    borderColor: 'rgba(57,255,106,0.25)',
    borderRadius: 18,
    backgroundColor: 'rgba(12,20,14,0.92)',
    padding: 18,
  },
  matrixHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  matrixTitle: {
    fontFamily: bodyFontHeavy,
    fontSize: 12,
    letterSpacing: 1.8,
    color: colors.fg,
  },
  matrixSub: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: colors.primary,
  },
  monthTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  monthTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.22)',
    backgroundColor: 'rgba(10,15,10,0.5)',
    alignItems: 'center',
  },
  monthTabActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(57,255,106,0.12)',
  },
  monthTabTitle: {
    fontFamily: bodyFontHeavy,
    fontSize: 11,
    color: colors.muted,
  },
  monthTabTitleActive: {
    color: colors.primary,
  },
  monthTabCount: {
    marginTop: 2,
    fontFamily: monoFont,
    fontSize: 6,
    color: colors.muted,
  },
  monthTabCountActive: {
    color: colors.primary,
  },

  activeMonthBlock: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(57,255,106,0.12)',
    paddingTop: 14,
  },
  activeMonthLabel: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.8,
    color: colors.accent,
    marginBottom: 12,
  },
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.22)',
    backgroundColor: 'rgba(10,15,10,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cellNow: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: 'rgba(242,192,120,0.16)',
    shadowColor: colors.accent,
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  cellNum: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '800',
    color: 'rgba(143,184,155,0.7)',
  },
  cellNumNow: {
    color: colors.accent,
    fontWeight: '900',
  },
  gridFooterNote: {
    marginTop: 14,
    fontFamily: monoFont,
    fontSize: 6.5,
    letterSpacing: 1.2,
    color: 'rgba(143,184,155,0.6)',
    textAlign: 'center',
  },

  routineCard: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(15,26,19,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.22)',
  },
  routineTag: {
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.6,
    color: colors.primary,
  },
  routineTitle: {
    marginTop: 6,
    fontFamily: displayFont,
    fontSize: 18,
    color: colors.fg,
  },
  routineBody: {
    marginTop: 10,
    fontFamily: bodyFont,
    fontSize: 12.5,
    lineHeight: 20,
    color: '#cad7cc',
  },

  baselineCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#101d14',
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.58)',
  },
  baselineTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  baselineEyebrow: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 1.6,
    color: colors.accent,
  },
  sealed: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  sealedText: { fontSize: 13, fontWeight: '900', color: '#07110a' },
  baselineTitle: {
    marginTop: 10,
    fontFamily: displayFont,
    fontSize: 24,
    color: colors.fg,
  },
  baselineRead: {
    marginTop: 8,
    fontFamily: bodyFont,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  directionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(4,10,6,0.55)',
  },
  directionSide: { flex: 1 },
  destinationSide: { alignItems: 'flex-end' },
  directionLabel: {
    fontFamily: monoFont,
    fontSize: 6.8,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: colors.muted,
  },
  directionValue: {
    marginTop: 6,
    fontFamily: bodyFontHeavy,
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors.accent,
  },
  destinationValue: {
    marginTop: 6,
    fontFamily: bodyFontHeavy,
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'right',
    color: colors.primary,
  },
  directionMeta: {
    marginTop: 4,
    fontFamily: monoFont,
    fontSize: 6,
    letterSpacing: 0.6,
    color: 'rgba(143,184,155,0.7)',
  },
  directionArrow: { width: 28, alignItems: 'center', justifyContent: 'center' },
  directionArrowText: { fontFamily: displayFont, fontSize: 24, color: colors.primary },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    rowGap: 12,
  },
  statCell: { width: '31%' },
  statLabel: {
    fontFamily: monoFont,
    fontSize: 6.5,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: colors.muted,
  },
  statTrack: {
    height: 4,
    marginTop: 6,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: 'rgba(143,184,155,0.18)',
  },
  statFill: { height: '100%', borderRadius: 2, backgroundColor: colors.primary },
  statValue: { marginTop: 4, fontFamily: bodyFontBold, fontSize: 12, color: colors.fg },
  baselineFoot: {
    marginTop: 16,
    fontFamily: monoFont,
    fontSize: 7,
    lineHeight: 12,
    letterSpacing: 0.8,
    color: 'rgba(143,184,155,0.7)',
  },
});
