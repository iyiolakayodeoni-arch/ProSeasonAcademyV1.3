import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import GridBackground from '../components/GridBackground';
import ScreenFlash from '../components/ScreenFlash';
import LogoMark from '../components/LogoMark';
import CoachCard from '../components/CoachCard';
import NeonInput from '../components/NeonInput';
import PhotoVeil from '../components/PhotoVeil';
import RotatingArtImage from '../components/RotatingArtImage';
import { useAuth } from '../hooks/useAuth';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { COACHES } from '../data/coaches';
import SideloadAssistant from './SideloadAssistant';
import { colors, monoFont, displayFont, bodyFont, bodyFontStrong, bodyFontBold, bodyFontHeavy } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useHover } from '../hooks/useHover';

const HERO = require('../../assets/art/splash-hero.png');
import { getSettings, setCountry, setDisplayName } from '../data/settings';
import { COUNTRY_OPTIONS, optionForLabel, verifyLocation } from '../data/location';
import * as backend from '../data/backend';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const HEADER_TRAIL_LENGTH = 260;

type Mode = 'register' | 'login' | 'reset' | 'token';

type Props = {
  onSignedIn?: () => void;
};

export default function SignInScreen({ onSignedIn }: Props) {
  const { isMultiColumn, isWide } = useResponsive();

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
  // Fine-pointer hover eases the CTA up a breath; press plants it back down.
  const { hovered: ctaHovered, bind: ctaBind } = useHover();
  const hov = useSharedValue(0);
  useEffect(() => {
    hov.value = withTiming(ctaHovered ? 1 : 0, { duration: 160 });
  }, [ctaHovered, hov]);
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -1.5 * hov.value }, { scale: 1 - press.value * 0.03 + hov.value * 0.008 }],
    shadowOpacity: 0.4 + press.value * 0.35 + hov.value * 0.2,
    shadowRadius: 14 + press.value * 10 + hov.value * 8,
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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.flex}>
        <GridBackground />
        <ScreenFlash />

        <View style={[styles.pageSplit, isMultiColumn && styles.pageSplitWide]}>
          {/* Left Visual Panel (Desktop) / Header (Mobile) */}
          <View style={[styles.visualPane, isMultiColumn && styles.visualPaneWide]}>
            <RotatingArtImage
              sources={[
                HERO,
                require('../../assets/art/coach-touchline.jpg'),
                require('../../assets/art/mirror-drill.jpg'),
              ]}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            <PhotoVeil
              width={isMultiColumn ? 700 : 430}
              height={isMultiColumn ? 900 : 260}
              warmAt={{ x: 300, y: 150, r: 400 }}
            />

            <Animated.View entering={FadeIn.duration(600).delay(120)} style={styles.visualContent}>
              <View style={styles.visualCrestWrap}>
                <LogoMark size={48} loopProps={loopProps} glowStyle={glowStyle} />
              </View>
              <Text style={styles.visualEyebrow}>SEASON ONE · 1,000 SEATS</Text>
              <Text style={styles.visualTitle}>PROSEASON ACADEMY</Text>
              <Text style={styles.visualSubtitle}>
                THE FOOTBALL COACHING & MATCH REVIEW PRACTICE FOR SERIOUS FC PLAYERS.
              </Text>

              {liveSeats && (
                <View style={styles.seatLiveRow}>
                  <View style={styles.seatLiveDot} />
                  <Text style={styles.seatLiveTxt}>
                    {liveSeats.taken.toLocaleString('en-US')} / {liveSeats.cap.toLocaleString('en-US')} SEATS CLAIMED
                  </Text>
                </View>
              )}

              {isMultiColumn && (
                <View style={styles.coachVisualCard}>
                  <CoachCard coach={COACHES[0]} width={280} />
                </View>
              )}
            </Animated.View>
          </View>

          {/* Right Form Panel */}
          <ScrollView
            style={styles.formPane}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <Animated.View entering={FadeInUp.duration(480).delay(80)} style={styles.authBox}>
              {mode === 'token' && academyToken ? (
                <View>
                  <Text style={styles.tokenTag}>ACADEMY REFERENCE TOKEN</Text>
                  <Text style={styles.tokenTitle}>YOUR SEAT IS LIVE</Text>
                  <Text style={styles.tokenHint}>
                    SAVE THIS. IT IS YOUR SEAT ID — SHOWN ONCE AT SIGN-UP. YOU SIGN IN WITH EMAIL +
                    PASSWORD; THIS TOKEN IS HOW THE FOUNDER FINDS YOU.
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
                  <Pressable
                    onPress={() => {
                      const o = optionForLabel(countryPick);
                      if (o) void verifyLocation({ country: o.label, countryCode: o.code });
                      onSignedIn?.();
                    }}
                    style={{ marginTop: 16 }}
                  >
                    <Animated.View style={[styles.cta, btnStyle]}>
                      <Text style={styles.ctaText}>I SAVED IT — ENTER THE ACADEMY ›</Text>
                    </Animated.View>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={styles.authEyebrow}>ACADEMY PORTAL</Text>
                  <Text style={styles.authTitle}>
                    {mode === 'register' ? 'CLAIM YOUR SEAT' : mode === 'login' ? 'SIGN IN' : 'RESET ACCESS'}
                  </Text>
                  <Text style={styles.authSub}>
                    {mode === 'register'
                      ? 'Create your member profile and lock in your coach.'
                      : mode === 'login'
                        ? 'Sign in to access your 6-month progress and match receipts.'
                        : 'Enter your registered email to receive reset instructions.'}
                  </Text>

                  {/* Mode switcher tabs */}
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
                          style={[styles.modeChip, on && styles.modeChipOn]}
                        >
                          <Text style={[styles.modeTxt, on && styles.modeTxtOn]}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {mode === 'register' && (
                    <>
                      <Text style={styles.geoTitle}>YOUR REGION / COUNTRY</Text>
                      <View style={styles.geoGrid}>
                        {COUNTRY_OPTIONS.map((o) => {
                          const on = countryPick === o.label;
                          return (
                            <Pressable key={o.label} onPress={() => pickCountry(o.label)} hitSlop={3}>
                              <View style={[styles.geoChip, on && styles.geoChipOn]}>
                                <Text style={[styles.geoChipTxt, on && styles.geoChipTxtOn]}>
                                  {o.label}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>

                      <View style={styles.form}>
                        <NeonInput
                          placeholder="USERNAME / HANDLE"
                          value={username}
                          onChangeText={setUsername}
                          autoCapitalize="characters"
                          maxLength={14}
                        />
                        <View style={styles.fieldGap} />
                        <NeonInput
                          placeholder="EMAIL ADDRESS"
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
                    </>
                  )}

                  {mode === 'login' && (
                    <View style={styles.form}>
                      <NeonInput
                        placeholder="EMAIL ADDRESS"
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
                    <View style={styles.form}>
                      <Text style={styles.resetHint}>
                        Enter the email associated with your seat. A reset link will be dispatched.
                      </Text>
                      <NeonInput
                        placeholder="EMAIL ADDRESS"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
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
                    style={{ marginTop: 18 }}
                    accessibilityRole="button"
                    {...ctaBind}
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
                      <LinearGradient
                        colors={['#39ff6a', '#7dff5c', '#c6ff3c']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                      {!loading && (
                        <View
                          pointerEvents="none"
                          {...({ className: 'psa-sheen' } as any)}
                          style={{ left: 0 }}
                        />
                      )}
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
                                ? 'ENTER USERNAME'
                                : !emailOk
                                  ? 'ENTER VALID EMAIL'
                                  : !passOk
                                    ? 'PASSWORD (8+ CHARACTERS)'
                                    : 'CREATE MY ACADEMY SEAT'
                            : mode === 'login'
                              ? 'SIGN IN'
                              : 'SEND RESET LINK'}
                      </Text>
                    </Animated.View>
                  </Pressable>

                  <Pressable
                    onPress={() => setInstallHelp(true)}
                    hitSlop={6}
                    style={styles.installLinkWrap}
                  >
                    <Text style={styles.installLink}>HOW TO INSTALL AS A WEB APP / PWA ›</Text>
                  </Pressable>
                </>
              )}

              <View style={styles.footerRow}>
                <Text style={styles.footer}>PROSEASON ACADEMY</Text>
                <Text style={styles.footer}>VERSION {APP_VERSION}</Text>
              </View>
            </Animated.View>
          </ScrollView>
        </View>

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

  pageSplit: {
    flex: 1,
    flexDirection: 'column',
  },
  pageSplitWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  visualPane: {
    position: 'relative',
    height: 280,
    backgroundColor: '#040805',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 24,
  },
  visualPaneWide: {
    flex: 1.1,
    height: '100%',
    justifyContent: 'center',
    padding: 48,
  },

  visualContent: {
    zIndex: 10,
  },
  visualCrestWrap: {
    marginBottom: 12,
  },
  visualEyebrow: {
    fontFamily: monoFont,
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 2.2,
    color: colors.accent,
  },
  visualTitle: {
    marginTop: 6,
    fontFamily: displayFont,
    fontSize: 36,
    letterSpacing: 1,
    color: colors.fg,
  },
  visualSubtitle: {
    marginTop: 8,
    fontFamily: bodyFont,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(238,242,236,0.85)',
    maxWidth: 420,
  },
  seatLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  seatLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  seatLiveTxt: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 1.8,
    color: colors.primary,
  },
  coachVisualCard: {
    marginTop: 24,
  },

  formPane: {
    flex: 1,
    backgroundColor: 'rgba(7, 12, 8, 0.96)',
  },
  formContent: {
    padding: 24,
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  authBox: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 22,
    backgroundColor: 'rgba(12, 20, 14, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 106, 0.16)',
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  authEyebrow: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2,
    color: colors.primary,
  },
  authTitle: {
    marginTop: 6,
    fontFamily: displayFont,
    fontSize: 28,
    letterSpacing: 1,
    color: colors.fg,
  },
  authSub: {
    marginTop: 6,
    fontFamily: bodyFont,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.muted,
    marginBottom: 16,
  },

  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  modeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(10,15,10,0.5)',
  },
  modeChipOn: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(57,255,106,0.12)',
  },
  modeTxt: {
    fontFamily: bodyFontHeavy,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: colors.muted,
  },
  modeTxtOn: { color: colors.primary },

  geoTitle: {
    fontFamily: bodyFontHeavy,
    fontSize: 10,
    letterSpacing: 1.8,
    color: colors.warm,
    marginBottom: 8,
  },
  geoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  geoChip: {
    borderWidth: 1,
    borderColor: 'rgba(143,184,155,0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(10,15,10,0.5)',
  },
  geoChipOn: { borderColor: colors.accent, backgroundColor: 'rgba(242,192,120,0.12)' },
  geoChipTxt: { fontFamily: bodyFontBold, fontSize: 9.5, letterSpacing: 1, color: colors.muted },
  geoChipTxtOn: { color: colors.accent },

  form: {
    gap: 12,
  },
  fieldGap: { height: 2 },
  resetHint: {
    fontFamily: bodyFont,
    fontSize: 12,
    color: colors.muted,
    marginBottom: 8,
  },

  doorError: {
    marginTop: 12,
    fontFamily: bodyFontStrong,
    fontSize: 12,
    color: colors.loss,
    textAlign: 'center',
  },
  infoNote: {
    marginTop: 12,
    fontFamily: bodyFontStrong,
    fontSize: 12,
    color: colors.primary,
    textAlign: 'center',
  },

  cta: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.35)',
  },
  ctaBusy: { opacity: 0.75 },
  ctaOff: { opacity: 0.4 },
  ctaText: {
    fontFamily: bodyFontHeavy,
    fontSize: 13,
    letterSpacing: 2,
    color: '#07130b',
  },

  installLinkWrap: { marginTop: 16, alignSelf: 'center' },
  installLink: {
    fontFamily: bodyFontBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.accent,
  },

  tokenTag: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2,
    color: colors.primary,
  },
  tokenTitle: {
    marginTop: 6,
    fontFamily: displayFont,
    fontSize: 26,
    color: colors.fg,
  },
  tokenHint: {
    marginTop: 8,
    fontFamily: bodyFont,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
  tokenBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(242,192,120,0.08)',
  },
  tokenValue: {
    fontFamily: monoFont,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2.5,
    color: colors.accent,
    textAlign: 'center',
  },
  tokenFine: {
    marginTop: 10,
    fontFamily: bodyFont,
    fontSize: 10.5,
    color: 'rgba(143,184,155,0.7)',
    textAlign: 'center',
  },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(57,255,106,0.1)',
  },
  footer: {
    fontFamily: monoFont,
    fontSize: 8,
    letterSpacing: 2,
    color: 'rgba(143,184,155,0.45)',
  },
});
