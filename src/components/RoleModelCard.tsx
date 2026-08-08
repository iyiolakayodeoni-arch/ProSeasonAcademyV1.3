import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  Path,
  Rect,
  Circle,
  Text as SvgText,
  Image as SvgImage,
  LinearGradient,
  RadialGradient,
  Stop,
  ClipPath,
  G,
} from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Coach } from '../data/coaches';
import { colors, monoFont } from '../theme';

// ─────────────────────────────────────────────────────────────
// ROLE MODEL CARD — the hero of the Journey screen.
// An ORIGINAL collectible-card silhouette (no real clubs, leagues
// or game templates): shield outline, nested hairline, charcoal→
// accent gradient, diagonal foil sheen on a slow sweep, bust
// portrait, foiled name plate, ProSeasonAcademy's own 6-stat row,
// footer strip. Accent per coach (Chinedu gold).
// ─────────────────────────────────────────────────────────────

export const CARD_W = 168;
export const CARD_H = 226;

// shield/tombstone silhouette — rounded top, long straight flanks,
// then a broad, shallow sweep into the base point. The sweep is kept
// wide so the footer strip sits INSIDE the silhouette cleanly.
const SHIELD = [
  'M 84 219',
  'C 106 216, 126 211, 142 200',
  'C 156 189, 164 172, 164 150',
  'L 164 14',
  'C 164 6, 159 2, 152 2',
  'L 16 2',
  'C 9 2, 4 6, 4 14',
  'L 4 150',
  'C 4 172, 12 189, 26 200',
  'C 42 211, 62 216, 84 219',
  'Z',
].join(' ');

// inset hairline — intentionally ENDS above the footer zone so the
// frame reads engraved around the art, open at the base (card-code look)
const SHIELD_INNER = [
  'M 84 194',
  'C 104 191, 122 188, 137 178',
  'C 150 169, 158 158, 158 146',
  'L 158 17',
  'C 158 11, 154 8, 148 8',
  'L 20 8',
  'C 14 8, 10 11, 10 17',
  'L 10 148',
  'C 10 158, 18 169, 31 178',
  'C 46 188, 64 191, 84 194',
  'Z',
].join(' ');

// portrait arch (fallback mask when no transparent cutout exists)
const PORTRAIT_ARCH =
  'M 12 140 L 12 96 C 18 66, 44 54, 84 54 C 124 54, 150 66, 156 96 L 156 140 Z';

const SHEEN_REST = -110;
const SHEEN_END = CARD_W + 130;
const SHEEN_REST_MS = 2300;
const SHEEN_GLIDE_MS = 1600;

/** understated foil shimmer, JS-driven so it sweeps on web + native alike */
function useSheenSweep(): number {
  const [x, setX] = useState(SHEEN_REST);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let rafStart = 0;
    const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p);
    const tick = () => {
      if (!alive) return;
      const p = Math.min(1, (Date.now() - rafStart) / SHEEN_GLIDE_MS);
      setX(SHEEN_REST + easeInOut(p) * (SHEEN_END - SHEEN_REST));
      if (p >= 1) {
        timer = setTimeout(() => {
          if (!alive) return;
          setX(SHEEN_REST);
          timer = setTimeout(swing, SHEEN_REST_MS);
        }, 0);
      } else {
        timer = setTimeout(tick, 50);
      }
    };
    const swing = () => {
      if (!alive) return;
      rafStart = Date.now();
      tick();
    };
    timer = setTimeout(swing, SHEEN_REST_MS);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);
  return x;
}

/** darken a #rrggbb color by factor f (0..1) for plate/glow lookups */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

type Props = {
  coach: Coach;
  onPress?: () => void;
};

