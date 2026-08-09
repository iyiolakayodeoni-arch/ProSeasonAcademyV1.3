import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { ChevronRightIcon } from '../../components/Icons';
import { Coach } from '../../data/coaches';
import { useSettings } from '../../data/settings';
import { currentDay, loadDailyProgram } from '../../data/dailyProgram';
import { useAnnouncements } from '../../data/announcements';
import { bodyFont, bodyFontHeavy, colors, displayFont, monoFont } from '../../theme';

type Props = {
  coach: Coach;
  onOpenJourney: () => void;
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

/** A small type-in treatment makes the welcome feel live without slowing entry. */
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
    }, 34);
    return () => clearInterval(timer);
  }, [full]);

  return <Text style={styles.heroTitle}>{shown}<Text style={styles.cursor}>▌</Text></Text>;
}

/** A restrained pulse gives every coach-led destination a little life. */
function CoachRoute({
  label,
  line,
  onPress,
  delay,
  primary,
}: {
  label: string;
  line: string;
  onPress: () => void;
  delay: number;
  primary?: boolean;
}) {
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withRepeat(withSequence(withTiming(-3, { duration: 1600 }), withTiming(0, { duration: 1600 })), -1, true);
  }, [lift]);
  const movement = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(380)} style={movement}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.route, primary && styles.routePrimary, pressed && styles.routePressed]}>
        <View style={styles.routeSignal}><View style={[styles.signalDot, primary && styles.signalDotPrimary]} /></View>
        <View style={styles.routeCopy}>
          <Text style={[styles.routeLabel, primary && styles.routeLabelPrimary]}>{label}</Text>
          <Text style={[styles.routeLine, primary && styles.routeLinePrimary]}>{line}</Text>
        </View>
        <ChevronRightIcon size={16} color={primary ? '#07110a' : colors.primary} />
      </Pressable>
    </Animated.View>
  );
}

export default function HomeTab({ coach, onOpenJourney, onOpenUpdates, onOpenHalls, onOpenGuide, onOpenRole }: Props) {
  const [day, setDay] = useState(1);
  const settings = useSettings();
  const { items: announcements } = useAnnouncements();
  const firstName = coach.name.split(' ')[0];

  useEffect(() => {
    void loadDailyProgram().then((program) => setDay(Math.min(currentDay(program), 180)));
  }, [coach.id]);

  const news = useMemo(() => {
    if (announcements.length) return announcements[0].title.toUpperCase();
    return 'THE ACADEMY IS LIVE · CHECK IN, PLAY HONEST, BUILD YOUR GAME';
  }, [announcements]);

  return (
    <View style={styles.flex}>
      <GridBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Live academy notice: it sits at the top, but remains deliberately compact. */}
        <View style={styles.newsBar}>
          <Text style={styles.newsFlag}>LIVE NEWS</Text>
          <Marquee pxPerSec={30}>
            <Text style={styles.newsText}>✦ {news}   </Text>
          </Marquee>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroDay}>DAY {day} OF 180 · {firstName.toUpperCase()} IS ON THE LINE</Text>
          <TypedGreeting name={settings.displayName} />
          <Text style={styles.heroSub}>“{firstName}, speaking. You have one job: show up honestly and let the work stack.”</Text>
        </View>

        <View style={styles.routes}>
          <CoachRoute primary delay={80} label="OPEN MY SIX MONTHS" line={`“Day ${day} is waiting. Open it and finish what you started.”`} onPress={onOpenJourney} />
          <CoachRoute delay={150} label="ROLE MODEL STORY" line="“Study the standard. Then make your own version of it.”" onPress={onOpenRole} />
          <CoachRoute delay={220} label="FC UPDATES & ACADEMY" line="“I pulled the important updates. No noise, only what helps.”" onPress={onOpenUpdates} />
          <CoachRoute delay={290} label="LEARN THE BASICS" line="“New foundations first. The simple things win difficult matches.”" onPress={onOpenGuide} />
          <CoachRoute delay={360} label="COMMUNITY" line="“The room is open. Bring a question, a result, or a real lesson.”" onPress={onOpenHalls} />
        </View>

        <Text style={styles.footer}>THE NEXT MATCH IS THE ONLY ONE YOU CAN WORK ON.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },

  newsBar: { height: 30, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderRadius: 8, backgroundColor: 'rgba(57,255,106,0.1)', borderWidth: 1, borderColor: 'rgba(57,255,106,0.22)' },
  newsFlag: { alignSelf: 'stretch', paddingHorizontal: 9, paddingTop: 9, fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', letterSpacing: 1.1, color: '#07110a', backgroundColor: colors.primary },
  newsText: { paddingLeft: 12, fontFamily: monoFont, fontSize: 7.5, fontWeight: '800', letterSpacing: 1.1, color: colors.fg },

  hero: { marginTop: 25 },
  heroDay: { fontFamily: monoFont, fontSize: 7.3, fontWeight: '800', letterSpacing: 1.5, color: colors.primary },
  heroTitle: { minHeight: 39, marginTop: 9, fontFamily: displayFont, fontSize: 30, lineHeight: 34, letterSpacing: 0.25, color: colors.fg },
  cursor: { color: colors.primary },
  heroSub: { marginTop: 7, fontFamily: bodyFont, fontSize: 13.5, lineHeight: 20, color: 'rgba(143,184,155,0.94)' },

  routes: { marginTop: 28, gap: 11 },
  route: { minHeight: 74, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(57,255,106,0.18)', backgroundColor: 'rgba(15,26,19,0.88)' },
  routePrimary: { borderColor: colors.primary, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 5 },
  routePressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  routeSignal: { width: 19, alignItems: 'flex-start' },
  signalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.9, shadowRadius: 7, shadowOffset: { width: 0, height: 0 } },
  signalDotPrimary: { backgroundColor: '#07110a', shadowOpacity: 0 },
  routeCopy: { flex: 1, paddingRight: 9 },
  routeLabel: { fontFamily: bodyFontHeavy, fontSize: 12, letterSpacing: 0.6, color: colors.fg },
  routeLabelPrimary: { color: '#07110a' },
  routeLine: { marginTop: 4, fontFamily: bodyFont, fontSize: 11.5, lineHeight: 15, color: colors.muted },
  routeLinePrimary: { color: 'rgba(7,17,10,0.75)' },

  footer: { marginTop: 27, textAlign: 'center', fontFamily: monoFont, fontSize: 6.4, letterSpacing: 1.25, color: 'rgba(143,184,155,0.5)' },
});
