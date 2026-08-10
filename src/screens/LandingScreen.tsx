import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import LogoMark from '../components/LogoMark';
import Marquee from '../components/Marquee';
import PitchStrips from '../components/PitchStrips';
import { useResponsive } from '../hooks/useResponsive';
import { colors, monoFont, displayFont, bodyFont, bodyFontStrong, bodyFontBold } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// THE DOSSIER — ProSeasonAcademy's public door, modelled on a certain
// developer platform's confidence. Same idea, our sport: a football pitch
// of thin green stripes behind everything, mono HUD labels, and copy that
// is sure of itself. The Mirror does not think for you. We're not subtle
// about it. we cooked, yeah we know.
// ─────────────────────────────────────────────────────────────────────────

const WEB = Platform.OS === 'web';
const headFont = WEB ? "'Space Grotesk', 'Barlow', sans-serif" : displayFont;
const bodyFace = WEB ? "'Inter', 'Barlow', sans-serif" : bodyFont;

const ART = {
  heroPortrait: require('../../assets/art/splash-hero.png'),
  heroWide: require('../../assets/art/splash-hero-wide.png'),
  mirror: require('../../assets/art/mirror-drill.jpg'),
  touchline: require('../../assets/art/coach-touchline.jpg'),
};

/* ── small house primitives ── */
function Eyebrow({ children }: { children: string }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

function H2({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <Text style={[styles.h2, WEB ? ({ fontFamily: headFont } as any) : null, center && styles.center]}>
      {children}
    </Text>
  );
}

function Muted({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <Text style={[styles.muted, center && styles.center, WEB ? ({ fontFamily: bodyFace } as any) : null]}>
      {children}
    </Text>
  );
}

/* ── the little self-aware aside pxxl slips under its cards ── */
function Aside({ children }: { children: string }) {
  return <Text style={styles.aside}>// {children}</Text>;
}

function GlassCard({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: object;
}) {
  return <View style={[styles.glassCard, style]}>{children}</View>;
}

/* ── primary CTA — the brand green button ── */
function CtaPrimary({ label, onPress }: { label: string; onPress: () => void }) {
  const hov = useSharedValue(0);
  const s = useAnimatedStyle(() => ({
    transform: [{ translateY: hov.value * -1.5 }],
    boxShadow: `0 0 ${14 + hov.value * 16}px rgba(57,255,106,${0.25 + hov.value * 0.3})`,
  }));
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => (hov.value = withTiming(1, { duration: 160 }))}
      onHoverOut={() => (hov.value = withTiming(0, { duration: 160 }))}
    >
      <Animated.View style={[styles.ctaPrimary, s]}>
        <Text style={styles.ctaPrimaryTxt}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ── secondary CTA — outlined ── */
function CtaSecondary({ label, onPress }: { label: string; onPress: () => void }) {
  const hov = useSharedValue(0);
  const s = useAnimatedStyle(() => ({
    borderColor: `rgba(57,255,106,${0.5 + hov.value * 0.4})`,
  }));
  return (
    <Pressable onPress={onPress} onHoverIn={() => (hov.value = withTiming(1))} onHoverOut={() => (hov.value = withTiming(0))}>
      <Animated.View style={[styles.ctaSecondary, s]}>
        <Text style={styles.ctaSecondaryTxt}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ── sticky nav — pxxl-style: minimal, logo left, links, one CTA ── */
function WebsiteNav({ onEnter, onNav }: { onEnter: () => void; onNav: (id: string) => void }) {
  return (
    <View style={[styles.nav, WEB ? ({ position: 'sticky', top: 0, zIndex: 60 } as any) : null]}>
      <Pressable onPress={onEnter} style={styles.navBrand}>
        <LogoMark size={26} />
        <Text style={styles.navBrandTxt}>PROSEASON ACADEMY</Text>
      </Pressable>
      <View style={styles.navLinks}>
        {[
          ['METHOD', 'method'],
          ['JOURNEY', 'journey'],
          ['EVIDENCE', 'evidence'],
        ].map(([label, id]) => (
          <Pressable key={id} onPress={() => onNav(id)}>
            <Text style={styles.navLink}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.navActions}>
        <Pressable onPress={onEnter}>
          <Text style={styles.navSignIn}>SIGN IN</Text>
        </Pressable>
        <Pressable onPress={onEnter}>
          <View style={styles.navCta}>
            <Text style={styles.navCtaTxt}>GET STARTED</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const CHAPTERS = [
  { n: '01', title: 'PLAY THE MATCH', body: 'Drop in the footage. No setup, no spreadsheet. The session starts the second the whistle does.' },
  { n: '02', title: 'WATCH YOURSELF', body: 'The mirror holds no grudge. You review your own decisions before anyone else gets a word in.' },
  { n: '03', title: 'WRITE THE TRUTH', body: 'Log the error, the intention, the correction. Honesty here is the whole point.' },
  { n: '04', title: 'ONE LESSON', body: 'Every match distils to a single lesson you carry forward. One lesson, earned, is enough.' },
  { n: '05', title: 'REPEAT WITH INTENT', body: 'Next session. Same ritual. The repetition is the training — not the drill, the discipline.' },
  { n: '06', title: 'COMPOUND', body: 'Week over week the ledger fills. Progress stops being a feeling and becomes an entry.' },
];

export default function LandingScreen({ onEnter }: { onEnter: () => void }) {
  const { width: winW, height: winH } = useWindowDimensions();
  const { isWide, isDesktopUp } = useResponsive();
  const contentW = Math.min(winW, isDesktopUp ? 1200 : 900) - (isWide ? 48 : 28) * 2;
  const heroImage = isWide ? ART.heroWide : ART.heroPortrait;

  const ref = useRef<ScrollView>(null);
  const [navH, setNavH] = useState(0);

  // ScrollView on web needs an explicit height — the flex chain alone won't
  // give it one. Measure the sticky nav, then give the scroller the rest.
  const scrollH = Math.max(0, winH - navH);

  // Nav anchor scroll
  const goSection = (id: string) => {
    if (WEB) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const y: Record<string, number> = { method: 900, journey: 1900, evidence: 3000 };
    ref.current?.scrollTo({ y: y[id] ?? 0, animated: true });
  };

  return (
    <View style={styles.root}>
      {/* the living pitch — thin green stripes, pxxl-calm */}
      <PitchStrips dim={0.5} />

      <View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && h !== navH) setNavH(h);
        }}
      >
        <WebsiteNav onEnter={onEnter} onNav={goSection} />
      </View>

      <ScrollView
        ref={ref}
        style={[styles.scroll, { height: scrollH }]}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── HERO ── */}
        <View style={[styles.hero, { minWidth: contentW }]} id="top">
          <Eyebrow>PROSEASON ACADEMY — THE CONSOLE COACHING ACADEMY</Eyebrow>
          <Text style={[styles.h1, WEB ? ({ fontFamily: headFont } as any) : null]}>
            CARRY ONE LESSON.
          </Text>
          <Text style={[styles.h1Alt, WEB ? ({ fontFamily: headFont } as any) : null]}>
            REVIEW THE MATCH.
          </Text>
          <Text style={[styles.heroSub, WEB ? ({ fontFamily: bodyFace } as any) : null]}>
            You play, you watch yourself honestly, you write the truth down — then you
            turn that reflection into disciplined progress, one match at a time. No AI
            telling you what to think. The Mirror records the evidence; you do the seeing.
          </Text>
          <Animated.View entering={FadeInDown.delay(80).duration(600)} style={styles.heroCtas}>
            <CtaPrimary label="START MY MATCH REVIEW" onPress={onEnter} />
            <CtaSecondary label="SEE THE METHOD" onPress={() => goSection('method')} />
          </Animated.View>

          <View style={styles.heroArt}>
            <Image source={heroImage} style={styles.heroImage} resizeMode="cover" />
            <LinearGradient
              style={StyleSheet.absoluteFill}
              colors={['rgba(5,10,6,0)', 'rgba(5,10,6,0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <View style={styles.heroCaption}>
              <Text style={styles.heroCaptionTxt}>THE PLAYER DOES THE SEEING</Text>
              <Text style={styles.heroCaptionSub}>YOUR JOURNEY IS THE EVIDENCE · THE STANDARD IS THE BENCHMARK</Text>
            </View>
          </View>
        </View>

        {/* ── MARQUEE ── */}
        <View style={{ width: '100%', paddingVertical: 22 }}>
          <Marquee pxPerSec={60}>
            <Text style={styles.marqueeTxt}>
              PLAY THE MATCH · WATCH YOURSELF · WRITE THE TRUTH · CARRY ONE LESSON · REPEAT ·
              PLAY THE MATCH · WATCH YOURSELF · WRITE THE TRUTH · CARRY ONE LESSON · REPEAT ·
            </Text>
          </Marquee>
        </View>

        {/* ── THE METHOD ── */}
        <View style={styles.section} id="method">
          <Eyebrow>[ METHOD ]</Eyebrow>
          <H2 center>ESPORTS-GRADE REVIEW, ONE MATCH AT A TIME.</H2>
          <Muted center>
            No subscriptions to judgement. No scoreboard to impress. Just a discipline:
            the match, the mirror, the journal, the next kick.
          </Muted>
          <View style={[styles.cardRow, { maxWidth: contentW }]}>
            <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.card}>
              <GlassCard style={styles.cardFill}>
                <Text style={styles.cardIndex}>01</Text>
                <Text style={styles.cardTitle}>THE MIRROR</Text>
                <Text style={styles.cardBody}>Review your own decisions on the clip, before the noise gets in.</Text>
                <Aside>this was the designer's idea btw</Aside>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(180).duration(600)} style={styles.card}>
              <GlassCard style={styles.cardFill}>
                <Text style={styles.cardIndex}>02</Text>
                <Text style={styles.cardTitle}>THE JOURNAL</Text>
                <Text style={styles.cardBody}>Write the error, the intention, and the correction in one entry.</Text>
                <Aside>we take the truth seriously. deal with it</Aside>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(260).duration(600)} style={styles.card}>
              <GlassCard style={styles.cardFill}>
                <Text style={styles.cardIndex}>03</Text>
                <Text style={styles.cardTitle}>THE LEDGER</Text>
                <Text style={styles.cardBody}>Your progress becomes entries — honest, dated, and yours.</Text>
                <Aside>no fake percentages here</Aside>
              </GlassCard>
            </Animated.View>
          </View>
        </View>

        {/* ── HOW IT WORKS ── */}
        <View style={styles.section} id="how">
          <Eyebrow>[ HOW IT WORKS ]</Eyebrow>
          <H2 center>PLAY → REVIEW → CARRY ONE LESSON FORWARD.</H2>
          <Muted center>Your entire job, compressed to one honest loop.</Muted>
          <View style={[styles.cardRow, { maxWidth: contentW }]}>
            <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.card}>
              <GlassCard style={styles.cardFill}>
                <Text style={styles.cardIndex}>A</Text>
                <Text style={styles.cardTitle}>SET ONE INTENTION</Text>
                <Text style={styles.cardBody}>Before kick-off, name the one thing you're working on.</Text>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(180).duration(600)} style={styles.card}>
              <GlassCard style={styles.cardFill}>
                <Text style={styles.cardIndex}>B</Text>
                <Text style={styles.cardTitle}>ANSWER IN YOUR OWN WORDS</Text>
                <Text style={styles.cardBody}>Half-time and full-time — how it feels, what's happening.</Text>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(260).duration(600)} style={styles.card}>
              <GlassCard style={styles.cardFill}>
                <Text style={styles.cardIndex}>C</Text>
                <Text style={styles.cardTitle}>MARK YOUR MOMENTS</Text>
                <Text style={styles.cardBody}>You pick the key moments. You review them. You compare four versions of your thinking against the evidence.</Text>
              </GlassCard>
            </Animated.View>
          </View>
        </View>

        {/* ── THE JOURNEY ── */}
        <View style={styles.section} id="journey">
          <Eyebrow>[ THE JOURNEY ]</Eyebrow>
          <H2 center>SIX CHAPTERS, EARNED.</H2>
          <Muted center>Your journey — control yourself. Each chapter builds the one after it.</Muted>
          <View style={[styles.cardRow, { maxWidth: contentW }]}>
            {CHAPTERS.map((c, i) => (
              <Animated.View key={c.n} entering={FadeInDown.delay(100 + i * 70).duration(600)} style={styles.chapterCard}>
                <GlassCard style={styles.cardFill}>
                  <Text style={styles.chapterNum}>{c.n}</Text>
                  <Text style={styles.cardTitle}>{c.title}</Text>
                  <Text style={styles.cardBody}>{c.body}</Text>
                </GlassCard>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* ── EVIDENCE ── */}
        <View style={styles.section} id="evidence">
          <Eyebrow>[ EVIDENCE ]</Eyebrow>
          <H2 center>YOUR EVIDENCE MOVES YOU.</H2>
          <View style={[styles.cardRow, { maxWidth: contentW }]}>
            <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.evidenceCard}>
              <GlassCard style={[styles.cardFill, styles.evidenceInner]}>
                <Text style={styles.evidenceStat}>100%</Text>
                <Text style={[styles.cardBody, styles.center]}>of the review is yours. You see it, you name it, you keep it.</Text>
                <Aside>no AI verdicts</Aside>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(180).duration(600)} style={styles.evidenceCard}>
              <GlassCard style={[styles.cardFill, styles.evidenceInner]}>
                <Text style={styles.evidenceStat}>1×</Text>
                <Text style={[styles.cardBody, styles.center]}>lesson per match. One lesson, earned, carried into the next.</Text>
                <Aside>one is enough. we mean it</Aside>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(260).duration(600)} style={styles.evidenceCard}>
              <GlassCard style={[styles.cardFill, styles.evidenceInner]}>
                <Text style={styles.evidenceStat}>∞</Text>
                <Text style={[styles.cardBody, styles.center]}>the loop keeps compounding. Progress becomes an entry, then a habit.</Text>
                <Aside>you cannot outrun your receipts</Aside>
              </GlassCard>
            </Animated.View>
          </View>
        </View>

        {/* ── CTA ── */}
        <View style={[styles.ctaBanner, { maxWidth: contentW }]}>
          <Eyebrow>CLAIM YOUR SEAT</Eyebrow>
          <Text style={[styles.ctaHead, WEB ? ({ fontFamily: headFont } as any) : null]}>
            THE SEASON STARTS AT THE MIRROR.
          </Text>
          <Muted center>
            One coach, locked permanently. One standard. One thousand seats — when it's
            full, it's full. Sign in, lock in your coach, and get your baseline week sorted.
          </Muted>
          <View style={styles.heroCtas}>
            <CtaPrimary label="CLAIM YOUR SEAT" onPress={onEnter} />
            <CtaSecondary label="I ALREADY HAVE AN ACCOUNT" onPress={onEnter} />
          </View>
          <Aside>all of this, no hidden fees</Aside>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>PROSEASON ACADEMY</Text>
          <Text style={styles.footerTag}>THE CONSOLE COACHING ACADEMY · REVIEW ONE MATCH AT A TIME</Text>
          <Text style={styles.footerNote}>we cooked, yeah we know · © {new Date().getFullYear()} ProSeason Academy</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  scroll: {
    flexShrink: 1,
  },
  scrollInner: {
    paddingBottom: 40,
  },
  eyebrow: {
    fontFamily: monoFont,
    fontSize: 10.5,
    letterSpacing: 3.4,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  center: {
    textAlign: 'center',
  },
  h2: {
    fontFamily: displayFont,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0.5,
    color: colors.fg,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  muted: {
    fontFamily: bodyFont,
    fontSize: 16,
    lineHeight: 25,
    color: colors.muted,
    marginBottom: 28,
    maxWidth: 620,
  },
  aside: {
    fontFamily: monoFont,
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.primaryDim,
    marginTop: 12,
    opacity: 0.85,
  },
  glassCard: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 16,
    padding: 22,
  },
  cardFill: {
    height: '100%',
  },
  cardIndex: {
    fontFamily: monoFont,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primaryDim,
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: bodyFontStrong,
    fontSize: 15,
    letterSpacing: 1.5,
    color: colors.fg,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  cardBody: {
    fontFamily: bodyFont,
    fontSize: 14.5,
    lineHeight: 22,
    color: colors.muted,
  },
  ctaPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 26,
    borderRadius: 999,
    alignItems: 'center',
  },
  ctaPrimaryTxt: {
    fontFamily: bodyFontBold,
    fontSize: 13.5,
    letterSpacing: 1.5,
    color: '#03140a',
    textTransform: 'uppercase',
  },
  ctaSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.5)',
    paddingVertical: 15,
    paddingHorizontal: 26,
    borderRadius: 999,
    alignItems: 'center',
  },
  ctaSecondaryTxt: {
    fontFamily: bodyFontBold,
    fontSize: 13.5,
    letterSpacing: 1.5,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: 'rgba(5,10,6,0.82)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navBrandTxt: {
    fontFamily: bodyFontBold,
    fontSize: 13,
    letterSpacing: 2,
    color: colors.fg,
  },
  navLinks: {
    flexDirection: 'row',
    gap: 24,
  },
  navLink: {
    fontFamily: monoFont,
    fontSize: 10.5,
    letterSpacing: 2,
    color: colors.muted,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  navSignIn: {
    fontFamily: bodyFontStrong,
    fontSize: 12,
    letterSpacing: 1.5,
    color: colors.muted,
  },
  navCta: {
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  navCtaTxt: {
    fontFamily: bodyFontBold,
    fontSize: 11,
    letterSpacing: 1.3,
    color: '#03140a',
  },
  hero: {
    alignSelf: 'center',
    paddingTop: 70,
    paddingHorizontal: 28,
  },
  h1: {
    fontFamily: displayFont,
    fontSize: 66,
    lineHeight: 66,
    letterSpacing: 1,
    color: colors.fg,
    textTransform: 'uppercase',
  },
  h1Alt: {
    fontFamily: displayFont,
    fontSize: 66,
    lineHeight: 66,
    letterSpacing: 1,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 18,
  },
  heroSub: {
    fontFamily: bodyFont,
    fontSize: 18,
    lineHeight: 28,
    color: colors.muted,
    maxWidth: 640,
    marginBottom: 34,
  },
  heroCtas: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  heroArt: {
    marginTop: 46,
    height: 340,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroCaption: {
    position: 'absolute',
    left: 20,
    bottom: 18,
    right: 20,
  },
  heroCaptionTxt: {
    fontFamily: bodyFontBold,
    fontSize: 15,
    letterSpacing: 2,
    color: colors.fg,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroCaptionSub: {
    fontFamily: monoFont,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.muted,
  },
  marqueeTxt: {
    fontFamily: bodyFontBold,
    fontSize: 14,
    letterSpacing: 3,
    color: colors.primary,
  },
  section: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 64,
  },
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    justifyContent: 'center',
    width: '100%',
  },
  card: {
    flexBasis: 250,
    flexGrow: 1,
  },
  chapterCard: {
    flexBasis: 250,
    flexGrow: 1,
  },
  chapterNum: {
    fontFamily: displayFont,
    fontSize: 26,
    color: colors.primary,
    marginBottom: 8,
  },
  evidenceCard: {
    flexBasis: 250,
    flexGrow: 1,
  },
  evidenceInner: {
    alignItems: 'center',
  },
  evidenceStat: {
    fontFamily: displayFont,
    fontSize: 44,
    color: colors.primary,
    marginBottom: 10,
  },
  ctaBanner: {
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginVertical: 48,
  },
  ctaHead: {
    fontFamily: displayFont,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: 1,
    color: colors.fg,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 14,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  footerBrand: {
    fontFamily: bodyFontBold,
    fontSize: 14,
    letterSpacing: 3,
    color: colors.fg,
    marginBottom: 8,
  },
  footerTag: {
    fontFamily: monoFont,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.muted,
    marginBottom: 14,
  },
  footerNote: {
    fontFamily: bodyFont,
    fontSize: 12,
    color: colors.mutedDim,
  },
});
