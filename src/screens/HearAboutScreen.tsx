import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  FadeInUp,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import ArtBand from '../components/ArtBand';
import {
  TiktokIcon,
  InstagramIcon,
  YoutubeIcon,
  BroadcastIcon,
  FriendsIcon,
  GamepadIcon,
  ElseIcon,
} from '../components/Icons';
import { colors, monoFont, displayFont, bodyFont } from '../theme';

// the huddle — word of mouth is how every grassroots team fills its numbers
const HUDDLE = require('../../assets/art/community-huddle.jpg');

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

type Props = {
  /** choice id, or null when the player skips — onboarding is complete either way */
  onDone: (choice: string | null) => void;
};

const OPTIONS = [
  { id: 'tiktok', label: 'TIKTOK', Icon: TiktokIcon },
  { id: 'instagram', label: 'INSTAGRAM', Icon: InstagramIcon },
  { id: 'youtube', label: 'YOUTUBE', Icon: YoutubeIcon },
  { id: 'twitch', label: 'TWITCH / STREAMERS', Icon: BroadcastIcon },
  { id: 'friend', label: 'A FRIEND / WHATSAPP GROUP', Icon: FriendsIcon },
  { id: 'gaming', label: 'A GAMING COMMUNITY', Icon: GamepadIcon },
  { id: 'else', label: 'SOMEWHERE ELSE', Icon: ElseIcon },
];

