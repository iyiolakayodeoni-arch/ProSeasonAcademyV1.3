import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Linking } from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import LogoMark from '../components/LogoMark';
import LessonAnimation from '../components/LessonAnimation';
import {
  ArrowOutIcon,
  CheckIcon,
  CheckRingIcon,
  ChevronLeftIcon,
  ClockGlyphIcon,
  PauseGlyphIcon,
  RefreshGlyphIcon,
  ScanGlyphIcon,
  TargetGlyphIcon,
  WavesGlyphIcon,
  XMarkIcon,
} from '../components/Icons';
import { Coach } from '../data/coaches';
import { JourneyStage } from '../data/journey';
import {
  buildCoachChat,
  buildPrepChat,
  parseHot,
  resolveStageLesson,
  LessonPlan,
} from '../data/coaching';
import { assignLessonRef, recordStagePass, useJourneyProgress } from '../data/progress';
import { useMatchScan } from '../hooks/useMatchScan';
import { objectiveCount, useMatches } from '../data/matches';
import { useJournal } from '../data/journal';
import { useLessonThread } from '../data/lessonThread';
import { sideLessonFromPlan } from '../data/sideLesson';
import StageScanSheet from './StageScanSheet';
import SideLessonSheet from './SideLessonSheet';
import MirrorSessionScreen from './MirrorSessionScreen';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { sfx } from '../audio/sound';
import { colors, monoFont } from '../theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function mmss(total: number): string {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// ── pulsing green presence dot ────────────────────────────────
function OnlineDot({ size = 5 }: { size?: number }) {
  const v = useSharedValue(0.55);
  useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [v]);
  const s = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.9, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } }, s]} />;
}

// ── spinning read ring for the MATCH SCAN row ─────────────────
function ScanRing() {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(360, { duration: 1100, easing: Easing.linear }), -1, false);
  }, [r]);
  const s = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View
      style={[
        {
          width: 15,
          height: 15,
          borderRadius: 8,
          borderWidth: 1.6,
          borderColor: colors.primary,
          borderTopColor: 'transparent',
        },
        s,
      ]}
    />
  );
}

function ScanStatusIcon({ status }: { status: 'armed' | 'scanning' | 'passed' | 'failed' }) {
  if (status === 'scanning') return <ScanRing />;
  if (status === 'passed') return <CheckRingIcon size={15} color={colors.primary} />;
  if (status === 'failed') return <XMarkIcon size={11} color={colors.loss} />;
  return <ScanGlyphIcon size={14} color={colors.primary} />;
}

// ── chat bubble with inline **hot** highlight parsing ─────────
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

function MessageMeta({ time }: { time: string }) {
  return <Text style={styles.msgTime}>{time}</Text>;
}

type Props = {
  coach: Coach;
  stage: JourneyStage;
  onClose: () => void;
};

