import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, TextInput } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import MomentReview, { makeMoment } from '../components/MomentReview';
import { colors, monoFont } from '../theme';
import { Coach } from '../data/coaches';
import { JourneyStage } from '../data/journey';
import { LessonPlan, STAGE_SCAN_COPY, stageSoulQuestion, stageScoreBeat, stageReadLine, parseHot } from '../data/coaching';
import {
  COMPOSURE_LABELS,
  MATCH_MODES,
  OPP_STYLES,
  MatchDraft,
  MatchMode,
  OppStyle,
  DecisiveWindow,
  addMatch,
  clampGoals,
  resultOf,
} from '../data/matches';
import { TaggedMoment, momentsComplete } from '../data/scanMoments';
import { useLessonThread, settleCarried, swearLesson } from '../data/lessonThread';
import { useMatchWatcher } from '../data/matchWatcher';
import { sfx } from '../audio/sound';
import { CheckIcon, ChevronLeftIcon, EyeIcon, GamepadIcon, ScanGlyphIcon } from '../components/Icons';

// ─────────────────────────────────────────────────────────────
// STAGE MATCH SCAN v3 — the ritual, inside the stage room.
//
// The player PLAYS the match while the coach watches through
// the scanner. The scanner tags the KEY MOMENTS — the make or
// break minutes, not the score — the coach asks a guiding
// question on EVERY tag, and the player answers in their own
// words. Then the part that makes it a training session: the
// player jots THE LESSON they carry into the next match. That
// line becomes the thread — their MAIN QUEST for the next
// session — and the next scan opens by asking how it held.
//
// Same system every stage, every match, until the Role Model:
// the psychology cannot be downloaded, only found in your own
// games. (The 5-match baseline used the same exercise without
// the lesson — it was building your profile, not your quest.)
// ─────────────────────────────────────────────────────────────

const MIN_ANSWER = 12; // soul answers, not one-worders
const MIN_LESSON = 20; // a signed line, not a shrug
const MIN_VERDICT_NOTE = 8; // where the carried lesson held or snapped

const DECISIVE_OPTIONS: { key: DecisiveWindow; label: string }[] = [
  { key: 'EARLY', label: 'BEFORE 60’' },
  { key: 'AFTER 60', label: '60’–79’' },
  { key: 'AFTER 80', label: '80’+' },
];

function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function RichText({ text, style, hotStyle }: { text: string; style: object; hotStyle: object }) {
  const parts = useMemo(() => parseHot(text), [text]);
  return (
    <Text style={style}>
      {parts.map((p, i) => (
        <Text key={i} style={p.hot ? hotStyle : undefined}>
          {p.t}
        </Text>
      ))}
    </Text>
  );
}

function CoachBubble({ coach, label, children }: { coach: Coach; label: string; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.duration(320)} style={styles.msgRow}>
      <Image source={coach.portrait} style={styles.msgAvatar} />
      <View style={styles.msgCol}>
        <Text style={styles.msgLabel}>{label}</Text>
        <View style={styles.bubble}>{children}</View>
      </View>
    </Animated.View>
  );
}

function Stepper({ value, onChange, min, max, accent }: { value: number; onChange: (n: number) => void; min: number; max: number; accent?: boolean }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(Math.max(min, value - 1))} hitSlop={8} style={styles.stepBtn}>
        <Text style={styles.stepBtnTxt}>−</Text>
      </Pressable>
      <Text style={[styles.stepValue, accent && { color: colors.primary }]}>{value}</Text>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} hitSlop={8} style={styles.stepBtn}>
        <Text style={styles.stepBtnTxt}>+</Text>
      </Pressable>
    </View>
  );
}

type Props = {
  coach: Coach;
  stage: JourneyStage;
  plan: LessonPlan | null;
  onClose: (didLog: boolean) => void;
};

