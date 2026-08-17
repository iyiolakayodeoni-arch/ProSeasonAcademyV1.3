import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Platform, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import GridBackground from '../../components/GridBackground';
import Marquee from '../../components/Marquee';
import { ChevronRightIcon, JourneyIcon, ScanGlyphIcon, WavesGlyphIcon } from '../../components/Icons';
import { Coach } from '../../data/coaches';
import { useSettings } from '../../data/settings';
import { useAnnouncements } from '../../data/announcements';
import { bodyFont, bodyFontBold, bodyFontHeavy, colors, displayFont, monoFont, radii, elevation } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useHover } from '../../hooks/useHover';
import { BaselineCard, loadBaseline } from '../../data/baselineScan';

type Props = {
  coach: Coach;
  onOpenJourney: () => void;
  onOpenTracker?: () => void;
  onOpenUpdates: () => void;
  onOpenHalls: () => void;
  onOpenGuide: () => void;
  onOpenRole: () => void;
  onOpenScene?: () => void;
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
    const t = setInterval(() => {
      index += 1;
      setShown(full.slice(0, index));
      if (index >= full.length) clearInterval(t);
    }, 22);
    return () => clearInterval(t);
  }, [full]);
  return (
    <Text style={styles.heroTitle}>
      {shown}
      <Text style={styles.cursor}>▌</Text>
    </Text>
  );
}

