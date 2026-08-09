import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
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
import { ChevronRightIcon, HomeIcon, JourneyIcon, ScanGlyphIcon, WavesGlyphIcon } from '../../components/Icons';
import { Coach } from '../../data/coaches';
import { useSettings } from '../../data/settings';
import { currentDay, loadDailyProgram, DailyProgram, doneCount, TOTAL_DAYS } from '../../data/dailyProgram';
import { useAnnouncements } from '../../data/announcements';
import { bodyFont, bodyFontBold, bodyFontHeavy, colors, displayFont, monoFont } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';
import { BaselineCard, loadBaseline } from '../../data/baselineScan';

type Props = {
  coach: Coach;
  onOpenJourney: () => void;
  onOpenTracker?: () => void;
  onOpenUpdates: () => void;
  onOpenHalls: () => void;
  onOpenGuide: () => void;
  onOpenRole: () => void;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Still up,';
  if (h < 12) return 'Good morning,';
  if (h < 18) return 'Good afternoon,';
  return 'Good evening,';
}

function TypedGreeting({ name }: { name: string }) {
  const full = `${greeting()} ${name.toUpperCase()}`;
  const [shown, setShown] = useState('');

  useEffect(() => {
    setShown('');
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setShown(full.slice(0, index));
      if (index >= full.length) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [full]);

  return (
    <Text style={styles.heroTitle}>
      {shown}
      <Text style={styles.cursor}>▌</Text>
    </Text>
  );
}

function CoachRouteCard({
  label,
  line,
  onPress,
  delay,
  primary,
  badge,
  icon: Icon,
}: {
  label: string;
  line: string;
  onPress: () => void;
  delay: number;
  primary?: boolean;
  badge?: string;
  icon?: any;
}) {
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withRepeat(
      withSequence(withTiming(-3, { duration: 1600 }), withTiming(0, { duration: 1600 })),
      -1,
      true,
    );
  }, [lift]);
  const movement = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(380)} style={[movement, primary ? styles.routePrimaryWrap : styles.routeWrap]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.route,
          primary && styles.routePrimary,
          pressed && styles.routePressed,
        ]}
      >
        <View style={styles.routeIconBox}>
          {Icon ? (
            <Icon size={18} color={primary ? '#07110a' : colors.primary} />
          ) : (
            <View style={[styles.signalDot, primary && styles.signalDotPrimary]} />
          )}
        </View>
        <View style={styles.routeCopy}>
          <View style={styles.routeHeadRow}>
            <Text style={[styles.routeLabel, primary && styles.routeLabelPrimary]}>{label}</Text>
            {!!badge && (
              <View style={[styles.routeBadge, primary && styles.routeBadgePrimary]}>
                <Text style={[styles.routeBadgeTxt, primary && styles.routeBadgeTxtPrimary]}>
                  {badge}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.routeLine, primary && styles.routeLinePrimary]}>{line}</Text>
        </View>
        <ChevronRightIcon size={16} color={primary ? '#07110a' : colors.primary} />
      </Pressable>
    </Animated.View>
  );
}

