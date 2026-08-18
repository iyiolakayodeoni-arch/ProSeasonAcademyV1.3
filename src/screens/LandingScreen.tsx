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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import InfinityCrest from '../components/InfinityCrest';
import Marquee from '../components/Marquee';
import PitchBackdrop from '../components/PitchBackdrop';
import Hero from '../components/Hero';
import { CtaPrimary, CtaSecondary } from '../components/CtaButtons';
import { useResponsive } from '../hooks/useResponsive';
import { colors, monoFont, displayFont, bodyFont, bodyFontStrong, bodyFontBold } from '../theme';
import { THE_FIFTY, sceneFeed, sceneTimeLabel } from '../data/theFifty';

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

const LOOP_ART = {
  feeling: require('../../assets/art/loop-feeling.jpg'),
  moments: require('../../assets/art/loop-moments.jpg'),
  questions: require('../../assets/art/loop-questions.jpg'),
  lessons: require('../../assets/art/loop-lessons.jpg'),
  card: require('../../assets/art/loop-card.jpg'),
};

const SCENE_ART = {
  huddle: require('../../assets/art/community-huddle.jpg'),
  vault: require('../../assets/art/vault-match.jpg'),
  boots: require('../../assets/art/scan-boots.jpg'),
  locker: require('../../assets/art/locker-room.jpg'),
};
const SCENE_ART_CYCLE = [SCENE_ART.vault, SCENE_ART.boots, SCENE_ART.huddle, SCENE_ART.locker];

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

/** Whole picture, scaled to the box. Never cropped. */
function FitArt({ source, tall }: { source: any; tall?: boolean }) {
  return (
    <View style={[styles.artFrame, tall && styles.artFrameTall]}>
      <Image source={source} style={styles.artFill} resizeMode="contain" />
    </View>
  );
}

function HoverCard({
  children,
  style,
  delay = 80,
  onPress,
}: {
  children: React.ReactNode;
  style?: object;
  delay?: number;
  onPress?: () => void;
}) {
  const { hovered, bind } = useHover();
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(560)} style={style}>
      <Pressable
        onPress={onPress}
        {...bind}
        style={[styles.glassCard, styles.cardFill, hovered && styles.glassHot]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

function NavLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { hovered, bind } = useHover();
  return (
    <Pressable onPress={onPress} hitSlop={6} {...bind}>
      <Text style={[styles.navLink, hovered && styles.navLinkHot]}>{label}</Text>
    </Pressable>
  );
}

function LoopStep({
  step,
  last,
  delay,
  active,
  onPress,
}: {
  step: {
    n: string;
    when: string;
    title: string;
    body: string;
    aside: string;
    art: any;
  };
  last: boolean;
  delay: number;
  active: boolean;
  onPress: () => void;
}) {
  const { hovered, bind } = useHover();
  const on = active || hovered;
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(560)} style={styles.loopStep}>
      <View style={styles.loopSpine}>
        <Text style={[styles.loopNum, on && styles.loopNumHot]}>{step.n}</Text>
        {!last && <View style={[styles.loopLine, on && styles.loopLineHot]} />}
      </View>
      <Pressable
        onPress={onPress}
        {...bind}
        style={[styles.glassCard, styles.loopCard, on && styles.glassHot]}
      >
        <FitArt source={step.art} tall />
        <Text style={styles.loopWhen}>{step.when}</Text>
        <Text style={styles.cardTitle}>{step.title}</Text>
        <Text style={styles.cardBody}>{step.body}</Text>
        <Aside>{step.aside}</Aside>
      </Pressable>
    </Animated.View>
  );
}

function LiveQuestion({
  q,
  open,
  onPress,
}: {
  q: { n: string; t: string; d: string };
  open: boolean;
  onPress: () => void;
}) {
  const { hovered, bind } = useHover();
  const on = open || hovered;
  return (
    <Pressable onPress={onPress} {...bind} style={[styles.questionItem, on && styles.questionHot]}>
      <Text style={[styles.questionN, on && styles.questionNHot]}>{q.n}</Text>
      <Text style={styles.questionT}>{q.t}</Text>
      <Text style={styles.questionD}>{q.d}</Text>
    </Pressable>
  );
}

