import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, monoFont, displayFont, bodyFont, bodyFontBold, bodyFontStrong } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// MATCH REVIEW MOCKUP — an animated esports-broadcast mockup of the in-app
// Mirror Session, used as the hero visual on the marketing site. It reads
// like a live esports overlay, not a programming terminal: a scoreboard,
// a live clock, a composure gauge, a replay timeline, and the session flow
// cycling as lower-thirds (intention → half-time → full-time → lesson →
// the thread). It plays on a loop and is pure UI — the product showing
// itself off as a real broadcast.
// ─────────────────────────────────────────────────────────────────────────

const STEPS = [
  { t: 46, clock: "14'", tag: 'INTENTION', title: 'ONE THING', sub: 'Keep your shape under a high press.', gauge: 68 },
  { t: 58, clock: "45'", tag: 'HALF-TIME', title: 'NAME IT', sub: 'Lost the ball twice chasing the pass.', gauge: 51 },
  { t: 70, clock: "90'", tag: 'FULL-TIME', title: 'THE TRUTH', sub: 'The second goal came from my position.', gauge: 42 },
  { t: 82, clock: "REVIEW", tag: 'THE MOMENTS', title: 'MARK YOURS', sub: '0:12 slide · 0:47 shape · 1:22 the switch.', gauge: 55 },
  { t: 94, clock: 'THREAD', tag: 'ONE LESSON', title: 'CARRY IT', sub: 'Stay narrow, then play the switch.', gauge: 74 },
  { t: 106, clock: 'NEXT', tag: 'THE THREAD', title: 'HELD ✓', sub: 'Lesson held across the next match.', gauge: 88 },
];

const STEP_MS = 2400;

