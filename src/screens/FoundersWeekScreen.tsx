import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import ArtBand from '../components/ArtBand';
import CoachPresence from '../components/CoachPresence';
import { Coach } from '../data/coaches';
import { colors, monoFont, displayFont, bodyFont, bodyFontHeavy } from '../theme';
import { sfx } from '../audio/sound';
import HonestyBadge from '../components/HonestyBadge';
import { isValidReflection } from '../data/honestyGuard';
import * as backend from '../data/backend';
import {
  loadFoundersWeek,
  markFoundersWelcomeSeen,
  markFoundersTourDone,
  markFoundersConsultSeen,
  markFoundersCompleted,
  getFoundersWeek,
} from '../data/foundersWeek';

const LOCKER = require('../../assets/art/locker-room.jpg');

type Step = 'welcome' | 'tour' | 'pricing' | 'await';

const TOUR_CARDS = [
  {
    eyebrow: 'YOUR RECORD',
    title: 'FIVE MATCHES. YOUR NUMBERS. YOUR CARD.',
    body: 'Baseline is done — that card is your receipt. From here every checkpoint is 7 stats screens, typed by you, averaged into the next card. No painted percentages. The trend is the truth.',
    tone: 'green' as const,
  },
  {
    eyebrow: 'THE STANDARD',
    title: 'THE BENCHMARK STAYS',
    body: 'The Standard is the reference — the elite composite we reveal as you advance. Your journey is the evidence. The Standard is where the evidence is pointing.',
    tone: 'gold' as const,
  },
  {
    eyebrow: 'THE CHINEDU WAY',
    title: 'PEN TO PAPER BEFORE YOU TYPE',
    body: 'Record & watch. Biro to paper. Cool down 24–30 mins. Then type your truth. We can scan — but typing is the hard way. AI hallucinates, you don’t. Small hard way → big hard way.',
    tone: 'green' as const,
  },
  {
    eyebrow: 'THE CLUBHOUSE',
    title: 'REAL ROOMS. REAL PLAYERS.',
    body: 'Pricing is decided together, in the open. No DMs, no bots. You vote in the pricing halls, the founder reads every line, and the price you pay is the price the database charges — never the app.',
    tone: 'gold' as const,
  },
];