function HomePrimary({ onPress, contentW }: { onPress: () => void; contentW: number }) {
  const { hovered, bind } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...bind}
      style={[styles.homePrimary, { maxWidth: contentW }, hovered && styles.homePrimaryHot]}
    >
      <Text style={styles.homePrimaryBadge}>THE ONE TAP</Text>
      <Text style={[styles.homePrimaryTitle, WEB ? ({ fontFamily: headFont } as any) : null]}>
        ENTER THE LOOP
      </Text>
      <Text style={[styles.homePrimaryBody, WEB ? ({ fontFamily: bodyFace } as any) : null]}>
        The ritual is the teacher. No stop date. You type it. The card comes last.
      </Text>
    </Pressable>
  );
}

function LivePost({
  post,
  art,
}: {
  post: { handle: string; date: string; kind: string; headline: string; body: string };
  art: any;
}) {
  const { hovered, bind } = useHover();
  return (
    <Pressable {...bind} style={[styles.scenePost, hovered && styles.scenePostHot]}>
      <View style={styles.scenePostTop}>
        <Text style={styles.sceneHandle}>{post.handle}</Text>
        <Text style={styles.sceneTime}>{sceneTimeLabel(post.date)}</Text>
      </View>
      <FitArt source={art} />
      <Text style={styles.sceneTag}>{post.kind}</Text>
      <Text style={styles.sceneHeadline}>{post.headline}</Text>
      <Text style={styles.sceneBody}>{post.body}</Text>
    </Pressable>
  );
}

/* ── pinned nav — laptop: full row · tablet: short labels · phone: menu ── */
const NAV_LINKS_FULL: [string, string][] = [
  ['METHOD', 'method'],
  ['THE LOOP', 'loop'],
  ['TODAY', 'today'],
  ['THE SCENE', 'scene'],
  ['JOURNEY', 'journey'],
];
const NAV_LINKS_SHORT: [string, string][] = [
  ['METHOD', 'method'],
  ['LOOP', 'loop'],
  ['TODAY', 'today'],
  ['SCENE', 'scene'],
  ['JOURNEY', 'journey'],
];

