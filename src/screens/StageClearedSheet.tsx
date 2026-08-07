import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import GridBackground from '../components/GridBackground';
import ScreenFlash from '../components/ScreenFlash';
import BadgeMark, { BADGE_LABELS } from '../components/BadgeMark';
import EdgeGradient from '../components/EdgeGradient';
import ButtonGlyph from '../components/ButtonGlyph';
import { CheckRingIcon, ChevronRightIcon } from '../components/Icons';
import { Coach } from '../data/coaches';
import { JourneyStage } from '../data/journey';
import { ScanResult } from '../hooks/useMatchScan';
import { colors, monoFont, displayFont, bodyFont, bodyFontBold, bodyFontHeavy, glow, gradeColor } from '../theme';
import { PLAYER_CARD } from '../data/playerCard';

// ─────────────────────────────────────────────────────────────
// STAGE CLEARED — the earned reveal.
//
// Principle P3. Until now, clearing a stage flipped a text status to
// "STAGE n CLEARED — THE EVIDENCE HOLDS" and played a whistle. That is a form
// submission, not a moment. This sheet is the payoff — but it is an EVIDENCE
// REVEAL, never a lootbox:
//   • the badge seals (lit from a quiet outline),
//   • the actual receipts that cleared the stage are listed with their counts,
//   • the card rating steps up by the honest stage delta,
//   • the next stage is named as open.
// Nothing here celebrates anything the ledger didn't underwrite. The motion is
// restrained (P5): a fade, a spring on the seal, staggered receipts, a count-up.
// ─────────────────────────────────────────────────────────────

type Props = {
  coach: Coach;
  stage: JourneyStage;
  result: ScanResult;          // the values that cleared it (the receipts)
  prevRating: number;          // card rating before the clear
  onContinue: () => void;      // back to the map / onward
  isFinal?: boolean;           // stage 6 — the road is complete
  nextStageName?: string;      // the stage that just unlocked
};

const springSoft = { damping: 16, stiffness: 150, mass: 0.9 };

