import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Platform } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import LogoMark from '../components/LogoMark';
import Marquee from '../components/Marquee';
import GridBackground from '../components/GridBackground';
import { useHover } from '../hooks/useHover';
import { useResponsive } from '../hooks/useResponsive';
import * as backend from '../data/backend';
import {
  colors,
  monoFont,
  displayFont,
  bodyFont,
  bodyFontItalic,
} from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// THE DOSSIER — ProSeasonAcademy's public door. A proper website: nav bar,
// long-form manifesto sections, footer. The STYLE is the Onliversity
// blueprint (near-black + one neon, mono labels, glass cards, hud borders,
// aurora + particles + arena grid, marquees, fade-ups). The SUBSTANCE is
// this repository's own philosophy, verbatim where it lands:
//   FOUNDER_BRIEF.md · PRODUCT_FOCUS.md · MIRROR_DIRECTION.md ·
//   DESIGN_SYSTEM.md · README.md
// No pricing on the page. The product speaks for itself.
// ─────────────────────────────────────────────────────────────────────────

const WEB = Platform.OS === 'web';
const headFont = WEB ? "'Space Grotesk', 'Barlow', sans-serif" : displayFont;
const bodyFace = WEB ? "'Inter', 'Barlow', sans-serif" : bodyFont;
const ELECTRIC = '#21e6c1';
const VIOLET = '#a06bff';

const ART = {
  mirror: require('../../assets/art/mirror-drill.jpg'),
  tunnel: require('../../assets/art/journey-tunnel.jpg'),
  boots: require('../../assets/art/scan-boots.jpg'),
  touchline: require('../../assets/art/coach-touchline.jpg'),
};

/* ── living background: arena grid + aurora + rising particles (web),
      quiet fallback on native ── */
function LivingBackground() {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        left: `${(i * 137.5) % 100}%`,
        size: 1 + (i % 3),
        dur: `${12 + (i % 7) * 2.4}s`,
        delay: `${-i * 1.7}s`,
        color: [colors.primary, ELECTRIC, VIOLET, colors.accent][i % 4],
        x: `${((i % 5) - 2) * 9}px`,
        op: 0.25 + (i % 4) * 0.1,
      })),
    [],
  );

  if (!WEB) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <GridBackground />
      </View>
    );
  }
  return (
    <div
      aria-hidden
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      <div className="onl-arena-grid" />
      <div className="onl-aurora onl-aurora-a" />
      <div className="onl-aurora onl-aurora-b" />
      <div className="onl-aurora onl-aurora-c" />
      {particles.map((p, i) => (
        <span
          key={i}
          className="onl-particle"
          style={
            {
              left: p.left,
              width: p.size,
              height: p.size,
              color: p.color,
              backgroundColor: p.color,
              animationDuration: p.dur,
              animationDelay: p.delay,
              '--p-x': p.x,
              '--p-op': String(p.op),
            } as any
          }
        />
      ))}
    </div>
  );
}

/* ── scroll-gated reveal — the blueprint's fade-up. Web uses a real
   IntersectionObserver against the DOM scroll region; native drives the
   same feel from the ScrollView offset. ── */
