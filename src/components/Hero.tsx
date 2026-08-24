import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import InfinityCrest from './InfinityCrest';
import HeroOrb, { HERO_STATS, HeroStat } from './HeroOrb';
import { CtaPrimary, CtaSecondary } from './CtaButtons';
import { colors, monoFont, displayFont, bodyFont, radii } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// THE HERO — the landing page's opening statement.
//
//   left  · three stacked headline lines (cream / green / ∞ + green),
//           placeholder subtext, the two house CTAs, and the pen note
//           styled as a code comment
//   right · the HUD orb (chrome sphere, wireframe player, orbit rings,
//           floating stat cards) — see HeroOrb.tsx
//   below · the centred promise badge: ∞ NO STOP DATE · INFINITE LEARNING
//
// `scale` adapts the whole block to screen size (phones shrink the
// headline, gaps and CTAs so nothing crowds or mis-centers).
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
  /** responsive scale multiplier (1 = desktop, ~0.7 on phones) */
  scale?: number;
  /** override any of the placeholder copy */
  copy?: Partial<HeroCopy>;
};

export default function Hero({ onPrimary, onSecondary, isWide = false, contentWidth, scale = 1, copy }: Props) {
  const c: HeroCopy = { ...HERO_COPY, ...copy };
  const orbW = isWide ? Math.min(460, contentWidth * 0.48) : Math.min(400, contentWidth * 0.94);

  return (
    <View style={[styles.hero, { width: contentWidth, paddingTop: 64 * scale }]}>
      <View style={[styles.row, isWide && styles.rowWide, { gap: 44 * scale }]}>
        {/* ── left column — the statement ── */}
        <View style={[styles.text, isWide && styles.textWide]}>
          <Animated.View entering={FadeInDown.duration(600)}>
            <Text style={[styles.h1, { fontSize: 54 * scale, lineHeight: 52 * scale }, WEB ? ({ fontFamily: headFont } as any) : null]}>
              {c.line1}
            </Text>
            <Text style={[styles.h1, styles.h1Green, { fontSize: 54 * scale, lineHeight: 52 * scale }, WEB ? ({ fontFamily: headFont } as any) : null]}>
              {c.line2}
            </Text>
            <View style={styles.loopRow}>
              <InfinityCrest size={(isWide ? 64 : 48) * scale} bold />
              <Text style={[styles.h1Loop, { fontSize: 38 * scale, lineHeight: 40 * scale }, WEB ? ({ fontFamily: headFont } as any) : null]}>
                {c.line3}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(600)}>
            <Text style={[styles.sub, { fontSize: 15 * scale, lineHeight: 24 * scale, marginTop: 26 * scale }, WEB ? ({ fontFamily: bodyFace } as any) : null]}>
              {c.subtext}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(600)} style={[styles.ctas, { marginTop: 28 * scale }]}>
            <CtaPrimary label={c.ctaPrimary} onPress={onPrimary} />
            <CtaSecondary label={c.ctaSecondary} onPress={onSecondary} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Text style={[styles.penNote, { fontSize: 11 * scale, marginTop: 24 * scale }]}>{c.microLabel}</Text>
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
      <Animated.View entering={FadeInDown.delay(280).duration(600)} style={[styles.badgeRow, { marginTop: 40 * scale }]}>
        <View style={styles.badge}>
          <InfinityCrest size={26 * Math.max(scale, 0.8)} />
          <Text style={[styles.badgeTxt, { fontSize: 11 * Math.max(scale, 0.8) }]}>{c.badge}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'column',
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
    letterSpacing: 1,
    color: colors.primary,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  sub: {
    fontFamily: bodyFont,
    color: colors.muted,
    maxWidth: 380,
  },
  /* CTAs — centred so wrapped rows stay centred on small screens */
  ctas: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  penNote: {
    fontFamily: monoFont,
    letterSpacing: 1.6,
    color: colors.mutedDim,
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
    letterSpacing: 2,
    color: colors.primary,
    textTransform: 'uppercase',
  },
});
