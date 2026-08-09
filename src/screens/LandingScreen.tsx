import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import LogoMark from '../components/LogoMark';
import CoachCard from '../components/CoachCard';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { useHover } from '../hooks/useHover';
import { COACHES } from '../data/coaches';
import * as backend from '../data/backend';
import { useResponsive } from '../hooks/useResponsive';
import {
  colors,
  monoFont,
  displayFont,
  bodyFont,
  bodyFontItalic,
  bodyFontStrong,
  bodyFontBold,
  bodyFontHeavy,
  radii,
} from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// THE DOSSIER — the academy's public door. Sits between the splash and the
// sign-in portal: it sells the vision, the psychology, the baseline week
// and everything inside the app, in the same broadcast-esports register as
// the splash. One CTA: claim your seat and get the baseline sorted.
// ─────────────────────────────────────────────────────────────────────────

const ART = {
  heroWide: require('../../assets/art/splash-hero-wide.png'),
  heroPortrait: require('../../assets/art/splash-hero.png'),
  mirror: require('../../assets/art/mirror-drill.jpg'),
  boots: require('../../assets/art/scan-boots.jpg'),
  tunnel: require('../../assets/art/journey-tunnel.jpg'),
  vault: require('../../assets/art/vault-match.jpg'),
  huddle: require('../../assets/art/community-huddle.jpg'),
  touchline: require('../../assets/art/coach-touchline.jpg'),
  pitch: require('../../assets/art/home-pitch.png'),
};

/** Scroll-gated entrance — pure worklets, no re-renders. Each gate knows
    its own offset in the scroll content and resolves as it enters view. */
function Gate({
  scrollY,
  children,
  style,
}: {
  scrollY: SharedValue<number>;
  children?: React.ReactNode;
  style?: any;
}) {
  const y = useSharedValue(1e9);
  // effective viewport (already scaled on TV/desktop zoom tiers)
  const { h: vh } = useResponsive();
  const s = useAnimatedStyle(() => {
    const start = y.value - vh * 0.94;
    const end = y.value - vh * 0.62;
    const p = Math.min(1, Math.max(0, (scrollY.value - start) / (end - start || 1)));
    const e = 1 - Math.pow(1 - p, 3);
    return { opacity: e, transform: [{ translateY: (1 - e) * 26 }] };
  });
  return (
    <Animated.View
      style={[s, style]}
      onLayout={(ev) => {
        const ny = ev.nativeEvent.layout.y;
        if (Math.abs(ny - y.value) > 1) y.value = ny;
      }}
    >
      {children}
    </Animated.View>
  );
}

