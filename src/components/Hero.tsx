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
  line1: 'CARRY ONE LESSON.',
  line2: 'REVIEW THE MATCH.',
  line3: 'THE LOOP NEVER ENDS',
  // placeholder — swap real copy in via the `copy` prop
  subtext:
    'Learn one lesson from every match you play, then carry it forward — honest review, written down, in ProSeason Academy.',
  ctaPrimary: 'START MY MATCH REVIEW',
  ctaSecondary: 'SEE THE METHOD',
  microLabel: '// THINK WITH YOUR PEN',
  badge: 'NO STOP DATE · INFINITE LEARNING',
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

const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function Hero({ onPrimary, onSecondary, isWide = false, contentWidth, copy }: Props) {
  const c: HeroCopy = { ...HERO_COPY, ...copy };
  const orbW = isWide ? Math.min(460, contentWidth * 0.48) : Math.min(400, contentWidth * 0.94);

  // ── fluid headline sizing (mirrors the mockup's CSS clamp()) ──
  // The fixed 54/38px sizes overflow the text column on laptop widths
  // (1024–1439px the column is only ~390px wide), wrapping the headline and
  // the "THE LOOP NEVER ENDS" line awkwardly around the crest. Size the type
  // to the column so every line fits on ONE line at any width.
  const textColW = isWide ? (contentWidth - 48) * (1.05 / 2.05) : contentWidth;
  // avg uppercase glyph width ≈ 0.6em in the headline face (Space Grotesk / Anton)
  const AVG = 0.6;
  const longestH1 = Math.max(c.line1.length, c.line2.length, 1);
  const h1Size = Math.floor(clampN(textColW / (longestH1 * AVG), 32, 54));
  // loop row: crest scales with the text (crest ≈ 1.68× the font size, like 64:38)
  const loopChars = Math.max(c.line3.length, 1);
  const loopSize = Math.floor(
    clampN((textColW - 14 - loopChars) / (loopChars * AVG + 1.68), 22, 38)
  );
  const crestSize = Math.round(clampN(loopSize * 1.68, 40, 64));

  return (
    <View style={[styles.hero, { width: contentWidth }]}>
      <View style={[styles.row, isWide && styles.rowWide]}>
        {/* ── left column — the statement ── */}
        <View style={[styles.text, isWide && styles.textWide]}>
          <Animated.View entering={FadeInDown.duration(600)}>
            <Text
              style={[
                styles.h1,
                { fontSize: h1Size, lineHeight: Math.round(h1Size * 0.97) },
                WEB ? ({ fontFamily: headFont } as any) : null,
              ]}
            >
              {c.line1}
            </Text>
            <Text
              style={[
                styles.h1,
                styles.h1Green,
                { fontSize: h1Size, lineHeight: Math.round(h1Size * 0.97) },
                WEB ? ({ fontFamily: headFont } as any) : null,
              ]}
            >
              {c.line2}
            </Text>
            <View style={styles.loopRow}>
              <InfinityCrest size={crestSize} bold />
              <Text
                style={[
                  styles.h1Loop,
                  { fontSize: loopSize, lineHeight: Math.round(loopSize * 1.08) },
                  WEB ? ({ fontFamily: headFont, whiteSpace: 'nowrap' } as any) : null,
                ]}
              >
                {c.line3}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(600)}>
            <Text style={[styles.sub, WEB ? ({ fontFamily: bodyFace } as any) : null]}>{c.subtext}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(600)} style={styles.ctas}>
            <CtaPrimary label={c.ctaPrimary} onPress={onPrimary} />
            <CtaSecondary label={c.ctaSecondary} onPress={onSecondary} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Text style={styles.penNote}>{c.microLabel}</Text>
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
  /* headline — heavy condensed, tight leading (~0.95) */
  h1: {
    fontFamily: displayFont,
    fontSize: 54,
    lineHeight: 52,
    letterSpacing: 0.5,
    color: colors.fg,
    textTransform: 'uppercase',
  },
  h1Green: {
    color: colors.primary,
    textShadowColor: 'rgba(57,255,106,0.35)',
    textShadowRadius: 26,
  },
  loopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  h1Loop: {
    fontFamily: displayFont,
    fontSize: 38,
    lineHeight: 40,
    letterSpacing: 1,
    color: colors.primary,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  sub: {
    fontFamily: bodyFont,
    fontSize: 15,
    lineHeight: 24,
    color: colors.muted,
    maxWidth: 380,
    marginTop: 26,
  },
  ctas: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 28,
  },
  penNote: {
    fontFamily: monoFont,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.mutedDim,
    marginTop: 24,
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