export default function StageScanSheet({ coach, stage, plan, onClose }: Props) {
  const copy = STAGE_SCAN_COPY[coach.id] ?? STAGE_SCAN_COPY.chinedu;
  const coachFirst = coach.name.split(' ')[0];
  const stern = coach.id === 'chinedu';
  const mechShort = plan?.shortName ?? null;
  const watcher = useMatchWatcher();
  const thread = useLessonThread();
  const carried = thread.current; // the lesson sworn after your LAST scan

  // ── THE SCAN (numbers) ──
  const [gf, setGf] = useState(0);
  const [ga, setGa] = useState(0);
  const [mode, setMode] = useState<MatchMode>('RANKED');
  const [style, setStyle] = useState<OppStyle>('LOW BLOCK');
  const [passAcc, setPassAcc] = useState<number | null>(null);
  const [noSprint, setNoSprint] = useState(false);
  const [mechanics, setMechanics] = useState(0);
  const [ledAt75, setLedAt75] = useState(false);
  const [decisive, setDecisive] = useState<DecisiveWindow | null>(null);
  const [watcherPrefill, setWatcherPrefill] = useState(false);
  const [swap, setSwap] = useState(false);

  // ── KEY MOMENTS (the scanner's tags + yours) ──
  const [moments, setMoments] = useState<TaggedMoment[]>([]);

  // ── THE MIND (yours, every scan) ──
  const [composure, setComposure] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');

  // ── THE LESSON (your next main quest) ──
  const [verdict, setVerdict] = useState<'held' | 'broke' | null>(null);
  const [verdictNote, setVerdictNote] = useState('');
  const [lesson, setLesson] = useState('');

  // ── phase ──
  const [phase, setPhase] = useState<'brief' | 'scan' | 'read'>('brief');
  const [loggedOnce, setLoggedOnce] = useState(false);
  const [loggedSummary, setLoggedSummary] = useState<{ r: string; gf: number; ga: number; head: string; note: string } | null>(null);

  const result = resultOf({ gf, ga });
  const isWin = result === 'W';
  const question = stageSoulQuestion(coach.id, result, stage.n, gf, ga);

  const mindReady = composure != null && answer.trim().length >= MIN_ANSWER;
  const momentsReady = momentsComplete(moments);
  const verdictReady = !carried || (verdict != null && verdictNote.trim().length >= MIN_VERDICT_NOTE);
  const lessonReady = lesson.trim().length >= MIN_LESSON;
  const scanReady = mindReady && momentsReady && verdictReady && lessonReady;

  // ── THE EYE's auto markers: when a finished watcher session has goal
  // events, seed them as tagged moments the moment the review opens ──
  const eyeSeeded = moments.some((m) => m.auto);
  useEffect(() => {
    if (phase !== 'scan' || eyeSeeded) return;
    const s = watcher.session;
    if (!s || !s.events.length) return;
    const seeded: TaggedMoment[] = s.events.map((ev, i) => {
      const mine = (ev.type === 'goal-left') !== swap; // left = YOU unless swapped
      return makeMoment(mine ? 'GOAL FOR' : 'GOAL AGAINST', {
        id: `eye-${ev.at}-${i}`,
        auto: true,
        eyeNote: `SPOTTED ${fmtClock(ev.at - s.startedAt)} INTO THE SESSION · THE EYE DOES NOT LIE — BUT IT ONLY SEES GOALS`,
      });
    });
    if (seeded.length) setMoments((cur) => [...seeded, ...cur]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // swapping sides flips the EYE's tags too
  const flipSwap = () => {
    setSwap((s) => !s);
    setMoments((cur) =>
      cur.map((m) =>
        m.auto ? { ...m, kind: m.kind === 'GOAL FOR' ? 'GOAL AGAINST' : 'GOAL FOR' } : m,
      ),
    );
  };

  const resetComposer = () => {
    setGf(0);
    setGa(0);
    setPassAcc(null);
    setNoSprint(false);
    setMechanics(0);
    setLedAt75(false);
    setDecisive(null);
    setComposure(null);
    setAnswer('');
    setMoments([]);
    setVerdict(null);
    setVerdictNote('');
    setLesson('');
    setWatcherPrefill(false);
    setSwap(false);
  };

  const logScan = () => {
    if (!scanReady) return;
    sfx('whoosh'); // sealed — off to the vault it goes
    const momentLine = moments
      .map((m) => `${m.kind}@${m.when}${m.answer.trim() ? `("${m.answer.trim()}")` : ''}`)
      .join(' · ');
    const draft: MatchDraft = {
      gf: clampGoals(gf),
      ga: clampGoals(ga),
      mode,
      oppStyle: style,
      passAcc,
      noSprint,
      mechanicsUsed: mechanics,
      ledAt75: isWin ? ledAt75 : null,
      decisive: isWin ? decisive : null,
      composure,
      note: [
        `MOMENTS: ${momentLine}`,
        `MIND: ${answer.trim()}`,
        `LESSON: ${lesson.trim()}`,
        carried && verdict ? `THREAD: ${verdict.toUpperCase()} — ${verdictNote.trim()}` : null,
      ]
        .filter(Boolean)
        .join(' | '),
    };
    const entry = addMatch(draft, watcherPrefill ? 'watcher' : 'manual');
    // the loop closes and reopens in one motion: the old lesson gets its
    // verdict, the new one takes the thread as your next main quest
    if (carried && verdict) settleCarried(carried.id, verdict, verdictNote);
    swearLesson({ stageN: stage.n, lesson: lesson.trim(), matchId: entry.id });
    setLoggedSummary({
      r: result,
      gf: clampGoals(gf),
      ga: clampGoals(ga),
      head: COMPOSURE_LABELS[(composure ?? 3) - 1],
      note: lesson.trim(),
    });
    setLoggedOnce(true);
    setPhase('read');
  };

  // pull the score THE EYE counted (Android build only; hidden otherwise)
  const takeEyeScore = () => {
    const s = watcher.session;
    if (!s) return;
    setGf(clampGoals(swap ? s.scoreR : s.scoreL));
    setGa(clampGoals(swap ? s.scoreL : s.scoreR));
    setWatcherPrefill(true);
    void watcher.cancel();
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.root}>
      <GridBackground />

      <View style={styles.headerWrap}>
        <Text style={styles.eyebrow}>
          STAGE {stage.n} · {stage.key} — MAIN QUEST SESSION
        </Text>
        <Text style={styles.title}>THE MATCH SCAN</Text>
        <Text style={styles.subtitle}>YOU PLAY · THE SCANNER TAGS · HE ASKS · YOU WRITE THE LESSON</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {phase === 'brief' ? (
          <>
            <CoachBubble coach={coach} label={coach.name}>
              <Text style={styles.bubbleText}>
                {stern
                  ? 'This is not a form, little bro — it is a watched training session. You play, the scanner and I watch. It tags the moments that make or break you — not the score, the MOMENTS — and I ask you about every one of them. Then you write the lesson. That lesson is your next main quest.'
                  : 'This is a watched session now, little one. Go and play — the scanner and I will be watching for the moments that make or break you. Not the score — the moments the score was made of. I will ask you about each one, and then you will jot the lesson. That lesson becomes your next main quest.'}
              </Text>
            </CoachBubble>

            {carried && (
              <Animated.View entering={FadeInDown.delay(80).duration(340)} style={styles.carriedBanner}>
                <Text style={styles.carriedTag}>YOUR THREAD WALKED IN WITH YOU</Text>
                <Text style={styles.carriedLesson}>“{carried.lesson}”</Text>
                <Text style={styles.carriedMeta}>
                  SWORN AFTER YOUR LAST SCAN · PLAY WITH IT TODAY — THE REVIEW ASKS HOW IT HELD
                </Text>
              </Animated.View>
            )}

            <Animated.View entering={FadeInDown.delay(120).duration(340)} style={styles.card}>
              <View style={styles.tagRow}>
                <View style={styles.tagGreen}>
                  <Text style={styles.tagGreenTxt}>WATCHED SESSION · HOW IT RUNS</Text>
                </View>
                <GamepadIcon size={13} color={colors.primary} />
              </View>
              <View style={styles.briefStep}>
                <Text style={styles.briefNo}>1</Text>
                <Text style={styles.briefTxt}>
                  {watcher.available
                    ? 'ARM THE EYE BEFORE KICK-OFF (SCREEN-RECORD PERMISSION, ONCE) — IT WATCHES THE SCOREBUG AND DROPS GOAL MARKERS FOR YOU. NO ANDROID BUILD? YOUR OWN EYES DO THE SCANNING — SAME RITUAL.'
                    : 'PLAY THE MATCH FOR REAL. ON THIS PHONE YOUR OWN EYES ARE THE SCANNER — TAG THE MOMENTS YOURSELF AFTER FULL TIME. SAME RITUAL, SAME STANDARD.'}
                </Text>
              </View>
              <View style={styles.briefStep}>
                <Text style={styles.briefNo}>2</Text>
                <Text style={styles.briefTxt}>THE SCANNER TAGS THE KEY MOMENTS — THE MAKE-OR-BREAK MINUTES. GOALS COME IN AS MARKERS; THE MISTAKES AND GOOD CALLS YOU TAG YOURSELF, HONESTLY.</Text>
              </View>
              <View style={styles.briefStep}>
                <Text style={styles.briefNo}>3</Text>
                <Text style={styles.briefTxt}>{coachFirst.toUpperCase()} ASKS A QUESTION ON EVERY TAG. ANSWER EACH ONE LIKE YOU WANT TO KEEP IT — THE HEADSPACE IS THE POINT, NOT THE CONFESSION.</Text>
              </View>
              <View style={styles.briefStep}>
                <Text style={styles.briefNo}>4</Text>
                <Text style={styles.briefTxt}>JOT THE LESSON YOU CARRY INTO YOUR NEXT MATCH. ONE LINE YOU WOULD SIGN. IT MEETS YOU AT THE NEXT STAGE ROOM AS YOUR MAIN QUEST.</Text>
              </View>
              <View style={styles.privacyBox}>
                <Text style={styles.privacyTxt}>
                  DEFAULT RULE: ANY VIDEO STAYS ON YOUR PHONE AND GOES WHEN THE SESSION SEALS. THE ACADEMY KEEPS YOUR TAGS, YOUR ANSWERS AND YOUR LESSON — NEVER YOUR RAW MATCH.
                </Text>
              </View>
            </Animated.View>

            {watcher.available && (watcher.status === 'idle' || watcher.status === 'unavailable') && (
              <Pressable
                onPress={() => {
                  sfx('whoosh');
                  void watcher.arm();
                }}
              >
                <View style={[styles.logBtn, styles.armBtn]}>
                  <EyeIcon size={11} color={colors.primary} />
                  <Text style={[styles.logBtnTxt, { color: colors.primary }]}>ARM THE EYE — THEN GO PLAY ›</Text>
                </View>
              </Pressable>
            )}
            {watcher.available && (watcher.status === 'arming' || watcher.status === 'running') && (
              <View style={styles.eyeLiveStrip}>
                <EyeIcon size={11} color={colors.primary} />
                <Text style={styles.eyeLiveTxt}>
                  THE EYE IS LIVE — {watcher.session?.scoreL ?? 0}–{watcher.session?.scoreR ?? 0} SO FAR. GO PLAY. WHEN IT'S FULL TIME, COME BACK AND RUN THE REVIEW.
                </Text>
              </View>
            )}

            <Pressable onPress={() => { sfx('whoosh'); setPhase('scan'); }}>
              <View style={styles.logBtn}>
                <ScanGlyphIcon size={11} color="#0a0f0a" />
                <Text style={styles.logBtnTxt}>
                  {(watcher.session?.events.length ?? 0) > 0 ? 'FULL TIME — OPEN THE MOMENT REVIEW ›' : 'I PLAYED THE MATCH — START THE REVIEW ›'}
                </Text>
              </View>
            </Pressable>
            <Text style={styles.honor}>
              IF THE EYE IS STILL RUNNING, FINISH IT IN THE VAULT FIRST SO THE MARKERS LAND HERE. NO SHORTCUTS — THE ANSWERS ARE THE SESSION.
            </Text>
          </>
        ) : phase === 'scan' ? (
          <>
            {/* ── the coach opens the ritual ── */}
            <CoachBubble coach={coach} label={coach.name}>
              <RichText text={copy.ask} style={styles.bubbleText} hotStyle={styles.hot} />
            </CoachBubble>

            {/* ── PART 1 · THE TAPE — the numbers, a machine's half ── */}
            <Animated.View entering={FadeInDown.delay(120).duration(340)} style={styles.card}>
              <View style={styles.tagRow}>
                <View style={styles.tagGreen}>
                  <Text style={styles.tagGreenTxt}>PART 1 · THE TAPE — THE NUMBERS</Text>
                </View>
                <ScanGlyphIcon size={13} color={colors.primary} />
              </View>
              <Text style={styles.cue}>{copy.numbersCue}</Text>

              {/* THE EYE — compact bridge to the on-device watcher */}
              {watcher.available && (
                <View style={styles.eyeStrip}>
                  <GamepadIcon size={11} color={colors.primary} />
                  {watcher.status === 'finished' && watcher.session ? (
                    <View style={{ flex: 1, gap: 7 }}>
                      <Text style={styles.eyeTxt}>
                        THE EYE READ {swap ? watcher.session.scoreR : watcher.session.scoreL}–{swap ? watcher.session.scoreL : watcher.session.scoreR} (YOU–THEM) ACROSS {watcher.session.frames} FRAMES
                        {watcher.session.events.length > 0 ? ` · ${watcher.session.events.length} GOAL MARKER${watcher.session.events.length === 1 ? '' : 'S'} ALREADY TAGGED BELOW` : ''}
                      </Text>
                      <View style={styles.eyeBtnRow}>
                        <Pressable onPress={takeEyeScore} style={styles.eyeBtn}>
                          <Text style={styles.eyeBtnTxt}>USE THE EYE'S SCORE</Text>
                        </Pressable>
                        <Pressable onPress={flipSwap} style={[styles.eyeBtn, styles.eyeBtnGhost]}>
                          <Text style={[styles.eyeBtnTxt, styles.eyeBtnGhostTxt]}>SWAP</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (watcher.status === 'running' || watcher.status === 'arming') && watcher.session ? (
                    <Text style={[styles.eyeTxt, { flex: 1 }]}>
                      THE EYE IS LIVE — {watcher.session.scoreL}–{watcher.session.scoreR} SO FAR. FULL TIME? FINISH IT IN THE VAULT, OR ENTER THE SCORE BY HAND BELOW.
                    </Text>
                  ) : (
                    <Text style={[styles.eyeTxt, { flex: 1 }]}>
                      THE EYE CAN COUNT GOALS FOR YOU — ARM IT BEFORE KICK-OFF AND THE SCORE + GOAL MARKERS FILL THEMSELVES IN.
                    </Text>
                  )}
                </View>
              )}
              {watcherPrefill && <Text style={styles.eyePrefill}>SCORE CAME FROM THE EYE — SAVED AS AUTO</Text>}

              {/* score */}
              <View style={styles.scoreRow}>
                <View style={styles.scoreSide}>
                  <Text style={styles.scoreLabel}>YOU</Text>
                  <Stepper value={gf} onChange={setGf} min={0} max={9} accent={isWin} />
                </View>
                <View style={[styles.resultPill, result === 'W' && styles.pillW, result === 'D' && styles.pillD, result === 'L' && styles.pillL]}>
                  <Text style={styles.resultPillTxt}>{result}</Text>
                </View>
                <View style={styles.scoreSide}>
                  <Text style={styles.scoreLabel}>THEM</Text>
                  <Stepper value={ga} onChange={setGa} min={0} max={9} accent={result === 'L'} />
                </View>
              </View>

              {/* mode */}
              <Text style={styles.fieldLabel}>MODE</Text>
              <View style={styles.chipRow}>
                {MATCH_MODES.map((m) => (
                  <Pressable key={m} onPress={() => setMode(m)} style={[styles.chip, mode === m && styles.chipActive]}>
                    <Text style={[styles.chipTxt, mode === m && styles.chipTxtActive]}>{m}</Text>
                  </Pressable>
                ))}
              </View>

              {/* their style */}
              <Text style={styles.fieldLabel}>THEIR GAME — WHAT DID YOU FACE?</Text>
              <View style={styles.chipRow}>
                {OPP_STYLES.map((s) => (
                  <Pressable key={s} onPress={() => setStyle(s)} style={[styles.chip, style === s && styles.chipActive]}>
                    <Text style={[styles.chipTxt, style === s && styles.chipTxtActive]}>{s}</Text>
                  </Pressable>
                ))}
              </View>

              {/* pass accuracy */}
              <View style={styles.inlineRow}>
                <Text style={styles.inlineLabel}>PASS ACCURACY — OFF THE POST-MATCH SCREEN</Text>
                <View style={styles.inlineCtrl}>
                  {passAcc != null ? (
                    <>
                      <Pressable onPress={() => setPassAcc((p) => (p != null && p > 50 ? p - 5 : p))} hitSlop={8} style={styles.miniBtn}>
                        <Text style={styles.miniBtnTxt}>−</Text>
                      </Pressable>
                      <Pressable onPress={() => setPassAcc(null)} hitSlop={6}>
                        <Text style={styles.passVal}>{passAcc}%</Text>
                      </Pressable>
                      <Pressable onPress={() => setPassAcc((p) => (p != null && p < 95 ? p + 5 : p))} hitSlop={8} style={styles.miniBtn}>
                        <Text style={styles.miniBtnTxt}>+</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable onPress={() => setPassAcc(70)} style={styles.chip} hitSlop={6}>
                      <Text style={styles.chipTxt}>ADD IT</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* honour rows — shaped by the stage's objectives */}
              <Text style={styles.fieldLabel}>ON YOUR HONOR — {coachFirst.toUpperCase()} TRUSTS THE LEDGER</Text>
              <View style={styles.chipRow}>
                <Pressable onPress={() => setNoSprint((p) => !p)} style={[styles.chip, noSprint && styles.chipActive]}>
                  <Text style={[styles.chipTxt, noSprint && styles.chipTxtActive]}>{noSprint ? '✓ ' : ''}NO-SPRINT RULE KEPT</Text>
                </Pressable>
              </View>
              <View style={styles.inlineRow}>
                <Text style={styles.inlineLabel}>
                  {mechShort ? `USED THE SIDE QUEST — THE ${mechShort.toUpperCase()}` : 'TAUGHT MECHANICS USED'}
                </Text>
                <View style={styles.inlineCtrl}>
                  {[0, 1, 2, 3].map((n) => (
                    <Pressable key={n} onPress={() => setMechanics(n)} style={[styles.numChip, mechanics === n && styles.numChipActive]}>
                      <Text style={[styles.numChipTxt, mechanics === n && styles.numChipTxtActive]}>{n === 3 ? '3+' : n}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {isWin && (
                <>
                  <View style={styles.inlineRow}>
                    <Text style={styles.inlineLabel}>YOUR WINNER WENT IN…</Text>
                    <View style={styles.inlineCtrl}>
                      {DECISIVE_OPTIONS.map((d) => (
                        <Pressable key={d.key} onPress={() => setDecisive(decisive === d.key ? null : d.key)} style={[styles.chip, decisive === d.key && styles.chipGold]}>
                          <Text style={[styles.chipTxt, decisive === d.key && { color: colors.accent }]}>{d.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View style={[styles.chipRow, { marginTop: 7 }]}>
                    <Pressable onPress={() => setLedAt75((p) => !p)} style={[styles.chip, ledAt75 && styles.chipActive]}>
                      <Text style={[styles.chipTxt, ledAt75 && styles.chipTxtActive]}>{ledAt75 ? '✓ ' : ''}LEADING AT 75’ — CLOSED IT OUT</Text>
                    </Pressable>
                  </View>
                </>
              )}
              <Text style={styles.stageFeed}>EVERY FIELD HERE FEEDS STAGE {stage.n}'S GRADED OBJECTIVES — THE VAULT COUNTS, THE COACH JUDGES</Text>
            </Animated.View>

            {/* ── PART 2 · KEY MOMENTS — the make-or-break minutes ── */}
            <Animated.View entering={FadeInDown.delay(190).duration(340)} style={[styles.card, styles.momentCardWrap]}>
              <View style={styles.tagRow}>
                <View style={[styles.tagGreen, styles.tagGold]}>
                  <Text style={styles.tagGoldTxt}>PART 2 · KEY MOMENTS — WHAT THE SCANNER SAW</Text>
                </View>
                <EyeIcon size={13} color={colors.accent} />
              </View>
              <MomentReview
                coach={coach}
                moments={moments}
                onChange={setMoments}
                cue={
                  stern
                    ? 'The score flatters everyone. THESE are the minutes the match was actually decided — tag them, then answer for each one. One-word answers are bluffs, and I read bluffs.'
                    : 'Not the score, little one — the moments the score was made of. Tag what turned the match, then walk me through each one. Slow is fine. Honest is required.'
                }
              />
            </Animated.View>

            {/* ── PART 3 · THE MIND — yours, every scan ── */}
            <Animated.View entering={FadeInDown.delay(240).duration(340)} style={[styles.card, styles.mindCard]}>
              <View style={styles.tagRow}>
                <View style={[styles.tagGreen, styles.tagGold]}>
                  <Text style={styles.tagGoldTxt}>PART 3 · THE MIND — YOURS, EVERY SCAN</Text>
                </View>
                <EyeIcon size={13} color={colors.accent} />
              </View>
              <RichText text={copy.mindCue} style={styles.mindCue} hotStyle={styles.hot} />

              <Text style={styles.fieldLabel}>YOUR HEAD, FULL 90 — HOW WAS IT?</Text>
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

              <Text style={styles.fieldLabel}>{coachFirst.toUpperCase()} ASKS — THE SOUL QUESTION</Text>
              <Text style={styles.question}>“{question}”</Text>
              <TextInput
                value={answer}
                onChangeText={(t) => setAnswer(t.slice(0, 140))}
                placeholder="THINK. THEN ANSWER — YOUR WORDS, NOT OURS."
                placeholderTextColor={colors.muted}
                style={styles.input}
                multiline
                maxLength={140}
              />
              <Text style={styles.count}>
                {answer.trim().length < MIN_ANSWER ? `${answer.trim().length}/${MIN_ANSWER} TO SPEAK` : `${answer.length}/140`} · THIS LINE IS YOURS — NO AI WILL EVER WRITE IT FOR YOU
              </Text>

              <View style={styles.bluffBox}>
                <Text style={styles.bluffTxt}>“{copy.bluff}”</Text>
                <Text style={styles.bluffBy}>— {coachFirst.toUpperCase()} · HOUSE RULE</Text>
              </View>
            </Animated.View>

            {/* ── PART 4 · THE LESSON — the training, not the paperwork ── */}
            <Animated.View entering={FadeInDown.delay(290).duration(340)} style={[styles.card, styles.lessonCard]}>
              <View style={styles.tagRow}>
                <View style={[styles.tagGreen, styles.tagLesson]}>
                  <Text style={styles.tagLessonTxt}>PART 4 · THE LESSON — YOUR MAIN QUEST</Text>
                </View>
                <CheckIcon size={12} color={colors.primary} />
              </View>
              <Text style={styles.lessonCue}>
                EVERYTHING ABOVE WAS EVIDENCE. THIS LINE IS THE TRAINING. JOT THE LESSON YOU CARRY INTO YOUR NEXT MATCH — IT WAITS FOR YOU IN THE NEXT STAGE ROOM AS YOUR MAIN QUEST, AND THE NEXT SCAN OPENS BY ASKING HOW IT HELD.
              </Text>

              {carried && (
                <View style={styles.threadCheck}>
                  <Text style={styles.threadCheckTag}>THREAD CHECK — AFTER YOUR LAST SCAN YOU SWORE:</Text>
                  <Text style={styles.threadCheckLesson}>“{carried.lesson}”</Text>
                  <View style={styles.chipRow}>
                    {(['held', 'broke'] as const).map((v) => (
                      <Pressable
                        key={v}
                        onPress={() => setVerdict(verdict === v ? null : v)}
                        style={[styles.chip, verdict === v && (v === 'held' ? styles.chipActive : styles.chipBroke)]}
                      >
                        <Text style={[styles.chipTxt, verdict === v && (v === 'held' ? styles.chipTxtActive : { color: colors.loss })]}>
                          {verdict === v ? '✓ ' : ''}{v === 'held' ? 'IT HELD TODAY' : 'IT BROKE TODAY'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    value={verdictNote}
                    onChangeText={(t) => setVerdictNote(t.slice(0, 160))}
                    placeholder="WHERE DID IT SHOW UP — OR WHERE DID IT SNAP?"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    multiline
                    maxLength={160}
                  />
                  <Text style={styles.count}>
                    {verdictNote.trim().length < MIN_VERDICT_NOTE
                      ? `${verdictNote.trim().length}/${MIN_VERDICT_NOTE} · ONE HONEST LINE — THE THREAD KEEPS SCORE OF YOUR HEAD, NOT YOUR PRIDE`
                      : 'VERDICT FILED'}
                  </Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>THE LESSON — ONE LINE YOU WOULD SIGN</Text>
              <TextInput
                value={lesson}
                onChangeText={(t) => setLesson(t.slice(0, 140))}
                placeholder="EXAMPLE: WHEN I CONCEDE, MY NEXT THREE PASSES GO SAFE — I NEVER ANSWER A GOAL WITH A RUSH."
                placeholderTextColor={colors.muted}
                style={styles.input}
                multiline
                maxLength={140}
              />
              <Text style={styles.count}>
                {lesson.trim().length < MIN_LESSON
                  ? `${lesson.trim().length}/${MIN_LESSON} TO JOT THE LESSON · WRITE IT LIKE THE NEXT MATCH CAN HEAR YOU`
                  : `${lesson.length}/140 · SEALED AS YOUR NEXT MAIN QUEST`}
              </Text>
              <Text style={styles.demand}>{copy.demand}</Text>
            </Animated.View>

            <Pressable onPress={logScan} disabled={!scanReady}>
              <View style={[styles.logBtn, !scanReady && styles.logBtnOff]}>
                <CheckIcon size={10} color="#0a0f0a" />
                <Text style={styles.logBtnTxt}>
                  {scanReady ? `SEAL THE SESSION — ${result} ${gf}–${ga}` : 'ANSWER THE MOMENTS + JOT THE LESSON FIRST'}
                </Text>
              </View>
            </Pressable>
            <Text style={styles.honor}>
              THE MACHINE TAKES THE NUMBERS; THE SCANNER TAKES THE MOMENTS; THE LESSON IS YOURS ALONE. THE GRADED SCAN RUNS RIGHT AFTER THIS.
            </Text>
          </>
        ) : (
          /* ── THE SEALED THREAD + the beat + the read — then the grade ── */
          <>
            {loggedSummary && (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.summary}>
                <Text style={styles.summaryEyebrow}>SESSION SEALED TO THE VAULT</Text>
                <Text style={styles.summaryScore}>
                  {loggedSummary.r} {loggedSummary.gf}–{loggedSummary.ga}
                  <Text style={styles.summaryHead}> · HEAD: {loggedSummary.head}</Text>
                </Text>
                <View style={styles.summaryLessonBox}>
                  <Text style={styles.summaryLessonTag}>YOUR MAIN QUEST FOR THE NEXT SESSION</Text>
                  <Text style={styles.summaryLesson}>“{loggedSummary.note}”</Text>
                  {carried && verdict && (
                    <Text style={styles.summaryVerdict}>
                      LAST LESSON: {verdict === 'held' ? 'HELD ✓' : 'BROKE ✗'} — {thread.entries.length} ON THE THREAD NOW
                    </Text>
                  )}
                </View>
                <Text style={styles.summaryNote}>
                  IT MEETS YOU IN THE NEXT STAGE ROOM. PLAY WITH IT. ANSWER FOR IT AT THE NEXT SCAN.
                </Text>
              </Animated.View>
            )}

            <CoachBubble coach={coach} label={`${coach.name} · THE STORY`}>
              <Text style={styles.bubbleText}>{stageScoreBeat(coach.id, gf, ga)}</Text>
            </CoachBubble>
            <Text style={styles.msgTime}>THE SCORELINE REMINDED HIM — IT ALWAYS DOES</Text>

            <CoachBubble coach={coach} label={`${coach.name} · THE READ`}>
              <Text style={styles.bubbleText}>
                {stageReadLine(coach.id, resultOf({ gf: loggedSummary?.gf ?? gf, ga: loggedSummary?.ga ?? ga }), mechShort)}
              </Text>
            </CoachBubble>

            <Pressable onPress={() => onClose(true)} style={({ pressed }) => [styles.logBtn, { marginTop: 16 }, pressed && { opacity: 0.85 }]}>
              <ScanGlyphIcon size={11} color="#0a0f0a" />
              <Text style={styles.logBtnTxt}>GRADE THE VAULT — RUN THE SCAN ›</Text>
            </Pressable>
            <Pressable onPress={() => { resetComposer(); setPhase('scan'); }} hitSlop={6}>
              <View style={styles.againBtn}>
                <Text style={styles.againTxt}>ANOTHER MATCH? RUN THE SESSION AGAIN ›</Text>
              </View>
            </Pressable>
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      <Pressable onPress={() => onClose(loggedOnce)} hitSlop={10} style={styles.backBtn}>
        <ChevronLeftIcon size={15} color={colors.fg} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, paddingTop: 50, paddingHorizontal: 16 },
  scroll: { paddingBottom: 26 },

  headerWrap: { alignItems: 'center' },
  eyebrow: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '800', letterSpacing: 2.4, color: colors.muted },
  title: { marginTop: 6, fontSize: 20, fontWeight: '900', letterSpacing: 4.5, color: colors.fg },
  subtitle: { marginTop: 4, fontFamily: monoFont, fontSize: 6, fontWeight: '700', letterSpacing: 1.6, color: colors.primary, textAlign: 'center' },

  msgRow: { flexDirection: 'row', marginTop: 14, alignItems: 'flex-start' },
  msgAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(57,255,106,0.4)', marginTop: 12 },
  msgCol: { flex: 1, marginLeft: 8 },
  msgLabel: { fontFamily: monoFont, fontSize: 5.6, fontWeight: '700', letterSpacing: 2.2, color: colors.primary, marginBottom: 4, marginLeft: 2 },
  bubble: {
    borderWidth: 1.1, borderColor: 'rgba(57,255,106,0.32)', borderRadius: 15,
    backgroundColor: 'rgba(15,26,19,0.78)', paddingHorizontal: 13, paddingVertical: 11,
    shadowColor: colors.primary, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
  bubbleText: { fontSize: 11.5, lineHeight: 17.5, color: '#c9d8cd', fontWeight: '600' },
  hot: { color: colors.primary, fontWeight: '900' },
  msgTime: { marginLeft: 32, marginTop: 4, fontFamily: monoFont, fontSize: 5.6, letterSpacing: 1.4, color: 'rgba(143,184,155,0.45)' },

  carriedBanner: {
    marginTop: 14, borderWidth: 1.2, borderColor: colors.primary, borderRadius: 14,
    backgroundColor: 'rgba(57,255,106,0.06)', padding: 13,
    shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
  },
  carriedTag: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 2, color: colors.primary },
  carriedLesson: { marginTop: 7, fontSize: 12.5, lineHeight: 18, fontStyle: 'italic', fontWeight: '700', color: colors.fg },
  carriedMeta: { marginTop: 7, fontFamily: monoFont, fontSize: 5.6, fontWeight: '700', letterSpacing: 1.2, color: colors.muted },

  card: {
    marginTop: 14, borderWidth: 1.2, borderColor: 'rgba(57,255,106,0.5)', borderRadius: 16,
    backgroundColor: 'rgba(12,20,14,0.94)', padding: 13,
    shadowColor: colors.primary, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
  },
  momentCardWrap: { borderColor: 'rgba(242,192,120,0.45)', shadowColor: colors.accent },
  mindCard: { borderColor: 'rgba(242,192,120,0.55)', shadowColor: colors.accent },
  lessonCard: { borderColor: 'rgba(57,255,106,0.72)', shadowColor: colors.primary, shadowOpacity: 0.22 },
  briefStep: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: 'rgba(143,184,155,0.12)',
    paddingTop: 10,
  },
  briefNo: { width: 20, fontFamily: monoFont, fontSize: 14, fontWeight: '900', color: colors.primary },
  briefTxt: { flex: 1, fontFamily: monoFont, fontSize: 6.7, lineHeight: 12, fontWeight: '800', letterSpacing: 1.1, color: 'rgba(238,242,236,0.86)' },
  privacyBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.38)',
    borderRadius: 10,
    backgroundColor: 'rgba(242,192,120,0.06)',
    padding: 10,
  },
  privacyTxt: { fontFamily: monoFont, fontSize: 6.2, lineHeight: 11, fontWeight: '800', letterSpacing: 1, color: colors.warm },

  tagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  tagGreen: {
    borderWidth: 1, borderColor: colors.primary, borderRadius: 5, paddingHorizontal: 7,
    paddingVertical: 3.5, backgroundColor: 'rgba(57,255,106,0.07)',
  },
  tagGreenTxt: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.6, color: colors.primary },
  tagGold: { borderColor: 'rgba(242,192,120,0.55)', backgroundColor: 'rgba(242,192,120,0.06)' },
  tagGoldTxt: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.6, color: colors.accent },
  tagLesson: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.12)' },
  tagLessonTxt: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.6, color: colors.primary },
  lessonCue: { marginTop: 10, fontFamily: monoFont, fontSize: 6.8, lineHeight: 12.6, fontWeight: '900', letterSpacing: 1.2, color: colors.primary },

  threadCheck: {
    marginTop: 12, borderWidth: 1, borderColor: 'rgba(57,255,106,0.4)', borderRadius: 11,
    backgroundColor: 'rgba(57,255,106,0.05)', padding: 11,
  },
  threadCheckTag: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.7, color: colors.primary },
  threadCheckLesson: { marginTop: 7, fontSize: 11, lineHeight: 16, fontStyle: 'italic', fontWeight: '700', color: colors.fg },

  cue: { marginTop: 10, fontFamily: monoFont, fontSize: 6.6, lineHeight: 12, fontWeight: '900', letterSpacing: 1.3, color: colors.primary },

  eyeStrip: {
    marginTop: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.28)', borderRadius: 10,
    backgroundColor: 'rgba(57,255,106,0.05)', paddingHorizontal: 10, paddingVertical: 9,
  },
  eyeTxt: { fontFamily: monoFont, fontSize: 6, lineHeight: 11, fontWeight: '800', letterSpacing: 1.1, color: colors.muted, marginTop: 1 },
  eyeBtnRow: { flexDirection: 'row', gap: 7 },
  eyeBtn: { flexGrow: 1, borderRadius: 8, backgroundColor: colors.primary, paddingVertical: 7, alignItems: 'center' },
  eyeBtnTxt: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '900', letterSpacing: 1.4, color: '#0a0f0a' },
  eyeBtnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(57,255,106,0.4)' },
  eyeBtnGhostTxt: { color: colors.primary },
  eyePrefill: { marginTop: 8, fontFamily: monoFont, fontSize: 6, fontWeight: '800', letterSpacing: 1.2, color: colors.accent },
  eyeLiveStrip: {
    marginTop: 14, flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    borderWidth: 1, borderColor: colors.primary, borderRadius: 10,
    backgroundColor: 'rgba(57,255,106,0.07)', paddingHorizontal: 10, paddingVertical: 10,
  },
  eyeLiveTxt: { flex: 1, fontFamily: monoFont, fontSize: 6.2, lineHeight: 11.5, fontWeight: '900', letterSpacing: 1.2, color: colors.primary },

  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  scoreSide: { alignItems: 'center', gap: 5, width: 118 },
  scoreLabel: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '800', letterSpacing: 2.4, color: colors.muted },
  stepper: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.3)', borderRadius: 11,
    backgroundColor: 'rgba(10,15,10,0.6)', paddingHorizontal: 4, paddingVertical: 4,
  },
  stepBtn: { width: 27, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: 'rgba(57,255,106,0.07)' },
  stepBtnTxt: { fontSize: 15, fontWeight: '800', color: colors.primary, marginTop: -1 },
  stepValue: { width: 30, textAlign: 'center', fontSize: 17, fontWeight: '900', color: colors.fg },
  resultPill: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.4, borderColor: 'rgba(143,184,155,0.4)',
  },
  pillW: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.1)', shadowColor: colors.primary, shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  pillD: { borderColor: colors.accent, backgroundColor: 'rgba(242,192,120,0.08)' },
  pillL: { borderColor: colors.loss, backgroundColor: 'rgba(224,96,92,0.09)' },
  resultPillTxt: { fontSize: 15, fontWeight: '900', color: colors.fg },

  fieldLabel: { marginTop: 13, fontFamily: monoFont, fontSize: 6.2, fontWeight: '800', letterSpacing: 1.8, color: colors.muted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.2)', backgroundColor: 'rgba(10,15,10,0.5)',
  },
  chipActive: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.12)' },
  chipBroke: { borderColor: colors.loss, backgroundColor: 'rgba(224,96,92,0.1)' },
  chipGold: { borderColor: colors.accent, backgroundColor: 'rgba(242,192,120,0.09)' },
  chipTxt: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '800', letterSpacing: 1.2, color: colors.muted },
  chipTxtActive: { color: colors.primary },

  inlineRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  inlineLabel: { flex: 1, fontFamily: monoFont, fontSize: 6.2, fontWeight: '800', letterSpacing: 1.4, lineHeight: 10, color: colors.muted },
  inlineCtrl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniBtn: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(57,255,106,0.3)', backgroundColor: 'rgba(57,255,106,0.06)' },
  miniBtnTxt: { fontSize: 13, fontWeight: '800', color: colors.primary, marginTop: -1 },
  passVal: { width: 44, textAlign: 'center', fontSize: 13, fontWeight: '900', color: colors.fg },
  numChip: {
    width: 28, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.2)', backgroundColor: 'rgba(10,15,10,0.5)',
  },
  numChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.14)' },
  numChipTxt: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', color: colors.muted },
  numChipTxtActive: { color: colors.primary },
  stageFeed: { marginTop: 12, fontFamily: monoFont, fontSize: 5.2, lineHeight: 9, fontWeight: '700', letterSpacing: 1.1, textAlign: 'center', color: 'rgba(143,184,155,0.42)' },

  mindCue: { marginTop: 10, fontFamily: monoFont, fontSize: 6.9, lineHeight: 12.6, letterSpacing: 1.2, color: colors.warm, fontWeight: '700' },
  question: { marginTop: 8, fontSize: 11, lineHeight: 16.5, fontStyle: 'italic', fontWeight: '700', color: '#e7d9bd' },
  input: {
    marginTop: 9, borderWidth: 1, borderColor: 'rgba(242,192,120,0.35)', backgroundColor: '#0a0f0a',
    borderRadius: 10, color: colors.fg, fontFamily: monoFont, fontSize: 11, lineHeight: 16,
    padding: 10, minHeight: 62, textAlignVertical: 'top',
  },
  count: { marginTop: 4, fontFamily: monoFont, fontSize: 5.6, letterSpacing: 1, textAlign: 'right', color: colors.muted },

  bluffBox: {
    marginTop: 13, borderWidth: 1, borderColor: 'rgba(57,255,106,0.28)', borderRadius: 11,
    backgroundColor: 'rgba(57,255,106,0.05)', paddingHorizontal: 12, paddingVertical: 10,
  },
  bluffTxt: { fontSize: 10, lineHeight: 15.5, fontStyle: 'italic', color: '#cfe0d3' },
  bluffBy: { marginTop: 5, fontFamily: monoFont, fontSize: 5.6, fontWeight: '800', letterSpacing: 1.6, color: colors.primary },
  demand: { marginTop: 10, fontFamily: monoFont, fontSize: 6, lineHeight: 11, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center', color: colors.accent },

  logBtn: {
    marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13,
    shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  armBtn: { backgroundColor: 'rgba(57,255,106,0.08)', borderWidth: 1.2, borderColor: colors.primary, shadowOpacity: 0.25 },
  logBtnOff: { backgroundColor: 'rgba(31,56,38,1)', shadowOpacity: 0 },
  logBtnTxt: { fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.8, color: '#0a0f0a' },
  honor: { marginTop: 9, fontFamily: monoFont, fontSize: 5.4, lineHeight: 9, fontWeight: '700', letterSpacing: 1, textAlign: 'center', color: '#42584a' },

  summary: {
    marginTop: 14, borderWidth: 1.2, borderColor: colors.primary, borderRadius: 15,
    backgroundColor: 'rgba(57,255,106,0.07)', padding: 14, alignItems: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
  },
  summaryEyebrow: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 2.2, color: colors.primary },
  summaryScore: { marginTop: 8, fontSize: 21, fontWeight: '900', letterSpacing: 1.6, color: colors.fg },
  summaryHead: { fontFamily: monoFont, fontSize: 9, fontWeight: '800', letterSpacing: 1.4, color: colors.warm },
  summaryLessonBox: {
    marginTop: 12, width: '100%', borderWidth: 1, borderColor: 'rgba(57,255,106,0.45)',
    borderRadius: 11, backgroundColor: 'rgba(8,13,9,0.6)', padding: 11,
  },
  summaryLessonTag: { fontFamily: monoFont, fontSize: 5.8, fontWeight: '900', letterSpacing: 1.9, color: colors.primary },
  summaryLesson: { marginTop: 7, fontSize: 12, lineHeight: 17.5, fontStyle: 'italic', fontWeight: '700', color: colors.fg },
  summaryVerdict: { marginTop: 8, fontFamily: monoFont, fontSize: 5.8, fontWeight: '800', letterSpacing: 1.3, color: colors.muted },
  summaryNote: { marginTop: 10, fontFamily: monoFont, fontSize: 6, lineHeight: 11, fontWeight: '800', letterSpacing: 1.2, textAlign: 'center', color: colors.warm },

  againBtn: {
    marginTop: 9, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(143,184,155,0.35)',
    paddingVertical: 11, alignItems: 'center',
  },
  againTxt: { fontFamily: monoFont, fontSize: 7.2, fontWeight: '900', letterSpacing: 1.8, color: colors.muted },

  backBtn: {
    position: 'absolute', top: 58, left: 16, width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.2, borderColor: 'rgba(143,184,155,0.4)', backgroundColor: 'rgba(10,17,12,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
});
