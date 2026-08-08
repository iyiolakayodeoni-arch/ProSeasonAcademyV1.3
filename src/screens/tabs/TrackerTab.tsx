import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
  COOLDOWN_MS,
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
import { sfx } from '../../audio/sound';

const TUNNEL = require('../../../assets/art/journey-tunnel.jpg');

type Props = {
  coach: Coach;
};

export default function TrackerTab({ coach }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const bandW = Math.min(windowWidth, 430);
  const [prog, setProg] = useState<DailyProgram | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showCalendar, setShowCalendar] = useState(false);

  // hydrate once
  useEffect(() => {
    void loadDailyProgram().then(setProg);
  }, []);

  // one-second tick so the countdown breathes live
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
  const month = Math.min(monthOf(Math.min(cur, TOTAL_DAYS)), MONTHS);
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
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scroll}>
        {/* header band */}
        <ArtBand source={TUNNEL} width={bandW - 8} height={120} warmAt={{ x: bandW * 0.5, y: 40, r: bandW * 0.55 }}>
          <Text style={styles.eyebrow}>YOUR PROGRESS · {complete ? 'COMPLETE' : monthLabel(month)}</Text>
          <Text style={styles.bandTitle}>{complete ? 'YOU MADE IT' : 'ONE DAY AT A TIME'}</Text>
          <Text style={styles.subtitle}>
            {complete ? 'ALL 180 DAYS · THE WORK LANDED' : `${doneCount(prog)} OF ${TOTAL_DAYS} DAYS DONE · ${daysLeft(prog)} TO GO`}
          </Text>
        </ArtBand>

        {/* a thin progress bar — the honest count */}
        <View style={styles.pctBarWrap}>
          <View style={[styles.pctBar, { width: `${Math.max(2, pct)}%` }]} />
        </View>
        <Text style={styles.pctTxt}>{pct}% THROUGH YOUR SIX MONTHS</Text>

        {complete ? (
          <Animated.View entering={FadeInUp.duration(300)} style={styles.doneCard}>
            <RouteIcon size={18} color={colors.primary} />
            <Text style={styles.doneTitle}>SIX MONTHS. DONE RIGHT.</Text>
            <Text style={styles.doneBody}>
              Day after day, one match at a time. That discipline is the reward — and it is yours.
              Go reset the standard. The coach is still here whenever you play again.
            </Text>
          </Animated.View>
        ) : (
          <>
            {/* ONE day card — never the whole list */}
            <Animated.View entering={FadeInUp.duration(300)} style={styles.dayCard}>
              <Text style={styles.dayEyebrow}>
                {first} · MONTH {month} OF {MONTHS} · WEEK {weekOf(cur)} · DAY {cur}
              </Text>
              <Text style={styles.dayTitle}>{content!.theme}</Text>
              <Text style={styles.dayLine}>{content!.line}</Text>
              <View style={styles.taskRow}>
                <View style={styles.taskMark}><Text style={styles.taskMarkTxt}>!</Text></View>
                <Text style={styles.taskTxt}>{content!.task}</Text>
              </View>

              {locked ? (
                <View style={styles.lockBlock}>
                  <View style={styles.lockRow}>
                    <LockIcon size={12} color={colors.accent} />
                    <Text style={styles.lockTxt}>NEXT DAY IN</Text>
                  </View>
                  <Text style={styles.countdown}>{fmtCountdown(waitMs)}</Text>
                  <Text style={styles.lockHint}>Your reward for finishing today. Come back tomorrow — the day will be here.</Text>
                </View>
              ) : (
                <Pressable onPress={onSeal} style={({ pressed }) => [styles.sealBtn, pressed && { opacity: 0.85 }]}>
                  <CheckIcon size={13} color="#07110a" />
                  <Text style={styles.sealTxt}>SEAL DAY {cur} — DONE FOR TODAY</Text>
                </Pressable>
              )}
            </Animated.View>

            {/* pause / resume — protect the side hustle */}
            <Pressable onPress={prog.paused ? onResume : onPause} hitSlop={8} style={styles.pauseRow}>
              {prog.paused ? <PlayIcon size={12} color={colors.muted} /> : <PauseGlyphIcon size={12} color={colors.muted} />}
              <Text style={styles.pauseTxt}>
                {prog.paused
                  ? 'PAUSED — TAP TO RESUME'
                  : 'PAUSE FOR NOW (LIFE HAPPENS — THE CLOCK WAITS FOR YOU)'}
              </Text>
            </Pressable>
          </>
        )}

        {/* the dopamine strip — day cards filling, one after the other */}
        <Text style={styles.sectionLabel}>YOUR SIX MONTHS</Text>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarHint}>EVERY DAY YOU SEAL TURNS GREEN.</Text>
          <Pressable onPress={() => { sfx('tap'); setShowCalendar((v) => !v); }} hitSlop={8}>
            <Text style={styles.calendarToggle}>{showCalendar ? 'HIDE CALENDAR' : 'VIEW CALENDAR'}</Text>
          </Pressable>
        </View>

        {showCalendar ? (
          <MonthCalendar prog={prog} />
        ) : (
          <MonthStrip prog={prog} cur={cur} complete={complete} />
        )}
      </ScrollView>
    </View>
  );
}

