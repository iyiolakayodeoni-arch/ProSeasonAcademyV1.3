import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import GridBackground from '../../components/GridBackground';
import Marquee from '../../components/Marquee';
import {
  ChevronRightIcon,
  ClubhouseIcon,
  FootballIcon,
  GamepadIcon,
  StarBadgeIcon,
  TacticsWhistleIcon,
  TrophyIcon,
} from '../../components/Icons';
import { Coach } from '../../data/coaches';
import { useSettings } from '../../data/settings';
import { currentDay, loadDailyProgram } from '../../data/dailyProgram';
import { useAnnouncements } from '../../data/announcements';
import {
  bodyFont,
  bodyFontBold,
  bodyFontHeavy,
  colors,
  displayFont,
  monoFont,
} from '../../theme';

const PITCH_BG = require('../../../assets/art/home-pitch.png');

type Props = {
  coach: Coach;
  onOpenJourney: () => void;
  onOpenUpdates: () => void;
  onOpenHalls: () => void;
  onOpenGuide: () => void;
  onOpenRole: () => void;
};

interface GreetingItem {
  text: string;
  lang: string;
}

function getMultilingualGreetings(): GreetingItem[] {
  const h = new Date().getHours();

  if (h < 5) {
    return [
      { text: 'STILL GRINDING,', lang: 'EN' },
      { text: 'NOCHE DE GRIND,', lang: 'ES' },
      { text: 'NUIT DE FOOT,', lang: 'FR' },
      { text: 'MADRUGANDO,', lang: 'PT' },
      { text: 'NACHTSCHICHT,', lang: 'DE' },
      { text: 'NOTTE DI GRIND,', lang: 'IT' },
      { text: 'ANYASI OMA,', lang: 'IG' },
      { text: 'KONBANWA,', lang: 'JA' },
    ];
  }

  if (h < 12) {
    return [
      { text: 'GOOD MORNING,', lang: 'EN' },
      { text: 'BUENOS DÍAS,', lang: 'ES' },
      { text: 'BONJOUR,', lang: 'FR' },
      { text: 'BOM DIA,', lang: 'PT' },
      { text: 'GUTEN MORGEN,', lang: 'DE' },
      { text: 'BUONGIORNO,', lang: 'IT' },
      { text: 'UTUTU OMA,', lang: 'IG' },
      { text: 'E KAARO,', lang: 'YO' },
      { text: 'GOEDEMORGEN,', lang: 'NL' },
      { text: 'OHAYOU,', lang: 'JA' },
      { text: 'SABAH AL-KHAYR,', lang: 'AR' },
      { text: 'HABARI ZA ASUBUHI,', lang: 'SW' },
    ];
  }

  if (h < 18) {
    return [
      { text: 'GOOD AFTERNOON,', lang: 'EN' },
      { text: 'BUENAS TARDES,', lang: 'ES' },
      { text: 'BON APRÈS-MIDI,', lang: 'FR' },
      { text: 'BOA TARDE,', lang: 'PT' },
      { text: 'GUTEN TAG,', lang: 'DE' },
      { text: 'BUON POMERIGGIO,', lang: 'IT' },
      { text: 'EHIHI OMA,', lang: 'IG' },
      { text: 'E KASAN,', lang: 'YO' },
      { text: 'GOEDEMIDDAG,', lang: 'NL' },
      { text: 'KONNICHIWA,', lang: 'JA' },
      { text: 'MASAA AL-KHAYR,', lang: 'AR' },
      { text: 'HABARI ZA MCHANA,', lang: 'SW' },
    ];
  }

  return [
    { text: 'GOOD EVENING,', lang: 'EN' },
    { text: 'BUENAS NOCHES,', lang: 'ES' },
    { text: 'BONSOIR,', lang: 'FR' },
    { text: 'BOA NOITE,', lang: 'PT' },
    { text: 'GUTEN ABEND,', lang: 'DE' },
    { text: 'BUONASERA,', lang: 'IT' },
    { text: 'ANYASI OMA,', lang: 'IG' },
    { text: 'E KALE,', lang: 'YO' },
    { text: 'GOEDENAVOND,', lang: 'NL' },
    { text: 'KONBANWA,', lang: 'JA' },
    { text: 'MASAA AL-KHAYR,', lang: 'AR' },
    { text: 'HABARI ZA JIONI,', lang: 'SW' },
  ];
}

