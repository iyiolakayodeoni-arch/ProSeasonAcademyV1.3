import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import ScreenFlash from '../components/ScreenFlash';
import LogoMark from '../components/LogoMark';
import CoachCard from '../components/CoachCard';
import NeonInput from '../components/NeonInput';
import PhotoVeil from '../components/PhotoVeil';
import { useAuth } from '../hooks/useAuth';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { COACHES } from '../data/coaches';
import SideloadAssistant from './SideloadAssistant';
import { colors, monoFont, displayFont, bodyFont, bodyFontStrong, bodyFontBold, bodyFontHeavy } from '../theme';

const HERO = require('../../assets/art/splash-hero.png');
import { getSettings, setCountry, setDisplayName } from '../data/settings';
import { COUNTRY_OPTIONS, optionForLabel, verifyLocation } from '../data/location';
import * as backend from '../data/backend';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const HEADER_TRAIL_LENGTH = 260;
const CARD_GAP = 12;
const PAGE_PAD = 22;

type Mode = 'register' | 'login' | 'reset' | 'token';

type Props = {
  onSignedIn?: () => void;
};

// ── THE DOOR'S FACE — the floodlit photograph, the crest, and the two-line
//    wordmark. The photo dissolves into the page through PhotoVeil so the
//    whole screen reads as one continuous surface, not a header banner. ──
function DoorHero({
  width,
  lines,
  sub,
  bleed = true,
  loopProps,
  glowStyle,
}: {
  width: number;
  lines: [string, string];
  sub?: string;
  /** stretch edge-to-edge over the scroll padding (false on padded roots) */
  bleed?: boolean;
  loopProps?: any;
  glowStyle?: any;
}) {
  const H = 252;
  return (
    <View
      style={[
        styles.heroBand,
        bleed && { marginHorizontal: -PAGE_PAD, marginTop: -54 },
        { width, height: H },
      ]}
    >
      {/* bias the crop toward the night sky + floodlight; the player sits low */}
      <Image
        source={HERO}
        style={{ position: 'absolute', top: -70, left: 0, width, aspectRatio: 768 / 1344 }}
        resizeMode="cover"
      />
      <PhotoVeil width={width} height={H} warmAt={{ x: width * 0.72, y: H * 0.3, r: width * 0.55 }} />
      <View style={styles.heroCrest}>
        <LogoMark size={54} loopProps={loopProps} glowStyle={glowStyle} />
      </View>
      <View style={styles.heroText}>
        <Text style={styles.heroHead}>{lines[0]}</Text>
        <Text style={[styles.heroHead, styles.heroHeadAccent]}>{lines[1]}</Text>
        {!!sub && <Text style={styles.heroSub}>{sub}</Text>}
      </View>
    </View>
  );
}

