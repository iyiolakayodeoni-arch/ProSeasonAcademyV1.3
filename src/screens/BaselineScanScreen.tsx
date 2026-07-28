import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import LogoMark from '../components/LogoMark';
import { Coach } from '../data/coaches';
import {
  BASELINE_SCRIPTS,
  BaselineSession,
  beatKey,
  loadBaseline,
  recordBaselineMatch,
  sealBaseline,
} from '../data/baselineScan';
import { getSettings } from '../data/settings';
import { resultOf } from '../data/matches';
import { CheckIcon } from '../components/Icons';
import { colors, monoFont } from '../theme';

// ─────────────────────────────────────────────────────────────
// BASELINE SCAN — the 5-match interview gate. Semi-automatic by
// design: the score is the easy part; the debrief is the point.
// No AI reads your head here — you grow by thinking, on purpose.
// Phases: TALK → ×5 MATCH DEBRIEF → AMBITION → SEALED CARD.
// ─────────────────────────────────────────────────────────────

const COMPOSURE_LABELS = ['TILTED', 'SHOOK', 'OKAY', 'CALM', 'ICE IN VEINS'];
const TOTAL = 5;
const MIN_ANSWER = 12;

type Phase = 'talk' | 'match' | 'ambition' | 'card';

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

export default function BaselineScanScreen({ coach, onDone }: { coach: Coach; onDone: () => void }) {
  const script = useMemo(() => BASELINE_SCRIPTS[coach.id] ?? BASELINE_SCRIPTS.obinna, [coach.id]);
  const [session, setSession] = useState<BaselineSession | null>(null);
  const [phase, setPhase] = useState<Phase>('talk');
  const [notReady, setNotReady] = useState(false);

  // ── current debrief state ──
  const [gf, setGf] = useState(0);
  const [ga, setGa] = useState(0);
  const [touched, setTouched] = useState(false); // 0–0 IS a result — any stepper tap means "played"

  const [composure, setComposure] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [ambition, setAmbition] = useState('');
  const [sealing, setSealing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    void loadBaseline(coach.id).then((s) => {
      setSession(s);
      if (s.card) setPhase('card');
      else if (s.entries.length >= TOTAL) setPhase('ambition');
      else if (s.entries.length > 0) setPhase('match');
    });
  }, [coach.id]);

  const matchNo = (session?.entries.length ?? 0) + 1;
  const result = resultOf({ gf, ga });
  const played = touched || gf > 0 || ga > 0;
  const question = useMemo(() => {
    const bank = script.questions[result];
    return bank[(matchNo - 1) % bank.length];
  }, [script, result, matchNo]);
  const beat = played ? script.beats[beatKey(gf, ga)] : null;
  const canContinue = composure !== null && answer.trim().length >= MIN_ANSWER;
  const first = coach.name.split(' ')[0].toUpperCase();

  const submitMatch = () => {
    if (!canContinue || !session) return;
    recordBaselineMatch({ gf, ga, result, composure: composure as number, question, answer: answer.trim() });
    setGf(0);
    setGa(0);
    setTouched(false);
    setComposure(null);
    setAnswer('');
    const done = session.entries.length + 1 >= TOTAL;
    void loadBaseline(coach.id).then((s) => {
      setSession({ ...s });
      setPhase(done ? 'ambition' : 'match');
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    });
  };

  const seal = async () => {
    if (ambition.trim().length < MIN_ANSWER || sealing) return;
    setSealing(true);
    const card = await sealBaseline(getSettings().displayName, coach.id, ambition.trim());
    const s = await loadBaseline(coach.id);
    setSession({ ...s, card });
    setPhase('card');
    setSealing(false);
  };

  // ── render ──
  return (
    <View style={styles.root}>
      <GridBackground />
      <View style={styles.crest}>
        <LogoMark size={30} />
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View key={phase + matchNo} entering={FadeIn.duration(280)}>
          {/* ════ TALK: the serious gate ════ */}
          {phase === 'talk' && (
            <>
              <Text style={styles.eyebrow}>BEFORE YOUR JOURNEY UNLOCKS</Text>
              <Text style={styles.title}>THE BASELINE SCAN</Text>
              <Text style={styles.sub}>FIVE MATCHES · FIVE DEBRIEFS · NO SHORTCUTS</Text>

              <View style={styles.coachRow}>
                <Image source={coach.portrait} style={styles.coachFace} />
                <Text style={styles.coachName}>{first} · ON THE GATE</Text>
              </View>

              {script.talk.map((beat, i) => (
                <Animated.View key={i} entering={FadeInUp.delay(200 + i * 260).duration(300)} style={styles.beat}>
                  <View style={[styles.quoteBar, { backgroundColor: coach.cardAccent }]} />
                  <Text style={styles.beatTxt}>{beat}</Text>
                </Animated.View>
              ))}

              <Animated.View entering={FadeInUp.delay(200 + script.talk.length * 260).duration(300)} style={styles.bluffBox}>
                <Text style={styles.bluffLabel}>HIS HOUSE RULE</Text>
                <Text style={styles.bluffTxt}>“{script.bluff}”</Text>
              </Animated.View>

              <Pressable onPress={() => setPhase('match')} style={styles.cta}>
                <Text style={styles.ctaTxt}>I'M IN — START MATCH 1 DEBRIEF</Text>
              </Pressable>
              <Pressable onPress={() => setNotReady((v) => !v)} hitSlop={8}>
                <Text style={styles.skipLink}>{notReady ? 'UNDERSTOOD — THIS GATE STAYS REAL' : 'NOT READY?'}</Text>
              </Pressable>
              {notReady && (
                <Text style={styles.notReadyTxt}>
                  Then the journey waits. The academy does not remove you for thinking — but it does
                  not carry passengers either. Come back when you mean it; this screen will be here.
                  That is not harshness, that is us being serious about what we do.
                </Text>
              )}
            </>
          )}

          {/* ════ MATCH DEBRIEF (×5) ════ */}
          {phase === 'match' && (
            <>
              <Text style={styles.eyebrow}>BASELINE · MATCH {matchNo} OF {TOTAL} — WHAT HAPPENED?</Text>

              <View style={styles.progressDots}>
                {Array.from({ length: TOTAL }).map((_, i) => (
                  <View key={i} style={[styles.dot, i < matchNo - 1 && styles.dotDone, i === matchNo - 1 && styles.dotNow]} />
                ))}
              </View>

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

                  <Text style={styles.fieldLabel}>{first} ASKS:</Text>
                  <Text style={styles.questionTxt}>{question}</Text>
                  <TextInput
                    value={answer}
                    onChangeText={(t) => setAnswer(t.slice(0, 500))}
                    placeholder="THINK. THEN ANSWER — YOUR WORDS, NOT OURS."
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    multiline
                    maxLength={500}
                  />
                  <Text style={styles.countTxt}>
                    {answer.trim().length}/{MIN_ANSWER}+ · THE EYE NEVER READS THIS — {first === 'CHINEDU' ? 'HE DOES' : `${first} DOES`}
                  </Text>

                  <Pressable onPress={submitMatch} style={[styles.cta, !canContinue && { opacity: 0.35 }]}>
                    <Text style={styles.ctaTxt}>
                      {matchNo >= TOTAL ? 'LOG MATCH 5 — HEAR THE VERDICT' : `LOG MATCH ${matchNo} — NEXT`}
                    </Text>
                  </Pressable>
                  {!canContinue && (
                    <Text style={styles.requireTxt}>ANSWER ({MIN_ANSWER}+ CHARACTERS) + PICK YOUR HEAD STATE TO CONTINUE</Text>
                  )}
                </>
              )}
              {!played && <Text style={styles.requireTxt}>SET THE SCORE FIRST — THEN WE TALK.</Text>}
            </>
          )}

          {/* ════ AMBITION ════ */}
          {phase === 'ambition' && (
            <>
              <Text style={styles.eyebrow}>BASELINE COMPLETE · ONE LAST QUESTION</Text>
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
              <Text style={styles.countTxt}>{ambition.trim().length}/{MIN_ANSWER}+ · HE WILL BRING THIS BACK UP — COUNT ON IT</Text>
              <Pressable onPress={() => void seal()} style={[styles.cta, ambition.trim().length < MIN_ANSWER && { opacity: 0.35 }]}>
                <Text style={styles.ctaTxt}>{sealing ? 'SEALING…' : 'SEAL MY BASELINE CARD'}</Text>
              </Pressable>
            </>
          )}

          {/* ════ SEALED CARD ════ */}
          {phase === 'card' && session?.card && (
            <Animated.View entering={FadeInUp.duration(360)}>
              <Text style={styles.eyebrow}>BASELINE 001 · SEALED</Text>
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
                <Text style={styles.cardAmbLabel}>YOUR AMBITION (HE REMEMBERS):</Text>
                <Text style={styles.cardAmbTxt}>“{session.card.ambition}”</Text>
              </View>

              <Pressable onPress={onDone} style={styles.cta}>
                <CheckIcon size={12} color="#0a0f0a" />
                <Text style={styles.ctaTxt}>PROFILE SEALED — CONTINUE</Text>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  crest: { alignItems: 'center', paddingTop: 58 },
  scroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 42 },
  eyebrow: { color: colors.muted, fontFamily: monoFont, fontSize: 9, letterSpacing: 2, textAlign: 'center' },
  title: { color: colors.fg, fontFamily: monoFont, fontSize: 24, fontWeight: '800', letterSpacing: 2, textAlign: 'center', marginTop: 8 },
  sub: { color: colors.accent, fontFamily: monoFont, fontSize: 9, letterSpacing: 2, textAlign: 'center', marginTop: 6, marginBottom: 6 },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 4 },
  coachFace: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  coachName: { color: colors.muted, fontFamily: monoFont, fontSize: 10, letterSpacing: 1.6 },
  beat: { flexDirection: 'row', marginTop: 12, gap: 12 },
  quoteBar: { width: 3, borderRadius: 2, opacity: 0.6 },
  beatTxt: { flex: 1, color: colors.fg, fontFamily: monoFont, fontSize: 11.5, lineHeight: 19, letterSpacing: 0.3 },
  bluffBox: { marginTop: 18, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, padding: 14 },
  bluffLabel: { color: colors.accent, fontFamily: monoFont, fontSize: 8.5, letterSpacing: 2 },
  bluffTxt: { color: colors.fg, fontFamily: monoFont, fontSize: 11, lineHeight: 18, marginTop: 6, fontStyle: 'italic' },
  cta: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaTxt: { color: '#0a0f0a', fontFamily: monoFont, fontSize: 11.5, letterSpacing: 1.5, fontWeight: '700' },
  skipLink: { color: colors.muted, fontFamily: monoFont, fontSize: 9, letterSpacing: 1.6, textAlign: 'center', marginTop: 14 },
  notReadyTxt: { color: colors.muted, fontFamily: monoFont, fontSize: 10, lineHeight: 16, letterSpacing: 0.4, marginTop: 10, textAlign: 'center' },
  progressDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14, marginBottom: 16 },
  dot: { width: 22, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotDone: { backgroundColor: colors.primary },
  dotNow: { backgroundColor: colors.accent },
  scoreCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, paddingVertical: 16, paddingHorizontal: 20 },
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
  questionTxt: { color: colors.fg, fontFamily: monoFont, fontSize: 13, lineHeight: 20, letterSpacing: 0.3 },
  input: { marginTop: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: '#0a0f0a', borderRadius: 12, color: colors.fg, fontFamily: monoFont, fontSize: 11.5, lineHeight: 18, padding: 12, minHeight: 90, textAlignVertical: 'top' },
  countTxt: { color: colors.muted, fontFamily: monoFont, fontSize: 8.5, letterSpacing: 1.2, marginTop: 6, textAlign: 'right' },
  requireTxt: { color: colors.muted, fontFamily: monoFont, fontSize: 8.5, letterSpacing: 1.4, marginTop: 12, textAlign: 'center' },
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
