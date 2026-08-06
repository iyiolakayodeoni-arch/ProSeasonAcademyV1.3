import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import ArtBand from '../components/ArtBand';
import CoachPresence from '../components/CoachPresence';

// the worn boots on the chalk line — the scan's face: it starts from where you actually stand
const BOOTS = require('../../assets/art/scan-boots.jpg');
import { Coach } from '../data/coaches';
import {
  BASELINE_SCRIPTS,
  BASELINE_DAYS,
  BASELINE_DAY_INTRO,
  BASELINE_DAY_MS,
  BASELINE_MATCHES,
  BASELINE_MOMENT_MIN_ANSWER,
  BASELINE_MOMENT_QUESTIONS,
  BASELINE_MOMENT_TAGS,
  BASELINE_REST_LINES,
  BaselineAnalysisKey,
  BaselineDayStatus,
  BaselineMoment,
  BaselineSession,
  beatKey,
  currentBaselineDay,
  dayStatus,
  isBaselineMatchDay,
  isBaselineRestDay,
  isWeekComplete,
  loadBaseline,
  matchNumberForDay,
  nextUnlockAt,
  recordBaselineMatch,
  saveBaselineReflection,
  sealBaseline,
  sealBaselineDay,
  tendenciesOf,
  weekMoments,
} from '../data/baselineScan';

import { getSettings } from '../data/settings';
import { COMPOSURE_LABELS, resultOf } from '../data/matches';
import { scheduleBaselineUnlock } from '../data/notifications';
import { CheckIcon, EyeIcon, LockIcon } from '../components/Icons';
import HonestyBadge from '../components/HonestyBadge';
import { isValidReflection } from '../data/honestyGuard';
import { sfx } from '../audio/sound';
import { colors, monoFont, displayFont, bodyFont, bodyFontHeavy } from '../theme';

// ─────────────────────────────────────────────────────────────
// BASELINE WEEK — the honest 7-day gate.
//
//   DAY 1–5   one ranked match a day. After each match you WATCH
//             the recording, NAME the moments where you failed,
//             then analyse EACH one (thinking / cause / why /
//             different / the rest) — your words, never ours.
//   DAY 6     the week so far — every named moment back, one
//             reflection, no match.
//   DAY 7     the ambition question, then the sealed profile card.
//
// Nothing is bombarded: the next day unlocks 24h after the previous
// one is sealed, so there is always a full day to think. Lateness is
// never punished — the academy just waits.
// Phases: TALK → ×5 DAY (ARM → MATCH → WATCH/NAME → ANALYSE → DAY Q)
//         → REST → WEEK REFLECTION → AMBITION → SEALED CARD.
// ─────────────────────────────────────────────────────────────

const MIN_ANSWER = 12;

type Phase = 'talk' | 'day' | 'locked' | 'reflection' | 'ambition' | 'card';
type DayStep = 'start' | 'match' | 'review' | 'analysis' | 'dayq';

interface DraftMoment {
  id: string;
  name: string;
  startMin: number;
  endMin: number;
  tag: string | null;
  analysis: Partial<Record<BaselineAnalysisKey, string>>;
}

function Stepper({ value, onChange, accent }: { value: number; onChange: (n: number) => void; accent?: boolean }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(Math.max(0, value - 1))} hitSlop={10} style={styles.stepBtn}>
        <Text style={styles.stepBtnTxt}>−</Text>
      </Pressable>
      <Text style={[styles.stepValue, accent && { color: colors.primary }]}>{value}</Text>
      <Pressable onPress={() => onChange(Math.min(9, value + 1))} hitSlop={10} style={styles.stepBtn}>
        <Text style={styles.stepBtnTxt}>+</Text>
      </Pressable>
    </View>
  );
}

/** the week strip — 7 pills: done / today / locked / future */
function WeekStrip({ session, now }: { session: BaselineSession | null; now: number }) {
  return (
    <View style={styles.weekStrip}>
      {Array.from({ length: BASELINE_DAYS }).map((_, i) => {
        const day = i + 1;
        const st: BaselineDayStatus = dayStatus(session, day);
        const pill =
          st === 'done' ? styles.dayPillDone : st === 'today' ? styles.dayPillNow : st === 'locked' ? styles.dayPillLocked : styles.dayPillFuture;
        const txt =
          st === 'done' ? styles.dayPillTxtDone : st === 'today' ? styles.dayPillTxtNow : styles.dayPillTxtMuted;
        return (
          <View key={day} style={[styles.dayPill, pill]}>
            <Text style={[styles.dayPillTxt, txt]}>{day}</Text>
          </View>
        );
      })}
    </View>
  );
}

const GUIDE_KEY = 'psa.baseline.guide.v1';
const GUIDE_STEPS = [
  ['YOUR WEEK MAP', 'These seven markers show completed days, today, and what is still ahead. You will play five matches; Days 4 and 6 are intentional rest and reflection days.'],
  ['WHAT TO DO FIRST', 'Start with a normal match. Record it if you can, then come back while the key moments are fresh. You are not trying to create a perfect result.'],
  ['ANSWER THE EVIDENCE', 'Use the score, head-state choices and reflection fields to describe what actually happened — especially a mistake, setback, or decision you would change.'],
  ['SAVE & RETURN', 'Each completed scan adds evidence to your starting profile. Seal the day, then return when the next match unlocks.'],
] as const;

function BaselineGuide({ index, onNext, onBack, onSkip }: { index: number; onNext: () => void; onBack: () => void; onSkip: () => void }) {
  const [title, body] = GUIDE_STEPS[index];
  return <View style={styles.guideBox} accessibilityRole="summary">
    <Text style={styles.guideArrow}>↓</Text>
    <View style={styles.guideCopy}><Text style={styles.guideKicker}>QUICK TOUR · {index + 1}/{GUIDE_STEPS.length}</Text><Text style={styles.guideTitle}>{title}</Text><Text style={styles.guideBody}>{body}</Text></View>
    <View style={styles.guideActions}>
      {index > 0 && <Pressable onPress={onBack} hitSlop={8}><Text style={styles.guideBack}>‹ BACK</Text></Pressable>}
      <Pressable onPress={onNext} style={styles.guideNext}><Text style={styles.guideNextTxt}>{index === GUIDE_STEPS.length - 1 ? 'GOT IT' : 'NEXT ›'}</Text></Pressable>
    </View>
    <Pressable onPress={onSkip} hitSlop={8}><Text style={styles.guideSkip}>SKIP TOUR</Text></Pressable>
  </View>;
}

function HelpCard({ title = 'WHY WE ASK THIS', children }: { title?: string; children: React.ReactNode }) {
  return <View style={styles.helpCard}><Text style={styles.helpTitle}>?  {title}</Text><Text style={styles.helpText}>{children}</Text></View>;
}

function momentComplete(m: DraftMoment): boolean {
  return BASELINE_MOMENT_QUESTIONS.every(
    (q) => (m.analysis[q.key] ?? '').trim().length >= BASELINE_MOMENT_MIN_ANSWER,
  );
}

