import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import InfinityCrest from '../components/InfinityCrest';
import Marquee from '../components/Marquee';
import PitchBackdrop from '../components/PitchBackdrop';
import Hero from '../components/Hero';
import { CtaPrimary, CtaSecondary } from '../components/CtaButtons';
import { useResponsive } from '../hooks/useResponsive';
import { colors, monoFont, displayFont, bodyFont, bodyFontStrong, bodyFontBold } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// THE DOSSIER — ProSeasonAcademy's public door. A football pitch of thin
// green stripes behind everything, mono HUD labels, copy that is sure of
// itself.
//
// RESPONSIVE + ALIVE:
//  · one scale factor (s) drives every font size, gap and padding, so the
//    page re-centers itself from phone → desktop instead of overflowing
//  · sections reveal with a rise + fade as they enter the viewport
//  · ambient glow orbs drift slowly behind the content
//  · glass cards lift on hover (web)
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

const CHAPTERS = [
  { n: '01', title: 'PLAY THE MATCH', body: 'Drop in the footage. No setup, no spreadsheet. The session starts the second the whistle does.' },
  { n: '02', title: 'WATCH YOURSELF', body: 'The mirror holds no grudge. You review your own decisions before anyone else gets a word in.' },
  { n: '03', title: 'WRITE THE TRUTH', body: 'Log the error, the intention, the correction. Honesty here is the whole point.' },
  { n: '04', title: 'ONE LESSON', body: 'Every match distils to a single lesson you carry forward. One lesson, earned, is enough.' },
  { n: '05', title: 'REPEAT WITH INTENT', body: 'Next session. Same ritual. The repetition is the training — not the drill, the discipline.' },
  { n: '06', title: 'COMPOUND', body: 'Week over week the ledger fills. Progress stops being a feeling and becomes an entry.' },
];

/* ── small house primitives ── */
function Eyebrow({ children, s = 1 }: { children: string; s?: number }) {
  return <Text style={[styles.eyebrow, { fontSize: 10.5 * Math.max(s, 0.85) }]}>{children}</Text>;
}

function H2({ children, center, s = 1 }: { children: React.ReactNode; center?: boolean; s?: number }) {
  return (
    <Text style={[styles.h2, { fontSize: 34 * s, lineHeight: 40 * s }, WEB ? ({ fontFamily: headFont } as any) : null, center && styles.center]}>
      {children}
    </Text>
  );
}

function Muted({ children, center, s = 1 }: { children: React.ReactNode; center?: boolean; s?: number }) {
  return (
    <Text style={[styles.muted, { fontSize: 16 * s, lineHeight: 25 * s }, center && styles.center, WEB ? ({ fontFamily: bodyFace } as any) : null]}>
      {children}
    </Text>
  );
}

function Aside({ children, s = 1 }: { children: string; s?: number }) {
  return <Text style={[styles.aside, { fontSize: 10 * Math.max(s, 0.85) }]}>{'// '}{children}</Text>;
}