export default function StageClearedSheet({
  coach, stage, result, prevRating, onContinue, isFinal, nextStageName,
}: Props) {
  const nextRating = Math.min(PLAYER_CARD.RATING_CEIL, prevRating + PLAYER_CARD.RATING_STEP);
  const delta = nextRating - prevRating;
  const ascentBefore = (prevRating - PLAYER_CARD.BASE_RATING) / (PLAYER_CARD.RATING_CEIL - PLAYER_CARD.BASE_RATING);
  const ascentAfter = (nextRating - PLAYER_CARD.BASE_RATING) / (PLAYER_CARD.RATING_CEIL - PLAYER_CARD.BASE_RATING);

  // the rating counts up from prev → next as the seal lands
  const [shown, setShown] = useState(prevRating);
  useEffect(() => {
    let alive = true;
    let raf: ReturnType<typeof setTimeout>;
    const start = Date.now();
    const DUR = 900;
    const tick = () => {
      if (!alive) return;
      const p = Math.min(1, (Date.now() - start) / DUR);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(prevRating + (nextRating - prevRating) * eased));
      if (p < 1) raf = setTimeout(tick, 30);
    };
    raf = setTimeout(tick, 480); // after the seal
    return () => { alive = false; clearTimeout(raf); };
  }, [prevRating, nextRating]);

  const seal = useSharedValue(0);
  useEffect(() => {
    seal.value = withDelay(180, withSpring(1, springSoft));
  }, [seal]);
  const sealStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.7 + seal.value * 0.3 }],
    opacity: seal.value,
  }));

  const burst = useSharedValue(0);
  useEffect(() => {
    burst.value = withDelay(220, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [burst]);
  const burstStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - burst.value),
    transform: [{ scale: 0.6 + burst.value * 1.1 }],
  }));

  const receipts = result.values.filter((v) => v.met);
  const xpGained = stage.rewardXp ?? 100;
  const stageLabel = BADGE_LABELS[stage.n] ?? stage.key;

  return (
    <View style={styles.root}>
      <GridBackground />
      <ScreenFlash />
      <LinearGradient
        colors={['rgba(10,15,10,0)', 'rgba(57,255,106,0.05)', 'rgba(10,15,10,0.9)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* the light shaft — the reveal grammar: one angled beam catching the
          badge as it seals. Quiet, one beat, earned. */}
      <LinearGradient
        colors={['rgba(57,255,106,0.14)', 'rgba(57,255,106,0.05)', 'rgba(57,255,106,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.shaft}
        pointerEvents="none"
      />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeIn.duration(360)} style={styles.eyebrowWrap}>
          <Text style={styles.eyebrow}>THE EVIDENCE HOLDS</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(120).duration(420)} style={styles.sealWrap}>
          <Animated.View style={[styles.burst, burstStyle]} pointerEvents="none" />
          <Animated.View style={sealStyle}>
            <BadgeMark stage={stage.n} sealed size={132} />
          </Animated.View>
        </Animated.View>

        <Animated.Text entering={FadeIn.delay(260).duration(420)} style={styles.headline}>
          CHAPTER {stage.n} COMPLETE
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(320).duration(420)} style={styles.stageName}>
          {stageLabel}
        </Animated.Text>

        <Animated.View entering={FadeIn.delay(380).duration(420)} style={styles.attest}>
          <Image source={coach.portrait} style={styles.attestAvatar} />
          <Text style={styles.attestTxt}>
            {coach.name.toUpperCase()} WATCHED THE TAPE. THE LEDGER SAYS THE WORK WAS DONE —
            NOT WHAT YOU HOPED, WHAT YOU DID.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(420).duration(420)} style={[styles.attest, { borderColor: 'rgba(57,255,106,0.3)', backgroundColor: 'rgba(57,255,106,0.03)', marginTop: 8 }]}>
          <Text style={[styles.attestTxt, { color: colors.primary, textAlign: 'center' }]}>
            THE CHINEDU WAY · PEN TO PAPER: You recorded your tape as usual, penned your moments on paper, cooled down for 24–30 mins, and typed your truth into your database. The hard way is the easy way, and tech is meant to elevate.
          </Text>
        </Animated.View>

        {/* the receipts — every line that cleared, with its real count */}
        <View style={styles.receiptsCard}>
          <Text style={styles.receiptsTitle}>THE RECEIPTS THAT CLEARED IT</Text>
          {receipts.length === 0 && (
            <Text style={styles.receiptsEmpty}>CHAPTER {stage.n} IS COMPLETE FROM YOUR SAVED EVIDENCE.</Text>
          )}
          {receipts.map((v, i) => (
            <Animated.View
              key={i}
              entering={FadeInDown.delay(460 + i * 90).duration(360)}
              style={styles.receiptRow}
            >
              <CheckRingIcon size={15} color={colors.primary} />
              <Text style={styles.receiptLabel} numberOfLines={2}>{v.label}</Text>
              <Text style={styles.receiptCount}>{v.value}/{v.target}</Text>
            </Animated.View>
          ))}
        </View>

        {/* the card step — rating counts up by the honest delta */}
        <EdgeGradient radius={14} style={{ width: '100%', marginTop: 18 }}>
        <Animated.View entering={FadeIn.delay(560).duration(420)} style={[styles.cardStep, { borderWidth: 0, marginTop: 0, borderRadius: 13 }]}>
          <Text style={styles.cardStepTag}>YOUR CARD</Text>
          <View style={styles.cardStepRow}>
            <View style={styles.cardStepPrev}>
              <Text style={styles.cardStepPrevNum}>{prevRating}</Text>
              <Text style={styles.cardStepPrevLbl}>BEFORE</Text>
            </View>
            <View style={styles.cardStepArrow}>
              <ChevronRightIcon size={16} color={colors.primary} />
              <Text style={[styles.cardStepDelta, { color: gradeColor(80) }]}>+{delta}</Text>
            </View>
            <View style={styles.cardStepNext}>
              <AscentRing value={shown} ascent={ascentAfter} />
            </View>
          </View>
          <View style={styles.xpRow}>
            <Text style={styles.xpTag}>+{xpGained} XP</Text>
            <Text style={styles.xpAscent}>ASCENT {Math.round(ascentBefore * 100)}% → {Math.round(ascentAfter * 100)}%</Text>
          </View>
        </Animated.View>
        </EdgeGradient>

        {/* the next door — what just opened, honestly */}
        <Animated.View entering={FadeIn.delay(660).duration(420)} style={styles.nextDoor}>
          {isFinal ? (
            <Text style={styles.nextDoorTxt}>
              THE ROAD IS COMPLETE — REVIEW THE EVIDENCE, THEN SET YOUR NEXT STANDARD.
            </Text>
          ) : (
            <Text style={styles.nextDoorTxt}>
              CHAPTER {stage.n + 1} — {nextStageName?.toUpperCase() ?? 'THE NEXT CHAPTER'} IS READY.
              THE PATH ONLY MOVES FORWARD.
            </Text>
          )}
        </Animated.View>

        <Pressable onPress={onContinue} hitSlop={8}>
          <View style={styles.cta}>
            {/* glyph-in-pill — the console's signature "press to proceed" beat */}
            <ButtonGlyph button="CROSS" size={17} />
            <Text style={styles.ctaTxt}>{isFinal ? 'RETURN TO THE MAP ›' : 'BACK TO THE MAP ›'}</Text>
          </View>
        </Pressable>

        <Text style={styles.foot}>YOU CANNOT OUTRUN YOUR RECEIPTS.</Text>
      </ScrollView>
    </View>
  );
}

