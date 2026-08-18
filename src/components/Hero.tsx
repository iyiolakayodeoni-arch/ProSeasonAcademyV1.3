import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import InfinityCrest from './InfinityCrest';
import HeroOrb, { HERO_STATS, HeroStat } from './HeroOrb';
import { CtaPrimary, CtaSecondary } from './CtaButtons';
import { colors, monoFont, displayFont, bodyFont, radii } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// THE HERO — the landing page's opening statement, matched to
// mockups/hero-v2/hero-redesign.png.
//
//   left  · three stacked headline lines (cream / green / ∞ + green),
//           placeholder subtext, the two house CTAs, and the pen note
//           styled as a code comment
//   right · the HUD orb (chrome sphere, wireframe player, orbit rings,
//           floating stat cards) — see HeroOrb.tsx
//   below · the centred promise badge: ∞ NO STOP DATE · INFINITE LEARNING
//
// Every line of copy lives in HERO_COPY (overridable via the `copy` prop)
// so real wording can be swapped in without touching layout code.
// ─────────────────────────────────────────────────────────────────────────

const WEB = Platform.OS === 'web';
const headFont = WEB ? "'Space Grotesk', 'Barlow', sans-serif" : displayFont;
const bodyFace = WEB ? "'Inter', 'Barlow', sans-serif" : bodyFont;

export type HeroCopy = {
  line1: string;
  line2: string;
  line3: string;
  subtext: string;
  ctaPrimary: string;
  ctaSecondary: string;
  microLabel: string;
  badge: string;
  stats: HeroStat[];
};

export const HERO_COPY: HeroCopy = {
  line1: 'WATCH IT ONCE.',
  line2: 'WRITE HOW YOU FEEL.',
  line3: 'THE LOOP NEVER ENDS',
  subtext:
    'The Loop is the only guide. No coach. Tonight the feeling. Tomorrow the moments. Paper first. The card comes last.',
  ctaPrimary: 'START MY MATCH REVIEW',
  ctaSecondary: 'SEE THE LOOP',
  microLabel: '// PAPER FIRST. ALWAYS.',
  badge: 'THE LOOP · SESSION BY SESSION · FOREVER',
  stats: HERO_STATS,
};

type Props = {
  onPrimary: () => void;
  onSecondary: () => void;
  /** wide two-column layout (text left, orb right); stacked otherwise */
  isWide?: boolean;
  /** the width the hero should fill */
  contentWidth: number;
  /** override any of the placeholder copy */
  copy?: Partial<HeroCopy>;
};

