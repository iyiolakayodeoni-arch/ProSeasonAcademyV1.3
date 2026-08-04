import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import Constants from 'expo-constants';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import GridBackground from '../../components/GridBackground';
import MiniPitch from '../../components/MiniPitch';
import RoleModelCard from '../../components/RoleModelCard';
import PlayerCard from '../../components/PlayerCard';
import BadgeMark, { BADGE_LABELS } from '../../components/BadgeMark';
import { EvidenceRing, StatBar, EvidenceMeter } from '../../components/StatReadout';
import { CheckIcon, LockIcon, PersonIcon } from '../../components/Icons';
import { Coach } from '../../data/coaches';
import {
  journeySeasonFor,
  MAP_W,
  MAP_H,
  buildMapPath,
  buildLitPath,
  footprintDots,
  JourneyStage,
} from '../../data/journey';
import { useJourneyProgress } from '../../data/progress';
import { isContentStale } from '../../data/coaching';
import { objectiveCount, useMatches } from '../../data/matches';
import { sfx } from '../../audio/sound';
import { useJournal } from '../../data/journal';
import { useSettings } from '../../data/settings';
import { useLessonThread } from '../../data/lessonThread';
import { useStandard, StandardChapter } from '../../data/standard';
import { playerCardData, evidenceFromVault, PLAYER_CARD } from '../../data/playerCard';
import * as backend from '../../data/backend';
import MatchVault from '../MatchVault';
import LossJournal from '../LossJournal';
import StoreSheet from '../StoreSheet';
import RoleModelSheet from '../RoleModelSheet';
import { colors, monoFont } from '../../theme';

type StageOrigin = { x: number; y: number };

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

function PulseRing({ x, y }: { x: number; y: number }) {
  const v = useSharedValue(0);
  React.useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: 1600 }), -1, false);
  }, [v]);
  const s = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - v.value),
    transform: [{ scale: 1 + v.value * 0.55 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.pulseRing, { left: x - 24, top: y - 24 }, s]}
    />
  );
}

function LitPathPulse({ d }: { d: string }) {
  const o = useSharedValue(0.55);
  React.useEffect(() => {
    o.value = withDelay(300, withRepeat(withTiming(1, { duration: 1400 }), -1, true));
  }, [o]);
  return <Path d={d} stroke={colors.primary} strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={1} />;
}

