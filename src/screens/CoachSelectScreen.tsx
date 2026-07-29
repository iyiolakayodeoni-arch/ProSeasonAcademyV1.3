import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import LogoMark from '../components/LogoMark';
import { FlameIcon, LaughIcon } from '../components/Icons';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { COACHES, Coach } from '../data/coaches';
import { BANTER, BanterMsg, CoachId } from '../data/coachBanter';
import { sfx } from '../audio/sound';
import { colors, monoFont } from '../theme';

// From app.json — never hardcode the version.
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

type Props = {
  onBack: () => void;
  /** fired once the player locks a coach — the choice is PERMANENT */
  onLocked: (coachId: string) => void;
};

// ── per-coach tinting ─────────────────────────────────────────
const GREEN = { solid: colors.primary, soft: 'rgba(57,255,106,0.45)', glow: 'rgba(57,255,106,0.30)' };
const GOLD = { solid: colors.warm, soft: 'rgba(255,207,122,0.45)', glow: 'rgba(242,192,120,0.28)' };
const tintOf = (id: string) => (id === 'obinna' ? GOLD : GREEN);

// ── tiny looping dots (presence + typing) ─────────────────────
function BlinkDot({ color, delay = 0 }: { color: string; delay?: number }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withDelay(delay, withRepeat(withTiming(0.25, { duration: 800 }), -1, true));
  }, [o, delay]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.blinkDot, { backgroundColor: color }, s]} />;
}

function TypingDots({ color }: { color: string }) {
  return (
    <View style={styles.typingDots}>
      {[0, 1, 2].map((i) => (
        <TypingDot key={i} color={color} delay={i * 180} />
      ))}
    </View>
  );
}

function TypingDot({ color, delay }: { color: string; delay: number }) {
  const o = useSharedValue(0.25);
  useEffect(() => {
    o.value = withDelay(delay, withRepeat(withTiming(1, { duration: 550 }), -1, true));
  }, [o, delay]);
  const s = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: (o.value - 0.6) * -3 }] }));
  return <Animated.View style={[styles.typingDot, { backgroundColor: color }, s]} />;
}

