import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import LogoMark from '../components/LogoMark';
import CoachCard from '../components/CoachCard';
import NeonInput from '../components/NeonInput';
import { useAuth } from '../hooks/useAuth';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { COACHES } from '../data/coaches';
import { colors, monoFont } from '../theme';
import { GeoRegion, getSettings, setCountry, setDisplayName } from '../data/settings';
import * as backend from '../data/backend';

// From app.json — never hardcode the version.
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const HEADER_TRAIL_LENGTH = 260;

// ── country → the JAN 1 pricing track (one tap, stored forever) ──
const GEO_OPTIONS: { label: string; geo: Exclude<GeoRegion, 'unset'> }[] = [
  { label: 'NIGERIA', geo: 'africa' },
  { label: 'GHANA', geo: 'africa' },
  { label: 'KENYA', geo: 'africa' },
  { label: 'EGYPT', geo: 'africa' },
  { label: 'SOUTH AFRICA', geo: 'africa' },
  { label: 'REST OF AFRICA', geo: 'africa' },
  { label: 'UK & IRELAND', geo: 'world' },
  { label: 'EUROPE', geo: 'world' },
  { label: 'USA & CANADA', geo: 'world' },
  { label: 'ASIA', geo: 'world' },
  { label: 'REST OF WORLD', geo: 'world' },
];

const CARD_GAP = 12;
const PAGE_PAD = 22;

type Props = {
  /** fired after the (stubbed) sign-in resolves → app routes onward */
  onSignedIn?: () => void;
};