function SectionHead({
  eyebrow,
  title,
  sub,
  center,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  center?: boolean;
}) {
  return (
    <View style={center && styles.center}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={[styles.h2, center && styles.centerTxt]}>{title}</Text>
      {!!sub && <Text style={[styles.sectionSub, center && styles.centerTxt]}>{sub}</Text>}
      <LinearGradient
        colors={[colors.primary, colors.accent, 'rgba(242,192,120,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headRule}
      />
    </View>
  );
}

/** Photograph with a scrim + ledger caption — the dossier's illustrations. */
function ArtPanel({ source, caption, height = 240 }: { source: any; caption: string; height?: number }) {
  return (
    <View style={[styles.artPanel, { height }]}>
      <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(5,10,6,0)', 'rgba(5,10,6,0.55)', 'rgba(5,10,6,0.92)']}
        start={{ x: 0, y: 0.25 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.artCaption}>{caption}</Text>
    </View>
  );
}

function CtaButton({ label, onPress, ghost }: { label: string; onPress: () => void; ghost?: boolean }) {
  const { hovered, bind } = useHover();
  const hov = useSharedValue(0);
  useEffect(() => {
    hov.value = withTiming(hovered ? 1 : 0, { duration: 160 });
  }, [hovered, hov]);
  const s = useAnimatedStyle(() => ({
    transform: [{ translateY: -2 * hov.value }],
    shadowOpacity: 0.35 + hov.value * 0.3,
    shadowRadius: 16 + hov.value * 10,
  }));
  return (
    <Pressable onPress={onPress} accessibilityRole="button" {...bind}>
      <Animated.View
        {...({ className: ghost ? undefined : 'psa-cta-sweep' } as any)}
        style={[ghost ? styles.ctaGhost : styles.cta, s]}
      >
        {!ghost && (
          <LinearGradient
            colors={['#39ff6a', '#7dff5c', '#c6ff3c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Text style={ghost ? styles.ctaGhostTxt : styles.ctaTxt}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** The sealed baseline card, exactly as a member earns one. */
function BaselineMock() {
  return (
    <View style={styles.mockCard}>
      <View style={styles.mockHead}>
        <Text style={styles.mockTag}>STARTING BASELINE</Text>
        <View style={styles.mockPill}>
          <Text style={styles.mockPillTxt}>SEALED ✓</Text>
        </View>
      </View>
      <Text style={styles.mockTier}>TIER III · APPRENTICE</Text>
      <Text style={styles.mockMeta}>3W · 1D · 1L · HEAD 3.4/5</Text>
      <View style={styles.mockBars}>
        {[
          ['COMPOSURE', 0.68],
          ['POSITIONING', 0.54],
          ['HONESTY WEIGHT', 0.92],
        ].map(([label, v]) => (
          <View key={label as string} style={styles.mockBarRow}>
            <Text style={styles.mockBarLbl}>{label as string}</Text>
            <View style={styles.mockBarTrack}>
              <LinearGradient
                colors={['#39ff6a', '#2be05a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.mockBarFill, { width: `${Math.round((v as number) * 100)}%` }]}
              />
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.mockRead}>
        “You win when nothing is happening. You lose the moment something does. That is the whole
        story — and it is fixable.”
      </Text>
      <Text style={styles.mockFoot}>COACH C. OKAFOR · THE BENCHMARK FOR YOUR SIX MONTHS</Text>
    </View>
  );
}

export default function LandingScreen({ onEnter }: { onEnter: () => void }) {
  const { isMultiColumn, isLaptopUp, w: winW, h: winH } = useResponsive();
  const wide = winW > winH * 1.05;
  const scrollY = useSharedValue(0);
  const [seats, setSeats] = useState<backend.SeasonGate | null>(null);
  const { loopProps, glowStyle } = useTrailLoop({ pathLength: 260, drawMs: 1800, eraseMs: 1800 });

  useEffect(() => {
    void backend.liveSeatCount().then((s) => {
      if (s) setSeats(s);
    });
  }, []);

  const coach = COACHES[0];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        onScroll={(e) => {
          scrollY.value = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {/* ── HERO — the arena, the claim, the door ── */}
        <View style={[styles.hero, { height: Math.max(620, winH * 0.96) }]}>
          <Image
            source={wide ? ART.heroWide : ART.heroPortrait}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(5,10,6,0.55)', 'rgba(5,10,6,0.15)', 'rgba(5,10,6,0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(5,10,6,0.8)', 'rgba(5,10,6,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.25 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.heroInner}>
            <View style={[styles.heroCopy, wide && styles.heroCopyCenter]}>
              <View style={styles.heroCrest}>
                <LogoMark size={44} loopProps={loopProps} glowStyle={glowStyle} />
              </View>
              <Text style={styles.heroEyebrow}>SEASON ONE · 1,000 SEATS · FC CONSOLE PLAYERS</Text>
              <Text style={styles.heroTitle}>THE GAME REMEMBERS WHAT YOU REFUSE TO.</Text>
              <Text style={styles.heroSub}>
                ProSeason Academy is a six-month match-review practice for serious FC players. One
                real match at a time, your own evidence becomes the one lesson you carry into the
                next game.
              </Text>

              {seats && (
                <View style={styles.seatRow}>
                  <View style={styles.seatDot} />
                  <Text style={styles.seatTxt}>
                    {seats.taken.toLocaleString('en-US')} / {seats.cap.toLocaleString('en-US')} SEATS
                    CLAIMED
                  </Text>
                </View>
              )}

              <View style={[styles.ctaRow, wide && styles.ctaRowCenter]}>
                <CtaButton label="CLAIM YOUR SEAT ›" onPress={onEnter} />
                <CtaButton label="ALREADY A MEMBER? SIGN IN" ghost onPress={onEnter} />
              </View>
              <Text style={styles.heroFine}>
                NO TIPS FEED · NO LOOTBOXES · NO PAINTED PERCENTAGES — JUST RECEIPTS
              </Text>
            </View>
          </View>
        </View>

        {/* ── 01 · THE PSYCHOLOGY ── */}
        <Gate scrollY={scrollY}>
          <View style={styles.container}>
            <SectionHead
              eyebrow="01 · THE PSYCHOLOGY"
              title={"YOU'RE NOT LOSING TO THE GAME. YOU'RE LOSING TO YOUR MEMORY."}
            />
            <View style={[styles.cols, isMultiColumn && styles.colsWide]}>
              <View style={styles.colText}>
                <Text style={styles.body}>
                  Every player remembers the referee's mistake, the lag, the teammate who drifted.
                  Nobody remembers their own panic clearance in the 61st minute. The brain protects
                  the ego — and the ego loses the same match every single week.
                </Text>
                <Text style={styles.body}>
                  So the academy does not coach you with secrets. It builds a structure that makes
                  it difficult to keep giving yourself convenient answers. You play. You review the
                  tape of your own choices. You carry one honest lesson forward. That is the entire
                  machine.
                </Text>
                <View style={styles.pullBox}>
                  <Text style={styles.pull}>
                    “We cannot make you better. We can only help you see yourself clearly enough to
                    do the work yourself.”
                  </Text>
                  <Text style={styles.pullSrc}>— THE ACADEMY STANDARD</Text>
                </View>
              </View>
              <View style={styles.colArt}>
                <ArtPanel
                  source={ART.mirror}
                  caption="THE MIRROR DRILL · YOU ARE THE OPPOSITION SCOUT"
                  height={isMultiColumn ? 380 : 240}
                />
              </View>
            </View>
          </View>
        </Gate>

        {/* ── 02 · THE LOOP ── */}
        <Gate scrollY={scrollY}>
          <View style={styles.container}>
            <SectionHead
              eyebrow="02 · THE RITUAL"
              title="PLAY. REVIEW. CARRY ONE LESSON."
              sub="Three moves. Repeated for six months. This is the whole product — everything else exists to protect it."
            />
            <View style={[styles.loopGrid, isMultiColumn && styles.rowWrap]}>
              {[
                [
                  'BEFORE KICK-OFF',
                  'Choose one focus. Just one. Composure, first touch, positioning — one thing your next 90 minutes will be about.',
                ],
                [
                  'AFTER THE WHISTLE',
                  'Save the score. Name the turning point in your own words, in match minutes. Write the one lesson it taught you.',
                ],
                [
                  'NEXT MATCH',
                  'Walk in carrying that single lesson. Everything else stays in the locker room until the receipts say otherwise.',
                ],
              ].map(([t, b], i) => (
                <View key={t} style={[styles.loopCard, isMultiColumn && styles.loopCardWide]}>
                  <Text style={styles.loopNum}>0{i + 1}</Text>
                  <Text style={styles.loopTitle}>{t}</Text>
                  <Text style={styles.loopBody}>{b}</Text>
                </View>
              ))}
            </View>
          </View>
        </Gate>

        {/* ── 03 · THE BASELINE WEEK ── */}
        <Gate scrollY={scrollY}>
          <View style={styles.container}>
            <SectionHead
              eyebrow="03 · BEFORE YOU START"
              title="YOUR STARTING 5-MATCH BASELINE"
              sub="No rankings, no guesswork. Before your season begins, you seal five recent real matches into evidence — and that card becomes the you that six months is measured against."
            />
            <View style={[styles.cols, isMultiColumn && styles.colsWide]}>
              <View style={styles.colText}>
                {[
                  [
                    'LOG FIVE REAL MATCHES',
                    'Result, and your head-score: composure out of 5. Not the rating the game gave you — the rating your choices earned.',
                  ],
                  [
                    'NAME THE MOMENT',
                    'The turning point, in your own words, tagged and timed in match minutes. The scan never hands you the lesson — it forces you to reason your way to it.',
                  ],
                  [
                    'THE HONESTY GUARD',
                    '“idk”, gibberish and copied answers are rejected. Your words are required, because your words are the evidence.',
                  ],
                  [
                    'THE CARD SEALS',
                    'Tier, record, head-score and the coach’s read — sealed. You cannot outrun your receipts, and you never have to compare them to anyone else’s.',
                  ],
                ].map(([t, b]) => (
                  <View key={t} style={styles.baseRow}>
                    <View style={styles.baseTick} />
                    <View style={styles.baseCopy}>
                      <Text style={styles.baseTitle}>{t}</Text>
                      <Text style={styles.baseBody}>{b}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.colArt}>
                <BaselineMock />
                <View style={styles.mockGap} />
                <ArtPanel source={ART.boots} caption="EVIDENCE FIRST · ADVICE SECOND" height={200} />
              </View>
            </View>
          </View>
        </Gate>

        {/* ── 04 · WHAT'S INSIDE ── */}
        <Gate scrollY={scrollY}>
          <View style={styles.container}>
            <SectionHead
              eyebrow="04 · THE PLATFORM"
              title="EVERYTHING IN YOUR LOCKER"
              sub="Eight workspaces, one purpose: make the honest review the easiest path."
            />
            <View style={[styles.featGrid, isMultiColumn && styles.rowWrap]}>
              {[
                ['TODAY', 'One mission a day. Nothing shouts above your next match review.'],
                ['180-DAY TRACK', 'Six months, one honest day at a time. Days unlock on real time — and the clock waits when life happens.'],
                ['EVIDENCE & CHECKPOINTS', 'Upload your post-match stats screens. The academy reads them and your development card grows from receipts.'],
                ['MATCH VAULT', 'Every score, every review, every receipt — your history, searchable forever.'],
                ['LOSS NOTES', 'Brief notes on losses and repeated mistakes. Where patterns go to be seen, not hidden.'],
                ['THE STANDARD', 'Role model stories. Calm defending, clean composure — the benchmark, never the hype.'],
                ['CLUBHOUSE', 'Optional community. Bring a question, a score, or an honest lesson.'],
                ['YOUR COACH', 'One permanent voice for your whole season. He holds the benchmark and tells you the truth.'],
              ].map(([t, b]) => (
                <View key={t} style={[styles.featCard, isMultiColumn && styles.featCardWide]}>
                  <LinearGradient
                    colors={['rgba(57,255,106,0.5)', 'rgba(57,255,106,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.featHair}
                  />
                  <Text style={styles.featTitle}>{t}</Text>
                  <Text style={styles.featBody}>{b}</Text>
                </View>
              ))}
            </View>
            <View style={styles.artRow}>
              <View style={styles.artHalf}>
                <ArtPanel source={ART.tunnel} caption="THE 180-DAY TUNNEL · DISCIPLINE OVER RUSH" height={220} />
              </View>
              <View style={styles.artHalf}>
                <ArtPanel source={ART.vault} caption="THE VAULT · RECEIPTS NEVER LIE" height={220} />
              </View>
            </View>
          </View>
        </Gate>

        {/* ── 05 · THE LAW ── */}
        <Gate scrollY={scrollY}>
          <View style={styles.container}>
            <SectionHead eyebrow="05 · THE ACADEMY LAW" title="SIX RULES. NO EXCEPTIONS." />
            <View style={[styles.lawGrid, isMultiColumn && styles.rowWrap]}>
              {[
                ['EVIDENCE BEFORE ADVICE', 'The machine records. The player does the seeing. Tips are optional garnish, never the meal.'],
                ['YOUR WORDS ARE REQUIRED', 'No AI-written lessons, no multiple-choice psychology. If you cannot say it, you have not learned it.'],
                ['PROGRESS IS EARNED FROM RECEIPTS', 'Reading, watching and tapping is not improvement. Stages clear only when the evidence says the work was done.'],
                ['LATENESS IS NEVER PUNISHED', 'Miss a week, a month, a season of life — the program pauses and waits. Guilt is not a coaching tool.'],
                ['NOTHING IS PAINTED ON', 'Every number is a graded ledger entry. If a readout glows green, the evidence holds — it was never decorated.'],
                ['ONE LESSON, CARRIED', 'Because three lessons are zero lessons. The academy optimises for the thing you actually do next match.'],
              ].map(([t, b], i) => (
                <View key={t} style={[styles.lawCard, isMultiColumn && styles.lawCardWide]}>
                  <Text style={styles.lawNum}>{String(i + 1).padStart(2, '0')}</Text>
                  <Text style={styles.lawTitle}>{t}</Text>
                  <Text style={styles.lawBody}>{b}</Text>
                </View>
              ))}
            </View>
          </View>
        </Gate>

        {/* ── 06 · THE COACH ── */}
        <Gate scrollY={scrollY}>
          <View style={styles.container}>
            <SectionHead
              eyebrow="06 · YOUR PERMANENT COACH"
              title="ONE VOICE IN YOUR CORNER FOR SIX MONTHS"
              sub="No swapping, no resets. The lock is the point — a benchmark only means something if it stays."
            />
            <View style={[styles.cols, isMultiColumn && styles.colsWide]}>
              <View style={styles.colArt}>
                <ArtPanel source={ART.touchline} caption="COACH CHINEDU OKAFOR · ON THE TOUCHLINE" height={260} />
              </View>
              <View style={styles.colText}>
                <CoachCard coach={coach} width={isMultiColumn ? 320 : 280} />
                <View style={styles.benchBox}>
                  <Text style={styles.benchTag}>WHAT GOOD LOOKS LIKE</Text>
                  <Text style={styles.benchBody}>
                    Calm when the game gets chaotic. Clean defending with zero panic clearances.
                    Winning through habits and patience, not lucky bounces. That is the standard you
                    are climbing toward — and the standard your receipts are read against.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Gate>

        {/* ── FINAL CTA ── */}
        <Gate scrollY={scrollY}>
          <View style={styles.finalWrap}>
            <Image source={ART.pitch} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <LinearGradient
              colors={['rgba(5,10,6,0.86)', 'rgba(5,10,6,0.62)', 'rgba(5,10,6,0.94)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.finalInner}>
              <Text style={styles.finalEyebrow}>SEASON ONE · 1,000 SEATS · ONE LOCKED COACH</Text>
              <Text style={styles.finalTitle}>
                SIX MONTHS FROM NOW, YOU EITHER HAVE RECEIPTS — OR EXCUSES.
              </Text>
              <Text style={styles.finalSub}>
                Claim your seat, seal your five-match baseline, and let the work stack. The next
                match is the only one you can work on.
              </Text>
              <View style={styles.ctaRowCenter}>
                <CtaButton label="CLAIM YOUR SEAT — GET THE BASELINE SORTED ›" onPress={onEnter} />
              </View>
              {seats && (
                <Text style={styles.finalSeats}>
                  {seats.cap - seats.taken} SEATS REMAINING IN SEASON ONE
                </Text>
              )}
            </View>
          </View>
        </Gate>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <Text style={styles.footerTxt}>PROSEASON ACADEMY · THE CONSOLE COACHING ACADEMY</Text>
          <Text style={styles.footerTxt}>PLAY → REVIEW → CARRY ONE LESSON FORWARD</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center' },
  centerTxt: { textAlign: 'center' },

  container: {
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 56,
  },

  eyebrow: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2.4,
    color: colors.primary,
  },
  h2: {
    marginTop: 10,
    fontFamily: displayFont,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: 0.6,
    color: colors.fg,
    maxWidth: 760,
  },
  sectionSub: {
    marginTop: 10,
    fontFamily: bodyFont,
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    maxWidth: 680,
  },
  headRule: { width: 56, height: 2, marginTop: 16, borderRadius: 1 },

  cols: { flexDirection: 'column', gap: 24, marginTop: 28 },
  colsWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 40 },
  colText: { flex: 1.2, gap: 14 },
  colArt: { flex: 1, maxWidth: 520 },

  body: {
    fontFamily: bodyFont,
    fontSize: 14.5,
    lineHeight: 23,
    color: 'rgba(238,242,236,0.88)',
  },
  pullBox: {
    marginTop: 8,
    padding: 18,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.35)',
    backgroundColor: 'rgba(242,192,120,0.06)',
  },
  pull: {
    fontFamily: bodyFontItalic,
    fontSize: 16,
    lineHeight: 25,
    color: colors.accent,
  },
  pullSrc: {
    marginTop: 8,
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 2,
    color: 'rgba(242,192,120,0.75)',
  },

  artPanel: { borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(57,255,106,0.16)' },
  artCaption: {
    position: 'absolute',
    left: 14,
    bottom: 12,
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.8,
    color: 'rgba(238,242,236,0.85)',
  },

  rowWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  loopGrid: { flexDirection: 'column', gap: 14, marginTop: 28 },
  loopCard: {
    flex: 1,
    padding: 20,
    borderRadius: radii.md,
    backgroundColor: 'rgba(12,20,14,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.18)',
  },
  loopCardWide: { maxWidth: 380 },
  loopNum: {
    fontFamily: displayFont,
    fontSize: 30,
    color: 'rgba(57,255,106,0.85)',
  },
  loopTitle: {
    marginTop: 8,
    fontFamily: bodyFontHeavy,
    fontSize: 13,
    letterSpacing: 1.6,
    color: colors.fg,
  },
  loopBody: {
    marginTop: 8,
    fontFamily: bodyFont,
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },

  baseRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  baseTick: {
    width: 8,
    height: 8,
    marginTop: 6,
    borderRadius: 2,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  baseCopy: { flex: 1 },
  baseTitle: {
    fontFamily: bodyFontHeavy,
    fontSize: 12.5,
    letterSpacing: 1.4,
    color: colors.fg,
  },
  baseBody: {
    marginTop: 4,
    fontFamily: bodyFont,
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },

  mockCard: {
    padding: 20,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(20,18,10,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  mockHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mockTag: { fontFamily: monoFont, fontSize: 8, fontWeight: '900', letterSpacing: 1.6, color: colors.accent },
  mockPill: { backgroundColor: colors.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  mockPillTxt: { fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', color: '#07110a' },
  mockTier: { marginTop: 10, fontFamily: displayFont, fontSize: 26, color: colors.fg },
  mockMeta: { marginTop: 4, fontFamily: monoFont, fontSize: 8.5, letterSpacing: 1.2, color: colors.muted },
  mockBars: { marginTop: 14, gap: 8 },
  mockBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mockBarLbl: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '800', letterSpacing: 1.2, color: colors.muted, width: 92 },
  mockBarTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(57,255,106,0.12)', overflow: 'hidden' },
  mockBarFill: { height: '100%', borderRadius: 3 },
  mockRead: {
    marginTop: 14,
    fontFamily: bodyFontItalic,
    fontSize: 12.5,
    lineHeight: 19,
    color: '#d6e2d9',
  },
  mockFoot: { marginTop: 10, fontFamily: monoFont, fontSize: 6.5, fontWeight: '800', letterSpacing: 1.4, color: 'rgba(143,184,155,0.6)' },
  mockGap: { height: 14 },

  featGrid: { flexDirection: 'column', gap: 12, marginTop: 28 },
  featCard: {
    position: 'relative',
    padding: 18,
    borderRadius: radii.md,
    backgroundColor: 'rgba(12,20,14,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.16)',
    overflow: 'hidden',
    flex: 1,
  },
  featCardWide: { maxWidth: '48.5%' as any },
  featHair: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  featTitle: { fontFamily: bodyFontHeavy, fontSize: 12.5, letterSpacing: 1.6, color: colors.primary },
  featBody: { marginTop: 6, fontFamily: bodyFont, fontSize: 12.5, lineHeight: 19, color: colors.muted },

  artRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 },
  artHalf: { flex: 1, minWidth: 280 },

  lawGrid: { flexDirection: 'column', gap: 12, marginTop: 28 },
  lawCard: {
    padding: 18,
    borderRadius: radii.md,
    backgroundColor: 'rgba(12,20,14,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.16)',
    flex: 1,
  },
  lawCardWide: { maxWidth: '48.5%' as any },
  lawNum: { fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 2, color: colors.accent },
  lawTitle: { marginTop: 6, fontFamily: bodyFontHeavy, fontSize: 12.5, letterSpacing: 1.4, color: colors.fg },
  lawBody: { marginTop: 6, fontFamily: bodyFont, fontSize: 12.5, lineHeight: 19, color: colors.muted },

  benchBox: {
    marginTop: 14,
    padding: 16,
    borderRadius: radii.md,
    backgroundColor: 'rgba(242,192,120,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.25)',
  },
  benchTag: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.6, color: colors.accent },
  benchBody: { marginTop: 6, fontFamily: bodyFont, fontSize: 13, lineHeight: 20, color: 'rgba(238,242,236,0.85)' },

  // ── hero ──
  hero: { position: 'relative', overflow: 'hidden' },
  heroInner: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 60,
  },
  heroCopy: { maxWidth: 720 },
  heroCopyCenter: { alignSelf: 'center', alignItems: 'center' },
  heroCrest: { marginBottom: 16 },
  heroEyebrow: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2.6,
    color: colors.accent,
  },
  heroTitle: {
    marginTop: 12,
    fontFamily: displayFont,
    fontSize: 54,
    lineHeight: 54,
    letterSpacing: 1,
    color: colors.fg,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 16,
  },
  heroSub: {
    marginTop: 14,
    fontFamily: bodyFont,
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(238,242,236,0.88)',
    maxWidth: 620,
  },
  seatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  seatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  seatTxt: { fontFamily: monoFont, fontSize: 10, fontWeight: '900', letterSpacing: 1.8, color: colors.primary },
  ctaRow: { flexDirection: 'row', gap: 12, marginTop: 24, flexWrap: 'wrap' },
  ctaRowCenter: { justifyContent: 'center' },
  heroFine: {
    marginTop: 18,
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: 'rgba(143,184,155,0.7)',
  },

  cta: {
    height: 54,
    minWidth: 240,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 26,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  ctaTxt: { fontFamily: bodyFontHeavy, fontSize: 13, letterSpacing: 2, color: '#07130b' },
  ctaGhost: {
    height: 54,
    minWidth: 200,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.35)',
    backgroundColor: 'rgba(10,15,10,0.55)',
  },
  ctaGhostTxt: { fontFamily: bodyFontHeavy, fontSize: 11.5, letterSpacing: 1.8, color: colors.muted },

  finalWrap: { position: 'relative', overflow: 'hidden', paddingVertical: 90 },
  finalInner: { width: '100%', maxWidth: 900, alignSelf: 'center', alignItems: 'center', paddingHorizontal: 24 },
  finalEyebrow: { fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 2.6, color: colors.accent },
  finalTitle: {
    marginTop: 14,
    fontFamily: displayFont,
    fontSize: 42,
    lineHeight: 44,
    letterSpacing: 0.8,
    color: colors.fg,
    textAlign: 'center',
  },
  finalSub: {
    marginTop: 14,
    fontFamily: bodyFont,
    fontSize: 14.5,
    lineHeight: 23,
    color: 'rgba(238,242,236,0.85)',
    textAlign: 'center',
    maxWidth: 640,
  },
  finalSeats: {
    marginTop: 16,
    fontFamily: monoFont,
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 2,
    color: colors.primary,
  },

  footer: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(57,255,106,0.12)',
  },
  footerTxt: { fontFamily: monoFont, fontSize: 7.5, letterSpacing: 2.2, color: 'rgba(143,184,155,0.5)' },
});