export default function RoleModelCard({ coach, onPress }: Props) {
  const accent = coach.cardAccent;
  const accentDim = shade(accent, 0.55);

  // foil sheen sweep: rests off-card, then glides across every ~3.9s
  const sheenX = useSheenSweep();

  // tap feedback
  const press = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.045 }],
  }));

  const name = coach.name.toUpperCase();
  const nameSize = useMemo(() => (name.length > 13 ? 10.6 : 11.8), [name]);
  const stats = coach.cardStats;
  const colL = stats.slice(0, 3);
  const colR = stats.slice(3, 6);
  const statRows = [174.5, 184.5, 194.5];

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (press.value = withTiming(1, { duration: 90 }))}
      onPressOut={() => (press.value = withSpring(0))}
      hitSlop={10}
    >
      {/* physical drop shadow, lifted off the map */}
      <View style={styles.dropShadow}>
        {/* ambient accent glow bleeding outward */}
        <Animated.View style={[styles.accentShadow, { shadowColor: accent }, pressStyle]}>
          <Svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`}>
            <Defs>
              <LinearGradient id="rmc_bg" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#10160f" />
                <Stop offset="58%" stopColor="#0c120d" />
                <Stop offset="100%" stopColor={accent} stopOpacity={0.2} />
              </LinearGradient>
              <RadialGradient id="rmc_halo" cx="50%" cy="42%" r="62%">
                <Stop offset="0%" stopColor={accent} stopOpacity={0.2} />
                <Stop offset="70%" stopColor={accent} stopOpacity={0.04} />
              </RadialGradient>
              <LinearGradient id="rmc_sheen" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor={accent} stopOpacity={0} />
                <Stop offset="46%" stopColor={accent} stopOpacity={0.05} />
                <Stop offset="50%" stopColor={accent} stopOpacity={0.3} />
                <Stop offset="54%" stopColor={accent} stopOpacity={0.05} />
                <Stop offset="100%" stopColor={accent} stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id="rmc_plate" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={accent} />
                <Stop offset="100%" stopColor={accentDim} />
              </LinearGradient>
              {/* The gradient-edged card — INSPIRED by current console cards'
                  multicolour borders, but in ProSeasonAcademy's own colours:
                  a cool neutral → the brand green → the coach's gold. The cue
                  is the treatment; the palette stays ours. (docs/FC26_UI_RESEARCH.md §4/§2) */}
              <LinearGradient id="rmc_border" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor={colors.steel} />
                <Stop offset="55%" stopColor={colors.primary} />
                <Stop offset="100%" stopColor={accent} />
              </LinearGradient>
              <LinearGradient id="rmc_fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="45%" stopColor="#0c120d" stopOpacity={0} />
                <Stop offset="100%" stopColor="#0c120d" stopOpacity={0.94} />
              </LinearGradient>
              <ClipPath id="rmc_clip">
                <Path d={SHIELD} />
              </ClipPath>
              <ClipPath id="rmc_arch">
                <Path d={PORTRAIT_ARCH} />
              </ClipPath>
            </Defs>

            {/* card body */}
            <Path d={SHIELD} fill="url(#rmc_bg)" />
            <G clipPath="url(#rmc_clip)">
              {/* soft accent halo behind the portrait */}
              <Circle cx="84" cy="96" r="72" fill="url(#rmc_halo)" />

              {/* portrait — full-face bust: cutout bleeds edge-to-edge,
                  cardPortrait/photo sits inside the dome with headroom */}
              <G clipPath={coach.cutout ? undefined : 'url(#rmc_arch)'}>
                <SvgImage
                  x={coach.cutout ? 6 : 12}
                  y={coach.cutout ? 38 : 36}
                  width={coach.cutout ? 156 : 144}
                  height={coach.cutout ? 112 : 108}
                  preserveAspectRatio={coach.cutout ? 'xMidYMax slice' : 'xMidYMin slice'}
                  href={coach.cutout ?? coach.cardPortrait ?? coach.portrait}
                />
              </G>
              {/* bottom fade so art resolves into the name plate */}
              <Rect x="6" y="92" width="156" height="62" fill="url(#rmc_fade)" />

              {/* diagonal foil band, swept by the slow shimmer */}
              <G transform={`translate(${sheenX} 0)`}>
                <Rect
                  x={0}
                  y={-60}
                  width={64}
                  height={CARD_H + 120}
                  transform={`rotate(-22 32 ${CARD_H / 2})`}
                  fill="url(#rmc_sheen)"
                />
              </G>
            </G>

            {/* layered borders: outer gradient hairline (our palette) + steel inset */}
            <Path d={SHIELD} fill="none" stroke="url(#rmc_border)" strokeWidth={1.5} strokeOpacity={0.95} />
            <Path d={SHIELD_INNER} fill="none" stroke={colors.steel} strokeWidth={0.7} strokeOpacity={0.45} />

            {/* 1 — rating badge, top-left */}
            <SvgText x="26" y="38" textAnchor="middle" fontSize="28" fontWeight="900" fill={accent}>
              {coach.rating}
            </SvgText>
            <SvgText
              x="15"
              y="50"
              textAnchor="start"
              fontSize="5.2"
              letterSpacing="1"
              fontFamily={monoFont}
              fill={colors.muted}
            >
              {coach.title.replace(/^THE /, '')}
            </SvgText>

            {/* 2 — program crest, top-right (original loop mark) */}
            <G>
              <Circle cx="135" cy="26" r="6.6" stroke={accent} strokeWidth="1.5" fill="none" />
              <Circle cx="145" cy="26" r="6.6" stroke={accent} strokeWidth="1.5" fill="none" />
              <Circle cx="140" cy="26" r="1.7" fill={accent} />
            </G>

            {/* 4 — foiled name plate */}
            <Rect x="12" y="142" width="144" height="24" rx="7" fill="url(#rmc_plate)" stroke={accent} strokeWidth="0.9" />
            <SvgText
              x="84"
              y="158.5"
              textAnchor="middle"
              fontSize={nameSize}
              fontWeight="900"
              letterSpacing="2.2"
              fill="#0a0f0a"
            >
              {name}
            </SvgText>

            {/* 5 — stat row, two aligned columns (original stat system) */}
            {colL.map((s, i) => (
              <G key={`l-${s.label}`}>
                <SvgText x="44" y={statRows[i]} fontSize="4.8" letterSpacing="0.8" fontFamily={monoFont} fill={colors.muted}>
                  {s.label}
                </SvgText>
                <SvgText x="82" y={statRows[i]} textAnchor="end" fontSize="8.6" fontWeight="900" fill={accent}>
                  {s.value}
                </SvgText>
              </G>
            ))}
            {colR.map((s, i) => (
              <G key={`r-${s.label}`}>
                <SvgText x="83" y={statRows[i]} fontSize="4.8" letterSpacing="0.8" fontFamily={monoFont} fill={colors.muted}>
                  {s.label}
                </SvgText>
                <SvgText x="126" y={statRows[i]} textAnchor="end" fontSize="8.6" fontWeight="900" fill={accent}>
                  {s.value}
                </SvgText>
              </G>
            ))}

            {/* 6 — footer strip, engraved in the flat lane above the base sweep */}
            <Rect x="44" y="200.2" width="30" height="0.6" fill={accent} fillOpacity={0.4} />
            <Rect x="94" y="200.2" width="30" height="0.6" fill={accent} fillOpacity={0.4} />
            <SvgText
              x="84"
              y="202.5"
              textAnchor="middle"
              fontSize="3.9"
              letterSpacing="0.6"
              fontFamily={monoFont}
              fill="rgba(166,190,172,0.9)"
            >
              COACH BENCHMARK · CHAPTER GUIDE
            </SvgText>
          </Svg>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dropShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 22,
  },
  accentShadow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 10,
  },
});
