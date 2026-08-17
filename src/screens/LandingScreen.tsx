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
}: {
  onEnter: () => void;
  onNav: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const phone = width < 720;
  const tablet = width >= 720 && width < 1100;
  const links = tablet || phone ? NAV_LINKS_SHORT : NAV_LINKS_FULL;

  const go = (id: string) => {
    setOpen(false);
    onNav(id);
  };

  return (
    <View style={[styles.navWrap, WEB ? ({ zIndex: 80 } as any) : null]}>
      <View style={[styles.nav, phone && styles.navPhone, tablet && styles.navTablet]}>
        <Pressable onPress={onEnter} style={styles.navBrand} accessibilityRole="button">
          <InfinityCrest size={phone ? 22 : 26} />
          {!phone && (
            <Text
              style={[styles.navBrandTxt, tablet && styles.navBrandTxtTablet]}
              numberOfLines={1}
            >
              PROSEASON ACADEMY
            </Text>
          )}
        </Pressable>

        {!phone && (
          <View style={[styles.navLinks, tablet && styles.navLinksTablet]}>
            {links.map(([label, id], i) => (
              <React.Fragment key={id}>
                {i > 0 && !tablet && <Text style={styles.navSlash}>/</Text>}
                <Pressable onPress={() => go(id)} hitSlop={6}>
                  <Text style={[styles.navLink, tablet && styles.navLinkTablet]}>{label}</Text>
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        )}

        <View style={styles.navActions}>
          {!phone && !tablet && (
            <Pressable onPress={onEnter} hitSlop={6}>
              <Text style={styles.navSignIn}>SIGN IN</Text>
            </Pressable>
          )}
          {!phone && (
            <Pressable onPress={onEnter}>
              <View style={[styles.navCta, tablet && styles.navCtaTablet]}>
                <Text style={styles.navCtaTxt}>{tablet ? 'START' : 'GET STARTED'}</Text>
              </View>
            </Pressable>
          )}
          {phone && (
            <Pressable
              onPress={() => setOpen((v) => !v)}
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

      {phone && open && (
        <View style={styles.navDrawer}>
          {links.map(([label, id]) => (
            <Pressable key={id} onPress={() => go(id)} style={styles.navDrawerItem}>
              <Text style={styles.navDrawerTxt}>{label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onEnter} style={styles.navDrawerItem}>
            <Text style={styles.navDrawerTxt}>SIGN IN</Text>
          </Pressable>
          <Pressable onPress={onEnter} style={styles.navDrawerCta}>
            <Text style={styles.navCtaTxt}>GET STARTED</Text>
          </Pressable>
        </View>
      )}
    </View>
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
            <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.card}>
              <GlassCard style={styles.cardFill}>
                <Image source={ILLUS.journal} style={styles.cardIllu} resizeMode="cover" />
                <Text style={styles.cardIndex}>01</Text>
                <Text style={styles.cardTitle}>PAPER FIRST</Text>
                <Text style={styles.cardBody}>
                  Write it by hand before you type it. Typing too early makes it neat. Neat is fake. If you write it down, it stays in your head.
                </Text>
                <Aside>there is a reason we ask for the biro</Aside>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(180).duration(600)} style={styles.card}>
              <GlassCard style={styles.cardFill}>
                <Image source={ILLUS.mirror} style={styles.cardIllu} resizeMode="cover" />
                <Text style={styles.cardIndex}>02</Text>
                <Text style={styles.cardTitle}>TWO HEADS</Text>
                <Text style={styles.cardBody}>
                  Tonight you capture the feeling before you can edit it. Tomorrow you do the film room, when you can actually see.
                </Text>
                <Aside>mix them and you lie to yourself</Aside>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(260).duration(600)} style={styles.card}>
              <GlassCard style={styles.cardFill}>
                <Image source={ILLUS.ledger} style={styles.cardIllu} resizeMode="cover" />
                <Text style={styles.cardIndex}>03</Text>
                <Text style={styles.cardTitle}>THE CARD COMES LAST</Text>
                <Text style={styles.cardBody}>
                  After the thinking, you get one card: your performance in relation to that opponent. Not their sheet next to yours. Yours, against them.
                </Text>
                <Aside>no flex without the film room</Aside>
              </GlassCard>
            </Animated.View>
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
              <Animated.View key={step.n} entering={FadeInDown.delay(80 + i * 70).duration(600)} style={styles.loopStep}>
                <View style={styles.loopSpine}>
                  <Text style={styles.loopNum}>{step.n}</Text>
                  {i < LOOP_STEPS.length - 1 && <View style={styles.loopLine} />}
                </View>
                <GlassCard style={styles.loopCard}>
                  <Image source={step.art} style={[styles.loopArt, isWide && styles.loopArtWide]} resizeMode="cover" />
                  <Text style={styles.loopWhen}>{step.when}</Text>
                  <Text style={styles.cardTitle}>{step.title}</Text>
                  <Text style={styles.cardBody}>{step.body}</Text>
                  <Aside>{step.aside}</Aside>
                </GlassCard>
              </Animated.View>
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
          <View style={[styles.homePrimary, { maxWidth: contentW }]}>
            <Text style={styles.homePrimaryBadge}>THE ONE TAP</Text>
            <Text style={[styles.homePrimaryTitle, WEB ? ({ fontFamily: headFont } as any) : null]}>
              ENTER THE LOOP
            </Text>
            <Text style={[styles.homePrimaryBody, WEB ? ({ fontFamily: bodyFace } as any) : null]}>
              The ritual is the teacher. No stop date. You type it. The card comes last.
            </Text>
          </View>
          <View style={[styles.cardRow, { maxWidth: contentW }]}>
            {HOME_FEATURES.map((f, i) => (
              <Animated.View key={f.n} entering={FadeInDown.delay(80 + i * 50).duration(520)} style={styles.homeCard}>
                <GlassCard style={styles.cardFill}>
                  <Text style={styles.loopWhen}>{f.badge}</Text>
                  <Text style={styles.cardTitle}>{f.title}</Text>
                  <Text style={styles.cardBody}>{f.body}</Text>
                </GlassCard>
              </Animated.View>
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
              <Animated.View key={p.n} entering={FadeInDown.delay(100 + i * 80).duration(600)} style={styles.card}>
                <GlassCard style={styles.cardFill}>
                  <Image source={p.art} style={styles.cardIllu} resizeMode="cover" />
                  <Text style={styles.cardIndex}>{p.n}</Text>
                  <Text style={styles.cardTitle}>{p.title}</Text>
                  <Text style={styles.cardBody}>{p.body}</Text>
                  <Aside>{p.aside}</Aside>
                </GlassCard>
              </Animated.View>
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
              <View key={post.id} style={styles.scenePost}>
                <View style={styles.scenePostTop}>
                  <Text style={styles.sceneHandle}>{post.handle}</Text>
                  <Text style={styles.sceneTime}>{sceneTimeLabel(post.date)}</Text>
                </View>
                <Image source={SCENE_ART_CYCLE[i % SCENE_ART_CYCLE.length]} style={styles.scenePostArt} resizeMode="cover" />
                <Text style={styles.sceneTag}>{post.kind}</Text>
                <Text style={styles.sceneHeadline}>{post.headline}</Text>
                <Text style={styles.sceneBody}>{post.body}</Text>
              </View>
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
                <Text style={styles.evidenceStat}>24H</Text>
                <Text style={[styles.cardBody, styles.center]}>between the feeling and the film room. Tonight you write how you feel. Tomorrow you see.</Text>
                <Aside>calm is part of the method</Aside>
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
  navWrap: {
    zIndex: 80,
    backgroundColor: 'rgba(5,10,6,0.94)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    position: 'relative',
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
  navPhone: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  navTablet: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  navBrandTxtTablet: {
    fontSize: 11,
    letterSpacing: 1.1,
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
  navDrawer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
    backgroundColor: 'rgba(5,10,6,0.97)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: 2,
  },
  navDrawerItem: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(143,184,155,0.10)',
  },
  navDrawerTxt: {
    fontFamily: monoFont,
    fontSize: 13,
    letterSpacing: 2.2,
    color: colors.fg,
  },
  navDrawerCta: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingVertical: 13,
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
  },
  loopLine: {
    flex: 1,
    width: 1,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(57,255,106,0.28)',
  },
  loopCard: {
    flex: 1,
    marginBottom: 10,
  },
  loopArt: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: '#06110b',
  },
  loopArtWide: {
    height: 280,
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
  },
  questionN: {
    fontFamily: monoFont,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.primaryDim,
    marginBottom: 8,
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
    height: 160,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