export default function HomeTab({
  coach,
  onOpenJourney,
  onOpenTracker,
  onOpenUpdates,
  onOpenHalls,
  onOpenGuide,
  onOpenRole,
}: Props) {
  const { isMultiColumn } = useResponsive();
  const [day, setDay] = useState(1);
  const [prog, setProg] = useState<DailyProgram | null>(null);
  const [baseline, setBaseline] = useState<BaselineCard | null>(null);
  const settings = useSettings();
  const { items: announcements } = useAnnouncements();
  const firstName = coach.name.split(' ')[0];

  useEffect(() => {
    void loadDailyProgram().then((program) => {
      setProg(program);
      setDay(Math.min(currentDay(program), 180));
    });
    void loadBaseline(coach.id).then((b) => setBaseline(b.card)).catch(() => {});
  }, [coach.id]);

  const news = useMemo(() => {
    if (announcements.length) return announcements[0].title.toUpperCase();
    return 'THE ACADEMY IS LIVE · CHECK IN, PLAY HONEST, BUILD YOUR GAME';
  }, [announcements]);

  const doneDays = prog ? doneCount(prog) : 0;
  const pct = Math.round((doneDays / TOTAL_DAYS) * 100);

  return (
    <View style={styles.flex}>
      <GridBackground />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Live News Ticker */}
        <View style={styles.newsBar}>
          <Text style={styles.newsFlag}>LIVE ACADEMY</Text>
          <Marquee pxPerSec={32}>
            <Text style={styles.newsText}>✦ {news}   ✦ FC 26 REVIEW PRACTICE   ✦ RECORD MATCHES AS USUAL   </Text>
          </Marquee>
        </View>

        {/* Main Dashboard Area: 2 columns on desktop, single column on mobile */}
        <View style={[styles.mainLayout, isMultiColumn && styles.mainLayoutWide]}>
          {/* Left Column (Hero & Actions) */}
          <View style={[styles.colMain, isMultiColumn && styles.colMainWide]}>
            <View style={styles.heroCard}>
              <Text style={styles.heroDay}>
                DAY {day} OF 180 · {firstName.toUpperCase()} IS ON THE TOUCHLINE
              </Text>
              <TypedGreeting name={settings.displayName || 'PLAYER'} />
              <Text style={styles.heroSub}>
                “{firstName}, speaking. You have one job: show up honestly, review the tape, and let the work stack.”
              </Text>
            </View>

            {/* Primary Action Card: Open 6 Months */}
            <View style={styles.primaryActionWrap}>
              <CoachRouteCard
                primary
                delay={60}
                icon={JourneyIcon}
                label="OPEN MY SIX MONTHS"
                badge={`DAY ${day} WAITING`}
                line={`“Day ${day} is waiting on the board. Open today's mission and finish what you started.”`}
                onPress={onOpenJourney}
              />
            </View>

            {/* Secondary Destinations Grid */}
            <Text style={styles.sectionHeader}>ACADEMY WORKSPACES</Text>
            <View style={[styles.routesGrid, isMultiColumn && styles.routesGridWide]}>
              {onOpenTracker && (
                <CoachRouteCard
                  delay={120}
                  icon={ScanGlyphIcon}
                  label="EVIDENCE & CHECKPOINTS"
                  badge="7-MATCH INGEST"
                  line="“Upload post-match stats screens. Let your evidence build your development card.”"
                  onPress={onOpenTracker}
                />
              )}
              <CoachRouteCard
                delay={180}
                label="ROLE MODEL STORY"
                badge="STANDARD"
                line="“Study the standard. Calm defending, clean composure, and winning from habits.”"
                onPress={onOpenRole}
              />
              <CoachRouteCard
                delay={240}
                label="FC UPDATES & ACADEMY"
                badge="PATCH NOTES"
                line="“Important gameplay and tuning updates. Only the receipts that help you win.”"
                onPress={onOpenUpdates}
              />
              <CoachRouteCard
                delay={300}
                label="LEARN THE BASICS"
                badge="GUIDE"
                line="“New foundations first. The simple, repeatable things win difficult matches.”"
                onPress={onOpenGuide}
              />
              <CoachRouteCard
                delay={360}
                icon={WavesGlyphIcon}
                label="CLUBHOUSE COMMUNITY"
                badge="LIVE"
                line="“The clubhouse is open. Bring a question, a score, or an honest lesson.”"
                onPress={onOpenHalls}
              />
            </View>
          </View>

          {/* Right Column (Coach & Live Status Sidebar) */}
          <View style={[styles.colSide, isMultiColumn && styles.colSideWide]}>
            {/* Coach Card */}
            <View style={styles.coachSidebarCard}>
              <View style={styles.coachTopRow}>
                <Image source={coach.portrait} style={styles.coachAvatar} />
                <View style={styles.coachMeta}>
                  <Text style={styles.coachTag}>PERMANENT GUIDE</Text>
                  <Text style={styles.coachName}>{coach.name.toUpperCase()}</Text>
                  <Text style={styles.coachTitle}>{coach.title}</Text>
                </View>
              </View>
              <Text style={styles.coachQuote}>“{coach.oneLiner}”</Text>
              <View style={styles.coachBenchmarkBox}>
                <Text style={styles.coachBenchmarkTag}>WHAT GOOD LOOKS LIKE</Text>
                <Text style={styles.coachBenchmarkTxt}>
                  Calm under pressure. Clean positioning. No panic clearances. Winning through discipline.
                </Text>
              </View>
            </View>

            {/* 6-Month Progress Summary Widget */}
            <View style={styles.sidebarWidget}>
              <View style={styles.widgetHeader}>
                <Text style={styles.widgetTag}>6-MONTH PROGRAM</Text>
                <Text style={styles.widgetPct}>{pct}% DONE</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.max(4, pct)}%` }]} />
              </View>
              <View style={styles.widgetStatsRow}>
                <View style={styles.widgetStat}>
                  <Text style={styles.widgetStatVal}>{doneDays}</Text>
                  <Text style={styles.widgetStatLbl}>DAYS SEALED</Text>
                </View>
                <View style={styles.widgetStat}>
                  <Text style={styles.widgetStatVal}>{day}</Text>
                  <Text style={styles.widgetStatLbl}>CURRENT DAY</Text>
                </View>
                <View style={styles.widgetStat}>
                  <Text style={styles.widgetStatVal}>{TOTAL_DAYS - doneDays}</Text>
                  <Text style={styles.widgetStatLbl}>DAYS LEFT</Text>
                </View>
              </View>
              <Pressable
                onPress={onOpenJourney}
                style={({ pressed }) => [styles.widgetBtn, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.widgetBtnTxt}>VIEW FULL 180-DAY TRACK ›</Text>
              </Pressable>
            </View>

            {/* Baseline Card Mini Preview if Available */}
            {baseline && (
              <View style={styles.baselineMiniCard}>
                <View style={styles.widgetHeader}>
                  <Text style={styles.baselineMiniTag}>STARTING BASELINE</Text>
                  <View style={styles.sealedMiniPill}>
                    <Text style={styles.sealedMiniTxt}>SEALED ✓</Text>
                  </View>
                </View>
                <Text style={styles.baselineMiniTier}>{baseline.tier}</Text>
                <Text style={styles.baselineMiniMeta}>
                  {baseline.w}W · {baseline.d}D · {baseline.l}L · HEAD {baseline.avgComposure.toFixed(1)}/5
                </Text>
                <Text style={styles.baselineMiniRead} numberOfLines={2}>
                  “{baseline.coachRead}”
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.footer}>
          THE NEXT MATCH IS THE ONLY ONE YOU CAN WORK ON · PROSEASON ACADEMY WEB
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingVertical: 14,
    paddingBottom: 40,
  },

  newsBar: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: 'rgba(57,255,106,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.25)',
    marginBottom: 16,
  },
  newsFlag: {
    alignSelf: 'stretch',
    paddingHorizontal: 12,
    paddingTop: 10,
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#040805',
    backgroundColor: colors.primary,
  },
  newsText: {
    paddingLeft: 14,
    fontFamily: monoFont,
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.fg,
  },

  mainLayout: {
    flexDirection: 'column',
    gap: 18,
  },
  mainLayoutWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
  },

  colMain: {
    flex: 1,
    width: '100%',
  },
  colMainWide: {
    flex: 1.5,
  },

  colSide: {
    width: '100%',
    gap: 16,
  },
  colSideWide: {
    width: 380,
  },

  heroCard: {
    padding: 22,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 26, 19, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 106, 0.25)',
  },
  heroDay: {
    fontFamily: monoFont,
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 2,
    color: colors.primary,
  },
  heroTitle: {
    minHeight: 44,
    marginTop: 10,
    fontFamily: displayFont,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 0.5,
    color: colors.fg,
  },
  cursor: { color: colors.primary },
  heroSub: {
    marginTop: 10,
    fontFamily: bodyFont,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(143,184,155,0.92)',
  },

  primaryActionWrap: {
    marginTop: 16,
  },

  sectionHeader: {
    marginTop: 22,
    marginBottom: 12,
    fontFamily: bodyFontHeavy,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.muted,
  },

  routesGrid: {
    gap: 12,
  },
  routesGridWide: {
    gap: 14,
  },

  routeWrap: {
    width: '100%',
  },
  routePrimaryWrap: {
    width: '100%',
  },

  route: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.18)',
    backgroundColor: 'rgba(15,26,19,0.85)',
  },
  routePrimary: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  routePressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  routeIconBox: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  signalDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  signalDotPrimary: {
    backgroundColor: '#07110a',
    shadowOpacity: 0,
  },
  routeCopy: {
    flex: 1,
    paddingRight: 10,
  },
  routeHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeLabel: {
    fontFamily: bodyFontHeavy,
    fontSize: 13,
    letterSpacing: 0.8,
    color: colors.fg,
  },
  routeLabelPrimary: {
    color: '#07110a',
    fontSize: 14,
  },
  routeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(57,255,106,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.3)',
  },
  routeBadgePrimary: {
    backgroundColor: 'rgba(7,17,10,0.2)',
    borderColor: 'rgba(7,17,10,0.4)',
  },
  routeBadgeTxt: {
    fontFamily: monoFont,
    fontSize: 6.5,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.primary,
  },
  routeBadgeTxtPrimary: {
    color: '#07110a',
  },
  routeLine: {
    marginTop: 4,
    fontFamily: bodyFont,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
  routeLinePrimary: {
    color: 'rgba(7,17,10,0.85)',
    fontFamily: bodyFontBold,
  },

  coachSidebarCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(15,26,19,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.4)',
  },
  coachTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coachAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: '#0c140e',
  },
  coachMeta: {
    flex: 1,
  },
  coachTag: {
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: colors.accent,
  },
  coachName: {
    marginTop: 2,
    fontFamily: displayFont,
    fontSize: 18,
    color: colors.fg,
  },
  coachTitle: {
    marginTop: 2,
    fontFamily: bodyFontHeavy,
    fontSize: 10,
    color: colors.muted,
  },
  coachQuote: {
    marginTop: 12,
    fontFamily: bodyFont,
    fontStyle: 'italic',
    fontSize: 12.5,
    lineHeight: 18,
    color: '#d6e2d9',
  },
  coachBenchmarkBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(242,192,120,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.22)',
  },
  coachBenchmarkTag: {
    fontFamily: monoFont,
    fontSize: 6.8,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: colors.accent,
  },
  coachBenchmarkTxt: {
    marginTop: 4,
    fontFamily: bodyFont,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(238,242,236,0.85)',
  },

  sidebarWidget: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(15,26,19,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.22)',
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  widgetTag: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: colors.primary,
  },
  widgetPct: {
    fontFamily: monoFont,
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.primary,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(57,255,106,0.12)',
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  widgetStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(57,255,106,0.12)',
  },
  widgetStat: {
    alignItems: 'center',
  },
  widgetStatVal: {
    fontFamily: bodyFontHeavy,
    fontSize: 16,
    color: colors.fg,
  },
  widgetStatLbl: {
    marginTop: 2,
    fontFamily: monoFont,
    fontSize: 6,
    letterSpacing: 1.1,
    color: colors.muted,
  },
  widgetBtn: {
    marginTop: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.3)',
    backgroundColor: 'rgba(57,255,106,0.06)',
    alignItems: 'center',
  },
  widgetBtnTxt: {
    fontFamily: bodyFontHeavy,
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: colors.primary,
  },

  baselineMiniCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(20,18,10,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.35)',
  },
  baselineMiniTag: {
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: colors.accent,
  },
  sealedMiniPill: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  sealedMiniTxt: {
    fontFamily: monoFont,
    fontSize: 6,
    fontWeight: '900',
    color: '#07110a',
  },
  baselineMiniTier: {
    marginTop: 8,
    fontFamily: displayFont,
    fontSize: 20,
    color: colors.fg,
  },
  baselineMiniMeta: {
    marginTop: 3,
    fontFamily: monoFont,
    fontSize: 7.5,
    letterSpacing: 1,
    color: colors.muted,
  },
  baselineMiniRead: {
    marginTop: 6,
    fontFamily: bodyFont,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#cfdcd2',
    fontStyle: 'italic',
  },

  footer: {
    marginTop: 30,
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 7.5,
    letterSpacing: 1.5,
    color: 'rgba(143,184,155,0.5)',
  },
});
