import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import ArtBand from '../components/ArtBand';

// the lone figure and his shadow — the mirror's face: you against your own tape
const MIRROR_ART = require('../../assets/art/mirror-drill.jpg');
import { CheckIcon, ChevronLeftIcon, XMarkIcon } from '../components/Icons';
import { Coach } from '../data/coaches';
import { JourneyStage } from '../data/journey';
import { COMPOSURE_LABELS } from '../data/matches';
import {
  addMoment,
  answerCarriedLesson,
  answerMoment,
  atFullTime,
  atHalfTime,
  beginMatch,
  finishMirrorLesson,
  MOMENT_QUESTIONS,
  INTENTION_QUESTIONS,
  HALF_TIME_QUESTIONS,
  FULL_TIME_QUESTIONS,
  MomentAnswers,
  openComparePhase,
  openLessonPhase,
  openReviewPhase,
  openScorePhase,
  removeMoment,
  saveFullTime,
  saveHalfTime,
  saveIntention,
  setClosestVersion,
  startMirrorSession,
  useMirrorSession,
  VersionKey,
} from '../data/mirrorSession';
import { useLessonThread } from '../data/lessonThread';
import { sfx } from '../audio/sound';
import { hasFunnelEvent, trackFunnel } from '../data/funnel';
import { colors, monoFont, displayFont, bodyFont } from '../theme';
import HonestyBadge from '../components/HonestyBadge';
import { isValidReflection } from '../data/honestyGuard';

const MIN_ANSWER = 2;

// ── small building blocks ────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      <View style={styles.sectionTitleLine} />
    </View>
  );
}

function QuestionCard({
  q,
  value,
  onChange,
  hint,
  index,
}: {
  q: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  index: number;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(260).delay(Math.min(index * 40, 240))} style={styles.qCard}>
      <Text style={styles.qLabel}>{q}</Text>
      <TextInput
        style={styles.qInput}
        value={value}
        onChangeText={onChange}
        multiline
        placeholder={hint ?? 'YOUR WORDS — NOBODY ELSE’S'}
        placeholderTextColor="rgba(143,184,155,0.35)"
      />
    </Animated.View>
  );
}