function PremiumCard({
  label, line, onPress, delay, primary, badge, wide, icon: Icon,
}: {
  label: string; line: string; onPress: () => void; delay: number; primary?: boolean; badge?: string; wide?: boolean; icon?: any;
}) {
  const scale = useSharedValue(1);
  // Fine-pointer hover lifts the card a breath and lights its ring; press
  // plants it back down with a spring. Motion with restraint.
  const { hovered, bind } = useHover();
  const hov = useSharedValue(0);
  useEffect(() => {
    hov.value = withTiming(hovered ? 1 : 0, { duration: 170 });
  }, [hovered, hov]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: -3 * hov.value }, { scale: scale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: hov.value }));
  const chevNudge = useAnimatedStyle(() => ({ transform: [{ translateX: 3 * hov.value }] }));

  // The primary card carries a slow sheen sweep — the one loop allowed on
  // the dashboard, because it marks the single most important action.
  const sheen = useSharedValue(-1);
  useEffect(() => {
    if (!primary) return;
    sheen.value = withRepeat(
      withSequence(
        withDelay(2600, withTiming(0, { duration: 0 })),
        withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [primary, sheen]);
  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -160 + sheen.value * 1100 }, { skewX: '-18deg' }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(420).springify().damping(18)}
      style={[
        primary ? styles.routePrimaryWrap : wide ? styles.routeWrapWide : styles.routeWrap,
        animated,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => (scale.value = withSpring(0.98, { damping: 18, stiffness: 320 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 18, stiffness: 320 }))}
        style={({ pressed }) => [
          styles.route,
          primary ? styles.routePrimary : styles.routeGlass,
          pressed && styles.routePressed,
          Platform.OS === 'web' && !primary ? ({ backdropFilter: 'blur(14px)' } as any) : null,
        ]}
        accessibilityRole="button"
        {...bind}
      >
        {/* hover ring — eased in, never stamped on */}
        <Animated.View pointerEvents="none" style={[styles.routeHoverRing, ringStyle]} />
        {/* Top accent line */}
        {!primary && <LinearGradient colors={['rgba(57,255,106,0.45)', 'transparent']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.routeAccent} />}
        {primary && (
          <View pointerEvents="none" style={styles.sheenClip}>
            <Animated.View style={[styles.sheen, sheenStyle]}>
              <LinearGradient
                colors={['rgba(5,22,10,0)', 'rgba(255,255,255,0.3)', 'rgba(5,22,10,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        )}

        <View style={[styles.routeIconBox, primary && styles.routeIconBoxPrimary]}>
          {Icon ? <Icon size={18} color={primary ? '#05160a' : colors.primary} /> : <View style={[styles.signalDot, primary && styles.signalDotPrimary]} />}
        </View>

        <View style={styles.routeCopy}>
          <View style={styles.routeHeadRow}>
            <Text style={[styles.routeLabel, primary && styles.routeLabelPrimary]}>{label}</Text>
            {!!badge && (
              <View style={[styles.routeBadge, primary && styles.routeBadgePrimary]}>
                <Text style={[styles.routeBadgeTxt, primary && styles.routeBadgeTxtPrimary]}>{badge}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.routeLine, primary && styles.routeLinePrimary]}>{line}</Text>
        </View>

        <Animated.View style={[styles.chevWrap, primary && styles.chevWrapPrimary, chevNudge]}>
          <ChevronRightIcon size={14} color={primary ? '#05160a' : colors.primary} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeTab({ coach, onOpenJourney, onOpenTracker, onOpenUpdates, onOpenHalls, onOpenGuide, onOpenRole, onOpenScene }: Props) {
  const { isMultiColumn, isWide, isLaptopUp, bp } = useResponsive();
  const [baseline, setBaseline] = useState<BaselineCard | null>(null);
  const settings = useSettings();
  const { items: announcements } = useAnnouncements();

  useEffect(() => {
    void loadBaseline(coach.id).then((b) => setBaseline(b.card)).catch(() => {});
  }, [coach.id]);

  const news = useMemo(() => {
    if (announcements.length) return announcements[0].title.toUpperCase();
    return 'THE LOOP IS LIVE · WATCH ONCE · WRITE HOW YOU FEEL · WAIT A DAY';
  }, [announcements]);

  return (
    <View style={styles.flex}>
      <GridBackground />
      <ScrollView contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Premium Live Ticker */}
        <Animated.View entering={FadeIn.duration(420)} style={styles.newsBar}>
          <LinearGradient colors={['#39ff6a', '#2be05a']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.newsFlag}>
            <View style={styles.liveDotSmall} />
            <Text style={styles.newsFlagTxt}>LIVE ACADEMY</Text>
          </LinearGradient>
          <View style={styles.marqueeWrap}>
            <Marquee pxPerSec={38}>
              <Text style={styles.newsText}>✦ {news}   ✦ FC 26 REVIEW PRACTICE   ✦ RECORD MATCHES AS USUAL   </Text>
            </Marquee>
          </View>
          <View style={styles.newsRightFade} pointerEvents="none" />
        </Animated.View>

        <View style={[styles.mainLayout, isMultiColumn && styles.mainLayoutWide]}>
          {/* Left */}
          <View style={[styles.colMain, isMultiColumn && styles.colMainWide]}>
            <Animated.View entering={FadeInUp.delay(40).duration(480)} style={[styles.heroCard, Platform.OS === 'web' && (styles.heroBlur as any)]}>
              <LinearGradient colors={['rgba(57,255,106,0.18)', 'transparent']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
              <View style={styles.heroTopRow}>
                <Text style={styles.heroDay}>THE LOOP · SESSION BY SESSION · FOREVER</Text>
                <View style={styles.dayPill}>
                  <Text style={styles.dayPillTxt}>∞</Text>
                </View>
              </View>
              <TypedGreeting name={settings.displayName || 'PLAYER'} />
              <Text style={styles.heroSub}>One job: show up honestly, review the tape, and let the work stack. No stop date.</Text>
              <View style={styles.heroStatsRow}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatVal}>TONIGHT</Text>
                  <Text style={styles.heroStatLbl}>THE FEELING</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatVal}>24H</Text>
                  <Text style={styles.heroStatLbl}>THE MOMENTS</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatVal}>LAST</Text>
                  <Text style={styles.heroStatLbl}>THE CARD</Text>
                </View>
              </View>
            </Animated.View>

            <View style={styles.primaryWrap}>
              <PremiumCard
                primary
                delay={120}
                icon={JourneyIcon}
                label="ENTER THE LOOP"
                badge="THE GUIDE"
                line="“Watch it once. Write how you feel. Wait a day. Then take the match apart. Paper first. You type it.”"
                onPress={onOpenJourney}
              />
            </View>

            <View style={styles.sectionHead}>
              <Text style={styles.sectionHeader}>ACADEMY WORKSPACES</Text>
              <View style={styles.sectionLine} />
            </View>

            {/* two-up only where the main column actually has room (laptop+);
                tablets keep a comfortable single rail beside the sidebar */}
            <View style={[styles.routesGrid, isLaptopUp && styles.routesGridWide]}>
              {onOpenTracker && <PremiumCard delay={160} wide={isLaptopUp} icon={ScanGlyphIcon} label="THE NUMBERS" badge="YOU TYPE IT" line="“Type the match numbers after the work. Your stats in relation to that opponent. Nothing to upload.”" onPress={onOpenTracker} />}
              <PremiumCard delay={180} wide={isLaptopUp} label="THE SCENE · THE FIFTY" badge="LIVE BOOK" line="“Fifty current FC Pro names. Titles, mechanics, the feed. Public record only.”" onPress={onOpenScene ?? onOpenUpdates} />
              <PremiumCard delay={240} wide={isLaptopUp} label="FC UPDATES & ACADEMY" badge="PATCH NOTES" line="“Important gameplay and tuning updates. Only the receipts that help you win.”" onPress={onOpenUpdates} />
              <PremiumCard delay={280} wide={isLaptopUp} label="LEARN THE BASICS" badge="GUIDE" line="“New foundations first. The simple, repeatable things win difficult matches.”" onPress={onOpenGuide} />
              <PremiumCard delay={320} wide={isLaptopUp} icon={WavesGlyphIcon} label="CLUBHOUSE COMMUNITY" badge="LIVE" line="“The clubhouse is open. Bring a question, a score, or an honest lesson.”" onPress={onOpenHalls} />
            </View>
          </View>

          {/* Right Sidebar */}
          <View style={[styles.colSide, isMultiColumn && styles.colSideWide, isMultiColumn && bp === 'tablet' && styles.colSideTablet]}>
            <Animated.View entering={FadeInUp.delay(160).duration(480)} style={[styles.widget, Platform.OS === 'web' && (styles.glassBlur as any)]}>
              <View style={styles.widgetHeader}>
                <Text style={styles.widgetTag}>THE LOOP</Text>
                <View style={styles.widgetPctPill}>
                  <Text style={styles.widgetPct}>∞</Text>
                </View>
              </View>
              <Text style={styles.loopWidgetLead}>No stop date. Session by session. You write it on paper. Then you type it.</Text>
              <View style={styles.widgetStatsRow}>
                <View style={styles.widgetStat}><Text style={styles.widgetStatVal}>01</Text><Text style={styles.widgetStatLbl}>FEELING</Text></View>
                <View style={styles.widgetStatCenter}><Text style={styles.widgetStatVal}>02</Text><Text style={styles.widgetStatLbl}>MOMENTS</Text></View>
                <View style={styles.widgetStat}><Text style={styles.widgetStatVal}>03</Text><Text style={styles.widgetStatLbl}>THE CARD</Text></View>
              </View>
              <Pressable onPress={onOpenJourney} style={({ pressed }) => [styles.widgetBtn, pressed && { opacity: 0.85 }]}>
                <Text style={styles.widgetBtnTxt}>ENTER THE LOOP ›</Text>
              </Pressable>
            </Animated.View>

            {baseline && (
              <Animated.View entering={FadeInUp.delay(200).duration(480)} style={[styles.baselineCard, Platform.OS === 'web' && (styles.glassBlur as any)]}>
                <View style={styles.widgetHeader}>
                  <Text style={styles.baselineTag}>STARTING BASELINE</Text>
                  <View style={styles.sealedPill}><Text style={styles.sealedTxt}>SEALED ✓</Text></View>
                </View>
                <Text style={styles.baselineTier}>{baseline.tier}</Text>
                <Text style={styles.baselineMeta}>{baseline.w}W · {baseline.d}D · {baseline.l}L · HEAD {baseline.avgComposure.toFixed(1)}/5</Text>
                <Text style={styles.baselineRead} numberOfLines={2}>“{baseline.coachRead}”</Text>
              </Animated.View>
            )}
          </View>
        </View>

        <Text style={styles.footer}>THE NEXT MATCH IS THE ONLY ONE YOU CAN WORK ON · PROSEASON ACADEMY</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingVertical: 14, paddingBottom: 56 },
  scrollWide: { paddingVertical: 18 },

  newsBar: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: radii.md,
    backgroundColor: 'rgba(15, 26, 19, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.18)',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  newsFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'stretch',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  liveDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#05160a' },
  newsFlagTxt: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.2, color: '#05160a' },
  marqueeWrap: { flex: 1, overflow: 'hidden' },
  newsText: { paddingLeft: 14, fontFamily: monoFont, fontSize: 8.5, fontWeight: '800', letterSpacing: 1.2, color: colors.fg },
  newsRightFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 32,
    // @ts-ignore web gradient
    backgroundImage: 'linear-gradient(90deg, transparent, rgba(15,26,19,0.88))',
  } as any,

  mainLayout: { flexDirection: 'column', gap: 18 },
  mainLayoutWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 22 },
  colMain: { flex: 1, width: '100%' },
  colMainWide: { flex: 1.55 },
  colSide: { width: '100%', gap: 14 },
  colSideWide: { width: 372 },
  // tablets get a slimmer sidebar so the main column keeps breathing room
  colSideTablet: { width: 312 },

  heroCard: {
    padding: 22,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(15, 26, 19, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 106, 0.18)',
    overflow: 'hidden',
    ...elevation.card,
  },
  heroBlur: { backdropFilter: 'blur(16px)' } as any,
  glassBlur: { backdropFilter: 'blur(14px)' } as any,
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroDay: { flex: 1, fontFamily: monoFont, fontSize: 8, fontWeight: '900', letterSpacing: 1.8, color: colors.primary },
  dayPill: { backgroundColor: 'rgba(57,255,106,0.12)', borderWidth: 1, borderColor: 'rgba(57,255,106,0.22)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  dayPillTxt: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1, color: colors.primary },
  heroTitle: { minHeight: 42, marginTop: 10, fontFamily: displayFont, fontSize: 34, lineHeight: 38, letterSpacing: 0.3, color: colors.fg },
  cursor: { color: colors.primary, opacity: 0.9 },
  heroSub: { marginTop: 10, fontFamily: bodyFont, fontSize: 13.5, lineHeight: 21, color: 'rgba(214,226,217,0.92)' },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: 'rgba(5,10,6,0.45)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(57,255,106,0.08)' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { fontFamily: monoFont, fontSize: 12, fontWeight: '900', color: colors.fg, letterSpacing: 0.8 },
  loopWidgetLead: { marginTop: 12, fontFamily: bodyFont, fontSize: 13, lineHeight: 19, color: 'rgba(214,226,217,0.9)' },
  heroStatLbl: { marginTop: 2, fontFamily: monoFont, fontSize: 6.5, fontWeight: '800', letterSpacing: 1.2, color: colors.muted },
  heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(57,255,106,0.12)' },

  primaryWrap: { marginTop: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, marginBottom: 12 },
  sectionHeader: { fontFamily: monoFont, fontSize: 10, fontWeight: '900', letterSpacing: 2.2, color: colors.muted },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(143,184,155,0.12)' },
  routesGrid: { gap: 10 },
  // Desktop: the workspaces sit in a proper two-column grid instead of one
  // long phone-like stack — the dashboard earns its width.
  routesGridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  routeWrap: { width: '100%' },
  routeWrapWide: {
    // Web gets the exact calc; native gets a close percentage.
    width: Platform.OS === 'web' ? (('calc(50% - 7px)' as unknown) as number) : '48%',
  },
  routePrimaryWrap: { width: '100%' },
  routeHoverRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.55)',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    opacity: 0,
    zIndex: 2,
  },
  sheenClip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderRadius: radii.lg,
  },
  sheen: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    left: 0,
    width: 120,
  },
  route: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  routeGlass: {
    backgroundColor: 'rgba(15,26,19,0.72)',
    borderColor: 'rgba(143,184,155,0.14)',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  routePrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
  routeAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, opacity: 0.9 },
  routePressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  routeIconBox: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: 'rgba(57,255,106,0.10)', borderWidth: 1, borderColor: 'rgba(57,255,106,0.18)' },
  routeIconBoxPrimary: { backgroundColor: 'rgba(5,22,10,0.18)', borderColor: 'rgba(5,22,10,0.22)' },
  signalDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.9, shadowRadius: 6 },
  signalDotPrimary: { backgroundColor: '#05160a', shadowOpacity: 0 },
  routeCopy: { flex: 1, paddingRight: 8 },
  routeHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  routeLabel: { fontFamily: bodyFontHeavy, fontSize: 12.5, letterSpacing: 0.6, color: colors.fg },
  routeLabelPrimary: { color: '#05160a', fontSize: 13.5, letterSpacing: 0.8 },
  routeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: 'rgba(57,255,106,0.12)', borderWidth: 1, borderColor: 'rgba(57,255,106,0.22)' },
  routeBadgePrimary: { backgroundColor: 'rgba(5,22,10,0.14)', borderColor: 'rgba(5,22,10,0.22)' },
  routeBadgeTxt: { fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', letterSpacing: 1, color: colors.primary },
  routeBadgeTxtPrimary: { color: '#05160a' },
  routeLine: { marginTop: 5, fontFamily: bodyFont, fontSize: 11.5, lineHeight: 16.5, color: 'rgba(143,184,155,0.88)' },
  routeLinePrimary: { color: 'rgba(5,22,10,0.78)', fontFamily: bodyFontBold },
  chevWrap: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(57,255,106,0.08)', borderWidth: 1, borderColor: 'rgba(57,255,106,0.14)' },
  chevWrapPrimary: { backgroundColor: 'rgba(5,22,10,0.12)', borderColor: 'rgba(5,22,10,0.18)' },

  coachCard: {
    padding: 18,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(15,26,19,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.18)',
    overflow: 'hidden',
    ...elevation.card,
  },
  coachAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, opacity: 0.9 },
  coachTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coachAvatar: { width: 56, height: 56, borderRadius: 18, borderWidth: 1.5, borderColor: colors.accent, backgroundColor: '#0c140e' },
  coachMeta: { flex: 1 },
  coachTag: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.4, color: colors.accent },
  coachName: { marginTop: 2, fontFamily: displayFont, fontSize: 17, color: colors.fg },
  coachTitle: { marginTop: 2, fontFamily: bodyFontHeavy, fontSize: 10, color: colors.muted },
  coachLive: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 6 },
  coachLiveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  coachQuote: { marginTop: 12, fontFamily: bodyFont, fontStyle: 'italic', fontSize: 12.5, lineHeight: 18, color: '#d6e2d9' },
  benchmarkBox: { marginTop: 12, padding: 11, borderRadius: 12, backgroundColor: 'rgba(242,192,120,0.07)', borderWidth: 1, borderColor: 'rgba(242,192,120,0.16)' },
  benchmarkTag: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '900', letterSpacing: 1.2, color: colors.accent },
  benchmarkTxt: { marginTop: 4, fontFamily: bodyFont, fontSize: 11, lineHeight: 16, color: 'rgba(238,242,236,0.88)' },

  widget: { padding: 16, borderRadius: radii.xl, backgroundColor: 'rgba(15,26,19,0.78)', borderWidth: 1, borderColor: 'rgba(57,255,106,0.16)', ...elevation.card },
  widgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  widgetTag: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.4, color: colors.muted },
  widgetPctPill: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  widgetPct: { fontFamily: monoFont, fontSize: 10, fontWeight: '900', letterSpacing: 0.5, color: '#05160a' },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: 'rgba(57,255,106,0.10)', overflow: 'hidden', marginTop: 12, borderWidth: 1, borderColor: 'rgba(57,255,106,0.08)' },
  progressFill: { height: '100%', borderRadius: 999 },
  progressShimmer: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 44, borderRadius: 999, overflow: 'hidden' },
  progressGlow: { position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 999, backgroundColor: 'rgba(57,255,106,0.18)', opacity: 0.6 },
  widgetStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(57,255,106,0.08)' },
  widgetStat: { alignItems: 'center', flex: 1 },
  widgetStatCenter: { alignItems: 'center', flex: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(57,255,106,0.08)' },
  widgetStatVal: { fontFamily: monoFont, fontSize: 16, fontWeight: '900', color: colors.fg },
  widgetStatLbl: { marginTop: 3, fontFamily: monoFont, fontSize: 6, fontWeight: '800', letterSpacing: 1.1, color: colors.muted },
  widgetBtn: { marginTop: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(57,255,106,0.22)', backgroundColor: 'rgba(57,255,106,0.06)', alignItems: 'center' },
  widgetBtnTxt: { fontFamily: bodyFontHeavy, fontSize: 9.5, letterSpacing: 1.2, color: colors.primary },

  baselineCard: { padding: 16, borderRadius: radii.xl, backgroundColor: 'rgba(20,18,10,0.62)', borderWidth: 1, borderColor: 'rgba(242,192,120,0.22)', ...elevation.card },
  baselineTag: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.4, color: colors.accent },
  sealedPill: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  sealedTxt: { fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', color: '#05160a' },
  baselineTier: { marginTop: 8, fontFamily: displayFont, fontSize: 20, color: colors.fg },
  baselineMeta: { marginTop: 3, fontFamily: monoFont, fontSize: 7.5, letterSpacing: 1, color: colors.muted },
  baselineRead: { marginTop: 7, fontFamily: bodyFont, fontSize: 11.5, lineHeight: 16, color: '#d1ddd3', fontStyle: 'italic' },

  footer: { marginTop: 28, textAlign: 'center', fontFamily: monoFont, fontSize: 7.5, letterSpacing: 1.5, color: 'rgba(143,184,155,0.45)' },
});
