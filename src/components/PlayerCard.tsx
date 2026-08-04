import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  Path,
  Rect,
  Circle,
  Text as SvgText,
  LinearGradient,
  RadialGradient,
  Stop,
  ClipPath,
  G,
} from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { CardStat } from '../data/coaches';
import { colors, monoFont, gradeColor, glow } from '../theme';

// ─────────────────────────────────────────────────────────────
// PLAYER CARD — the member's own collectible card.
//
// Principle P2. The Role Model already has a foil card; until now the
// PLAYER — the person the whole product is about — was a 104px text box.
// This card pairs with the Role Model on the same instrument: same shield
// silhouette, same foil sweep, same 6-stat row. The differences are the
// point: no portrait (it is you, not a hero to copy), the RATING is the hero
// (stage-gated — see playerCard.ts), an ASCENT RING shows how close you are
// to the Standard's ceiling, and every stat value is coloured by gradeColor
// so green/amber/red reads at a glance. All numbers come from receipts.
// ─────────────────────────────────────────────────────────────

export const PCARD_W = 168;
export const PCARD_H = 232;

const SHIELD = [
  'M 84 224', 'C 106 221, 126 216, 142 205', 'C 156 194, 164 177, 164 155',
  'L 164 14', 'C 164 6, 159 2, 152 2', 'L 16 2', 'C 9 2, 4 6, 4 14',
  'L 4 155', 'C 4 177, 12 194, 26 205', 'C 42 216, 62 221, 84 224', 'Z',
].join(' ');
const SHIELD_INNER = [
  'M 84 199', 'C 104 196, 122 193, 137 183', 'C 150 174, 158 163, 158 151',
  'L 158 17', 'C 158 11, 154 8, 148 8', 'L 20 8', 'C 14 8, 10 11, 10 17',
  'L 10 153', 'C 10 163, 18 174, 31 183', 'C 46 193, 64 196, 84 199', 'Z',
].join(' ');

const SHEEN_REST = -110;
const SHEEN_END = PCARD_W + 130;

/** the same understated foil sweep the Role Model card uses — kept in sync */
function useSheenSweep(): number {
  const [x, setX] = useState(SHEEN_REST);
  useEffect(() => {
    let alive = true;
    let t1: ReturnType<typeof setTimeout> | null = null;
    let t2: ReturnType<typeof setTimeout> | null = null;
    let start = 0;
    const GLIDE = 1600;
    const ease = (p: number) => (p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p);
    const tick = () => {
      if (!alive) return;
      const p = Math.min(1, (Date.now() - start) / GLIDE);
      setX(SHEEN_REST + ease(p) * (SHEEN_END - SHEEN_REST));
      if (p >= 1) {
        t1 = setTimeout(() => { if (!alive) return; setX(SHEEN_REST); t2 = setTimeout(swing, 2300); }, 0);
      } else {
        t1 = setTimeout(tick, 50);
      }
    };
    const swing = () => { if (!alive) return; start = Date.now(); tick(); };
    t2 = setTimeout(swing, 1800);
    return () => { alive = false; if (t1) clearTimeout(t1); if (t2) clearTimeout(t2); };
  }, []);
  return x;
}