export default function FoundersWeekScreen({ coach, onDone }: { coach: Coach; onDone: () => void }) {
  const { width: winW } = useWindowDimensions();
  const bandW = Math.min(winW, 430);
  const [step, setStep] = useState<Step>('welcome');
  const [tourIdx, setTourIdx] = useState(0);
  const [fwLive, setFwLive] = useState<backend.FounderWeek | null>(null);
  const [consult, setConsult] = useState<backend.ConsultQ[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, { choice?: string; amount?: string; note?: string }>>({});
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [access, setAccess] = useState<backend.MyAccess | null>(null);
  const [livePrices, setLivePrices] = useState<backend.LivePrice[] | null>(null);

  const first = coach.name.split(' ')[0].toUpperCase();

  useEffect(() => {
    void loadFoundersWeek(coach.id).then((p) => {
      if (p.welcomeSeen && !p.tourDone) setStep('tour');
      else if (p.tourDone && !p.completedAt) setStep('pricing');
      else if (p.completedAt) setStep('await');
    });
    void backend.founderWeek().then(setFwLive);
    void backend.myConsult().then(setConsult);
    void backend.myAccess().then(setAccess);
    void backend.livePrices().then(setLivePrices);
  }, [coach.id]);

  const answeredCount = useMemo(() => consult?.filter((q) => q.answered).length ?? 0, [consult]);
  const totalCount = consult?.length ?? 0;
  const graceLeft = access?.graceLeft ?? 0;
  const isPriced = !!livePrices?.length;
  const isGrace = access?.state === 'grace';
  const isActive = access?.state === 'active';

  const welcomeNext = async () => {
    sfx('whoosh');
    await markFoundersWelcomeSeen();
    setStep('tour');
  };
  const tourNext = async () => {
    if (tourIdx < TOUR_CARDS.length - 1) {
      sfx('tap');
      setTourIdx((n) => n + 1);
    } else {
      sfx('whoosh');
      await markFoundersTourDone();
      await markFoundersConsultSeen();
      setStep('pricing');
    }
  };
  const submitConsult = async (slug: string) => {
    const a = answers[slug];
    if (!a) return;
    setSavingSlug(slug);
    const amountNum = a.amount ? Number(a.amount) : undefined;
    const ok = await backend.answerConsult(slug, {
      choice: a.choice,
      amount: Number.isFinite(amountNum) ? amountNum : undefined,
      note: a.note,
    });
    if (ok) {
      sfx('success');
      const fresh = await backend.myConsult();
      if (fresh) setConsult(fresh);
    } else sfx('fail');
    setSavingSlug(null);
  };

  const completeFoundersWeek = async () => {
    sfx('whoosh');
    await markFoundersCompleted();
    onDone();
  };

  return (
    <View style={styles.root}>
      <GridBackground />
      <ArtBand source={LOCKER} width={bandW} height={140} warmAt={{ x: bandW * 0.5, y: 36, r: bandW * 0.55 }}>
        <Text style={styles.brand}>PROSEASONACADEMY</Text>
        <Text style={styles.kicker}>FOUNDERS WEEK · {step.toUpperCase()}</Text>
      </ArtBand>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── WELCOME ── */}
        {step === 'welcome' && (
          <Animated.View entering={FadeIn.duration(280)}>
            <Text style={styles.eyebrow}>YOUR BASELINE IS SEALED</Text>
            <Text style={styles.title}>WELCOME TO FOUNDERS WEEK</Text>
            <Text style={styles.sub}>THIS IS WHERE WE BUILD THE PRICE TOGETHER</Text>
            <View style={styles.coachRow}>
              <CoachPresence size={44}><Image source={coach.portrait} style={styles.coachFace} /></CoachPresence>
              <Text style={styles.coachName}>{first} · ON THE GATE</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>FOUNDER'S NOTE</Text>
              <Text style={styles.cardBody}>
                {fwLive?.note?.trim()
                  ? fwLive.note
                  : 'Baseline week was the interview. Founders Week is the room where we decide what this is worth — together.\n\nYou will do a 60-second tour of how the academy works, then vote on pricing in the halls. Every vote is read. After 2–4 days I set the price, the till opens, and you have 3 days grace to pay and continue.\n\nNothing is deleted. Your card, your vault, your trends — they wait.'}
              </Text>
            </View>
            {fwLive && (
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>
                  {fwLive.live ? 'FOUNDER IS IN THE HALLS NOW' : fwLive.startsAt ? `WINDOW: ${new Date(fwLive.startsAt).toLocaleDateString()} → ${fwLive.endsAt ? new Date(fwLive.endsAt).toLocaleDateString() : 'TBA'}` : 'PRICING WINDOW — DATES IN COMMUNITY'}
                </Text>
                <Text style={styles.metaTxt}>
                  {fwLive.live ? 'Pricing discussion is live in #division-africa + #division-world. Your vote matters now.' : 'You can vote anytime — the founder reviews every answer before setting the price.'}
                </Text>
              </View>
            )}
            <View style={styles.stepsBox}>
              <Text style={styles.stepsLabel}>HOW THIS WEEK RUNS</Text>
              <Text style={styles.stepLine}>1. TOUR — 60 sec · how tracking + the card works</Text>
              <Text style={styles.stepLine}>2. PRICING VOTE — 7 questions · your honest call (median, not mean)</Text>
              <Text style={styles.stepLine}>3. FOUNDER SETS PRICE — till opens · 3-day grace to pay</Text>
            </View>
            <Pressable onPress={welcomeNext} style={styles.cta}><Text style={styles.ctaTxt}>ENTER FOUNDERS WEEK ›</Text></Pressable>
          </Animated.View>
        )}

        {/* ── TOUR ── */}
        {step === 'tour' && (
          <Animated.View entering={FadeIn.duration(280)}>
            <Text style={styles.eyebrow}>FOUNDERS WEEK · TOUR {tourIdx + 1}/{TOUR_CARDS.length}</Text>
            <Animated.View key={TOUR_CARDS[tourIdx].eyebrow} entering={FadeInUp.duration(260)} style={[styles.tourCard, TOUR_CARDS[tourIdx].tone === 'gold' && styles.tourCardGold]}>
              <Text style={[styles.tourEyebrow, TOUR_CARDS[tourIdx].tone === 'gold' && { color: colors.warm }]}>{TOUR_CARDS[tourIdx].eyebrow}</Text>
              <Text style={styles.tourTitle}>{TOUR_CARDS[tourIdx].title}</Text>
              <Text style={styles.tourBody}>{TOUR_CARDS[tourIdx].body}</Text>
            </Animated.View>
            <View style={styles.dots}>{TOUR_CARDS.map((_, i) => (<View key={i} style={[styles.dot, i === tourIdx && styles.dotOn]} />))}</View>
            <Pressable onPress={tourNext} style={styles.cta}><Text style={styles.ctaTxt}>{tourIdx < TOUR_CARDS.length - 1 ? 'NEXT ›' : 'TOUR DONE — VOTE ON PRICING ›'}</Text></Pressable>
            <Pressable onPress={tourNext} hitSlop={8}><Text style={styles.skip}>SKIP TOUR — TAKE ME TO VOTING</Text></Pressable>
          </Animated.View>
        )}

        {/* ── PRICING DISCUSSION ── */}
        {step === 'pricing' && (
          <Animated.View entering={FadeIn.duration(280)}>
            <Text style={styles.eyebrow}>FOUNDERS WEEK · PRICING DISCUSSION</Text>
            <Text style={styles.titleSm}>WHAT SHOULD THIS COST?</Text>
            <Text style={styles.subSm}>MEDIAN, NOT MEAN — ONE LOUD VOICE CANNOT DRAG IT</Text>
            <View style={styles.progressBox}>
              <Text style={styles.progressLabel}>{answeredCount}/{totalCount} ANSWERED</Text>
              <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${totalCount ? (answeredCount / totalCount) * 100 : 0}%` }]} /></View>
              <Text style={styles.progressHint}>Change your mind anytime while discussion is open. Founder sees medians, not your name.</Text>
            </View>
            {!consult && <Text style={styles.muted}>LOADING QUESTIONS… (offline? pull to refresh)</Text>}
            {consult?.length === 0 && <Text style={styles.muted}>NO PRICING QUESTIONS ARE OPEN YET. The founder will publish them during Founders Week — check back or watch the halls.</Text>}
            {consult?.map((q) => (
              <View key={q.slug} style={[styles.qCard, q.answered && styles.qCardDone]}>
                <Text style={styles.qPrompt}>{q.prompt}</Text>
                {q.helper && <Text style={styles.qHelper}>{q.helper}</Text>}
                {q.kind === 'choice' && q.options && (
                  <View style={styles.choiceRow}>
                    {q.options.map((opt) => {
                      const selected = (answers[q.slug]?.choice ?? q.myChoice) === opt;
                      return (
                        <Pressable key={opt} onPress={() => setAnswers((m) => ({ ...m, [q.slug]: { ...m[q.slug], choice: opt } }))} style={[styles.choiceChip, selected && styles.choiceChipOn]}>
                          <Text style={[styles.choiceTxt, selected && styles.choiceTxtOn]}>{opt}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {q.kind === 'price' && (
                  <View style={styles.priceRow}>
                    <Text style={styles.pricePrefix}>₦ / £</Text>
                    <TextInput
                      value={answers[q.slug]?.amount ?? (q.myAmount != null ? String(q.myAmount) : '')}
                      onChangeText={(v) => setAnswers((m) => ({ ...m, [q.slug]: { ...m[q.slug], amount: v.replace(/[^0-9.]/g, '').slice(0, 7) } }))}
                      placeholder={q.myAmount != null ? String(q.myAmount) : 'YOUR PRICE'}
                      placeholderTextColor="rgba(143,184,155,0.4)"
                      keyboardType="number-pad"
                      style={styles.priceInput}
                    />
                  </View>
                )}
                {q.kind === 'text' && (
                  <TextInput
                    value={answers[q.slug]?.note ?? q.myNote ?? ''}
                    onChangeText={(v) => setAnswers((m) => ({ ...m, [q.slug]: { ...m[q.slug], note: v.slice(0, 400) } }))}
                    placeholder="YOUR HONEST NOTE — IN YOUR OWN WORDS"
                    placeholderTextColor="rgba(143,184,155,0.4)"
                    style={styles.textInput}
                    multiline
                  />
                )}
                {/* note field for choice/price too */}
                {(q.kind === 'choice' || q.kind === 'price') && (
                  <TextInput
                    value={answers[q.slug]?.note ?? q.myNote ?? ''}
                    onChangeText={(v) => setAnswers((m) => ({ ...m, [q.slug]: { ...m[q.slug], note: v.slice(0, 300) } }))}
                    placeholder="OPTIONAL NOTE — WHY? (helps the founder more than the number)"
                    placeholderTextColor="rgba(143,184,155,0.35)"
                    style={[styles.textInput, { minHeight: 44, marginTop: 8 }]}
                    multiline
                  />
                )}
                {q.myChoice || q.myAmount != null || q.myNote ? (
                  <Text style={styles.answeredTxt}>{q.answered ? `✓ YOU SAID: ${q.myChoice ?? q.myAmount ?? 'noted'}` : 'NOT YET ANSWERED'}</Text>
                ) : null}
                <Pressable
                  onPress={() => void submitConsult(q.slug)}
                  style={[styles.smallCta, savingSlug === q.slug && { opacity: 0.5 }]}
                >
                  <Text style={styles.smallCtaTxt}>{savingSlug === q.slug ? 'SAVING…' : q.answered ? 'UPDATE MY VOTE ›' : 'SUBMIT VOTE ›'}</Text>
                </Pressable>
              </View>
            ))}
            <View style={styles.hintBox}>
              <Text style={styles.hintLabel}>HOW THE PRICE IS SET</Text>
              <Text style={styles.hintTxt}>Medians per question, not averages. Quotes are read. Founder publishes the final price, till opens, you get 3 days grace to pay. Your baseline card waits — nothing is ever deleted.</Text>
            </View>
            <Pressable onPress={() => setStep('await')} style={[styles.cta, { backgroundColor: colors.accent }]}><Text style={[styles.ctaTxt, { color: '#2a1410' }]}>DONE VOTING — WHAT HAPPENS NEXT ›</Text></Pressable>
            <Pressable onPress={() => setStep('await')} hitSlop={8}><Text style={styles.skip}>SKIP FOR NOW — I’LL VOTE IN THE HALLS</Text></Pressable>
          </Animated.View>
        )}

        {/* ── AWAIT / GRACE ── */}
        {step === 'await' && (
          <Animated.View entering={FadeIn.duration(280)}>
            <Text style={styles.eyebrow}>FOUNDERS WEEK · WHAT HAPPENS NEXT</Text>
            <View style={[styles.statusBox, isActive && styles.statusOk, isGrace && styles.statusGrace]}>
              <Text style={styles.statusLabel}>
                {isActive ? 'YOU ARE ACTIVE' : isGrace ? `GRACE — ${graceLeft} DAY${graceLeft === 1 ? '' : 'S'} LEFT` : isPriced ? 'PRICE IS SET — GRACE IS LIVE' : 'FOUNDER IS REVIEWING THE VOTES'}
              </Text>
              <Text style={styles.statusBody}>
                {isActive
                  ? 'Your pass is active. Founders Week is complete — the floor is yours.'
                  : isGrace
                  ? `Your founders pass needs renewal. You have ${graceLeft} day${graceLeft === 1 ? '' : 's'} of grace to pay — nothing is deleted, but the floor closes when grace ends.`
                  : isPriced
                  ? 'The founder has set the live prices. New players now pay to enter. As a founder-week member you have 3 days grace to claim your pass.'
                  : 'You have voted. The founder is reading every median and every quote. When the price is set, the till opens and your grace window starts. You’ll be notified in the app and in the halls.'}
              </Text>
            </View>

            {isPriced && livePrices && (
              <View style={styles.pricePreview}>
                <Text style={styles.pricePreviewLabel}>LIVE PRICES — WHAT YOU’D PAY TODAY</Text>
                {livePrices.slice(0, 4).map((p) => (
                  <View key={p.code} style={styles.priceRowLive}>
                    <Text style={styles.priceTitle}>{p.title}</Text>
                    <Text style={styles.priceDisplay}>{p.display}</Text>
                  </View>
                ))}
                {livePrices.length > 4 && <Text style={styles.priceMore}>+ {livePrices.length - 4} more in THE TILL</Text>}
              </View>
            )}

            {!isActive && (
              <View style={styles.graceBox}>
                <Text style={styles.graceLabel}>YOUR 3-DAY GRACE</Text>
                <Text style={styles.graceTxt}>
                  After pricing is published, you have 3 full days to pay. No one is removed wondering why. If you need help, use CONTACT THE FOUNDER in Settings — card trouble, OPay transfer, or “talk to me” all go to the founder’s inbox.
                </Text>
              </View>
            )}

            <Pressable onPress={completeFoundersWeek} style={styles.cta}><Text style={styles.ctaTxt}>{isGrace ? `CONTINUE — PAY IN ${graceLeft} DAY${graceLeft === 1 ? '' : 'S'} ›` : 'CONTINUE TO THE FLOOR ›'}</Text></Pressable>
            <Pressable onPress={completeFoundersWeek} hitSlop={8}><Text style={styles.skip}>I’LL PAY FROM THE TILL IN SETTINGS</Text></Pressable>
            <Text style={styles.footNote}>Founders Week progress is saved. You can always re-vote in Community → pricing halls or Settings → Pricing Discussion.</Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  brand: { fontFamily: monoFont, fontSize: 8, fontWeight: '800', letterSpacing: 3, color: 'rgba(238,242,236,0.9)' },
  kicker: { marginTop: 6, fontFamily: monoFont, fontSize: 7, fontWeight: '800', letterSpacing: 2.2, color: colors.primary },
  eyebrow: { color: colors.muted, fontFamily: monoFont, fontSize: 9, letterSpacing: 2, textAlign: 'center' },
  title: { color: colors.fg, fontFamily: displayFont, fontSize: 30, lineHeight: 31, letterSpacing: 0.8, textAlign: 'center', marginTop: 8 },
  titleSm: { color: colors.fg, fontFamily: displayFont, fontSize: 22, lineHeight: 23, letterSpacing: 0.6, textAlign: 'center', marginTop: 8 },
  sub: { color: colors.accent, fontFamily: monoFont, fontSize: 9, letterSpacing: 2, textAlign: 'center', marginTop: 8 },
  subSm: { color: colors.muted, fontFamily: monoFont, fontSize: 8, letterSpacing: 1.6, textAlign: 'center', marginTop: 6 },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  coachFace: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  coachName: { color: colors.muted, fontFamily: monoFont, fontSize: 10, letterSpacing: 1.6 },
  card: { marginTop: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, padding: 14 },
  cardLabel: { color: colors.accent, fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 2 },
  cardBody: { color: '#dbe7dd', fontFamily: bodyFont, fontSize: 12.5, lineHeight: 19, marginTop: 8 },
  metaBox: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(57,255,106,0.2)', borderRadius: 10, backgroundColor: 'rgba(57,255,106,0.06)', padding: 12 },
  metaLabel: { color: colors.primary, fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.4 },
  metaTxt: { color: '#9db4a3', fontFamily: bodyFont, fontSize: 10.5, lineHeight: 15, marginTop: 6 },
  stepsBox: { marginTop: 12, borderRadius: 10, backgroundColor: 'rgba(242,192,120,0.07)', borderLeftWidth: 2, borderLeftColor: colors.accent, padding: 11 },
  stepsLabel: { color: colors.accent, fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.4 },
  stepLine: { color: '#cbd8cf', fontFamily: bodyFont, fontSize: 11, lineHeight: 16, marginTop: 4 },
  cta: { marginTop: 18, backgroundColor: colors.primary, borderRadius: 25, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  ctaTxt: { color: '#0a0f0a', fontFamily: bodyFontHeavy, fontSize: 13.5, letterSpacing: 0.8 },
  skip: { color: colors.muted, fontFamily: monoFont, fontSize: 9, letterSpacing: 1, textAlign: 'center', marginTop: 12 },
  tourCard: { marginTop: 16, borderWidth: 1.2, borderColor: 'rgba(57,255,106,0.4)', borderRadius: 18, backgroundColor: 'rgba(15,26,19,0.9)', padding: 18, minHeight: 160 },
  tourCardGold: { borderColor: 'rgba(242,192,120,0.5)', backgroundColor: 'rgba(20,16,8,0.92)' },
  tourEyebrow: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 2.6, color: colors.accent },
  tourTitle: { marginTop: 10, fontFamily: displayFont, fontSize: 21, lineHeight: 22, letterSpacing: 0.6, color: colors.fg },
  tourBody: { marginTop: 12, fontFamily: bodyFont, fontSize: 12.5, lineHeight: 18, color: '#b9cabe' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(143,184,155,0.3)' },
  dotOn: { backgroundColor: colors.primary, width: 16 },
  progressBox: { marginTop: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface, padding: 12 },
  progressLabel: { color: colors.primary, fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.4 },
  progressBar: { marginTop: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  progressHint: { marginTop: 6, color: colors.muted, fontFamily: monoFont, fontSize: 7, letterSpacing: 0.6 },
  qCard: { marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, padding: 13 },
  qCardDone: { borderColor: 'rgba(57,255,106,0.35)', backgroundColor: 'rgba(57,255,106,0.05)' },
  qPrompt: { color: colors.fg, fontFamily: bodyFontHeavy, fontSize: 12.5, lineHeight: 18 },
  qHelper: { color: colors.muted, fontFamily: bodyFont, fontSize: 10.5, lineHeight: 15, marginTop: 4 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  choiceChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: colors.bg },
  choiceChipOn: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.12)' },
  choiceTxt: { color: colors.muted, fontFamily: monoFont, fontSize: 9, letterSpacing: 0.8 },
  choiceTxtOn: { color: colors.primary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  pricePrefix: { color: colors.muted, fontFamily: monoFont, fontSize: 9, letterSpacing: 1 },
  priceInput: { flex: 1, borderWidth: 1, borderColor: 'rgba(57,255,106,0.25)', borderRadius: 9, backgroundColor: '#0a0f0a', color: colors.fg, fontFamily: monoFont, fontSize: 14, padding: 10, textAlign: 'center' },
  textInput: { marginTop: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: '#0a0f0a', color: colors.fg, fontFamily: bodyFont, fontSize: 11, lineHeight: 16, padding: 10, minHeight: 52, textAlignVertical: 'top' },
  answeredTxt: { marginTop: 8, color: colors.primary, fontFamily: monoFont, fontSize: 7, letterSpacing: 1 },
  smallCta: { marginTop: 10, backgroundColor: colors.primary, borderRadius: 9, paddingVertical: 10, alignItems: 'center' },
  smallCtaTxt: { color: '#0a0f0a', fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', letterSpacing: 1 },
  hintBox: { marginTop: 14, borderLeftWidth: 2, borderLeftColor: colors.accent, borderRadius: 8, backgroundColor: 'rgba(242,192,120,0.07)', padding: 11 },
  hintLabel: { color: colors.accent, fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.4 },
  hintTxt: { color: '#cbd8cf', fontFamily: bodyFont, fontSize: 11, lineHeight: 16, marginTop: 4 },
  statusBox: { marginTop: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, padding: 14 },
  statusOk: { borderColor: 'rgba(57,255,106,0.45)', backgroundColor: 'rgba(57,255,106,0.08)' },
  statusGrace: { borderColor: 'rgba(242,192,120,0.45)', backgroundColor: 'rgba(242,192,120,0.08)' },
  statusLabel: { color: colors.primary, fontFamily: monoFont, fontSize: 8, fontWeight: '900', letterSpacing: 1.8 },
  statusBody: { color: '#dbe7dd', fontFamily: bodyFont, fontSize: 12, lineHeight: 18, marginTop: 8 },
  pricePreview: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(57,255,106,0.18)', borderRadius: 11, backgroundColor: 'rgba(10,20,13,0.6)', padding: 12 },
  pricePreviewLabel: { color: colors.muted, fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.4 },
  priceRowLive: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 10 },
  priceTitle: { color: colors.fg, fontFamily: monoFont, fontSize: 9, letterSpacing: 0.6, flex: 1 },
  priceDisplay: { color: colors.primary, fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  priceMore: { marginTop: 8, color: colors.muted, fontFamily: monoFont, fontSize: 7, letterSpacing: 1 },
  graceBox: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(242,192,120,0.3)', borderRadius: 10, backgroundColor: 'rgba(242,192,120,0.06)', padding: 12 },
  graceLabel: { color: colors.warm, fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.5 },
  graceTxt: { color: '#cbd8cf', fontFamily: bodyFont, fontSize: 11, lineHeight: 16, marginTop: 6 },
  muted: { color: colors.muted, fontFamily: monoFont, fontSize: 9, letterSpacing: 0.6, marginTop: 12, textAlign: 'center' },
  footNote: { color: colors.muted, fontFamily: monoFont, fontSize: 7, letterSpacing: 0.6, textAlign: 'center', marginTop: 12, lineHeight: 11 },
});