export default function Hero({ onPrimary, onSecondary, isWide = false, contentWidth, copy }: Props) {
  const c: HeroCopy = { ...HERO_COPY, ...copy };
  const orbW = isWide ? Math.min(420, contentWidth * 0.44) : Math.min(340, contentWidth * 0.92);
  // Fill the column. Longest statement is WRITE HOW YOU FEEL.
  const colW = isWide ? contentWidth * 0.52 : contentWidth;
  const longest = Math.max(c.line1.length, c.line2.length, 16);
  const fit = colW / (longest * (isWide ? 0.46 : 0.50));
  const headSize = Math.round(Math.min(isWide ? 62 : 42, Math.max(isWide ? 38 : 32, fit)));
  const headLine = Math.round(headSize * 1.02);
  const loopSize = Math.round(Math.min(isWide ? 28 : 20, Math.max(isWide ? 20 : 16, headSize * 0.42)));
  const loopLine = Math.round(loopSize * 1.2);
  const crest = Math.round(Math.min(isWide ? 36 : 26, Math.max(isWide ? 26 : 20, headSize * 0.55)));

  return (
    <View style={[styles.hero, { width: contentWidth }]}>
      <View style={[styles.row, isWide && styles.rowWide]}>
        {/* ── left column — the statement ── */}
        <View style={[styles.text, isWide ? styles.textWide : styles.textNarrow]}>
          <Animated.View entering={FadeInDown.duration(600)} style={!isWide && styles.headlineBlockNarrow}>
            <Text
              style={[
                styles.h1,
                { fontSize: headSize, lineHeight: headLine },
                !isWide && styles.h1Narrow,
                WEB ? ({ fontFamily: headFont } as any) : null,
              ]}
            >
              {c.line1}
            </Text>
            <Text
              style={[
                styles.h1,
                styles.h1Green,
                { fontSize: headSize, lineHeight: headLine },
                !isWide && styles.h1Narrow,
                WEB ? ({ fontFamily: headFont } as any) : null,
              ]}
            >
              {c.line2}
            </Text>
            <View style={[styles.loopRow, !isWide && styles.loopRowNarrow]}>
              <InfinityCrest size={crest} bold />
              <Text
                style={[
                  styles.h1Loop,
                  { fontSize: loopSize, lineHeight: loopLine },
                  !isWide && styles.h1LoopNarrow,
                  WEB ? ({ fontFamily: headFont } as any) : null,
                ]}
              >
                {c.line3}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(600)}>
            <Text style={[styles.sub, !isWide && styles.subNarrow, WEB ? ({ fontFamily: bodyFace } as any) : null]}>{c.subtext}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(600)} style={[styles.ctas, !isWide && styles.ctasNarrow]}>
            <CtaPrimary label={c.ctaPrimary} onPress={onPrimary} />
            <CtaSecondary label={c.ctaSecondary} onPress={onSecondary} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Text style={[styles.penNote, !isWide && styles.penNoteNarrow]}>{c.microLabel}</Text>
          </Animated.View>
        </View>

        {/* ── right column — the HUD orb ── */}
        <Animated.View
          entering={FadeInDown.delay(120).duration(700)}
          style={[styles.art, isWide && styles.artWide]}
        >
          <HeroOrb width={orbW} stats={c.stats} compact={!isWide} />
        </Animated.View>
      </View>

      {/* ── the promise badge, centred under both columns ── */}
      <Animated.View entering={FadeInDown.delay(280).duration(600)} style={styles.badgeRow}>
        <View style={styles.badge}>
          <InfinityCrest size={26} />
          <Text style={styles.badgeTxt}>{c.badge}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignSelf: 'center',
    paddingTop: 64,
  },
  row: {
    flexDirection: 'column',
    gap: 44,
  },
  rowWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 48,
  },
  text: {
    flexShrink: 1,
  },
  textWide: {
    flex: 1.05,
  },
  textNarrow: {
    width: '100%',
    alignItems: 'center',
  },
  headlineBlockNarrow: {
    width: '100%',
    alignItems: 'center',
  },
  /* headline size is computed from the column width — these are fallbacks */
  h1: {
    fontFamily: displayFont,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: 0.4,
    color: colors.fg,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  h1Narrow: {
    textAlign: 'center',
    width: '100%',
  },
  h1Green: {
    color: colors.primary,
    textShadowColor: 'rgba(57,255,106,0.35)',
    textShadowRadius: 26,
  },
  loopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 8,
    marginTop: 8,
    maxWidth: '100%',
  },
  loopRowNarrow: {
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  h1Loop: {
    fontFamily: displayFont,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 1.2,
    color: colors.primary,
    textTransform: 'uppercase',
    flexShrink: 1,
    minWidth: 0,
  },
  h1LoopNarrow: {
    flexGrow: 0,
    textAlign: 'center',
  },
  sub: {
    fontFamily: bodyFont,
    fontSize: 15,
    lineHeight: 24,
    color: colors.muted,
    maxWidth: 380,
    marginTop: 26,
  },
  subNarrow: {
    textAlign: 'center',
    alignSelf: 'center',
  },
  ctas: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 28,
  },
  ctasNarrow: {
    justifyContent: 'center',
    alignSelf: 'center',
  },
  penNote: {
    fontFamily: monoFont,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.mutedDim,
    marginTop: 24,
  },
  penNoteNarrow: {
    textAlign: 'center',
    alignSelf: 'center',
  },
  art: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artWide: {
    flex: 1,
    minWidth: 340,
  },
  /* the promise badge */
  badgeRow: {
    alignItems: 'center',
    marginTop: 40,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(5,10,6,0.72)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingVertical: 9,
    paddingHorizontal: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  badgeTxt: {
    fontFamily: monoFont,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    textTransform: 'uppercase',
  },
});