// ─────────────────────────────────────────────────────────────
// THE COACHING SCREEN — the stage room, framed as TWO QUESTS.
//
//   MAIN QUEST — THE MIRROR SESSION: one ranked match walked
//   with structure — intention before the kick-off, a half-time
//   checkpoint, your memory before the recording, your own key
//   moments, the versions placed beside each other, and the one
//   lesson you swear into THE THREAD. The app never writes your
//   psychology; it only refuses to let you forget what you said.
//
//   SIDE QUEST — TODAY'S MECHANIC: the bot's researched trick,
//   animated board + blog read in-app. A side note to try —
//   never the assignment. The main thing is done by you.
//
// Mechanic, tiles, rule and scan targets all come from the
// live approved MetaBot feed (see src/data/coaching.ts).
// ─────────────────────────────────────────────────────────────
export default function CoachingScreen({ coach, stage, onClose }: Props) {
  const { loopProps, glowStyle } = useTrailLoop({ pathLength: 260, drawMs: 2200, eraseMs: 2200 });
  const prog = useJourneyProgress();
  const coachFirst = coach.name.split(' ')[0];
  // the ledgers the scan is graded from
  const vault = useMatches();
  const journal = useJournal();
  // THE THREAD — the lesson you're carrying (your main quest)
  const thread = useLessonThread();
  const carried = thread.current;
  const [scanSheet, setScanSheet] = useState(false);
  const [mirrorOpen, setMirrorOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);

  // ── resolve TODAY'S MECHANIC from the live bot feed ──
  const lessonResult = useMemo(
    () => resolveStageLesson(stage.n, prog.lessonRefs),
    [stage.n, prog.lessonRefs],
  );
  useEffect(() => {
    if (lessonResult.status === 'ok' && !lessonResult.fromRef) {
      // claim this live item for the stage — stored so a future patch
      // flagging it stale routes the coach to swap in a fresh one
      assignLessonRef(stage.n, lessonResult.plan.contentId);
    }
  }, [lessonResult, stage.n]);

  const plan: LessonPlan | null = lessonResult.status === 'ok' ? lessonResult.plan : null;
  const staleName = lessonResult.status === 'stale' ? lessonResult.mechanicName : undefined;
  const chat = plan ? buildCoachChat(coach, plan) : buildPrepChat(coach, staleName);
  const planContentId = plan?.contentId ?? (lessonResult.status === 'stale' ? lessonResult.contentId : null);
  const cleared = prog.completed[stage.n];

  // ── session clock (timestamps track when the room opened) ──
  const sessionStart = useMemo(() => Date.now(), []);
  const t = (addMin: number) => hhmm(new Date(sessionStart + addMin * 60000));

  // ── clip block: real play/pause + countdown state ──
  const clipTotal = useMemo(() => {
    if (!plan) return 0;
    const [m, s] = plan.clip.duration.split(':').map((x) => parseInt(x, 10));
    return m * 60 + s;
  }, [plan]);
  const [clipPlaying, setClipPlaying] = useState(false);
  const [clipLeft, setClipLeft] = useState(clipTotal);
  useEffect(() => setClipLeft(clipTotal), [clipTotal]);
  useEffect(() => {
    if (!clipPlaying) return;
    const id = setInterval(() => {
      setClipLeft((s) => {
        if (s <= 1) {
          setClipPlaying(false);
          return clipTotal;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [clipPlaying, clipTotal]);
  // TODO(real-video): feed the clip reference into the in-app player.

  const [clipW, setClipW] = useState(0);

  // ── MATCH SCAN — graded against the REAL vault, never a timer ──
  const threadSettled = thread.heldCount + thread.brokeCount;
  const { status, result, start, gradeNow } = useMatchScan(
    stage,
    vault.matches,
    journal.entries.length,
    () => {
      recordStagePass(stage.n, {
        contentId: planContentId,
        passedAt: Date.now(),
        xp: stage.rewardXp ?? 100,
        badge: stage.rewardBadge,
      });
    },
    threadSettled,
  );

  const scanDisabled = status === 'scanning';
  const ctaLabel =
    status === 'scanning'
      ? 'READING THE VAULT…'
      : status === 'passed' || (cleared && status === 'armed')
        ? 'BACK TO THE MAP ›'
        : status === 'failed'
          ? 'RUN IT BACK — START A NEW MIRROR SESSION ›'
          : 'START A MIRROR SESSION ›';

  // the room talks as it renders — one pop per beat of the briefing
  useEffect(() => {
    const beats = [250, 380, 540, 660, 780];
    const timers = beats.map((ms) => setTimeout(() => sfx('pop'), ms));
    return () => timers.forEach(clearTimeout);
  }, [stage.n]);

  // the verdict has a sound: a pass gets the full referee treatment
  useEffect(() => {
    if (status === 'passed') {
      sfx('success');
      const w = setTimeout(() => sfx('whistle'), 320);
      return () => clearTimeout(w);
    }
    if (status === 'failed') sfx('fail');
    return undefined;
  }, [status]);

  const handleCta = () => {
    if (scanDisabled) return;
    if (status === 'passed' || (cleared && status === 'armed')) return onClose();
    sfx('whoosh');
    setMirrorOpen(true); // the full Mirror Session: intention → evidence → lesson
  };

  /** the in-room scan closed — if a match was logged, grade immediately */
  const handleScanSheetClose = (didLog: boolean) => {
    setScanSheet(false);
    sfx('tap');
    if (didLog) gradeNow();
  };

  /** the MIRROR SESSION closed — a completed session logged a real match to
   *  the vault; grade the stage objectives from the evidence immediately */
  const handleMirrorClose = (completed: boolean) => {
    setMirrorOpen(false);
    sfx('tap');
    if (completed) gradeNow();
  };

  /** live objective standings, so the card is honest BEFORE any scan runs */
  const liveTargets = useMemo(
    () =>
      (stage.objectives ?? []).map((o) => {
        const count = o.check ? objectiveCount(o.check, vault.matches, journal.entries.length, threadSettled) : o.done;
        return {
          label: o.label,
          target: String(o.target),
          value: String(Math.min(count, o.target)),
          met: count >= o.target,
        };
      }),
    [stage.objectives, vault.matches, journal.entries.length, threadSettled],
  );

  const TileIcon = { target: TargetGlyphIcon, waves: WavesGlyphIcon, arrow: ArrowOutIcon };

  return (
    <View style={styles.root}>
      <GridBackground />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scroll}>
        {/* ── header ── */}
        <View style={styles.headerWrap}>
          <LogoMark size={26} loopProps={loopProps} glowStyle={glowStyle} />
          <Text style={styles.eyebrow}>
            STAGE {stage.n} — {stage.key}{stage.duration ? ` · ${stage.duration}` : ''}
          </Text>
          <View style={styles.nameRow}>
            <Text style={styles.coachBig}>{coachFirst}</Text>
            <OnlineDot />
            <Text style={styles.online}>ONLINE</Text>
          </View>
        </View>

        {/* ── coach identity card ── */}
        <Animated.View entering={FadeInDown.delay(120).duration(360)} style={styles.identity}>
          <View style={styles.avatarWrap}>
            <Image source={coach.portrait} style={styles.avatar} />
            <View style={styles.onlineBadge} />
          </View>
          <View style={styles.identityText}>
            <Text style={styles.identityName}>{coachFirst}</Text>
            <Text style={styles.identityRole}>YOUR COACH · CONSOLE PRO</Text>
            <Text style={styles.identitySub}>IN THE FILM ROOM · TALKING TO YOU ONLY</Text>
          </View>
        </Animated.View>

        <View style={styles.sessionRow}>
          <View style={styles.sessionLine} />
          <Text style={styles.sessionTxt}>ONE-WAY SESSION · TODAY {t(0)}</Text>
          <View style={styles.sessionLine} />
        </View>

        {/* ── chat thread (coach-only, read-only) ── */}
        <Animated.View entering={FadeInDown.delay(200).duration(360)}>
          <CoachBubble coach={coach} label={coach.name}>
            <RichText text={chat.greeting} style={styles.bubbleText} hotStyle={styles.hot} />
          </CoachBubble>
          <MessageMeta time={t(0)} />

          <CoachBubble coach={coach} label={coach.name}>
            <RichText text={chat.mechanic} style={styles.bubbleText} hotStyle={styles.hot} />
          </CoachBubble>
          <MessageMeta time={t(1)} />
        </Animated.View>

        {/* ── TODAY'S MECHANIC — lesson pulled from the live bot feed ── */}
        <Animated.View entering={FadeInDown.delay(280).duration(360)}>
          {staleName && (
            <View style={styles.staleBanner}>
              <RefreshGlyphIcon size={11} color={colors.accent} />
              <Text style={styles.staleTxt}>
                MECHANIC PATCHED OUT · {coachFirst} IS SWAPPING IN A FRESH ONE
              </Text>
            </View>
          )}

          {plan ? (
            <View style={styles.lessonCard}>
              <View style={styles.tagRow}>
                <View style={styles.tagGreen}>
                  <Text style={styles.tagGreenTxt}>SIDE QUEST · STAGE {stage.n}</Text>
                </View>
                <View style={styles.tagGold}>
                  <Text style={styles.tagGoldTxt}>{plan.mechanicName}</Text>
                </View>
              </View>
              <Text style={styles.sideCue}>
                A SIDE NOTE FROM THE LIVE FEED — SOMETHING EXTRA TO TRY. THE MAIN THING HAS TO BE DONE BY YOU.
              </Text>

              <Text style={styles.lessonHeadline}>{plan.headline}</Text>
              <Text style={styles.lessonWhy}>{plan.why}</Text>

              {/* 3-step breakdown — structured fields from the bot item */}
              <View style={styles.tilesRow}>
                {plan.tiles.map((tile, i) => {
                  const Icon = TileIcon[tile.icon] ?? TargetGlyphIcon;
                  return (
                    <View key={i} style={styles.tile}>
                      <View style={styles.tileIconWrap}>
                        <Icon size={15} color={colors.primary} />
                      </View>
                      <Text style={styles.tileTitle}>{tile.title}</Text>
                      <Text style={styles.tileDesc}>{tile.desc}</Text>
                    </View>
                  );
                })}
              </View>

              {/* the rule — quotable, from the same bot item */}
              <View style={styles.ruleStrip}>
                <ClockGlyphIcon size={12} color={colors.primary} />
                <Text style={styles.ruleTxt}>
                  {coachFirst}’S RULE · {plan.rule}
                </Text>
              </View>

              {/* embedded clip preview */}
              <View
                style={[styles.clipWrap, clipPlaying && styles.clipWrapPlaying]}
                onLayout={(e) => setClipW(e.nativeEvent.layout.width)}
              >
                {clipW > 0 && (
                  <LessonAnimation
                    width={clipW - 2}
                    height={126}
                    variant={plan.clip.variant}
                    playing={clipPlaying}
                  />
                )}
                <Pressable onPress={() => setClipPlaying((p) => !p)} hitSlop={8} style={styles.clipHit}>
                  <View style={[styles.clipPlay, clipPlaying && styles.clipPlayOn]}>
                    {clipPlaying ? <PauseGlyphIcon size={11} color="#05130a" /> : <View style={styles.clipTri} />}
                  </View>
                </Pressable>
                <View style={styles.clipDur}>
                  <Text style={styles.clipDurTxt}>{mmss(clipLeft)}</Text>
                </View>
              </View>
              <View style={styles.clipCaptionRow}>
                <Text style={styles.clipCaption}>{plan.clip.caption}</Text>
                <Text style={styles.clipSubcaption}>{plan.clip.subcaption}</Text>
                <Pressable
                  onPress={() => Linking.openURL(plan.sourceUrl).catch(() => console.log('[coaching] clip link failed'))}
                  hitSlop={6}
                >
                  <Text style={styles.clipSource}>SOURCE · {plan.sourceName.toUpperCase()} ›</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => {
                  sfx('whoosh');
                  setSideOpen(true);
                }}
              >
                <View style={styles.blogBtn}>
                  <Text style={styles.blogBtnTxt}>READ THE BLOG — THE FULL SIDE NOTE, IN-APP ›</Text>
                </View>
              </Pressable>

              <Text style={styles.trace}>
                TRACKING FEED ITEM {plan.contentId} · {plan.patchVersion}
              </Text>
            </View>
          ) : (
            /* clearly-marked placeholder — never broken/empty UI */
            <View style={styles.prepCard}>
              <RefreshGlyphIcon size={16} color="rgba(143,184,155,0.6)" />
              <Text style={styles.prepTitle}>
                {staleName ? `${coachFirst.toUpperCase()} IS RECUTTING TODAY’S TAPE` : `${coachFirst.toUpperCase()} IS PREPPING TODAY’S MECHANIC`}
              </Text>
              <Text style={styles.prepTxt}>
                {staleName
                  ? 'THE OLD MECHANIC WAS FLAGGED STALE AFTER A PATCH — THIS STAGE IS WAITING ON A FRESH, APPROVED ONE FROM THE LIVE FEED.'
                  : 'NO APPROVED, FRESH MECHANIC IS AVAILABLE FOR THIS STAGE YET. IT APPEARS HERE THE MOMENT THE LIVE FEED SHIPS ONE.'}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* ── the wink — one line of him being human, then the closer ── */}
        <Animated.View entering={FadeInDown.delay(320).duration(360)}>
          <CoachBubble coach={coach} label={coach.name}>
            <Text style={styles.quipText}>{chat.quip}</Text>
          </CoachBubble>
          <MessageMeta time={t(3)} />
        </Animated.View>

        {/* ── closer message ── */}
        <Animated.View entering={FadeInDown.delay(360).duration(360)}>
          <CoachBubble coach={coach} label={coach.name}>
            <RichText text={chat.closer} style={styles.bubbleText} hotStyle={styles.hot} />
          </CoachBubble>
          <MessageMeta time={t(4)} />
        </Animated.View>

        {/* ── MIRROR SESSION — the MAIN QUEST; passing unlocks the next node ── */}
        <Animated.View entering={FadeInDown.delay(400).duration(360)} style={styles.scanCard}>
          {cleared && status !== 'passed' && (
            <View style={styles.clearedBanner}>
              <CheckRingIcon size={11} color={colors.primary} />
              <Text style={styles.clearedTxt}>STAGE ALREADY CLEARED — REPLAYING THE FILM ROOM</Text>
            </View>
          )}
          <View style={styles.tagRow}>
            <View style={styles.tagGreen}>
              <Text style={styles.tagGreenTxt}>MAIN QUEST · THE THREAD</Text>
            </View>
            <View style={styles.tagGold}>
              <Text style={styles.tagGoldTxt}>REQUIRED TO PASS STAGE {stage.n}</Text>
            </View>
          </View>

          {/* THE THREAD — the lesson you swore last session, carried into today's match */}
          {carried ? (
            <View style={styles.threadBox}>
              <Text style={styles.threadBoxTag}>YOUR MAIN QUEST — SWORN AFTER YOUR LAST SCAN</Text>
              <Text style={styles.threadLesson}>“{carried.lesson}”</Text>
              <Text style={styles.threadMeta}>
                CARRY IT INTO THIS MATCH · THE MIRROR SESSION OPENS BY ASKING HOW IT HELD
                {thread.entries.length > 1
                  ? ` · ${thread.heldCount} HELD · ${thread.brokeCount} BROKE SO FAR`
                  : ''}
              </Text>
            </View>
          ) : (
            <View style={[styles.threadBox, styles.threadBoxEmpty]}>
              <Text style={styles.threadBoxTag}>YOUR MAIN QUEST — THE THREAD STARTS AT YOUR FIRST SCAN</Text>
              <Text style={styles.threadEmpty}>
                The baseline told us who you are. From this match on, every scan pulls one signed
                lesson out of you — and that line becomes your next main quest. The psychology
                can't be handed over; only your own matches teach it. That loop is the climb to
                the Role Model.
              </Text>
            </View>
          )}

          <Text style={styles.scanHeadline}>Prove it in a Mirror Session.</Text>
          <Text style={styles.scanIntro}>{chat.scanIntro}</Text>

          {/* what the scan ACTUALLY grades — live counts off the vault */}
          {liveTargets.length ? (
            <View style={styles.scanList}>
              {liveTargets.map((row, i) => {
                const v = result?.values[i];
                const met = v ? v.met : row.met;
                const shown = v ? v.value : row.value;
                return (
                  <View
                    key={i}
                    style={[
                      styles.scanRow,
                      met && styles.scanRowMet,
                      v && !v.met && styles.scanRowMissed,
                    ]}
                  >
                    <View style={[styles.scanBox, met && styles.scanBoxMet, v && !v.met && styles.scanBoxMissed]}>
                      {met ? (
                        <CheckIcon size={8} color="#05130a" />
                      ) : v ? (
                        <XMarkIcon size={7} color="#05130a" />
                      ) : null}
                    </View>
                    <Text style={[styles.scanLabel, v && !v.met && { color: colors.loss }]} numberOfLines={2}>
                      {row.label}
                    </Text>
                    <Text style={[styles.scanTarget, met && { color: colors.primary }, v && !v.met && { color: colors.loss }]}>
                      {met ? `HIT ${shown}/${row.target}` : `${shown}/${row.target}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.scanPendingRow}>
              <ScanGlyphIcon size={13} color="rgba(143,184,155,0.55)" />
              <Text style={styles.scanPendingTxt}>TARGETS LOCK IN WHEN THE MECHANIC DROPS</Text>
            </View>
          )}

          {/* the coach's-eye watch-list for today's mechanic (honour rows) */}
          {plan && plan.scanTargets.length > 0 && (
            <View style={styles.watchList}>
              <Text style={styles.watchTitle}>{coachFirst.toUpperCase()} IS ALSO WATCHING FOR</Text>
              {plan.scanTargets.map((row, i) => (
                <Text key={i} style={styles.watchRow} numberOfLines={2}>
                  · {row.label} — {row.target}
                </Text>
              ))}
            </View>
          )}

          {/* status row */}
          <View style={[styles.scanStatus, status === 'failed' && styles.scanStatusFailed]}>
            <ScanStatusIcon status={status} />
            <View style={styles.scanStatusText}>
              <Text style={[styles.scanStatusTitle, status === 'failed' && { color: colors.loss }]}>
                {status === 'armed'
                  ? cleared
                    ? `STAGE ${stage.n} CLEARED — THE EVIDENCE HOLDS`
                    : 'READY FOR YOUR MIRROR SESSION'
                  : status === 'scanning'
                    ? 'READING YOUR MATCH…'
                    : status === 'passed'
                      ? `STAGE ${stage.n} CLEARED — THE EVIDENCE HOLDS`
                      : 'OBJECTIVES NOT MET — RUN IT BACK'}
              </Text>
              <Text style={styles.scanStatusSub}>
                {status === 'armed'
                  ? `THE RESULT IS GRADED FROM YOUR VAULT — ${coach.name} NEVER READS YOUR HEAD`
                  : status === 'scanning'
                    ? 'THE VAULT IS BEING GRADED — HOLD TIGHT'
                    : status === 'passed'
                      ? `${coachFirst.toUpperCase()} HAS YOUR RESULT — THE NEXT NODE IS OPEN`
                      : 'THE EVIDENCE DIDN’T MEET THE OBJECTIVES — BACK TO THE LAB'}
              </Text>
            </View>
          </View>

          {/* CTA */}
          <Pressable onPress={handleCta} disabled={scanDisabled}>
            <View style={[styles.cta, scanDisabled && styles.ctaDisabled]}>
              <Text style={styles.ctaTxt}>{ctaLabel}</Text>
            </View>
          </Pressable>

          {/* ghost CTA — grade the matches already in the vault, no new session */}
          {status !== 'scanning' && status !== 'passed' && !cleared && vault.played > 0 && (
            <Pressable onPress={start} hitSlop={6}>
              <Text style={styles.ghostCta}>OR GRADE THE {vault.played} MATCH{vault.played === 1 ? '' : 'ES'} ALREADY IN MY VAULT ›</Text>
            </Pressable>
          )}

          {/* legacy quick path — the old in-room scan ritual, kept for speed */}
          {status !== 'scanning' && status !== 'passed' && !cleared && (
            <Pressable onPress={() => { sfx('tap'); setScanSheet(true); }} hitSlop={6}>
              <Text style={styles.ghostCta}>QUICK MATCH SCAN (SHORTER RITUAL) ›</Text>
            </Pressable>
          )}

          <Text style={styles.oneWay}>{chat.footer}</Text>
        </Animated.View>

        <Text style={styles.footVersion}>PROSEASONACADEMY · VERSION {APP_VERSION}</Text>
        <View style={{ height: 18 }} />
      </ScrollView>

      {/* back chevron — reverses the zoom back out to the map */}
      <Pressable onPress={onClose} hitSlop={10} style={styles.backBtn}>
        <ChevronLeftIcon size={15} color={colors.fg} />
      </Pressable>

      {/* ── THE MIRROR SESSION — the full ritual: intention → evidence → lesson ── */}
      {mirrorOpen && (
        <View style={StyleSheet.absoluteFill}>
          <MirrorSessionScreen coach={coach} stage={stage} onClose={handleMirrorClose} />
        </View>
      )}

      {/* ── THE SCAN RITUAL — the shorter legacy path, still in-room ── */}
      {scanSheet && (
        <View style={StyleSheet.absoluteFill}>
          <StageScanSheet coach={coach} stage={stage} plan={plan} onClose={handleScanSheetClose} />
        </View>
      )}

      {/* ── THE SIDE NOTE — the side quest's animated lesson + blog, in-app ── */}
      {sideOpen && plan && (
        <View style={StyleSheet.absoluteFill}>
          <SideLessonSheet
            coach={coach}
            lesson={sideLessonFromPlan(plan)}
            origin="stage"
            onClose={() => {
              sfx('tap');
              setSideOpen(false);
            }}
          />
        </View>
      )}
    </View>
  );
}

// ── coach bubble shell: avatar + name label above rounded glow card ──
function CoachBubble({ coach, label, children }: { coach: Coach; label: string; children: React.ReactNode }) {
  return (
    <View style={styles.msgRow}>
      <Image source={coach.portrait} style={styles.msgAvatar} />
      <View style={styles.msgCol}>
        <Text style={styles.msgLabel}>{label}</Text>
        <View style={styles.bubble}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 46 },
  scroll: { paddingHorizontal: 16, paddingBottom: 8 },

  backBtn: {
    position: 'absolute',
    top: 58,
    left: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.2,
    borderColor: 'rgba(143,184,155,0.4)',
    backgroundColor: 'rgba(10,17,12,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerWrap: { alignItems: 'center', paddingTop: 2 },
  eyebrow: {
    marginTop: 6,
    fontFamily: monoFont,
    fontSize: 7,
    letterSpacing: 2.6,
    color: 'rgba(143,184,155,0.75)',
  },
  nameRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  coachBig: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2.2,
    color: colors.fg,
    textShadowColor: 'rgba(238,242,236,0.25)',
    textShadowRadius: 8,
  },
  online: {
    fontFamily: monoFont,
    fontSize: 5.8,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: colors.primary,
    marginTop: 2,
  },

  identity: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 6 },
  avatarWrap: { width: 46, height: 46 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.4,
    borderColor: 'rgba(57,255,106,0.55)',
  },
  onlineBadge: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2.4,
    borderColor: colors.bg,
  },
  identityText: { flex: 1 },
  identityName: { fontSize: 15, fontWeight: '900', letterSpacing: 0.8, color: colors.fg },
  identityRole: { marginTop: 3, fontSize: 8.2, fontWeight: '800', letterSpacing: 1.6, color: colors.primary },
  identitySub: { marginTop: 3, fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.5, color: 'rgba(143,184,155,0.7)' },

  sessionRow: { marginTop: 14, marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionLine: { flex: 1, height: 1, backgroundColor: 'rgba(57,255,106,0.18)' },
  sessionTxt: { fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1.8, color: 'rgba(143,184,155,0.55)' },

  msgRow: { flexDirection: 'row', marginTop: 12, alignItems: 'flex-start' },
  msgAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.4)',
    marginTop: 12,
  },
  msgCol: { flex: 1, marginLeft: 8 },
  msgLabel: {
    fontFamily: monoFont,
    fontSize: 5.6,
    fontWeight: '700',
    letterSpacing: 2.2,
    color: colors.primary,
    marginBottom: 4,
    marginLeft: 2,
  },
  bubble: {
    borderWidth: 1.1,
    borderColor: 'rgba(57,255,106,0.32)',
    borderRadius: 15,
    backgroundColor: 'rgba(15,26,19,0.78)',
    paddingHorizontal: 13,
    paddingVertical: 11,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  bubbleText: { fontSize: 11.5, lineHeight: 17.5, color: '#c9d8cd', fontWeight: '600' },
  quipText: { fontSize: 10.5, lineHeight: 16, color: '#a9bbae', fontWeight: '600', fontStyle: 'italic' },
  hot: { color: colors.primary, fontWeight: '900' },
  msgTime: {
    marginLeft: 32,
    marginTop: 4,
    fontFamily: monoFont,
    fontSize: 5.6,
    letterSpacing: 1.4,
    color: 'rgba(143,184,155,0.45)',
  },


  staleBanner: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.45)',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(242,192,120,0.06)',
  },
  staleTxt: { flex: 1, fontFamily: monoFont, fontSize: 6.4, fontWeight: '800', letterSpacing: 1.4, color: colors.accent },

  lessonCard: {
    marginTop: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(57,255,106,0.5)',
    borderRadius: 18,
    backgroundColor: 'rgba(12,20,14,0.94)',
    padding: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  tagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  tagGreen: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    backgroundColor: 'rgba(57,255,106,0.07)',
  },
  tagGreenTxt: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.6, color: colors.primary },
  tagGold: {
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.55)',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
  },
  tagGoldTxt: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.6, color: colors.accent },

  sideCue: { marginTop: 10, fontFamily: monoFont, fontSize: 6.2, lineHeight: 11.5, fontWeight: '900', letterSpacing: 1.3, color: 'rgba(242,192,120,0.85)' },
  blogBtn: {
    marginTop: 11, borderRadius: 10, borderWidth: 1.1, borderColor: 'rgba(242,192,120,0.55)',
    backgroundColor: 'rgba(242,192,120,0.08)', paddingVertical: 10, alignItems: 'center',
  },
  blogBtnTxt: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '900', letterSpacing: 1.6, color: colors.accent },
  lessonHeadline: { marginTop: 12, fontSize: 20, lineHeight: 23, fontWeight: '900', letterSpacing: 0.2, color: colors.fg },
  lessonWhy: { marginTop: 9, fontFamily: monoFont, fontSize: 6.8, lineHeight: 12.6, letterSpacing: 1.3, color: 'rgba(143,184,155,0.8)' },

  tilesRow: { marginTop: 13, flexDirection: 'row', gap: 7 },
  tile: {
    flex: 1,
    borderWidth: 1.1,
    borderColor: 'rgba(57,255,106,0.34)',
    borderRadius: 12,
    backgroundColor: 'rgba(15,26,19,0.6)',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tileIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.1,
    borderColor: 'rgba(57,255,106,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(57,255,106,0.06)',
  },
  tileTitle: { marginTop: 7, fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.6, color: colors.fg },
  tileDesc: { marginTop: 4, fontFamily: monoFont, fontSize: 4.9, lineHeight: 8.5, letterSpacing: 1, textAlign: 'center', color: 'rgba(143,184,155,0.72)' },

  ruleStrip: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.1,
    borderColor: 'rgba(57,255,106,0.5)',
    borderRadius: 10,
    backgroundColor: 'rgba(57,255,106,0.08)',
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  ruleTxt: { flex: 1, fontFamily: monoFont, fontSize: 6.6, lineHeight: 11, fontWeight: '900', letterSpacing: 1.3, color: colors.primary },

  clipWrap: {
    marginTop: 11,
    height: 128,
    borderRadius: 12,
    borderWidth: 1.1,
    borderColor: 'rgba(57,255,106,0.35)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipWrapPlaying: { borderColor: colors.primary },
  clipHit: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  clipPlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.6,
    borderColor: colors.primary,
    backgroundColor: 'rgba(10,15,10,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  clipPlayOn: { backgroundColor: colors.primary },
  clipTri: {
    width: 0,
    height: 0,
    marginLeft: 3,
    borderLeftWidth: 13,
    borderTopWidth: 8.5,
    borderBottomWidth: 8.5,
    borderLeftColor: colors.primary,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  clipDur: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    borderRadius: 5,
    backgroundColor: 'rgba(8,13,9,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.3)',
    paddingHorizontal: 5,
    paddingVertical: 2.5,
  },
  clipDurTxt: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '800', letterSpacing: 1, color: 'rgba(238,242,236,0.85)' },
  clipCaptionRow: { marginTop: 9 },
  clipCaption: { fontFamily: monoFont, fontSize: 7.4, fontWeight: '900', letterSpacing: 1.5, color: colors.fg },
  clipSubcaption: { marginTop: 4, fontFamily: monoFont, fontSize: 5.9, lineHeight: 10, letterSpacing: 1.1, color: 'rgba(143,184,155,0.7)' },
  clipSource: { marginTop: 6, fontFamily: monoFont, fontSize: 6.2, fontWeight: '800', letterSpacing: 1.4, color: colors.primary },
  trace: { marginTop: 10, fontFamily: monoFont, fontSize: 5.2, letterSpacing: 1.2, color: 'rgba(143,184,155,0.38)' },

  prepCard: {
    marginTop: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(143,184,155,0.3)',
    borderStyle: 'dashed',
    borderRadius: 18,
    backgroundColor: 'rgba(12,20,14,0.8)',
    padding: 18,
    alignItems: 'center',
  },
  prepTitle: { marginTop: 10, fontFamily: monoFont, fontSize: 8.4, fontWeight: '900', letterSpacing: 1.8, color: colors.fg, textAlign: 'center' },
  prepTxt: { marginTop: 8, fontFamily: monoFont, fontSize: 6.4, lineHeight: 12, letterSpacing: 1.2, color: 'rgba(143,184,155,0.7)', textAlign: 'center' },

  scanCard: {
    marginTop: 16,
    borderWidth: 1.3,
    borderColor: 'rgba(57,255,106,0.62)',
    borderRadius: 18,
    backgroundColor: 'rgba(12,20,14,0.96)',
    padding: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  clearedBanner: {
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.4)',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(57,255,106,0.05)',
  },
  clearedTxt: { flex: 1, fontFamily: monoFont, fontSize: 6.4, fontWeight: '800', letterSpacing: 1.4, color: colors.primary },
  threadBox: {
    marginTop: 12, borderWidth: 1.2, borderColor: 'rgba(57,255,106,0.55)', borderRadius: 13,
    backgroundColor: 'rgba(57,255,106,0.06)', padding: 12,
    shadowColor: colors.primary, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  threadBoxEmpty: { borderColor: 'rgba(57,255,106,0.3)', backgroundColor: 'rgba(15,26,19,0.5)', shadowOpacity: 0 },
  threadBoxTag: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.9, color: colors.primary },
  threadLesson: { marginTop: 8, fontSize: 13.5, lineHeight: 19, fontStyle: 'italic', fontWeight: '700', color: colors.fg },
  threadEmpty: { marginTop: 8, fontSize: 10.5, lineHeight: 16, fontWeight: '600', color: '#c9d8cd' },
  threadMeta: { marginTop: 8, fontFamily: monoFont, fontSize: 5.8, fontWeight: '800', letterSpacing: 1.2, color: colors.muted },
  scanHeadline: { marginTop: 12, fontSize: 20, lineHeight: 23, fontWeight: '900', letterSpacing: 0.2, color: colors.primary, textShadowColor: 'rgba(57,255,106,0.4)', textShadowRadius: 12 },
  scanIntro: { marginTop: 9, fontFamily: monoFont, fontSize: 6.8, lineHeight: 12.6, letterSpacing: 1.3, color: 'rgba(143,184,155,0.8)' },

  scanList: { marginTop: 12, gap: 7 },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.1,
    borderColor: 'rgba(57,255,106,0.3)',
    borderRadius: 11,
    backgroundColor: 'rgba(15,26,19,0.5)',
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  scanRowLive: { borderColor: 'rgba(57,255,106,0.55)', backgroundColor: 'rgba(57,255,106,0.05)' },
  scanRowMet: { borderColor: 'rgba(57,255,106,0.6)', backgroundColor: 'rgba(57,255,106,0.07)' },
  scanRowMissed: { borderColor: 'rgba(224,96,92,0.55)', backgroundColor: 'rgba(224,96,92,0.06)' },
  scanBox: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.4,
    borderColor: 'rgba(143,184,155,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBoxMet: { backgroundColor: colors.primary, borderColor: colors.primary },
  scanBoxMissed: { backgroundColor: colors.loss, borderColor: colors.loss },
  scanLabel: { flex: 1, fontSize: 10.2, fontWeight: '600', color: '#c9d8cd' },
  scanTarget: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.3, color: 'rgba(143,184,155,0.75)' },

  scanPendingRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.25)',
    borderStyle: 'dashed',
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 11,
  },
  scanPendingTxt: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '800', letterSpacing: 1.4, color: 'rgba(143,184,155,0.6)' },

  scanStatus: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.1,
    borderColor: 'rgba(57,255,106,0.4)',
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    backgroundColor: 'rgba(57,255,106,0.05)',
  },
  scanStatusFailed: { borderColor: 'rgba(224,96,92,0.5)', backgroundColor: 'rgba(224,96,92,0.05)' },
  scanStatusText: { flex: 1 },
  scanStatusTitle: { fontFamily: monoFont, fontSize: 7.6, fontWeight: '900', letterSpacing: 1.5, color: colors.primary },
  scanStatusSub: { marginTop: 3, fontFamily: monoFont, fontSize: 5.6, letterSpacing: 1.1, color: 'rgba(143,184,155,0.65)' },

  cta: {
    marginTop: 12,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  ctaDisabled: { backgroundColor: 'rgba(31,56,38,1)', shadowOpacity: 0 },
  ctaTxt: { fontFamily: monoFont, fontSize: 10, fontWeight: '900', letterSpacing: 2.4, color: '#05130a' },

  oneWay: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 6,
    letterSpacing: 1.6,
    color: 'rgba(143,184,155,0.55)',
  },

  ghostCta: {
    marginTop: 9,
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 6.2,
    fontWeight: '900',
    letterSpacing: 1.3,
    color: 'rgba(57,255,106,0.72)',
  },

  // coach's-eye honour rows for today's mechanic
  watchList: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.22)',
    backgroundColor: 'rgba(30,25,12,0.35)',
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 10,
    gap: 3,
  },
  watchTitle: {
    fontFamily: monoFont,
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 1.6,
    color: 'rgba(242,192,120,0.9)',
    marginBottom: 2,
  },
  watchRow: { fontFamily: monoFont, fontSize: 6.2, lineHeight: 9.5, letterSpacing: 0.8, color: 'rgba(143,184,155,0.8)' },

  footVersion: { marginTop: 14, textAlign: 'center', fontFamily: monoFont, fontSize: 6.3, letterSpacing: 2.6, color: 'rgba(143,184,155,0.4)' },
});
