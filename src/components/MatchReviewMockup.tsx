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
import { colors, monoFont, bodyFont, bodyFontBold } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// MATCH REVIEW MOCKUP — an animated, self-contained mockup of the in-app
// Match Review, used as the hero visual on the marketing site. It plays the
// review flow in a loop: a match card, intention, half-time / full-time,
// the lesson, then "HELD". It is pure UI — no real data — just the product
// showing itself off.
// ─────────────────────────────────────────────────────────────────────────

const STEPS = [
  { tag: 'MATCH 1 — RANKED', title: 'PLAY THE MATCH', sub: 'W 2–1 · you vs the mirror' },
  { tag: 'INTENTION', title: 'ONE THING', sub: 'Keep your shape under a high press.' },
  { tag: 'HALF-TIME', title: 'NAME IT', sub: 'Lost the ball twice chasing the pass.' },
  { tag: 'FULL-TIME', title: 'THE TRUTH', sub: 'The second goal came from my position.' },
  { tag: 'LESSON', title: 'CARRY ONE', sub: 'Stay narrow, then play the switch.' },
  { tag: 'NEXT MATCH', title: 'THE THREAD', sub: 'Lesson held → HELD' },
];

const STEP_MS = 2200;

export default function MatchReviewMockup({ width = 340 }: { width?: number }) {
  const [idx, setIdx] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % STEPS.length), STEP_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: STEP_MS * STEPS.length, easing: Easing.linear }), -1);
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  const current = STEPS[idx];

  return (
    <View style={[styles.frame, { width }]}>
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={['rgba(8,18,11,0.92)', 'rgba(4,10,6,0.96)']}
      />

      {/* window bar */}
      <View style={styles.titlebar}>
        <View style={styles.dots}>
          <View style={[styles.dot, { backgroundColor: '#ff5f57' }]} />
          <View style={[styles.dot, { backgroundColor: '#febc2e' }]} />
          <View style={[styles.dot, { backgroundColor: '#28c840' }]} />
        </View>
        <Text style={styles.titlebarTxt}>PROSEASON ACADEMY — MATCH REVIEW</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreTag}>THE MIRROR</Text>
          <Text style={styles.scoreTag}>THE EVIDENCE MOVES YOU</Text>
        </View>

        <View style={styles.stepCard} key={current.tag}>
          <Text style={styles.stepTag}>{current.tag}</Text>
          <Text style={styles.stepTitle}>{current.title}</Text>
          <Text style={styles.stepSub}>{current.sub}</Text>
          <Animated.View style={[styles.bar, barStyle]} />
        </View>

        <View style={styles.tickerRow}>
          {STEPS.map((s, i) => (
            <View key={i} style={[styles.tick, i === idx && styles.tickActive]} />
          ))}
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footLeft}>RECEIPT #PSA-0041</Text>
          <Text style={styles.footRight}>ONE LESSON · CARRIED</Text>
        </View>
      </View>

      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerBR]} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 300,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: '#050d07',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  } as any,
  titlebar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 34,
    backgroundColor: 'rgba(10,22,14,0.9)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: 10,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  titlebarTxt: {
    fontFamily: monoFont,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.muted,
  },
  body: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreTag: {
    fontFamily: monoFont,
    fontSize: 8.5,
    letterSpacing: 2,
    color: colors.primaryDim,
  },
  stepCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 18,
    backgroundColor: 'rgba(12,26,16,0.72)',
  },
  stepTag: {
    fontFamily: monoFont,
    fontSize: 9,
    letterSpacing: 2.5,
    color: colors.primary,
    marginBottom: 10,
  },
  stepTitle: {
    fontFamily: bodyFontBold,
    fontSize: 20,
    letterSpacing: 1,
    color: colors.fg,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  stepSub: {
    fontFamily: bodyFont,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.muted,
    marginBottom: 16,
  },
  bar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
    transformOrigin: 'left',
  },
  tickerRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 12,
  },
  tick: {
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(57,255,106,0.2)',
  },
  tickActive: { backgroundColor: colors.primary },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 10,
  },
  footLeft: {
    fontFamily: monoFont,
    fontSize: 8.5,
    letterSpacing: 1.5,
    color: colors.mutedDim,
  },
  footRight: {
    fontFamily: monoFont,
    fontSize: 8.5,
    letterSpacing: 1.5,
    color: colors.primary,
  },
  corner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: 'rgba(57,255,106,0.5)',
  },
  cornerTL: { top: 40, left: 8, borderTopWidth: 1, borderLeftWidth: 1 },
  cornerBR: { bottom: 8, right: 8, borderBottomWidth: 1, borderRightWidth: 1 },
});