export default function SignInScreen({ onSignedIn }: Props) {
  const { width } = useWindowDimensions();
  // never wider than the phone column App.tsx frames on desktop/web
  const doorWidth = Math.min(width, 430);
  // one coach — give the card the full width instead of splitting for two
  const cardWidth = Math.min(doorWidth - PAGE_PAD * 2, 232);

  const [mode, setMode] = useState<Mode>('register');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [countryPick, setCountryPick] = useState<string | null>(getSettings().country);
  const [seasonFull, setSeasonFull] = useState<backend.SeasonGate | null>(null);
  const [liveSeats, setLiveSeats] = useState<backend.SeasonGate | null>(null);
  const [academyToken, setAcademyToken] = useState<string | null>(null);
  const [tokenRevealed, setTokenRevealed] = useState(false);
  const [installHelp, setInstallHelp] = useState(false);

  const { loading, register, login, requestReset } = useAuth();

  useEffect(() => {
    void backend.liveSeatCount().then((seats) => {
      if (seats) setLiveSeats(seats);
    });
  }, []);

  const { loopProps, glowStyle } = useTrailLoop({ pathLength: HEADER_TRAIL_LENGTH, drawMs: 1800, eraseMs: 1800 });

  const press = useSharedValue(0);
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.03 }],
    shadowOpacity: 0.35 + press.value * 0.4,
    shadowRadius: 12 + press.value * 10,
  }));

  const nameOk = username.trim().length >= 3;
  const emailOk = email.trim().includes('@') && email.trim().includes('.');
  const passOk = password.length >= 8;
  const countryOpt = optionForLabel(countryPick);

  const canRegister = nameOk && emailOk && passOk && !!countryOpt && !loading;
  const canLogin = emailOk && password.length > 0 && !loading;
  const canReset = emailOk && !loading;

  const pickCountry = (label: string) => {
    const o = optionForLabel(label);
    if (!o) return;
    setCountryPick(label);
    // Keep the existing regional profile value for member records.
    const geo: 'africa' | 'world' = o.nigeriaShelf
      ? 'africa'
      : o.geo === 'africa' && o.code !== 'NG'
        ? 'world'
        : o.geo === 'africa'
          ? 'africa'
          : 'world';
    setCountry(label, geo, o.code);
  };

  const finishSignedIn = async (token?: string) => {
    if (token) {
      setAcademyToken(token);
      setMode('token');
      return;
    }
    // soft location verify — never blocks
    const o = optionForLabel(countryPick) ?? optionForLabel(getSettings().country);
    if (o) {
      void verifyLocation({ country: o.label, countryCode: o.code });
    }
    onSignedIn?.();
  };

  const onRegister = async () => {
    if (!canRegister || !countryOpt) return;
    setError(null);
    setInfo(null);
    setDisplayName(username.trim());
    const geo = countryOpt.nigeriaShelf ? 'africa' : countryOpt.geo === 'africa' ? 'world' : countryOpt.geo;
    const result = await register({
      username: username.trim(),
      email: email.trim(),
      password,
      country: countryOpt.label,
      countryCode: countryOpt.code,
      region: geo,
    });
    if (!result.ok) {
      if (result.error === 'SEASON_FULL' && result.season) {
        setSeasonFull(result.season);
        return;
      }
      setError(result.message);
      return;
    }
    await finishSignedIn(result.academyToken);
  };

  const onLogin = async () => {
    if (!canLogin) return;
    setError(null);
    setInfo(null);
    const result = await login(email.trim(), password);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await finishSignedIn();
  };

  const onReset = async () => {
    if (!canReset) return;
    setError(null);
    const result = await requestReset(email.trim());
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setInfo(result.message);
  };

  // ── SEASON FULL ──
  if (seasonFull) {
    return (
      <View style={styles.flex}>
        <GridBackground />
        <ScreenFlash />
        <DoorHero
          width={doorWidth}
          lines={['THE SEASON', 'IS FULL']}
          bleed={false}
          loopProps={loopProps}
          glowStyle={glowStyle}
        />
        <View style={styles.fullCard}>
          <Text style={styles.fullTag}>{seasonFull.season} — FULL</Text>
          <Text style={styles.fullCount}>
            {seasonFull.taken}/{seasonFull.cap} SEATS CLAIMED
          </Text>
          <Text style={styles.fullBody}>
            YOU DID NOTHING WRONG — THE SEASON SOLD OUT BEFORE YOUR TAP. YOUR NAME IS ON THE
            WAITLIST. UNTIL THEN TRAIN SOLO: SCANS, THE VAULT, THE JOURNEY.
          </Text>
          <Pressable onPress={() => onSignedIn?.()} hitSlop={6}>
            <Animated.View style={[styles.cta, btnStyle]}>
              <Text style={styles.ctaText}>TRAIN SOLO UNTIL SEASON TWO ›</Text>
            </Animated.View>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── ACADEMY TOKEN REVEAL (once, after register) ──
  if (mode === 'token' && academyToken) {
    return (
      <View style={styles.flex}>
        <GridBackground />
        <ScreenFlash />
        <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
          <DoorHero
            width={doorWidth}
            lines={['YOUR SEAT', 'IS LIVE']}
            sub="Your reference token is below — the founder finds you with it."
            loopProps={loopProps}
            glowStyle={glowStyle}
          />
          <View style={styles.tokenCard}>
            <Text style={styles.tokenTag}>ACADEMY REFERENCE TOKEN</Text>
            <Text style={styles.tokenHint}>
              SAVE THIS. IT IS YOUR SEAT ID — SHOWN ONCE AT SIGN-UP. YOU SIGN IN WITH EMAIL + PASSWORD;
              THIS TOKEN IS HOW THE FOUNDER FINDS YOU.
            </Text>
            <Pressable onPress={() => setTokenRevealed(true)} hitSlop={6}>
              <View style={styles.tokenBox}>
                <Text style={styles.tokenValue}>
                  {tokenRevealed ? academyToken : 'TAP TO REVEAL · PSA-••••••'}
                </Text>
              </View>
            </Pressable>
            <Text style={styles.tokenFine}>
              STORED ON THIS DEVICE · ALSO IN SETTINGS → PASSWORD & SECURITY
            </Text>
          </View>
          <Pressable
            onPress={() => {
              const o = optionForLabel(countryPick);
              if (o) void verifyLocation({ country: o.label, countryCode: o.code });
              onSignedIn?.();
            }}
          >
            <Animated.View style={[styles.cta, btnStyle]}>
              <Text style={styles.ctaText}>I SAVED IT — ENTER THE ACADEMY ›</Text>
            </Animated.View>
          </Pressable>
        </ScrollView>
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
        <ScreenFlash />
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <DoorHero
            width={doorWidth}
            lines={['YOUR COACH', 'IS WAITING']}
            sub={'Your rooms light up when your seat opens.'}
            loopProps={loopProps}
            glowStyle={glowStyle}
          />

          <View style={styles.cardsRow}>
            {COACHES.map((c, i) => (
              <React.Fragment key={c.id}>
                {i > 0 && <View style={{ width: CARD_GAP }} />}
                <CoachCard coach={c} width={cardWidth} />
              </React.Fragment>
            ))}
          </View>

          {/* mode tabs */}
          <View style={styles.modeRow}>
            {([
              ['register', 'CREATE SEAT'],
              ['login', 'SIGN IN'],
              ['reset', 'RESET'],
            ] as const).map(([id, label]) => {
              const on = mode === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    setMode(id);
                    setError(null);
                    setInfo(null);
                  }}
                >
                  <View style={[styles.modeChip, on && styles.modeChipOn]}>
                    <Text style={[styles.modeTxt, on && styles.modeTxtOn]}>{label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {mode === 'register' && (
            <>
              <Text style={styles.geoTitle}>YOUR COUNTRY</Text>
              <View style={styles.geoGrid}>
                {COUNTRY_OPTIONS.map((o) => {
                  const on = countryPick === o.label;
                  return (
                    <Pressable key={o.label} onPress={() => pickCountry(o.label)} hitSlop={3}>
                      <View style={[styles.geoChip, on && styles.geoChipOn]}>
                        <Text style={[styles.geoChipTxt, on && styles.geoChipTxtOn]}>{o.label}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.geoNote}>
                THIS HELPS KEEP THE COMMUNITY REAL. LOCATION IS CHECKED SOFTLY AFTER SIGN-IN.
              </Text>

              <View style={styles.form}>
                <NeonInput
                  placeholder="USERNAME"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="characters"
                  maxLength={14}
                />
                <View style={styles.fieldGap} />
                <NeonInput
                  placeholder="EMAIL"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <View style={styles.fieldGap} />
                <NeonInput
                  placeholder="PASSWORD · 8+ CHARACTERS"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              <Text style={styles.geoNote}>
                YOUR ACADEMY REFERENCE TOKEN IS GENERATED AUTOMATICALLY.
              </Text>
            </>
          )}

          {mode === 'login' && (
            <View style={styles.form}>
              <NeonInput
                placeholder="EMAIL"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <View style={styles.fieldGap} />
              <NeonInput
                placeholder="PASSWORD"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          )}

          {mode === 'reset' && (
            <>
              <Text style={styles.geoNote}>
                ENTER THE EMAIL ON YOUR SEAT. IF IT MATCHES, A RESET LINK IS SENT. WE NEVER CONFIRM
                WHETHER AN EMAIL EXISTS.
              </Text>
              <View style={styles.form}>
                <NeonInput
                  placeholder="EMAIL"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </>
          )}

          {error && <Text style={styles.doorError}>{error}</Text>}
          {info && <Text style={styles.infoNote}>{info}</Text>}

          <Pressable
            onPress={() => {
              if (mode === 'register') void onRegister();
              else if (mode === 'login') void onLogin();
              else void onReset();
            }}
            onPressIn={() => (press.value = withTiming(1, { duration: 90 }))}
            onPressOut={() => (press.value = withSpring(0))}
            disabled={
              mode === 'register' ? !canRegister : mode === 'login' ? !canLogin : !canReset
            }
          >
            <Animated.View
              style={[
                styles.cta,
                btnStyle,
                loading && styles.ctaBusy,
                (mode === 'register' ? !canRegister : mode === 'login' ? !canLogin : !canReset) &&
                  styles.ctaOff,
              ]}
            >
              <Text style={styles.ctaText}>
                {loading
                  ? mode === 'register'
                    ? 'CLAIMING YOUR SEAT…'
                    : mode === 'login'
                      ? 'SIGNING IN…'
                      : 'SENDING…'
                  : mode === 'register'
                    ? !countryPick
                      ? 'PICK YOUR COUNTRY FIRST'
                      : !nameOk
                        ? 'ENTER A USERNAME'
                        : !emailOk
                          ? 'ENTER YOUR EMAIL'
                          : !passOk
                            ? 'PASSWORD · 8+ CHARACTERS'
                            : 'CREATE MY SEAT'
                    : mode === 'login'
                      ? 'SIGN IN'
                      : 'SEND RESET LINK'}
              </Text>
            </Animated.View>
          </Pressable>

          {liveSeats && (
            <View style={styles.seatLiveRow}>
              <View style={styles.seatLiveDot} />
              <Text style={styles.seatLiveTxt}>
                {liveSeats.taken.toLocaleString('en-US')} / {liveSeats.cap.toLocaleString('en-US')} SEATS CLAIMED
              </Text>
            </View>
          )}

          <Text style={styles.seatNote}>
            SEASON ONE · 1,000 SEATS · EMAIL + PASSWORD · AUTO ACADEMY TOKEN
          </Text>

          <Pressable onPress={() => setInstallHelp(true)} hitSlop={6} style={styles.installLinkWrap}>
            <Text style={styles.installLink}>HOW DO I INSTALL THE APP? ›</Text>
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footer}>PROSEASONACADEMY</Text>
            <Text style={styles.footer}>VERSION {APP_VERSION}</Text>
          </View>
        </ScrollView>

        {installHelp && (
          <View style={StyleSheet.absoluteFill}>
            <SideloadAssistant onClose={() => setInstallHelp(false)} />
          </View>
        )}
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
  // ── the photographic head ──
  heroBand: {
    marginBottom: 18,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  heroCrest: { position: 'absolute', top: 20, alignSelf: 'center' },
  heroText: { position: 'absolute', left: 22, right: 22, bottom: 15 },
  heroHead: {
    fontFamily: displayFont,
    fontSize: 35,
    lineHeight: 33,
    letterSpacing: 0.6,
    color: colors.fg,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  heroHeadAccent: { color: colors.primary, letterSpacing: 2 },
  heroSub: {
    marginTop: 9,
    fontFamily: bodyFont,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(238,242,236,0.84)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 18,
  },
  modeRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  modeChip: {
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.3)',
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modeChipOn: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.1)' },
  modeTxt: { fontFamily: bodyFontHeavy, fontSize: 10.5, letterSpacing: 1.6, color: colors.muted },
  modeTxtOn: { color: colors.primary },
  form: {},
  fieldGap: { height: 11 },
  geoTitle: {
    fontFamily: bodyFontHeavy,
    fontSize: 10.5,
    letterSpacing: 2,
    color: colors.warm,
    textAlign: 'center',
    marginBottom: 10,
  },
  geoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginBottom: 8 },
  geoChip: {
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.3)',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: 'rgba(10,15,10,0.5)',
  },
  geoChipOn: { borderColor: colors.accent, backgroundColor: 'rgba(242,192,120,0.1)' },
  geoChipTxt: { fontFamily: bodyFontBold, fontSize: 10, letterSpacing: 1.1, color: colors.muted },
  geoChipTxtOn: { color: colors.accent },
  geoNote: {
    fontFamily: bodyFont,
    fontSize: 11.5,
    letterSpacing: 0.3,
    color: 'rgba(143,184,155,0.85)',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
    marginTop: 4,
  },
  seatLiveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  seatLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 5 },
  seatLiveTxt: { fontFamily: monoFont, fontSize: 9.5, fontWeight: '900', letterSpacing: 2, color: colors.primary },
  seatNote: {
    marginTop: 10,
    fontFamily: bodyFont,
    fontSize: 10.5,
    letterSpacing: 0.8,
    color: 'rgba(143,184,155,0.65)',
    textAlign: 'center',
    lineHeight: 15,
  },
  installLinkWrap: { marginTop: 14, alignSelf: 'center' },
  installLink: {
    fontFamily: bodyFontBold, fontSize: 12, letterSpacing: 1.2, color: colors.accent,
    borderBottomWidth: 1, borderBottomColor: 'rgba(242,192,120,0.5)', paddingBottom: 2,
  },
  fullCard: {
    marginHorizontal: PAGE_PAD,
    borderWidth: 1.2,
    borderColor: 'rgba(242,192,120,0.5)',
    borderRadius: 15,
    backgroundColor: 'rgba(15,26,19,0.92)',
    padding: 18,
  },
  fullTag: { fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 2.4, color: colors.accent, textAlign: 'center' },
  fullCount: { marginTop: 8, fontFamily: displayFont, fontSize: 24, letterSpacing: 2, color: colors.fg, textAlign: 'center' },
  fullBody: {
    marginTop: 12,
    marginBottom: 14,
    fontFamily: bodyFont,
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  tokenCard: {
    borderWidth: 1.2,
    borderColor: 'rgba(57,255,106,0.45)',
    borderRadius: 15,
    backgroundColor: 'rgba(15,26,19,0.92)',
    padding: 18,
    marginBottom: 16,
  },
  tokenTag: {
    fontFamily: bodyFontHeavy,
    fontSize: 10,
    letterSpacing: 2.4,
    color: colors.primary,
    textAlign: 'center',
  },
  tokenHint: {
    marginTop: 10,
    fontFamily: bodyFont,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.3,
    color: colors.muted,
    textAlign: 'center',
  },
  tokenBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(242,192,120,0.08)',
  },
  tokenValue: {
    fontFamily: monoFont,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.accent,
    textAlign: 'center',
  },
  tokenFine: {
    marginTop: 10,
    fontFamily: bodyFont,
    fontSize: 10,
    letterSpacing: 0.9,
    color: 'rgba(143,184,155,0.65)',
    textAlign: 'center',
  },
  cta: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  ctaBusy: { opacity: 0.75 },
  ctaOff: { opacity: 0.4 },
  doorError: {
    marginTop: 12,
    fontFamily: bodyFontStrong,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.3,
    color: colors.loss,
    textAlign: 'center',
  },
  infoNote: {
    marginTop: 12,
    fontFamily: bodyFontStrong,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.3,
    color: colors.primary,
    textAlign: 'center',
  },
  ctaText: {
    fontFamily: bodyFontHeavy,
    fontSize: 13.5,
    letterSpacing: 2.4,
    color: '#07130b',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  footer: {
    fontFamily: monoFont,
    fontSize: 9,
    letterSpacing: 2.4,
    color: 'rgba(143,184,155,0.5)',
  },
});