function GateWeb({ children, style }: { children?: React.ReactNode; style?: any }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVis(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            setVis(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={vis ? 'fade-up visible' : 'fade-up'} style={style}>
      {children}
    </div>
  );
}

function GateNative({
  scrollY,
  children,
  style,
}: {
  scrollY: SharedValue<number>;
  children?: React.ReactNode;
  style?: any;
}) {
  const y = useSharedValue(1e9);
  const { h: vh } = useResponsive();
  const s = useAnimatedStyle(() => {
    const start = y.value - vh * 0.96;
    const end = y.value - vh * 0.66;
    const p = Math.min(1, Math.max(0, (scrollY.value - start) / (end - start || 1)));
    const e = 1 - Math.pow(1 - p, 3);
    return { opacity: e, transform: [{ translateY: (1 - e) * 20 }] };
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

function Gate(props: { scrollY: SharedValue<number>; children?: React.ReactNode; style?: any }) {
  return WEB ? <GateWeb style={props.style}>{props.children}</GateWeb> : <GateNative {...props} />;
}

function MonoLabel({ children }: { children: string }) {
  return <Text style={styles.monoLabel}>{children}</Text>;
}

function H2({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <Text style={[styles.h2, center && { textAlign: 'center' }]}>{children}</Text>;
}

function Muted({ children, center, style }: { children: React.ReactNode; center?: boolean; style?: any }) {
  return <Text style={[styles.body, center && { textAlign: 'center' }, style]}>{children}</Text>;
}

function GlassCard({ children, style, hud }: { children?: React.ReactNode; style?: any; hud?: boolean }) {
  return (
    <View
      {...({ className: WEB ? (hud ? 'onl-glass onl-hud' : 'onl-glass') : undefined } as any)}
      style={[styles.glassNative, style]}
    >
      {children}
    </View>
  );
}

function CtaPrimary({ label, onPress }: { label: string; onPress: () => void }) {
  const { hovered, bind } = useHover();
  const hov = useSharedValue(0);
  useEffect(() => {
    hov.value = withTiming(hovered ? 1 : 0, { duration: 160 });
  }, [hovered, hov]);
  const s = useAnimatedStyle(() => ({
    transform: [{ translateY: -2 * hov.value }],
    shadowOpacity: 0.45 + hov.value * 0.25,
    shadowRadius: 22 + hov.value * 10,
  }));
  return (
    <Pressable onPress={onPress} accessibilityRole="button" {...bind}>
      <Animated.View
        {...({ className: WEB ? 'onl-shimmer' : undefined } as any)}
        style={[styles.ctaPrimary, s]}
      >
        <Text style={styles.ctaPrimaryTxt}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function CtaSecondary({ label, onPress }: { label: string; onPress: () => void }) {
  const { hovered, bind } = useHover();
  const hov = useSharedValue(0);
  useEffect(() => {
    hov.value = withTiming(hovered ? 1 : 0, { duration: 160 });
  }, [hovered, hov]);
  const s = useAnimatedStyle(() => ({
    borderColor: `rgba(57,255,106,${0.25 + hov.value * 0.3})`,
    transform: [{ translateY: -2 * hov.value }],
  }));
  return (
    <Pressable onPress={onPress} accessibilityRole="button" {...bind}>
      <Animated.View style={[styles.ctaSecondary, s]}>
        <Text style={styles.ctaSecondaryTxt}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ── HUD-framed illustration ── */
function ArtFrame({
  source,
  label,
  caption,
  height = 300,
}: {
  source: any;
  label: string;
  caption: string;
  height?: number;
}) {
  return (
    <View style={[styles.artFrame, { height }]}>
      <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(7,13,9,0)', 'rgba(7,13,9,0.4)', 'rgba(7,13,9,0.92)']}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.artLive}>
        <View style={styles.artLiveDot} />
        <Text style={styles.artLiveTxt}>{label}</Text>
      </View>
      <View style={styles.artCaptionRow}>
        <Text style={styles.artCaptionLeft}>{caption}</Text>
        <Text style={styles.artCaptionRight}>THE PLAYER DOES THE SEEING</Text>
      </View>
    </View>
  );
}

/* ── proper website nav bar ── */
const ANCHORS: [string, string][] = [
  ['practice', 'The Practice'],
  ['ritual', 'The Ritual'],
  ['season', 'The Season'],
  ['inside', 'Inside the App'],
  ['different', 'Why Different'],
  ['faq', 'FAQ'],
];

function WebsiteNav({ onEnter }: { onEnter: () => void }) {
  const { isLaptopUp, w } = useResponsive();
  const [open, setOpen] = useState(false);

  const go = (id: string) => {
    setOpen(false);
    if (WEB && typeof document !== 'undefined') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <View
      {...({ className: WEB ? 'onl-hud psa-site-nav' : undefined } as any)}
      style={styles.nav}
    >
      <View style={styles.navInner}>
        <Pressable onPress={() => go('top')} style={styles.navBrand} accessibilityRole="button">
          <LogoMark size={28} />
          <Text style={styles.navBrandTxt}>PROSEASON ACADEMY</Text>
          {w > 560 && (
            <View style={styles.navBadge}>
              <View style={styles.navBadgeDot} />
              <Text style={styles.navBadgeTxt}>SEASON ONE · LIVE</Text>
            </View>
          )}
        </Pressable>

        {isLaptopUp && (
          <View style={styles.navLinks}>
            {ANCHORS.map(([id, label]) => (
              <Pressable key={id} onPress={() => go(id)} accessibilityRole="link">
                <Text style={styles.navLink}>{label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.navRight}>
          {!isLaptopUp && (
            <Pressable onPress={() => setOpen((v) => !v)} style={styles.burger} accessibilityRole="button">
              <Text style={styles.burgerTxt}>{open ? '✕' : '☰'}</Text>
            </Pressable>
          )}
          {isLaptopUp && (
            <Pressable onPress={onEnter} accessibilityRole="link">
              <Text style={styles.navSignIn}>SIGN IN</Text>
            </Pressable>
          )}
          <Pressable onPress={onEnter} accessibilityRole="button">
            <View {...({ className: WEB ? 'onl-shimmer' : undefined } as any)} style={styles.navCta}>
              <Text style={styles.navCtaTxt}>CLAIM YOUR SEAT</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {open && !isLaptopUp && (
        <View style={styles.drawer}>
          {ANCHORS.map(([id, label]) => (
            <Pressable key={id} onPress={() => go(id)} style={styles.drawerItem}>
              <Text style={styles.drawerTxt}>{label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onEnter} style={styles.drawerItem}>
            <Text style={[styles.drawerTxt, { color: colors.primary }]}>SIGN IN</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function LandingScreen({ onEnter }: { onEnter: () => void }) {
  const { isMultiColumn } = useResponsive();
  const scrollY = useSharedValue(0);
  const [seats, setSeats] = useState<backend.SeasonGate | null>(null);

  useEffect(() => {
    void backend.liveSeatCount().then((s) => {
      if (s) setSeats(s);
    });
  }, []);

  // While the marketing page is mounted, the shell becomes a normal
  // document scroller (see globalCss: html.psa-page-landing). Removed on
  // unmount so the member app keeps its bounded, app-like frame.
  useEffect(() => {
    if (!WEB || typeof document === 'undefined') return;
    document.documentElement.classList.add('psa-page-landing');
    return () => {
      document.documentElement.classList.remove('psa-page-landing');
    };
  }, []);

  const go = (id: string) => {
    if (WEB && typeof document !== 'undefined') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const seatLine = seats
    ? `SEASON ONE · ${seats.taken.toLocaleString('en-US')}/${seats.cap.toLocaleString('en-US')} SEATS CLAIMED`
    : 'SEASON ONE · 1,000 SEATS ONLY';

  const content = (
    <>
        {/* ══ HERO ═ */}
        <View style={styles.section} nativeID="top">
          <View style={styles.container}>
            <View style={[styles.heroGrid, isMultiColumn && styles.heroGridWide]}>
              <View style={styles.heroLeft}>
                <View style={styles.heroBrandRow}>
                  <LogoMark size={30} />
                  <Text style={styles.heroBrandTxt}>A PRIVATE EA FC CONSOLE REVIEW PRACTICE</Text>
                </View>
                <Text style={styles.h1}>
                  PLAY. REVIEW.{'\n'}
                  <Text style={styles.h1Muted}>CARRY ONE LESSON.</Text>
                </Text>
                <Muted style={styles.heroSub}>
                  ProSeasonAcademy helps an EA SPORTS FC console player turn one played match into
                  one honest lesson to carry into the next match.{' '}
                  <Text style={styles.strong}>
                    Not a tips feed. Not a social network. Not an AI that tells you what to think.
                  </Text>
                </Muted>
                <View style={styles.heroCtas}>
                  <CtaPrimary label="CLAIM YOUR SEAT" onPress={onEnter} />
                  <CtaSecondary label="HOW THE RITUAL WORKS" onPress={() => go('ritual')} />
                </View>
                <View style={[styles.trustStrip, isMultiColumn && { flexDirection: 'row' }]}>
                  {[seatLine, 'ONE COACH · LOCKED PERMANENTLY', 'EVIDENCE BEFORE ADVICE'].map((t) => (
                    <View key={t} style={styles.trustItem}>
                      <View style={styles.trustDot} />
                      <Text style={styles.trustTxt}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* the five-second test, as a HUD card — the app answers before
                  you even sign in */}
              <View style={styles.heroRight}>
                <GlassCard hud style={styles.sessionCard}>
                  <View style={styles.sessionHead}>
                    <Text style={styles.sessionHeadL}>today / next useful action</Text>
                    <View style={styles.recRow}>
                      <View style={styles.recDot} />
                      <Text style={styles.recTxt}>LIVE</Text>
                    </View>
                  </View>
                  <View style={styles.sessionBody}>
                    <Text style={styles.sessionLabel}>START MY MATCH REVIEW</Text>
                    {[
                      ['I’M ABOUT TO PLAY', 'Choose one focus before kick-off. Just one.'],
                      ['I ALREADY FINISHED A MATCH', 'Save the score. Name the turning point. Write one lesson.'],
                      ['NO MATCH TODAY', 'Nothing is overdue. Come back after a real match.'],
                    ].map(([k, v]) => (
                      <View key={k} style={styles.sessionRow}>
                        <Text style={styles.sessionRowK}>{k}</Text>
                        <Text style={styles.sessionRowV}>{v}</Text>
                      </View>
                    ))}
                    <Text style={styles.sessionQuote}>
                      “A player plays a match, reviews the decisions that mattered in their own
                      words, and carries one lesson into the next match.”
                    </Text>
                    <View style={styles.sessionFoot}>
                      <Text style={styles.sessionFootL}>The app records the evidence.</Text>
                      <Text style={styles.sessionFootR}>YOU DO THE SEEING</Text>
                    </View>
                  </View>
                </GlassCard>
              </View>
            </View>
          </View>
        </View>

        {/* ══ MARQUEE 1 ══ */}
        <View style={styles.marqueeBand}>
          <Marquee pxPerSec={46}>
            <Text style={styles.marqueeTxt}>
              {'PLAY → REVIEW → CARRY ONE LESSON   ◆   EVIDENCE BEFORE ADVICE   ◆   YOUR JOURNEY IS THE EVIDENCE   ◆   THE STANDARD IS THE BENCHMARK   ◆   NOT A TIPS FEED   ◆   NOT AN AI COACH   ◆   1,000 SEATS ONLY   ◆   NOTHING IS OVERDUE   ◆   '}
            </Text>
          </Marquee>
        </View>

        {/* ══ THE PRACTICE (philosophy) ══ */}
        <Gate scrollY={scrollY}>
          <View style={styles.section} nativeID="practice">
            <View style={styles.container}>
              <MonoLabel>THE PRACTICE · WHY THIS EXISTS</MonoLabel>
              <H2>
                WE CANNOT MAKE YOU BETTER.{'\n'}
                <Text style={styles.h2Muted}>WE CAN ONLY HELP YOU SEE YOURSELF CLEARLY ENOUGH</Text>{'\n'}
                <Text style={styles.h2Muted}>TO DO THE WORK YOURSELF.</Text>
              </H2>
              <View style={[styles.heroGrid, isMultiColumn && styles.heroGridWide]}>
                <View style={styles.heroLeft}>
                  <Muted style={styles.sectionBody}>
                    Most players play a lot of FC and learn very little from the matches they lose.
                    They remember the score, blame the game, watch a clip, and move to the next
                    match. They do not build a record of the decisions, emotions and patterns that
                    repeat.
                  </Muted>
                  <Muted style={styles.sectionBody}>
                    ProSeasonAcademy gives them a simple, repeatable practice: play a real match,
                    notice what happened, write one honest lesson, test that lesson next match. Over
                    time the player gets evidence of what actually improves — not a streak of
                    motivational content.
                  </Muted>
                  <View style={styles.problemGrid}>
                    {[
                      ['THE SCORE', 'You remember the result and blame the game. The decisions that mattered go unwatched, and repeat.'],
                      ['THE FEED', 'Tips and motivation feel like learning. They build no record of your own decisions, emotions and patterns.'],
                      ['THE PRACTICE', 'A record you write yourself. Your intentions, your feelings, your memory — placed beside the evidence.'],
                    ].map(([t, b]) => (
                      <GlassCard key={t} style={styles.pointCard}>
                        <Text style={styles.pointTitle}>{t}</Text>
                        <Text style={styles.pointBody}>{b}</Text>
                      </GlassCard>
                    ))}
                  </View>
                </View>
                <View style={styles.heroRight}>
                  <ArtFrame
                    source={ART.mirror}
                    label="MATCH REVIEW · IN YOUR OWN WORDS"
                    caption="You, beside the evidence"
                    height={isMultiColumn ? 400 : 260}
                  />
                  <View style={styles.pullWrap}>
                    <Text style={styles.pull}>
                      “IT IS NOT AN ANSWER MACHINE. IT IS A STRUCTURE THAT MAKES IT DIFFICULT TO KEEP
                      GIVING YOURSELF CONVENIENT ANSWERS.”
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Gate>

        {/* ══ THE RITUAL ══ */}
        <Gate scrollY={scrollY}>
          <View style={styles.section} nativeID="ritual">
            <View style={styles.container}>
              <MonoLabel>THE RITUAL · HOW IT WORKS</MonoLabel>
              <H2>ONE MATCH. ONE HONEST LESSON. CARRIED FORWARD.</H2>
              <Muted style={styles.sectionBody}>
                The review ritual is intentionally short, and intentionally yours: one intention,
                two half-time prompts, two full-time prompts, and three prompts per moment{' '}
                <Text style={styles.strong}>you</Text> choose. The app never writes your answers,
                never picks your moments, never uploads raw video.
              </Muted>
              <View style={styles.pillarGrid}>
                {[
                  ['01', 'PLAY A REAL MATCH', 'The practice starts with a real console match. No match today? Nothing to complete — you are not behind, and nothing is overdue.'],
                  ['02', 'START YOUR MATCH REVIEW', 'Before kick-off you set one intention and a starting composure — captured before the score changes the emotions. At half-time and full-time you answer while the match is still alive.'],
                  ['03', 'NAME THE MOMENTS', 'You divide the match into its key moments yourself. Three prompts per moment, in your own words. The app preserves the sequence; it does not choose for you.'],
                  ['04', 'CARRY ONE LESSON', 'One line you are willing to carry forward becomes Your Lesson. Your next review opens by asking how it held — or broke. A lesson cannot be created and immediately forgotten.'],
                ].map(([n, t, b]) => (
                  <GlassCard key={n} style={styles.pillarCard}>
                    <View style={styles.pillarTop}>
                      <Text style={styles.pillarNum}>{n}</Text>
                      <View style={styles.pillarDotRing}>
                        <View style={styles.pillarDot} />
                      </View>
                    </View>
                    <Text style={styles.pillarTitle}>{t}</Text>
                    <Text style={styles.pointBody}>{b}</Text>
                  </GlassCard>
                ))}
              </View>
              <View style={styles.pullCenter}>
                <Text style={styles.pullBig}>“YOU CANNOT OUTRUN YOUR RECEIPTS.”</Text>
                <View style={styles.pullDivider} />
              </View>
            </View>
          </View>
        </Gate>

        {/* ══ MARQUEE 2 — reverse, fast ══ */}
        <View style={styles.marqueeBand}>
          <Marquee pxPerSec={82}>
            <Text style={styles.marqueeTxt}>
              {'SEE YOURSELF → CONTROL YOURSELF → READ THE GAME → BUILD DISCIPLINE → PERFORM UNDER PRESSURE → PROVE IT   ◆   SIX CHAPTERS · EARNED FROM EVIDENCE   ◆   LATENESS IS NEVER PUNISHED   ◆   RECEIPTS, NOT PROMISES   ◆   '}
            </Text>
          </Marquee>
        </View>

        {/* ══ THE SEASON ══ */}
        <Gate scrollY={scrollY}>
          <View style={styles.section} nativeID="season">
            <View style={styles.container}>
              <MonoLabel>THE SEASON · WHAT SIX MONTHS LOOK LIKE</MonoLabel>
              <H2>
                ONE COACH. ONE ROAD.{'\n'}
                <Text style={styles.h2Primary}>SIX CHAPTERS, EARNED.</Text>
              </H2>
              <View style={[styles.heroGrid, isMultiColumn && styles.heroGridWide]}>
                <View style={styles.heroLeft}>
                  {[
                    ['THE STARTING WEEK', 'Five recent real matches, honestly logged — four core console stats and the moments that mattered. Your baseline seals before the road opens, and becomes the you that six months is measured against.'],
                    ['ONE COACH, LOCKED PERMANENTLY', 'Your coach is the voice, the guide and the accountability. No switching, no resets — the lock is the point. Commitment is the product.'],
                    ['SIX CHAPTERS OF PROGRESS', 'SEE YOURSELF → CONTROL YOURSELF → READ THE GAME → BUILD DISCIPLINE → PERFORM UNDER PRESSURE → PROVE IT. Chapters move only when your evidence earns them. No painted percentages.'],
                    ['WHAT GOOD LOOKS LIKE', 'Beside your road runs the benchmark — a composite of the best in the path. Direction, not a second track. Read it. Walk your own road.'],
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
                <View style={styles.heroRight}>
                  <GlassCard style={styles.trackCard}>
                    <Text style={styles.trackTag}>YOUR JOURNEY — CONTROL YOURSELF</Text>
                    <Text style={styles.trackLine}>Your current evidence</Text>
                    <Text style={styles.trackLine}>Your next objective</Text>
                    <Text style={styles.trackLine}>Your next match review</Text>
                    <View style={styles.trackDivider} />
                    <Text style={[styles.trackTag, { color: colors.accent }]}>
                      WHAT GOOD LOOKS LIKE — CONTROL YOURSELF
                    </Text>
                    <Text style={styles.trackLine}>What elite players learn here</Text>
                    <Text style={styles.trackLine}>The professional behaviour to study</Text>
                    <Text style={styles.trackLine}>The benchmark you are approaching</Text>
                  </GlassCard>
                  <View style={styles.artDuo}>
                    <View style={styles.artDuoHalf}>
                      <ArtFrame source={ART.tunnel} label="SIX-CHAPTER ROAD" caption="The journey is the evidence" height={190} />
                    </View>
                    <View style={styles.artDuoHalf}>
                      <ArtFrame source={ART.touchline} label="ONE COACH · LOCKED" caption="The voice in your corner" height={190} />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Gate>

        {/* ══ INSIDE THE APP ══ */}
        <Gate scrollY={scrollY}>
          <View style={styles.section} nativeID="inside">
            <View style={styles.container}>
              <MonoLabel>INSIDE THE APP · WHAT A MEMBER GETS</MonoLabel>
              <H2>EVERYTHING SERVES THE NEXT REVIEW</H2>
              <Muted style={styles.sectionBody}>
                The home screen always keeps one obvious green action above explanations,
                statistics, news and community. Everything else is supporting equipment.
              </Muted>
              <View style={styles.insideGrid}>
                {[
                  ['TODAY', 'Your next useful action. One question answered: what do I do next?'],
                  ['MATCH REVIEW', 'A short before / during / after review of one real match — in your own words.'],
                  ['YOUR LESSON', 'The one useful line you carry into the next match. It opens your next session.'],
                  ['MATCH HISTORY', 'Saved scores and review receipts. The evidence your chapters are graded from.'],
                  ['LOSS NOTES', 'Brief notes about losses and repeated mistakes. The pattern you write is the pattern you fix.'],
                  ['PROGRESS', 'Six chapters that move only when your evidence earns them.'],
                  ['WHAT GOOD LOOKS LIKE', 'The benchmark journey of the best in the path — revealed as you advance.'],
                  ['EVIDENCE TRACKER', 'Optional seven-match ingest: your stats screens, read on-device, building your development card.'],
                  ['COMMUNITY', 'Optional support and accountability — never the task.'],
                ].map(([t, b]) => (
                  <GlassCard key={t} style={styles.insideCard}>
                    <LinearGradient
                      colors={['rgba(57,255,106,0.4)', 'rgba(57,255,106,0)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.insideHair}
                    />
                    <Text style={styles.insideTitle}>{t}</Text>
                    <Text style={styles.pointBody}>{b}</Text>
                  </GlassCard>
                ))}
              </View>
            </View>
          </View>
        </Gate>

        {/* ══ WHY DIFFERENT ══ */}
        <Gate scrollY={scrollY}>
          <View style={styles.section} nativeID="different">
            <View style={styles.container}>
              <MonoLabel>WHY DIFFERENT · WHAT THIS IS NOT</MonoLabel>
              <H2>
                EVERYONE ELSE SELLS ANSWERS.{'\n'}
                <Text style={styles.h2Muted}>THIS IS A DISCIPLINED REFLECTION PRACTICE.</Text>
              </H2>
              <View style={styles.pillarGrid}>
                {[
                  ['A GENERIC TIPS FEED', 'A REVIEW PRACTICE', '“The mechanic that works” is the whole product there. Here your matches, your moments and your patterns are the main quest.'],
                  ['AI COACHING THAT THINKS FOR YOU', 'YOUR WORDS ARE REQUIRED', 'No AI verdicts, no auto-written lessons, no reading your head. The machine records the evidence; the player does the seeing.'],
                  ['A CARD GENERATOR OR STAT DASHBOARD', 'RECEIPTS, NOT PROMISES', 'W/D/L and pass accuracy count nothing about your decisions. Progress is earned from saved match evidence — reading, watching and tapping is not improvement.'],
                  ['A SOCIAL NETWORK', 'OPTIONAL COMPANY', 'Community supports the practice; it never replaces it. If a utility competes with the core product, it goes behind a secondary link.'],
                ].map(([they, we, b]) => (
                  <GlassCard key={they} style={styles.pillarCard}>
                    <Text style={styles.theyTxt}>{they}</Text>
                    <Text style={styles.weTxt}>{we}</Text>
                    <Text style={styles.pointBody}>{b}</Text>
                  </GlassCard>
                ))}
              </View>
            </View>
          </View>
        </Gate>

        {/* ══ FAQ ══ */}
        <Gate scrollY={scrollY}>
          <View style={styles.section} nativeID="faq">
            <View style={styles.container}>
              <MonoLabel>QUESTIONS, ANSWERED STRAIGHT</MonoLabel>
              <H2>THE FAQ</H2>
              <View style={styles.faqList}>
                {[
                  ['WHAT IS THIS?', 'A private EA FC console review practice. You play a match, review the decisions that mattered in your own words, and carry one lesson into the next match.'],
                  ['WHAT DO I DO HERE?', 'Start a Match Review around your next match. If your match has not started, choose “I’m about to play”. If it already ended, choose “I already finished a match”.'],
                  ['DO I NEED A MATCH TODAY?', 'No. If you have no match today, there is nothing to complete. You are not behind. Nothing is overdue — lateness is never punished.'],
                  ['IS THIS AN AI COACH?', 'The opposite. The app timestamps, stores and preserves receipts. It never writes your answers, never auto-selects your key moments, never generates your lesson, never uploads raw video.'],
                  ['CAN I SWITCH COACHES?', 'No. The lock is permanent — by design. Your coach is the voice, the guide and the accountability for your whole season.'],
                  ['WHY ONLY 1,000 SEATS?', 'Season One is capped and the cap is enforced by the database, not by a button. The cap keeps the practice personal. When it’s full, it’s full.'],
                  ['DO I NEED TO BE GOOD AT FC?', 'No. The Starting Week doesn’t grade your skill. It maps your behaviour under pressure — that is what the practice trains.'],
                  ['WHAT IS “WHAT GOOD LOOKS LIKE”?', 'The benchmark journey of the best in your path — a composite, never a copy of one person. It shows direction. Your evidence decides whether you’re doing the work.'],
                ].map(([q, a]) => (
                  <GlassCard key={q} style={styles.faqCard}>
                    <Text style={styles.faqQ}>{q}</Text>
                    <Text style={styles.faqA}>{a}</Text>
                  </GlassCard>
                ))}
              </View>
            </View>
          </View>
        </Gate>

        {/* ══ FINAL CTA ══ */}
        <Gate scrollY={scrollY}>
          <View style={styles.section}>
            <View style={styles.ctaBox}>
              <MonoLabel>{seatLine}</MonoLabel>
              <Text style={styles.finalTitle}>
                THE STANDARD SHOWS THE WAY.{'\n'}
                <Text style={styles.h2Muted}>YOUR EVIDENCE MOVES YOU.</Text>
              </Text>
              <Muted center style={styles.finalSub}>
                Claim your seat, seal your Starting Week, and let the work stack. The next match is
                the only one you can work on.
              </Muted>
              <View style={styles.heroCtasCenter}>
                <CtaPrimary label="CLAIM YOUR SEAT — START THE PRACTICE" onPress={onEnter} />
                <CtaSecondary label="ALREADY A MEMBER? SIGN IN" onPress={onEnter} />
              </View>
            </View>
          </View>
        </Gate>

        {/* ══ FOOTER ══ */}
        <View style={styles.footer}>
          <View style={styles.container}>
            <View style={[styles.footerGrid, isMultiColumn && { flexDirection: 'row' }]}>
              <View style={styles.footerBrand}>
                <View style={styles.navBrand}>
                  <LogoMark size={26} />
                  <Text style={styles.navBrandTxt}>PROSEASON ACADEMY</Text>
                </View>
                <Text style={styles.footerP}>
                  A disciplined reflection practice for serious console players. Play → Review →
                  Carry one lesson forward.
                </Text>
                <Text style={styles.footerMantra}>THE PLAYER DOES THE SEEING</Text>
              </View>
              <View style={styles.footerCols}>
                <View style={styles.footerCol}>
                  <Text style={styles.footerColHead}>EXPLORE</Text>
                  {ANCHORS.map(([id, label]) => (
                    <Pressable key={id} onPress={() => go(id)}>
                      <Text style={styles.footerLink}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.footerCol}>
                  <Text style={styles.footerColHead}>THE APP</Text>
                  <Text style={styles.footerLink}>Today</Text>
                  <Text style={styles.footerLink}>Match Review</Text>
                  <Text style={styles.footerLink}>Your Lesson</Text>
                  <Text style={styles.footerLink}>Progress</Text>
                </View>
                <View style={styles.footerCol}>
                  <Text style={styles.footerColHead}>TRUST</Text>
                  <Text style={styles.footerLink}>1,000 seats only</Text>
                  <Text style={styles.footerLink}>One coach · locked</Text>
                  <Text style={styles.footerLink}>Evidence before advice</Text>
                  <Text style={styles.footerLink}>Nothing is overdue</Text>
                </View>
              </View>
            </View>
            <View style={styles.footerBottom}>
              <Text style={styles.footerFine}>
                © 2026 PROSEASON ACADEMY · AN ONLIVERSITY PROGRAMME · NOT AFFILIATED WITH OR
                ENDORSED BY EA SPORTS OR EA SPORTS FC.
              </Text>
              <Text style={styles.footerFine}>SEE YOURSELF. DO THE WORK.</Text>
            </View>
          </View>
        </View>
    </>
  );

  return (
    <View style={styles.root}>
      <LivingBackground />
      <WebsiteNav onEnter={onEnter} />

      {/* Web scrolls like a website: a plain DOM scroll region with a
          definite flex height. Native keeps the RN ScrollView. */}
      {WEB ? (
        <div className="psa-site-scroll">{content}</div>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
          onScroll={(e) => {
            scrollY.value = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          {content}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050a06' },
  scroll: { flex: 1 },

  container: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 20 },
  section: { paddingVertical: 76, borderBottomWidth: 1, borderBottomColor: 'rgba(31,56,38,0.6)' },

  monoLabel: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: 14,
  },
  h1: {
    fontFamily: headFont,
    fontWeight: '700',
    fontSize: 54,
    lineHeight: 52,
    letterSpacing: -1,
    color: colors.fg,
    textTransform: 'uppercase',
  },
  h1Muted: { color: 'rgba(143,184,155,0.8)' },
  h2: {
    fontFamily: headFont,
    fontWeight: '700',
    fontSize: 34,
    lineHeight: 37,
    letterSpacing: -0.5,
    color: colors.fg,
    textTransform: 'uppercase',
    maxWidth: 880,
  },
  h2Muted: { color: 'rgba(143,184,155,0.85)' },
  h2Primary: { color: colors.primary },
  body: { fontFamily: bodyFace, fontSize: 15, lineHeight: 25, color: colors.muted },
  strong: { color: colors.fg, fontWeight: '600' },
  sectionBody: { marginTop: 18, maxWidth: 700 },

  glassNative: {
    backgroundColor: 'rgba(20,36,26,0.5)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.1)',
  },

  // nav
  nav: {
    backgroundColor: 'rgba(5,10,6,0.82)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(31,56,38,0.7)',
    zIndex: 60,
  },
  navInner: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navBrandTxt: { fontFamily: headFont, fontWeight: '700', fontSize: 15, letterSpacing: 1.6, color: colors.fg },
  navBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.2)',
    backgroundColor: 'rgba(57,255,106,0.1)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  navBadgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  navBadgeTxt: { fontFamily: monoFont, fontSize: 8, letterSpacing: 1.6, color: colors.primary },
  navLinks: { flexDirection: 'row', gap: 20 },
  navLink: { fontFamily: bodyFace, fontSize: 13, color: colors.muted },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navSignIn: { fontFamily: bodyFace, fontWeight: '600', fontSize: 12.5, letterSpacing: 1, color: colors.muted },
  navCta: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  navCtaTxt: { fontFamily: bodyFace, fontWeight: '700', fontSize: 12, letterSpacing: 0.6, color: '#040805' },
  burger: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  burgerTxt: { color: colors.muted, fontSize: 14 },
  drawer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(31,56,38,0.7)',
    backgroundColor: 'rgba(5,10,6,0.96)',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  drawerItem: { paddingVertical: 11, borderRadius: 12, paddingHorizontal: 10 },
  drawerTxt: { fontFamily: bodyFace, fontSize: 14, color: colors.muted },

  // hero
  heroGrid: { flexDirection: 'column', gap: 36, alignItems: 'stretch' },
  heroGridWide: { flexDirection: 'row', alignItems: 'center', gap: 48 },
  heroLeft: { flex: 1.1 },
  heroRight: { flex: 1, maxWidth: 520 },
  heroBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 },
  heroBrandTxt: { fontFamily: monoFont, fontSize: 10, letterSpacing: 2.6, color: colors.primary },
  heroSub: { marginTop: 22, maxWidth: 580 },
  heroCtas: { flexDirection: 'row', gap: 12, marginTop: 30, flexWrap: 'wrap' },
  heroCtasCenter: { flexDirection: 'row', gap: 12, marginTop: 30, flexWrap: 'wrap', justifyContent: 'center' },
  trustStrip: {
    marginTop: 34,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(31,56,38,0.7)',
    flexDirection: 'column',
    gap: 10,
    flexWrap: 'wrap',
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  trustTxt: { fontFamily: monoFont, fontSize: 9, letterSpacing: 1.8, color: colors.muted },

  sessionCard: { overflow: 'hidden' },
  sessionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(31,56,38,0.7)',
    backgroundColor: 'rgba(15,26,19,0.5)',
  },
  sessionHeadL: { fontFamily: monoFont, fontSize: 9, letterSpacing: 1.4, color: 'rgba(143,184,155,0.7)' },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.9, shadowRadius: 5 },
  recTxt: { fontFamily: monoFont, fontSize: 9, letterSpacing: 1.6, color: colors.primary },
  sessionBody: { padding: 20 },
  sessionLabel: { fontFamily: monoFont, fontSize: 10, letterSpacing: 2, color: colors.fg, marginBottom: 12 },
  sessionRow: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(5,10,6,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(31,56,38,0.8)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 8,
    alignItems: 'center',
  },
  sessionRowK: { fontFamily: monoFont, fontSize: 8.5, letterSpacing: 1.2, color: colors.primary, width: 108 },
  sessionRowV: { flex: 1, fontFamily: bodyFace, fontSize: 12, lineHeight: 17, color: 'rgba(238,242,236,0.9)' },
  sessionQuote: {
    marginTop: 10,
    fontFamily: bodyFontItalic,
    fontSize: 12.5,
    lineHeight: 19,
    color: 'rgba(238,242,236,0.8)',
  },
  sessionFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  sessionFootL: { fontFamily: monoFont, fontSize: 9, color: 'rgba(143,184,155,0.7)' },
  sessionFootR: { fontFamily: monoFont, fontSize: 9, color: colors.primary },

  marqueeBand: { paddingVertical: 10, borderBottomWidth: 1, borderTopWidth: 1, borderColor: 'rgba(31,56,38,0.7)' },
  marqueeTxt: {
    fontFamily: monoFont,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(143,184,155,0.8)',
  },

  problemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 22 },
  pointCard: { padding: 18, flex: 1, minWidth: 200 },
  pointTitle: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  pointBody: { fontFamily: bodyFace, fontSize: 12.5, lineHeight: 19, color: colors.muted },

  pullWrap: { marginTop: 16 },
  pull: {
    fontFamily: headFont,
    fontWeight: '700',
    fontSize: 17,
    lineHeight: 25,
    color: 'rgba(238,242,236,0.9)',
    textTransform: 'uppercase',
  },
  pullCenter: { alignItems: 'center', marginTop: 48 },
  pullBig: {
    fontFamily: headFont,
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 28,
    color: 'rgba(143,184,155,0.95)',
    textAlign: 'center',
    textTransform: 'uppercase',
    maxWidth: 760,
  },
  pullDivider: { marginTop: 20, width: 96, height: 1, backgroundColor: 'rgba(57,255,106,0.4)' },

  pillarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 28 },
  pillarCard: { padding: 22, flex: 1, minWidth: 260, maxWidth: 560 },
  pillarTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pillarNum: { fontFamily: monoFont, fontSize: 24, fontWeight: '700', color: 'rgba(57,255,106,0.35)' },
  pillarDotRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  pillarTitle: {
    fontFamily: headFont,
    fontWeight: '700',
    fontSize: 16,
    color: colors.fg,
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  baseRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  baseTick: { width: 8, height: 8, marginTop: 6, borderRadius: 2, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.7, shadowRadius: 6 },
  baseCopy: { flex: 1 },
  baseTitle: { fontFamily: bodyFace, fontWeight: '700', fontSize: 13, letterSpacing: 1.2, color: colors.fg },
  baseBody: { marginTop: 5, fontFamily: bodyFace, fontSize: 13, lineHeight: 20, color: colors.muted },

  trackCard: { padding: 22 },
  trackTag: { fontFamily: monoFont, fontSize: 9.5, letterSpacing: 1.8, color: colors.primary, marginBottom: 10 },
  trackLine: { fontFamily: bodyFace, fontSize: 13, lineHeight: 23, color: colors.muted },
  trackDivider: { height: 1, backgroundColor: 'rgba(31,56,38,0.9)', marginVertical: 14 },

  artDuo: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  artDuoHalf: { flex: 1, minWidth: 220 },

  artFrame: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(31,56,38,0.9)' },
  artLive: {
    position: 'absolute',
    left: 14,
    top: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  artLiveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  artLiveTxt: { fontFamily: monoFont, fontSize: 8, letterSpacing: 1.6, color: colors.primary },
  artCaptionRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  artCaptionLeft: { fontFamily: headFont, fontWeight: '700', fontSize: 14, color: colors.fg },
  artCaptionRight: { fontFamily: monoFont, fontSize: 8, letterSpacing: 1.4, color: 'rgba(143,184,155,0.7)' },

  insideGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24 },
  insideCard: { padding: 18, flex: 1, minWidth: 240, maxWidth: 400, overflow: 'hidden', position: 'relative' },
  insideHair: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  insideTitle: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: colors.primary,
    marginBottom: 8,
    marginTop: 6,
  },

  theyTxt: { fontFamily: monoFont, fontSize: 9, letterSpacing: 1.6, color: 'rgba(143,184,155,0.6)', marginBottom: 6 },
  weTxt: {
    fontFamily: headFont,
    fontWeight: '700',
    fontSize: 15,
    color: colors.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  faqList: { gap: 12, marginTop: 24, maxWidth: 880 },
  faqCard: { padding: 20 },
  faqQ: { fontFamily: monoFont, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, color: colors.fg, marginBottom: 8 },
  faqA: { fontFamily: bodyFace, fontSize: 13, lineHeight: 20, color: colors.muted },

  ctaBox: { alignItems: 'center', paddingVertical: 40 },
  finalTitle: {
    marginTop: 14,
    fontFamily: headFont,
    fontWeight: '700',
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -0.5,
    color: colors.fg,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  finalSub: { marginTop: 16, maxWidth: 560 },

  footer: { paddingTop: 56, paddingBottom: 36, backgroundColor: 'rgba(10,15,10,0.5)' },
  footerGrid: { flexDirection: 'column', gap: 36 },
  footerBrand: { flex: 1.1, maxWidth: 420 },
  footerP: { marginTop: 14, fontFamily: bodyFace, fontSize: 13, lineHeight: 20, color: colors.muted },
  footerMantra: { marginTop: 14, fontFamily: monoFont, fontSize: 9, letterSpacing: 2, color: 'rgba(57,255,106,0.7)' },
  footerCols: { flex: 1.4, flexDirection: 'row', gap: 32, flexWrap: 'wrap' },
  footerCol: { gap: 8, minWidth: 130 },
  footerColHead: { fontFamily: monoFont, fontSize: 9, letterSpacing: 2, color: 'rgba(143,184,155,0.6)', marginBottom: 6 },
  footerLink: { fontFamily: bodyFace, fontSize: 12.5, color: colors.muted },
  footerBottom: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(31,56,38,0.7)',
    alignItems: 'center',
    gap: 8,
  },
  footerFine: {
    fontFamily: monoFont,
    fontSize: 8.5,
    letterSpacing: 1.4,
    color: 'rgba(143,184,155,0.5)',
    textAlign: 'center',
  },

  ctaPrimary: {
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  ctaPrimaryTxt: { fontFamily: bodyFace, fontWeight: '600', fontSize: 13.5, letterSpacing: 0.6, color: '#040805' },
  ctaSecondary: {
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(31,56,38,1)',
    backgroundColor: 'rgba(15,26,19,0.6)',
    paddingHorizontal: 24,
  },
  ctaSecondaryTxt: { fontFamily: bodyFace, fontWeight: '500', fontSize: 13.5, color: colors.fg },
});