export default function SignInScreen({ onSignedIn }: Props) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min((width - PAGE_PAD * 2 - CARD_GAP) / 2, 190);

  const [username, setUsername] = useState('');
  const [countryPick, setCountryPick] = useState<string | null>(getSettings().country);
  const [seasonFull, setSeasonFull] = useState<backend.SeasonGate | null>(null);
  const [offline, setOffline] = useState(false);
  const { loading, enterAcademy } = useAuth();

  // header crest trail (same loop as splash, chained through the shared hook)
  const { loopProps, glowStyle } = useTrailLoop({ pathLength: HEADER_TRAIL_LENGTH, drawMs: 1800, eraseMs: 1800 });

  // sign-in button press feel
  const press = useSharedValue(0);
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.03 }],
    shadowOpacity: 0.35 + press.value * 0.4,
    shadowRadius: 12 + press.value * 10,
  }));

  const signingIn = loading;
  /** the name has to be worth putting on a seat */
  const nameOk = username.trim().length >= 3;
  const canEnter = nameOk && !!countryPick && !signingIn;

  const pickCountry = (label: string, geo: Exclude<GeoRegion, 'unset'>) => {
    setCountryPick(label);
    setCountry(label, geo); // persists — drives the JAN 1 pricing split + the till's shelf
  };

  /** one tap: identity + SEASON seat claimed in the same breath (in-app, nothing hosted) */
  const enter = async () => {
    if (!canEnter) return;
    setOffline(false);
    const handle = username.trim();
    setDisplayName(handle); // the name he chose IS his academy name
    const me = await enterAcademy(handle);
    const gate = backend.getSeasonGate();
    if (gate) {
      setSeasonFull(gate); // season full → waitlist panel, solo training continues
      return;
    }
    // no identity and no gate = the academy is unreachable. Say so, then
    // let him train offline — the vault syncs the moment signal returns.
    if (!me) setOffline(true);
    onSignedIn?.();
  };

  // ── SEASON FULL state — honest, on-brand, never a dead end ──
  if (seasonFull) {
    return (
      <View style={styles.flex}>
        <GridBackground />
        <View style={styles.crestWrap}>
          <View style={{ marginTop: 120 }}>
            <LogoMark size={86} loopProps={loopProps} glowStyle={glowStyle} />
          </View>
        </View>
        <View style={styles.fullCard}>
          <Text style={styles.fullTag}>{seasonFull.season} — FULL</Text>
          <Text style={styles.fullCount}>
            {seasonFull.taken}/{seasonFull.cap} SEATS CLAIMED
          </Text>
          <Text style={styles.fullBody}>
            YOU DID NOTHING WRONG — THE SEASON SOLD OUT BEFORE YOUR TAP. YOUR NAME IS ON THE
            WAITLIST, AND THE FOUNDER OPENS THE NEXT SEASON BIGGER. UNTIL THEN THE ACADEMY
            TRAINS YOU SOLO: SCANS, THE VAULT, THE JOURNEY — ALL OF IT.
          </Text>
          <Text style={styles.fullFine}>ROOMS AND THE TILL LIGHT UP FOR YOU WHEN YOUR SEAT OPENS.</Text>
          <Pressable onPress={() => onSignedIn?.()} hitSlop={6}>
            <Animated.View style={[styles.cta, btnStyle]}>
              <Text style={styles.ctaText}>TRAIN SOLO UNTIL SEASON TWO ›</Text>
            </Animated.View>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.flex}>
        <GridBackground />
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* header crest */}
          <View style={styles.crestWrap}>
            <LogoMark size={86} loopProps={loopProps} glowStyle={glowStyle} />
          </View>

          <Text style={styles.headline}>YOUR COACHES ARE WAITING</Text>

          {/* coach cards from data */}
          <View style={styles.cardsRow}>
            {COACHES.map((c, i) => (
              <React.Fragment key={c.id}>
                {i > 0 && <View style={{ width: CARD_GAP }} />}
                <CoachCard coach={c} width={cardWidth} />
              </React.Fragment>
            ))}
          </View>

          {/* section label */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLbl}>ENTER THE SEASON</Text>
            <View style={styles.sectionLine} />
          </View>

          {/* country → the JAN 1 pricing track (asked once, kept forever) */}
          <Text style={styles.geoTitle}>YOUR COUNTRY — SETS YOUR JAN 1 PLAN</Text>
          <View style={styles.geoGrid}>
            {GEO_OPTIONS.map((o) => {
              const on = countryPick === o.label;
              return (
                <Pressable key={o.label} onPress={() => pickCountry(o.label, o.geo)} hitSlop={3}>
                  <View style={[styles.geoChip, on && styles.geoChipOn]}>
                    <Text style={[styles.geoChipTxt, on && styles.geoChipTxtOn]}>{o.label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.geoNote}>
            AFRICA → CREDIT PACKS · EVERYWHERE ELSE → SUBSCRIPTION — THE PRICES ARE BEING VOTED IN
            THE HALLS RIGHT NOW. THE SPLIT LOCKS ON JAN 1.
          </Text>

          {/* form — one field. No password exists to steal or forget. */}
          <View style={styles.form}>
            <NeonInput
              placeholder="YOUR ACADEMY NAME"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="characters"
              maxLength={14}
            />
          </View>
          <Text style={styles.geoNote}>
            THIS IS THE NAME YOUR COACH CALLS YOU AND THE HALL SEES. 3–14 CHARACTERS.
          </Text>

          {offline && (
            <Text style={styles.offlineNote}>
              THE ACADEMY DIDN'T ANSWER — YOU'RE TRAINING OFFLINE. YOUR VAULT SAVES HERE AND SYNCS
              THE MOMENT SIGNAL RETURNS.
            </Text>
          )}

          {/* CTA — one identity for sign-up AND sign-in, claimed in-app */}
          <Pressable
            onPress={() => {
              void enter();
            }}
            onPressIn={() => (press.value = withTiming(1, { duration: 90 }))}
            onPressOut={() => (press.value = withSpring(0))}
            disabled={!canEnter}
          >
            <Animated.View style={[styles.cta, btnStyle, signingIn && styles.ctaBusy, !canEnter && styles.ctaOff]}>
              <Text style={styles.ctaText}>
                {signingIn ? 'CLAIMING YOUR SEAT…' : !countryPick ? 'PICK YOUR COUNTRY FIRST' : !nameOk ? 'ENTER YOUR ACADEMY NAME' : 'CLAIM MY SEAT'}
              </Text>
            </Animated.View>
          </Pressable>
          <Text style={styles.seatNote}>
            SEASON ONE IS CAPPED AT 1,000 SEATS · NO PASSWORDS, NO WEB FORMS — EVERYTHING STAYS IN THE APP
          </Text>

          {/* footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footer}>PROSEASONACADEMY</Text>
            <Text style={styles.footer}>VERSION {APP_VERSION}</Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    paddingHorizontal: PAGE_PAD,
    paddingTop: 54,
    paddingBottom: 22,
  },
  crestWrap: { alignItems: 'center', marginBottom: 6 },
  headline: {
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 4.5,
    color: colors.primary,
    marginTop: 8,
    marginBottom: 16,
    textShadowColor: 'rgba(57,255,106,0.6)',
    textShadowRadius: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 18,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionLbl: {
    fontFamily: monoFont,
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: colors.muted,
    marginRight: 10,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(57,255,106,0.3)',
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  form: {},
  fieldGap: { height: 11 },

  // ── country capture ──
  geoTitle: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 2.2, color: colors.warm, textAlign: 'center', marginBottom: 10 },
  geoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginBottom: 8 },
  geoChip: { borderWidth: 1, borderColor: 'rgba(143,184,155,0.3)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(10,15,10,0.5)' },
  geoChipOn: { borderColor: colors.accent, backgroundColor: 'rgba(242,192,120,0.1)' },
  geoChipTxt: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.2, color: colors.muted },
  geoChipTxtOn: { color: colors.accent },
  geoNote: { fontFamily: monoFont, fontSize: 5.8, fontWeight: '700', letterSpacing: 1.1, color: colors.muted, textAlign: 'center', lineHeight: 11, marginBottom: 16 },
  seatNote: { marginTop: 9, fontFamily: monoFont, fontSize: 5.6, fontWeight: '700', letterSpacing: 1.2, color: 'rgba(143,184,155,0.6)', textAlign: 'center', lineHeight: 11 },

  // ── season full ──
  fullCard: { marginHorizontal: PAGE_PAD, borderWidth: 1.2, borderColor: 'rgba(242,192,120,0.5)', borderRadius: 15, backgroundColor: 'rgba(15,26,19,0.92)', padding: 18 },
  fullTag: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 2.4, color: colors.accent, textAlign: 'center' },
  fullCount: { marginTop: 7, fontSize: 17, fontWeight: '900', letterSpacing: 2, color: colors.fg, textAlign: 'center' },
  fullBody: { marginTop: 12, fontFamily: monoFont, fontSize: 6.8, fontWeight: '700', letterSpacing: 1.1, color: colors.muted, textAlign: 'center', lineHeight: 13.5 },
  fullFine: { marginTop: 9, marginBottom: 14, fontFamily: monoFont, fontSize: 5.8, fontWeight: '800', letterSpacing: 1.3, color: colors.warm, textAlign: 'center', lineHeight: 11.5 },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 14,
  },
  linkDim: {
    fontFamily: monoFont,
    fontSize: 7,
    letterSpacing: 1.3,
    color: 'rgba(143,184,155,0.7)',
  },
  linkHot: {
    color: colors.fg,
    fontWeight: '800',
    textShadowColor: 'rgba(57,255,106,0.5)',
    textShadowRadius: 6,
  },
  cta: {
    height: 52,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(57,255,106,0.06)',
    borderWidth: 1.3,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  ctaBusy: { opacity: 0.75 },
  ctaOff: { opacity: 0.4 },
  offlineNote: {
    marginTop: 10,
    fontFamily: monoFont,
    fontSize: 6.4,
    lineHeight: 10,
    letterSpacing: 1,
    color: 'rgba(242,192,120,0.9)',
    textAlign: 'center',
  },
  ctaText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 4,
    color: colors.primary,
    textShadowColor: 'rgba(57,255,106,0.7)',
    textShadowRadius: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  footer: {
    fontFamily: monoFont,
    fontSize: 6.5,
    letterSpacing: 2.4,
    color: 'rgba(143,184,155,0.5)',
  },
});
