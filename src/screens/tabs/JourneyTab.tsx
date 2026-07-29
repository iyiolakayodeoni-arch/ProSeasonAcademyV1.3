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
import * as backend from '../../data/backend';
import MatchVault from '../MatchVault';
import LossJournal from '../LossJournal';
import StoreSheet from '../StoreSheet';
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
  const [sheet, setSheet] = useState<'vault' | 'journal' | 'till' | null>(null);

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
  const cleared = progress.completed[selected.n];
  const isLocked = selected.n > CUR;

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
        <Text style={styles.subline}>WALKING {coach.name}'S PATH</Text>
        <View style={styles.dividerRow}>
          <View style={styles.divLine} />
          <Text style={styles.dividerTxt}>FINISH — WHERE THIS PATH ENDS</Text>
          <View style={styles.divLine} />
        </View>

        {/* ── the Role Model hero card — taps zoom into the current stage ── */}
        <View style={styles.heroWrap} ref={heroRef} collapsable={false}>
          <RoleModelCard coach={coach} onPress={zoomFromCard} />
          <Text style={styles.heroHint}>TAP THE CARD — WALK THE NEXT STAGE WITH {coachFirst}</Text>
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
              <Circle cx={current.at.x} cy={current.at.y} r={4} fill={colors.primary} />
            </Svg>

            {/* player card */}
            <View style={[styles.playerCard, { left: SEASON.playerCard.at.x - 52, top: SEASON.playerCard.at.y - 42 }]}>
              <Text style={styles.playerRating}>
                {SEASON.playerCard.rating + progress.completedCount}
                <Text style={styles.playerRatingSub}>{'\n'}ACADEMY</Text>
              </Text>
              <PersonIcon size={22} color="rgba(238,242,236,0.85)" />
              <Text style={styles.playerName}>PLAYER</Text>
              <Text style={styles.playerMeta}>PROSEASON ACADEMY</Text>
            </View>
            <Text style={[styles.playerLabel, { left: SEASON.playerCard.at.x - 52, top: SEASON.playerCard.at.y + 48 }]}>
              YOU — STAGE {progress.completedCount}
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
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* ── stage detail card ── */}
        <Animated.View key={selected.n} entering={FadeInUp.duration(300)} style={[styles.stageCard, isLocked && styles.stageCardLocked]}>
          <View style={styles.stageTop}>
            <Text style={styles.stageSelPill}>STAGE {selected.n} · SELECTED</Text>
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

          {isLocked ? (
            <View style={styles.lockedNote}>
              <Text style={styles.lockedNoteTxt}>
                Finish Stage {selected.n - 1} first. The path only moves forward — no skipping, no shortcuts.
              </Text>
            </View>
          ) : (
            <>
              {/* objectives — GRADED LIVE against the vault + the journal */}
              <View style={styles.objectives}>
                {(selected.objectives ?? []).map((o, i) => {
                  const count = o.check
                    ? objectiveCount(o.check, vault.matches, journal.entries.length)
                    : o.done;
                  const shown = Math.min(count, o.target);
                  const done = count >= o.target;
                  return (
                    <View key={i} style={styles.objRow}>
                      <View style={[styles.objBox, done && styles.objBoxDone]}>
                        {done && <CheckIcon size={9} color="#05130a" />}
                      </View>
                      <Text style={[styles.objLabel, done && styles.objLabelDone]} numberOfLines={1}>
                        {o.label}
                      </Text>
                      <Text style={[styles.objStatus, done && { color: colors.primary }]}>
                        {done ? 'DONE' : `${shown}/${o.target}`}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* progress */}
              <View style={styles.progRow}>
                <Text style={styles.progLbl}>STAGE PROGRESS</Text>
                <Text style={styles.progPct}>{selected.progressPct ?? 0}%</Text>
              </View>
              <View style={styles.progTrack}>
                <View style={[styles.progFill, { width: `${selected.progressPct ?? 0}%` }]} />
              </View>

              {/* reward */}
              <Text style={styles.reward}>
                <Text style={styles.rewardHot}>REWARD ›</Text> +{selected.rewardXp} XP · {selected.rewardBadge}
              </Text>

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
              {needsUnlock(selected.n) ? (
                <View style={styles.payWall}>
                  <Text style={styles.payTag}>
                    STAGES 1–{freeStages} ARE FREE · THIS ONE NEEDS {tierName(tierFor(selected.n))}
                  </Text>
                  <Text style={styles.payBody}>
                    {tierFor(selected.n) >= 2
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
                  label={cleared ? 'REPLAY THE FILM ROOM ›' : 'CONTINUE STAGE ›'}
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
    </View>
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
});