function MultilingualTypewriterGreeting({ playerName }: { playerName: string }) {
  const greetings = useMemo(() => getMultilingualGreetings(), []);
  const [index, setIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const cursorOpacity = useSharedValue(1);
  useEffect(() => {
    cursorOpacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 450 }),
        withTiming(1, { duration: 450 }),
      ),
      -1,
      true,
    );
  }, [cursorOpacity]);
  const cursorStyle = useAnimatedStyle(() => ({ opacity: cursorOpacity.value }));

  const currentItem = greetings[index] || greetings[0];
  const fullTarget = currentItem.text;

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (!isDeleting) {
      if (displayedText.length < fullTarget.length) {
        timer = setTimeout(() => {
          setDisplayedText(fullTarget.slice(0, displayedText.length + 1));
        }, 50);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
      }
    } else {
      if (displayedText.length > 0) {
        timer = setTimeout(() => {
          setDisplayedText(fullTarget.slice(0, displayedText.length - 1));
        }, 28);
      } else {
        setIsDeleting(false);
        setIndex((prev) => (prev + 1) % greetings.length);
      }
    }

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, fullTarget, greetings.length]);

  return (
    <View style={styles.greetingBlock}>
      <View style={styles.greetingTypeRow}>
        <Text style={styles.greetingTimeTxt}>
          {displayedText}
          <Animated.Text style={[styles.cursor, cursorStyle]}>▌</Animated.Text>
        </Text>

        <View style={styles.langPill}>
          <Text style={styles.langPillTxt}>{currentItem.lang}</Text>
        </View>
      </View>

      <Text
        style={styles.greetingNameTxt}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {playerName}
      </Text>
    </View>
  );
}

function LivePill() {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.4, { duration: 900 }), -1, true);
  }, [o]);
  const animatedDot = useAnimatedStyle(() => ({ opacity: o.value }));

  return (
    <View style={styles.livePill}>
      <Animated.View style={[styles.liveDot, animatedDot]} />
      <Text style={styles.liveText}>TOUCHLINE</Text>
    </View>
  );
}

interface RouteCardProps {
  label: string;
  line: string;
  badge?: string;
  IconComponent: React.ComponentType<{ size: number; color: string }>;
  onPress: () => void;
  delay: number;
  primary?: boolean;
  style?: any;
}