function ComposureChips({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.composureRow}>
      {COMPOSURE_LABELS.map((label, i) => {
        const n = i + 1;
        const on = value === n;
        return (
          <Pressable
            key={label}
            onPress={() => {
              sfx('pop');
              onChange(n);
            }}
            style={[styles.composureChip, on && styles.composureChipOn]}
          >
            <Text style={[styles.composureTxt, on && styles.composureTxtOn]}>{n}</Text>
            <Text style={[styles.composureLabel, on && styles.composureLabelOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StepButton({
  label,
  onPress,
  disabled,
  subtle,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  subtle?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.stepBtn, disabled && styles.stepBtnDisabled, subtle && styles.stepBtnSubtle]}
    >
      <Text style={[styles.stepBtnTxt, subtle && styles.stepBtnTxtSubtle]}>{label}</Text>
    </Pressable>
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

function ScoreRow({ gf, ga, onChange }: { gf: number; ga: number; onChange: (gf: number, ga: number) => void }) {
  const nudge = (side: 'gf' | 'ga', d: number) =>
    onChange(side === 'gf' ? Math.max(0, Math.min(9, gf + d)) : gf, side === 'ga' ? Math.max(0, Math.min(9, ga + d)) : ga);
  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreSide}>
        <Text style={styles.scoreLabel}>YOU</Text>
        <View style={styles.stepper}>
          <Pressable onPress={() => nudge('gf', -1)} style={styles.stepperBtn}><Text style={styles.stepperTxt}>−</Text></Pressable>
          <Text style={styles.scoreNum}>{gf}</Text>
          <Pressable onPress={() => nudge('gf', 1)} style={styles.stepperBtn}><Text style={styles.stepperTxt}>+</Text></Pressable>
        </View>
      </View>
      <Text style={styles.scoreDash}>–</Text>
      <View style={styles.scoreSide}>
        <Text style={styles.scoreLabel}>THEM</Text>
        <View style={styles.stepper}>
          <Pressable onPress={() => nudge('ga', -1)} style={styles.stepperBtn}><Text style={styles.stepperTxt}>−</Text></Pressable>
          <Text style={styles.scoreNum}>{ga}</Text>
          <Pressable onPress={() => nudge('ga', 1)} style={styles.stepperBtn}><Text style={styles.stepperTxt}>+</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

function PhaseHeader({ stage, onLeave, phaseLabel }: { stage: JourneyStage; onLeave: () => void; phaseLabel: string }) {
  return (
    <View style={styles.phaseHeader}>
      <Pressable onPress={onLeave} hitSlop={10} style={styles.phaseBack}>
        <ChevronLeftIcon size={16} color={colors.muted} />
        <Text style={styles.phaseBackTxt}>LEAVE</Text>
      </Pressable>
      <View style={styles.phaseHeaderCenter}>
        <Text style={styles.phaseBrand}>MATCH REVIEW</Text>
        <Text style={styles.phaseStage}>CHAPTER {stage.n} · {stage.key}</Text>
      </View>
      <View style={styles.phaseBadge}>
        <Text style={styles.phaseBadgeTxt}>{phaseLabel}</Text>
      </View>
    </View>
  );
}

// ── the screen ───────────────────────────────────────────────

export default function MirrorSessionScreen({
  coach,
  stage,
  onClose,
}: {
  coach: Coach;
  stage: JourneyStage;
  onClose: (completed: boolean) => void;
}) {
  const mirror = useMirrorSession();
  const thread = useLessonThread();
  const { width: winW } = useWindowDimensions();
  const bandW = Math.min(winW, 430);
  const [ready, setReady] = useState(false);

  // start a fresh session the first time this screen opens
  useEffect(() => {
    if (mirror.phase === 'idle' && !ready) {
      startMirrorSession(stage.n);
      setReady(true);
    }
  }, [mirror.phase, ready, stage.n]);

  // ── local draft state, per phase ──
  const [verdict, setVerdict] = useState<'held' | 'broke' | null>(null);
  const [verdictNote, setVerdictNote] = useState('');
  const [intention, setIntention] = useState<Record<string, string>>({});
  const [startComposure, setStartComposure] = useState(3);
  const [half, setHalf] = useState<Record<string, string>>({});
  const [halfComposure, setHalfComposure] = useState(3);
  const [full, setFull] = useState<Record<string, string>>({});
  const [fullComposure, setFullComposure] = useState(3);
  const [gf, setGf] = useState(0);
  const [ga, setGa] = useState(0);
  const [momentLabel, setMomentLabel] = useState('');
  const [momentStart, setMomentStart] = useState(0);
  const [momentEnd, setMomentEnd] = useState(5);
  const [momentDrafts, setMomentDrafts] = useState<Record<string, Partial<MomentAnswers>>>({});
  const [lessonDraft, setLessonDraft] = useState('');

  const carried = thread.current;
  const completed = mirror.phase === 'done';

  // answers already on the store win on resume — local drafts take over while typing
  const effHalf = (k: string) => {
    const v = (mirror.half as Record<string, unknown> | null)?.[k] ?? half[k];
    return typeof v === 'string' ? v : '';
  };
  const effFull = (k: string) => {
    const v = (mirror.full as Record<string, unknown> | null)?.[k] ?? full[k];
    return typeof v === 'string' ? v : '';
  };
  const allIntentionAnswered = INTENTION_QUESTIONS.every((q) => isValidReflection(intention[q.key] ?? '', { minLength: MIN_ANSWER, minWords: 1 }));
  const allHalfAnswered = HALF_TIME_QUESTIONS.every((q) => isValidReflection(effHalf(q.key), { minLength: MIN_ANSWER, minWords: 1 }));
  const allFullAnswered = FULL_TIME_QUESTIONS.every((q) => isValidReflection(effFull(q.key), { minLength: MIN_ANSWER, minWords: 1 }));

  const momentsAllAnswered = mirror.moments.length > 0 && mirror.moments.every((m) =>
    MOMENT_QUESTIONS.every((q) => isValidReflection((momentDrafts[m.id] ?? m.answers ?? {})[q.key] ?? '', { minLength: MIN_ANSWER, minWords: 1 })),
  );

  const handleLeave = () => {
    sfx('tap');
    onClose(false);
  };

  const handleDone = () => {
    sfx('success');
    void hasFunnelEvent('match_review_completed').then((hasFirst) => {
      void trackFunnel('match_review_completed');
      if (hasFirst) void trackFunnel('second_match_review_completed');
    });
    onClose(true);
  };

  const phaseLabel: Record<string, string> = {
    'thread-check': 'YOUR LESSON',
    intention: 'INTENTION',
    live: 'LIVE',
    'half-time': 'HALF-TIME',
    'second-half': '2ND HALF',
    'full-time': 'FULL-TIME',
    division: 'DIVISION',
    review: 'REVIEW',
    compare: 'COMPARE',
    lesson: 'THE LESSON',
    done: 'RECEIPT',
  };

  return (
    <View style={styles.flex}>
      <GridBackground />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <PhaseHeader
          stage={stage}
          onLeave={completed ? () => onClose(true) : handleLeave}
          phaseLabel={phaseLabel[mirror.phase] ?? 'SESSION'}
        />
        {/* the mirror strip — a photographic spine behind every phase; slim
            so the questions keep the room */}
        <ArtBand source={MIRROR_ART} width={bandW} height={58} warmAt={null} grain={0.05} lift={-(bandW / 1.7917 - 58) * 0.9} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* ══ THREAD CHECK — the carried lesson must be answered first ══ */}
          {mirror.phase === 'thread-check' && (
            <Animated.View entering={FadeInUp.duration(320)}>
              <Text style={styles.heroLine}>THE LESSON YOU SWORE IS ON THE TABLE.</Text>
              <Text style={styles.heroSub}>Before a new match, answer for it. A lesson you create and immediately forget is a mood, not a lesson.</Text>
              {carried && (
                <View style={styles.threadCard}>
                  <Text style={styles.threadTag}>YOUR LESSON · CARRIED FROM CHAPTER {carried.stageN}</Text>
                  <Text style={styles.threadLesson}>“{carried.lesson}”</Text>
                </View>
              )}
              <Text style={styles.qLabel}>HOW DID IT HOLD IN YOUR LAST MATCH?</Text>
              <View style={styles.verdictRow}>
                <Pressable style={[styles.verdictBtn, verdict === 'held' && styles.verdictHeld]} onPress={() => { sfx('pop'); setVerdict('held'); }}>
                  <CheckIcon size={12} color={verdict === 'held' ? '#05130a' : colors.primary} />
                  <Text style={[styles.verdictTxt, verdict === 'held' && styles.verdictTxtOn]}>HELD</Text>
                </Pressable>
                <Pressable style={[styles.verdictBtn, verdict === 'broke' && styles.verdictBroke]} onPress={() => { sfx('pop'); setVerdict('broke'); }}>
                  <XMarkIcon size={11} color={verdict === 'broke' ? '#05130a' : colors.loss} />
                  <Text style={[styles.verdictTxt, verdict === 'broke' && styles.verdictTxtOn]}>BROKE</Text>
                </Pressable>
              </View>
              <QuestionCard
                index={0}
                q="WHERE DID IT APPEAR OR DISAPPEAR? ONE HONEST LINE."
                value={verdictNote}
                onChange={setVerdictNote}
                hint="the minute, the situation, the trigger"
              />
              <HonestyBadge
                text={verdictNote}
                options={{ minLength: MIN_ANSWER, minWords: 1 }}
                defaultNote="ONE HONEST LINE — WHERE DID IT HOLD OR SNAP?"
                coachId={coach.id}
              />
              <StepButton
                label="ANSWER FOR YOUR LESSON · CONTINUE ›"
                disabled={!verdict || !isValidReflection(verdictNote, { minLength: MIN_ANSWER, minWords: 1 })}
                onPress={() => {
                  sfx('whoosh');
                  void trackFunnel('lesson_verdict_recorded');
                  answerCarriedLesson(verdict!, verdictNote);
                }}
              />
            </Animated.View>
          )}

          {/* ══ INTENTION — before the score changes the emotions ══ */}
          {mirror.phase === 'intention' && !mirror.intention && (
            <Animated.View entering={FadeInUp.duration(320)}>
              <Text style={styles.heroLine}>BEFORE THE MATCH — PICK ONE FOCUS.</Text>
              <Text style={styles.heroSub}>Write one useful intention while the score is 0–0. The session keeps it beside what you see later.</Text>
              <View style={styles.sessionGuide}>
                <Text style={styles.sessionGuideTitle}>YOU ARE IN THE RIGHT PLACE. HERE IS WHAT HAPPENS NEXT.</Text>
                <View style={styles.sessionGuideSteps}>
                  <Text style={styles.sessionGuideStep}>1 · ONE FOCUS NOW</Text>
                  <Text style={styles.sessionGuideStep}>2 · TWO LINES AT HALF-TIME</Text>
                  <Text style={styles.sessionGuideStep}>3 · SCORE + FIRST READ AFTER FULL-TIME</Text>
                  <Text style={styles.sessionGuideStep}>4 · ONE LESSON FOR NEXT MATCH</Text>
                </View>
                <Text style={styles.sessionGuideNote}>This is not a test. You can leave at any time; your saved answers will still be here when you return.</Text>
              </View>
              {INTENTION_QUESTIONS.map((q, i) => (
                <QuestionCard
                  key={q.key}
                  index={i}
                  q={q.label}
                  hint={q.hint}
                  value={intention[q.key] ?? ''}
                  onChange={(v) => setIntention((d) => ({ ...d, [q.key]: v }))}
                />
              ))}
              <SectionTitle>STARTING COMPOSURE</SectionTitle>
              <ComposureChips value={startComposure} onChange={setStartComposure} />
              <StepButton
                label="SAVE THE INTENTION ›"
                disabled={!allIntentionAnswered}
                onPress={() => {
                  sfx('whoosh');
                  saveIntention({
                    practice: intention.practice ?? '',
                    pressure: intention.pressure ?? '',
                    avoid: intention.avoid ?? '',
                    useful: intention.useful ?? '',
                    attention: intention.attention ?? '',
                    composure: startComposure,
                  });
                }}
              />
            </Animated.View>
          )}

          {mirror.phase === 'intention' && mirror.intention && (
            <Animated.View entering={FadeInUp.duration(320)}>
              <Text style={styles.heroLine}>FOCUS SEALED. RECORD AS USUAL AND PLAY FOR REAL.</Text>
              <View style={styles.receiptCard}>
                <Text style={styles.receiptTag}>YOUR ONE FOCUS — READ IT BEFORE YOU PLAY</Text>
                <Text style={styles.receiptLine}>FOCUS: {mirror.intention.practice.toUpperCase()}</Text>
              </View>
              <View style={styles.armNote}>
                <Text style={styles.armNoteTxt}>
                  THE CHINEDU WAY: Record your match as usual, watch your tape back, and pen your key moments on paper. Cool down for 30 minutes after the match, then type your results into your database. There is a special connection a biro has to a book that cannot be typed.
                </Text>
              </View>
              <StepButton
                label="FOCUS SAVED — BEGIN MATCH ›"
                onPress={() => {
                  sfx('whoosh');
                  beginMatch();
                }}
              />
            </Animated.View>
          )}

          {/* ══ LIVE — first half ══ */}
          {(mirror.phase === 'live' || mirror.phase === 'second-half') && (
            <Animated.View entering={FadeInUp.duration(320)}>
              <Text style={styles.heroLine}>{mirror.phase === 'live' ? 'FIRST HALF — PLAY THE MATCH.' : 'SECOND HALF — PLAY YOUR STATED ADJUSTMENT.'}</Text>
              <View style={styles.liveCard}>
                <MiniStat label="SCORE" value={`${gf} – ${ga}`} />
                <MiniStat
                  label="MODE"
                  value="MANUAL"
                />
                <MiniStat label="PHASE" value={mirror.phase === 'live' ? '1ST HALF' : '2ND HALF'} />
              </View>
              {mirror.phase === 'second-half' && mirror.half && (
                <View style={styles.receiptCard}>
                  <Text style={styles.receiptTag}>WHAT YOU PROMISED AT HALF-TIME</Text>
                  <Text style={styles.receiptLine}>TRY: {mirror.half.secondHalf.toUpperCase()}</Text>
                </View>
              )}
              {mirror.phase === 'live' ? (
                <StepButton label="HALF-TIME CHECKPOINT — THE MATCH IS AT HALF-TIME" onPress={() => { sfx('whoosh'); atHalfTime(); }} />
              ) : (
                <StepButton label="FULL TIME — LOG THE SCORE" onPress={() => { sfx('whoosh'); openScorePhase(); }} />
              )}
            </Animated.View>
          )}

          {/* score logging (before the full-time reflection) */}
          {mirror.phase === 'score' && (
            <Animated.View entering={FadeInUp.duration(320)}>
              <Text style={styles.heroLine}>FULL TIME. SAVE THE MATCH TO HISTORY.</Text>
              <Text style={styles.heroSub}>The receipt is written to your Match History — the source of truth the whole journey is graded from.</Text>
              <ScoreRow gf={gf} ga={ga} onChange={(a, b) => { setGf(a); setGa(b); }} />
              <StepButton
                label="LOG THE MATCH · UNLOCK THE REFLECTION ›"
                onPress={() => {
                  sfx('whoosh');
                  atFullTime(gf, ga);
                }}
              />
            </Animated.View>
          )}

          {/* ══ HALF-TIME reflection ══ */}
          {mirror.phase === 'half-time' && (
            <Animated.View entering={FadeInUp.duration(320)}>
              <Text style={styles.heroLine}>HALF-TIME. NAME THE PATTERN, THEN PICK ONE ADJUSTMENT.</Text>
              <Text style={styles.heroSub}>Two quick lines while the match is still alive. The app does not provide the answer.</Text>
              {HALF_TIME_QUESTIONS.map((q, i) => (
                <QuestionCard
                  key={q.key}
                  index={i}
                  q={q.label}
                  hint={q.hint}
                  value={effHalf(q.key)}
                  onChange={(v) => setHalf((d) => ({ ...d, [q.key]: v }))}
                />
              ))}
              <SectionTitle>HALF-TIME COMPOSURE</SectionTitle>
              <ComposureChips value={mirror.half?.composure ?? halfComposure} onChange={setHalfComposure} />
              <StepButton
                label="SAVE THE ADJUSTMENT · SECOND HALF ›"
                disabled={!allHalfAnswered}
                onPress={() => {
                  sfx('whoosh');
                  saveHalfTime({
                    refusing: half.refusing ?? '',
                    rushing: half.rushing ?? '',
                    danger: half.danger ?? '',
                    afterLoss: half.afterLoss ?? '',
                    following: half.following ?? '',
                    emotion: half.emotion ?? '',
                    secondHalf: half.secondHalf ?? '',
                    composure: halfComposure,
                  });
                }}
              />
            </Animated.View>
          )}

          {/* ══ FULL-TIME reflection — memory BEFORE the recording ══ */}
          {mirror.phase === 'full-time' && (
            <Animated.View entering={FadeInUp.duration(320)}>
              <Text style={styles.heroLine}>BEFORE THE TAPE — WHAT DECIDED IT, AND WHAT CHANGES?</Text>
              <Text style={styles.heroSub}>After your cool-down, write two lines from memory first. Then watch the tape and name the moments that prove or challenge them.</Text>
              <View style={styles.receiptCard}>
                <Text style={styles.receiptTag}>THE RECEIPT</Text>
                <Text style={styles.receiptLine}>FINAL SCORE: {mirror.gf} – {mirror.ga}</Text>
              </View>
              {FULL_TIME_QUESTIONS.map((q, i) => (
                <QuestionCard
                  key={q.key}
                  index={i}
                  q={q.label}
                  hint={q.hint}
                  value={effFull(q.key)}
                  onChange={(v) => setFull((d) => ({ ...d, [q.key]: v }))}
                />
              ))}
              <SectionTitle>FINAL COMPOSURE</SectionTitle>
              <ComposureChips value={mirror.full?.composure ?? fullComposure} onChange={setFullComposure} />
              <StepButton
                label="SAVE MY FIRST READ · WATCH THE EVIDENCE ›"
                disabled={!allFullAnswered}
                onPress={() => {
                  sfx('whoosh');
                  saveFullTime({
                    decided: full.decided ?? '',
                    change: full.change ?? '',
                    didWell: full.didWell ?? '',
                    repeated: full.repeated ?? '',
                    emotions: full.emotions ?? '',
                    followed: full.followed ?? '',
                    believe: full.believe ?? '',
                    composure: fullComposure,
                  });
                }}
              />
            </Animated.View>
          )}

          {/* ══ DIVISION — the player divides the match themselves ══ */}
          {mirror.phase === 'division' && (
            <Animated.View entering={FadeInUp.duration(320)}>
              <Text style={styles.heroLine}>WATCH THE EVIDENCE. DO NOT LOOK FOR THE ANSWER YET.</Text>
              <Text style={styles.heroSub}>
                Divide the match into key moments YOURSELF — a rough in-app timeline or pen and paper, your call. The app does not choose your moments before you try.
              </Text>
              <View style={styles.armNote}>
                <Text style={styles.armNoteTxt}>WATCH YOUR CONSOLE RECORDING OR CLIPS YOURSELF, THEN NAME THE MOMENTS USING THE TIMELINE BELOW.</Text>
              </View>
              <View style={styles.divCard}>
                <Text style={styles.qLabel}>NAME THE MOMENT</Text>
                <TextInput
                  style={styles.qInput}
                  value={momentLabel}
                  onChangeText={setMomentLabel}
                  placeholder="e.g. CONCEDED AFTER A PANIC PASS"
                  placeholderTextColor="rgba(143,184,155,0.35)"
                />
                <Text style={styles.qLabel}>TIMELINE (MATCH MINUTES)</Text>
                <View style={styles.minRow}>
                  <MiniStat label="FROM" value={`${momentStart}’`} />
                  <MiniStat label="TO" value={`${momentEnd}’`} />
                  <View style={styles.minButtons}>
                    <Pressable onPress={() => setMomentStart((s) => Math.max(0, s - 1))} style={styles.stepperBtn}><Text style={styles.stepperTxt}>−</Text></Pressable>
                    <Pressable onPress={() => setMomentStart((s) => Math.min(44, s + 1))} style={styles.stepperBtn}><Text style={styles.stepperTxt}>+</Text></Pressable>
                    <Pressable onPress={() => setMomentEnd((e) => Math.max(momentStart + 1, e - 1))} style={styles.stepperBtn}><Text style={styles.stepperTxt}>−</Text></Pressable>
                    <Pressable onPress={() => setMomentEnd((e) => Math.min(45, e + 1))} style={styles.stepperBtn}><Text style={styles.stepperTxt}>+</Text></Pressable>
                  </View>
                </View>
              </View>
              <StepButton
                label="ADD THIS MOMENT ›"
                disabled={momentLabel.trim().length < 2}
                onPress={() => {
                  sfx('pop');
                  addMoment(momentLabel, momentStart, momentEnd);
                  setMomentLabel('');
                }}
              />
              {mirror.moments.map((m, i) => (
                <View key={m.id} style={styles.momentChip}>
                  <Text style={styles.momentChipTxt}>{i + 1}. {m.startMin}’–{m.endMin}’ · {m.label.toUpperCase()}</Text>
                  <View style={styles.momentChipActions}>

                    <Pressable hitSlop={8} onPress={() => removeMoment(m.id)}>
                      <XMarkIcon size={11} color={colors.loss} />
                    </Pressable>
                  </View>
                </View>
              ))}
              <StepButton
                label="MY DIVISION IS DONE — REVIEW THE MOMENTS ›"
                disabled={mirror.moments.length === 0}
                onPress={() => {
                  sfx('whoosh');
                  openReviewPhase();
                }}
              />
            </Animated.View>
          )}

          {/* ══ REVIEW — per-moment, in the player's own words ══ */}
          {mirror.phase === 'review' && (
            <Animated.View entering={FadeInUp.duration(320)}>
              <Text style={styles.heroLine}>EVERY MOMENT, YOUR WORDS.</Text>
              <Text style={styles.heroSub}>Use your console recording or clips as your evidence. The app never writes your explanation or diagnoses your psychology for you.</Text>
              {mirror.moments.map((m, mi) => {
                // local draft wins while typing; the store answer is the source
                // of truth after a resume, so a reopened session shows its text
                const draft = momentDrafts[m.id] ?? m.answers ?? {};
                return (
                  <View key={m.id} style={styles.momentBlock}>
                    <View style={styles.momentBlockHead}>
                      <Text style={styles.momentBlockNum}>MOMENT {mi + 1}</Text>
                      <View style={styles.momentBlockHeadRight}>

                        <Text style={styles.momentBlockTxt}>{m.startMin}’–{m.endMin}’ · {m.label.toUpperCase()}</Text>
                      </View>
                    </View>
                    {MOMENT_QUESTIONS.map((q, qi) => (
                      <QuestionCard
                        key={q.key}
                        index={qi}
                        q={q.label}
                        value={draft[q.key] ?? ''}
                        onChange={(v) => {
                          const next = { ...draft, [q.key]: v };
                          setMomentDrafts((d) => ({ ...d, [m.id]: next }));
                          answerMoment(m.id, q.key, v);
                        }}
                      />
                    ))}
                  </View>
                );
              })}
              <StepButton
                label="ALL MOMENTS ANSWERED — PUT THE VERSIONS BESIDE EACH OTHER ›"
                disabled={!momentsAllAnswered}
                onPress={() => {
                  sfx('whoosh');
                  openComparePhase();
                }}
              />
            </Animated.View>
          )}

          {/* ══ COMPARE — which version is closest to the evidence? ══ */}
          {mirror.phase === 'compare' && (
            <Animated.View entering={FadeInUp.duration(320)}>
              <Text style={styles.heroLine}>WHICH VERSION IS CLOSEST TO THE EVIDENCE?</Text>
              <Text style={styles.heroSub}>Same match. Four moments in time. The app does not accuse you — it just refuses to let you forget the sequence.</Text>
              {mirror.versions.map((v, i) => (
                <Pressable
                  key={v.key}
                  onPress={() => { sfx('pop'); setClosestVersion(v.key as VersionKey); }}
                  style={[styles.versionCard, mirror.closestVersion === v.key && styles.versionCardOn]}
                >
                  <Text style={[styles.versionTag, mirror.closestVersion === v.key && styles.versionTagOn]}>{v.label}</Text>
                  <Text style={styles.versionText}>“{v.text}”</Text>
                  {mirror.closestVersion === v.key && (
                    <View style={styles.versionPick}>
                      <CheckIcon size={10} color="#05130a" />
                      <Text style={styles.versionPickTxt}>YOUR ANSWER</Text>
                    </View>
                  )}
                </Pressable>
              ))}
              <StepButton
                label="CONTINUE TO THE LESSON ›"
                disabled={!mirror.closestVersion}
                onPress={() => {
                  sfx('whoosh');
                  openLessonPhase();
                }}
              />
            </Animated.View>
          )}

          {/* ══ LESSON — the one line ══ */}
          {mirror.phase === 'lesson' && (
            <Animated.View entering={FadeInUp.duration(320)}>
              <Text style={styles.heroLine}>WRITE THE ONE LINE YOU CARRY INTO THE NEXT MATCH.</Text>
              <Text style={styles.heroSub}>It becomes your lesson. The next session asks whether it held or broke — so it cannot be created and immediately forgotten.</Text>
              <QuestionCard
                index={0}
                q="THE LESSON — YOUR WORDS, NOBODY ELSE’S."
                value={lessonDraft}
                onChange={setLessonDraft}
                hint="one thing. specific. yours."
              />
              <HonestyBadge
                text={lessonDraft}
                options={{ minLength: 4, minWords: 2 }}
                defaultNote="ONE LINE YOU WOULD SIGN · YOUR LESSON"
                coachId={coach.id}
              />
              <StepButton
                label="SWEAR THE LESSON · SEAL THE SESSION ›"
                disabled={!isValidReflection(lessonDraft, { minLength: 4, minWords: 2 })}
                onPress={() => {
                  sfx('success');
                  finishMirrorLesson(lessonDraft);
                }}
              />
            </Animated.View>
          )}

          {/* ══ DONE — the receipt ══ */}
          {mirror.phase === 'done' && (
            <Animated.View entering={FadeInUp.duration(320)}>
              <Text style={styles.heroLine}>SESSION SEALED. THE EVIDENCE IS YOURS.</Text>
              <View style={styles.receiptCard}>
                <Text style={styles.receiptTag}>SESSION RECEIPT</Text>
                <Text style={styles.receiptLine}>SCORE: {mirror.gf} – {mirror.ga}</Text>

                <Text style={styles.receiptLine}>MOMENTS REVIEWED: {mirror.moments.length}</Text>
                <Text style={styles.receiptLine}>CLOSEST TO THE EVIDENCE: {(mirror.closestVersion ?? '—').toUpperCase()}</Text>
                {mirror.lessonId && <Text style={styles.receiptLine}>LESSON: SAVED · “{mirror.lesson.toUpperCase()}”</Text>}
              </View>
              <Text style={styles.heroSub}>
                The match is in Match History. Your lesson is saved for the next match. Nobody can outrun their receipts — and now you have one more.
              </Text>
              <StepButton label="RETURN TO THE ROOM ›" onPress={handleDone} />
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 6 },

  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(57,255,106,0.2)',
  },
  phaseBack: { flexDirection: 'row', alignItems: 'center', gap: 3, width: 64 },
  phaseBackTxt: { fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.4, color: colors.muted },
  phaseHeaderCenter: { alignItems: 'center', flex: 1 },
  phaseBrand: { fontFamily: monoFont, fontSize: 10, fontWeight: '900', letterSpacing: 2.6, color: colors.primary },
  phaseStage: { marginTop: 2, fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1.6, color: 'rgba(143,184,155,0.7)' },
  phaseBadge: {
    width: 64,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.5)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  phaseBadgeTxt: { fontFamily: monoFont, fontSize: 5.6, fontWeight: '800', letterSpacing: 1.2, color: colors.accent },

  heroLine: { marginTop: 16, fontFamily: displayFont, fontSize: 22, lineHeight: 24, letterSpacing: 0.6, color: colors.fg, textShadowColor: 'rgba(57,255,106,0.45)', textShadowRadius: 10 },
  heroSub: { marginTop: 7, fontFamily: bodyFont, fontSize: 12.5, lineHeight: 18, color: '#9db4a3' },
  sessionGuide: { marginTop: 13, borderWidth: 1, borderColor: 'rgba(242,192,120,0.4)', borderRadius: 12, backgroundColor: 'rgba(38,30,12,0.48)', padding: 12 },
  sessionGuideTitle: { fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', letterSpacing: 1.45, color: colors.accent },
  sessionGuideSteps: { marginTop: 9, gap: 5 },
  sessionGuideStep: { fontFamily: monoFont, fontSize: 6.5, fontWeight: '800', letterSpacing: 0.8, color: '#e1d8c8' },
  sessionGuideNote: { marginTop: 9, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(242,192,120,0.18)', fontFamily: bodyFont, fontSize: 10.3, lineHeight: 15, color: '#cfc3ad' },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 4 },
  sectionTitle: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '900', letterSpacing: 2, color: colors.muted },
  sectionTitleLine: { flex: 1, height: 1, backgroundColor: 'rgba(57,255,106,0.2)' },

  qCard: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(57,255,106,0.3)', borderRadius: 11, backgroundColor: 'rgba(12,20,14,0.9)', padding: 11 },
  qLabel: { fontFamily: monoFont, fontSize: 7.2, fontWeight: '800', letterSpacing: 1.2, color: colors.fg, lineHeight: 11 },
  qInput: { marginTop: 8, minHeight: 44, fontSize: 12, color: colors.fg, borderWidth: 1, borderColor: 'rgba(57,255,106,0.18)', borderRadius: 8, backgroundColor: 'rgba(5,10,6,0.7)', paddingHorizontal: 10, paddingVertical: 8, textAlignVertical: 'top' },

  composureRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  composureChip: { flex: 1, borderWidth: 1, borderColor: 'rgba(143,184,155,0.35)', borderRadius: 9, paddingVertical: 8, alignItems: 'center', gap: 3 },
  composureChipOn: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.1)' },
  composureTxt: { fontFamily: monoFont, fontSize: 11, fontWeight: '900', color: colors.muted },
  composureTxtOn: { color: colors.primary },
  composureLabel: { fontFamily: monoFont, fontSize: 4.4, letterSpacing: 0.8, color: 'rgba(143,184,155,0.6)' },
  composureLabelOn: { color: colors.primary },

  stepBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  stepBtnDisabled: { backgroundColor: 'rgba(57,255,106,0.18)', shadowOpacity: 0 },
  stepBtnSubtle: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(143,184,155,0.4)' },
  stepBtnTxt: { fontFamily: monoFont, fontSize: 8.6, fontWeight: '900', letterSpacing: 1.8, color: '#05130a' },
  stepBtnTxtSubtle: { color: colors.muted },

  threadCard: { marginTop: 14, borderWidth: 1, borderColor: 'rgba(242,192,120,0.5)', borderRadius: 12, backgroundColor: 'rgba(38,30,12,0.5)', padding: 13 },
  threadTag: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.6, color: colors.accent },
  threadLesson: { marginTop: 8, fontSize: 13, lineHeight: 19, fontStyle: 'italic', color: colors.fg },

  verdictRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  verdictBtn: { flex: 1, height: 52, borderRadius: 11, borderWidth: 1.2, borderColor: 'rgba(143,184,155,0.4)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  verdictHeld: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.12)' },
  verdictBroke: { borderColor: colors.loss, backgroundColor: 'rgba(224,96,92,0.12)' },
  verdictTxt: { fontFamily: monoFont, fontSize: 8.4, fontWeight: '900', letterSpacing: 2, color: colors.muted },
  verdictTxtOn: { color: colors.primary },

  receiptCard: { marginTop: 14, borderWidth: 1, borderColor: 'rgba(57,255,106,0.4)', borderRadius: 12, backgroundColor: 'rgba(10,20,13,0.85)', padding: 13, gap: 7 },
  receiptTag: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.8, color: colors.accent },
  receiptLine: { fontFamily: monoFont, fontSize: 7.4, letterSpacing: 0.8, lineHeight: 12, color: '#c4d4c8' },

  armNote: { marginTop: 14, borderWidth: 1, borderColor: 'rgba(31,56,38,1)', borderRadius: 11, backgroundColor: 'rgba(15,26,19,0.5)', padding: 12 },
  armNoteTxt: { fontSize: 9.5, lineHeight: 14, color: '#9db4a3' },

  liveCard: { marginTop: 14, flexDirection: 'row', gap: 10 },
  miniStat: { flex: 1, borderWidth: 1, borderColor: 'rgba(57,255,106,0.25)', borderRadius: 10, backgroundColor: 'rgba(10,20,13,0.8)', paddingVertical: 10, alignItems: 'center', gap: 4 },
  miniStatLabel: { fontFamily: monoFont, fontSize: 5.4, letterSpacing: 1.4, color: 'rgba(143,184,155,0.65)' },
  miniStatValue: { fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 1, color: colors.primary },

  scoreRow: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  scoreSide: { alignItems: 'center', gap: 8 },
  scoreLabel: { fontFamily: monoFont, fontSize: 7, letterSpacing: 2, color: colors.muted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(57,255,106,0.4)', alignItems: 'center', justifyContent: 'center' },
  stepperTxt: { fontFamily: monoFont, fontSize: 16, fontWeight: '900', color: colors.primary },
  scoreNum: { fontFamily: monoFont, fontSize: 34, fontWeight: '900', color: colors.fg, minWidth: 42, textAlign: 'center' },
  scoreDash: { fontFamily: monoFont, fontSize: 22, fontWeight: '900', color: 'rgba(143,184,155,0.5)' },

  divCard: { marginTop: 14, borderWidth: 1, borderColor: 'rgba(57,255,106,0.3)', borderRadius: 11, backgroundColor: 'rgba(12,20,14,0.9)', padding: 12 },
  minRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  minButtons: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },

  momentChip: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(57,255,106,0.25)', borderRadius: 9, backgroundColor: 'rgba(10,20,13,0.7)', paddingHorizontal: 11, paddingVertical: 9 },
  momentChipTxt: { fontFamily: monoFont, fontSize: 6.8, letterSpacing: 0.9, color: '#c4d4c8', flex: 1 },
  momentChipActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 8 },

  playerWrap: { marginTop: 14 },

  markRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  markBtn: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(242,192,120,0.5)', backgroundColor: 'rgba(38,30,12,0.5)', alignItems: 'center', justifyContent: 'center' },
  markBtnTxt: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.2, color: colors.accent },

  playTxt: { fontFamily: monoFont, fontSize: 7.6, fontWeight: '900', letterSpacing: 1, color: colors.primary },

  momentBlock: { marginTop: 16, borderWidth: 1, borderColor: 'rgba(242,192,120,0.4)', borderRadius: 13, backgroundColor: 'rgba(20,18,10,0.6)', padding: 12 },
  momentBlockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  momentBlockHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  momentBlockNum: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '900', letterSpacing: 1.8, color: colors.accent },
  momentBlockTxt: { fontFamily: monoFont, fontSize: 6.2, letterSpacing: 0.8, color: 'rgba(143,184,155,0.7)', textAlign: 'right' },

  versionCard: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(143,184,155,0.3)', borderRadius: 12, backgroundColor: 'rgba(12,20,14,0.9)', padding: 13 },
  versionCardOn: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.08)' },
  versionTag: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.8, color: 'rgba(143,184,155,0.7)' },
  versionTagOn: { color: colors.primary },
  versionText: { marginTop: 8, fontSize: 11.5, lineHeight: 17, fontStyle: 'italic', color: colors.fg },
  versionPick: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3.5 },
  versionPickTxt: { fontFamily: monoFont, fontSize: 5.6, fontWeight: '900', letterSpacing: 1.4, color: '#05130a' },
});