// ── the screen ────────────────────────────────────────────────
export default function CoachSelectScreen({ onBack, onLocked }: Props) {
  const [shown, setShown] = useState(0);           // how many runs are revealed
  const [typing, setTyping] = useState<CoachId | null>(null);
  const [done, setDone] = useState(false);         // script finished → decision armed
  const [scoutOpen, setScoutOpen] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const byId = useMemo(() => Object.fromEntries(COACHES.map((c) => [c.id, c])) as Record<string, Coach>, []);

  // header crest trail
  const { loopProps, glowStyle } = useTrailLoop({ pathLength: 260, drawMs: 1800, eraseMs: 1800 });

  // ── playback engine: coach types → bubble lands → beat → next ──
  useEffect(() => {
    if (done) return;
    if (shown >= BANTER.length) {
      // Chinedu gets the last word pending… then the decision unlocks.
      setTyping('chinedu');
      const t = setTimeout(() => {
        setTyping(null);
        setDone(true);
      }, 1500);
      return () => clearTimeout(t);
    }
    const run = BANTER[shown];
    const chars = run.msgs.reduce((n, m) => n + m.segs.reduce((k, s) => k + s.t.length, 0), 0);
    const typeMs = Math.min(450 + chars * 14, 1500);
    setTyping(run.coach);
    const t1 = setTimeout(() => setTyping(null), typeMs);
    // the bubble lands with the same pop it has in the briefing room
    const t2 = setTimeout(() => {
      setShown((s) => s + 1);
      sfx('pop');
    }, typeMs + 620);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [shown, done]);

  // keep the newest message in view
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 70);
    return () => clearTimeout(t);
  }, [shown, typing]);

  /** impatient tap on a decision pill → play the whole script instantly */
  const flush = useCallback(() => {
    setTyping(null);
    setShown(BANTER.length);
    setDone(true);
  }, []);

  const pickCoach = useCallback(
    (id: string) => {
      if (!done) {
        flush();
        return;
      }
      sfx('tap');
      setScoutOpen(null);
      setConfirming(id);
    },
    [done, flush],
  );

  const lockIn = useCallback(
    (id: string) => {
      sfx('whistle');
      setConfirming(null);
      setLocked(id);
      // brief "PATH LOCKED" beat, then hand off to the app shell
      setTimeout(() => onLocked(id), 1150);
    },
    [onLocked],
  );

  return (
    <View style={styles.flex}>
      <GridBackground />

      {/* brand crest — top center, matches every other screen */}
      <View style={styles.crestWrap}>
        <LogoMark size={38} loopProps={loopProps} glowStyle={glowStyle} />
      </View>

      {/* chat header */}
      <View style={styles.hdr}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.chevBtn} disabled={locked !== null}>
          <Text style={styles.chev}>‹</Text>
        </Pressable>
        <View style={styles.stackAv}>
          {COACHES.map((c, i) => (
            <Image
              key={c.id}
              source={c.portrait}
              style={[styles.stackAvImg, { left: i * 20, borderColor: tintOf(c.id).soft }]}
            />
          ))}
        </View>
        <View style={styles.hdrTitle}>
          <Text style={styles.hdrT1}>COACH SELECTION</Text>
          <View style={styles.hdrT2}>
            {COACHES.map((c) => (
              <View key={c.id} style={styles.presence}>
                <BlinkDot color={tintOf(c.id).solid} delay={c.id === 'obinna' ? 400 : 0} />
                <Text style={styles.presenceTxt}>{c.name.split(' ')[0]}</Text>
              </View>
            ))}
            <Text style={styles.presenceDim}>· BOTH ONLINE</Text>
          </View>
        </View>
        <Text style={styles.hdrLive}>LIVE</Text>
      </View>

      {/* the one-way thread */}
      <ScrollView
        ref={scrollRef}
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sysline}>
          YOU WERE ADDED BY <Text style={styles.syslineHot}>PROSEASONACADEMY</Text> · TODAY
        </Text>

        {BANTER.slice(0, shown).map((run, ri) => (
          <ChatRun key={ri} coach={byId[run.coach]} msgs={run.msgs} />
        ))}

        {typing && byId[typing] && (
          <Animated.View
            entering={FadeIn.duration(180)}
            style={[styles.run, typing === 'obinna' && styles.runFlip]}
          >
            <Image source={byId[typing].portrait} style={[styles.avatar, { borderColor: tintOf(typing).soft }]} />
            <View style={[styles.bub, styles.typingBub, { borderColor: tintOf(typing).soft }]}>
              <TypingDots color={tintOf(typing).solid} />
            </View>
          </Animated.View>
        )}

        {done && (
          <Animated.Text entering={FadeInUp.duration(320)} style={styles.syslineEnd}>
            BOTH SIDES HAVE SPOKEN — <Text style={styles.syslineHot}>THE PATH YOU PICK LOCKS PERMANENTLY</Text>
          </Animated.Text>
        )}
      </ScrollView>

      {/* scout files */}
      <View style={styles.scout}>
        <View style={styles.scoutLblRow}>
          <Text style={styles.scoutLbl}>SCOUT FILES — TAP TO VIEW</Text>
          <View style={styles.scoutLine} />
        </View>
        {COACHES.map((c) => {
          const t = tintOf(c.id);
          return (
            <Pressable key={c.id} onPress={() => setScoutOpen(c.id)}>
              <View style={[styles.strip, { borderColor: t.soft, shadowColor: t.solid }]}>
                <Image source={c.portrait} style={[styles.stripImg, { borderColor: t.soft }]} />
                <View style={styles.stripMeta}>
                  <Text style={styles.stripName}>{c.name}</Text>
                  <Text style={[styles.stripRole, { color: t.solid }]}>{c.title}</Text>
                </View>
                <Text style={[styles.stripVp, { color: t.solid, borderColor: t.soft }]}>VIEW PROFILE ›</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* decision bar */}
      <View style={styles.chatbar}>
        {COACHES.map((c) => (
          <DecisionPill key={c.id} coach={c} armed={done} onPress={() => pickCoach(c.id)} />
        ))}
      </View>

      <Text style={styles.micro}>
        {done
          ? 'NO SWITCHING PATHS ONCE YOU START — CHOOSE THE VOICE YOU WANT ALL SEASON.'
          : 'HEAR THEM OUT — OR TAP A COACH TO SKIP STRAIGHT TO THE CALL.'}
      </Text>

      {/* footer */}
      <View style={styles.footerRow}>
        <Text style={styles.footer}>PROSEASONACADEMY</Text>
        <Text style={styles.footer}>VERSION {APP_VERSION}</Text>
      </View>

      {/* scout-file overlay */}
      {scoutOpen && byId[scoutOpen] && (
        <ScoutFile
          coach={byId[scoutOpen]}
          onClose={() => setScoutOpen(null)}
          onPick={() => pickCoach(scoutOpen)}
        />
      )}

      {/* permanence confirmation */}
      {confirming && byId[confirming] && (
        <ConfirmSheet
          coach={byId[confirming]}
          onCancel={() => setConfirming(null)}
          onLock={() => lockIn(confirming)}
        />
      )}

      {/* locked beat */}
      {locked && byId[locked] && <LockedOverlay coach={byId[locked]} />}
    </View>
  );
}

// ── a run of bubbles from one coach ───────────────────────────
function ChatRun({ coach, msgs }: { coach: Coach; msgs: BanterMsg[] }) {
  const t = tintOf(coach.id);
  const flip = coach.id === 'obinna';
  return (
    <Animated.View entering={FadeInUp.duration(300)} style={[styles.run, flip && styles.runFlip]}>
      <Image source={coach.portrait} style={[styles.avatar, { borderColor: t.soft }]} />
      <View style={[styles.msgs, flip && styles.msgsFlip]}>
        <Text style={[styles.sender, { color: t.solid }, flip && styles.senderFlip]}>{coach.name}</Text>
        {msgs.map((m, i) => (
          <View
            key={i}
            style={[
              styles.bub,
              { borderColor: t.soft, shadowColor: t.solid },
              flip ? styles.bubFlip : styles.bubNorm,
              !(i === msgs.length - 1) && styles.bubTrail,
            ]}
          >
            <Text style={styles.bubTxt}>
              {m.segs.map((s, si) => (
                <Text key={si} style={s.hot ? { color: t.solid, fontWeight: '700' } : undefined}>
                  {s.t}
                </Text>
              ))}
            </Text>
            {m.react && (
              <View style={[styles.reactChip, { borderColor: m.react === 'flame' ? GOLD.soft : GREEN.soft }]}>
                {m.react === 'flame' ? <FlameIcon color={colors.warm} /> : <LaughIcon color={colors.primary} />}
              </View>
            )}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ── decision pill ─────────────────────────────────────────────
function DecisionPill({ coach, armed, onPress }: { coach: Coach; armed: boolean; onPress: () => void }) {
  const t = tintOf(coach.id);
  const press = useSharedValue(0);
  const s = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.04 }],
    opacity: armed ? 1 : 0.45,
  }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (press.value = withTiming(1, { duration: 90 }))}
      onPressOut={() => (press.value = withSpring(0))}
      style={styles.pillWrap}
    >
      <Animated.View style={[styles.pill, { borderColor: t.solid, shadowColor: t.solid }, s]}>
        <Text style={[styles.pillTxt, { color: t.solid }]}>I'M WITH {coach.name.split(' ')[0]}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ── scout file (profile overlay) ──────────────────────────────
function ScoutFile({ coach, onClose, onPick }: { coach: Coach; onClose: () => void; onPick: () => void }) {
  const t = tintOf(coach.id);
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <Pressable style={styles.overlayBg} onPress={onClose} />
      <Animated.View entering={FadeInDown.duration(280)} style={[styles.sheet, { borderColor: t.soft }]}>
        <View style={styles.sheetTop}>
          <Image source={coach.portrait} style={[styles.sheetImg, { borderColor: t.soft }]} />
          <View style={styles.sheetMeta}>
            <Text style={styles.sheetName}>{coach.name}</Text>
            <Text style={[styles.sheetRole, { color: t.solid }]}>{coach.title}</Text>
          </View>
          <View style={[styles.ratingBadge, { borderColor: t.soft }]}>
            <Text style={[styles.ratingNum, { color: t.solid }]}>{coach.rating}</Text>
            <Text style={styles.ratingLbl}>COACH</Text>
          </View>
        </View>
        <View style={styles.sheetFacts}>
          <Text style={styles.sheetFact}>
            {coach.journeyTag} · {coach.metaLine}
          </Text>
        </View>
        <Text style={styles.sheetPhil}>"{coach.oneLiner}"</Text>
        <View style={styles.sheetBtns}>
          <Pressable onPress={onClose} style={styles.ghostBtn}>
            <Text style={styles.ghostBtnTxt}>BACK TO CHAT</Text>
          </Pressable>
          <Pressable onPress={onPick} style={[styles.hotBtn, { borderColor: t.solid, shadowColor: t.solid }]}>
            <Text style={[styles.hotBtnTxt, { color: t.solid }]}>I'M WITH {coach.name.split(' ')[0]} ›</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

// ── PERMANENT lock-in confirmation ────────────────────────────
function ConfirmSheet({ coach, onCancel, onLock }: { coach: Coach; onCancel: () => void; onLock: () => void }) {
  const t = tintOf(coach.id);
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <Pressable style={styles.overlayBg} onPress={onCancel} />
      <Animated.View entering={FadeInUp.duration(280)} style={[styles.sheet, { borderColor: t.soft }]}>
        <Text style={[styles.lockKicker, { color: t.solid }]}>PATH LOCK — PERMANENT</Text>
        <Text style={styles.lockTitle}>LOCK IN {coach.name.split(' ')[0]}?</Text>
        <Text style={styles.lockBody}>
          Once your season starts there is{' '}
          <Text style={styles.lockBodyHot}>no switching coaches</Text> — no resets, no halfway swaps. We
          don't play games with your development. Make sure this is the voice you want in your corner for
          the whole journey.
        </Text>
        <View style={styles.sheetBtns}>
          <Pressable onPress={onCancel} style={styles.ghostBtn}>
            <Text style={styles.ghostBtnTxt}>NOT YET</Text>
          </Pressable>
          <Pressable onPress={onLock} style={[styles.hotBtn, { borderColor: t.solid, shadowColor: t.solid }]}>
            <Text style={[styles.hotBtnTxt, { color: t.solid }]}>LOCK IT IN ›</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

// ── locked beat ───────────────────────────────────────────────
function LockedOverlay({ coach }: { coach: Coach }) {
  const t = tintOf(coach.id);
  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.lockedFull}>
      <Text style={[styles.lockedKicker, { color: t.solid }]}>PATH LOCKED</Text>
      <Text style={styles.lockedName}>{coach.name}</Text>
      <Text style={styles.lockedSub}>YOUR SEASON STARTS NOW.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 46, paddingBottom: 10 },

  crestWrap: { alignItems: 'center', height: 42 },

  // header
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(15,26,19,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.16)',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chevBtn: { paddingRight: 2 },
  chev: { fontFamily: monoFont, fontSize: 18, color: 'rgba(143,184,155,0.65)', marginTop: -2 },
  stackAv: { width: 52, height: 34 },
  stackAvImg: {
    position: 'absolute',
    top: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
  },
  hdrTitle: { flex: 1, minWidth: 0 },
  hdrT1: { fontFamily: monoFont, fontSize: 11.5, fontWeight: '800', letterSpacing: 2, color: colors.fg },
  hdrT2: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 8 },
  presence: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  presenceTxt: { fontFamily: monoFont, fontSize: 7, letterSpacing: 1.2, color: 'rgba(143,184,155,0.85)' },
  presenceDim: { fontFamily: monoFont, fontSize: 7, letterSpacing: 1.2, color: 'rgba(143,184,155,0.55)' },
  blinkDot: { width: 4, height: 4, borderRadius: 2 },
  hdrLive: { fontFamily: monoFont, fontSize: 7, letterSpacing: 1.5, color: 'rgba(143,184,155,0.45)' },

  // thread
  thread: { flex: 1, minHeight: 0, marginTop: 6 },
  threadContent: { paddingBottom: 6 },
  sysline: {
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 6.3,
    letterSpacing: 1.8,
    color: 'rgba(143,184,155,0.5)',
    marginBottom: 8,
  },
  syslineEnd: {
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 6.8,
    letterSpacing: 1.8,
    color: 'rgba(143,184,155,0.65)',
    marginTop: 10,
  },
  syslineHot: { color: 'rgba(57,255,106,0.7)' },
  run: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 8 },
  runFlip: { flexDirection: 'row-reverse' },
  avatar: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.2 },
  msgs: { maxWidth: 258, gap: 3 },
  msgsFlip: { alignItems: 'flex-end' },
  sender: { fontFamily: monoFont, fontSize: 7, fontWeight: '700', letterSpacing: 2, marginLeft: 4 },
  senderFlip: { marginLeft: 0, marginRight: 4 },
  bub: {
    position: 'relative',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(15,26,19,0.94)',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 9,
  },
  bubNorm: { borderRadius: 13, borderBottomLeftRadius: 4 },
  bubFlip: { borderRadius: 13, borderBottomRightRadius: 4 },
  bubTrail: { borderRadius: 13 },
  bubTxt: { fontFamily: monoFont, fontSize: 9.5, lineHeight: 13.5, letterSpacing: 0.2, color: '#d8e6dc' },
  reactChip: {
    position: 'absolute',
    right: -9,
    bottom: -11,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#0b150e',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingBub: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 13 },
  typingDots: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  typingDot: { width: 4, height: 4, borderRadius: 2 },

  // scout strips
  scout: { marginTop: 6 },
  scoutLblRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  scoutLbl: { fontFamily: monoFont, fontSize: 8.6, letterSpacing: 2.5, color: 'rgba(143,184,155,0.7)' },
  scoutLine: { flex: 1, height: 1, backgroundColor: 'rgba(57,255,106,0.25)' },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 40,
    backgroundColor: 'rgba(15,26,19,0.78)',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    marginBottom: 5,
  },
  stripImg: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.2 },
  stripMeta: { flex: 1, minWidth: 0 },
  stripName: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: colors.fg },
  stripRole: { marginTop: 3, fontFamily: monoFont, fontSize: 7, letterSpacing: 1.8 },
  stripVp: {
    fontFamily: monoFont,
    fontSize: 6.8,
    fontWeight: '700',
    letterSpacing: 1.6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // decision bar
  chatbar: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(15,26,19,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.22)',
    borderRadius: 26,
    padding: 6,
  },
  pillWrap: { flex: 1 },
  pill: {
    height: 34,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050d07',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  pillTxt: { fontFamily: monoFont, fontSize: 9.5, fontWeight: '800', letterSpacing: 1.2 },

  micro: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 6.3,
    letterSpacing: 1.4,
    color: 'rgba(143,184,155,0.5)',
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 2 },
  footer: { fontFamily: monoFont, fontSize: 8, letterSpacing: 2.5, color: 'rgba(143,184,155,0.42)' },

  // overlays
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(4,8,5,0.78)' },
  sheet: {
    width: '88%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  sheetTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetImg: { width: 54, height: 54, borderRadius: 27, borderWidth: 1.4 },
  sheetMeta: { flex: 1 },
  sheetName: { fontSize: 15, fontWeight: '800', letterSpacing: 0.8, color: colors.fg },
  sheetRole: { marginTop: 4, fontFamily: monoFont, fontSize: 7.5, letterSpacing: 2 },
  ratingBadge: { alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  ratingNum: { fontFamily: monoFont, fontSize: 16, fontWeight: '900' },
  ratingLbl: { fontFamily: monoFont, fontSize: 5.5, letterSpacing: 1.6, color: 'rgba(143,184,155,0.6)', marginTop: 2 },
  sheetFacts: { marginTop: 12 },
  sheetFact: { fontFamily: monoFont, fontSize: 8, letterSpacing: 1.8, color: colors.muted },
  sheetPhil: {
    marginTop: 10,
    fontFamily: monoFont,
    fontSize: 10,
    lineHeight: 15,
    color: '#d8e6dc',
    letterSpacing: 0.3,
  },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  ghostBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghostBtnTxt: { fontFamily: monoFont, fontSize: 8.5, fontWeight: '700', letterSpacing: 1.6, color: colors.muted },
  hotBtn: {
    flex: 1.3,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
    backgroundColor: 'rgba(5,13,7,0.7)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  hotBtnTxt: { fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.4 },

  lockKicker: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '800', letterSpacing: 2.6 },
  lockTitle: { marginTop: 8, fontSize: 18, fontWeight: '900', letterSpacing: 1.2, color: colors.fg },
  lockBody: { marginTop: 10, fontFamily: monoFont, fontSize: 9.5, lineHeight: 15, color: '#c4d4c8', letterSpacing: 0.3 },
  lockBodyHot: { color: colors.fg, fontWeight: '800' },

  lockedFull: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(6,11,7,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedKicker: { fontFamily: monoFont, fontSize: 9, fontWeight: '800', letterSpacing: 4 },
  lockedName: { marginTop: 12, fontSize: 26, fontWeight: '900', letterSpacing: 2, color: colors.fg },
  lockedSub: { marginTop: 10, fontFamily: monoFont, fontSize: 8, letterSpacing: 2.4, color: colors.muted },
});
