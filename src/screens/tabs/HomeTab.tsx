import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import GridBackground from '../../components/GridBackground';
import LogoMark from '../../components/LogoMark';
import { ChevronRightIcon } from '../../components/Icons';
import { Coach } from '../../data/coaches';
import { useSettings } from '../../data/settings';
import { currentDay, loadDailyProgram } from '../../data/dailyProgram';
import { bodyFont, bodyFontBold, bodyFontHeavy, colors, displayFont, monoFont } from '../../theme';
import { useTrailLoop } from '../../hooks/useTrailLoop';

// The Home tab answers one question: "what should I do next?" It is quiet,
// like the best of them: one greeting, one action, everything else as a
// calm list behind it. Nothing competes for your attention.

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

export default function HomeTab({ coach, onOpenJourney, onOpenUpdates, onOpenHalls, onOpenGuide, onOpenRole }: Props) {
  const [day, setDay] = useState<number>(1);
  const settings = useSettings();
  const { loopProps, glowStyle } = useTrailLoop({ pathLength: 260, drawMs: 2400, eraseMs: 2400 });

  useEffect(() => {
    void loadDailyProgram().then((p) => setDay(Math.min(currentDay(p), 180)));
  }, []);

  return (
    <View style={styles.flex}>
      <GridBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
        {/* brand crest */}
        <View style={styles.brandRow}>
          <LogoMark size={30} loopProps={loopProps} glowStyle={glowStyle} />
          <Text style={styles.brand}>PROSEASONACADEMY</Text>
        </View>

        {/* one greeting, one day */}
        <View style={styles.hero}>
          <Text style={styles.heroDay}>DAY {day} OF 180</Text>
          <Text style={styles.heroTitle}>{greeting()} {settings.displayName.toUpperCase()}</Text>
          <Text style={styles.heroSub}>One real match. One honest review. We build from there.</Text>
        </View>

        {/* the one thing to do — open your day */}
        <Animated.View entering={FadeInUp.duration(300)}>
          <Pressable onPress={onOpenJourney} style={styles.primary}>
            <View style={{ flex: 1 }}>
              <Text style={styles.primaryKicker}>YOUR DAY</Text>
              <Text style={styles.primaryTitle}>Open my six months</Text>
              <Text style={styles.primarySub}>Seal today, watch it fill in. One day at a time.</Text>
            </View>
            <ChevronRightIcon size={18} color="#07110a" />
          </Pressable>
        </Animated.View>

        {/* everything else — quiet rows */}
        <View style={styles.list}>
          <Row label="ROLE MODEL STORY" sub={coach.name.split(' ')[0].toUpperCase() + "'S OWN JOURNEY"} onPress={onOpenRole} />
          <Row label="FC UPDATES & ACADEMY" sub="Mechanics, founder notes, meta watch" onPress={onOpenUpdates} />
          <Row label="LEARN THE BASICS" sub="New here? Start here" onPress={onOpenGuide} />
          <Row label="COMMUNITY" sub="General chat · private messages" onPress={onOpenHalls} last />
        </View>

        <Text style={styles.footer}>The next match is the only one you can work on.</Text>
      </ScrollView>
    </View>
  );
}

function Row({ label, sub, onPress, last }: { label: string; sub: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { opacity: 0.7 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <ChevronRightIcon size={15} color="rgba(143,184,155,0.5)" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 },

  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { fontFamily: bodyFontHeavy, fontSize: 9.5, letterSpacing: 2.4, color: colors.fg },

  hero: { marginTop: 26 },
  heroDay: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '800', letterSpacing: 2, color: colors.primary },
  heroTitle: { marginTop: 10, fontFamily: displayFont, fontSize: 30, lineHeight: 32, letterSpacing: 0.3, color: colors.fg },
  heroSub: { marginTop: 10, fontFamily: bodyFont, fontSize: 14, lineHeight: 20, color: 'rgba(143,184,155,0.9)' },

  primary: {
    marginTop: 30, flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.primary, borderRadius: 16, padding: 18,
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
  },
  primaryKicker: { fontFamily: monoFont, fontSize: 6.6, fontWeight: '900', letterSpacing: 1.8, color: 'rgba(7,17,10,0.7)' },
  primaryTitle: { marginTop: 5, fontFamily: displayFont, fontSize: 20, letterSpacing: 0.4, color: '#07110a' },
  primarySub: { marginTop: 4, fontFamily: bodyFont, fontSize: 12, lineHeight: 16, color: 'rgba(7,17,10,0.75)' },

  list: { marginTop: 30 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(57,255,106,0.12)' },
  rowLabel: { fontFamily: bodyFontBold, fontSize: 13, letterSpacing: 0.5, color: colors.fg },
  rowSub: { marginTop: 3, fontFamily: bodyFont, fontSize: 11.5, color: colors.muted },

  footer: { marginTop: 26, textAlign: 'center', fontFamily: monoFont, fontSize: 6.6, letterSpacing: 1.4, color: 'rgba(143,184,155,0.5)' },
});
