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
import Animated, { FadeInDown } from 'react-native-reanimated';
import InfinityCrest from '../components/InfinityCrest';
import Marquee from '../components/Marquee';
import PitchBackdrop from '../components/PitchBackdrop';
import Hero from '../components/Hero';
import { CtaPrimary, CtaSecondary } from '../components/CtaButtons';
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

// 3D esports/EAFC illustrations for the section cards
const ILLUS = {
  mirror: require('../../assets/art/illu-mirror.png'),
  journal: require('../../assets/art/illu-journal.png'),
  ledger: require('../../assets/art/illu-ledger.png'),
  intention: require('../../assets/art/illu-intention.png'),
  moments: require('../../assets/art/illu-moments.png'),
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

/* ── sticky nav — minimal: logo left, /-separated links centre, one CTA ── */
function WebsiteNav({
  onEnter,
  onNav,
  showLinks,
}: {
  onEnter: () => void;
  onNav: (id: string) => void;
  showLinks: boolean;
}) {
  const links: [string, string][] = [
    ['METHOD', 'method'],
    ['JOURNEY', 'journey'],
    ['EVIDENCE', 'evidence'],
  ];
  return (
    <View style={[styles.nav, WEB ? ({ position: 'sticky', top: 0, zIndex: 60 } as any) : null]}>
      <Pressable onPress={onEnter} style={styles.navBrand}>
        <InfinityCrest size={26} />
        <Text style={styles.navBrandTxt}>PROSEASON ACADEMY</Text>
      </Pressable>
      {showLinks && (
        <View style={styles.navLinks}>
          {links.map(([label, id], i) => (
            <React.Fragment key={id}>
              {i > 0 && <Text style={styles.navSlash}>/</Text>}
              <Pressable onPress={() => onNav(id)}>
                <Text style={styles.navLink}>{label}</Text>
              </Pressable>
            </React.Fragment>
          ))}
        </View>
      )}
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
      {/* the pitch — a dimmed football-pitch photograph pinned behind the whole page */}
      <PitchBackdrop dim={0.72} fixed />

      <View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && h !== navH) setNavH(h);
        }}
      >
        <WebsiteNav onEnter={onEnter} onNav={goSection} showLinks={isWide} />
      </View>

      <ScrollView
        ref={ref}
        style={[styles.scroll, { height: scrollH }]}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── HERO — see components/Hero.tsx (copy overridable there) ── */}
        <View id="top">
          <Hero
            onPrimary={onEnter}
            onSecondary={() => goSection('method')}
            isWide={isWide}
            contentWidth={contentW}
          />
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
                <Image source={ILLUS.mirror} style={styles.cardIllu} resizeMode="cover" />
                <Text style={styles.cardIndex}>01</Text>
                <Text style={styles.cardTitle}>THE MIRROR</Text>
                <Text style={styles.cardBody}>Review your own decisions on the clip, before the noise gets in.</Text>
                <Aside>this was the designer's idea btw</Aside>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(180).duration(600)} style={styles.card}>
              <GlassCard style={styles.cardFill}>
                <Image source={ILLUS.journal} style={styles.cardIllu} resizeMode="cover" />
                <Text style={styles.cardIndex}>02</Text>
                <Text style={styles.cardTitle}>THE JOURNAL</Text>
                <Text style={styles.cardBody}>Write the error, the intention, and the correction in one entry.</Text>
                <Aside>we take the truth seriously. deal with it</Aside>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(260).duration(600)} style={styles.card}>
              <GlassCard style={styles.cardFill}>
                <Image source={ILLUS.ledger} style={styles.cardIllu} resizeMode="cover" />
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
                <Image source={ILLUS.intention} style={styles.cardIllu} resizeMode="cover" />
                <Text style={styles.cardIndex}>A</Text>
                <Text style={styles.cardTitle}>SET ONE INTENTION</Text>
                <Text style={styles.cardBody}>Before kick-off, name the one thing you're working on.</Text>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(180).duration(600)} style={styles.card}>
              <GlassCard style={styles.cardFill}>
                <Image source={ILLUS.moments} style={styles.cardIllu} resizeMode="cover" />
                <Text style={styles.cardIndex}>B</Text>
                <Text style={styles.cardTitle}>ANSWER IN YOUR OWN WORDS</Text>
                <Text style={styles.cardBody}>Half-time and full-time — how it feels, what's happening.</Text>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(260).duration(600)} style={styles.card}>
              <GlassCard style={styles.cardFill}>
                <Image source={ILLUS.moments} style={styles.cardIllu} resizeMode="cover" />
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
          <H2 center>SIX CHAPTERS. THEN THE LOOP.</H2>
          <Muted center>
            No stop date, no graduation. Chapter six hands you back to chapter one — the loop
            compounds forever, and the mistakes you make are the tuition.
          </Muted>
          <View style={[styles.cardRow, { maxWidth: contentW }]}>
            {CHAPTERS.map((c, i) => (
              <Animated.View key={c.n} entering={FadeInDown.delay(100 + i * 70).duration(600)} style={styles.chapterCard}>
                <GlassCard style={styles.cardFill}>
                  <Image
                    source={[ILLUS.mirror, ILLUS.journal, ILLUS.ledger, ILLUS.intention, ILLUS.moments, ILLUS.mirror][i % 6]}
                    style={styles.cardIllu}
                    resizeMode="cover"
                  />
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
                <Image source={ILLUS.mirror} style={styles.cardIllu} resizeMode="cover" />
                <Text style={styles.evidenceStat}>100%</Text>
                <Text style={[styles.cardBody, styles.center]}>of the review is yours. You see it, you name it, you keep it.</Text>
                <Aside>no AI verdicts</Aside>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(180).duration(600)} style={styles.evidenceCard}>
              <GlassCard style={[styles.cardFill, styles.evidenceInner]}>
                <Image source={ILLUS.journal} style={styles.cardIllu} resizeMode="cover" />
                <Text style={styles.evidenceStat}>1×</Text>
                <Text style={[styles.cardBody, styles.center]}>lesson per match. One lesson, earned, carried into the next.</Text>
                <Aside>one is enough. we mean it</Aside>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(260).duration(600)} style={styles.evidenceCard}>
              <GlassCard style={[styles.cardFill, styles.evidenceInner]}>
                <Image source={ILLUS.ledger} style={styles.cardIllu} resizeMode="cover" />
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

        {/* ── MARQUEE — bottom of the page ── */}
        <View style={{ width: '100%', paddingVertical: 30, marginTop: 8 }}>
          <Marquee pxPerSec={60}>
            <Text style={styles.marqueeTxt}>
              PLAY THE MATCH · WATCH YOURSELF · WRITE THE TRUTH · CARRY ONE LESSON · REPEAT ·
              PLAY THE MATCH · WATCH YOURSELF · WRITE THE TRUTH · CARRY ONE LESSON · REPEAT ·
            </Text>
          </Marquee>
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
    alignItems: 'center',
    gap: 16,
  },
  navLink: {
    fontFamily: monoFont,
    fontSize: 13,
    letterSpacing: 2,
    color: '#9CA3AF',
  },
  navSlash: {
    fontFamily: monoFont,
    fontSize: 12,
    color: colors.mutedDim,
    opacity: 0.7,
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
  heroCtas: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
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
  cardIllu: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
