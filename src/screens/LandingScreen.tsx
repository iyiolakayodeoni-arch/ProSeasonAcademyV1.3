import React, { useEffect, useMemo, useState } from 'react';
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
  bodyFontBold,
  bodyFontHeavy,
} from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// THE DOSSIER v2 — the Onliversity manifesto door, rebuilt in the blueprint
// register: near-black + one neon, mono labels, glass cards, hud borders,
// aurora + particles + arena grid always alive, marquee tickers, and the
// philosophy-first narrative: Hero → Experiment → Philosophy → Method →
// Programme → Inside → Till → Why Different → Platform → FAQ → CTA.
// Copy voice: ONLIVERSITY_WEBSITE_COPY.md, verbatim where it lands.
// ─────────────────────────────────────────────────────────────────────────

const WEB = Platform.OS === 'web';
const headFont = WEB ? "'Space Grotesk', 'Barlow', sans-serif" : displayFont;
const bodyFace = WEB ? "'Inter', 'Barlow', sans-serif" : bodyFont;
const ELECTRIC = '#21e6c1';
const VIOLET = '#a06bff';
const GOLD = '#ffd23f';

const ART = {
  mirror: require('../../assets/art/mirror-drill.jpg'),
  tunnel: require('../../assets/art/journey-tunnel.jpg'),
  vault: require('../../assets/art/vault-match.jpg'),
  boots: require('../../assets/art/scan-boots.jpg'),
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
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
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

/* ── scroll-gated reveal, matched to the blueprint's fade-up feel ── */
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

function MonoLabel({ children }: { children: string }) {
  return <Text style={styles.monoLabel}>{children}</Text>;
}

function H2({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <Text style={[styles.h2, center && { textAlign: 'center' }]}>{children}</Text>;
}

function Muted({ children, center, style }: { children: React.ReactNode; center?: boolean; style?: any }) {
  return (
    <Text style={[styles.body, center && { textAlign: 'center' }, style]}>{children}</Text>
  );
}

function GlassCard({
  children,
  style,
  hud,
}: {
  children?: React.ReactNode;
  style?: any;
  hud?: boolean;
}) {
  const cls = [hud ? 'onl-glass onl-hud' : 'onl-glass'];
  return (
    <View {...({ className: WEB ? cls.join(' ') : undefined } as any)} style={[styles.glassNative, style]}>
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

/* ── HUD-framed illustration, blueprint SessionArt style ── */
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
        <Text style={styles.artCaptionRight}>THE MIRROR DOES NOT THINK FOR YOU</Text>
      </View>
    </View>
  );
}

function Pill({ children, tone }: { children: string; tone?: 'primary' | 'accent' | 'gold' }) {
  const c = tone === 'accent' ? colors.accent : tone === 'gold' ? GOLD : colors.primary;
  return (
    <View style={[styles.pill, { borderColor: `${c}40`, backgroundColor: `${c}1a` }]}>
      <Text style={[styles.pillTxt, { color: c }]}>{children}</Text>
    </View>
  );
}

/* ── sticky nav ── */
const ANCHORS: [string, string][] = [
  ['philosophy', 'Philosophy'],
  ['method', 'Method'],
  ['programme', 'Programme'],
  ['inside', 'Inside'],
  ['pricing', 'Pricing'],
  ['faq', 'FAQ'],
];

function LandingNav({ onEnter }: { onEnter: () => void }) {
  const { isLaptopUp, w } = useResponsive();
  const [open, setOpen] = useState(false);

  const go = (id: string) => {
    setOpen(false);
    if (WEB && typeof document !== 'undefined') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <View {...({ className: WEB ? 'onl-hud' : undefined } as any)} style={styles.nav}>
      <View style={styles.navInner}>
        <Pressable onPress={() => go('top')} style={styles.navBrand} accessibilityRole="button">
          <LogoMark size={26} />
          <Text style={styles.navBrandTxt}>ONLIVERSITY</Text>
          {w > 480 && (
            <View style={styles.navBadge}>
              <Text style={styles.navBadgeTxt}>MIRROR · PROSEASONACADEMY</Text>
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
        </View>
      )}
    </View>
  );
}

export default function LandingScreen({ onEnter }: { onEnter: () => void }) {
  const { isMultiColumn, w } = useResponsive();
  const scrollY = useSharedValue(0);
  const [seats, setSeats] = useState<backend.SeasonGate | null>(null);

  useEffect(() => {
    void backend.liveSeatCount().then((s) => {
      if (s) setSeats(s);
    });
  }, []);

  const go = (id: string) => {
    if (WEB && typeof document !== 'undefined') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const seatLine = seats
    ? `SEASON ONE · ${seats.taken.toLocaleString('en-US')}/${seats.cap.toLocaleString('en-US')} SEATS CLAIMED`
    : 'SEASON ONE · 1,000 SEATS ONLY';

  return (
    <View style={styles.root}>
      <LivingBackground />
      <LandingNav onEnter={onEnter} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
        onScroll={(e) => {
          scrollY.value = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {/* ══ HERO ══ */}
        <View style={styles.section} nativeID="top">
          <View style={styles.container}>
            <View style={[styles.heroGrid, isMultiColumn && styles.heroGridWide]}>
              <View style={styles.heroLeft}>
                <View style={styles.heroBrandRow}>
                  <LogoMark size={30} />
                  <Text style={styles.heroBrandTxt}>MIRROR · PROSEASONACADEMY</Text>
                </View>
                <Text style={styles.h1}>
                  SEE YOURSELF.{'\n'}
                  <Text style={styles.h1Muted}>DO THE WORK.</Text>
                </Text>
                <Muted style={styles.heroSub}>
                  ProSeasonAcademy is Mirror's professional development programme for EA SPORTS FC
                  console players who want their behaviour to match their ambition.{' '}
                  <Text style={styles.strong}>One coach. One road. One standard. No excuses.</Text>
                </Muted>
                <View style={styles.heroCtas}>
                  <CtaPrimary label="START YOUR BASELINE WEEK" onPress={onEnter} />
                  <CtaSecondary label="MEET THE METHOD" onPress={() => go('method')} />
                </View>
                <View style={[styles.trustStrip, isMultiColumn && { flexDirection: 'row' }]}>
                  {[
                    'SEASON ONE · 1,000 SEATS ONLY',
                    'ONE COACH · LOCKED PERMANENTLY',
                    'THE MIRROR DOES NOT THINK FOR YOU',
                  ].map((t) => (
                    <View key={t} style={styles.trustItem}>
                      <View style={styles.trustDot} />
                      <Text style={styles.trustTxt}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* reflective session card */}
              <View style={styles.heroRight}>
                <GlassCard hud style={styles.sessionCard}>
                  <View style={styles.sessionHead}>
                    <Text style={styles.sessionHeadL}>mirror / session — baseline</Text>
                    <View style={styles.recRow}>
                      <View style={styles.recDot} />
                      <Text style={styles.recTxt}>REC</Text>
                    </View>
                  </View>
                  <View style={styles.sessionBody}>
                    <Text style={styles.sessionLabel}>INTENTION BEFORE THE MATCH</Text>
                    <Text style={styles.sessionQuote}>
                      “I will not rush my finishing inside the box.”
                    </Text>
                    {[
                      ['HALF-TIME', 'I slowed down when the lead felt nervous.'],
                      ['FULL-TIME', 'Two counters came from the same risky carry.'],
                      ['AFTER REVIEW', 'The tape says I rushed what I swore I would not.'],
                    ].map(([k, v]) => (
                      <View key={k} style={styles.sessionRow}>
                        <Text style={styles.sessionRowK}>{k}</Text>
                        <Text style={styles.sessionRowV}>{v}</Text>
                      </View>
                    ))}
                    <View style={styles.sessionFoot}>
                      <Text style={styles.sessionFootL}>The Mirror does not think for you.</Text>
                      <Text style={styles.sessionFootR}>● YOUR WORDS ONLY</Text>
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
              {'MIRROR · PROSEASONACADEMY   ◆   THE FIRST PROGRAMME   ◆   1,000 SEATS ONLY   ◆   ONE COACH · LOCKED PERMANENTLY   ◆   YOUR JOURNEY IS THE EVIDENCE   ◆   THE STANDARD IS THE BENCHMARK   ◆   THE MIRROR DOES NOT THINK FOR YOU   ◆   '}
            </Text>
          </Marquee>
        </View>

        {/* ══ THE EXPERIMENT ══ */}
        <Gate scrollY={scrollY}>
          <View style={styles.section}>
            <View style={styles.container}>
              <View style={[styles.heroGrid, isMultiColumn && styles.heroGridWide]}>
                <View style={styles.heroLeft}>
                  <MonoLabel>THE EXPERIMENT · THE APP</MonoLabel>
                  <H2>
                    AN EXPERIMENT <Text style={styles.h2Muted}>ON PURPOSE.</Text>{'\n'}A PRODUCT{' '}
                    <Text style={styles.h2Primary}>FOR REAL.</Text>
                  </H2>
                  <Muted style={styles.sectionBody}>
                    Onliversity runs one serious experiment first. ProSeasonAcademy is a proper
                    product, not a beta — capped, coached and enforced by the database. If it can
                    make FC players behave like professionals, it funds Season Two and every craft
                    after it.
                  </Muted>
                  <View style={[styles.pointGrid, isMultiColumn && { flexDirection: 'row' }]}>
                    {[
                      ['PROPER PRODUCT', 'Not a testflight of promises. Paid seats, real coaching, enforced caps.'],
                      ['AN EXPERIMENT', 'One programme first, on purpose — proof before expansion.'],
                      ['SEATS OPEN SEASON TWO', 'When a lapsed seat releases, the waitlist moves. Scarcity is the structure.'],
                    ].map(([t, b]) => (
                      <GlassCard key={t} style={styles.pointCard}>
                        <Text style={styles.pointTitle}>{t}</Text>
                        <Text style={styles.pointBody}>{b}</Text>
                      </GlassCard>
                    ))}
                  </View>
                </View>
                <View style={styles.heroRight}>
                  <GlassCard hud style={styles.appPanel}>
                    <Pill>SEASON ONE · LIVE</Pill>
                    <Text style={styles.appPanelTitle}>THE APP IS THE MAIN THING.</Text>
                    <Muted style={styles.appPanelBody}>
                      Everything lives inside ProSeasonAcademy — Baseline Week, your Journey, the
                      Mirror Sessions, The Thread. The website only tells you that.
                    </Muted>
                    <View style={styles.appPanelCtas}>
                      <CtaPrimary label="CLAIM YOUR SEAT" onPress={onEnter} />
                      <CtaSecondary label="SEE WHAT'S INSIDE" onPress={() => go('inside')} />
                    </View>
                    <View style={styles.appPanelMeta}>
                      <Text style={styles.appPanelMetaTxt}>PROPER PRODUCT ◆ 1K SEATS ◆ 14-DAY TRIAL</Text>
                    </View>
                  </GlassCard>
                </View>
              </View>
            </View>
          </View>
        </Gate>

        {/* ══ PHILOSOPHY ══ */}
        <Gate scrollY={scrollY}>
          <View style={styles.section} nativeID="philosophy">
            <View style={styles.container}>
              <MonoLabel>THE PHILOSOPHY · WHY MIRROR EXISTS</MonoLabel>
              <H2>
                WE CANNOT MAKE YOU BETTER.{'\n'}
                <Text style={styles.h2Muted}>WE CAN ONLY HELP YOU SEE YOURSELF CLEARLY</Text>{'\n'}
                <Text style={styles.h2Muted}>ENOUGH TO DO THE WORK YOURSELF.</Text>
              </H2>
              <View style={[styles.heroGrid, isMultiColumn && styles.heroGridWide]}>
                <View style={styles.heroLeft}>
                  <Muted style={styles.sectionBody}>
                    Most people say they want a professional outcome while behaving casually every
                    day. They play without purpose. They don't review their decisions. They blame
                    the game, the lag, the opponent, the luck. They repeat the same behaviour and
                    call it bad luck.
                  </Muted>
                  <Muted style={styles.sectionBody}>
                    Mirror closes the gap between ambition and behaviour. It records the evidence,
                    preserves your own thinking, and places your intentions, your feelings, your
                    memory and the recording beside one another — until self-deception becomes
                    difficult to maintain.
                  </Muted>
                  <View style={styles.problemGrid}>
                    {[
                      ['THE GAP', 'You say you want to be exceptional. Your daily process is unserious. Structure closes the gap.'],
                      ['THE LIE', 'Blaming lag, luck and opponents is comfortable — and it is the reason nothing changes.'],
                      ['THE MIRROR', 'The app preserves what you intended, felt, believed and reviewed. You see the inconsistencies yourself.'],
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
                    label="MIRROR SESSION · LIVE"
                    caption="You, beside the evidence"
                    height={isMultiColumn ? 420 : 260}
                  />
                  <View style={styles.pullWrap}>
                    <Text style={styles.pull}>
                      “MIRROR IS NOT AN ANSWER MACHINE. IT IS A STRUCTURE THAT MAKES IT DIFFICULT TO
                      KEEP GIVING YOURSELF CONVENIENT ANSWERS.”
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Gate>

        {/* ══ METHOD ══ */}
        <Gate scrollY={scrollY}>
          <View style={styles.section} nativeID="method">
            <View style={styles.container}>
              <View style={styles.methodHead}>
                <MonoLabel>HOW THE METHOD WORKS</MonoLabel>
                <H2>A STRUCTURE THAT MAKES IT DIFFICULT TO KEEP GIVING YOURSELF CONVENIENT ANSWERS</H2>
              </View>
              <View style={styles.pillarGrid}>
                {[
                  ['01', 'YOUR JOURNEY IS YOURS', 'Your road is personal. Only your matches, your answers and your receipts move it forward. Nobody can walk it for you.'],
                  ['02', 'THE STANDARD GIVES DIRECTION', 'Beside your road runs The Standard — what the best in your path learned at a comparable point. It is a benchmark, not a second track. Read it. Walk your own road.'],
                  ['03', 'EVIDENCE BEFORE ADVICE', 'You observe and answer before the app interprets. The machine records the evidence. The player does the seeing.'],
                  ['04', 'PROGRESS IS EARNED FROM RECEIPTS', 'Reading, watching or tapping is not improvement. Stages clear only when the evidence says the work was done.'],
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
                <Text style={styles.pullBig}>“YOUR JOURNEY IS THE EVIDENCE. THE STANDARD IS THE BENCHMARK.”</Text>
                <View style={styles.pullDivider} />
              </View>
            </View>
          </View>
        </Gate>

        {/* ══ MARQUEE 2 — reverse, fast ══ */}
        <View style={styles.marqueeBand}>
          <Marquee pxPerSec={82}>
            <Text style={styles.marqueeTxt}>
              {'SEE YOURSELF → CONTROL YOURSELF → READ THE GAME → BUILD DISCIPLINE → PERFORM UNDER PRESSURE → PROVE IT   ◆   EVIDENCE BEFORE ADVICE   ◆   PROGRESS IS EARNED FROM RECEIPTS   ◆   BASELINE WEEK → JOURNEY → MIRROR SESSION → THREAD   ◆   '}
            </Text>
          </Marquee>
        </View>

        {/* ══ PROGRAMME ══ */}
        <Gate scrollY={scrollY}>
          <View style={styles.section} nativeID="programme">
            <View style={styles.container}>
              <MonoLabel>THE FIRST PROGRAMME</MonoLabel>
              <H2>
                THE FIRST PROGRAMME:{'\n'}
                <Text style={styles.h2Primary}>PROSEASONACADEMY</Text>
              </H2>
              <Muted style={styles.sectionBody}>
                The first course built on the Mirror method — and the template for every course
                Onliversity will ever run.{' '}
                <Text style={styles.strong}>
                  If you can take your game this seriously, you can take anything seriously.
                </Text>
              </Muted>
              <View style={styles.pillarGrid}>
                {[
                  ['STEP 1 · THE BASELINE WEEK', 'Seven days. Five matches — one a day. After each match you name the moments where you failed, and analyse each one in your own words. Day 6 is reflection. Day 7 seals your profile. The next day unlocks 30 minutes after the last one seals — lateness is never punished.'],
                  ['STEP 2 · YOUR JOURNEY', 'One universal six-stage road: SEE YOURSELF → CONTROL YOURSELF → READ THE GAME → BUILD DISCIPLINE → PERFORM UNDER PRESSURE → PROVE IT. Your coach walks it with you. Only your evidence moves it forward.'],
                  ['STEP 3 · THE MIRROR SESSION', 'Before each match you set an intention. At half-time and full-time you answer in your own words. You mark your key moments and watch the versions of your thinking sit beside the evidence. The app never thinks for you.'],
                  ['STEP 4 · THE THREAD', 'Every session ends with one lesson you swear into The Thread. Your next session opens by asking how it held — or broke. A lesson cannot be created and immediately forgotten.'],
                ].map(([t, b]) => (
                  <GlassCard key={t} style={styles.pillarCard}>
                    <Text style={styles.pillarTitle}>{t}</Text>
                    <View style={styles.stepInner}>
                      <Text style={styles.stepInnerTxt}>{b}</Text>
                    </View>
                  </GlassCard>
                ))}
              </View>

              {/* two tracks */}
              <View style={[styles.tracksRow, isMultiColumn && { flexDirection: 'row' }]}>
                <GlassCard style={styles.trackCard}>
                  <Text style={styles.trackTag}>YOUR JOURNEY</Text>
                  <Text style={styles.trackLine}>Your current evidence</Text>
                  <Text style={styles.trackLine}>Your next objective</Text>
                  <Text style={styles.trackLine}>Your next Mirror Session</Text>
                </GlassCard>
                <GlassCard style={styles.trackCard}>
                  <Text style={[styles.trackTag, { color: colors.accent }]}>THE STANDARD</Text>
                  <Text style={styles.trackLine}>What elite players learn here</Text>
                  <Text style={styles.trackLine}>The professional behaviour to study</Text>
                  <Text style={styles.trackLine}>The standard you are approaching</Text>
                </GlassCard>
              </View>

              <View style={styles.artDuo}>
                <View style={styles.artDuoHalf}>
                  <ArtFrame source={ART.tunnel} label="SIX-STAGE ROAD" caption="The journey is the evidence" height={220} />
                </View>
                <View style={styles.artDuoHalf}>
                  <ArtFrame source={ART.boots} label="BASELINE WEEK" caption="Five matches, sealed" height={220} />
                </View>
              </View>
            </View>
          </View>
        </Gate>

        {/* ══ INSIDE ══ */}
        <Gate scrollY={scrollY}>
          <View style={styles.section} nativeID="inside">
            <View style={styles.container}>
              <MonoLabel>INSIDE THE ACADEMY</MonoLabel>
              <H2>WHAT A MEMBER GETS</H2>
              <View style={styles.insideGrid}>
                {[
                  ['ONE COACH, PERMANENTLY', 'Your lock-in is the first commitment. The app never offers a way back — on purpose.'],
                  ['THE BASELINE WEEK', 'Seven days, five matches, honest analysis. Your profile seals before the road opens.'],
                  ['YOUR JOURNEY', 'Six universal stages, machine-graded from your real receipts. No painted percentages.'],
                  ['THE STANDARD', 'The benchmark journey of the best in the path, revealed as you advance. Direction, not a task.'],
                  ['THE MIRROR SESSION', 'Intention → checkpoints → your key moments → comparison → one sworn lesson. You do the seeing.'],
                  ['THE THREAD', 'Your lesson loop. Every session asks how the last lesson held or broke.'],
                  ['MATCH VAULT', 'Every match logged in ~15 seconds. The receipt your stages are graded from.'],
                  ['LOSS JOURNAL', 'One honest line per loss. The pattern you write is the pattern he fixes.'],
                  ['THE CLUBHOUSE', 'Channels, squads, reactions. Real-time. The founder reads the serious stuff himself.'],
                  ['LOCAL RECORDING', 'Raw video stays on your phone — never uploaded. Your tape is yours.'],
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

        {/* ══ THE TILL ══ */}
        <Gate scrollY={scrollY}>
          <View style={styles.section} nativeID="pricing">
            <View style={styles.container}>
              <MonoLabel>PRICING · THE TILL</MonoLabel>
              <H2>YOUR SEAT. YOUR TERMS.</H2>
              <Muted style={styles.sectionBody}>
                ProSeasonAcademy is paid-only after the trial, because anything free is taken for
                granted. 14-day trial. 3-day grace after expiry. Refunds for time not used. Season
                One is capped at 1,000 seats — enforced by the database, not by a button.
              </Muted>
              <View style={[styles.tracksRow, isMultiColumn && { flexDirection: 'row' }]}>
                <GlassCard style={styles.tillCard}>
                  <Text style={styles.tillHead}>AFRICA · CREDIT PACKS</Text>
                  {[
                    ['NG-MID-90', '₦3,900'],
                    ['NG-PRO-90', '₦7,800'],
                    ['NG-PRO-365', '₦25,000'],
                  ].map(([k, v]) => (
                    <View key={k} style={styles.tillRow}>
                      <Text style={styles.tillCode}>{k}</Text>
                      <Text style={styles.tillPrice}>{v}</Text>
                    </View>
                  ))}
                </GlassCard>
                <GlassCard style={styles.tillCard}>
                  <Text style={styles.tillHead}>WORLD · SUBSCRIPTION</Text>
                  {[
                    ['WD-MID-90', '£7.99'],
                    ['WD-PRO-90', '£15.99'],
                    ['WD-PRO-365', '£47.99'],
                  ].map(([k, v]) => (
                    <View key={k} style={styles.tillRow}>
                      <Text style={styles.tillCode}>{k}</Text>
                      <Text style={styles.tillPrice}>{v}</Text>
                    </View>
                  ))}
                </GlassCard>
              </View>
              <GlassCard style={styles.subsidyCard}>
                <Text style={styles.subsidyTxt}>
                  Africa pays ~28% of the world price, on purpose. Same programme, same standard,
                  same receipts — priced for where you are, not where we are.
                </Text>
              </GlassCard>
              <View style={[styles.problemGrid, { marginTop: 16 }]}>
                {[
                  ['14-DAY TRIAL', 'Try before you pay.'],
                  ['FULL REFUNDS', 'Time not used = money back.'],
                  ['1,000 SEATS ONLY', "When Season One is full, it's full. That's the point."],
                ].map(([t, b]) => (
                  <GlassCard key={t} style={styles.pointCard}>
                    <Text style={styles.pointTitle}>{t}</Text>
                    <Text style={styles.pointBody}>{b}</Text>
                  </GlassCard>
                ))}
              </View>
            </View>
          </View>
        </Gate>

        {/* ══ WHY DIFFERENT ══ */}
        <Gate scrollY={scrollY}>
          <View style={styles.section}>
            <View style={styles.container}>
              <MonoLabel>WHY WE'RE DIFFERENT</MonoLabel>
              <H2>
                EVERYONE ELSE SELLS ANSWERS.{'\n'}
                <Text style={styles.h2Muted}>WE MAKE YOUR CONVENIENT ANSWERS STOP WORKING.</Text>
              </H2>
              <View style={styles.pillarGrid}>
                {[
                  ['THEY TEACH THE GAME', 'WE MAKE YOU SEE YOURSELF', '“The mechanic that works” is the whole product. Your matches, your moments, your contradictions are the main quest.'],
                  ['AI COACHES THINK FOR YOU', 'THE MIRROR REFUSES TO', '“AI watched your match — here’s what you did wrong.” A verdict you agree with is a verdict you forget. The player does the seeing.'],
                  ['OPEN DISCORDS, NO STAKES', 'ONE SEAT, ONE COACH, ONE STANDARD', 'Free, infinite, anonymous — nothing on the line. 1,000 seats, a permanent lock, a trial that converts or removes. The cap is the product.'],
                  ['STAT TRACKERS COUNT', 'WE CAPTURE THE GAP', 'W/D/L and pass accuracy. We record what you intended, felt, believed — and where the recording disagreed. Nobody else builds that.'],
                ].map(([they, we, b]) => (
                  <GlassCard key={they} style={styles.pillarCard}>
                    <Text style={styles.theyTxt}>{they}</Text>
                    <Text style={styles.weTxt}>{we}</Text>
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

        {/* ══ PLATFORM / ROAD ══ */}
        <Gate scrollY={scrollY}>
          <View style={styles.section} nativeID="next">
            <View style={styles.container}>
              <MonoLabel>THE ROAD · ONLIVERSITY</MonoLabel>
              <H2>
                ONE METHOD. <Text style={styles.h2Muted}>ANY CRAFT.</Text>
              </H2>
              <Muted style={styles.sectionBody}>
                ProSeasonAcademy is the proof. The Mirror method was built to travel — competitive
                gaming, music, writing, business, art. The coach changes. The craft changes. The
                structure stays.
              </Muted>
              <View style={[styles.tracksRow, isMultiColumn && { flexDirection: 'row' }]}>
                <GlassCard hud style={styles.seasonCard}>
                  <Pill>SEASON ONE · LIVE NOW</Pill>
                  <Text style={styles.seasonTitle}>THE MIRROR</Text>
                  <Text style={styles.pointBody}>
                    ProSeasonAcademy — EA SPORTS FC console pro. Baseline week → journey → mirror
                    session → the thread → proof.
                  </Text>
                </GlassCard>
                <GlassCard style={styles.seasonCard}>
                  <Pill tone="accent">NEXT PATH · COMING SOON</Pill>
                  <Text style={styles.seasonTitle}>THE TOURNAMENT SHAPE</Text>
                  <Text style={styles.pointBody}>
                    Season Two turns the mirror toward competition. Every future course walks the
                    same road.
                  </Text>
                </GlassCard>
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
                  ['WHY ONLY 1,000 SEATS?', 'Because one person can’t personally coach a million people. The cap keeps coaching personal — every member can actually be tracked and spoken to. When it’s full, it’s full. That’s the point.'],
                  ['CAN I SWITCH COACHES?', 'No. The path lock is permanent — by design. Commitment is the product.'],
                  ['DO I NEED TO BE GOOD AT FC?', 'No. The baseline week doesn’t grade your skill. It maps your behaviour under pressure. That’s what we train.'],
                  ['IS THIS AN AI COACH?', 'The opposite. The Mirror records the evidence; you do the seeing. No AI verdicts, no automatic lessons, no reading your head.'],
                  ['WHERE IS MY MATCH RECORDING STORED?', 'You record your console match as usual and watch your tape back. With the optional on-device recorder, raw video stays on your phone and is never uploaded.'],
                  ['WHAT HAPPENS IF I MISS A DAY?', 'Nothing. The next day unlocks 30 minutes after the last one seals — lateness is never punished. One task a day is the contract, not a threat.'],
                  ['WHAT HAPPENS WHEN SEASON ONE IS FULL?', 'You join the waitlist. You can still train solo — the vault, journey and sessions all work offline. A seat opens when a lapsed one is released.'],
                  ['WHAT IS THE STANDARD?', 'The benchmark journey of the best in your path — a composite, never a copy of one person. Your evidence decides whether you’re doing the work to get there.'],
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
                YOUR ROAD. THE STANDARD.{'\n'}
                <Text style={styles.h2Muted}>NO EXCUSES.</Text>
              </Text>
              <Muted center style={styles.finalSub}>
                Claim your seat and start your Baseline Week. The Mirror does not think for you —
                it just refuses to let you forget the sequence.
              </Muted>
              <View style={styles.heroCtasCenter}>
                <CtaPrimary label="START YOUR BASELINE WEEK" onPress={onEnter} />
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
                  <Text style={styles.navBrandTxt}>ONLIVERSITY</Text>
                </View>
                <Text style={styles.footerP}>
                  Mirror is the method. ProSeasonAcademy is the first programme. One coach. One
                  road. One standard.
                </Text>
                <Text style={styles.footerMantra}>MIRROR DOES NOT THINK FOR YOU</Text>
              </View>
              <View style={styles.footerCols}>
                <View style={styles.footerCol}>
                  <Text style={styles.footerColHead}>NAVIGATE</Text>
                  {ANCHORS.map(([id, label]) => (
                    <Pressable key={id} onPress={() => go(id)}>
                      <Text style={styles.footerLink}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.footerCol}>
                  <Text style={styles.footerColHead}>PRODUCT</Text>
                  <Text style={styles.footerLink}>ProSeasonAcademy · live</Text>
                  <Text style={styles.footerLink}>Season Two · coming soon</Text>
                  <Text style={styles.footerLink}>Waitlist</Text>
                </View>
                <View style={styles.footerCol}>
                  <Text style={styles.footerColHead}>TRUST</Text>
                  <Text style={styles.footerLink}>1,000 seats only</Text>
                  <Text style={styles.footerLink}>One coach · locked</Text>
                  <Text style={styles.footerLink}>Evidence before advice</Text>
                  <Text style={styles.footerLink}>Receipts, not promises</Text>
                </View>
              </View>
            </View>
            <View style={styles.footerBottom}>
              <Text style={styles.footerFine}>
                © 2026 ONLIVERSITY · PROSEASONACADEMY IS A DEVELOPMENT PROGRAMME, NOT A GAMING
                SERVICE, AND IS NOT AFFILIATED WITH OR ENDORSED BY EA SPORTS OR EA SPORTS FC.
              </Text>
              <Text style={styles.footerFine}>SEE YOURSELF. DO THE WORK.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050a06' },
  scroll: { flex: 1 },

  container: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 20 },
  section: { paddingVertical: 72, borderBottomWidth: 1, borderBottomColor: 'rgba(31,56,38,0.6)' },

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
    fontSize: 52,
    lineHeight: 50,
    letterSpacing: -1,
    color: colors.fg,
    textTransform: 'uppercase',
  },
  h1Muted: { color: 'rgba(143,184,155,0.8)' },
  h2: {
    fontFamily: headFont,
    fontWeight: '700',
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: colors.fg,
    textTransform: 'uppercase',
    maxWidth: 860,
  },
  h2Muted: { color: 'rgba(143,184,155,0.85)' },
  h2Primary: { color: colors.primary },
  body: {
    fontFamily: bodyFace,
    fontSize: 15,
    lineHeight: 25,
    color: colors.muted,
  },
  strong: { color: colors.fg, fontWeight: '600' },
  sectionBody: { marginTop: 18, maxWidth: 680 },

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
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navBrandTxt: {
    fontFamily: headFont,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 2,
    color: colors.fg,
  },
  navBadge: {
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.2)',
    backgroundColor: 'rgba(57,255,106,0.1)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  navBadgeTxt: { fontFamily: monoFont, fontSize: 8, letterSpacing: 1.6, color: colors.primary },
  navLinks: { flexDirection: 'row', gap: 22 },
  navLink: { fontFamily: bodyFace, fontSize: 13, color: colors.muted },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navCta: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navCtaTxt: { fontFamily: bodyFace, fontWeight: '600', fontSize: 12, color: '#040805' },
  burger: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  drawerItem: { paddingVertical: 10, borderRadius: 12, paddingHorizontal: 10 },
  drawerTxt: { fontFamily: bodyFace, fontSize: 14, color: colors.muted },

  // hero
  heroGrid: { flexDirection: 'column', gap: 36, alignItems: 'stretch' },
  heroGridWide: { flexDirection: 'row', alignItems: 'center', gap: 48 },
  heroLeft: { flex: 1.1 },
  heroRight: { flex: 1, maxWidth: 520 },
  heroBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 },
  heroBrandTxt: {
    fontFamily: monoFont,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.primary,
  },
  heroSub: { marginTop: 22, maxWidth: 560 },
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
  recDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff3d51',
    shadowColor: '#ff3d51',
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  recTxt: { fontFamily: monoFont, fontSize: 9, letterSpacing: 1.6, color: colors.primary },
  sessionBody: { padding: 20 },
  sessionLabel: { fontFamily: monoFont, fontSize: 9, letterSpacing: 2, color: colors.muted, marginBottom: 10 },
  sessionQuote: { fontFamily: bodyFace, fontSize: 15, color: colors.fg, marginBottom: 16 },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(5,10,6,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(31,56,38,0.8)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  sessionRowK: { fontFamily: monoFont, fontSize: 8, letterSpacing: 1.4, color: colors.muted, width: 84 },
  sessionRowV: { flex: 1, fontFamily: bodyFace, fontSize: 12, color: 'rgba(238,242,236,0.9)' },
  sessionFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  sessionFootL: { fontFamily: monoFont, fontSize: 9, color: 'rgba(143,184,155,0.7)' },
  sessionFootR: { fontFamily: monoFont, fontSize: 9, color: colors.primary },

  marqueeBand: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(31,56,38,0.7)',
  },
  marqueeTxt: {
    fontFamily: monoFont,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(143,184,155,0.8)',
  },

  pointGrid: { flexDirection: 'column', gap: 12, marginTop: 24, flexWrap: 'wrap' },
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

  appPanel: { padding: 28, alignItems: 'center' },
  appPanelTitle: {
    marginTop: 18,
    fontFamily: headFont,
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 26,
    color: colors.fg,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  appPanelBody: { marginTop: 10, textAlign: 'center', fontSize: 13, lineHeight: 21 },
  appPanelCtas: { flexDirection: 'column', gap: 10, marginTop: 22, alignSelf: 'stretch' },
  appPanelMeta: { marginTop: 16 },
  appPanelMetaTxt: { fontFamily: monoFont, fontSize: 8, letterSpacing: 1.6, color: 'rgba(143,184,155,0.6)' },

  problemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 22 },

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
  pullDivider: {
    marginTop: 20,
    width: 96,
    height: 1,
    backgroundColor: 'rgba(57,255,106,0.4)',
  },

  methodHead: { maxWidth: 820, marginBottom: 40 },
  pillarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 },
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
    letterSpacing: 0.2,
    color: colors.fg,
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  stepInner: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(31,56,38,0.9)',
    backgroundColor: 'rgba(5,10,6,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stepInnerTxt: { fontFamily: bodyFace, fontSize: 12, lineHeight: 19, color: 'rgba(238,242,236,0.85)' },

  tracksRow: { flexDirection: 'column', gap: 14, marginTop: 28 },
  trackCard: { padding: 22, flex: 1, minWidth: 260 },
  trackTag: { fontFamily: monoFont, fontSize: 10, letterSpacing: 2, color: colors.primary, marginBottom: 12 },
  trackLine: { fontFamily: bodyFace, fontSize: 13, lineHeight: 24, color: colors.muted },

  artDuo: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 28 },
  artDuoHalf: { flex: 1, minWidth: 280 },

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

  tillCard: { padding: 24, flex: 1, minWidth: 260 },
  tillHead: { fontFamily: monoFont, fontSize: 10, letterSpacing: 2, color: colors.fg, marginBottom: 14 },
  tillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(31,56,38,0.8)',
  },
  tillCode: { fontFamily: monoFont, fontSize: 10, letterSpacing: 1.4, color: colors.muted },
  tillPrice: { fontFamily: monoFont, fontSize: 15, fontWeight: '700', color: colors.primary },
  subsidyCard: { padding: 18, marginTop: 14, borderColor: 'rgba(242,192,120,0.3)' },
  subsidyTxt: { fontFamily: bodyFontItalic, fontSize: 13, lineHeight: 20, color: colors.accent },

  theyTxt: { fontFamily: monoFont, fontSize: 9, letterSpacing: 1.6, color: 'rgba(143,184,155,0.6)', marginBottom: 6 },
  weTxt: {
    fontFamily: headFont,
    fontWeight: '700',
    fontSize: 15,
    color: colors.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  seasonCard: { padding: 26, flex: 1, minWidth: 260 },
  seasonTitle: {
    fontFamily: headFont,
    fontWeight: '700',
    fontSize: 22,
    color: colors.fg,
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  faqList: { gap: 12, marginTop: 24, maxWidth: 860 },
  faqCard: { padding: 20 },
  faqQ: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: colors.fg,
    marginBottom: 8,
  },
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
  footerMantra: {
    marginTop: 14,
    fontFamily: monoFont,
    fontSize: 9,
    letterSpacing: 2,
    color: 'rgba(57,255,106,0.7)',
  },
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

  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillTxt: { fontFamily: monoFont, fontSize: 9, letterSpacing: 1.8 },

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