/** a softly pulsing glow for the current ("NOW") day — the dopamine beat */
function PulseCell({ day }: { day: number }) {
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })), -1);
  }, [glow]);
  const style = useAnimatedStyle(() => ({ opacity: 0.5 + glow.value * 0.5 }));
  return (
    <Animated.View entering={FadeInUp.duration(300)} style={[styles.cell, styles.cellNow, style]}>
      <Text style={styles.cellNumNow}>{day % 100}</Text>
    </Animated.View>
  );
}

/** the current month's 30 day-cards as a compact grid — the visual reward */
function MonthStrip({ prog, cur, complete }: { prog: DailyProgram; cur: number; complete: boolean }) {
  const month = Math.min(monthOf(Math.min(cur, TOTAL_DAYS)), MONTHS);
  const start = (month - 1) * DAYS_PER_MONTH + 1;
  const cells = Array.from({ length: DAYS_PER_MONTH }, (_, i) => start + i);
  return (
    <View style={styles.monthCard}>
      <Text style={styles.monthTitle}>{monthLabel(month)}</Text>
      <View style={styles.grid}>
        {cells.map((day) => {
          const st = complete ? 'done' : status(prog, day);
          const done = st === 'done';
          const current = st === 'current';
          if (current) {
            return <PulseCell key={day} day={day} />;
          }
          return (
            <View key={day} style={[styles.cell, done && styles.cellDone]}>
              {done ? <CheckIcon size={9} color="#07110a" /> : <Text style={styles.cellNum}>{day % 100}</Text>}
            </View>
          );
        })}
      </View>
      <Text style={styles.monthFoot}>{doneCount(prog)} DAYS SEALED ACROSS ALL MONTHS · THIS MONTH IS {month} OF {MONTHS}</Text>
    </View>
  );
}