/** the rating with its ascent ring, reused at the climax of the reveal */
function AscentRing({ value, ascent }: { value: number; ascent: number }) {
  const r = 30;
  const C = 2 * Math.PI * r;
  const offset = C * (1 - Math.max(0, Math.min(1, ascent)));
  const color = gradeColor(((value - 60) / 36) * 100);
  const size = (r + 5) * 2;
  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(57,255,106,0.16)" strokeWidth={2.6} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={2.6}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={C}
          strokeDashoffset={offset}
          {...({ transform: `rotate(-90 ${size / 2} ${size / 2})` } as object)}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringNum, { color }]}>{value}</Text>
        <Text style={styles.ringSub}>OVR</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 64 },
  scroll: { paddingHorizontal: 20, paddingBottom: 24, alignItems: 'center' },

  eyebrowWrap: { alignItems: 'center' },
  eyebrow: {
    fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 3.4, color: colors.primary,
    textShadowColor: 'rgba(57,255,106,0.5)', textShadowRadius: 10,
  },

  shaft: {
    position: 'absolute', top: -60, alignSelf: 'center',
    width: 320, height: 420, borderRadius: 60,
    transform: [{ rotate: '-16deg' }],
  },

  sealWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 18, height: 150, width: 150 },
  burst: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    borderWidth: 2, borderColor: colors.primary,
  },

  headline: {
    marginTop: 14, fontFamily: displayFont, fontSize: 32, letterSpacing: 1.5,
    color: colors.fg, textAlign: 'center', textTransform: 'uppercase',
  },
  stageName: {
    marginTop: 7, fontFamily: bodyFontHeavy, fontSize: 14, letterSpacing: 2.6, color: colors.primary, textAlign: 'center', textTransform: 'uppercase',
  },

  attest: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 18, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.32)', borderRadius: 12,
    backgroundColor: 'rgba(15,26,19,0.6)',
  },
  attestAvatar: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(57,255,106,0.5)' },
  attestTxt: { flex: 1, fontFamily: bodyFont, fontSize: 11, lineHeight: 16, letterSpacing: 0.3, color: '#c4d4c8' },

  receiptsCard: {
    width: '100%', marginTop: 18, padding: 14,
    borderWidth: 1.1, borderColor: 'rgba(57,255,106,0.4)', borderRadius: 14,
    backgroundColor: 'rgba(12,20,14,0.9)',
  },
  receiptsTitle: { fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 1.8, color: colors.accent, marginBottom: 10 },
  receiptsEmpty: { fontFamily: bodyFont, fontSize: 11, letterSpacing: 0.5, color: 'rgba(143,184,155,0.6)' },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  receiptLabel: { flex: 1, fontFamily: bodyFontBold, fontSize: 12.5, color: '#cdd9cf' },
  receiptCount: { fontFamily: monoFont, fontSize: 10, fontWeight: '900', letterSpacing: 1, color: colors.primary },

  cardStep: {
    width: '100%', marginTop: 18, padding: 14,
    borderWidth: 1.2, borderColor: 'rgba(57,255,106,0.5)', borderRadius: 14,
    backgroundColor: 'rgba(12,20,14,0.94)', ...glow.held,
  },
  cardStepTag: { fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 1.8, color: colors.muted },
  cardStepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12 },
  cardStepPrev: { alignItems: 'center' },
  cardStepPrevNum: { fontFamily: monoFont, fontSize: 20, fontWeight: '900', color: 'rgba(143,184,155,0.7)' },
  cardStepPrevLbl: { fontFamily: monoFont, fontSize: 8, letterSpacing: 1.4, color: 'rgba(143,184,155,0.5)', marginTop: 2 },
  cardStepArrow: { alignItems: 'center', gap: 2 },
  cardStepDelta: { fontFamily: monoFont, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  cardStepNext: { alignItems: 'center' },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  xpTag: { fontFamily: monoFont, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, color: colors.primary },
  xpAscent: { fontFamily: monoFont, fontSize: 9, letterSpacing: 1, color: colors.muted },

  nextDoor: {
    width: '100%', marginTop: 16, paddingHorizontal: 14, paddingVertical: 11,
    borderLeftWidth: 2, borderLeftColor: colors.accent,
  },
  nextDoorTxt: { fontFamily: bodyFont, fontSize: 11.5, lineHeight: 16.5, letterSpacing: 0.3, color: colors.fg },

  cta: {
    marginTop: 22, height: 50, borderRadius: 25, width: '100%',
    flexDirection: 'row', gap: 8,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.55, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  ctaTxt: { fontFamily: bodyFontHeavy, fontSize: 13, letterSpacing: 2.2, color: '#05130a' },

  foot: { marginTop: 16, fontFamily: monoFont, fontSize: 8.5, letterSpacing: 2.2, color: 'rgba(143,184,155,0.45)' },

  // AscentRing internals
  ringWrap: { alignItems: 'center', justifyContent: 'center', width: 76, height: 76 },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringNum: { fontFamily: monoFont, fontSize: 22, fontWeight: '900' },
  ringSub: { fontFamily: monoFont, fontSize: 5.4, letterSpacing: 1.4, color: colors.muted, marginTop: 1 },
});