function MinimalistGamerCard({
  label,
  line,
  badge,
  IconComponent,
  onPress,
  delay,
  primary,
  style,
}: RouteCardProps) {
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 1800 }),
        withTiming(0, { duration: 1800 }),
      ),
      -1,
      true,
    );
  }, [lift]);
  const movement = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }],
  }));

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(300)} style={[movement, style]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.routeCard,
          primary && styles.routePrimary,
          pressed && styles.routePressed,
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            primary && styles.iconWrapPrimary,
          ]}
        >
          <IconComponent
            size={18}
            color={primary ? colors.primary : '#d1d5db'}
          />
        </View>

        <View style={styles.routeContent}>
          <View style={styles.routeHeaderRow}>
            <Text
              style={[
                styles.routeLabel,
                primary && styles.routeLabelPrimary,
              ]}
            >
              {label}
            </Text>
            {badge && (
              <View
                style={[
                  styles.cardBadge,
                  primary ? styles.cardBadgePrimary : styles.cardBadgeNormal,
                ]}
              >
                <Text
                  style={[
                    styles.cardBadgeTxt,
                    primary && styles.cardBadgeTxtPrimary,
                  ]}
                >
                  {badge}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.routeLine, primary && styles.routeLinePrimary]}
            numberOfLines={2}
          >
            {line}
          </Text>
        </View>

        <View style={styles.chevronWrap}>
          <ChevronRightIcon
            size={14}
            color={primary ? colors.primary : 'rgba(156,163,175,0.6)'}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeTab({
  coach,
  onOpenJourney,
  onOpenUpdates,
  onOpenHalls,
  onOpenGuide,
  onOpenRole,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  const [day, setDay] = useState(1);
  const settings = useSettings();
  const { items: announcements } = useAnnouncements();
  const firstName = coach.name.split(' ')[0];

  useEffect(() => {
    void loadDailyProgram().then((program) =>
      setDay(Math.min(currentDay(program), 180)),
    );
  }, [coach.id]);

  const news = useMemo(() => {
    if (announcements.length) return announcements[0].title.toUpperCase();
    return 'ACADEMY LIVE · PS5 & XBOX SERIES X|S TACTICAL LAB OPEN · ONE MATCH, ONE LESSON';
  }, [announcements]);

  const playerName = (settings.displayName || 'PLAYER').trim().toUpperCase();

  return (
    <View style={styles.flex}>
      <GridBackground />

      <Image
        source={PITCH_BG}
        style={styles.pitchBackdrop}
        resizeMode="cover"
      />
      <View style={styles.pitchShade} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: isDesktop ? 24 : 16 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Minimalist Marquee News Strip */}
        <View style={styles.newsBar}>
          <View style={styles.newsFlag}>
            <FootballIcon size={11} color="#9ca3af" />
            <Text style={styles.newsFlagTxt}>INTEL</Text>
          </View>
          <Marquee pxPerSec={30}>
            <Text style={styles.newsText}>✦ {news}   </Text>
          </Marquee>
        </View>

        {/* Hero Card with Refined Dark Glass Aesthetic */}
        <View style={styles.heroCard}>
          <View style={styles.coachHeaderRow}>
            <View style={styles.coachAvatarBlock}>
              <Image source={coach.portrait} style={styles.coachAvatarImg} />
              <View style={styles.coachBadgeOnline} />
              <View>
                <Text style={styles.coachNameTxt}>COACH {coach.name.toUpperCase()}</Text>
                <Text style={styles.coachRatingTxt}>OVR {coach.rating} · BENCHMARK</Text>
              </View>
            </View>

            <LivePill />
          </View>

          <MultilingualTypewriterGreeting playerName={playerName} />

          <View style={styles.coachQuoteBox}>
            <Text style={styles.coachQuoteTxt}>
              “{firstName} speaking. Grab your controller, lock into your shape, and let the work stack. One match, one honest lesson.”
            </Text>
          </View>

          <View style={styles.hudStrip}>
            <View style={styles.hudItem}>
              <Text style={styles.hudLabel}>DAY PROGRESS</Text>
              <Text style={styles.hudValue}>{day} / 180</Text>
            </View>
            <View style={styles.hudDivider} />
            <View style={styles.hudItem}>
              <Text style={styles.hudLabel}>CALIBRATION</Text>
              <Text style={styles.hudValue}>PS5 · XBOX</Text>
            </View>
            <View style={styles.hudDivider} />
            <View style={styles.hudItem}>
              <Text style={styles.hudLabel}>SESSION</Text>
              <Text style={styles.hudValueAccent}>READY</Text>
            </View>
          </View>
        </View>

        {/* Action Routes Grid — 2 Column Responsive Web Grid on Desktop */}
        <View style={styles.routesContainer}>
          <Text style={styles.sectionHeader}>ACADEMY SESSIONS</Text>

          <View style={[styles.gridWrap, isDesktop && styles.gridWrapDesktop]}>
            {/* 1. Main Action: Six Months */}
            <MinimalistGamerCard
              primary
              delay={60}
              label="OPEN MY SIX MONTHS"
              badge="MAIN RITUAL"
              IconComponent={TrophyIcon}
              line={`“Day ${day} is waiting on the board. Review your match and seal the day's evidence.”`}
              onPress={onOpenJourney}
              style={isDesktop ? styles.colFull : undefined}
            />

            {/* 2. Role Model Story */}
            <MinimalistGamerCard
              delay={110}
              label="ROLE MODEL STORY"
              badge="THE STANDARD"
              IconComponent={StarBadgeIcon}
              line="“Study the world-class blueprint. See how top competitors handle high-stakes pressure.”"
              onPress={onOpenRole}
              style={isDesktop ? styles.colHalf : undefined}
            />

            {/* 3. FC Updates & Intel */}
            <MinimalistGamerCard
              delay={160}
              label="FC 26/27 INTEL & PATCHES"
              badge="LIVE LAB"
              IconComponent={GamepadIcon}
              line="“Fresh gameplay meta, controller input combos, and verified patch breakdowns.”"
              onPress={onOpenUpdates}
              style={isDesktop ? styles.colHalf : undefined}
            />

            {/* 4. Learn Basics / Tactical Playbook */}
            <MinimalistGamerCard
              delay={210}
              label="TACTICAL PLAYBOOK"
              badge="FOUNDATIONS"
              IconComponent={TacticsWhistleIcon}
              line="“Master the simple fundamentals. Clean build-up patterns win difficult games.”"
              onPress={onOpenGuide}
              style={isDesktop ? styles.colHalf : undefined}
            />

            {/* 5. Community Locker Room */}
            <MinimalistGamerCard
              delay={260}
              label="MEMBERS LOCKER ROOM"
              badge="COMMUNITY"
              IconComponent={ClubhouseIcon}
              line="“The room is live. Drop your match tape, ask tactical questions, or share receipts.”"
              onPress={onOpenHalls}
              style={isDesktop ? styles.colHalf : undefined}
            />
          </View>
        </View>

        {/* Minimalist Footer */}
        <View style={styles.footerBlock}>
          <Text style={styles.footerMotto}>
            PLAY ONE MATCH · RECORD HONEST TRUTH · CARRY ONE LESSON.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#070a08' },
  scroll: { paddingTop: 14, paddingBottom: 40 },

  pitchBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
    opacity: 0.12,
  },
  pitchShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
    backgroundColor: 'rgba(7,10,8,0.85)',
  },

  // News Strip
  newsBar: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: 'rgba(18,24,20,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  newsFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
  },
  newsFlagTxt: {
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#9ca3af',
  },
  newsText: {
    paddingLeft: 12,
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#d1d5db',
  },

  // Hero Card
  heroCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    backgroundColor: 'rgba(15,20,17,0.78)',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  coachHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coachAvatarBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coachAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  coachBadgeOnline: {
    position: 'absolute',
    left: 28,
    top: 26,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: '#0a0f0c',
  },
  coachNameTxt: {
    fontFamily: bodyFontHeavy,
    fontSize: 12,
    letterSpacing: 1,
    color: '#f3f4f6',
  },
  coachRatingTxt: {
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#d4af37',
  },

  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  liveText: {
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#9ca3af',
  },

  // Greeting
  greetingBlock: {
    marginTop: 16,
  },
  greetingTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 20,
  },
  greetingTimeTxt: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: '#9ca3af',
  },
  cursor: {
    color: colors.primary,
    fontSize: 10,
  },
  langPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  langPillTxt: {
    fontFamily: monoFont,
    fontSize: 6.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#9ca3af',
  },
  greetingNameTxt: {
    marginTop: 3,
    fontFamily: displayFont,
    fontSize: 30,
    letterSpacing: 0.5,
    color: '#ffffff',
  },

  coachQuoteBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(10,14,11,0.6)',
    borderLeftWidth: 2.5,
    borderLeftColor: 'rgba(57,255,106,0.5)',
  },
  coachQuoteTxt: {
    fontFamily: bodyFont,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#cbd5e1',
  },

  // HUD Strip
  hudStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  hudItem: {
    alignItems: 'center',
  },
  hudLabel: {
    fontFamily: monoFont,
    fontSize: 6.5,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#6b7280',
  },
  hudValue: {
    marginTop: 2,
    fontFamily: bodyFontHeavy,
    fontSize: 12,
    letterSpacing: 0.6,
    color: '#f3f4f6',
  },
  hudValueAccent: {
    marginTop: 2,
    fontFamily: bodyFontHeavy,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.primary,
  },
  hudDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Routes Container & Web Grid
  routesContainer: {
    marginTop: 22,
  },
  sectionHeader: {
    fontFamily: bodyFontHeavy,
    fontSize: 10,
    letterSpacing: 1.6,
    color: '#6b7280',
    marginBottom: 10,
    marginLeft: 2,
  },
  gridWrap: {
    gap: 10,
  },
  gridWrapDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colFull: {
    width: '100%',
  },
  colHalf: {
    width: '49.2%',
  },

  routeCard: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(15,20,17,0.7)',
  },
  routePrimary: {
    borderColor: 'rgba(57,255,106,0.3)',
    backgroundColor: 'rgba(18,27,21,0.85)',
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  routePressed: {
    opacity: 0.8,
    transform: [{ scale: 0.988 }],
  },

  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  iconWrapPrimary: {
    backgroundColor: 'rgba(57,255,106,0.08)',
    borderColor: 'rgba(57,255,106,0.25)',
  },

  routeContent: {
    flex: 1,
    paddingRight: 6,
  },
  routeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeLabel: {
    fontFamily: bodyFontHeavy,
    fontSize: 12.5,
    letterSpacing: 0.6,
    color: '#f3f4f6',
  },
  routeLabelPrimary: {
    color: '#ffffff',
  },
  routeLine: {
    marginTop: 3,
    fontFamily: bodyFont,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#9ca3af',
  },
  routeLinePrimary: {
    color: '#a7b5ad',
  },

  cardBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cardBadgeNormal: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardBadgePrimary: {
    backgroundColor: 'rgba(57,255,106,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.25)',
  },
  cardBadgeTxt: {
    fontFamily: monoFont,
    fontSize: 6.8,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#9ca3af',
  },
  cardBadgeTxtPrimary: {
    color: colors.primary,
  },

  chevronWrap: {
    width: 16,
    alignItems: 'flex-end',
  },

  // Footer
  footerBlock: {
    marginTop: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  footerMotto: {
    fontFamily: monoFont,
    fontSize: 6.8,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#6b7280',
    textAlign: 'center',
  },
});
