import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, Alert, Platform, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import RotatingArtImage from '../components/RotatingArtImage';
import CoachPresence from '../components/CoachPresence';
const BOOTS = require('../../assets/art/scan-boots.jpg');
const TUNNEL = require('../../assets/art/journey-tunnel.jpg');
const MATCH_ART = require('../../assets/art/vault-match.jpg');
const DRILL = require('../../assets/art/mirror-drill.jpg');
import { Coach } from '../data/coaches';
import {
  BASELINE_SCRIPTS,
  BASELINE_DAYS,
  BASELINE_DAY_INTRO,
  BASELINE_MATCHES,
  BASELINE_MOMENT_MIN_ANSWER,
  BASELINE_MOMENT_QUESTIONS,
  BASELINE_MOMENT_TAGS,
  BaselineAnalysisKey,
  BaselineDayStatus,
  BaselineMatchStats,
  BaselineMoment,
  BaselineSession,
  baselineStatsComplete,
  beatKey,
  currentBaselineDay,
  dayStatus,
  isWeekComplete,
  loadBaseline,
  matchNumberForDay,
  momentAskFor,
  recordBaselineMatch,
  sealBaseline,
  sealBaselineDay,
  tendenciesOf,
  weekMoments,
} from '../data/baselineScan';
import { getSettings } from '../data/settings';
import { COMPOSURE_LABELS, resultOf } from '../data/matches';
import { CheckIcon, EyeIcon } from '../components/Icons';
import HonestyBadge from '../components/HonestyBadge';
import { isValidReflection } from '../data/honestyGuard';
import { sfx } from '../audio/sound';
import { trackFunnel } from '../data/funnel';
import { colors, monoFont, displayFont, bodyFont, bodyFontHeavy, gradeColor } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

const MIN_ANSWER = 12;
type Phase = 'talk' | 'day' | 'ambition' | 'card';
type DayStep = 'start' | 'match' | 'stats' | 'review' | 'analysis' | 'dayq';

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

function WeekStrip({ session }: { session: BaselineSession | null }) {
  return (
    <View style={styles.weekStrip}>
      {Array.from({ length: BASELINE_MATCHES }).map((_, i) => {
        const match = i + 1;
        const st: BaselineDayStatus = dayStatus(session, match);
        const pill =
          st === 'done'
            ? styles.dayPillDone
            : st === 'today'
              ? styles.dayPillNow
              : st === 'locked'
                ? styles.dayPillLocked
                : styles.dayPillFuture;
        const txt =
          st === 'done'
            ? styles.dayPillTxtDone
            : st === 'today'
              ? styles.dayPillTxtNow
              : styles.dayPillTxtMuted;
        return (
          <View key={match} style={[styles.dayPill, pill]}>
            <Text style={[styles.dayPillTxt, txt]}>MATCH {match}</Text>
          </View>
        );
      })}
    </View>
  );
}

const REFLECTION_STARTERS: Partial<Record<BaselineAnalysisKey, string[]>> = {
  feel: ['PRESSURE', 'PANIC', 'FRUSTRATION', 'RUSHED', 'CALM', 'CONFIDENT', 'ANGRY', 'UNCERTAIN'],
  cause: ['FORCED PASS', 'LOSS OF FOCUS', 'RUSHING', 'POOR POSITIONING', 'PANIC', 'MISREAD THE PLAY', 'FATIGUE', 'OTHER'],
};

const GUIDE_KEY = 'psa.baseline.guide.v1';
const GUIDE_STEPS = [
  ['YOUR FIVE MATCHES', 'These five markers show the matches you have reviewed, the one you are on, and what is still ahead. Play them whenever you actually play — there is no clock and no deadline.'],
  ['WHAT TO DO FIRST', 'Start with a normal match. Record it if you can, then come back while the key moments are fresh. You are not trying to create a perfect result.'],
  ['TYPE THE FOUR RECEIPTS', 'After the final whistle, open the console stats screen and type four core numbers: possession, shots, shots on target and pass accuracy. Then name one moment honestly.'],
  ['TAKE A SHORT RESET', 'After a match, take 30 minutes away from the app before you review. The app will be here when you come back.'],
] as const;

function BaselineGuide({ index, onNext, onBack, onSkip }: { index: number; onNext: () => void; onBack: () => void; onSkip: () => void }) {
  const [title, body] = GUIDE_STEPS[index];
  return (
    <View style={styles.guideBox} accessibilityRole="summary">
      <Text style={styles.guideArrow}>↓</Text>
      <View style={styles.guideCopy}>
        <Text style={styles.guideKicker}>QUICK TOUR · {index + 1}/{GUIDE_STEPS.length}</Text>
        <Text style={styles.guideTitle}>{title}</Text>
        <Text style={styles.guideBody}>{body}</Text>
      </View>
      <View style={styles.guideActions}>
        {index > 0 && (
          <Pressable onPress={onBack} hitSlop={8}>
            <Text style={styles.guideBack}>‹ BACK</Text>
          </Pressable>
        )}
        <Pressable onPress={onNext} style={styles.guideNext}>
          <Text style={styles.guideNextTxt}>{index === GUIDE_STEPS.length - 1 ? 'GOT IT' : 'NEXT ›'}</Text>
        </Pressable>
      </View>
      <Pressable onPress={onSkip} hitSlop={8}>
        <Text style={styles.guideSkip}>SKIP TOUR</Text>
      </Pressable>
    </View>
  );
}

function HelpCard({ title = 'WHY WE ASK THIS', children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.helpCard}>
      <Text style={styles.helpTitle}>?  {title}</Text>
      <Text style={styles.helpText}>{children}</Text>
    </View>
  );
}

function momentComplete(m: DraftMoment): boolean {
  return BASELINE_MOMENT_QUESTIONS.every((q) => (m.analysis[q.key] ?? '').trim().length >= BASELINE_MOMENT_MIN_ANSWER);
}