/** a one-shot count-up so the rating literally steps up on mount / on clear */
function useCountUp(to: number, deps: React.DependencyList): number {
  const [n, setN] = useState(to);
  useEffect(() => {
    let alive = true;
    let raf = 0;
    const from = n;
    const start = Date.now();
    const DUR = 520;
    const step = () => {
      if (!alive) return;
      const p = Math.min(1, (Date.now() - start) / DUR);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (to - from) * eased));
      if (p < 1) raf = setTimeout(step, 30) as unknown as number;
    };
    raf = setTimeout(step, 30) as unknown as number;
    return () => { alive = false; clearTimeout(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return n;
}

type Props = {
  rating: number;
  stats: CardStat[];
  stageN: number;
  totalStages: number;
  clearedCount: number;
  ascent: number; // 0..1 toward the Role Model ceiling
  displayName?: string;
  onPress?: () => void;
};

export default function PlayerCard({
  rating, stats, stageN, totalStages, clearedCount, ascent, displayName, onPress,
}: Props) {
  const sheenX = useSheenSweep();
  const shownRating = useCountUp(rating, [rating]);
  const ratingColor = gradeColor((rating - 60) / 36 * 100); // 60→96 mapped to 0→100

  const press = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.04 }] }));
  const halo = useAnimatedStyle(() => ({ opacity: 0.55 + (1 - press.value) * 0.0 }));

  // ascent ring geometry
  const ringR = 33;
  const C = 2 * Math.PI * ringR;
  const ascentOffset = C * (1 - Math.max(0, Math.min(1, ascent)));

  const name = (displayName ?? 'YOU').toUpperCase();
  const colL = stats.slice(0, 3);
  const colR = stats.slice(3, 6);
  const statRows = [176, 186, 196];
  const ascentPct = useMemo(() => Math.round(ascent * 100), [ascent]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (press.value = withTiming(1, { duration: 90 }))}
      onPressOut={() => (press.value = withRepeat(withSequence(withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) })), 1, false))}
      hitSlop={10}
    >
      <View style={styles.drop}>
        <Animated.View style={[styles.accentGlow, halo, pressStyle]}>
          <Svg width={PCARD_W} height={PCARD_H} viewBox={`0 0 ${PCARD_W} ${PCARD_H}`}>
            <Defs>
              <LinearGradient id="pc_bg" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#0e1712" />
                <Stop offset="60%" stopColor="#0b130d" />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity={0.16} />
              </LinearGradient>
              <RadialGradient id="pc_halo" cx="50%" cy="40%" r="60%">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.22} />
                <Stop offset="70%" stopColor={colors.primary} stopOpacity={0.03} />
              </RadialGradient>
              <LinearGradient id="pc_sheen" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity={0} />
                <Stop offset="50%" stopColor={colors.primary} stopOpacity={0.28} />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
              </LinearGradient>
              <ClipPath id="pc_clip"><Path d={SHIELD} /></ClipPath>
            </Defs>

            <Path d={SHIELD} fill="url(#pc_bg)" />
            <G clipPath="url(#pc_clip)">
              <Circle cx="84" cy="92" r="74" fill="url(#pc_halo)" />

              {/* ascent ring around the rating — how close you are to the Standard */}
              <Circle cx="84" cy="90" r={ringR} stroke="rgba(57,255,106,0.14)" strokeWidth="2.4" fill="none" />
              <Circle
                cx="84" cy="90" r={ringR}
                stroke={colors.primary} strokeWidth="2.4" fill="none" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={ascentOffset}
                transform={`rotate(-90 84 90)`}
              />
              {/* the program crest — two loops, the academy's own mark */}
              <G opacity="0.18" transform="translate(84 90)">
                <Circle cx="-9" cy="0" r="13" stroke={colors.primary} strokeWidth="2" fill="none" />
                <Circle cx="9" cy="0" r="13" stroke={colors.primary} strokeWidth="2" fill="none" />
              </G>

              {/* RATING — the hero. stage-gated, coloured by how far you've climbed */}
              <SvgText x="84" y="86" textAnchor="middle" fontSize="30" fontWeight="900" fill={ratingColor}>
                {shownRating}
              </SvgText>
              <SvgText x="84" y="100" textAnchor="middle" fontSize="5" letterSpacing="2" fontFamily={monoFont} fill={colors.muted}>
                OVR · ASCENT {ascentPct}%
              </SvgText>

              <G transform={`translate(${sheenX} 0)`}>
                <Rect x={0} y={-60} width="64" height={PCARD_H + 120}
                  transform={`rotate(-22 32 ${PCARD_H / 2})`} fill="url(#pc_sheen)" />
              </G>
            </G>

            {/* frame + hairline */}
            <Path d={SHIELD} fill="none" stroke={colors.primary} strokeWidth="1.5" strokeOpacity="0.9" />
            <Path d={SHIELD_INNER} fill="none" stroke={colors.primary} strokeWidth="0.7" strokeOpacity="0.45" />

            {/* name plate */}
            <Rect x="12" y="142" width="144" height="22" rx="7" fill="rgba(57,255,106,0.92)" stroke={colors.primary} strokeWidth="0.9" />
            <SvgText x="84" y="157" textAnchor="middle" fontSize="11" fontWeight="900" letterSpacing="2.4" fill="#05130a">
              {name}
            </SvgText>

            {/* 6 honest stats — value coloured by grade so it reads at a glance */}
            {colL.map((s, i) => (
              <G key={`l-${s.label}`}>
                <SvgText x="44" y={statRows[i]} fontSize="4.8" letterSpacing="0.8" fontFamily={monoFont} fill={colors.muted}>{s.label}</SvgText>
                <SvgText x="82" y={statRows[i]} textAnchor="end" fontSize="8.8" fontWeight="900" fill={gradeColor(s.value)}>{s.value}</SvgText>
              </G>
            ))}
            {colR.map((s, i) => (
              <G key={`r-${s.label}`}>
                <SvgText x="83" y={statRows[i]} fontSize="4.8" letterSpacing="0.8" fontFamily={monoFont} fill={colors.muted}>{s.label}</SvgText>
                <SvgText x="126" y={statRows[i]} textAnchor="end" fontSize="8.8" fontWeight="900" fill={gradeColor(s.value)}>{s.value}</SvgText>
              </G>
            ))}

            {/* footer — your honest position on the road */}
            <Rect x="44" y="201.2" width="30" height="0.6" fill={colors.primary} fillOpacity="0.4" />
            <Rect x="94" y="201.2" width="30" height="0.6" fill={colors.primary} fillOpacity="0.4" />
            <SvgText x="84" y="203.6" textAnchor="middle" fontSize="3.9" letterSpacing="0.6" fontFamily={monoFont} fill="rgba(166,190,172,0.9)">
              STAGE {stageN}/{totalStages} · {clearedCount} CLEARED
            </SvgText>
          </Svg>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  drop: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 22,
  },
  accentGlow: {
    ...glow.held,
    shadowColor: colors.primary,
    borderRadius: 20,
  },
});