/* glass card that lifts on hover (web) */
function GlassCard({ children, style, s = 1 }: { children?: React.ReactNode; style?: object; s?: number }) {
  const hov = useSharedValue(0);
  const lift = useAnimatedStyle(() => ({
    transform: [{ translateY: hov.value * -5 }],
    borderColor: `rgba(57,255,106,${0.14 + hov.value * 0.3})`,
  }));
  return (
    <Pressable
      onHoverIn={() => (hov.value = withTiming(1, { duration: 180 }))}
      onHoverOut={() => (hov.value = withTiming(0, { duration: 260 }))}
      style={style}
    >
      <Animated.View style={[styles.glassCard, { padding: 22 * Math.max(s, 0.75), height: '100%' }, lift]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

/* scroll-reveal wrapper — hidden until the section enters the viewport,
   then rises + fades in once */
function Reveal({ on, children }: { on: boolean; children: React.ReactNode }) {
  if (on) {
    return <Animated.View entering={FadeInUp.duration(650).easing(Easing.out(Easing.cubic))}>{children}</Animated.View>;
  }
  return <View style={{ opacity: 0 }}>{children}</View>;
}

/* two big soft glows drifting slowly behind the page */
function AmbientOrbs() {
  const t1 = useSharedValue(0);
  const t2 = useSharedValue(0);
  useEffect(() => {
    t1.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.ease) }), -1, true);
    t2.value = withRepeat(withTiming(1, { duration: 9500, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [t1, t2]);
  const s1 = useAnimatedStyle(() => ({
    opacity: 0.55 + t1.value * 0.35,
    transform: [{ translateY: t1.value * -44 }, { translateX: t1.value * 26 }],
  }));
  const s2 = useAnimatedStyle(() => ({
    opacity: 0.45 + t2.value * 0.3,
    transform: [{ translateY: t2.value * 40 }, { translateX: t2.value * -32 }],
  }));
  return (
    <>
      <Animated.View style={[styles.orb, styles.orbGreen, s1]} />
      <Animated.View style={[styles.orb, styles.orbGold, s2]} />
    </>
  );
}

/* ── sticky nav — minimal: logo left, /-separated links centre, one CTA ── */
function WebsiteNav({
  onEnter,
  onNav,
  showLinks,
  s,
}: {
  onEnter: () => void;
  onNav: (id: string) => void;
  showLinks: boolean;
  s: number;
}) {
  const links: [string, string][] = [
    ['METHOD', 'method'],
    ['JOURNEY', 'journey'],
    ['EVIDENCE', 'evidence'],
  ];
  return (
    <View style={[styles.nav, { paddingHorizontal: Math.max(16, 28 * s) }, WEB ? ({ position: 'sticky', top: 0, zIndex: 60 } as any) : null]}>
      <Pressable onPress={onEnter} style={styles.navBrand}>
        <InfinityCrest size={26 * Math.max(s, 0.85)} />
        <Text style={[styles.navBrandTxt, { fontSize: 13 * Math.max(s, 0.8) }]}>{'PROSEASON ACADEMY'}</Text>
      </Pressable>
      {showLinks && (
        <View style={styles.navLinks}>
          {links.map(([label, id], i) => (
            <React.Fragment key={id}>
              {i > 0 && <Text style={styles.navSlash}>{'/'}</Text>}
              <Pressable onPress={() => onNav(id)}>
                <Text style={styles.navLink}>{label}</Text>
              </Pressable>
            </React.Fragment>
          ))}
        </View>
      )}
      <View style={styles.navActions}>
        <Pressable onPress={onEnter}>
          <Text style={styles.navSignIn}>{'SIGN IN'}</Text>
        </Pressable>
        <Pressable onPress={onEnter}>
          <View style={styles.navCta}>
            <Text style={styles.navCtaTxt}>{'GET STARTED'}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const REVEAL_IDS = ['method', 'how', 'journey', 'evidence', 'cta'] as const;

export default function LandingScreen({ onEnter }: { onEnter: () => void }) {
  const { width: winW, height: winH } = useWindowDimensions();
  const { isWide, isDesktopUp } = useResponsive();
  const contentW = Math.min(winW, isDesktopUp ? 1200 : 900) - (isWide ? 48 : 28) * 2;

  // one scale factor for the whole page — phones shrink, desktop stays
  const s = winW < 480 ? 0.7 : winW < 768 ? 0.84 : winW < 1100 ? 0.92 : 1;

  const ref = useRef<ScrollView>(null);
  const [navH, setNavH] = useState(0);
  const scrollH = Math.max(0, winH - navH);

  // ── scroll reveal state ──
  const topsRef = useRef<Record<string, number>>({});
  const offsetRef = useRef(0);
  const revealedRef = useRef<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const checkReveals = useCallback(() => {
    let changed = false;
    const next = { ...revealedRef.current };
    for (const id of REVEAL_IDS) {
      const top = topsRef.current[id];
      if (!next[id] && typeof top === 'number' && offsetRef.current + winH * 0.85 > top) {
        next[id] = true;
        changed = true;
      }
    }
    if (changed) {
      revealedRef.current = next;
      setRevealed(next);
    }
  }, [winH]);

  const registerTop = (id: string) => (e: LayoutChangeEvent) => {
    topsRef.current[id] = e.nativeEvent.layout.y;
    checkReveals();
  };

  const onScrollEvt = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    offsetRef.current = e.nativeEvent.contentOffset.y;
    checkReveals();
  };

  useEffect(() => {
    checkReveals();
  }, [checkReveals]);

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

      {/* ambient drifting glows */}
      <AmbientOrbs />

      <View
        style={{ zIndex: 2 }}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && h !== navH) setNavH(h);
        }}
      >
        <WebsiteNav onEnter={onEnter} onNav={goSection} showLinks={isWide} s={s} />
      </View>

      <ScrollView
        ref={ref}
        style={[styles.scroll, { height: scrollH, zIndex: 2 }]}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        bounces={false}
        onScroll={WEB ? onScrollEvt : undefined}
        scrollEventThrottle={16}
      >
        {/* ── HERO ── */}
        <View id="top">
          <Hero onPrimary={onEnter} onSecondary={() => goSection('method')} isWide={isWide} contentWidth={contentW} scale={s} />
        </View>

        {/* ── THE METHOD ── */}
        <View style={styles.section} id="method" onLayout={registerTop('method')}>
          <Reveal on={!!revealed.method}>
            <View style={styles.sectionInner}>
              <Eyebrow s={s}>{'[ METHOD ]'}</Eyebrow>
              <H2 center s={s}>{'ESPORTS-GRADE REVIEW, ONE MATCH AT A TIME.'}</H2>
              <Muted center s={s}>
                {'No subscriptions to judgement. No scoreboard to impress. Just a discipline: the match, the mirror, the journal, the next kick.'}
              </Muted>
              <View style={[styles.cardRow, { maxWidth: contentW }]}>
                {[
                  { src: ILLUS.mirror, n: '01', t: 'THE MIRROR', b: 'Review your own decisions on the clip, before the noise gets in.', a: "this was the designer's idea btw" },
                  { src: ILLUS.journal, n: '02', t: 'THE JOURNAL', b: 'Write the error, the intention, and the correction in one entry.', a: 'we take the truth seriously. deal with it' },
                  { src: ILLUS.ledger, n: '03', t: 'THE LEDGER', b: 'Your progress becomes entries — honest, dated, and yours.', a: 'no fake percentages here' },
                ].map((c, i) => (
                  <Animated.View key={c.n} entering={FadeInDown.delay(100 + i * 80).duration(600)} style={[styles.card, { flexBasis: 250 * Math.max(s, 0.55) }]}>
                    <GlassCard s={s} style={styles.cardFill}>
                      <Image source={c.src} style={[styles.cardIllu, { height: 150 * Math.max(s, 0.7) }]} resizeMode="cover" />
                      <Text style={styles.cardIndex}>{c.n}</Text>
                      <Text style={[styles.cardTitle, { fontSize: 15 * Math.max(s, 0.85) }]}>{c.t}</Text>
                      <Text style={[styles.cardBody, { fontSize: 14.5 * Math.max(s, 0.85), lineHeight: 22 * Math.max(s, 0.85) }]}>{c.b}</Text>
                      <Aside s={s}>{c.a}</Aside>
                    </GlassCard>
                  </Animated.View>
                ))}
              </View>
            </View>
          </Reveal>
        </View>

        {/* ── HOW IT WORKS ── */}
        <View style={styles.section} id="how" onLayout={registerTop('how')}>
          <Reveal on={!!revealed.how}>
            <View style={styles.sectionInner}>
              <Eyebrow s={s}>{'[ HOW IT WORKS ]'}</Eyebrow>
              <H2 center s={s}>{'PLAY → REVIEW → CARRY ONE LESSON FORWARD.'}</H2>
              <Muted center s={s}>{'Your entire job, compressed to one honest loop.'}</Muted>
              <View style={[styles.cardRow, { maxWidth: contentW }]}>
                {[
                  { src: ILLUS.intention, n: 'A', t: 'SET ONE INTENTION', b: "Before kick-off, name the one thing you're working on." },
                  { src: ILLUS.moments, n: 'B', t: 'ANSWER IN YOUR OWN WORDS', b: 'Half-time and full-time — how it feels, what is happening.' },
                  { src: ILLUS.moments, n: 'C', t: 'MARK YOUR MOMENTS', b: 'You pick the key moments. You review them. You compare four versions of your thinking against the evidence.' },
                ].map((c, i) => (
                  <Animated.View key={c.n} entering={FadeInDown.delay(100 + i * 80).duration(600)} style={[styles.card, { flexBasis: 250 * Math.max(s, 0.55) }]}>
                    <GlassCard s={s} style={styles.cardFill}>
                      <Image source={c.src} style={[styles.cardIllu, { height: 150 * Math.max(s, 0.7) }]} resizeMode="cover" />
                      <Text style={styles.cardIndex}>{c.n}</Text>
                      <Text style={[styles.cardTitle, { fontSize: 15 * Math.max(s, 0.85) }]}>{c.t}</Text>
                      <Text style={[styles.cardBody, { fontSize: 14.5 * Math.max(s, 0.85), lineHeight: 22 * Math.max(s, 0.85) }]}>{c.b}</Text>
                    </GlassCard>
                  </Animated.View>
                ))}
              </View>
            </View>
          </Reveal>
        </View>

        {/* ── THE JOURNEY ── */}
        <View style={styles.section} id="journey" onLayout={registerTop('journey')}>
          <Reveal on={!!revealed.journey}>
            <View style={styles.sectionInner}>
              <Eyebrow s={s}>{'[ THE JOURNEY ]'}</Eyebrow>
              <H2 center s={s}>{'SIX CHAPTERS. THEN THE LOOP.'}</H2>
              <Muted center s={s}>
                {'No stop date, no graduation. Chapter six hands you back to chapter one — the loop compounds forever, and the mistakes you make are the tuition.'}
              </Muted>
              <View style={[styles.cardRow, { maxWidth: contentW }]}>
                {CHAPTERS.map((c, i) => (
                  <Animated.View key={c.n} entering={FadeInDown.delay(100 + i * 70).duration(600)} style={[styles.chapterCard, { flexBasis: 250 * Math.max(s, 0.55) }]}>
                    <GlassCard s={s} style={styles.cardFill}>
                      <Image
                        source={[ILLUS.mirror, ILLUS.journal, ILLUS.ledger, ILLUS.intention, ILLUS.moments, ILLUS.mirror][i % 6]}
                        style={[styles.cardIllu, { height: 150 * Math.max(s, 0.7) }]}
                        resizeMode="cover"
                      />
                      <Text style={[styles.chapterNum, { fontSize: 26 * Math.max(s, 0.8) }]}>{c.n}</Text>
                      <Text style={[styles.cardTitle, { fontSize: 15 * Math.max(s, 0.85) }]}>{c.title}</Text>
                      <Text style={[styles.cardBody, { fontSize: 14.5 * Math.max(s, 0.85), lineHeight: 22 * Math.max(s, 0.85) }]}>{c.body}</Text>
                    </GlassCard>
                  </Animated.View>
                ))}
              </View>
            </View>
          </Reveal>
        </View>

        {/* ── EVIDENCE ── */}
        <View style={styles.section} id="evidence" onLayout={registerTop('evidence')}>
          <Reveal on={!!revealed.evidence}>
            <View style={styles.sectionInner}>
              <Eyebrow s={s}>{'[ EVIDENCE ]'}</Eyebrow>
              <H2 center s={s}>{'YOUR EVIDENCE MOVES YOU.'}</H2>
              <View style={[styles.cardRow, { maxWidth: contentW }]}>
                {[
                  { src: ILLUS.mirror, stat: '100%', b: 'of the review is yours. You see it, you name it, you keep it.', a: 'no AI verdicts' },
                  { src: ILLUS.journal, stat: '1×', b: 'lesson per match. One lesson, earned, carried into the next.', a: 'one is enough. we mean it' },
                  { src: ILLUS.ledger, stat: '∞', b: 'the loop keeps compounding. Progress becomes an entry, then a habit.', a: 'you cannot outrun your receipts' },
                ].map((c, i) => (
                  <Animated.View key={c.stat} entering={FadeInDown.delay(100 + i * 80).duration(600)} style={[styles.evidenceCard, { flexBasis: 250 * Math.max(s, 0.55) }]}>
                    <GlassCard s={s} style={styles.cardFill}>
                      <View style={styles.evidenceInner}>
                        <Image source={c.src} style={[styles.cardIllu, { height: 150 * Math.max(s, 0.7) }]} resizeMode="cover" />
                        <Text style={[styles.evidenceStat, { fontSize: 44 * Math.max(s, 0.8) }]}>{c.stat}</Text>
                        <Text style={[styles.cardBody, styles.center, { fontSize: 14.5 * Math.max(s, 0.85), lineHeight: 22 * Math.max(s, 0.85) }]}>{c.b}</Text>
                        <Aside s={s}>{c.a}</Aside>
                      </View>
                    </GlassCard>
                  </Animated.View>
                ))}
              </View>
            </View>
          </Reveal>
        </View>

        {/* ── CTA ── */}
        <View id="cta" onLayout={registerTop('cta')}>
          <Reveal on={!!revealed.cta}>
            <View style={[styles.ctaBanner, { maxWidth: contentW, padding: 40 * Math.max(s, 0.6), marginVertical: 48 * Math.max(s, 0.6) }]}>
              <Eyebrow s={s}>{'CLAIM YOUR SEAT'}</Eyebrow>
              <Text style={[styles.ctaHead, { fontSize: 40 * s, lineHeight: 46 * s }, WEB ? ({ fontFamily: headFont } as any) : null]}>
                {'THE SEASON STARTS AT THE MIRROR.'}
              </Text>
              <Muted center s={s}>
                {"One coach, locked permanently. One standard. One thousand seats — when it's full, it's full. Sign in, lock in your coach, and get your baseline week sorted."}
              </Muted>
              <View style={styles.heroCtas}>
                <CtaPrimary label="CLAIM YOUR SEAT" onPress={onEnter} />
                <CtaSecondary label="I ALREADY HAVE AN ACCOUNT" onPress={onEnter} />
              </View>
              <Aside s={s}>{'all of this, no hidden fees'}</Aside>
            </View>
          </Reveal>
        </View>

        {/* ── MARQUEE — bottom of the page ── */}
        <View style={{ width: '100%', paddingVertical: 30, marginTop: 8 }}>
          <Marquee pxPerSec={60}>
            <Text style={styles.marqueeTxt}>
              {'PLAY THE MATCH · WATCH YOURSELF · WRITE THE TRUTH · CARRY ONE LESSON · REPEAT · PLAY THE MATCH · WATCH YOURSELF · WRITE THE TRUTH · CARRY ONE LESSON · REPEAT · '}
            </Text>
          </Marquee>
        </View>

        {/* ── FOOTER ── */}
        <View style={[styles.footer, { paddingVertical: 40 * Math.max(s, 0.6) }]}>
          <Text style={styles.footerBrand}>{'PROSEASON ACADEMY'}</Text>
          <Text style={styles.footerTag}>{'THE CONSOLE COACHING ACADEMY · REVIEW ONE MATCH AT A TIME'}</Text>
          <Text style={styles.footerNote}>{`we cooked, yeah we know · © ${new Date().getFullYear()} ProSeason Academy`}</Text>
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
    position: 'relative',
  },
  scroll: {
    flexShrink: 1,
  },
  scrollInner: {
    paddingBottom: 40,
  },
  sectionInner: {
    width: '100%',
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: monoFont,
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
    letterSpacing: 0.5,
    color: colors.fg,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  muted: {
    fontFamily: bodyFont,
    color: colors.muted,
    marginBottom: 28,
    maxWidth: 620,
  },
  aside: {
    fontFamily: monoFont,
    letterSpacing: 0.4,
    color: colors.primaryDim,
    marginTop: 12,
    opacity: 0.85,
  },
  glassCard: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.14)',
    borderRadius: 16,
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
    letterSpacing: 1.5,
    color: colors.fg,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  cardBody: {
    fontFamily: bodyFont,
    color: colors.muted,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  /* CTA rows — centred so wrapped buttons stay centred */
  heroCtas: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marqueeTxt: {
    fontFamily: bodyFontBold,
    fontSize: 14,
    letterSpacing: 3,
    color: colors.primary,
  },
  section: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 28,
  },
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    justifyContent: 'center',
    width: '100%',
  },
  card: {
    flexGrow: 1,
  },
  cardIllu: {
    width: '100%',
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chapterCard: {
    flexGrow: 1,
  },
  chapterNum: {
    fontFamily: displayFont,
    color: colors.primary,
    marginBottom: 8,
  },
  evidenceCard: {
    flexGrow: 1,
  },
  evidenceInner: {
    alignItems: 'center',
    height: '100%',
  },
  evidenceStat: {
    fontFamily: displayFont,
    color: colors.primary,
    marginBottom: 10,
  },
  ctaBanner: {
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  ctaHead: {
    fontFamily: displayFont,
    letterSpacing: 1,
    color: colors.fg,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 14,
  },
  footer: {
    alignItems: 'center',
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
  /* ambient glow orbs */
  orb: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    zIndex: 1,
  },
  orbGreen: {
    top: 140,
    left: -120,
    backgroundColor: 'rgba(57,255,106,0.05)',
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 90,
    shadowOffset: { width: 0, height: 0 },
  },
  orbGold: {
    bottom: 260,
    right: -140,
    backgroundColor: 'rgba(242,192,120,0.05)',
    shadowColor: colors.accent,
    shadowOpacity: 0.16,
    shadowRadius: 90,
    shadowOffset: { width: 0, height: 0 },
  },
});