export default function MatchReviewMockup({ width = 360 }: { width?: number }) {
  const [idx, setIdx] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % STEPS.length), STEP_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: STEP_MS * STEPS.length, easing: Easing.linear }), -1);
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  const gaugeStyle = useAnimatedStyle(() => ({
    width: `${STEPS[idx].gauge}%`,
  }));

  const current = STEPS[idx];

  return (
    <View style={[styles.frame, { width }]}>
      <LinearGradient style={StyleSheet.absoluteFill} colors={['rgba(6,16,9,0.96)', 'rgba(3,8,5,0.98)']} />

      {/* ── esports scoreboard ── */}
      <View style={styles.board}>
        <View style={styles.boardRow}>
          <View style={styles.boardTeam}>
            <Text style={styles.boardTag}>THE MIRROR</Text>
            <Text style={styles.boardName}>YOU</Text>
          </View>
          <View style={styles.boardCenter}>
            <View style={styles.live}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTxt}>LIVE REVIEW</Text>
            </View>
            <Text style={styles.boardScore}>2 – 1</Text>
            <Text style={styles.boardClock}>{current.clock}</Text>
          </View>
          <View style={styles.boardTeamRight}>
            <Text style={styles.boardTag}>THE STANDARD</Text>
            <Text style={styles.boardName}>ELITE</Text>
          </View>
        </View>
      </View>

      {/* ── composure gauge ── */}
      <View style={styles.gaugeWrap}>
        <View style={styles.gaugeLabelRow}>
          <Text style={styles.gaugeLabel}>COMPOSURE</Text>
          <Text style={styles.gaugePct}>{current.gauge}%</Text>
        </View>
        <View style={styles.gaugeTrack}>
          <Animated.View style={[styles.gaugeFill, gaugeStyle]} />
        </View>
      </View>

      {/* ── replay timeline ── */}
      <View style={styles.timeline}>
        {[0.12, 0.47, 1.22].map((m, i) => (
          <View key={i} style={[styles.marker, { left: `${12 + i * 26}%` }]} />
        ))}
        <View style={styles.timelineBar} />
        <Text style={styles.timelineTxt}>KEY MOMENTS — MARKED BY YOU</Text>
      </View>

      {/* ── the live lower-third step ── */}
      <View style={styles.stepCard} key={current.tag}>
        <View style={styles.stepLeft}>
          <Text style={styles.stepTag}>{current.tag}</Text>
          <Text style={styles.stepTitle}>{current.title}</Text>
          <Text style={styles.stepSub}>{current.sub}</Text>
          <Animated.View style={[styles.bar, barStyle]} />
        </View>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeNum}>{String(idx + 1).padStart(2, '0')}</Text>
          <Text style={styles.stepBadgeTxt}>/{STEPS.length}</Text>
        </View>
      </View>

      {/* ── footer receipt strip ── */}
      <View style={styles.footerRow}>
        <Text style={styles.footLeft}>MATCH REVIEW · RECEIPT #PSA-0041</Text>
        <Text style={styles.footRight}>ONE LESSON · CARRIED</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 360,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: '#040d06',
    shadowColor: '#000',
    shadowOpacity: 0.65,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 14,
    padding: 16,
    justifyContent: 'space-between',
  } as any,
  board: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: 'rgba(10,22,14,0.7)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  boardTeam: {
    alignItems: 'flex-start',
  },
  boardTeamRight: {
    alignItems: 'flex-end',
  },
  boardTag: {
    fontFamily: monoFont,
    fontSize: 7.5,
    letterSpacing: 1.5,
    color: colors.primaryDim,
  },
  boardName: {
    fontFamily: bodyFontBold,
    fontSize: 15,
    letterSpacing: 1,
    color: colors.fg,
    marginTop: 2,
  },
  boardCenter: {
    alignItems: 'center',
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  liveTxt: {
    fontFamily: monoFont,
    fontSize: 7.5,
    letterSpacing: 1.5,
    color: colors.primary,
  },
  boardScore: {
    fontFamily: displayFont,
    fontSize: 34,
    lineHeight: 36,
    color: colors.fg,
  },
  boardClock: {
    fontFamily: monoFont,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.muted,
    marginTop: 2,
  },
  gaugeWrap: {
    marginTop: 12,
  },
  gaugeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gaugeLabel: {
    fontFamily: monoFont,
    fontSize: 8,
    letterSpacing: 2,
    color: colors.muted,
  },
  gaugePct: {
    fontFamily: monoFont,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.primary,
  },
  gaugeTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(57,255,106,0.12)',
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  timeline: {
    marginTop: 14,
    height: 28,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  timelineBar: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(57,255,106,0.18)',
  },
  marker: {
    position: 'absolute',
    bottom: 8,
    width: 11,
    height: 11,
    borderRadius: 3,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#040d06',
  },
  timelineTxt: {
    fontFamily: monoFont,
    fontSize: 7,
    letterSpacing: 1.5,
    color: colors.mutedDim,
    textAlign: 'center',
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    backgroundColor: 'rgba(12,26,16,0.78)',
  },
  stepLeft: {
    flex: 1,
  },
  stepTag: {
    fontFamily: monoFont,
    fontSize: 8,
    letterSpacing: 2.5,
    color: colors.primary,
    marginBottom: 6,
  },
  stepTitle: {
    fontFamily: bodyFontStrong,
    fontSize: 17,
    letterSpacing: 0.5,
    color: colors.fg,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  stepSub: {
    fontFamily: bodyFont,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    marginBottom: 12,
  },
  bar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
    transformOrigin: 'left',
  },
  stepBadge: {
    alignItems: 'center',
    marginLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: 12,
  },
  stepBadgeNum: {
    fontFamily: displayFont,
    fontSize: 26,
    color: colors.primary,
  },
  stepBadgeTxt: {
    fontFamily: monoFont,
    fontSize: 8,
    color: colors.mutedDim,
    marginTop: -2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 10,
    marginTop: 14,
  },
  footLeft: {
    fontFamily: monoFont,
    fontSize: 7.5,
    letterSpacing: 1.2,
    color: colors.mutedDim,
  },
  footRight: {
    fontFamily: monoFont,
    fontSize: 7.5,
    letterSpacing: 1.2,
    color: colors.primary,
  },
});