export default function JourneyTab({
  coach,
  onOpenStage,
}: {
  coach: Coach;
  onOpenStage: (stage: JourneyStage, origin: StageOrigin) => void;
}) {
  // live journey progress — the MATCH SCAN is the only thing that advances it
  const progress = useJourneyProgress();
  const CUR = progress.currentStage;
  const SEASON = journeySeasonFor(coach.id);
  const [selected, setSelected] = useState<JourneyStage>(SEASON.stages[0]);
  // the vault + journal are what objectives are actually graded against
  const vault = useMatches();
  const journal = useJournal();
  const settings = useSettings();
  // THE THREAD — settled lessons count toward PROVE IT (the objective engine)
  const thread = useLessonThread();
  const threadSettled = thread.heldCount + thread.brokeCount;
  // THE STANDARD — the parallel benchmark journey, revealed by progress
  const standard = useStandard();

  // ── THE PLAYER CARD — derived honestly from the same ledgers every
  //    objective is graded from. Rating is stage-gated (clears lift it);
  //    the six stats are the live receipt readout. (Principles P1/P2)
  const playerCard = React.useMemo(
    () =>
      playerCardData(
        progress,
        evidenceFromVault({
          played: vault.played,
          w: vault.w,
          d: vault.d,
          l: vault.l,
          ga: vault.ga,
          cleanSheets: vault.cleanSheets,
          matches: vault.matches,
          journalTotal: journal.total,
          journalStreakDays: journal.streakDays,
          threadSettled: threadSettled,
          threadHeld: thread.heldCount,
          threadBroke: thread.brokeCount,
        }),
      ),
    [progress, vault, journal.total, journal.streakDays, threadSettled, thread.heldCount, thread.brokeCount],
  );

  // ── LIVE stage progress — the honest met-objective ratio, replacing the
  //    author-set progressPct. A stage's bar fills only as the vault/journal
  //    actually meet its objectives. (Principle P1)
  const stageLiveProgress = React.useMemo(() => {
    const objs = selected.objectives ?? [];
    if (!objs.length) return 0;
    const met = objs.filter((o) => {
      const count = o.check
        ? objectiveCount(o.check, vault.matches, journal.entries.length, threadSettled)
        : o.done;
      return count >= o.target;
    }).length;
    return Math.round((met / objs.length) * 100);
  }, [selected, vault.matches, journal.entries.length, threadSettled]);
  const [sheet, setSheet] = useState<'vault' | 'journal' | 'till' | 'rolemodel' | null>(null);

  // ── ACCESS — one ladder: FREE / ACADEMY / PRO ──
  // Identical rungs in every country; only the currency differs.
  const [access, setAccess] = useState<backend.MyAccess | null>(null);
  const [rules, setRules] = useState<backend.AccessRules | null>(null);
  const [unlocks, setUnlocks] = useState<string[]>([]);

  const refreshAccess = () => {
    void backend.myAccess().then((a) => a && setAccess(a));
    void backend.accessRules().then((r) => r && setRules(r));
    void backend.myUnlocks().then((u) => u && setUnlocks(u));
  };
  useEffect(refreshAccess, []);

  const freeStages = rules?.freeStages ?? 2;
  const midStages = rules?.midStages ?? 6;
  const level = access?.level ?? 0;

  /** the tier a stage needs: 0 free · 1 academy · 2 pro */
  const tierFor = (n: number) => (n <= freeStages ? 0 : n <= midStages ? 1 : 2);
  const owned = (n: number) => unlocks.includes(`stage:${n}`);
  const needsUnlock = (n: number) => !owned(n) && level < tierFor(n);
  const tierName = (lvl: number) => (lvl >= 2 ? 'PRO' : 'ACADEMY');
  const scrollRef = useRef<ScrollView>(null);
  const canvasRef = useRef<View>(null);
  const heroRef = useRef<View>(null);

  const coachFirst = coach.name.split(' ')[0];
  const dimPath = buildMapPath();
  const litPath = buildLitPath(CUR);
  const dots = footprintDots(CUR);
  const current = SEASON.stages[CUR - 1] ?? SEASON.stages[SEASON.stages.length - 1];
  const cleared = !!progress.completed[selected.n];
  const isLocked = selected.isSideQuest ? (selected.parentStageN ?? 1) > CUR : selected.n > CUR;

  // node tap → the node zooms open into the Coaching Screen
  const zoomIntoStage = (s: JourneyStage) => {
    setSelected(s);
    const fallback: StageOrigin = { x: 195, y: 240 };
    try {
      canvasRef.current?.measureInWindow((mx, my) => {
        const ok = Number.isFinite(mx) && Number.isFinite(my);
        onOpenStage(s, ok ? { x: mx + s.at.x, y: my + s.at.y } : fallback);
      });
    } catch {
      onOpenStage(s, fallback);
    }
  };

  // tapping the Role Model card zooms into the CURRENT stage's room
  const zoomFromCard = () => {
    const fallback: StageOrigin = { x: 195, y: 260 };
    try {
      heroRef.current?.measureInWindow((mx, my, w, h) => {
        const ok = Number.isFinite(mx) && Number.isFinite(my);
        onOpenStage(current, ok ? { x: mx + (w ?? 168) / 2, y: my + (h ?? 226) / 2 } : fallback);
      });
    } catch {
      onOpenStage(current, fallback);
    }
  };

  return (
    <View style={styles.flex}>
      <GridBackground />
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scroll}>
        {/* header row */}
        <View style={styles.headerRow}>
          <Text style={styles.brand}>PROSEASONACADEMY</Text>
          <View style={styles.seasonPill}>
            <Text style={styles.seasonTxt}>
              SEASON {SEASON.seasonNo} · {CUR}/{SEASON.totalStages}
            </Text>
          </View>
        </View>

        <Text style={styles.headline}>YOUR JOURNEY</Text>
        <Text style={styles.subline}>GUIDED BY {coach.name.toUpperCase()} · THE STANDARD SHOWS THE WAY. YOUR EVIDENCE MOVES YOU.</Text>

        {/* ── THE CHINEDU WAY: OUR OWN PATH PHILOSOPHY ── */}
        <View style={styles.chineduCard}>
          <Text style={styles.chineduTag}>THE CHINEDU WAY · HOW YOU WALK OUR PATH</Text>
          <Text style={styles.chineduTitle}>PEN TO PAPER BEFORE YOU TYPE · THE HARD WAY IS THE EASY WAY</Text>
          <Text style={styles.chineduText}>
            1. RECORD & WATCH: Record your console match as usual before kick-off (PS Share / Xbox Capture / capture card), play your match, then watch your tape back.
            {'\n'}2. PEN TO PAPER: There is a special connection a biro has to a book that cannot be typed. Pen down the key moments, unusual events, and answers on paper first.
            {'\n'}3. 24–30 MIN COOL-DOWN: Let your mind settle for 24–30 minutes after full time.
            {'\n'}4. LOG TO DATABASE: Once your head has cooled, open the app and type your penned truth into your database.
            {'\n\n'}In a world looking for the easy way out, we tell you that the hard way is the easy way, and the easy way is the hard way. Tech is meant to elevate and not make you dormant.
          </Text>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.divLine} />
          <Text style={styles.dividerTxt}>STAGE {SEASON.totalStages + 1} — WHERE THIS PATH ENDS</Text>
          <View style={styles.divLine} />
        </View>

        {/* ── the Role Model hero card — stage 7 opens his story, not a shortcut ── */}
        <View style={styles.heroWrap} ref={heroRef} collapsable={false}>
          <RoleModelCard
            coach={coach}
            onPress={() => {
              sfx('whoosh');
              setSheet('rolemodel');
            }}
          />
          <Text style={styles.heroHint}>
            PRESS [A/CROSS] — THE FINISH IS A PERSON TO LOOK UP TO, NOT A PATH TO COPY
          </Text>
        </View>

        {/* ── the map ── */}
        <View style={styles.mapWrap}>
          <View style={styles.mapCanvas} ref={canvasRef} collapsable={false}>
            <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={StyleSheet.absoluteFill}>
              {/* dim dashed remainder */}
              <Path d={dimPath} stroke="rgba(57,255,106,0.28)" strokeWidth={1.4} strokeDasharray="2.5 6" strokeLinecap="round" fill="none" />
              {/* footprint dots on the locked stretch */}
              {dots.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={1.6} fill="rgba(57,255,106,0.35)" />
              ))}
              {/* lit path up to the current node */}
              <LitPathPulse d={litPath} />
              {/* connecting dashed amber lines to side quests */}
              {SEASON.stages.map((s) => (
                <React.Fragment key={`lines-${s.n}`}>
                  {s.sideQuests?.map((sq) => {
                    const sqUnlocked = s.n <= CUR;
                    return (
                      <Path
                        key={`line-${sq.id}`}
                        d={`M ${s.at.x} ${s.at.y} L ${sq.at.x} ${sq.at.y}`}
                        stroke={colors.accent}
                        strokeWidth={1.4}
                        strokeDasharray="3 4"
                        opacity={sqUnlocked ? 0.8 : 0.3}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
              <Circle cx={current.at.x} cy={current.at.y} r={4} fill={colors.primary} />
            </Svg>

            {/* player position token — "YOU · here". The full identity card
                lives just below the map, so the map only marks the spot. */}
            <View style={[styles.youToken, { left: SEASON.playerCard.at.x - 30, top: SEASON.playerCard.at.y - 30 }]}>
              <PersonIcon size={16} color={colors.primary} />
              <Text style={styles.youTokenTxt}>YOU</Text>
            </View>
            <Text style={[styles.playerLabel, { left: SEASON.playerCard.at.x - 52, top: SEASON.playerCard.at.y + 36 }]}>
              YOU · STAGE {playerCard.stageN} / {SEASON.totalStages}
            </Text>

            {/* stage nodes */}
            {SEASON.stages.map((s) => {
              const isCurrent = s.n === CUR;
              const locked = s.n > CUR;
              const isSel = selected.n === s.n;
              const done = !!progress.completed[s.n];
              // completed stage whose live lesson got patched out → coach swap flag
              const staleRef = !!progress.lessonRefs[s.n] && isContentStale(progress.lessonRefs[s.n]);
              return (
                <React.Fragment key={s.n}>
                  {isCurrent && <PulseRing x={s.at.x} y={s.at.y} />}
                  <Pressable
                    onPress={() => {
                      if (locked) {
                        setSelected(s);
                        sfx('fail'); // a soft no — the map says not yet
                      } else {
                        zoomIntoStage(s);
                      }
                    }}
                    hitSlop={12}
                  >
                    <View
                      style={[
                        styles.node,
                        { left: s.at.x - (isCurrent ? 24 : 18), top: s.at.y - (isCurrent ? 24 : 18) },
                        isCurrent ? styles.nodeCurrent : done ? styles.nodeDone : styles.nodeLocked,
                        isSel && !isCurrent && !done && { borderColor: 'rgba(238,242,236,0.8)' },
                      ]}
                    >
                      {locked ? (
                        <LockIcon size={11} color="rgba(143,184,155,0.6)" />
                      ) : done ? (
                        <CheckIcon size={11} color={colors.primary} />
                      ) : (
                        <Text style={[styles.nodeNum, isCurrent && { color: '#05130a' }]}>{s.n}</Text>
                      )}
                    </View>
                  </Pressable>
                  {/* stale mechanics flag — gold dot above a cleared node */}
                  {done && staleRef && (
                    <View style={[styles.staleDot, { left: s.at.x + 12, top: s.at.y - 21 }]} />
                  )}
                  {/* CURRENT pill */}
                  {isCurrent && (
                    <View style={[styles.currentPill, { left: s.at.x - 20, top: s.at.y - 46 }]}>
                      <Text style={styles.currentPillTxt}>CURRENT</Text>
                    </View>
                  )}
                  {/* stage name beside the node */}
                  <Text
                    style={[
                      styles.stageKey,
                      s.at.x > MAP_W / 2
                        ? { left: s.at.x + 26, textAlign: 'left' }
                        : { left: s.at.x - 136, textAlign: 'right' },
                      { top: s.at.y + 14 },
                      isCurrent && { color: colors.primary },
                    ]}
                  >
                    {s.key}
                  </Text>

                  {/* Side Quests branching from this stage */}
                  {s.sideQuests?.map((sq) => {
                    const sqUnlocked = s.n <= CUR;
                    const sqDone = !!progress.completed[100 + s.n];
                    const sqStage: JourneyStage = {
                      n: 100 + s.n,
                      key: sq.key,
                      name: sq.name,
                      tagline: sq.tagline,
                      at: sq.at,
                      chapter: s.chapter,
                      objectives: sq.objectives,
                      rewardXp: sq.rewardXp,
                      rewardBadge: sq.rewardBadge,
                      quote: sq.quote,
                      duration: sq.duration,
                      isSideQuest: true,
                      parentStageN: s.n,
                      internalSource: sq.internalSource,
                      internalPatchVersion: sq.internalPatchVersion,
                      coachExplanation: sq.coachExplanation,
                      rule: sq.rule,
                      why: sq.why,
                      tiles: sq.tiles,
                      clip: sq.clip,
                    };
                    return (
                      <React.Fragment key={sq.id}>
                        <Pressable
                          onPress={() => {
                            if (!sqUnlocked) {
                              sfx('fail');
                            } else {
                              setSelected(sqStage);
                              zoomIntoStage(sqStage);
                            }
                          }}
                          hitSlop={8}
                        >
                          <View
                            style={[
                              styles.node,
                              { left: sq.at.x - 13, top: sq.at.y - 13, width: 26, height: 26, borderRadius: 13 },
                              sqDone ? styles.sqNodeDone : sqUnlocked ? styles.sqNodeUnlocked : styles.sqNodeLocked,
                              selected.n === sqStage.n && { borderColor: 'rgba(238,242,236,0.9)', borderWidth: 1.5 },
                            ]}
                          >
                            {!sqUnlocked ? (
                              <LockIcon size={8} color="rgba(242,192,120,0.5)" />
                            ) : sqDone ? (
                              <CheckIcon size={9} color="#05130a" />
                            ) : (
                              <Text style={styles.sqNodeNum}>Q</Text>
                            )}
                          </View>
                        </Pressable>
                        {/* side quest name beside the node */}
                        <Text
                          style={[
                            styles.stageKey,
                            sq.at.x > MAP_W / 2
                              ? { left: sq.at.x + 18, textAlign: 'left' }
                              : { left: sq.at.x - 118, textAlign: 'right' },
                            { top: sq.at.y + 14, width: 100, fontSize: 5.6, letterSpacing: 1.5, color: sqDone ? colors.accent : sqUnlocked ? colors.fg : 'rgba(143,184,155,0.4)' },
                          ]}
                        >
                          {sq.key}
                        </Text>
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* ── THE STANDARD — the parallel benchmark journey ── */}
        <StandardPanel
          chapter={standard.current}
          clearedCount={standard.clearedCount}
          stageN={CUR}
        />

        {/* ── YOUR CARD — the player's own collectible, derived from receipts.
            Pairs with the Role Model above: YOUR JOURNEY (evidence) vs THE
            STANDARD (benchmark), both as instruments. (Principles P1/P2) ── */}
        <View style={styles.youCardWrap}>
          <View style={styles.dualTagRow}>
            <Text style={styles.dualTagGreen}>YOUR CARD · THE EVIDENCE</Text>
            <Text style={styles.dualTagGold}>vs THE STANDARD</Text>
          </View>
          <View style={styles.youCardHolder}>
            <PlayerCard
              rating={playerCard.rating}
              stats={playerCard.stats}
              stageN={playerCard.stageN}
              totalStages={playerCard.totalStages}
              clearedCount={playerCard.clearedCount}
              ascent={playerCard.ascent}
              displayName={settings.displayName}
            />
          </View>
          {/* the six honest stats in detail — the bars the card summarises */}
          <View style={styles.youStatsCard}>
            <Text style={styles.youStatsTitle}>YOUR RECEIPTS · HOW YOU'RE ACTUALLY PLAYING</Text>
            <View style={styles.youStatsGap}>
              {playerCard.stats.map((s, i) => (
                <StatBar key={s.label} label={s.label} value={s.value} delay={i * 70} />
              ))}
            </View>
            <Text style={styles.youStatsNote}>
              GREEN WHEN THE EVIDENCE HOLDS · AMBER WHEN IT'S THIN · NEVER PAINTED. THE RATING
              ONLY RISES WHEN A STAGE CLEARS — YOU CANNOT GRIND IT UP.
            </Text>
          </View>
        </View>

        {/* ── stage detail card ── */}
        <Animated.View key={selected.n} entering={FadeInUp.duration(300)} style={[styles.stageCard, isLocked && styles.stageCardLocked]}>
          <View style={styles.stageTop}>
            {selected.isSideQuest ? (
              <Text style={[styles.stageSelPill, { borderColor: 'rgba(242,192,120,0.5)', color: colors.accent }]}>SIDE QUEST · SELECTED</Text>
            ) : (
              <Text style={styles.stageSelPill}>STAGE {selected.n} · SELECTED</Text>
            )}
            {isLocked ? (
              <View style={styles.statusPill}>
                <LockIcon size={9} color="rgba(143,184,155,0.7)" />
                <Text style={styles.statusLockedTxt}>LOCKED</Text>
              </View>
            ) : cleared ? (
              <View style={styles.statusPill}>
                <CheckIcon size={8} color={colors.primary} />
                <Text style={styles.statusTxt}>CLEARED</Text>
              </View>
            ) : (
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusTxt}>IN PROGRESS</Text>
              </View>
            )}
          </View>

          <Text style={[styles.stageName, isLocked && { color: 'rgba(143,184,155,0.7)' }]}>{selected.name}</Text>
          <Text style={styles.stageTagline}>{selected.tagline.replace('YOUR COACH', coachFirst)}</Text>
          {selected.duration && (
            <Text style={styles.stageDuration}>ESTIMATED TIME TO CLEAR: {selected.duration}</Text>
          )}

          {isLocked ? (
            <View style={styles.lockedNote}>
              <Text style={styles.lockedNoteTxt}>
                Finish Stage {selected.n - 1} first. The path only moves forward — no skipping, no shortcuts.
              </Text>
            </View>
          ) : (
            <>
              {/* objectives — GRADED LIVE against the vault + the journal.
                  Each is now an evidence ring, not a checkbox + "2/3" text. */}
              <View style={styles.objectives}>
                {(selected.objectives ?? []).map((o, i) => {
                  const count = o.check
                    ? objectiveCount(o.check, vault.matches, journal.entries.length, threadSettled)
                    : o.done;
                  const shown = Math.min(count, o.target);
                  const done = count >= o.target;
                  return (
                    <View key={i} style={styles.objRow}>
                      <EvidenceRing
                        value={shown}
                        target={o.target}
                        size={28}
                        stroke={3.1}
                        delay={i * 70}
                        glyph={done ? <CheckIcon size={13} color={colors.primary} /> : undefined}
                      />
                      <Text style={[styles.objLabel, done && styles.objLabelDone]} numberOfLines={2}>
                        {o.label}
                      </Text>
                      <Text style={[styles.objStatus, done && { color: colors.primary }]}>
                        {done ? 'HIT' : `${shown}/${o.target}`}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* progress — FUT 26 Rivals Rank Ladder Progress */}
              <RivalsRankLadder progressPct={stageLiveProgress} totalSteps={(selected.objectives ?? []).length + 1} />

              {/* reward — the badge as a real sealed/unsealed medallion + XP */}
              <View style={styles.rewardRow}>
                <BadgeMark stage={selected.n} sealed={!!cleared} size={48} />
                <View style={styles.rewardMeta}>
                  <Text style={styles.rewardTitle}>
                    {BADGE_LABELS[selected.n] ?? selected.rewardBadge ?? 'STAGE BADGE'}
                  </Text>
                  <Text style={styles.rewardSub}>
                    {cleared ? 'SEALED · THE EVIDENCE HOLDS' : 'SEALS WHEN THE STAGE CLEARS'}
                  </Text>
                </View>
                <View style={styles.rewardXpBox}>
                  <Text style={styles.rewardXpNum}>+{selected.rewardXp}</Text>
                  <Text style={styles.rewardXpLbl}>XP</Text>
                </View>
              </View>

              {/* coach quote */}
              {selected.quote && (
                <View style={styles.quoteCard}>
                  <Image source={coach.portrait} style={styles.quoteAvatar} />
                  <View style={styles.quoteBody}>
                    <Text style={styles.quoteTxt}>"{selected.quote}"</Text>
                    <Text style={styles.quoteBy}>— {coach.name} · YOUR COACH</Text>
                  </View>
                </View>
              )}

              {/* CTA — free stages open; paid ones ask once, then open forever */}
              {needsUnlock(selected.isSideQuest ? (selected.parentStageN ?? 1) : selected.n) ? (
                <View style={styles.payWall}>
                  <Text style={styles.payTag}>
                    STAGES 1–{freeStages} ARE FREE · THIS ONE NEEDS {tierName(tierFor(selected.isSideQuest ? (selected.parentStageN ?? 1) : selected.n))}
                  </Text>
                  <Text style={styles.payBody}>
                    {tierFor(selected.isSideQuest ? (selected.parentStageN ?? 1) : selected.n) >= 2
                      ? 'The summit stages are PRO. One pass opens every stage, every trick and the film room — for the whole period, not per item.'
                      : 'ACADEMY opens the full journey for the period you pick. Same tier, same access, wherever you are — only the currency changes.'}
                  </Text>
                  <Text style={styles.payNote}>
                    YOU ARE ON {(access?.tier ?? 'free').toUpperCase()}
                    {access?.daysLeft != null ? ` · ${access.daysLeft} DAYS LEFT` : ''}
                  </Text>
                  <ContinueButton label="SEE THE PASSES ›" onPress={() => setSheet('till')} />
                </View>
              ) : (
                <ContinueButton
                  label={cleared ? 'REPLAY FILM ROOM ›' : selected.isSideQuest ? 'START SIDE QUEST ›' : 'CONTINUE STAGE ›'}
                  onPress={() => zoomIntoStage(selected)}
                />
              )}
            </>
          )}

          <Pressable onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} hitSlop={8}>
            <Text style={styles.fullMap}>VIEW FULL MAP · {SEASON.totalStages} STAGES</Text>
          </Pressable>
        </Animated.View>

        {/* ── THE RECORD — the two ledgers every objective is graded from ── */}
        <View style={styles.ledgerRow}>
          <Pressable style={styles.ledgerCard} onPress={() => setSheet('vault')}>
            <Text style={styles.ledgerTag}>MATCH VAULT</Text>
            <Text style={styles.ledgerBig}>{vault.played}</Text>
            <Text style={styles.ledgerSub}>
              {vault.w}W · {vault.d}D · {vault.l}L
            </Text>
            <Text style={styles.ledgerCta}>OPEN THE VAULT ›</Text>
          </Pressable>

          <Pressable style={styles.ledgerCard} onPress={() => setSheet('journal')}>
            <Text style={styles.ledgerTag}>LOSS JOURNAL</Text>
            <Text style={styles.ledgerBig}>{journal.total}</Text>
            <Text style={styles.ledgerSub}>
              {settings.toggles.lossJournal
                ? journal.streakDays > 0
                  ? `${journal.streakDays} DAY STREAK`
                  : 'LINES LOGGED'
                : 'PAUSED'}
            </Text>
            <Text style={styles.ledgerCta}>
              {settings.toggles.lossJournal ? 'WRITE A LINE ›' : 'TURN IT BACK ON ›'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footVersion}>PROSEASONACADEMY · VERSION {APP_VERSION}</Text>
      </ScrollView>

      {/* full-screen ledgers */}
      {sheet === 'vault' && <MatchVault coach={coach} onClose={() => setSheet(null)} />}
      {sheet === 'journal' && <LossJournal coach={coach} onClose={() => setSheet(null)} />}
      {sheet === 'till' && <StoreSheet onClose={() => { setSheet(null); refreshAccess(); }} />}
      {sheet === 'rolemodel' && (
        <RoleModelSheet
          coach={coach}
          onClose={() => setSheet(null)}
          onWalkCurrent={() => {
            setSheet(null);
            zoomFromCard();
          }}
        />
      )}
    </View>
  );
}

// ── THE STANDARD — the parallel benchmark journey. Not a second
// progression track: it moves beside YOUR JOURNEY and reveals the
// chapter that matches your current stage. Read it. Walk your own road.
function RivalsRankLadder({ progressPct, totalSteps = 4 }: { progressPct: number; totalSteps?: number }) {
  const activeStep = Math.min(totalSteps - 1, Math.floor((progressPct / 100) * totalSteps));
  return (
    <View style={styles.rivalsTrack}>
      <Text style={styles.rivalsTrackTitle}>FUT 26 DIV RIVALS LADDER PROGRESS</Text>
      <View style={styles.rivalsLineRow}>
        <View style={styles.rivalsBgLine} />
        <View style={[styles.rivalsActiveLine, { width: `${progressPct}%` }]} />
        {Array.from({ length: totalSteps }).map((_, i) => {
          const stepPct = (i / (totalSteps - 1)) * 100;
          const isCompleted = progressPct >= stepPct || (i === 0);
          const isActive = i === activeStep;
          return (
            <View
              key={i}
              style={[
                styles.rivalsStepNode,
                { left: `${stepPct}%` },
                isCompleted && styles.rivalsStepCompleted,
                isActive && styles.rivalsStepActive,
              ]}
            >
              {i === totalSteps - 1 ? (
                <Text style={[styles.rivalsStepGlyph, isCompleted && { color: '#05130a' }]}>★</Text>
              ) : (
                <View style={[styles.rivalsStepInnerDot, isCompleted && { backgroundColor: '#05130a' }]} />
              )}
              <Text
                style={[
                  styles.rivalsStepLabel,
                  isCompleted ? { color: colors.primary } : { color: colors.muted },
                  isActive && { color: colors.accent, fontWeight: '900' },
                ]}
              >
                {i === 0 ? 'START' : i === totalSteps - 1 ? 'RANK UP' : `STEP ${i}`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function StandardPanel({ chapter, stageN, clearedCount }: { chapter: StandardChapter; stageN: number; clearedCount: number }) {
  return (
    <Animated.View entering={FadeInUp.duration(300)} style={styles.standardCard}>
      <View style={styles.standardHead}>
        <View style={styles.standardTitleBlock}>
          <Text style={styles.standardName}>THE STANDARD</Text>
          <Text style={styles.standardSub}>A COMPOSITE OF THE BEST IN THE PATH</Text>
        </View>
        <View style={styles.standardStagePill}>
          <Text style={styles.standardStageTxt}>STAGE {stageN}</Text>
        </View>
      </View>

      {/* the dual line — YOUR JOURNEY vs THE STANDARD at the same point */}
      <View style={styles.standardDual}>
        <View style={styles.standardDualCol}>
          <Text style={styles.standardDualTag}>YOUR JOURNEY</Text>
          <Text style={styles.standardDualName}>{chapter.stageKey}</Text>
        </View>
        <View style={styles.standardDualArrow}>
          <Text style={styles.standardDualArrowTxt}>‖</Text>
        </View>
        <View style={[styles.standardDualCol, styles.standardDualColRight]}>
          <Text style={[styles.standardDualTag, styles.standardDualTagGold]}>THE STANDARD</Text>
          <Text style={styles.standardDualName}>{chapter.chapterTitle}</Text>
        </View>
      </View>

      <Text style={styles.standardLearnTitle}>WHAT ELITE PLAYERS LEARN HERE</Text>
      <Text style={styles.standardLearnBody}>{chapter.whatTheyLearn}</Text>

      <Text style={styles.standardLearnTitle}>THE PROFESSIONAL BEHAVIOUR TO STUDY</Text>
      <View style={styles.standardBullets}>
        {chapter.behaviourToStudy.map((b, i) => (
          <View key={i} style={styles.standardBulletRow}>
            <View style={styles.standardBulletDot} />
            <Text style={styles.standardBulletTxt}>{b}</Text>
          </View>
        ))}
      </View>

      <View style={styles.standardBenchmark}>
        <Text style={styles.standardBenchmarkTxt}>“{chapter.benchmark}”</Text>
        <Text style={styles.standardBenchmarkBy}>— THE STANDARD · {chapter.chapterTitle}</Text>
      </View>

      <Text style={styles.standardMotto}>
        YOUR JOURNEY IS THE EVIDENCE · THE STANDARD IS THE BENCHMARK · {clearedCount}/6 STAGES CLEARED
      </Text>
    </Animated.View>
  );
}

function ContinueButton({ label, onPress }: { label: string; onPress: () => void }) {
  const press = useSharedValue(0);
  const s = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.03 }],
    shadowOpacity: 0.45 + press.value * 0.35,
    shadowRadius: 14 + press.value * 8,
  }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (press.value = withTiming(1, { duration: 90 }))}
      onPressOut={() => (press.value = withSpring(0))}
    >
      <Animated.View style={[styles.cta, s]}>
        <Text style={styles.ctaTxt}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 12 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 },
  brand: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 3,
    color: colors.fg,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingBottom: 4,
    textShadowColor: 'rgba(57,255,106,0.5)',
    textShadowRadius: 6,
  },
  seasonPill: {
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.35)',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  seasonTxt: { fontFamily: monoFont, fontSize: 6.8, letterSpacing: 1.6, color: colors.muted },

  headline: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 3.4,
    color: colors.primary,
    textShadowColor: 'rgba(57,255,106,0.6)',
    textShadowRadius: 12,
  },
  subline: {
    marginTop: 7,
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 7,
    letterSpacing: 2.4,
    color: 'rgba(143,184,155,0.75)',
  },

  chineduCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(57,255,106,0.35)',
    backgroundColor: 'rgba(57,255,106,0.04)',
  },
  chineduTag: {
    fontFamily: monoFont,
    fontSize: 7.2,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: colors.primary,
  },
  chineduTitle: {
    marginTop: 5,
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: colors.fg,
  },
  chineduText: {
    marginTop: 8,
    fontSize: 10.5,
    lineHeight: 16.5,
    color: 'rgba(143,184,155,0.9)',
  },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingHorizontal: 8 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(57,255,106,0.22)' },
  dividerTxt: { fontFamily: monoFont, fontSize: 6.3, letterSpacing: 2, color: 'rgba(143,184,155,0.6)' },

  mapWrap: { marginTop: 2, alignItems: 'center' },
  mapCanvas: { width: MAP_W, height: MAP_H },

  heroWrap: { marginTop: 10, alignItems: 'center', paddingVertical: 14 },
  heroHint: { marginTop: 14, fontFamily: monoFont, fontSize: 5.8, letterSpacing: 2.2, color: 'rgba(143,184,155,0.55)' },

  playerCard: {
    position: 'absolute',
    width: 104,
    borderWidth: 1.2,
    borderColor: 'rgba(57,255,106,0.55)',
    borderRadius: 13,
    backgroundColor: 'rgba(10,17,12,0.92)',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  playerRating: { fontFamily: monoFont, fontSize: 13, fontWeight: '900', color: colors.primary, textAlign: 'center' },
  playerRatingSub: { fontSize: 4.8, letterSpacing: 1.6, color: 'rgba(143,184,155,0.7)' },
  playerName: { fontSize: 10, fontWeight: '800', letterSpacing: 1.6, color: colors.fg, marginTop: 2 },
  playerMeta: { fontFamily: monoFont, fontSize: 4.6, letterSpacing: 1.2, color: 'rgba(143,184,155,0.6)' },
  playerLabel: { position: 'absolute', width: 104, textAlign: 'center', fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.8, color: colors.primary },
  youToken: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.4,
    borderColor: colors.primary,
    backgroundColor: 'rgba(10,17,12,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    shadowColor: colors.primary,
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  youTokenTxt: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.4, color: colors.primary },

  pulseRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.4,
    borderColor: colors.primary,
  },
  node: {
    position: 'absolute',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.3,
  },
  nodeCurrent: {
    width: 48,
    height: 48,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.85,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  nodeDone: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(57,255,106,0.12)',
    borderColor: 'rgba(57,255,106,0.7)',
  },
  staleDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  nodeLocked: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(10,17,12,0.9)',
    borderColor: 'rgba(57,255,106,0.35)',
  },
  nodeNum: { fontFamily: monoFont, fontSize: 14, fontWeight: '900', color: colors.fg },

  // Side Quest Node Styles
  sqNodeDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.85,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  sqNodeUnlocked: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242,192,120,0.12)',
  },
  sqNodeLocked: {
    borderColor: 'rgba(242,192,120,0.25)',
    backgroundColor: 'rgba(10,17,12,0.95)',
  },
  sqNodeNum: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '900',
    color: colors.accent,
  },
  rivalsTrack: {
    marginTop: 14,
    borderWidth: 1.1,
    borderColor: 'rgba(57,255,106,0.22)',
    borderRadius: 12,
    backgroundColor: 'rgba(10,20,13,0.72)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  rivalsTrackTitle: {
    fontFamily: monoFont,
    fontSize: 6.4,
    fontWeight: '900',
    letterSpacing: 1.8,
    color: colors.muted,
    marginBottom: 16,
    textAlign: 'center',
  },
  rivalsLineRow: {
    height: 28,
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rivalsBgLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#172f21',
    borderRadius: 2,
  },
  rivalsActiveLine: {
    position: 'absolute',
    left: 0,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  rivalsStepNode: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.8,
    borderColor: '#1f3826',
    backgroundColor: '#0a0f0a',
    top: 6,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rivalsStepCompleted: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  rivalsStepActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242,192,120,0.3)',
    transform: [{ scale: 1.25 }],
  },
  rivalsStepGlyph: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.accent,
  },
  rivalsStepInnerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1f3826',
  },
  rivalsStepLabel: {
    position: 'absolute',
    top: 20,
    width: 80,
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 5.6,
    fontWeight: '700',
    letterSpacing: 1,
    marginLeft: -40,
    left: 8,
  },
  currentPill: {
    position: 'absolute',
    backgroundColor: 'rgba(8,13,9,0.95)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  currentPillTxt: { fontFamily: monoFont, fontSize: 5.4, fontWeight: '900', letterSpacing: 1.6, color: colors.primary },
  stageKey: {
    position: 'absolute',
    width: 110,
    fontFamily: monoFont,
    fontSize: 6.2,
    letterSpacing: 2,
    color: 'rgba(143,184,155,0.6)',
  },

  stageCard: {
    marginTop: 4,
    borderWidth: 1.2,
    borderColor: 'rgba(57,255,106,0.5)',
    borderRadius: 16,
    backgroundColor: 'rgba(12,20,14,0.94)',
    padding: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  stageCardLocked: { borderColor: 'rgba(31,56,38,0.9)', shadowOpacity: 0 },
  stageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stageSelPill: {
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: colors.muted,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.35)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
  },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(143,184,155,0.3)', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3.5 },
  statusDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  statusTxt: { fontFamily: monoFont, fontSize: 6.5, fontWeight: '800', letterSpacing: 1.6, color: colors.primary },
  statusLockedTxt: { fontFamily: monoFont, fontSize: 6.5, fontWeight: '800', letterSpacing: 1.6, color: 'rgba(143,184,155,0.7)' },
  stageName: { marginTop: 10, fontSize: 19, fontWeight: '900', letterSpacing: 0.6, color: colors.fg },
  stageTagline: { marginTop: 5, fontFamily: monoFont, fontSize: 6.6, letterSpacing: 1.6, color: 'rgba(143,184,155,0.7)' },
  stageDuration: { marginTop: 5, fontFamily: monoFont, fontSize: 6.8, fontWeight: '800', letterSpacing: 1.8, color: colors.accent },

  lockedNote: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(31,56,38,1)', borderRadius: 12, padding: 12, backgroundColor: 'rgba(15,26,19,0.5)' },
  lockedNoteTxt: { fontSize: 10, lineHeight: 15, color: '#9db4a3' },

  objectives: { marginTop: 12, gap: 9 },
  objRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  objBox: {
    width: 16,
    height: 16,
    borderRadius: 4.5,
    borderWidth: 1.3,
    borderColor: 'rgba(143,184,155,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  objBoxDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  objLabel: { flex: 1, fontFamily: monoFont, fontSize: 8.4, letterSpacing: 0.6, color: '#c4d4c8' },
  objLabelDone: { color: 'rgba(143,184,155,0.6)', textDecorationLine: 'line-through' },
  objStatus: { fontFamily: monoFont, fontSize: 7, fontWeight: '700', letterSpacing: 1, color: 'rgba(143,184,155,0.7)' },

  progRow: { marginTop: 13, flexDirection: 'row', justifyContent: 'space-between' },
  progLbl: { fontFamily: monoFont, fontSize: 6.2, letterSpacing: 2, color: 'rgba(143,184,155,0.6)' },
  progPct: { fontFamily: monoFont, fontSize: 7, fontWeight: '800', color: colors.primary },
  progTrack: { marginTop: 5, height: 4.5, borderRadius: 3, backgroundColor: 'rgba(31,56,38,0.8)', overflow: 'hidden' },
  progFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },

  reward: { marginTop: 11, fontFamily: monoFont, fontSize: 7.5, letterSpacing: 1.6, color: colors.fg },
  rewardHot: { color: colors.primary, fontWeight: '800' },
  rewardRow: {
    marginTop: 13, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.1, borderColor: 'rgba(57,255,106,0.4)', borderRadius: 12,
    backgroundColor: 'rgba(15,26,19,0.55)', paddingVertical: 10, paddingHorizontal: 12,
  },
  rewardMeta: { flex: 1 },
  rewardTitle: { fontFamily: monoFont, fontSize: 8.4, fontWeight: '900', letterSpacing: 1.4, color: colors.fg },
  rewardSub: { marginTop: 3, fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1, color: 'rgba(143,184,155,0.65)' },
  rewardXpBox: { alignItems: 'center', borderWidth: 1, borderColor: 'rgba(57,255,106,0.5)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: 'rgba(57,255,106,0.07)' },
  rewardXpNum: { fontFamily: monoFont, fontSize: 13, fontWeight: '900', color: colors.primary },
  rewardXpLbl: { fontFamily: monoFont, fontSize: 5.6, letterSpacing: 1.4, color: 'rgba(143,184,155,0.7)' },

  quoteCard: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(31,56,38,0.9)',
    borderRadius: 12,
    backgroundColor: 'rgba(15,26,19,0.6)',
    padding: 11,
  },
  quoteAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(57,255,106,0.4)', marginTop: 2 },
  quoteBody: { flex: 1 },
  quoteTxt: { fontSize: 10, lineHeight: 15, fontStyle: 'italic', color: '#c4d4c8' },
  quoteBy: { marginTop: 6, fontFamily: monoFont, fontSize: 6, fontWeight: '700', letterSpacing: 1.8, color: colors.primary },

  cta: {
    marginTop: 13,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  ctaTxt: { fontFamily: monoFont, fontSize: 10, fontWeight: '900', letterSpacing: 2.6, color: '#05130a' },

  fullMap: { marginTop: 11, textAlign: 'center', fontFamily: monoFont, fontSize: 6.5, letterSpacing: 2, color: 'rgba(143,184,155,0.6)' },
  footVersion: { marginTop: 10, textAlign: 'center', fontFamily: monoFont, fontSize: 6.3, letterSpacing: 2.6, color: 'rgba(143,184,155,0.4)' },

  // ── THE RECORD — vault + journal entry cards ──
  payWall: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.45)',
    backgroundColor: 'rgba(38,30,12,0.6)',
    borderRadius: 11,
    padding: 11,
  },
  payTag: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 1.5, color: '#f2c078' },
  payBody: { marginTop: 5, fontFamily: monoFont, fontSize: 6.6, lineHeight: 10.5, letterSpacing: 0.6, color: 'rgba(238,242,236,0.85)' },
  payNote: { marginTop: 6, fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.3, color: 'rgba(143,184,155,0.7)' },

  ledgerRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  ledgerCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.22)',
    backgroundColor: 'rgba(10,20,13,0.72)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  ledgerTag: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 1.9, color: 'rgba(143,184,155,0.85)' },
  ledgerBig: { marginTop: 6, fontFamily: monoFont, fontSize: 26, fontWeight: '900', color: colors.primary, letterSpacing: 1 },
  ledgerSub: { marginTop: 1, fontFamily: monoFont, fontSize: 6.4, letterSpacing: 1.4, color: 'rgba(143,184,155,0.72)' },
  ledgerCta: { marginTop: 9, fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 1.5, color: colors.primary },

  // ── THE STANDARD ──
  standardCard: {
    marginTop: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(242,192,120,0.55)',
    borderRadius: 16,
    backgroundColor: 'rgba(20,16,8,0.92)',
    padding: 14,
    shadowColor: colors.accent,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  standardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  standardTitleBlock: { flex: 1 },
  standardName: { fontFamily: monoFont, fontSize: 12, fontWeight: '900', letterSpacing: 2.6, color: colors.accent },
  standardSub: { marginTop: 3, fontFamily: monoFont, fontSize: 5.6, letterSpacing: 1.8, color: 'rgba(242,192,120,0.65)' },
  standardStagePill: {
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.5)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  standardStageTxt: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.6, color: colors.accent },

  standardDual: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.3)',
    borderRadius: 11,
    backgroundColor: 'rgba(10,8,4,0.5)',
    padding: 10,
  },
  standardDualCol: { flex: 1 },
  standardDualColRight: { alignItems: 'flex-end' },
  standardDualTag: { fontFamily: monoFont, fontSize: 5.6, fontWeight: '900', letterSpacing: 1.6, color: colors.primary },
  standardDualTagGold: { color: colors.accent },
  standardDualName: { marginTop: 5, fontFamily: monoFont, fontSize: 8.4, fontWeight: '900', letterSpacing: 1.2, color: colors.fg },
  standardDualArrow: { alignItems: 'center', justifyContent: 'center' },
  standardDualArrowTxt: { fontFamily: monoFont, fontSize: 9, color: 'rgba(242,192,120,0.5)' },

  standardLearnTitle: { marginTop: 12, fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.9, color: 'rgba(242,192,120,0.8)' },
  standardLearnBody: { marginTop: 6, fontSize: 10, lineHeight: 15, color: '#c4d4c8' },
  standardBullets: { marginTop: 8, gap: 6 },
  standardBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  standardBulletDot: { marginTop: 4.5, width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
  standardBulletTxt: { flex: 1, fontSize: 9.5, lineHeight: 14, color: '#9db4a3' },

  standardBenchmark: {
    marginTop: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: 10,
  },
  standardBenchmarkTxt: { fontSize: 10.5, lineHeight: 16, fontStyle: 'italic', color: colors.fg },
  standardBenchmarkBy: { marginTop: 5, fontFamily: monoFont, fontSize: 5.8, fontWeight: '800', letterSpacing: 1.6, color: 'rgba(242,192,120,0.7)' },

  standardMotto: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 5.6,
    letterSpacing: 1.4,
    lineHeight: 9,
    color: 'rgba(143,184,155,0.65)',
  },

  // ── YOUR CARD hero ──
  youCardWrap: { marginTop: 16, alignItems: 'center' },
  dualTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  dualTagGreen: {
    fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.6, color: colors.primary,
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.5)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(57,255,106,0.07)',
  },
  dualTagGold: {
    fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.6, color: colors.accent,
  },
  youCardHolder: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  youStatsCard: {
    width: '100%',
    marginTop: 16,
    borderWidth: 1.1,
    borderColor: 'rgba(57,255,106,0.4)',
    borderRadius: 14,
    backgroundColor: 'rgba(12,20,14,0.9)',
    padding: 14,
  },
  youStatsTitle: {
    fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.7, color: colors.muted,
  },
  youStatsGap: { marginTop: 12, gap: 9 },
  youStatsNote: {
    marginTop: 13,
    fontFamily: monoFont, fontSize: 5.4, lineHeight: 9, letterSpacing: 1.1, color: 'rgba(143,184,155,0.55)',
  },
});
