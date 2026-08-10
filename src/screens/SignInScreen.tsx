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
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import GridBackground from '../components/GridBackground';
import ScreenFlash from '../components/ScreenFlash';
import InfinityCrest from '../components/InfinityCrest';
import NeonInput from '../components/NeonInput';
import RotatingArtImage from '../components/RotatingArtImage';
import { useAuth } from '../hooks/useAuth';
import SideloadAssistant from './SideloadAssistant';
import { colors, monoFont, displayFont, bodyFont, bodyFontStrong, bodyFontBold, bodyFontHeavy } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useHover } from '../hooks/useHover';

// Coach Obinna — the face of the arena panel, anchored to the panel floor.
const OBINNA = require('../../assets/coaches/obinna-card.png');

// Academy art plates — rotated through the atmospheric backdrop slideshow.
const SLIDESHOW_PLATES = [
  require('../../assets/art/home-pitch.png'),
  require('../../assets/art/coach-touchline.jpg'),
  require('../../assets/art/journey-tunnel.jpg'),
  require('../../assets/art/locker-room.jpg'),
  require('../../assets/art/vault-match.jpg'),
  require('../../assets/art/pitch-bg.png'),
];
import { getSettings, setCountry, setDisplayName } from '../data/settings';
import { COUNTRY_OPTIONS, optionForLabel, verifyLocation } from '../data/location';
import * as backend from '../data/backend';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

type Mode = 'register' | 'login' | 'reset' | 'token';

type Props = {
  onSignedIn?: () => void;
};

// The arena line — typed out one character at a time, held, then repeated.
const ARENA_LINE = 'ENTER THE ARENA.';
const TYPE_MS = 85; // per-character typing speed
const HOLD_MS = 5000; // hold the full line for five seconds before restarting

/**
 * The simple dark-green esports stage behind Obinna — solid deep green,
 * a faint HUD grid and one glow pool where the coach stands. No photography.
 */
function ArenaBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={arenaStyles.solid} />
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Pattern id="signInArenaGrid" width="44" height="44" patternUnits="userSpaceOnUse">
            <Path d="M 44 0 L 0 0 0 44" fill="none" stroke="rgba(57,255,106,0.05)" strokeWidth="1" />
          </Pattern>
          <RadialGradient id="signInArenaGlow" cx="50%" cy="92%" r="68%">
            <Stop offset="0%" stopColor="rgba(57,255,106,0.20)" stopOpacity={1} />
            <Stop offset="55%" stopColor="rgba(57,255,106,0.07)" stopOpacity={1} />
            <Stop offset="100%" stopColor="rgba(57,255,106,0)" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#signInArenaGrid)" />
        <Rect width="100%" height="100%" fill="url(#signInArenaGlow)" />
      </Svg>
      {/* the floor line Obinna stands on */}
      <View style={arenaStyles.floor} />
    </View>
  );
}

const arenaStyles = StyleSheet.create({
  solid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#04120c',
  },
  floor: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    bottom: 0,
    height: 2,
    backgroundColor: 'rgba(57,255,106,0.28)',
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});