function StatInput({ label, hint, value, onChange, suffix }: { label: string; hint: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <View style={styles.statField}>
      <View style={styles.statFieldHead}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statHint}>{hint}</Text>
      </View>
      <View style={styles.statInputRow}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="—"
          placeholderTextColor="rgba(143,184,155,0.35)"
          keyboardType="number-pad"
          style={styles.statInput}
          maxLength={3}
        />
        {!!suffix && <Text style={styles.statSuffix}>{suffix}</Text>}
      </View>
    </View>
  );
}

export default function BaselineScanScreen({ coach, onDone }: { coach: Coach; onDone: () => void }) {
  const { isMultiColumn } = useResponsive();
  const { width: winW, height: winH } = useWindowDimensions();
  const script = useMemo(() => BASELINE_SCRIPTS[coach.id] ?? BASELINE_SCRIPTS.chinedu, [coach.id]);
  const [session, setSession] = useState<BaselineSession | null>(null);
  const [phase, setPhase] = useState<Phase>('talk');
  const [step, setStep] = useState<DayStep>('start');
  const [notReady, setNotReady] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Full-bleed background image — no separate ArtBand header
  // ScrollView on web needs an explicit height — the flex chain alone won't
  // give it one (min-height parents don't propagate to flex children).
  const scrollH = Platform.OS === 'web' ? winH : undefined;
  const [gf, setGf] = useState(0);
  const [ga, setGa] = useState(0);
  const [touched, setTouched] = useState(false);
  const [composure, setComposure] = useState<number | null>(null);
  const [moments, setMoments] = useState<DraftMoment[]>([]);
  const [dayAnswer, setDayAnswer] = useState('');
  const [momentName, setMomentName] = useState('');
  const [momentStart, setMomentStart] = useState(0);
  const [momentEnd, setMomentEnd] = useState(5);
  const [ambition, setAmbition] = useState('');
  const [sealing, setSealing] = useState(false);
  const [guideStep, setGuideStep] = useState<number | null>(null);
  const seq = useRef(1);

  const [possession, setPossession] = useState('');
  const [shots, setShots] = useState('');
  const [shotsOnTarget, setShotsOnTarget] = useState('');
  const [passAcc, setPassAcc] = useState('');
  const [corners, setCorners] = useState('');
  const [fouls, setFouls] = useState('');
  const [tackles, setTackles] = useState('');
  const [saves, setSaves] = useState('');
  const [offsides, setOffsides] = useState('');
  const [yellowCards, setYellowCards] = useState('');
  const [profilePicUri, setProfilePicUri] = useState<string | null>(null);

  const day = currentBaselineDay(session);
  const complete = isWeekComplete(session);

  useEffect(() => {
    void AsyncStorage.getItem(GUIDE_KEY).then((seen) => {
      if (!seen) setGuideStep(0);
    });
  }, []);

  const dismissGuide = () => {
    setGuideStep(null);
    void AsyncStorage.setItem(GUIDE_KEY, 'seen');
  };

  useEffect(() => {
    void loadBaseline(coach.id).then((s) => {
      setSession(s);
      if (s.card) setPhase('card');
      else if (currentBaselineDay(s) > BASELINE_DAYS) setPhase('ambition');
      else if (currentBaselineDay(s) > 1 && currentBaselineDay(s) <= BASELINE_DAYS) setPhase('day');
      else setPhase(s.entries.length > 0 ? 'day' : 'talk');
      const pic = [...(s.entries ?? [])].reverse().find((e: any) => e.profilePicUri)?.profilePicUri;
      if (pic) setProfilePicUri(pic);
    });
  }, [coach.id]);

  const first = coach.name.split(' ')[0].toUpperCase();
  const result = resultOf({ gf, ga });
  const played = touched || gf > 0 || ga > 0;
  const question = useMemo(() => {
    const bank = script.questions[result];
    return bank[(Math.max(1, day) - 1) % bank.length];
  }, [script, result, day]);
  const beat = played ? script.beats[beatKey(gf, ga)] : null;
  const allMomentsDone = moments.length > 0 && moments.every(momentComplete);

  const statsDraft: BaselineMatchStats = useMemo(
    () => ({
      possession: possession === '' ? null : Math.max(0, Math.min(100, Number(possession))),
      shots: shots === '' ? null : Math.max(0, Math.min(50, Number(shots))),
      shotsOnTarget: shotsOnTarget === '' ? null : Math.max(0, Math.min(50, Number(shotsOnTarget))),
      passAccuracy: passAcc === '' ? null : Math.max(0, Math.min(100, Number(passAcc))),
      corners: corners === '' ? null : Math.max(0, Math.min(30, Number(corners))),
      fouls: fouls === '' ? null : Math.max(0, Math.min(30, Number(fouls))),
      tackles: tackles === '' ? null : Math.max(0, Math.min(50, Number(tackles))),
      saves: saves === '' ? null : Math.max(0, Math.min(20, Number(saves))),
      offsides: offsides === '' ? null : Math.max(0, Math.min(20, Number(offsides))),
      yellowCards: yellowCards === '' ? null : Math.max(0, Math.min(10, Number(yellowCards))),
    }),
    [possession, shots, shotsOnTarget, passAcc, corners, fouls, tackles, saves, offsides, yellowCards],
  );

  const statsComplete = baselineStatsComplete(statsDraft);
  const canSealDay =
    composure !== null &&
    statsComplete &&
    allMomentsDone &&
    isValidReflection(dayAnswer, { minLength: MIN_ANSWER, minWords: 2, prompt: question });

  const pickProfilePic = async () => {
    try {
      const ImagePicker: any = await import('expo-image-picker').catch(() => null);
      if (!ImagePicker) {
        Alert.alert('Photo unavailable', 'Image picker is not available on this build.');
        return;
      }
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync?.();
      if (perm && perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to add your profile picture.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: false,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        sfx('pop');
        setProfilePicUri(res.assets[0].uri);
      }
    } catch {
      Alert.alert('Photo unavailable', 'Could not open photo library on this device.');
    }
  };

  const takeProfilePhoto = async () => {
    try {
      const ImagePicker: any = await import('expo-image-picker').catch(() => null);
      if (!ImagePicker) return;
      const perm = await ImagePicker.requestCameraPermissionsAsync?.();
      if (perm && perm.status !== 'granted') {
        Alert.alert('Camera permission needed', 'Allow camera access to take a photo.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        sfx('pop');
        setProfilePicUri(res.assets[0].uri);
      }
    } catch {}
  };

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
    recordBaselineMatch({
      gf,
      ga,
      result,
      composure: composure as number,
      question,
      answer: dayAnswer.trim(),
      moments: filed,
      stats: statsDraft,
      profilePicUri,
    });
    sealBaselineDay(day);
    setGf(0);
    setGa(0);
    setTouched(false);
    setComposure(null);
    setMoments([]);
    setDayAnswer('');
    setMomentName('');
    setMomentStart(0);
    setMomentEnd(5);
    setPossession('');
    setShots('');
    setShotsOnTarget('');
    setPassAcc('');
    setCorners('');
    setFouls('');
    setTackles('');
    setSaves('');
    setOffsides('');
    setYellowCards('');
    setStep('start');
    void loadBaseline(coach.id).then((s) => {
      setSession({ ...s });
      const d = currentBaselineDay(s);
      if (d > BASELINE_DAYS) setPhase('ambition');
      else setPhase('day');
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    });
  };

  const seal = async () => {
    if (!isValidReflection(ambition, { minLength: MIN_ANSWER, minWords: 2 }) || sealing) return;
    setSealing(true);
    const card = await sealBaseline(getSettings().displayName, coach.id, ambition.trim(), profilePicUri);
    void trackFunnel('baseline_completed');
    sfx('success');
    const s = await loadBaseline(coach.id);
    setSession({ ...s, card });
    setPhase('card');
    setSealing(false);
  };

  const startMatch = async () => {
    sfx('whoosh');
    setStep('match');
  };
  const logScore = () => {
    sfx('whoosh');
    setStep('stats');
  };
  const confirmStats = () => {
    if (!statsComplete) return;
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
    setMoments((prev) =>
      prev.map((m) => (m.id === id ? { ...m, analysis: { ...m.analysis, [key]: text } } : m)),
    );
  };

  return (
    <View style={styles.root}>
      {/* ── Full-bleed background image (rotating plates) ── */}
      <RotatingArtImage
        sources={[BOOTS, MATCH_ART, TUNNEL, DRILL]}
        style={[styles.bgImage, { width: winW, height: winH }]}
        resizeMode="cover"
      />
      {/* Dark gradient overlay for readability */}
      <View style={styles.bgOverlay} pointerEvents="none" />

      <ScrollView
        ref={scrollRef}
        style={scrollH != null ? { flexShrink: 1, height: scrollH } : { flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={Platform.OS !== 'web'}
      >
        <div className="psa-web-container" style={{ width: '100%', maxWidth: 1000, margin: '0 auto' }}>
          <Animated.View key={phase + day} entering={FadeIn.duration(280)}>
            {phase === 'talk' && (
              <View style={styles.cardContainer}>
                <Text style={styles.eyebrow}>BEFORE YOU START</Text>
                <Text style={styles.title}>YOUR STARTING 5-MATCH BASELINE</Text>
                <Text style={styles.sub}>FIVE MATCHES · YOUR PACE · NO SHORTCUTS</Text>
                <View style={styles.coachRow}>
                  <CoachPresence size={48}>
                    <Image source={coach.portrait} style={styles.coachFace} />
                  </CoachPresence>
                  <Text style={styles.coachName}>{first} · ON THE GATE</Text>
                </View>

                {script.talk.map((b, i) => (
                  <Animated.View
                    key={i}
                    entering={FadeInUp.delay(200 + i * 200).duration(300)}
                    style={styles.beat}
                  >
                    <View style={[styles.quoteBar, { backgroundColor: coach.cardAccent }]} />
                    <Text style={styles.beatTxt}>{b}</Text>
                  </Animated.View>
                ))}

                <View style={styles.bluffBox}>
                  <Text style={styles.bluffLabel}>THE FOUR CORE RECEIPTS</Text>
                  <Text style={styles.bluffTxt}>
                    Possession • Shots • On Target • Pass Accuracy. Type these four receipts after each match.
                    Their 5-match average becomes your permanent baseline development card.
                  </Text>
                </View>

                <View style={styles.bluffBox}>
                  <Text style={styles.bluffLabel}>HIS HOUSE RULE</Text>
                  <Text style={styles.bluffTxt}>“{script.bluff}”</Text>
                </View>

                <View style={styles.photoPickBox}>
                  <Text style={styles.photoPickLabel}>YOUR STARTING PHOTO (FOR YOUR CARD)</Text>
                  <Text style={styles.photoPickHint}>
                    Add your photo now or before sealing your card.
                  </Text>
                  {profilePicUri ? (
                    <Image source={{ uri: profilePicUri }} style={styles.photoPreview} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.photoPlaceholderTxt}>NO PHOTO YET</Text>
                    </View>
                  )}
                  <View style={styles.photoRow}>
                    <Pressable onPress={takeProfilePhoto} style={styles.photoBtn}>
                      <Text style={styles.photoBtnTxt}>TAKE PHOTO</Text>
                    </Pressable>
                    <Pressable onPress={pickProfilePic} style={styles.photoBtnAlt}>
                      <Text style={styles.photoBtnAltTxt}>PICK FROM GALLERY</Text>
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    sfx('whoosh');
                    void trackFunnel('baseline_day_1_started');
                    setPhase('day');
                    setStep('start');
                  }}
                  style={styles.cta}
                >
                  <Text style={styles.ctaTxt}>I'M IN — START MATCH 1 ›</Text>
                </Pressable>
              </View>
            )}

            {phase === 'day' && day <= BASELINE_DAYS && (
              <View style={styles.cardContainer}>
                <Text style={styles.eyebrow}>
                  STARTING MATCHES · MATCH {matchNumberForDay(session, day)} OF {BASELINE_MATCHES}
                </Text>
                <WeekStrip session={session} />

                {guideStep !== null && (
                  <BaselineGuide
                    index={guideStep}
                    onBack={() => setGuideStep((n) => Math.max(0, (n ?? 0) - 1))}
                    onNext={() => {
                      if (guideStep >= GUIDE_STEPS.length - 1) dismissGuide();
                      else setGuideStep(guideStep + 1);
                    }}
                    onSkip={dismissGuide}
                  />
                )}

                {day > 1 && (
                  <View style={styles.dayIntro}>
                    <Image source={coach.portrait} style={styles.beatFace} />
                    <Text style={styles.dayIntroTxt}>
                      {BASELINE_DAY_INTRO[coach.id]?.[day] ?? BASELINE_DAY_INTRO.chinedu?.[day]}
                    </Text>
                  </View>
                )}

                {step === 'start' && (
                  <Animated.View entering={FadeInUp.duration(300)}>
                    <Text style={styles.heroLine}>
                      YOUR REVIEW ROUTINE — PEN TO PAPER BEFORE YOU TYPE.
                    </Text>
                    <Text style={styles.heroSub}>
                      1. Record your console match as usual before kick-off, play, then watch key moments back.{'\n'}
                      2. Write the turning point in your own words.{'\n'}
                      3. Leave the FT stats screen on your TV.{'\n'}
                      4. Type the four receipts: Possession, shots, on target, and pass accuracy.
                    </Text>
                    <HelpCard title="YOUR MATCH-DAY CHECKLIST">
                      Play normally. When full time whistle blows, keep the stats screen open and type the 4 core numbers.
                    </HelpCard>
                    <Pressable onPress={() => void startMatch()} style={styles.cta}>
                      <Text style={styles.ctaTxt}>I HAVE READ THE RITUAL — START THE MATCH ›</Text>
                    </Pressable>
                  </Animated.View>
                )}

                {step === 'match' && (
                  <Animated.View entering={FadeInUp.duration(300)}>
                    <Text style={styles.heroLine}>FULL TIME. LET’S LOG THE MATCH.</Text>
                    <View style={styles.scoreCard}>
                      <View style={styles.scoreSide}>
                        <Text style={styles.scoreLabel}>YOU</Text>
                        <Stepper
                          value={gf}
                          onChange={(n) => {
                            setTouched(true);
                            setGf(n);
                          }}
                          accent={result === 'W'}
                        />
                      </View>
                      <View
                        style={[
                          styles.pill,
                          result === 'W' && styles.pillW,
                          result === 'D' && styles.pillD,
                          result === 'L' && styles.pillL,
                        ]}
                      >
                        <Text style={styles.pillTxt}>{result}</Text>
                      </View>
                      <View style={styles.scoreSide}>
                        <Text style={styles.scoreLabel}>THEM</Text>
                        <Stepper
                          value={ga}
                          onChange={(n) => {
                            setTouched(true);
                            setGa(n);
                          }}
                          accent={result === 'L'}
                        />
                      </View>
                    </View>

                    {beat && (
                      <View style={styles.beatBubble}>
                        <Image source={coach.portrait} style={styles.beatFace} />
                        <Text style={styles.beatBubbleTxt}>{beat}</Text>
                      </View>
                    )}

                    {played && (
                      <>
                        <Text style={styles.fieldLabel}>YOUR HEAD STATE, FULL 90</Text>
                        <View style={styles.chipRow}>
                          {COMPOSURE_LABELS.map((label, i) => (
                            <Pressable
                              key={label}
                              onPress={() => setComposure(composure === i + 1 ? null : i + 1)}
                              style={[styles.chip, composure === i + 1 && styles.chipActive]}
                            >
                              <Text style={[styles.chipTxt, composure === i + 1 && styles.chipTxtActive]}>
                                {label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        <Pressable
                          onPress={logScore}
                          style={[styles.cta, (!played || composure === null) && { opacity: 0.35 }]}
                        >
                          <Text style={styles.ctaTxt}>SCORE LOCKED — ENTER STATS ›</Text>
                        </Pressable>
                      </>
                    )}
                  </Animated.View>
                )}

                {step === 'stats' && (
                  <Animated.View entering={FadeInUp.duration(300)}>
                    <Text style={styles.heroLine}>THE STATS SCREEN — TYPE THE FOUR NUMBERS.</Text>
                    <Text style={styles.heroSub}>
                      From your FC 26 screen, type possession %, pass accuracy %, total shots, and shots on target.
                    </Text>
                    <View style={styles.statsGrid}>
                      <StatInput
                        label="POSSESSION"
                        hint="YOUR %"
                        value={possession}
                        onChange={(v) => setPossession(v.replace(/[^0-9]/g, '').slice(0, 3))}
                        suffix="%"
                      />
                      <StatInput
                        label="PASS ACCURACY"
                        hint="YOUR %"
                        value={passAcc}
                        onChange={(v) => setPassAcc(v.replace(/[^0-9]/g, '').slice(0, 3))}
                        suffix="%"
                      />
                      <StatInput
                        label="SHOTS"
                        hint="TOTAL"
                        value={shots}
                        onChange={(v) => setShots(v.replace(/[^0-9]/g, '').slice(0, 2))}
                      />
                      <StatInput
                        label="ON TARGET"
                        hint="ON TARGET"
                        value={shotsOnTarget}
                        onChange={(v) => setShotsOnTarget(v.replace(/[^0-9]/g, '').slice(0, 2))}
                      />
                    </View>
                    <Pressable
                      onPress={confirmStats}
                      style={[styles.cta, !statsComplete && { opacity: 0.35 }]}
                    >
                      <Text style={styles.ctaTxt}>STATS ENTERED — CONTINUE TO MOMENTS ›</Text>
                    </Pressable>
                  </Animated.View>
                )}

                {step === 'review' && (
                  <Animated.View entering={FadeInUp.duration(300)}>
                    <Text style={styles.heroLine}>REVISIT THE TURNING POINT MOMENT.</Text>
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
                        <View style={styles.miniStat}>
                          <Text style={styles.miniStatLabel}>FROM</Text>
                          <Text style={styles.miniStatValue}>{momentStart}’</Text>
                        </View>
                        <View style={styles.miniStat}>
                          <Text style={styles.miniStatLabel}>TO</Text>
                          <Text style={styles.miniStatValue}>{momentEnd}’</Text>
                        </View>
                        <View style={styles.minButtons}>
                          <Pressable onPress={() => setMomentStart((s) => Math.max(0, s - 1))} style={styles.stepBtn}>
                            <Text style={styles.stepBtnTxt}>−</Text>
                          </Pressable>
                          <Pressable onPress={() => setMomentStart((s) => Math.min(44, s + 1))} style={styles.stepBtn}>
                            <Text style={styles.stepBtnTxt}>+</Text>
                          </Pressable>
                          <Pressable onPress={() => setMomentEnd((e) => Math.max(momentStart + 1, e - 1))} style={styles.stepBtn}>
                            <Text style={styles.stepBtnTxt}>−</Text>
                          </Pressable>
                          <Pressable onPress={() => setMomentEnd((e) => Math.min(45, e + 1))} style={styles.stepBtn}>
                            <Text style={styles.stepBtnTxt}>+</Text>
                          </Pressable>
                        </View>
                      </View>
                      <Text style={styles.qLabel}>TAG TYPE</Text>
                      <View style={styles.tagRow}>
                        {BASELINE_MOMENT_TAGS.map((tag) => (
                          <Pressable
                            key={tag}
                            onPress={() => {
                              sfx('pop');
                              setMoments((prev) =>
                                prev.length
                                  ? prev.map((m, i) => (i === prev.length - 1 ? { ...m, tag: m.tag === tag ? null : tag } : m))
                                  : [
                                      {
                                        id: `BM${Date.now().toString(36)}${(seq.current++).toString(36)}`,
                                        name: momentName.trim() || tag,
                                        startMin: momentStart,
                                        endMin: momentEnd,
                                        tag,
                                        analysis: {},
                                      },
                                    ],
                              );
                            }}
                            style={[
                              styles.tagChip,
                              moments[moments.length - 1]?.tag === tag && styles.tagChipOn,
                            ]}
                          >
                            <Text
                              style={[
                                styles.tagTxt,
                                moments[moments.length - 1]?.tag === tag && styles.tagTxtOn,
                              ]}
                            >
                              {tag}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    <Pressable
                      onPress={addMoment}
                      style={[styles.cta, momentName.trim().length < 2 && { opacity: 0.35 }]}
                    >
                      <Text style={styles.ctaTxt}>ADD THIS MOMENT ›</Text>
                    </Pressable>

                    {moments.map((m, i) => (
                      <View key={m.id} style={styles.momentChip}>
                        <Text style={styles.momentChipTxt}>
                          {i + 1}. {m.startMin}’–{m.endMin}’ · {m.name.toUpperCase()}
                          {m.tag ? ` · ${m.tag}` : ''}
                        </Text>
                        <Pressable hitSlop={8} onPress={() => setMoments((prev) => prev.filter((x) => x.id !== m.id))}>
                          <Text style={styles.removeTxt}>✕</Text>
                        </Pressable>
                      </View>
                    ))}

                    <Pressable
                      onPress={() => {
                        sfx('whoosh');
                        setStep('analysis');
                      }}
                      style={[styles.cta, moments.length === 0 && { opacity: 0.35 }]}
                    >
                      <Text style={styles.ctaTxt}>MOMENTS NOTED — REFLECT ›</Text>
                    </Pressable>
                  </Animated.View>
                )}

                {step === 'analysis' && (
                  <Animated.View entering={FadeInUp.duration(300)}>
                    <Text style={styles.heroLine}>{first} WALKS YOU THROUGH THE MOMENTS.</Text>
                    {moments.map((m, mi) => (
                      <View key={m.id} style={styles.analysisBlock}>
                        <View style={styles.analysisHead}>
                          <EyeIcon size={14} color={colors.accent} />
                          <Text style={styles.analysisHeadTxt}>
                            MOMENT {mi + 1} · {m.startMin}’–{m.endMin}’ · {m.name.toUpperCase()}
                          </Text>
                        </View>
                        {BASELINE_MOMENT_QUESTIONS.map((q, qi) => (
                          <View key={q.key} style={{ marginTop: 10 }}>
                            <Text style={styles.aqLabel}>{q.label}</Text>
                            <TextInput
                              value={m.analysis[q.key] ?? ''}
                              onChangeText={(t) => setMomentAnalysis(m.id, q.key, t)}
                              placeholder="YOUR WORDS — NOBODY ELSE'S"
                              placeholderTextColor="rgba(143,184,155,0.35)"
                              style={styles.inputSmall}
                              multiline
                            />
                          </View>
                        ))}
                      </View>
                    ))}
                    <Pressable
                      onPress={() => {
                        sfx('whoosh');
                        setStep('dayq');
                      }}
                      style={[styles.cta, !allMomentsDone && { opacity: 0.35 }]}
                    >
                      <Text style={styles.ctaTxt}>REFLECTION COMPLETE — FINAL CHECK-IN ›</Text>
                    </Pressable>
                  </Animated.View>
                )}

                {step === 'dayq' && (
                  <Animated.View entering={FadeInUp.duration(300)}>
                    <Text style={styles.heroLine}>FINAL CHECK-IN FOR MATCH {matchNumberForDay(session, day)}.</Text>
                    <View style={styles.questionCard}>
                      <Image source={coach.portrait} style={styles.beatFace} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.questionTxt}>{question}</Text>
                      </View>
                    </View>
                    <TextInput
                      value={dayAnswer}
                      onChangeText={(t) => setDayAnswer(t.slice(0, 500))}
                      placeholder="A short, honest note in your own words."
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
                        {day >= 5
                          ? 'SEAL MATCH 5 — FINISH STARTING BASELINE ›'
                          : `SEAL MATCH ${day} — PROCEED TO MATCH ${day + 1} ›`}
                      </Text>
                    </Pressable>
                  </Animated.View>
                )}
              </View>
            )}

            {phase === 'ambition' && (
              <View style={styles.cardContainer}>
                <Text style={styles.eyebrow}>STARTING BASELINE · FINAL QUESTION</Text>
                <WeekStrip session={session} />
                <View style={styles.coachRow}>
                  <Image source={coach.portrait} style={styles.coachFace} />
                  <Text style={styles.beatTxt}>{script.ambitionAsk}</Text>
                </View>
                <TextInput
                  value={ambition}
                  onChangeText={(t) => setAmbition(t.slice(0, 240))}
                  placeholder="Where is your game going? The real answer."
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
                <Pressable
                  onPress={() => void seal()}
                  style={[
                    styles.cta,
                    !isValidReflection(ambition, { minLength: MIN_ANSWER, minWords: 2 }) && { opacity: 0.35 },
                  ]}
                >
                  <Text style={styles.ctaTxt}>
                    {sealing ? 'SEALING…' : 'SEAL MY STARTING BASELINE CARD ›'}
                  </Text>
                </Pressable>
              </View>
            )}

            {phase === 'card' && session?.card && (
              <Animated.View entering={FadeInUp.duration(360)} style={styles.cardContainer}>
                <Text style={styles.eyebrow}>STARTING BASELINE · SEALED</Text>
                <View style={[styles.cardBox, { borderColor: coach.cardAccent }]}>
                  {session.card.profilePicUri ? (
                    <Image source={{ uri: session.card.profilePicUri }} style={styles.cardPhoto} />
                  ) : (
                    <View style={styles.cardPhotoPh}>
                      <Text style={styles.cardPhotoPhTxt}>NO PHOTO</Text>
                    </View>
                  )}
                  <Text style={styles.cardTier}>{session.card.tier}</Text>
                  <Text style={styles.cardHandle}>{session.card.handle}</Text>
                  <Text style={styles.cardCoach}>
                    UNDER COACH {first} · {session.card.w}W–{session.card.d}D–{session.card.l}L · HEAD {session.card.avgComposure.toFixed(1)}/5
                  </Text>

                  {session.card.avgStats && (
                    <View style={styles.avgBlock}>
                      <Text style={styles.avgLabel}>YOUR 5-MATCH AVERAGE — CONSOLE TRUTH</Text>
                      <View style={styles.avgGrid}>
                        <View style={styles.avgCell}>
                          <Text style={styles.avgVal}>{session.card.avgStats.possession}%</Text>
                          <Text style={styles.avgKey}>POSSESSION</Text>
                        </View>
                        <View style={styles.avgCell}>
                          <Text style={styles.avgVal}>{session.card.avgStats.passAccuracy}%</Text>
                          <Text style={styles.avgKey}>PASS ACC</Text>
                        </View>
                        <View style={styles.avgCell}>
                          <Text style={styles.avgVal}>{session.card.avgStats.shots}</Text>
                          <Text style={styles.avgKey}>SHOTS</Text>
                        </View>
                        <View style={styles.avgCell}>
                          <Text style={styles.avgVal}>{session.card.avgStats.shotsOnTarget}</Text>
                          <Text style={styles.avgKey}>ON TARGET</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  <Text style={styles.cardReadLabel}>{first}'S READ:</Text>
                  <Text style={styles.cardReadTxt}>“{session.card.coachRead}”</Text>
                </View>

                <Pressable onPress={onDone} style={styles.cta}>
                  <CheckIcon size={14} color="#0a0f0a" />
                  <Text style={styles.ctaTxt}>STARTING CARD SAVED — ENTER ACADEMY HUB ›</Text>
                </Pressable>
              </Animated.View>
            )}
          </Animated.View>
        </div>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  bgImage: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: 0,   // set dynamically via style prop
    height: 0,  // set dynamically via style prop
    opacity: 0.45,
  },
  bgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // @ts-ignore — web gradient
    backgroundImage: 'linear-gradient(180deg, rgba(5,10,6,0.55) 0%, rgba(5,10,6,0.82) 40%, rgba(5,10,6,0.95) 100%)',
    backgroundColor: 'rgba(5,10,6,0.88)', // native fallback
  } as any,
  scroll: { paddingVertical: 14, paddingBottom: 40 },

  cardContainer: {
    padding: 26,
    borderRadius: 16,
    // Glassmorphism
    backgroundColor: 'rgba(10, 20, 14, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(57, 255, 106, 0.35)',
    // Gamified glow
    shadowColor: '#39ff6a',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
    // Corner accent hint — top-left green strip
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(57, 255, 106, 0.5)',
  },

  eyebrow: {
    color: colors.primary,
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  title: {
    color: colors.fg,
    fontFamily: displayFont,
    fontSize: 32,
    lineHeight: 34,
    textAlign: 'center',
    marginTop: 8,
  },
  sub: {
    color: colors.accent,
    fontFamily: monoFont,
    fontSize: 8.5,
    letterSpacing: 1.6,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  coachFace: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  coachName: { color: colors.muted, fontFamily: monoFont, fontSize: 10, letterSpacing: 1.6 },
  beat: { flexDirection: 'row', marginTop: 12, gap: 12 },
  quoteBar: { width: 3, borderRadius: 2, opacity: 0.6 },
  beatTxt: { flex: 1, color: '#dbe7dd', fontFamily: bodyFont, fontSize: 13.5, lineHeight: 21 },
  bluffBox: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(57,255,106,0.22)',
    borderRadius: 10,
    backgroundColor: 'rgba(10,20,14,0.72)',
    padding: 14,
  },
  bluffLabel: { color: colors.accent, fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.6 },
  bluffTxt: { color: '#dbe7dd', fontFamily: bodyFont, fontSize: 13, lineHeight: 20, marginTop: 6 },
  cta: {
    marginTop: 22,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    // Gamified glow
    shadowColor: '#39ff6a',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.7)',
  },
  ctaTxt: { color: '#050a06', fontFamily: monoFont, fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },

  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    marginBottom: 14,
  },
  dayPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillDone: { backgroundColor: 'rgba(57,255,106,0.12)', borderColor: 'rgba(57,255,106,0.5)', shadowColor: '#39ff6a', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  dayPillNow: { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: '#39ff6a', shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  dayPillLocked: { backgroundColor: 'rgba(10,20,14,0.6)', borderColor: 'rgba(143,184,155,0.2)' },
  dayPillFuture: { backgroundColor: 'transparent', borderColor: 'rgba(143,184,155,0.12)' },
  dayPillTxt: { fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  dayPillTxtDone: { color: colors.primary },
  dayPillTxtNow: { color: '#0a0f0a' },
  dayPillTxtMuted: { color: 'rgba(143,184,155,0.45)' },

  heroLine: {
    marginTop: 16,
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: colors.primary,
  },
  heroSub: { marginTop: 8, fontSize: 12, lineHeight: 18, color: '#9db4a3' },
  helpCard: {
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    borderRadius: 8,
    backgroundColor: 'rgba(242,192,120,0.07)',
    padding: 12,
  },
  helpTitle: { color: colors.accent, fontFamily: monoFont, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  helpText: { color: '#cbd8cf', fontFamily: bodyFont, fontSize: 12, lineHeight: 17, marginTop: 4 },

  guideBox: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(57,255,106,0.55)', borderRadius: 13, backgroundColor: 'rgba(14,30,18,0.98)', padding: 14 },
  guideArrow: { color: colors.primary, fontSize: 22, lineHeight: 22, textAlign: 'center' },
  guideCopy: { marginTop: 4 },
  guideKicker: { color: colors.primary, fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.7 },
  guideTitle: { color: colors.fg, fontFamily: monoFont, fontSize: 11.5, fontWeight: '900', letterSpacing: 1, marginTop: 5 },
  guideBody: { color: '#b9cabe', fontFamily: bodyFont, fontSize: 11.5, lineHeight: 17, marginTop: 5 },
  guideActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  guideBack: { color: colors.muted, fontFamily: monoFont, fontSize: 8, letterSpacing: 1 },
  guideNext: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 15 },
  guideNextTxt: { color: '#0a0f0a', fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', letterSpacing: 1 },
  guideSkip: { color: colors.muted, fontFamily: monoFont, fontSize: 7.5, textAlign: 'right', letterSpacing: 1, marginTop: 9 },

  dayIntro: { flexDirection: 'row', gap: 10, marginTop: 12, borderWidth: 1.5, borderColor: 'rgba(242,192,120,0.25)', borderRadius: 12, backgroundColor: 'rgba(18,16,8,0.65)', padding: 12, alignItems: 'flex-start' },
  dayIntroTxt: { flex: 1, color: colors.warm, fontFamily: monoFont, fontSize: 11, lineHeight: 17, letterSpacing: 0.3 },

  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'rgba(57,255,106,0.3)',
    borderRadius: 12,
    backgroundColor: 'rgba(10,20,14,0.78)',
    paddingVertical: 20,
    paddingHorizontal: 28,
    marginTop: 14,
    // HUD glow
    shadowColor: '#39ff6a',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  scoreSide: { alignItems: 'center' },
  scoreLabel: { color: colors.muted, fontFamily: monoFont, fontSize: 9, letterSpacing: 2, marginBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(57,255,106,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,20,14,0.7)',
  },
  stepBtnTxt: { color: colors.fg, fontFamily: monoFont, fontSize: 18 },
  stepValue: { color: colors.fg, fontFamily: monoFont, fontSize: 24, fontWeight: '800', minWidth: 24, textAlign: 'center' },
  pill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillW: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.1)' },
  pillD: { borderColor: colors.muted },
  pillL: { borderColor: colors.loss, backgroundColor: 'rgba(224,96,92,0.1)' },
  pillTxt: { color: colors.fg, fontFamily: monoFont, fontSize: 14, fontWeight: '800' },

  beatBubble: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(242,192,120,0.28)',
    borderRadius: 12,
    backgroundColor: 'rgba(18,16,8,0.65)',
    padding: 12,
    alignItems: 'flex-start',
  },
  beatFace: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  beatBubbleTxt: { flex: 1, color: colors.warm, fontFamily: monoFont, fontSize: 11.5, lineHeight: 18 },

  fieldLabel: {
    color: colors.muted,
    fontFamily: monoFont,
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 18,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: 'rgba(57,255,106,0.18)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: 'rgba(10,20,14,0.7)',
  },
  chipActive: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.15)', shadowColor: '#39ff6a', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  chipTxt: { color: colors.muted, fontFamily: monoFont, fontSize: 10, letterSpacing: 1 },
  chipTxtActive: { color: colors.primary },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  statField: {
    width: '48%',
    borderWidth: 1.5,
    borderColor: 'rgba(57,255,106,0.22)',
    borderRadius: 10,
    backgroundColor: 'rgba(10,20,14,0.75)',
    padding: 12,
  },
  statFieldHead: { marginBottom: 6 },
  statLabel: { color: colors.fg, fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  statHint: { color: colors.muted, fontFamily: monoFont, fontSize: 7, letterSpacing: 0.8, marginTop: 2 },
  statInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.22)',
    borderRadius: 8,
    backgroundColor: '#0a0f0a',
    color: colors.fg,
    fontFamily: monoFont,
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 10,
    textAlign: 'center',
  },
  statSuffix: { color: colors.muted, fontFamily: monoFont, fontSize: 12, fontWeight: '700' },

  momentCard: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(57,255,106,0.22)',
    borderRadius: 12,
    backgroundColor: 'rgba(10,20,14,0.72)',
    padding: 16,
  },
  qLabel: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.fg,
    marginTop: 12,
  },
  inputSmall: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.2)',
    borderRadius: 10,
    backgroundColor: '#0a0f0a',
    color: colors.fg,
    fontFamily: monoFont,
    fontSize: 12,
    lineHeight: 18,
    padding: 12,
    minHeight: 44,
  },
  minRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  miniStat: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.25)',
    borderRadius: 10,
    backgroundColor: 'rgba(10,20,13,0.8)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  miniStatLabel: { fontFamily: monoFont, fontSize: 6, letterSpacing: 1.4, color: colors.muted },
  miniStatValue: { fontFamily: monoFont, fontSize: 10, fontWeight: '900', color: colors.primary },
  minButtons: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tagChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  tagChipOn: { borderColor: colors.accent, backgroundColor: 'rgba(242,192,120,0.12)' },
  tagTxt: { color: colors.muted, fontFamily: monoFont, fontSize: 8, letterSpacing: 1 },
  tagTxtOn: { color: colors.accent },

  momentChip: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.25)',
    borderRadius: 10,
    backgroundColor: 'rgba(10,20,13,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  momentChipTxt: { fontFamily: monoFont, fontSize: 8, letterSpacing: 0.9, color: '#c4d4c8', flex: 1 },
  removeTxt: { color: colors.loss, fontFamily: monoFont, fontSize: 13 },

  analysisBlock: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(242,192,120,0.35)',
    borderRadius: 12,
    backgroundColor: 'rgba(18,16,8,0.72)',
    padding: 16,
    borderTopWidth: 2,
    borderTopColor: 'rgba(242,192,120,0.5)',
  },
  analysisHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analysisHeadTxt: { color: colors.accent, fontFamily: monoFont, fontSize: 9, letterSpacing: 1.4, fontWeight: '800' },
  aqLabel: { fontFamily: monoFont, fontSize: 8, fontWeight: '800', letterSpacing: 1.1, color: colors.fg },

  questionCard: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(57,255,106,0.28)',
    borderRadius: 12,
    backgroundColor: 'rgba(10,20,14,0.72)',
    padding: 14,
    alignItems: 'center',
  },
  questionTxt: { color: colors.fg, fontFamily: monoFont, fontSize: 13.5, lineHeight: 20 },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0a0f0a',
    borderRadius: 12,
    color: colors.fg,
    fontFamily: monoFont,
    fontSize: 13,
    lineHeight: 20,
    padding: 14,
    minHeight: 90,
  },

  photoPickBox: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(57,255,106,0.22)',
    borderRadius: 12,
    backgroundColor: 'rgba(10,20,14,0.72)',
    padding: 16,
  },
  photoPickLabel: { color: colors.accent, fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.4 },
  photoPickHint: { color: colors.muted, fontFamily: bodyFont, fontSize: 11, lineHeight: 16, marginTop: 4 },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 12,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  photoPlaceholder: {
    marginTop: 12,
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.22)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderTxt: { color: colors.muted, fontFamily: monoFont, fontSize: 8, letterSpacing: 1 },
  photoRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  photoBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  photoBtnTxt: { color: '#0a0f0a', fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  photoBtnAlt: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  photoBtnAltTxt: { color: colors.fg, fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  cardBox: {
    marginTop: 18,
    borderWidth: 1.5,
    borderRadius: 16,
    backgroundColor: 'rgba(10,20,14,0.78)',
    padding: 22,
    alignItems: 'center',
    shadowColor: '#39ff6a',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    borderTopWidth: 2,
    borderTopColor: 'rgba(57,255,106,0.4)',
  },
  cardTier: { color: colors.accent, fontFamily: monoFont, fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  cardHandle: { color: colors.fg, fontFamily: monoFont, fontSize: 16, letterSpacing: 1.6, marginTop: 8 },
  cardCoach: { color: colors.muted, fontFamily: monoFont, fontSize: 9.5, letterSpacing: 1.6, marginTop: 4 },
  cardPhoto: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: colors.primary, marginBottom: 12 },
  cardPhotoPh: { width: 88, height: 88, borderRadius: 44, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cardPhotoPhTxt: { color: colors.muted, fontFamily: monoFont, fontSize: 8, letterSpacing: 1 },
  avgBlock: { marginTop: 16, width: '100%', borderWidth: 1, borderColor: 'rgba(57,255,106,0.2)', borderRadius: 12, backgroundColor: 'rgba(10,20,13,0.6)', padding: 14 },
  avgLabel: { color: colors.primary, fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  avgGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 12 },
  avgCell: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(143,184,155,0.15)', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 10 },
  avgVal: { color: colors.fg, fontFamily: monoFont, fontSize: 13, fontWeight: '800' },
  avgKey: { color: colors.muted, fontFamily: monoFont, fontSize: 6.5, letterSpacing: 1, marginTop: 4 },
  cardReadLabel: { color: colors.accent, fontFamily: monoFont, fontSize: 9, letterSpacing: 2, marginTop: 18, alignSelf: 'flex-start' },
  cardReadTxt: { color: colors.fg, fontFamily: monoFont, fontSize: 12, lineHeight: 18, fontStyle: 'italic', marginTop: 6 },
});