function WebsiteNav({
  onEnter,
  onNav,
  compact,
  open,
  onToggle,
}: {
  onEnter: () => void;
  onNav: (id: string) => void;
  compact: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const { width } = useWindowDimensions();
  const phone = width < 720;
  const links = compact ? NAV_LINKS_SHORT : NAV_LINKS_FULL;

  return (
    <View style={styles.navWrap}>
      <View style={[styles.nav, compact && styles.navCompact]}>
        <Pressable onPress={onEnter} style={styles.navBrand} accessibilityRole="button">
          <InfinityCrest size={phone ? 22 : 26} />
          <Text
            style={[styles.navBrandTxt, phone && styles.navBrandTxtPhone]}
            numberOfLines={1}
          >
            {phone ? 'PROSEASON' : 'PROSEASON ACADEMY'}
          </Text>
        </Pressable>

        {!compact && (
          <View style={styles.navLinks}>
            {links.map(([label, id], i) => (
              <React.Fragment key={id}>
                {i > 0 && <Text style={styles.navSlash}>/</Text>}
                <Pressable onPress={() => onNav(id)} hitSlop={6}>
                  <Text style={styles.navLink}>{label}</Text>
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        )}

        <View style={styles.navActions}>
          {!compact && (
            <>
              <Pressable onPress={onEnter} hitSlop={6}>
                <Text style={styles.navSignIn}>SIGN IN</Text>
              </Pressable>
              <Pressable onPress={onEnter}>
                <View style={styles.navCta}>
                  <Text style={styles.navCtaTxt}>GET STARTED</Text>
                </View>
              </Pressable>
            </>
          )}
          {compact && (
            <Pressable
              onPress={onToggle}
              style={styles.burgerBtn}
              accessibilityRole="button"
              accessibilityLabel={open ? 'Close menu' : 'Open menu'}
            >
              <View style={[styles.burgerLine, open && styles.burgerHide]} />
              <View style={[styles.burgerLine, open && styles.burgerHide]} />
              <View style={[styles.burgerLine, open && styles.burgerHide]} />
              {open && <Text style={styles.burgerClose}>✕</Text>}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function NavOverlay({
  onEnter,
  onNav,
  onClose,
}: {
  onEnter: () => void;
  onNav: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <Pressable
        style={styles.menuScrim}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close menu"
      />
      <Animated.View entering={FadeInDown.duration(220)} style={styles.menuSheet}>
        {NAV_LINKS_SHORT.map(([label, id]) => (
          <Pressable key={id} onPress={() => onNav(id)} style={styles.menuItem}>
            <Text style={styles.menuItemTxt}>{label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={onEnter} style={styles.menuItem}>
          <Text style={styles.menuItemTxt}>SIGN IN</Text>
        </Pressable>
        <Pressable onPress={onEnter} style={styles.menuCta}>
          <Text style={styles.navCtaTxt}>GET STARTED</Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

const CHAPTERS = [
  { n: '01', title: 'PLAY THE MATCH', body: 'Drop in the footage. No setup, no spreadsheet. The session starts the second the whistle does.' },
  { n: '02', title: 'WATCH YOURSELF', body: 'Watch the tape once. Then stop. The first job is not analysis — it is noticing what the match did to you.' },
  { n: '03', title: 'WRITE THE FEELING', body: 'On paper first. No discipline, no pretence. Exactly how you feel. Then type that same line into the app.' },
  { n: '04', title: 'THE LESSONS', body: 'Every key moment leaves a rule from your own game. We list them. That list is what the match taught you.' },
  { n: '05', title: 'REPEAT THE LOOP', body: 'Next match. Same ritual. The repetition is the training — not the drill, the discipline.' },
  { n: '06', title: 'COMPOUND', body: 'Week over week the ledger fills. Progress stops being a feeling and becomes an entry.' },
];

const LOOP_STEPS = [
  {
    n: '01',
    when: 'TONIGHT',
    title: 'THE FEELING',
    body: 'Watch the tape once. Then stop being a footballer. Write exactly how you feel on a piece of paper — no pressure, no discipline, no pretending. Then type that same line into the app. We keep it. We do not use it yet.',
    aside: 'the feeling is true. it is also dirty',
    art: LOOP_ART.feeling,
  },
  {
    n: '02',
    when: '24 HOURS LATER',
    title: 'THE MOMENTS',
    body: 'Now you are calm. Write the moments that actually changed the game — the ones that mattered to you. Paper first. Then the app. If you write it down, it stays in your head.',
    aside: 'not every event. the ones that turned it',
    art: LOOP_ART.moments,
  },
  {
    n: '03',
    when: 'EACH MOMENT',
    title: 'THE QUESTIONS',
    body: 'Name it. Mark the time. Reconstruct the game state before you judge anything. What they were actually doing. What you were actually doing. Whether you were even present. Then who won the exchange, why it failed, and one rule you can drill next time.',
    aside: 'paper first. then you type it',
    art: LOOP_ART.questions,
  },
  {
    n: '04',
    when: 'FROM YOUR OWN GAME',
    title: 'THE LESSONS',
    body: 'You do not invent a lesson because the app asked for one. The last answer on each moment is the lesson. We list them. Then one final question. Then you enter the match numbers so the card can be built.',
    aside: 'not from a youtube clip. from you, watching you',
    art: LOOP_ART.lessons,
  },
  {
    n: '05',
    when: 'THE RECEIPT',
    title: 'THE CARD',
    body: 'One card. Your stats — read against that opponent. Not two scoreboards. How you actually played in relation to them, in this match, shareable. The card is not the work. It is the receipt.',
    aside: 'you vs them. one object. not both sheets',
    art: LOOP_ART.card,
  },
];

const LOOP_QUESTIONS = [
  { n: '01', t: 'RECONSTRUCT THE GAME STATE', d: 'Score, time left, formation, numbers, phase of play. No context, no right to judge the decision.' },
  { n: '02', t: 'WHAT WERE THEY ACTUALLY DOING', d: 'Shape and movement in the 2–3 seconds before. What they did — not what you assumed they would do.' },
  { n: '03', t: 'WHAT WERE YOU ACTUALLY DOING', d: 'Position, real options, body shape, and what your first touch already committed you to.' },
  { n: '04', t: 'WERE YOU PRESENT', d: 'Reading what was in front of you — or running a plan the picture had already killed.' },
  { n: '05', t: 'YOUR THINKING. THEIR THINKING.', d: 'Your intention in one sentence. Then flip it: what were they trying to bait or deny.' },
  { n: '06', t: 'WHO WON THE EXCHANGE', d: 'Not goal / no goal. Space, timing, decision. You can lose the moment with a process that was right.' },
  { n: '07', t: 'WHY IT FAILED — OR WORKED', d: 'Perception, decision, or execution. Most players blame the last one. Check the other two first.' },
  { n: '08', t: 'ONE RULE FOR NEXT TIME', d: 'Not “be better.” A sentence you can drill and recognise live.' },
];

const SCENE_PILLARS = [
  {
    n: '01',
    title: 'THE FIFTY',
    body: 'About fifty of the top FC pro players, kept in one book. What they are doing in public. Their titles. Their story as it moves.',
    aside: 'tracked. not worshipped',
    art: SCENE_ART.huddle,
  },
  {
    n: '02',
    title: 'TITLES & THE SCENE',
    body: 'Who lifted what. Who dropped. The FC 26 pro scene as it actually stands this week — not a rumour thread.',
    aside: 'the ladder, written down',
    art: SCENE_ART.vault,
  },
  {
    n: '03',
    title: 'NEWS & MECHANICS',
    body: 'New skills, reworked systems, PlayStyles, patch notes — with the input and a three-step way to learn each one.',
    aside: 'the world you are training in',
    art: SCENE_ART.boots,
  },
];

const HOME_FEATURES = [
  {
    n: '01',
    badge: 'THE GUIDE',
    title: 'THE LOOP',
    body: 'Watch once. Write how you feel. Wait a day. Take the match apart. Session by session. Forever.',
  },
  {
    n: '02',
    badge: 'YOU TYPE IT',
    title: 'THE NUMBERS',
    body: 'Type the match numbers after the work. Your stats against that opponent. Nothing to upload.',
  },
  {
    n: '03',
    badge: 'LIVE BOOK',
    title: 'THE SCENE · THE FIFTY',
    body: 'Fifty current FC Pro names. Titles, public handles, the feed, and the mechanics book.',
  },
  {
    n: '04',
    badge: 'PATCH NOTES',
    title: 'FC UPDATES & ACADEMY',
    body: 'Founder notes, approved news, MetaBot tricks. Only the receipts that help you win.',
  },
  {
    n: '05',
    badge: 'GUIDE',
    title: 'LEARN THE BASICS',
    body: 'New foundations first. The simple, repeatable things that win difficult matches.',
  },
  {
    n: '06',
    badge: 'LIVE',
    title: 'CLUBHOUSE COMMUNITY',
    body: 'Bring a question, a score, or an honest lesson. The halls are optional. The Loop is not.',
  },
  {
    n: '07',
    badge: 'LOCKED IN',
    title: 'STARTING BASELINE',
    body: 'A sealed starting week. What good looks like, beside your own evidence. No coach. The work is yours.',
  },
];

export default function LandingScreen({ onEnter }: { onEnter: () => void }) {
  const { width: winW, height: winH } = useWindowDimensions();
  const { isWide, isDesktopUp } = useResponsive();
  const contentW = Math.min(winW, isDesktopUp ? 1200 : 900) - (isWide ? 48 : 28) * 2;
  const compact = winW < 1100;

  const ref = useRef<ScrollView>(null);
  const [navH, setNavH] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState('01');
  const [activeQ, setActiveQ] = useState('01');

  // ScrollView on web needs an explicit height — the flex chain alone won't
  // give it one. Measure the sticky nav, then give the scroller the rest.
  const scrollH = Math.max(0, winH - navH);

  React.useEffect(() => {
    if (!compact) setMenuOpen(false);
  }, [compact]);

  // Nav anchor scroll
  const goSection = (id: string) => {
    setMenuOpen(false);
    if (WEB) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const y: Record<string, number> = { method: 900, loop: 1750, today: 3200, scene: 4200, journey: 5600, evidence: 6700 };
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
        style={styles.navSlot}
      >
        <WebsiteNav
          onEnter={onEnter}
          onNav={goSection}
          compact={compact}
          open={menuOpen}
          onToggle={() => setMenuOpen((v) => !v)}
        />
      </View>

      {compact && menuOpen && (
        <Animated.View
          entering={FadeIn.duration(160)}
          style={[styles.menuLayer, { top: navH }]}
        >
          <NavOverlay
            onEnter={() => {
              setMenuOpen(false);
              onEnter();
            }}
            onNav={goSection}
            onClose={() => setMenuOpen(false)}
          />
        </Animated.View>
      )}

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
            onSecondary={() => goSection('loop')}
            isWide={isWide}
            contentWidth={contentW}
          />
        </View>

        {/* ── THE METHOD ── */}
        <View style={styles.section} id="method">
          <Eyebrow>[ METHOD ]</Eyebrow>
          <H2 center>THE LOOP IS THE ONLY GUIDE.</H2>
          <Muted center>
            No coach. Nothing talking at you. The ritual is the teacher — tonight the feeling,
            tomorrow the film room. Mix those two heads and you lie to yourself.
          </Muted>
          <View style={[styles.cardRow, { maxWidth: contentW }]}>
            <HoverCard delay={100} style={styles.card}>
              <FitArt source={ILLUS.journal} />
              <Text style={styles.cardIndex}>01</Text>
              <Text style={styles.cardTitle}>PAPER FIRST</Text>
              <Text style={styles.cardBody}>
                Write it by hand before you type it. Typing too early makes it neat. Neat is fake. If you write it down, it stays in your head.
              </Text>
              <Aside>there is a reason we ask for the biro</Aside>
            </HoverCard>
            <HoverCard delay={180} style={styles.card}>
              <FitArt source={ILLUS.mirror} />
              <Text style={styles.cardIndex}>02</Text>
              <Text style={styles.cardTitle}>TWO HEADS</Text>
              <Text style={styles.cardBody}>
                Tonight you capture the feeling before you can edit it. Tomorrow you do the film room, when you can actually see.
              </Text>
              <Aside>mix them and you lie to yourself</Aside>
            </HoverCard>
            <HoverCard delay={260} style={styles.card}>
              <FitArt source={ILLUS.ledger} />
              <Text style={styles.cardIndex}>03</Text>
              <Text style={styles.cardTitle}>THE CARD COMES LAST</Text>
              <Text style={styles.cardBody}>
                After the thinking, you get one card: your performance in relation to that opponent. Not their sheet next to yours. Yours, against them.
              </Text>
              <Aside>no flex without the film room</Aside>
            </HoverCard>
          </View>
        </View>

        {/* ── THE LOOP — how we actually work ── */}
        <View style={styles.section} id="loop">
          <Eyebrow>[ THE LOOP ]</Eyebrow>
          <H2 center>THIS IS HOW WE ACTUALLY WORK.</H2>
          <Muted center>
            Play. Watch it once. Write how you feel. Wait a day. Then take the match
            apart — on paper first, then in the app. Then you get the card.
          </Muted>

          <View style={[styles.loopRail, { maxWidth: contentW }]}>
            {LOOP_STEPS.map((step, i) => (
              <LoopStep
                key={step.n}
                step={step}
                last={i === LOOP_STEPS.length - 1}
                delay={80 + i * 70}
                active={activeStep === step.n}
                onPress={() => setActiveStep(step.n)}
              />
            ))}
          </View>

          <View style={[styles.questionsBoard, { maxWidth: contentW }]}>
            <Text style={styles.questionsEyebrow}>[ THE QUESTIONS · EVERY KEY MOMENT ]</Text>
            <Text style={[styles.questionsHead, WEB ? ({ fontFamily: headFont } as any) : null]}>
              YOU CANNOT HIDE IN “I JUST MISSED IT.”
            </Text>
            <Text style={[styles.questionsLead, WEB ? ({ fontFamily: bodyFace } as any) : null]}>
              Name the moment. Choose the time. Answer these on paper. Then type them in the app.
            </Text>
            <View style={styles.questionsGrid}>
              {LOOP_QUESTIONS.map((q) => (
                <View key={q.n} style={styles.questionItem}>
                  <Text style={styles.questionN}>{q.n}</Text>
                  <Text style={styles.questionT}>{q.t}</Text>
                  <Text style={styles.questionD}>{q.d}</Text>
                </View>
              ))}
            </View>
            <Aside>perception · decision · execution — check the first two first</Aside>
          </View>

          <View style={[styles.loopClose, { maxWidth: contentW }]}>
            <InfinityCrest size={36} />
            <Text style={[styles.loopCloseTxt, WEB ? ({ fontFamily: headFont } as any) : null]}>
              NEXT MATCH. SAME LOOP. FOREVER.
            </Text>
          </View>
        </View>

        {/* ── TODAY — the home screen, advertised ── */}
        <View style={styles.section} id="today">
          <Eyebrow>[ TODAY ]</Eyebrow>
          <H2 center>THIS IS THE HOME SCREEN.</H2>
          <Muted center>
            You open Today. One job is green. Everything else is a workspace.
            The Loop guides you. These are the rooms around it — not a person.
          </Muted>
          <HomePrimary onPress={onEnter} contentW={contentW} />
          <View style={[styles.cardRow, { maxWidth: contentW }]}>
            {HOME_FEATURES.map((f, i) => (
              <HoverCard key={f.n} delay={80 + i * 50} style={styles.homeCard} onPress={onEnter}>
                <Text style={styles.loopWhen}>{f.badge}</Text>
                <Text style={styles.cardTitle}>{f.title}</Text>
                <Text style={styles.cardBody}>{f.body}</Text>
              </HoverCard>
            ))}
          </View>
        </View>

        {/* ── ROLE MODEL UPDATES / THE SCENE ── */}
        <View style={styles.section} id="scene">
          <Eyebrow>[ ROLE MODEL UPDATES ]</Eyebrow>
          <H2 center>FIFTY PROS. ONE FEED.</H2>
          <Muted center>
            {THE_FIFTY.length} current FC Pro names in the book. Public titles. Public results.
            RvPLegend is world champion. Vejrgang took the Open and the eCL. You scroll it like Instagram.
          </Muted>

          <View style={[styles.cardRow, { maxWidth: contentW }]}>
            {SCENE_PILLARS.map((p, i) => (
              <HoverCard key={p.n} delay={100 + i * 80} style={styles.card}>
                <FitArt source={p.art} />
                <Text style={styles.cardIndex}>{p.n}</Text>
                <Text style={styles.cardTitle}>{p.title}</Text>
                <Text style={styles.cardBody}>{p.body}</Text>
                <Aside>{p.aside}</Aside>
              </HoverCard>
            ))}
          </View>

          <View style={[styles.sceneBoard, { maxWidth: Math.min(contentW, 560) }]}>
            <View style={styles.sceneBoardHead}>
              <Text style={styles.questionsEyebrow}>[ THE FEED ]</Text>
              <Text style={styles.sceneLive}>LIVE</Text>
            </View>
            <Text style={[styles.questionsHead, WEB ? ({ fontFamily: headFont } as any) : null]}>
              SCROLL IT LIKE INSTAGRAM.
            </Text>
            <Text style={[styles.questionsLead, WEB ? ({ fontFamily: bodyFace } as any) : null]}>
              Players. Titles. News. Mechanics. One stream. The Loop is the work. This is the world you are training in.
            </Text>
            {sceneFeed().slice(0, 4).map((post, i) => (
              <LivePost
                key={post.id}
                post={post}
                art={SCENE_ART_CYCLE[i % SCENE_ART_CYCLE.length]}
              />
            ))}
            <Aside>public tournament record only. we do not invent their lives</Aside>
          </View>
        </View>

        {/* ── THE JOURNEY ── */}
        <View style={styles.section} id="journey">
          <Eyebrow>[ THE JOURNEY ]</Eyebrow>
          <H2 center>SIX CHAPTERS. THE LOOP IS THE WORK.</H2>
          <Muted center>
            No stop date, no graduation. The chapters give the road a shape. The Loop is
            what you actually do — session by session, infinitely. The mistakes are the tuition.
          </Muted>
          <View style={[styles.cardRow, { maxWidth: contentW }]}>
            {CHAPTERS.map((c, i) => (
              <Animated.View key={c.n} entering={FadeInDown.delay(100 + i * 70).duration(600)} style={styles.chapterCard}>
                <GlassCard style={styles.cardFill}>
                  <FitArt source={[ILLUS.mirror, ILLUS.journal, ILLUS.ledger, ILLUS.intention, ILLUS.moments, ILLUS.mirror][i % 6]} />
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
            <HoverCard delay={100} style={styles.evidenceCard}>
              <View style={styles.evidenceInner}>
                <FitArt source={ILLUS.mirror} />
                <Text style={styles.evidenceStat}>100%</Text>
                <Text style={[styles.cardBody, styles.center]}>of the review is yours. You see it, you name it, you keep it.</Text>
                <Aside>no AI verdicts</Aside>
              </View>
            </HoverCard>
            <HoverCard delay={180} style={styles.evidenceCard}>
              <View style={styles.evidenceInner}>
                <FitArt source={ILLUS.journal} />
                <Text style={styles.evidenceStat}>24H</Text>
                <Text style={[styles.cardBody, styles.center]}>between the feeling and the film room. Tonight you write how you feel. Tomorrow you see.</Text>
                <Aside>calm is part of the method</Aside>
              </View>
            </HoverCard>
            <HoverCard delay={260} style={styles.evidenceCard}>
              <View style={styles.evidenceInner}>
                <FitArt source={ILLUS.ledger} />
                <Text style={styles.evidenceStat}>∞</Text>
                <Text style={[styles.cardBody, styles.center]}>the loop keeps compounding. Progress becomes an entry, then a habit.</Text>
                <Aside>you cannot outrun your receipts</Aside>
              </View>
            </HoverCard>
          </View>
        </View>

        {/* ── CTA ── */}
        <View style={[styles.ctaBanner, { maxWidth: contentW }]}>
          <Eyebrow>CLAIM YOUR SEAT</Eyebrow>
          <Text style={[styles.ctaHead, WEB ? ({ fontFamily: headFont } as any) : null]}>
            THE LOOP IS THE GUIDE. NOTHING ELSE.
          </Text>
          <Muted center>
            One thousand seats — when it's full, it's full. Sign in, seal the baseline,
            start the Loop. No coach. No voice in your ear. The ritual is the teacher.
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
              PLAY · WATCH ONCE · WRITE HOW YOU FEEL · WAIT A DAY · NAME THE MOMENTS · ASK THE QUESTIONS · KEEP THE LESSONS · THE CARD · THE LOOP · THE FIFTY · THE SCENE ·
              PLAY · WATCH ONCE · WRITE HOW YOU FEEL · WAIT A DAY · NAME THE MOMENTS · ASK THE QUESTIONS · KEEP THE LESSONS · THE CARD · THE LOOP · THE FIFTY · THE SCENE ·
            </Text>
          </Marquee>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>PROSEASON ACADEMY</Text>
          <Text style={styles.footerTag}>THE CONSOLE ACADEMY · THE LOOP · SESSION BY SESSION</Text>
          <Text style=E LESSONS · THE CARD · THE LOOP · THE FIFTY · THE SCENE ·
            </Text>
          </Marquee>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>PROSEASON ACADEMY</Text>
          <Text style={styles.footerTag}>THE CONSOLE ACADEMY · THE LOOP · SESSION BY SESSION</Text>
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
    // @ts-ignore web
    transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
    cursor: 'pointer',
  },
  glassHot: {
    borderColor: 'rgba(57,255,106,0.55)',
    transform: [{ translateY: -4 }],
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
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
  navSlot: {
    zIndex: 90,
  },
  navWrap: {
    zIndex: 90,
    backgroundColor: 'rgba(5,10,6,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 16,
    minHeight: 58,
  },
  navCompact: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
    minWidth: 0,
  },
  navBrandTxt: {
    fontFamily: bodyFontBold,
    fontSize: 13,
    letterSpacing: 2,
    color: colors.fg,
    flexShrink: 1,
  },
  navBrandTxtPhone: {
    fontSize: 12,
    letterSpacing: 1.2,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 0,
  },
  navLinksTablet: {
    gap: 8,
    flexWrap: 'nowrap',
  },
  navLink: {
    fontFamily: monoFont,
    fontSize: 12,
    letterSpacing: 1.6,
    color: '#9CA3AF',
    // @ts-ignore web
    transition: 'color 150ms ease',
  },
  navLinkHot: {
    color: colors.primary,
  },
  navLinkTablet: {
    fontSize: 10,
    letterSpacing: 1,
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
    gap: 14,
    flexShrink: 0,
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
  navCtaTablet: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navCtaTxt: {
    fontFamily: bodyFontBold,
    fontSize: 11,
    letterSpacing: 1.3,
    color: '#03140a',
  },
  burgerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  burgerLine: {
    width: 18,
    height: 1.5,
    backgroundColor: colors.fg,
    borderRadius: 1,
  },
  burgerHide: {
    opacity: 0,
  },
  burgerClose: {
    position: 'absolute',
    fontFamily: bodyFontBold,
    fontSize: 18,
    color: colors.fg,
    lineHeight: 20,
  },
  menuLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 80,
  },
  menuScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 4, 0.78)',
  },
  menuSheet: {
    backgroundColor: 'rgba(5,10,6,0.98)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 22,
  },
  menuItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(143,184,155,0.12)',
  },
  menuItemTxt: {
    fontFamily: monoFont,
    fontSize: 15,
    letterSpacing: 2.4,
    color: colors.fg,
  },
  menuCta: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
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
  artFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    marginBottom: 14,
    overflow: 'hidden',
    backgroundColor: '#06110b',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  artFrameTall: {
    aspectRatio: 16 / 9,
    marginBottom: 16,
  },
  artFill: {
    width: '100%',
    height: '100%',
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
  loopRail: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  loopStep: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
  },
  loopSpine: {
    width: 42,
    alignItems: 'center',
  },
  loopNum: {
    fontFamily: displayFont,
    fontSize: 22,
    color: colors.primary,
    lineHeight: 26,
    opacity: 0.7,
  },
  loopNumHot: {
    opacity: 1,
    textShadowColor: 'rgba(57,255,106,0.45)',
    textShadowRadius: 12,
  },
  loopLine: {
    flex: 1,
    width: 1,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(57,255,106,0.28)',
  },
  loopLineHot: {
    backgroundColor: 'rgba(57,255,106,0.7)',
  },
  loopCard: {
    flex: 1,
    marginBottom: 10,
  },
  loopArt: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    marginBottom: 16,
    backgroundColor: '#06110b',
  },
  loopWhen: {
    fontFamily: monoFont,
    fontSize: 10.5,
    letterSpacing: 2.4,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  questionsBoard: {
    width: '100%',
    marginTop: 36,
    padding: 28,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
  },
  questionsEyebrow: {
    fontFamily: monoFont,
    fontSize: 10.5,
    letterSpacing: 2.6,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  questionsHead: {
    fontFamily: displayFont,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: 0.4,
    color: colors.fg,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 10,
  },
  questionsLead: {
    fontFamily: bodyFont,
    fontSize: 15,
    lineHeight: 23,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 520,
    marginBottom: 22,
  },
  questionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    width: '100%',
    justifyContent: 'center',
  },
  questionItem: {
    flexBasis: 240,
    flexGrow: 1,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 14,
    padding: 16,
    // @ts-ignore web
    transition: 'border-color 160ms ease, transform 160ms ease',
    cursor: 'pointer',
  },
  questionHot: {
    borderColor: 'rgba(57,255,106,0.5)',
    transform: [{ translateY: -2 }],
  },
  questionN: {
    fontFamily: monoFont,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.primaryDim,
    marginBottom: 8,
  },
  questionNHot: {
    color: colors.primary,
  },
  questionT: {
    fontFamily: bodyFontStrong,
    fontSize: 13,
    letterSpacing: 1.1,
    color: colors.fg,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  questionD: {
    fontFamily: bodyFont,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.muted,
  },
  loopClose: {
    width: '100%',
    marginTop: 36,
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  loopCloseTxt: {
    fontFamily: displayFont,
    fontSize: 22,
    letterSpacing: 1.2,
    color: colors.primary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  sceneBoard: {
    width: '100%',
    marginTop: 40,
    padding: 22,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
  },
  sceneBoardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  sceneLive: {
    fontFamily: monoFont,
    fontSize: 10,
    letterSpacing: 2,
    color: '#03140a',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  scenePost: {
    width: '100%',
    marginTop: 16,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 16,
    padding: 14,
    // @ts-ignore web
    transition: 'border-color 160ms ease, transform 160ms ease',
    cursor: 'pointer',
  },
  scenePostHot: {
    borderColor: 'rgba(57,255,106,0.45)',
    transform: [{ translateY: -3 }],
  },
  scenePostTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sceneHandle: {
    fontFamily: bodyFontBold,
    fontSize: 12,
    letterSpacing: 1.4,
    color: colors.fg,
  },
  sceneTime: {
    fontFamily: monoFont,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.mutedDim,
  },
  scenePostArt: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#06110b',
  },
  sceneTag: {
    fontFamily: monoFont,
    fontSize: 10,
    letterSpacing: 2.2,
    color: colors.primary,
    marginBottom: 6,
  },
  sceneHeadline: {
    fontFamily: bodyFontStrong,
    fontSize: 16,
    lineHeight: 22,
    color: colors.fg,
    marginBottom: 6,
  },
  sceneBody: {
    fontFamily: bodyFont,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  homePrimary: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginBottom: 22,
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  homePrimaryBadge: {
    fontFamily: monoFont,
    fontSize: 10,
    letterSpacing: 2.4,
    color: '#03140a',
    marginBottom: 10,
  },
  homePrimaryTitle: {
    fontFamily: displayFont,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: 0.6,
    color: '#03140a',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 10,
  },
  homePrimaryBody: {
    fontFamily: bodyFont,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(3,20,10,0.78)',
    textAlign: 'center',
    maxWidth: 520,
  },
  homeCard: {
    flexBasis: 240,
    flexGrow: 1,
  },
});
    maxWidth: 520,
  },
  homeCard: {
    flexBasis: 240,
    flexGrow: 1,
  },
});