/** month-by-month calendar — see how long is left */
function MonthCalendar({ prog }: { prog: DailyProgram }) {
  const months = Array.from({ length: MONTHS }, (_, i) => i + 1);
  return (
    <View style={styles.calCard}>
      <Text style={styles.calTitle}>THE FULL SIX MONTHS</Text>
      <Text style={styles.calSub}>{daysLeft(prog)} DAYS LEFT · MONTH {monthOf(Math.min(currentDay(prog), TOTAL_DAYS))} OF {MONTHS}</Text>
      {months.map((m) => {
        const start = (m - 1) * DAYS_PER_MONTH + 1;
        const cells = Array.from({ length: DAYS_PER_MONTH }, (_, i) => start + i);
        const doneHere = cells.filter((d) => status(prog, d) === 'done').length;
        return (
          <View key={m} style={styles.calMonth}>
            <Text style={styles.calMonthTag}>{monthLabel(m)} · {doneHere}/{DAYS_PER_MONTH}</Text>
            <View style={styles.grid}>
              {cells.map((day) => {
                const st = status(prog, day);
                const done = st === 'done';
                const current = st === 'current';
                return (
                  <View key={day} style={[styles.cell, done && styles.cellDone, current && styles.cellNow]}>
                    {done ? <CheckIcon size={8} color="#07110a" /> : <Text style={[styles.cellNum, current && styles.cellNumNow]}>{day % 100}</Text>}
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 30 },

  eyebrow: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '800', letterSpacing: 2.2, color: 'rgba(238,242,236,0.85)' },
  bandTitle: { marginTop: 5, fontFamily: displayFont, fontSize: 28, lineHeight: 29, letterSpacing: 0.7, color: colors.fg, textShadowColor: 'rgba(57,255,106,0.4)', textShadowRadius: 10 },
  subtitle: { marginTop: 7, fontFamily: monoFont, fontSize: 6.2, fontWeight: '800', letterSpacing: 1.5, color: 'rgba(238,242,236,0.85)' },

  pctBarWrap: { marginTop: 14, height: 6, borderRadius: 3, backgroundColor: 'rgba(57,255,106,0.12)', overflow: 'hidden' },
  pctBar: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  pctTxt: { marginTop: 6, fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.6, color: colors.muted, textAlign: 'center' },

  dayCard: {
    marginTop: 14, borderWidth: 1.2, borderColor: 'rgba(57,255,106,0.5)', borderRadius: 18,
    backgroundColor: 'rgba(15,26,19,0.92)', padding: 18,
    shadowColor: colors.primary, shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
  },
  dayEyebrow: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.6, color: colors.primary },
  dayTitle: { marginTop: 12, fontFamily: displayFont, fontSize: 24, lineHeight: 25, letterSpacing: 0.5, color: colors.fg },
  dayLine: { marginTop: 12, fontFamily: bodyFont, fontSize: 13.5, lineHeight: 20, color: '#d6e0d8' },
  taskRow: { marginTop: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderTopWidth: 1, borderTopColor: 'rgba(57,255,106,0.14)', paddingTop: 12 },
  taskMark: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  taskMarkTxt: { fontFamily: bodyFontHeavy, fontSize: 10, color: '#0a0f0a' },
  taskTxt: { flex: 1, fontFamily: monoFont, fontSize: 7.6, lineHeight: 12, fontWeight: '700', letterSpacing: 0.6, color: colors.warm },

  lockBlock: { marginTop: 16, borderWidth: 1, borderColor: 'rgba(242,192,120,0.35)', borderRadius: 13, backgroundColor: 'rgba(38,30,12,0.5)', padding: 14, alignItems: 'center' },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  lockTxt: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '900', letterSpacing: 1.6, color: colors.accent },
  countdown: { marginTop: 6, fontFamily: monoFont, fontSize: 30, fontWeight: '900', letterSpacing: 3, color: colors.fg },
  lockHint: { marginTop: 8, fontFamily: bodyFont, fontSize: 11, lineHeight: 16, color: '#c4b48f', textAlign: 'center' },

  sealBtn: {
    marginTop: 18, minHeight: 52, borderRadius: 26, backgroundColor: colors.primary, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
  },
  sealTxt: { fontFamily: bodyFontHeavy, fontSize: 12, letterSpacing: 1.4, color: '#07110a' },

  pauseRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  pauseTxt: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '800', letterSpacing: 1.1, color: colors.muted, textAlign: 'center' },

  doneCard: { marginTop: 14, borderWidth: 1.2, borderColor: colors.primary, borderRadius: 18, backgroundColor: 'rgba(57,255,106,0.06)', padding: 20, alignItems: 'center' },
  doneTitle: { marginTop: 12, fontFamily: displayFont, fontSize: 22, letterSpacing: 0.6, color: colors.primary, textAlign: 'center' },
  doneBody: { marginTop: 10, fontFamily: bodyFont, fontSize: 13, lineHeight: 20, color: '#cfe0d3', textAlign: 'center' },

  sectionLabel: { marginTop: 20, marginLeft: 2, fontFamily: bodyFontHeavy, fontSize: 9, letterSpacing: 1.9, color: colors.muted },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingHorizontal: 2 },
  calendarHint: { fontFamily: monoFont, fontSize: 5.8, fontWeight: '800', letterSpacing: 1.3, color: 'rgba(143,184,155,0.6)' },
  calendarToggle: { fontFamily: bodyFontHeavy, fontSize: 8.6, letterSpacing: 1.1, color: colors.primary },

  monthCard: { marginTop: 10, borderWidth: 1.1, borderColor: 'rgba(57,255,106,0.22)', borderRadius: 14, backgroundColor: 'rgba(12,20,14,0.9)', padding: 13 },
  monthTitle: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.6, color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  cell: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(143,184,155,0.22)', backgroundColor: 'rgba(10,15,10,0.5)', alignItems: 'center', justifyContent: 'center' },
  cellDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  cellNow: { borderColor: colors.accent, borderWidth: 1.6, backgroundColor: 'rgba(242,192,120,0.12)', shadowColor: colors.accent, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  cellNum: { fontFamily: monoFont, fontSize: 8, fontWeight: '800', color: 'rgba(143,184,155,0.7)' },
  cellNumNow: { color: colors.accent },
  monthFoot: { marginTop: 10, fontFamily: monoFont, fontSize: 5.6, lineHeight: 9, letterSpacing: 1, color: 'rgba(143,184,155,0.55)', textAlign: 'center' },

  calCard: { marginTop: 10, borderWidth: 1.1, borderColor: 'rgba(57,255,106,0.22)', borderRadius: 14, backgroundColor: 'rgba(12,20,14,0.9)', padding: 13 },
  calTitle: { fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 1.6, color: colors.fg },
  calSub: { marginTop: 3, fontFamily: monoFont, fontSize: 6.2, fontWeight: '800', letterSpacing: 1.3, color: colors.muted },
  calMonth: { marginTop: 14 },
  calMonthTag: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.5, color: colors.accent, marginBottom: 6 },
});