export default function HearAboutScreen({ onDone }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const { width: winW } = useWindowDimensions();
  const bandW = Math.min(winW, 430);

  const press = useSharedValue(0);
  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.03 }],
    shadowOpacity: 0.3 + press.value * 0.45,
    shadowRadius: 12 + press.value * 10,
  }));

  const finish = useCallback(
    (choice: string | null) => {
      // TODO(real-analytics): send `choice` to your analytics/backend here
      console.log('[onboarding] how-did-you-hear →', choice ?? '(skipped)');
      onDone(choice);
    },
    [onDone],
  );

  const ready = selected !== null;

  return (
    <View style={styles.flex}>
      <GridBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
        {/* the huddle band — the final step of onboarding, said as a team */}
        <ArtBand
          source={[HUDDLE, require('../../assets/art/locker-room.jpg'), require('../../assets/art/coach-touchline.jpg')]}
          width={bandW}
          height={168}
          warmAt={{ x: bandW * 0.24, y: 42, r: bandW * 0.55 }}
          style={{ marginHorizontal: -20, marginTop: -46 }}
        >
          <Animated.View entering={FadeInUp.duration(320)} style={styles.kickerRow}>
            <Text style={styles.kicker}>ONBOARDING — FINAL STEP</Text>
            <View style={styles.dots}>
              <View style={[styles.dot, styles.dotDim]} />
              <View style={[styles.dot, styles.dotDim]} />
              <View style={[styles.dot, styles.dotHot]} />
            </View>
          </Animated.View>
          <Animated.Text entering={FadeInUp.delay(60).duration(320)} style={styles.headline}>
            HOW DID YOU HEAR ABOUT US?
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(110).duration(320)} style={styles.sub}>
            one tap — it helps us find more players like you
          </Animated.Text>
        </ArtBand>

        {/* options */}
        <View style={styles.options}>
          {OPTIONS.map((o, i) => (
            <OptionRow
              key={o.id}
              label={o.label}
              Icon={o.Icon}
              selected={selected === o.id}
              delay={160 + i * 60}
              onPress={() => setSelected(o.id)}
            />
          ))}
        </View>

        {/* CTA */}
        <Animated.View entering={FadeInUp.delay(600).duration(320)}>
          <Pressable
            disabled={!ready}
            onPress={() => finish(selected)}
            onPressIn={() => (press.value = withTiming(1, { duration: 90 }))}
            onPressOut={() => (press.value = withSpring(0))}
          >
            <Animated.View style={[styles.cta, ctaStyle, !ready && styles.ctaDim]}>
              <Text style={[styles.ctaText, !ready && styles.ctaTextDim]}>ENTER THE ACADEMY</Text>
            </Animated.View>
          </Pressable>
          <Pressable onPress={() => finish(null)} hitSlop={8} style={styles.skipWrap}>
            <Text style={styles.skip}>or skip for now</Text>
          </Pressable>
        </Animated.View>

        {/* footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footer}>PROSEASONACADEMY</Text>
          <Text style={styles.footer}>VERSION {APP_VERSION}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function OptionRow({
  label,
  Icon,
  selected,
  delay,
  onPress,
}: {
  label: string;
  Icon: React.ComponentType<{ size?: number; color: string }>;
  selected: boolean;
  delay: number;
  onPress: () => void;
}) {
  const glow = useSharedValue(0);
  const press = useSharedValue(0);
  React.useEffect(() => {
    glow.value = withTiming(selected ? 1 : 0, { duration: 220 });
  }, [selected, glow]);

  const rowStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(glow.value, [0, 1], ['#1f3826', '#39FF6A']),
    shadowOpacity: 0.06 + glow.value * 0.5,
    transform: [{ scale: 1 - press.value * 0.015 }],
  }));
  const radioDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glow.value }],
    opacity: glow.value,
  }));
  const accentStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(300)}>
      <Pressable
        onPress={onPress}
        onPressIn={() => (press.value = withTiming(1, { duration: 80 }))}
        onPressOut={() => (press.value = withSpring(0))}
      >
        <Animated.View style={[styles.row, rowStyle]}>
          {/* left accent notch — only when selected */}
          <Animated.View style={[styles.rowAccent, accentStyle]} />
          <Icon size={16} color={selected ? colors.primary : colors.muted} />
          <Text style={[styles.rowLabel, selected && styles.rowLabelHot]}>{label}</Text>
          <View style={[styles.radio, selected && styles.radioHot]}>
            <Animated.View style={[styles.radioDot, radioDotStyle]} />
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 46, paddingBottom: 18 },

  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  kicker: { fontFamily: monoFont, fontSize: 7.5, letterSpacing: 2.6, color: 'rgba(238,242,236,0.85)' },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  dotDim: { backgroundColor: 'rgba(143,184,155,0.35)' },
  dotHot: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },

  headline: {
    fontFamily: displayFont,
    fontSize: 26,
    lineHeight: 27,
    letterSpacing: 0.6,
    color: colors.fg,
    textShadowColor: 'rgba(57,255,106,0.5)',
    textShadowRadius: 12,
  },
  sub: {
    marginTop: 7,
    fontFamily: bodyFont,
    fontSize: 12.5,
    color: 'rgba(238,242,236,0.8)',
  },

  options: { marginTop: 20, gap: 11 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(15,26,19,0.66)',
    paddingHorizontal: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
  },
  rowAccent: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  rowLabel: { flex: 1, fontFamily: monoFont, fontSize: 10.5, fontWeight: '700', letterSpacing: 2.2, color: colors.fg },
  rowLabelHot: {
    color: colors.fg,
    textShadowColor: 'rgba(57,255,106,0.55)',
    textShadowRadius: 8,
  },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.4,
    borderColor: 'rgba(143,184,155,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioHot: { borderColor: colors.primary },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },

  cta: {
    marginTop: 22,
    height: 56,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(57,255,106,0.07)',
    borderWidth: 1.4,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  ctaDim: { opacity: 0.38 },
  ctaText: {
    fontFamily: monoFont,
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 4,
    color: colors.primary,
    textShadowColor: 'rgba(57,255,106,0.7)',
    textShadowRadius: 9,
  },
  ctaTextDim: { textShadowRadius: 0 },
  skipWrap: { alignSelf: 'center', marginTop: 12 },
  skip: {
    fontFamily: monoFont,
    fontSize: 8,
    letterSpacing: 1.6,
    color: 'rgba(143,184,155,0.7)',
    textDecorationLine: 'underline',
  },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingHorizontal: 2 },
  footer: { fontFamily: monoFont, fontSize: 8, letterSpacing: 2.5, color: 'rgba(143,184,155,0.42)' },
});