export default function SignInScreen({ onSignedIn }: Props) {
  const { isLaptopUp, isPhoneColumn, w, h } = useResponsive();
  // Keep tablets and narrow/short browser windows stacked. The full arena split
  // only appears when both columns have enough room to breathe.
  const splitLayout = isLaptopUp && w >= 1080 && h >= 700;
  const compactHeight = h < 650;

  // Calculate explicit dimensions for the slideshow (desktop only)
  // visualPane has flex: 1.1, formPane has flex: 0.9, total = 2.0
  // So visualPane width = 1.1 / 2.0 = 55% of window width
  const slideshowWidth = splitLayout ? Math.floor(w * 0.55) : 0;
  const slideshowHeight = splitLayout ? h : 0;

  const [mode, setMode] = useState<Mode>('register');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [countryPick, setCountryPick] = useState<string | null>(getSettings().country);
  const [seasonFull, setSeasonFull] = useState<backend.SeasonGate | null>(null);
  const [academyToken, setAcademyToken] = useState<string | null>(null);
  const [tokenRevealed, setTokenRevealed] = useState(false);
  const [installHelp, setInstallHelp] = useState(false);

  const { loading, register, login, requestReset } = useAuth();

  // ── THE ARENA LINE — types on one character at a time, holds the full
  // line for five seconds, then starts again. Plain timers; nothing to sync.
  const [typedCount, setTypedCount] = useState(0);
  useEffect(() => {
    let alive = true;
    let count = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      if (!alive) return;
      setTypedCount(count);
      if (count < ARENA_LINE.length) {
        count += 1;
        timer = setTimeout(tick, TYPE_MS);
      } else {
        // full line typed — hold, then restart from an empty stage
        count = 0;
        timer = setTimeout(tick, HOLD_MS);
      }
    };
    tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // the blinking block caret that follows the typed characters
  const caretPulse = useSharedValue(1);
  useEffect(() => {
    caretPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) }),
      ),
      -1,
    );
    return () => {
      cancelAnimation(caretPulse);
    };
  }, [caretPulse]);
  const caretStyle = useAnimatedStyle(() => ({ opacity: caretPulse.value }));

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

  const jumpTo = (next: Exclude<Mode, 'token'>) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.flex}>
        <GridBackground />
        <ScreenFlash />

        {/* ── PUBLIC NAV — lives only on this door. Once the player has left
            the sign-up screen this bar is gone with it. ── */}
        <View
          style={[styles.navWrap, Platform.OS === 'web' && (styles.navWrapWeb as any)]}
          pointerEvents="box-none"
        >
          <View style={styles.navBar}>
            {/* the brand is the mark alone — bold, animated, top-left */}
            <Pressable
              onPress={() => jumpTo('register')}
              style={({ pressed }) => [styles.navBrand, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel="ProSeason Academy"
            >
              <View style={styles.navCrestGlow}>
                <InfinityCrest size={56} bold />
              </View>
            </Pressable>

            <View style={styles.navRight}>
              <Pressable
                onPress={() => (mode === 'login' ? jumpTo('register') : jumpTo('login'))}
                style={({ pressed }) => [styles.navCta, pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={['#39ff6a', '#7dff5c', '#c6ff3c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.navCtaTxt}>{mode === 'login' ? 'CREATE SEAT ›' : 'SIGN IN ›'}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[styles.pageSplit, splitLayout && styles.pageSplitWide]}>
          {/* Left arena panel (desktop) / header (mobile) — atmospheric
              slideshow on desktop, Obinna's esports stage on mobile.
              The panel always fills its full height. */}
          <View
            style={[
              styles.visualPane,
              !isPhoneColumn && !splitLayout && styles.visualPaneTablet,
              compactHeight && !splitLayout && styles.visualPaneCompact,
              splitLayout && styles.visualPaneWide,
            ]}
          >
            <ArenaBackdrop />

                {/* esports HUD corner brackets */}
                <View pointerEvents="none" style={styles.hudCorners}>
                  <View style={[styles.hudCorner, styles.hudTL]} />
                  <View style={[styles.hudCorner, styles.hudTR]} />
                  <View style={[styles.hudCorner, styles.hudBL]} />
                  <View style={[styles.hudCorner, styles.hudBR]} />
                </View>

                {/* Coach Obinna — anchored to the floor of the panel */}
                <Image
                  source={OBINNA}
                  resizeMode="contain"
                  style={[styles.obinna, styles.obinnaStacked]}
                />
              </>
            )}

            <Animated.View
              entering={FadeIn.duration(600).delay(120)}
              style={[styles.visualContent, splitLayout && styles.visualContentWide]}
            >
              {/* the arena line — typed character by character, held 5s, looped.
                  The invisible full line reserves the space so the layout
                  never jumps while the text types on. */}
              <View style={styles.titleWrap}>
                <Text
                  style={[styles.visualTitle, splitLayout && styles.visualTitleWide, styles.titleGhost]}
                >
                  {ARENA_LINE}
                </Text>
                <View style={styles.titleRow}>
                  <Text style={[styles.visualTitle, splitLayout && styles.visualTitleWide]}>
                    {ARENA_LINE.slice(0, typedCount)}
                  </Text>
                  <Animated.View style={[styles.caret, splitLayout && styles.caretWide, caretStyle]} />
                </View>
              </View>
            </Animated.View>
          </View>

          {/* Right Form Panel — open desktop canvas, never a nested mobile card. */}
          <View
            pointerEvents="none"
            style={[
              styles.formPitchDecor,
              splitLayout ? styles.formPitchDecorWide : styles.formPitchDecorStacked,
            ]}
          >
            <View style={styles.pitchHalfway} />
            <View style={styles.pitchCircle} />
            <View style={styles.pitchBox} />
            <View style={styles.formGlow} />
          </View>
          <ScrollView
            style={styles.formPane}
            contentContainerStyle={[
              styles.formContent,
              isPhoneColumn && styles.formContentPhone,
              !isPhoneColumn && !splitLayout && styles.formContentTablet,
              splitLayout && styles.formContentWide,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <Animated.View
              entering={FadeInUp.duration(480).delay(80)}
              style={[
                styles.authBox,
                !isPhoneColumn && !splitLayout && styles.authBoxTablet,
                splitLayout && styles.authBoxWide,
              ]}
            >
              <View style={styles.accessStrip}>
                <View style={styles.accessStripLead}>
                  <View style={styles.accessPulse} />
                  <Text style={styles.accessStripText}>MATCHDAY ACCESS</Text>
                </View>
                <Text style={styles.accessStripMeta}>SECURE PLAYER GATE · 01</Text>
              </View>
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
                  <Text style={styles.authEyebrow}>ACADEMY PORTAL · ACCESS GATE 01</Text>
                  <Text style={styles.authTitle}>
                    {mode === 'register' ? 'CLAIM YOUR SEAT' : mode === 'login' ? 'SIGN IN' : 'RESET ACCESS'}
                  </Text>
                  <Text style={styles.authSub}>
                    {mode === 'register'
                      ? 'Create your member profile and lock in your coach. The seat is yours when the baseline is sealed.'
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
                          onPress={() => jumpTo(id)}
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
                            <Pressable
                              key={o.label}
                              onPress={() => pickCountry(o.label)}
                              hitSlop={3}
                              style={[styles.geoOption, splitLayout && styles.geoOptionWide]}
                            >
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

  // ── public nav — this door only ──
  navWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(57, 255, 106, 0.16)',
    backgroundColor: 'rgba(3, 7, 4, 0.72)',
  },
  navWrapWeb: {
    backdropFilter: 'blur(16px) saturate(1.2)',
  } as any,
  navBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  navBrand: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  navCrestGlow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navCta: {
    height: 36,
    minWidth: 104,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  navCtaTxt: { fontFamily: bodyFontHeavy, fontSize: 10.5, letterSpacing: 1.6, color: '#07130b' },

  pageSplit: {
    flex: 1,
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  pageSplitWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  visualPane: {
    position: 'relative',
    backgroundColor: '#04120c',
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 78,
    paddingBottom: 0,
    height: 320,
  },
  visualPaneTablet: {
    height: 400,
    paddingHorizontal: 40,
  },
  visualPaneCompact: {
    height: 250,
    paddingTop: 70,
  },
  // The panel stretches to the full available height — the slideshow fills
  // every pixel so no strip of page background ever shows beneath it.
  visualPaneWide: {
    flex: 1.1,
    alignSelf: 'stretch',
    height: '100%',
    minWidth: 480,
    paddingHorizontal: 0,
    paddingTop: 0,
  },

  // esports HUD frame
  hudCorners: {
    position: 'absolute',
    top: 76,
    left: 14,
    right: 14,
    bottom: 14,
  },
  hudCornersWide: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 24,
    bottom: 24,
    zIndex: 5,
  },
  hudCorner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: 'rgba(57,255,106,0.55)',
  },
  hudTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  hudTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  hudBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  hudBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },

  visualContent: {
    zIndex: 10,
  },
  visualContentWide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 56,
    zIndex: 12,
  },

  // ── the arena line (typewriter) ──
  titleWrap: {
    position: 'relative',
    maxWidth: 560,
  },
  // invisible copy of the full line — reserves the final space up front
  titleGhost: {
    opacity: 0,
  },
  titleRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  visualTitle: {
    fontFamily: displayFont,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 1,
    color: colors.fg,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  visualTitleWide: {
    fontSize: 52,
    lineHeight: 58,
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowRadius: 20,
  },
  caret: {
    width: 5,
    height: 28,
    marginLeft: 5,
    borderRadius: 1,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  caretWide: {
    width: 6,
    height: 46,
  },

  // ── Obinna — anchored to the floor of the panel ──
  obinna: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    zIndex: 1,
  },
  obinnaWide: {
    height: '86%',
    aspectRatio: 896 / 1200,
  },
  obinnaStacked: {
    height: '92%',
    aspectRatio: 896 / 1200,
  },

  formPitchDecor: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: '#071009',
  },
  formPitchDecorWide: { top: 0, width: '45%' },
  formPitchDecorStacked: { height: '68%', left: 0 },
  pitchHalfway: {
    position: 'absolute',
    top: '49.8%',
    left: '8%',
    right: '8%',
    height: 1,
    backgroundColor: 'rgba(57,255,106,0.055)',
  },
  pitchCircle: {
    position: 'absolute',
    top: '38%',
    left: '39%',
    width: '22%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.065)',
  },
  pitchBox: {
    position: 'absolute',
    right: '-8%',
    top: '25%',
    width: '34%',
    height: '50%',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.055)',
  },
  formGlow: {
    position: 'absolute',
    width: 440,
    height: 440,
    borderRadius: 220,
    right: -180,
    top: -150,
    backgroundColor: 'rgba(57,255,106,0.035)',
  },
  formPane: {
    flex: 0.9,
    backgroundColor: 'rgba(7, 12, 8, 0.90)',
  },
  formContent: {
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContentPhone: {
    paddingHorizontal: 18,
    paddingTop: 26,
    paddingBottom: 34,
  },
  formContentTablet: {
    paddingHorizontal: 40,
    paddingTop: 44,
    paddingBottom: 52,
  },
  // desktop: the registration form hangs from the top of the canvas,
  // clearing the nav — no longer centred vertically in the pane
  formContentWide: {
    justifyContent: 'flex-start',
    paddingHorizontal: 44,
    paddingTop: 96,
    paddingBottom: 48,
  },

  authBox: {
    width: '100%',
    maxWidth: 520,
    paddingVertical: 20,
  },
  authBoxTablet: { maxWidth: 680 },
  authBoxWide: { maxWidth: 580 },
  accessStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 11,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(57,255,106,0.18)',
  },
  accessStripLead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  accessPulse: {
    width: 7,
    height: 7,
    borderRadius: 2,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 7,
  },
  accessStripText: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.8,
    color: colors.primary,
  },
  accessStripMeta: {
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: 'rgba(143,184,155,0.62)',
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
    gap: 7,
    marginBottom: 18,
  },
  geoOption: { maxWidth: '100%' },
  geoOptionWide: { width: '48.9%' },
  geoChip: {
    minHeight: 34,
    justifyContent: 'center',
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
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