function hms(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function BaselineScanScreen({ coach, onDone }: { coach: Coach; onDone: () => void }) {
  const { width: winW } = useWindowDimensions();
  const bandW = Math.min(winW, 430);
  const script = useMemo(() => BASELINE_SCRIPTS[coach.id] ?? BASELINE_SCRIPTS.chinedu, [coach.id]);
  const [session, setSession] = useState<BaselineSession | null>(null);
  const [phase, setPhase] = useState<Phase>('talk');
  const [step, setStep] = useState<DayStep>('start');
  const [notReady, setNotReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const scrollRef = useRef<ScrollView>(null);

  // ── the day's local drafts ──
  const [gf, setGf] = useState(0);
  const [ga, setGa] = useState(0);
  const [touched, setTouched] = useState(false);
  const [composure, setComposure] = useState<number | null>(null);
  const [moments, setMoments] = useState<DraftMoment[]>([]);
  const [dayAnswer, setDayAnswer] = useState('');
  const [momentName, setMomentName] = useState('');
  const [momentStart, setMomentStart] = useState(0);
  const [momentEnd, setMomentEnd] = useState(5);
  const [reflection, setReflection] = useState({ repeated: '', changed: '' });
  const [ambition, setAmbition] = useState('');
  const [sealing, setSealing] = useState(false);
  const [guideStep, setGuideStep] = useState<number | null>(null);
  const seq = useRef(1);

  const day = currentBaselineDay(session);
  const complete = isWeekComplete(session);

  useEffect(() => { void AsyncStorage.getItem(GUIDE_KEY).then((seen) => { if (!seen) setGuideStep(0); }); }, []);

  const dismissGuide = () => { setGuideStep(null); void AsyncStorage.setItem(GUIDE_KEY, 'seen'); };

  // ── boot: restore where the player left off ──
  useEffect(() => {
    void loadBaseline(coach.id).then((s) => {
      setSession(s);
      if (s.card) setPhase('card');
      else if (currentBaselineDay(s) > BASELINE_DAYS) setPhase('ambition');
      else if (isBaselineRestDay(currentBaselineDay(s))) {
        setPhase(dayStatus(s, currentBaselineDay(s)) === 'locked' ? 'locked' : 'reflection');
      } else if (currentBaselineDay(s) > 1 && currentBaselineDay(s) <= BASELINE_DAYS) {
        setPhase(dayStatus(s, currentBaselineDay(s)) === 'locked' ? 'locked' : 'day');
      } else {
        setPhase(s.entries.length > 0 ? 'day' : 'talk');
      }
    });
  }, [coach.id]);

  // tick for the REST-day countdown
  useEffect(() => {
    if (phase !== 'locked') return;
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, [phase]);

  const first = coach.name.split(' ')[0].toUpperCase();
  const result = resultOf({ gf, ga });
  const played = touched || gf > 0 || ga > 0;
  const question = useMemo(() => {
    const bank = script.questions[result];
    return bank[(Math.max(1, day) - 1) % bank.length];
  }, [script, result, day]);
  const beat = played ? script.beats[beatKey(gf, ga)] : null;
  const allMomentsDone = moments.length > 0 && moments.every(momentComplete);
  const canSealDay =
    composure !== null && allMomentsDone && isValidReflection(dayAnswer, { minLength: MIN_ANSWER, minWords: 2, prompt: question });
  const unlockAt = nextUnlockAt(session);
  const lastEntry = session?.entries[session.entries.length - 1] ?? null;

  /** seal the day: file the match + the named moments, then REST */
  const sealDay = () => {
    if (!canSealDay || !session) return;
    sfx('whoosh');
    const filed: BaselineMoment[] = moments.map((m) => ({
      id: m.id,
      name: m.name,
      startMin: m.startMin,
      endMin: m.endMin,
      tag: m.tag,
      when: `${m.startMin}’–${m.endMin}’`,
      kind: m.tag ?? 'FAIL MOMENT',
      answer: (m.analysis.happened ?? '').trim(),
      analysis: m.analysis,
    }));
    recordBaselineMatch(
      {
        gf,
        ga,
        result,
        composure: composure as number,
        question,
        answer: dayAnswer.trim(),
        moments: filed,
      },
    );
    sealBaselineDay(day);
    // reset the day's drafts
    setGf(0);
    setGa(0);
    setTouched(false);
    setComposure(null);
    setMoments([]);
    setDayAnswer('');
    setMomentName('');
    setMomentStart(0);
    setMomentEnd(5);
    setStep('start');
    void loadBaseline(coach.id).then((s) => {
      setSession({ ...s });
      const d = currentBaselineDay(s);
      if (d > BASELINE_DAYS) {
        setPhase('ambition');
      } else {
        setPhase('locked'); // the next day unlocks tomorrow
      }
      // schedule the nudge for the day that just unlocked (fires at its
      // unlock time even if the app is closed — fails soft if denied)
      const nxt = nextUnlockAt(s);
      if (d <= BASELINE_DAYS && nxt != null) {
        void scheduleBaselineUnlock(d, nxt);
      }
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    });
  };

  /** day 6 — seal the week's reflection, day 7 unlocks tomorrow */
  const sealReflection = () => {
    if (!isValidReflection(reflection.repeated, { minLength: MIN_ANSWER, minWords: 2 }) || !isValidReflection(reflection.changed, { minLength: MIN_ANSWER, minWords: 2 }) || !session) return;
    sfx('whoosh');
    saveBaselineReflection(reflection.repeated, reflection.changed);
    sealBaselineDay(6);
    void loadBaseline(coach.id).then((s) => {
      setSession({ ...s });
      setPhase('locked'); // day 7 unlocks tomorrow
      const nxt = nextUnlockAt(s);
      if (nxt != null) void scheduleBaselineUnlock(7, nxt); // DAY 7 — THE LAST QUESTION
    });
  };

  /** day 7 — the ambition question, then the card seals */
  const seal = async () => {
    if (!isValidReflection(ambition, { minLength: MIN_ANSWER, minWords: 2 }) || sealing) return;
    setSealing(true);
    const card = await sealBaseline(getSettings().displayName, coach.id, ambition.trim());
    sfx('success');
    const s = await loadBaseline(coach.id);
    setSession({ ...s, card });
    setPhase('card');
    setSealing(false);
  };

  /** begin the console match; all evidence is logged manually */
  const startMatch = async () => {
    sfx('whoosh');
    setStep('match');
  };

  /** full time: log the score manually */
  const logScore = () => {
    sfx('whoosh');
    setStep('review');
  };

  const addMoment = () => {
    const name = momentName.trim();
    if (name.length < 2) return;
    sfx('pop');
    setMoments((prev) => [
      ...prev,
      {
        id: `BM${Date.now().toString(36)}${(seq.current++).toString(36)}`,
        name,
        startMin: Math.max(0, Math.min(44, momentStart)),
        endMin: Math.max(momentStart, Math.min(45, momentEnd)),
        tag: null,
        analysis: {},
      },
    ]);
    setMomentName('');
    setMomentEnd(Math.min(45, momentStart + 5));
  };

  const setMomentAnalysis = (id: string, key: BaselineAnalysisKey, text: string) => {
    setMoments((prev) => prev.map((m) => (m.id === id ? { ...m, analysis: { ...m.analysis, [key]: text } } : m)));
  };

  const tendencies = useMemo(() => tendenciesOf(session?.entries ?? []), [session]);
  const allWeekMoments = useMemo(() => weekMoments(session), [session]);

  return (
    <View style={styles.root}>
      <GridBackground />
      {/* the boots strip — the week starts from where you actually stand */}
      <ArtBand source={BOOTS} width={bandW} height={118} warmAt={{ x: bandW * 0.3, y: 34, r: bandW * 0.5 }} grain={0.05} />

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View key={phase + day} entering={FadeIn.duration(280)}>
          {/* ════ TALK — the serious gate (day 1, before anything) ════ */}
          {phase === 'talk' && (
            <>
              <Text style={styles.eyebrow}>BEFORE YOUR JOURNEY UNLOCKS</Text>
              <Text style={styles.title}>THE BASELINE WEEK</Text>
              <Text style={styles.sub}>ONE MATCH A DAY · SEVEN DAYS · NO SHORTCUTS</Text>


              <View style={styles.coachRow}>
                <CoachPresence size={44}>
                  <Image source={coach.portrait} style={styles.coachFace} />
                </CoachPresence>
                <Text style={styles.coachName}>{first} · ON THE GATE</Text>
              </View>

              {script.talk.map((b, i) => (
                <Animated.View key={i} entering={FadeInUp.delay(200 + i * 260).duration(300)} style={styles.beat}>
                  <View style={[styles.quoteBar, { backgroundColor: coach.cardAccent }]} />
                  <Text style={styles.beatTxt}>{b}</Text>
                </Animated.View>
              ))}

              <Animated.View entering={FadeInUp.delay(200 + script.talk.length * 260).duration(300)} style={styles.bluffBox}>
                <Text style={styles.bluffLabel}>HOW THIS WEEK WORKS</Text>
                <Text style={styles.bluffTxt}>
                  One match a day, five days, a week to do it. Play it, watch the recording, name the moments you
                  failed, then answer for each one honestly. The next day only unlocks 24 hours later — the gap is
                  the point. It gives you time to think. The academy doesn't carry passengers.
                </Text>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(200 + (script.talk.length + 1) * 260).duration(300)} style={styles.bluffBox}>
                <Text style={styles.bluffLabel}>HIS HOUSE RULE</Text>
                <Text style={styles.bluffTxt}>“{script.bluff}”</Text>
              </Animated.View>

              <Pressable onPress={() => { sfx('whoosh'); setPhase('day'); setStep('start'); }} style={styles.cta}>
                <Text style={styles.ctaTxt}>I'M IN — START DAY 1</Text>
              </Pressable>
              <Pressable onPress={() => setNotReady((v) => !v)} hitSlop={8}>
                <Text style={styles.skipLink}>{notReady ? 'UNDERSTOOD — THIS GATE STAYS REAL' : 'NOT READY?'}</Text>
              </Pressable>
              {notReady && (
                <Text style={styles.notReadyTxt}>
                  Then the journey waits. The academy does not remove you for thinking — but it does not carry
                  passengers either. Come back when you mean it; this screen will be here. That is not harshness,
                  that is us being serious about what we do.
                </Text>
              )}
            </>
          )}

          {/* ════ A MATCH DAY: ARM → MATCH → WATCH/NAME → ANALYSE → DAY Q ════ */}
          {phase === 'day' && day <= BASELINE_DAYS && (
            <>
              <Text style={styles.eyebrow}>BASELINE WEEK · DAY {day} OF {BASELINE_DAYS} · MATCH {matchNumberForDay(session, day)} OF {BASELINE_MATCHES}</Text>
              <WeekStrip session={session} now={now} />
              {guideStep !== null && <BaselineGuide index={guideStep} onBack={() => setGuideStep(n => Math.max(0, (n ?? 0) - 1))} onNext={() => { if (guideStep >= GUIDE_STEPS.length - 1) dismissGuide(); else setGuideStep(guideStep + 1); }} onSkip={dismissGuide} />}
              <Pressable onPress={() => setGuideStep(0)} hitSlop={8}><Text style={styles.replayGuide}>?  SHOW ME HOW BASELINE WEEK WORKS</Text></Pressable>

              {day > 1 && (
                <View style={styles.dayIntro}>
                  <Image source={coach.portrait} style={styles.beatFace} />
                  <Text style={styles.dayIntroTxt}>{BASELINE_DAY_INTRO[coach.id]?.[day] ?? BASELINE_DAY_INTRO.chinedu?.[day]}</Text>
                </View>
              )}

              {/* ── ARM (PRE-MATCH MANUAL BRIEFING) ── */}
              {step === 'start' && (
                <Animated.View entering={FadeInUp.duration(300)}>
                  <Text style={styles.heroLine}>THE CHINEDU WAY — PEN TO PAPER BEFORE YOU TYPE.</Text>
                  <Text style={styles.heroSub}>
                    1. RECORD & WATCH: Record your console match as usual before kick-off (PS Share / Xbox Capture / capture card), play your match, then watch your tape back.
                    {'\n'}2. PEN TO PAPER: There is a special connection a biro has to a book that cannot be typed. Write down your key moments, unusual things that happened, and answer the guiding questions on paper first.
                    {'\n'}3. WRITE IT STRAIGHT AWAY: Immediately after full time, write what happened, how it made you feel and what you think caused it — before the details fade.
                    {'\n'}4. LOG TO DATABASE: Open the app and type your honest notes into your database while the match is still fresh.
                  </Text>
                  <HelpCard title="YOUR MATCH-DAY CHECKLIST">Play normally. Immediately after full time, write the moments that changed the match, how you felt and what may have caused them. Then return here and log the evidence. A loss or mistake is useful evidence — not a failed day.</HelpCard>
                  <View style={styles.armNote}>
                    <Text style={styles.armNoteTxt}>
                      IN A WORLD LOOKING FOR THE EASY WAY OUT: THE HARD WAY IS THE EASY WAY, AND THE EASY WAY IS THE HARD WAY. TECH IS MEANT TO ELEVATE AND NOT MAKE YOU DORMANT.
                    </Text>
                  </View>
                  <Pressable onPress={() => void startMatch()} style={[styles.cta, { opacity: 0.95 }]}>
                    <Text style={styles.ctaTxt}>I HAVE READ THE RITUAL — START THE MATCH ›</Text>
                  </Pressable>
                  <Pressable onPress={() => setPhase('locked')} style={styles.ghostCtaWrap} hitSlop={6}>
                    <Text style={styles.ghostCta}>REST DAY — COME BACK TOMORROW</Text>
                  </Pressable>
                </Animated.View>
              )}

              {/* ── MATCH: score + head state ── */}
              {step === 'match' && (
                <Animated.View entering={FadeInUp.duration(300)}>
                  <Text style={styles.heroLine}>PLAYED. FULL TIME — WHAT WAS THE SCORE?</Text>
                  <View style={styles.scoreCard}>
                    <View style={styles.scoreSide}>
                      <Text style={styles.scoreLabel}>YOU</Text>
                      <Stepper value={gf} onChange={(n) => { setTouched(true); setGf(n); }} accent={result === 'W'} />
                    </View>
                    <View style={[styles.pill, result === 'W' && styles.pillW, result === 'D' && styles.pillD, result === 'L' && styles.pillL]}>
                      <Text style={styles.pillTxt}>{result}</Text>
                    </View>
                    <View style={styles.scoreSide}>
                      <Text style={styles.scoreLabel}>THEM</Text>
                      <Stepper value={ga} onChange={(n) => { setTouched(true); setGa(n); }} accent={result === 'L'} />
                    </View>
                  </View>
                  {beat && (
                    <Animated.View entering={FadeInUp.duration(280)} style={styles.beatBubble}>
                      <Image source={coach.portrait} style={styles.beatFace} />
                      <Text style={styles.beatBubbleTxt}>{beat}</Text>
                    </Animated.View>
                  )}
                  {played && (
                    <>
                      <Text style={styles.fieldLabel}>YOUR HEAD, FULL 90</Text>
                      <View style={styles.chipRow}>
                        {COMPOSURE_LABELS.map((label, i) => (
                          <Pressable
                            key={label}
                            onPress={() => setComposure(composure === i + 1 ? null : i + 1)}
                            style={[styles.chip, composure === i + 1 && styles.chipActive]}
                          >
                            <Text style={[styles.chipTxt, composure === i + 1 && styles.chipTxtActive]}>{label}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <Pressable onPress={logScore} style={styles.cta}>
                        <Text style={styles.ctaTxt}>FULL TIME — UNLOCK THE EVIDENCE ›</Text>
                      </Pressable>
                    </>
                  )}
                  {!played && <Text style={styles.requireTxt}>SET THE SCORE FIRST — THEN WE MOVE.</Text>}
                </Animated.View>
              )}

              {/* ── REVIEW: watch the recording, NAME the moments where you failed ── */}
              {step === 'review' && (
                <Animated.View entering={FadeInUp.duration(300)}>
                  <Text style={styles.heroLine}>WATCH THE EVIDENCE. NAME THE MOMENTS WHERE YOU FAILED.</Text>
                  <Text style={styles.heroSub}>
                    Your job first — the app never picks your moments for you. Watch, stop at the moments that cost you,
                    give each one a name. Then we analyse them one at a time.
                  </Text>
                  <HelpCard title="WRITE THIS IMMEDIATELY AFTER FULL TIME">Before you replay or explain the result away, write the turning point in your own words. Then say how you felt and what you believe caused it: pressure, panic, rushing, a forced pass, loss of focus or something else.</HelpCard>
                  <View style={styles.armNote}>
                    <Text style={styles.armNoteTxt}>OPEN YOUR IMMEDIATE NOTES: Watch your own tape, then type the key moments, how you felt and what you think caused each one while the match is still clear.</Text>
                  </View>

                  <View style={styles.momentCard}>
                    <Text style={styles.qLabel}>NAME THE MOMENT (YOUR WORDS)</Text>
                    <TextInput
                      value={momentName}
                      onChangeText={setMomentName}
                      placeholder="e.g. CONCEDED AFTER A PANIC PASS"
                      placeholderTextColor="rgba(143,184,155,0.35)"
                      style={styles.inputSmall}
                    />
                    <Text style={styles.qLabel}>TIMELINE (MATCH MINUTES)</Text>
                    <View style={styles.minRow}>
                      <MiniStat label="FROM" value={`${momentStart}’`} />
                      <MiniStat label="TO" value={`${momentEnd}’`} />
                      <View style={styles.minButtons}>
                        <Pressable onPress={() => setMomentStart((s) => Math.max(0, s - 1))} style={styles.stepBtn}><Text style={styles.stepBtnTxt}>−</Text></Pressable>
                        <Pressable onPress={() => setMomentStart((s) => Math.min(44, s + 1))} style={styles.stepBtn}><Text style={styles.stepBtnTxt}>+</Text></Pressable>
                        <Pressable onPress={() => setMomentEnd((e) => Math.max(momentStart + 1, e - 1))} style={styles.stepBtn}><Text style={styles.stepBtnTxt}>−</Text></Pressable>
                        <Pressable onPress={() => setMomentEnd((e) => Math.min(45, e + 1))} style={styles.stepBtn}><Text style={styles.stepBtnTxt}>+</Text></Pressable>
                      </View>
                    </View>
                    <Text style={styles.qLabel}>WHAT KIND (OPTIONAL — FEEDS YOUR WEEK SUMMARY)</Text>
                    <View style={styles.tagRow}>
                      {BASELINE_MOMENT_TAGS.map((tag) => (
                        <Pressable
                          key={tag}
                          onPress={() => {
                            sfx('pop');
                            setMoments((prev) =>
                              prev.length
                                ? prev.map((m, i) => (i === prev.length - 1 ? { ...m, tag: m.tag === tag ? null : tag } : m))
                                : [{ id: `BM${Date.now().toString(36)}${(seq.current++).toString(36)}`, name: momentName.trim() || tag, startMin: momentStart, endMin: momentEnd, tag, analysis: {} }],
                            );
                          }}
                          style={[styles.tagChip, moments[moments.length - 1]?.tag === tag && styles.tagChipOn]}
                        >
                          <Text style={[styles.tagTxt, moments[moments.length - 1]?.tag === tag && styles.tagTxtOn]}>{tag}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <Pressable onPress={addMoment} style={[styles.cta, momentName.trim().length < 2 && { opacity: 0.35 }]}>
                    <Text style={styles.ctaTxt}>ADD THIS MOMENT ›</Text>
                  </Pressable>

                  {moments.map((m, i) => (
                    <View key={m.id} style={styles.momentChip}>
                      <Text style={styles.momentChipTxt}>{i + 1}. {m.startMin}’–{m.endMin}’ · {m.name.toUpperCase()}{m.tag ? ` · ${m.tag}` : ''}</Text>
                      <Pressable hitSlop={8} onPress={() => setMoments((prev) => prev.filter((x) => x.id !== m.id))}>
                        <Text style={styles.removeTxt}>✕</Text>
                      </Pressable>
                    </View>
                  ))}

                  <Pressable
                    onPress={() => { sfx('whoosh'); setStep('analysis'); }}
                    style={[styles.cta, moments.length === 0 && { opacity: 0.35 }]}
                  >
                    <Text style={styles.ctaTxt}>MY MOMENTS ARE NAMED — ANALYSE THEM ›</Text>
                  </Pressable>
                  {moments.length === 0 && (
                    <Text style={styles.requireTxt}>NAME AT LEAST ONE MOMENT WHERE YOU FAILED — THAT IS THE DAY'S WORK.</Text>
                  )}
                </Animated.View>
              )}

              {/* ── ANALYSIS: every moment, every question, your words ── */}
              {step === 'analysis' && (
                <Animated.View entering={FadeInUp.duration(300)}>
                  <Text style={styles.heroLine}>EVERY MOMENT, ANALYSED BY YOU.</Text>
                  <Text style={styles.heroSub}>
                    The app never writes your psychology. It just keeps the questions in front of you, one moment at a
                    time, until your own answers say what actually happened.
                  </Text>
                  {moments.map((m, mi) => (
                    <View key={m.id} style={styles.analysisBlock}>
                      <View style={styles.analysisHead}>
                        <EyeIcon size={12} color={colors.accent} />
                        <Text style={styles.analysisHeadTxt}>MOMENT {mi + 1} · {m.startMin}’–{m.endMin}’ · {m.name.toUpperCase()}</Text>
                      </View>
                      <View style={styles.armNote}>
                        <Text style={styles.armNoteTxt}>
                          THE CHINEDU WAY: Have the notes you wrote immediately after full time in front of you. Type your truth about what happened, how you felt and what you believe caused it.
                        </Text>
                      </View>
                      {BASELINE_MOMENT_QUESTIONS.map((q, qi) => (
                        <View key={q.key} style={styles.aqCard}>
                          <Text style={styles.aqLabel}>{q.label}</Text>
                          <Text style={styles.aqHint}>Think about the decision, feeling or trigger in this exact moment. There is no correct answer — write what was true.</Text>
                          <TextInput
                            value={m.analysis[q.key] ?? ''}
                            onChangeText={(t) => setMomentAnalysis(m.id, q.key, t)}
                            placeholder="YOUR WORDS — NOBODY ELSE'S"
                            placeholderTextColor="rgba(143,184,155,0.35)"
                            style={styles.inputSmall}
                            multiline
                          />
                          <Text style={styles.aqCount}>
                            {((m.analysis[q.key] ?? '').trim().length)}/{BASELINE_MOMENT_MIN_ANSWER}+
                          </Text>
                        </View>
                      ))}
                      {momentComplete(m) ? (
                        <Text style={styles.momentDoneTxt}>✓ MOMENT {mi + 1} ANALYSED</Text>
                      ) : (
                        <Text style={styles.requireTxt}>ANSWER EVERY QUESTION ({BASELINE_MOMENT_MIN_ANSWER}+ CHARACTERS EACH)</Text>
                      )}
                    </View>
                  ))}
                  <Pressable
                    onPress={() => { sfx('whoosh'); setStep('dayq'); }}
                    style={[styles.cta, !allMomentsDone && { opacity: 0.35 }]}
                  >
                    <Text style={styles.ctaTxt}>ANALYSIS DONE — THE DAY QUESTION ›</Text>
                  </Pressable>
                </Animated.View>
              )}

              {/* ── DAY QUESTION + SEAL ── */}
              {step === 'dayq' && (
                <Animated.View entering={FadeInUp.duration(300)}>
                  <Text style={styles.heroLine}>ONE LAST QUESTION FOR DAY {day}.</Text>
                  <View style={styles.questionCard}>
                    <Image source={coach.portrait} style={styles.beatFace} />
                    <Text style={styles.questionTxt}>{question}</Text>
                  </View>
                  <HelpCard>Use a real example from this match. We are looking for the pattern behind the result, not the answer that sounds strongest.</HelpCard>
                  <TextInput
                    value={dayAnswer}
                    onChangeText={(t) => setDayAnswer(t.slice(0, 500))}
                    placeholder="THINK. THEN ANSWER — YOUR WORDS, NOT OURS."
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    multiline
                    maxLength={500}
                  />
                  <HonestyBadge
                    text={dayAnswer}
                    options={{ minLength: MIN_ANSWER, minWords: 2, prompt: question }}
                    defaultNote={`YOUR WORDS, YOUR TRUTH — ${first} READS THIS`}
                    coachId={coach.id}
                  />
                  <Pressable onPress={sealDay} style={[styles.cta, !canSealDay && { opacity: 0.35 }]}>
                    <Text style={styles.ctaTxt}>
                      {day >= BASELINE_MATCHES ? 'SEAL DAY 5 — THE WEEK SO FAR UNLOCKS TOMORROW' : `SEAL DAY ${day} — MATCH ${day + 1} UNLOCKS TOMORROW`}
                    </Text>
                  </Pressable>
                  {!canSealDay && (
                    <Text style={styles.requireTxt}>
                      ANSWER THE QUESTION ({MIN_ANSWER}+), FINISH EVERY MOMENT ANALYSIS, PICK YOUR HEAD STATE — THEN WE MOVE
                    </Text>
                  )}
                </Animated.View>
              )}
            </>
          )}

          {/* ════ REST — the 24h gap, on purpose ════ */}
          {phase === 'locked' && (
            <Animated.View entering={FadeInUp.duration(300)} style={styles.restCard}>
              <Text style={styles.eyebrow}>BASELINE WEEK · DAY {day} OF {BASELINE_DAYS}</Text>
              <View style={styles.restIcon}>
                <LockIcon size={16} color={colors.accent} />
              </View>
              <Text style={styles.restTitle}>REST. THE WORK NEEDS TONIGHT.</Text>
              <Text style={styles.restLine}>{BASELINE_REST_LINES[coach.id] ?? BASELINE_REST_LINES.chinedu}</Text>
              {unlockAt != null && (
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownLabel}>DAY {day} UNLOCKS IN</Text>
                  <Text style={styles.countdownTxt}>{hms(unlockAt - now)}</Text>
                  <Text style={styles.countdownNote}>ONE TASK A DAY IS THE CONTRACT. NOTHING IS FORCED — THE ACADEMY JUST WAITS.</Text>
                </View>
              )}
              <WeekStrip session={session} now={now} />
              <View style={styles.nextBox}><Text style={styles.nextLabel}>WHAT HAPPENS NEXT</Text><Text style={styles.nextText}>Your last scan is now part of your starting profile. Play your next normal match, then return here while the moments are still fresh.</Text></View>

              {/* yesterday's review, still warm */}
              {lastEntry && (
                <View style={styles.lastReview}>
                  <Text style={styles.lastReviewTag}>YOUR LAST REVIEW — DAY {session?.days.find((d) => d.entryIndex === session.entries.length - 1)?.day ?? day - 1}</Text>
                  <Text style={styles.lastReviewScore}>
                    {lastEntry.result} {lastEntry.gf}–{lastEntry.ga} · HEAD {lastEntry.composure}/5
                  </Text>
                  {(lastEntry.moments ?? []).map((m) => (
                    <Text key={m.id} style={styles.lastReviewMoment}>
                      · {m.startMin}’–{m.endMin}’ {m.name.toUpperCase()}
                    </Text>
                  ))}
                  <Text style={styles.lastReviewQ}>“{lastEntry.question}”</Text>
                  <Text style={styles.lastReviewA}>{lastEntry.answer}</Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* ════ DAY 4 / DAY 6 — THE REST & REFLECTION DAYS (NO MATCH) ════ */}
          {phase === 'reflection' && (
            <Animated.View entering={FadeInUp.duration(300)}>
              <Text style={styles.eyebrow}>
                {day === 4
                  ? `BASELINE WEEK · DAY 4 OF ${BASELINE_DAYS} · REST DAY 1 (NO MATCH TODAY)`
                  : `BASELINE WEEK · DAY 6 OF ${BASELINE_DAYS} · REST DAY 2 (PRE-FINALE PREPARATION)`}
              </Text>
              <WeekStrip session={session} now={now} />
              <Text style={styles.heroLine}>
                {day === 4
                  ? 'MOMENTUM IS BUILT. TODAY YOU REST AND REFLECT.'
                  : 'REST AND RECALIBRATE BEFORE THE FINALE.'}
              </Text>
              <Text style={styles.heroSub}>
                {day === 4
                  ? 'Realistically, you have a life outside the pitch. Momentum has been built over your first three matches — now you take a rest day. Tech is meant to elevate and not make you dormant: step away from the screen, take your biro and paper, and reflect on the patterns from your first three matches.'
                  : 'In a world where everyone is looking for the easy way out, we tell you that the hard way is the easy way, and the easy way is the hard way. Tomorrow is your 5th and final baseline match. Today you rest. Take your biro and paper: set your non-negotiable standards for the finale tomorrow.'}
              </Text>

              <View style={styles.receiptBox}>
                <Text style={styles.receiptTag}>THE MOMENTS YOU NAMED SO FAR</Text>
                {allWeekMoments.length === 0 && <Text style={styles.receiptEmpty}>None yet — the week is waiting.</Text>}
                {session?.entries.map((e, ei) => (
                  <View key={ei} style={styles.receiptEntry}>
                    <Text style={styles.receiptEntryHead}>MATCH {ei + 1} · {e.result} {e.gf}–{e.ga} · HEAD {e.composure}/5</Text>
                    {(e.moments ?? []).map((m) => (
                      <Text key={m.id} style={styles.receiptMoment}>
                        · {m.startMin}’–{m.endMin}’ {m.name.toUpperCase()}
                        {m.tag ? ` — ${m.tag}` : ''}
                      </Text>
                    ))}
                  </View>
                ))}
                {tendencies.length > 0 && (
                  <View style={styles.tendencyWrap}>
                    <Text style={styles.receiptTag}>WHAT KEEPS APPEARING</Text>
                    <View style={styles.tendencyRow}>
                      {tendencies.map((t) => (
                        <View key={t} style={styles.tendencyPill}>
                          <Text style={styles.tendencyTxt}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <Text style={styles.fieldLabel}>
                {day === 4 ? 'WHAT PATTERN HAVE YOU REPEATED ACROSS MATCHES 1–3?' : 'WHAT DO YOU KEEP REPEATING ACROSS MATCHES 1–4?'}
              </Text>
              <TextInput
                value={reflection.repeated}
                onChangeText={(t) => setReflection((r) => ({ ...r, repeated: t }))}
                placeholder="LOOK AT THE MOMENTS ABOVE. THE PATTERN IS YOURS."
                placeholderTextColor={colors.muted}
                style={styles.input}
                multiline
              />
              <HonestyBadge
                text={reflection.repeated}
                options={{ minLength: MIN_ANSWER, minWords: 2 }}
                defaultNote="NAMING THE REPETITION IS THE FIRST STEP TO CLOSING IT"
                coachId={coach.id}
              />

              <Text style={styles.fieldLabel}>
                {day === 4 ? 'HOW WILL YOU BREAK THIS PATTERN IN MATCH 4 TOMORROW?' : 'WHAT IS YOUR ONE NON-NEGOTIABLE STANDARD FOR THE FINALE TOMORROW?'}
              </Text>
              <TextInput
                value={reflection.changed}
                onChangeText={(t) => setReflection((r) => ({ ...r, changed: t }))}
                placeholder="IN YOUR DECISIONS, NOT YOUR RESULTS — BE HONEST."
                placeholderTextColor={colors.muted}
                style={styles.input}
                multiline
              />
              <HonestyBadge
                text={reflection.changed}
                options={{ minLength: MIN_ANSWER, minWords: 2 }}
                defaultNote="IN YOUR DECISIONS, NOT YOUR RESULTS — BE HONEST"
                coachId={coach.id}
              />

              <Pressable
                onPress={sealReflection}
                style={[styles.cta, (!isValidReflection(reflection.repeated, { minLength: MIN_ANSWER, minWords: 2 }) || !isValidReflection(reflection.changed, { minLength: MIN_ANSWER, minWords: 2 })) && { opacity: 0.35 }]}
              >
                <Text style={styles.ctaTxt}>
                  {day === 4
                    ? 'SEAL REST DAY 1 — MATCH 4 UNLOCKS TOMORROW'
                    : 'SEAL REST DAY 2 — MATCH 5 (THE FINALE) UNLOCKS TOMORROW'}
                </Text>
              </Pressable>
            </Animated.View>
          )}

          {/* ════ DAY 7 — AMBITION ════ */}
          {phase === 'ambition' && (
            <>
              <Text style={styles.eyebrow}>BASELINE WEEK · DAY 7 · THE LAST QUESTION</Text>
              <WeekStrip session={session} now={now} />
              <View style={styles.coachRow}>
                <Image source={coach.portrait} style={styles.coachFace} />
                <Text style={styles.beatTxt}>{script.ambitionAsk}</Text>
              </View>
              <TextInput
                value={ambition}
                onChangeText={(t) => setAmbition(t.slice(0, 240))}
                placeholder="WHERE IS YOUR GAME GOING? THE REAL ANSWER."
                placeholderTextColor={colors.muted}
                style={styles.input}
                multiline
                maxLength={240}
              />
              <HonestyBadge
                text={ambition}
                options={{ minLength: MIN_ANSWER, minWords: 2 }}
                defaultNote="HE WILL BRING THIS BACK UP — COUNT ON IT"
                coachId={coach.id}
              />
              <Pressable onPress={() => void seal()} style={[styles.cta, !isValidReflection(ambition, { minLength: MIN_ANSWER, minWords: 2 }) && { opacity: 0.35 }]}>
                <Text style={styles.ctaTxt}>{sealing ? 'SEALING…' : 'SEAL MY BASELINE CARD'}</Text>
              </Pressable>
            </>
          )}

          {/* ════ SEALED CARD ════ */}
          {phase === 'card' && session?.card && (
            <Animated.View entering={FadeInUp.duration(360)}>
              <Text style={styles.eyebrow}>BASELINE WEEK · SEALED</Text>
              <View style={[styles.cardBox, { borderColor: coach.cardAccent }]}>
                <Text style={styles.cardTier}>{session.card.tier}</Text>
                <Text style={styles.cardHandle}>{session.card.handle}</Text>
                <Text style={styles.cardCoach}>UNDER COACH {first}</Text>

                <View style={styles.cardStats}>
                  <View style={styles.cardStat}><Text style={styles.cardStatV}>{session.card.w}–{session.card.d}–{session.card.l}</Text><Text style={styles.cardStatL}>W·D·L</Text></View>
                  <View style={styles.cardStat}><Text style={styles.cardStatV}>{session.card.gf}:{session.card.ga}</Text><Text style={styles.cardStatL}>GOALS</Text></View>
                  <View style={styles.cardStat}><Text style={styles.cardStatV}>{session.card.avgComposure.toFixed(1)}</Text><Text style={styles.cardStatL}>HEAD /5</Text></View>
                </View>

                <Text style={styles.cardReadLabel}>{first}'S READ:</Text>
                <Text style={styles.cardReadTxt}>“{session.card.coachRead}”</Text>
                {(session.card.tendencies?.length ?? 0) > 0 && (
                  <>
                    <Text style={styles.cardAmbLabel}>WHAT THE WEEK LEARNED ABOUT YOU:</Text>
                    <View style={styles.tendencyRow}>
                      {session.card.tendencies.map((t) => (
                        <View key={t} style={styles.tendencyPill}>
                          <Text style={styles.tendencyTxt}>{t}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.tendencyNote}>
                      YOUR TENDENCIES UNDER PRESSURE — THE FIRST THING YOUR MAIN QUESTS WILL WORK ON.
                    </Text>
                  </>
                )}
                <Text style={styles.cardAmbLabel}>YOUR AMBITION (HE REMEMBERS):</Text>
                <Text style={styles.cardAmbTxt}>“{session.card.ambition}”</Text>
              </View>

              <View style={styles.nextBox}><Text style={styles.nextLabel}>BASELINE COMPLETE</Text><Text style={styles.nextText}>You have finished the evidence-gathering phase. Your profile now gives tracking and coaching a truthful place to start.</Text></View>
              <Pressable onPress={onDone} style={styles.cta}>
                <CheckIcon size={12} color="#0a0f0a" />
                <Text style={styles.ctaTxt}>PROFILE SEALED — CONTINUE</Text>
              </Pressable>
            </Animated.View>
          )}

          {complete && !session?.card && phase !== 'ambition' && phase !== 'card' && (
            <Text style={styles.requireTxt}>THE WEEK IS COMPLETE — ONE LAST QUESTION AWAITS.</Text>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={styles.miniStatValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 42 },
  eyebrow: { color: colors.muted, fontFamily: monoFont, fontSize: 9, letterSpacing: 2, textAlign: 'center' },
  title: { color: colors.fg, fontFamily: displayFont, fontSize: 34, lineHeight: 35, letterSpacing: 0.8, textAlign: 'center', marginTop: 8 },
  sub: { color: colors.accent, fontFamily: monoFont, fontSize: 9, letterSpacing: 2, textAlign: 'center', marginTop: 8, marginBottom: 6 },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 4 },
  coachFace: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  coachName: { color: colors.muted, fontFamily: monoFont, fontSize: 10, letterSpacing: 1.6 },
  beat: { flexDirection: 'row', marginTop: 12, gap: 12 },
  quoteBar: { width: 3, borderRadius: 2, opacity: 0.6 },
  beatTxt: { flex: 1, color: '#dbe7dd', fontFamily: bodyFont, fontSize: 13, lineHeight: 20 },
  bluffBox: { marginTop: 18, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, padding: 14 },
  bluffLabel: { color: colors.accent, fontFamily: monoFont, fontSize: 8.5, letterSpacing: 2 },
  bluffTxt: { color: '#dbe7dd', fontFamily: bodyFont, fontSize: 12.5, lineHeight: 19, marginTop: 6 },
  cta: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaTxt: { color: '#0a0f0a', fontFamily: bodyFontHeavy, fontSize: 13.5, letterSpacing: 0.8 },
  skipLink: { color: colors.muted, fontFamily: bodyFont, fontSize: 11.5, letterSpacing: 0.4, textAlign: 'center', marginTop: 14 },
  notReadyTxt: { color: colors.muted, fontFamily: bodyFont, fontSize: 12, lineHeight: 18, marginTop: 10, textAlign: 'center' },

  guideBox: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(57,255,106,0.55)', borderRadius: 13, backgroundColor: 'rgba(14,30,18,0.98)', padding: 13 },
  guideArrow: { color: colors.primary, fontSize: 23, lineHeight: 22, textAlign: 'center' }, guideCopy: { marginTop: 3 }, guideKicker: { color: colors.primary, fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.7 }, guideTitle: { color: colors.fg, fontFamily: monoFont, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 5 }, guideBody: { color: '#b9cabe', fontFamily: bodyFont, fontSize: 11, lineHeight: 16, marginTop: 5 }, guideActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }, guideBack: { color: colors.muted, fontFamily: monoFont, fontSize: 8, letterSpacing: 1 }, guideNext: { backgroundColor: colors.primary, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 15 }, guideNextTxt: { color: '#0a0f0a', fontFamily: monoFont, fontSize: 8, fontWeight: '900', letterSpacing: 1 }, guideSkip: { color: colors.muted, fontFamily: monoFont, fontSize: 7.5, textAlign: 'right', letterSpacing: 1, marginTop: 9 }, replayGuide: { color: colors.primary, fontFamily: monoFont, fontSize: 7.5, textAlign: 'center', letterSpacing: 1.2, marginTop: 10 },
  helpCard: { marginTop: 12, borderLeftWidth: 2, borderLeftColor: colors.accent, borderRadius: 8, backgroundColor: 'rgba(242,192,120,0.07)', padding: 11 }, helpTitle: { color: colors.accent, fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.4 }, helpText: { color: '#cbd8cf', fontFamily: bodyFont, fontSize: 10.5, lineHeight: 15, marginTop: 5 }, aqHint: { color: '#9db4a3', fontFamily: bodyFont, fontSize: 9.5, lineHeight: 13, marginTop: 4 }, nextBox: { marginTop: 14, borderWidth: 1, borderColor: 'rgba(57,255,106,0.3)', borderRadius: 12, backgroundColor: 'rgba(57,255,106,0.06)', padding: 12 }, nextLabel: { color: colors.primary, fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.5 }, nextText: { color: '#cbd8cf', fontFamily: bodyFont, fontSize: 10.5, lineHeight: 15, marginTop: 5 },

  // ── week strip ──
  weekStrip: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14, marginBottom: 4 },
  dayPill: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayPillDone: { backgroundColor: 'rgba(57,255,106,0.15)', borderColor: colors.primary },
  dayPillNow: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayPillLocked: { backgroundColor: colors.surface, borderColor: 'rgba(143,184,155,0.4)' },
  dayPillFuture: { backgroundColor: 'transparent', borderColor: 'rgba(143,184,155,0.15)' },
  dayPillTxt: { fontFamily: monoFont, fontSize: 9.5, fontWeight: '800' },
  dayPillTxtDone: { color: colors.primary },
  dayPillTxtNow: { color: '#0a0f0a' },
  dayPillTxtMuted: { color: 'rgba(143,184,155,0.6)' },

  heroLine: { marginTop: 16, fontFamily: monoFont, fontSize: 12.5, fontWeight: '900', letterSpacing: 1.2, lineHeight: 18, color: colors.primary },
  heroSub: { marginTop: 7, fontSize: 10, lineHeight: 15, color: '#9db4a3' },
  dayIntro: { flexDirection: 'row', gap: 10, marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, padding: 12, alignItems: 'flex-start' },
  dayIntroTxt: { flex: 1, color: colors.warm, fontFamily: monoFont, fontSize: 11, lineHeight: 17, letterSpacing: 0.3 },
  armNote: { marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.surface, padding: 12 },
  armNoteTxt: { fontSize: 9.5, lineHeight: 14, color: '#9db4a3' },
  ghostCtaWrap: { marginTop: 12 },
  ghostCta: { color: colors.muted, fontFamily: monoFont, fontSize: 8.5, letterSpacing: 1.4, textAlign: 'center', textDecorationLine: 'underline' },

  // ── score ──
  scoreCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, paddingVertical: 16, paddingHorizontal: 20, marginTop: 14 },
  scoreSide: { alignItems: 'center' },
  scoreLabel: { color: colors.muted, fontFamily: monoFont, fontSize: 9, letterSpacing: 2, marginBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepBtnTxt: { color: colors.fg, fontFamily: monoFont, fontSize: 16 },
  stepValue: { color: colors.fg, fontFamily: monoFont, fontSize: 22, fontWeight: '700', minWidth: 22, textAlign: 'center' },
  pill: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  pillW: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.08)' },
  pillD: { borderColor: colors.muted },
  pillL: { borderColor: colors.loss, backgroundColor: 'rgba(224,96,92,0.08)' },
  pillTxt: { color: colors.fg, fontFamily: monoFont, fontSize: 13, fontWeight: '700' },
  beatBubble: { flexDirection: 'row', gap: 10, marginTop: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, padding: 12, alignItems: 'flex-start' },
  beatFace: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border },
  beatBubbleTxt: { flex: 1, color: colors.warm, fontFamily: monoFont, fontSize: 11, lineHeight: 17, letterSpacing: 0.3 },

  fieldLabel: { color: colors.muted, fontFamily: monoFont, fontSize: 9, letterSpacing: 2, marginTop: 18, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface },
  chipActive: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.1)' },
  chipTxt: { color: colors.muted, fontFamily: monoFont, fontSize: 9.5, letterSpacing: 1 },
  chipTxtActive: { color: colors.primary },
  requireTxt: { color: colors.muted, fontFamily: monoFont, fontSize: 8.5, letterSpacing: 1.4, marginTop: 12, textAlign: 'center' },

  // ── review / moments ──
  markRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  markBtn: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(242,192,120,0.5)', backgroundColor: 'rgba(38,30,12,0.5)', alignItems: 'center', justifyContent: 'center' },
  markBtnTxt: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.2, color: colors.accent },
  momentCard: { marginTop: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, padding: 13 },
  qLabel: { fontFamily: monoFont, fontSize: 7.2, fontWeight: '800', letterSpacing: 1.2, color: colors.fg, lineHeight: 11, marginTop: 10 },
  inputSmall: { marginTop: 7, borderWidth: 1, borderColor: 'rgba(57,255,106,0.18)', borderRadius: 8, backgroundColor: '#0a0f0a', color: colors.fg, fontFamily: monoFont, fontSize: 11, lineHeight: 17, padding: 10, minHeight: 42, textAlignVertical: 'top' },
  minRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  minButtons: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  miniStat: { flex: 1, borderWidth: 1, borderColor: 'rgba(57,255,106,0.25)', borderRadius: 10, backgroundColor: 'rgba(10,20,13,0.8)', paddingVertical: 10, alignItems: 'center', gap: 4 },
  miniStatLabel: { fontFamily: monoFont, fontSize: 5.4, letterSpacing: 1.4, color: 'rgba(143,184,155,0.65)' },
  miniStatValue: { fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 1, color: colors.primary },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  tagChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surface },
  tagChipOn: { borderColor: colors.accent, backgroundColor: 'rgba(242,192,120,0.1)' },
  tagTxt: { color: colors.muted, fontFamily: monoFont, fontSize: 7.5, letterSpacing: 1 },
  tagTxtOn: { color: colors.accent },
  momentChip: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(57,255,106,0.25)', borderRadius: 9, backgroundColor: 'rgba(10,20,13,0.7)', paddingHorizontal: 11, paddingVertical: 9 },
  momentChipTxt: { fontFamily: monoFont, fontSize: 6.8, letterSpacing: 0.9, color: '#c4d4c8', flex: 1 },
  removeTxt: { color: colors.loss, fontFamily: monoFont, fontSize: 11 },

  // ── analysis ──
  analysisBlock: { marginTop: 16, borderWidth: 1, borderColor: 'rgba(242,192,120,0.4)', borderRadius: 13, backgroundColor: 'rgba(20,18,10,0.6)', padding: 12 },
  analysisHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  analysisHeadTxt: { color: colors.accent, fontFamily: monoFont, fontSize: 8, letterSpacing: 1.6, fontWeight: '700', flex: 1 },
  aqCard: { marginTop: 12 },
  aqLabel: { fontFamily: monoFont, fontSize: 7.4, fontWeight: '800', letterSpacing: 1.1, color: colors.fg, lineHeight: 11 },
  aqCount: { marginTop: 4, fontFamily: monoFont, fontSize: 6.5, letterSpacing: 1, color: 'rgba(143,184,155,0.6)', textAlign: 'right' },
  momentDoneTxt: { marginTop: 10, fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.4, color: colors.primary, textAlign: 'center' },
  playTxt: { marginTop: 8, fontFamily: monoFont, fontSize: 7.6, fontWeight: '900', letterSpacing: 1, color: colors.primary },

  // ── day question ──
  questionCard: { flexDirection: 'row', gap: 10, marginTop: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, padding: 12, alignItems: 'flex-start' },
  questionTxt: { flex: 1, color: colors.fg, fontFamily: monoFont, fontSize: 13, lineHeight: 20, letterSpacing: 0.3 },
  input: { marginTop: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: '#0a0f0a', borderRadius: 12, color: colors.fg, fontFamily: monoFont, fontSize: 11.5, lineHeight: 18, padding: 12, minHeight: 90, textAlignVertical: 'top' },
  countTxt: { color: colors.muted, fontFamily: monoFont, fontSize: 8.5, letterSpacing: 1.2, marginTop: 6, textAlign: 'right' },

  // ── rest day ──
  restCard: { alignItems: 'center' },
  restIcon: { marginTop: 18, width: 44, height: 44, borderRadius: 22, borderWidth: 1.2, borderColor: 'rgba(242,192,120,0.6)', alignItems: 'center', justifyContent: 'center' },
  restTitle: { marginTop: 14, fontFamily: monoFont, fontSize: 15, fontWeight: '900', letterSpacing: 2, color: colors.fg, textAlign: 'center' },
  restLine: { marginTop: 8, fontSize: 10.5, lineHeight: 16, color: '#9db4a3', textAlign: 'center', fontStyle: 'italic' },
  countdownBox: { marginTop: 16, borderWidth: 1, borderColor: 'rgba(242,192,120,0.45)', borderRadius: 13, backgroundColor: 'rgba(38,30,12,0.5)', paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', alignSelf: 'stretch' },
  countdownLabel: { fontFamily: monoFont, fontSize: 7, letterSpacing: 2, color: colors.accent },
  countdownTxt: { marginTop: 6, fontFamily: monoFont, fontSize: 26, fontWeight: '900', letterSpacing: 3, color: colors.accent },
  countdownNote: { marginTop: 6, fontFamily: monoFont, fontSize: 6.5, letterSpacing: 1.2, color: 'rgba(143,184,155,0.65)', textAlign: 'center' },
  lastReview: { marginTop: 18, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.surface, padding: 13, alignSelf: 'stretch' },
  lastReviewTag: { fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', letterSpacing: 1.8, color: colors.accent },
  lastReviewScore: { marginTop: 7, fontFamily: monoFont, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, color: colors.fg },
  lastReviewMoment: { marginTop: 4, fontFamily: monoFont, fontSize: 7.5, letterSpacing: 0.8, color: '#c4d4c8' },
  lastReviewQ: { marginTop: 10, fontSize: 10, lineHeight: 15, fontStyle: 'italic', color: colors.fg },
  lastReviewA: { marginTop: 4, fontSize: 9.5, lineHeight: 14, color: '#9db4a3' },

  // ── day 6 receipts ──
  receiptBox: { marginTop: 14, borderWidth: 1, borderColor: 'rgba(242,192,120,0.4)', borderRadius: 13, backgroundColor: 'rgba(20,18,10,0.5)', padding: 13 },
  receiptTag: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.8, color: colors.accent },
  receiptEmpty: { marginTop: 8, fontSize: 10, color: '#9db4a3' },
  receiptEntry: { marginTop: 10 },
  receiptEntryHead: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.2, color: colors.primary },
  receiptMoment: { marginTop: 4, fontFamily: monoFont, fontSize: 7.2, letterSpacing: 0.8, color: '#c4d4c8' },
  tendencyWrap: { marginTop: 14 },
  tendencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, alignSelf: 'flex-start' },
  tendencyPill: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: 'rgba(242,192,120,0.06)' },
  tendencyTxt: { color: colors.accent, fontFamily: monoFont, fontSize: 8.5, letterSpacing: 1.2, fontWeight: '700' },
  tendencyNote: { marginTop: 7, color: colors.muted, fontFamily: monoFont, fontSize: 7.5, letterSpacing: 1, alignSelf: 'flex-start' },

  // ── card ──
  cardBox: { marginTop: 16, borderWidth: 1.5, borderRadius: 18, backgroundColor: colors.surface, padding: 20, alignItems: 'center' },
  cardTier: { color: colors.accent, fontFamily: monoFont, fontSize: 20, fontWeight: '800', letterSpacing: 3 },
  cardHandle: { color: colors.fg, fontFamily: monoFont, fontSize: 14, letterSpacing: 1.6, marginTop: 8 },
  cardCoach: { color: colors.muted, fontFamily: monoFont, fontSize: 9, letterSpacing: 1.6, marginTop: 4 },
  cardStats: { flexDirection: 'row', marginTop: 18, width: '100%', justifyContent: 'space-around' },
  cardStat: { alignItems: 'center' },
  cardStatV: { color: colors.fg, fontFamily: monoFont, fontSize: 16, fontWeight: '700' },
  cardStatL: { color: colors.muted, fontFamily: monoFont, fontSize: 8, letterSpacing: 1.6, marginTop: 3 },
  cardReadLabel: { color: colors.accent, fontFamily: monoFont, fontSize: 8.5, letterSpacing: 2, marginTop: 18, alignSelf: 'flex-start' },
  cardReadTxt: { color: colors.fg, fontFamily: monoFont, fontSize: 11, lineHeight: 17, fontStyle: 'italic', marginTop: 6 },
  cardAmbLabel: { color: colors.accent, fontFamily: monoFont, fontSize: 8.5, letterSpacing: 2, marginTop: 14, alignSelf: 'flex-start' },
  cardAmbTxt: { color: colors.warm, fontFamily: monoFont, fontSize: 11, lineHeight: 17, fontStyle: 'italic', marginTop: 6 },
});
