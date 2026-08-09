import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Linking } from 'react-native';
import Constants from 'expo-constants';
import Animated, { FadeIn, FadeInUp, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import GridBackground from '../../components/GridBackground';
import ArtBand from '../../components/ArtBand';
import { colors, monoFont, displayFont, bodyFont, bodyFontBold, bodyFontHeavy } from '../../theme';

const LOCKERS = require('../../../assets/art/locker-room.jpg');
import { wipeProgress } from '../../data/progress';
import { wipeThread } from '../../data/lessonThread';
import { wipeMirror } from '../../data/mirrorSession';
import * as backend from '../../data/backend';
import { wipeSession } from '../../data/session';
import { resetOnboarding } from '../../data/onboarding';
import OnboardingScreen from '../OnboardingScreen';
import { sfx, syncMusicToSettings } from '../../audio/sound';
import FounderDesk from '../FounderDesk';
import { isFounder, signInWithEmail } from '../../data/founderAuth';
import { deleteAccountRemote, requestPasswordReset, readCachedAcademyToken } from '../../data/authApi';
import { checkForUpdate, UpdateInfo } from '../../data/updateChecker';
import ContactSheet from '../ContactSheet';
import { PLATFORMS, setDisplayName, setPlatform, useSettings, wipeLocalData, setToggle, ToggleKey } from '../../data/settings';
import {
  BellIcon,
  BroadcastIcon,
  CheckIcon,
  ChevronRightIcon,
  GamepadIcon,
  HelpIcon,
  LogoutIcon,
  PersonIcon,
  TrashIcon,
  WavesGlyphIcon,
} from '../../components/Icons';
import { useResponsive } from '../../hooks/useResponsive';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

type SheetKind = 'edit' | 'platform' | 'password' | 'help' | 'logout' | 'delete' | 'admin' | null;

const FOUNDER_TAPS = 5;

function Toggle({ on, onFlip }: { on: boolean; onFlip: () => void }) {
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: withTiming(on ? 17 : 1, { duration: 180 }) }] }));
  return (
    <Pressable
      onPress={onFlip}
      hitSlop={8}
      style={[
        styles.toggleTrack,
        {
          borderColor: on ? colors.primary : colors.border,
          backgroundColor: on ? 'rgba(57,255,106,0.14)' : '#0c130e',
        },
      ]}
    >
      <Animated.View
        style={[
          styles.toggleKnob,
          { backgroundColor: on ? colors.primary : '#4a6353' },
          on && styles.toggleKnobGlow,
          style,
        ]}
      />
    </Pressable>
  );
}

function Row({
  icon,
  title,
  sub,
  right,
  onPress,
  danger,
  last,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        !last && styles.rowDivider,
        pressed && onPress && { backgroundColor: 'rgba(57,255,106,0.04)' },
      ]}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, danger && { color: '#e8a5a2' }]}>{title}</Text>
        {!!sub && (
          <Text style={[styles.rowSub, danger && { color: 'rgba(224,96,92,0.55)' }]}>{sub}</Text>
        )}
      </View>
      {right}
    </Pressable>
  );
}

const Chevron = () => <ChevronRightIcon size={13} color={colors.muted} />;

export default function SettingsTab({ onSignOut }: { onSignOut: () => void }) {
  const s = useSettings();
  const { isMultiColumn, isWide } = useResponsive();
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [tourOpen, setTourOpen] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);

  const [taps, setTaps] = useState(0);
  const [founderEmail, setFounderEmail] = useState('');
  const [founderPassword, setFounderPassword] = useState('');
  const [keyChecking, setKeyChecking] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [founderKey, setFounderKey] = useState<string | null>(null);
  const [founderAllowed, setFounderAllowed] = useState(false);
  const [deskOpen, setDeskOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [unreadAcademy, setUnreadAcademy] = useState(0);
  const [academyToken, setAcademyToken] = useState<string | null>(null);
  const [resetNote, setResetNote] = useState<string | null>(null);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    void backend.unreadFromAcademy().then(setUnreadAcademy);
  }, [contactOpen]);

  useEffect(() => {
    void readCachedAcademyToken().then(setAcademyToken);
    void checkForUpdate().then(setUpdate);
  }, []);

  useEffect(() => {
    void isFounder().then((ok) => {
      setFounderAllowed(ok);
      if (ok) setFounderKey('authenticated-founder');
    });
  }, []);

  const tapVersion = () => {
    const n = taps + 1;
    if (n >= FOUNDER_TAPS) {
      setTaps(0);
      if (founderAllowed) setDeskOpen(true);
      else {
        setFounderEmail('');
        setFounderPassword('');
        setKeyError(null);
        setSheet('admin');
      }
      return;
    }
    setTaps(n);
  };

  const submitFounderLogin = async () => {
    if (!founderEmail.trim() || !founderPassword || keyChecking) return;
    setKeyChecking(true);
    setKeyError(null);
    const profile = await signInWithEmail(founderEmail, founderPassword);
    setKeyChecking(false);
    if (!profile) {
      setKeyError('FOUNDER ACCOUNT NOT VERIFIED.');
      return;
    }
    setFounderAllowed(true);
    setFounderKey('authenticated-founder');
    setFounderPassword('');
    setSheet(null);
    setDeskOpen(true);
  };

  const forgetFounderKey = () => {
    setFounderAllowed(false);
    setFounderKey(null);
    setDeskOpen(false);
  };

  const open = (k: Exclude<SheetKind, null>) => {
    if (k === 'edit') setNameDraft(s.displayName);
    if (k === 'delete') setDeleteArmed(false);
    setSheet(k);
  };
  const close = () => setSheet(null);

  const flip = (key: ToggleKey) => {
    const next = !s.toggles[key];
    sfx('toggle');
    setToggle(key, next);
    if (key === 'music') syncMusicToSettings();
  };

  return (
    <View style={styles.flex}>
      <GridBackground />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View entering={FadeInUp.duration(320)}>
          <ArtBand
            source={[LOCKERS, require('../../../assets/art/community-huddle.jpg'), require('../../../assets/art/seats-till.jpg')]}
            width={1380}
            height={110}
            style={styles.setBand}
            warmAt={{ x: 600, y: 30, r: 600 }}
          >
            <Text style={styles.title}>SETTINGS & ACCOUNT</Text>
            <Text style={styles.subtitle}>YOUR PROFILE · YOUR PLATFORM · YOUR SOUND & SECURITY</Text>
          </ArtBand>
        </Animated.View>

        {update?.available && (
          <Animated.View entering={FadeInUp.delay(40).duration(300)}>
            <Pressable
              style={({ pressed }) => [styles.updateBanner, pressed && { opacity: 0.75 }]}
              onPress={() => {
                if (update.apkUrl) Linking.openURL(update.apkUrl).catch(() => {});
              }}
            >
              <Text style={styles.updateBadgeTxt}>NEW</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.updateTitle}>VERSION {update.latest} AVAILABLE</Text>
                <Text style={styles.updateSub}>YOU'RE ON {update.current}. TAP TO DOWNLOAD.</Text>
              </View>
              <ChevronRightIcon size={14} color={colors.accent} />
            </Pressable>
          </Animated.View>
        )}

        {/* 2-Column Dashboard Grid */}
        <View style={[styles.dashboardGrid, isMultiColumn && styles.dashboardGridWide]}>
          {/* Left Column (Profile & Sound & Manifesto) */}
          <View style={[styles.gridCol, isMultiColumn && styles.gridColWide]}>
            {/* Profile Card */}
            <View style={styles.card}>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <PersonIcon size={28} color={colors.primary} />
                </View>
                <View style={styles.profileText}>
                  <Text style={styles.profileName}>{s.displayName || 'PLAYER'}</Text>
                  <Text style={styles.profileId}>ACADEMY ID · {s.academyId}</Text>
                  <Text style={styles.profileMeta}>PLATFORM · {s.platform}</Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.editBtn,
                  pressed && { backgroundColor: 'rgba(57,255,106,0.08)' },
                ]}
                onPress={() => open('edit')}
              >
                <Text style={styles.editBtnTxt}>EDIT PROFILE NAME</Text>
                <ChevronRightIcon size={12} color="#7ed793" />
              </Pressable>
            </View>

            {/* Sound Controls */}
            <Text style={styles.sectionLabel}>AUDIO & FEEDBACK</Text>
            <View style={styles.card}>
              <Row
                icon={<WavesGlyphIcon size={16} color="#57d07c" />}
                title="Academy ambience"
                sub="THE QUIET PAD UNDER THE APP"
                right={<Toggle on={s.toggles.music} onFlip={() => flip('music')} />}
              />
              <Row
                icon={<BroadcastIcon size={16} color="#57d07c" />}
                title="Sound effects"
                sub="TAPS, WHISTLES AND FEEDBACK"
                right={<Toggle on={s.toggles.soundFx} onFlip={() => flip('soundFx')} />}
                last
              />
            </View>

            {/* Academy Manifesto */}
            <Text style={styles.sectionLabel}>THE ACADEMY MANIFESTO</Text>
            <View style={[styles.card, styles.manifestoCard]}>
              <Text style={styles.manifestoHead}>
                THE HARD WAY IS THE EASY WAY · TECH IS MEANT TO ELEVATE
              </Text>
              <Text style={styles.manifestoBody}>
                1. RECORD & WATCH: Record your console match as usual before kick-off, play your match, then watch your tape back.{'\n\n'}
                2. PEN TO PAPER: There is a special connection a biro has to a book that cannot be typed. Pen down the key moments on paper first.{'\n\n'}
                3. 30-MINUTE COOL-DOWN: Let your mind settle for 30 minutes after full time before reflecting.{'\n\n'}
                4. LOG TO DATABASE: Once your head has cooled, open the app and type your penned truth into your database.{'\n\n'}
                In a world looking for the easy way out, the hard way is the easy way.
              </Text>
            </View>
          </View>

          {/* Right Column (Platform, Help, Security, Danger Zone) */}
          <View style={[styles.gridCol, isMultiColumn && styles.gridColWide]}>
            {/* Platform Setup */}
            <Text style={styles.sectionLabel}>YOUR SETUP</Text>
            <View style={styles.card}>
              <Row
                icon={<GamepadIcon size={16} color="#57d07c" />}
                title="Console Platform"
                sub="WHICH SYSTEM YOU PLAY ON"
                right={
                  <View style={styles.valueRow}>
                    <Text style={styles.valueTxt}>{s.platform}</Text>
                    <Chevron />
                  </View>
                }
                onPress={() => open('platform')}
                last
              />
            </View>

            {/* Help & Support */}
            <Text style={styles.sectionLabel}>HELP & SUPPORT</Text>
            <View style={styles.card}>
              <Row
                icon={<HelpIcon size={16} color="#57d07c" />}
                title="Help & FAQs"
                sub="WHAT THIS APP DOES · HOW TO START"
                right={<Chevron />}
                onPress={() => open('help')}
              />
              <Row
                icon={<BellIcon size={16} color="#f2c078" />}
                title="Message the founder"
                sub={
                  unreadAcademy > 0
                    ? 'YOU HAVE A MESSAGE FROM THE ACADEMY'
                    : 'DM ME DIRECTLY — QUESTIONS, IDEAS, CRITIQUE'
                }
                right={
                  unreadAcademy > 0 ? (
                    <View style={styles.unreadDot}>
                      <Text style={styles.unreadTxt}>{unreadAcademy}</Text>
                    </View>
                  ) : (
                    <Chevron />
                  )
                }
                onPress={() => {
                  setContactOpen(true);
                  void backend.markAcademyRead();
                }}
              />
              <Row
                icon={<PersonIcon size={16} color="#57d07c" />}
                title="Password & security"
                sub="PASSWORD AND SEAT TOKEN"
                right={<Chevron />}
                onPress={() => open('password')}
                last
              />
            </View>

            {/* Account & Danger Zone */}
            <Text style={[styles.sectionLabel, { color: 'rgba(224,96,92,0.85)' }]}>
              ACCOUNT & SESSION
            </Text>
            <View style={[styles.card, styles.dangerCard]}>
              <Row
                icon={<LogoutIcon size={16} color={colors.loss} />}
                title="Log out"
                sub="YOUR PROGRESS WAITS IN THE DATABASE"
                right={<ChevronRightIcon size={14} color="rgba(224,96,92,0.7)" />}
                onPress={() => open('logout')}
                danger
              />
              <Row
                icon={<TrashIcon size={16} color={colors.loss} />}
                title="Delete account"
                sub="MATCH HISTORY, NOTES AND XP GO WITH IT — NO UNDO"
                right={<ChevronRightIcon size={14} color="rgba(224,96,92,0.7)" />}
                onPress={() => open('delete')}
                danger
                last
              />
            </View>
          </View>
        </View>

        <Pressable onPress={tapVersion} hitSlop={10} style={{ alignSelf: 'center', marginTop: 24 }}>
          <Text style={styles.footVersion}>
            PROSEASONACADEMY · WEB APP VERSION {APP_VERSION}
            {founderKey ? ' · ★ FOUNDER VERIFIED' : ''}
          </Text>
        </Pressable>
        <Text style={styles.footNote}>
          MADE FOR THE PLAYERS WHO STAY AFTER FULL-TIME · PROSEASON ACADEMY
        </Text>
      </ScrollView>

      {/* Centered Desktop Modals */}
      {sheet && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          </Animated.View>
          <View style={styles.sheetDialog}>
            {sheet === 'edit' && (
              <View>
                <Text style={styles.sheetEyebrow}>EDIT PROFILE</Text>
                <Text style={styles.sheetTitle}>CALL YOURSELF SOMETHING</Text>
                <Text style={styles.sheetBody}>
                  Letters, numbers and underscores — 12 characters max. This is the handle your coach calls out in the film room.
                </Text>
                <TextInput
                  value={nameDraft}
                  onChangeText={(t) => setNameDraft(t.toUpperCase())}
                  style={styles.nameInput}
                  placeholder="PLAYER"
                  placeholderTextColor="#3d5445"
                  autoCapitalize="characters"
                  maxLength={12}
                />
                <SheetButton
                  label="SAVE NAME"
                  onPress={() => {
                    setDisplayName(nameDraft);
                    close();
                  }}
                />
              </View>
            )}

            {sheet === 'platform' && (
              <View>
                <Text style={styles.sheetEyebrow}>CONSOLE PLATFORM</Text>
                <Text style={styles.sheetTitle}>WHICH SYSTEM DO YOU PLAY ON?</Text>
                {PLATFORMS.map((p) => (
                  <OptionRow
                    key={p}
                    label={p}
                    active={s.platform === p}
                    onPress={() => setPlatform(p)}
                  />
                ))}
                <SheetButton label="DONE" onPress={close} ghost />
              </View>
            )}

            {sheet === 'password' && (
              <View>
                <Text style={styles.sheetEyebrow}>SECURITY</Text>
                <Text style={styles.sheetTitle}>PASSWORD & SEAT REFERENCE</Text>
                <Text style={styles.sheetBody}>
                  You sign in with email + password. Your unique academy seat token is:
                </Text>
                <View style={styles.tokenBox}>
                  <Text style={styles.tokenVal}>{academyToken ?? s.academyId}</Text>
                </View>
                <Text style={styles.sheetBody}>EMAIL ON FILE: {s.email ?? '—'}</Text>
                {resetNote && <Text style={[styles.sheetBody, { color: colors.primary }]}>{resetNote}</Text>}
                <SheetButton
                  label="SEND PASSWORD RESET EMAIL"
                  onPress={async () => {
                    if (!s.email) {
                      setResetNote('NO EMAIL RECORDED — SIGN IN AGAIN.');
                      return;
                    }
                    const r = await requestPasswordReset(s.email);
                    setResetNote(r.message);
                  }}
                />
                <SheetButton label="DONE" onPress={close} ghost />
              </View>
            )}

            {sheet === 'help' && (
              <View>
                <Text style={styles.sheetEyebrow}>HELP & SUPPORT</Text>
                <Text style={styles.sheetTitle}>WHAT DO YOU NEED?</Text>
                <FaqRow
                  q="WHAT IS THIS WEB APP?"
                  a="AN ELITE CONSOLE MATCH REVIEW PLATFORM FOR FC 26/27. YOU PLAY REAL MATCHES, INGEST RECEIPTS, DISCOVER YOUR TRUE IDENTITY AND CARRY LESSONS FORWARD."
                />
                <FaqRow
                  q="WHAT DO I DO ON TODAY?"
                  a="LOOK FOR TODAY'S 6-MONTH PRACTICE MISSION. COMPLETE YOUR MATCH, COOL DOWN, AND SEAL THE DAY."
                />
                <FaqRow
                  q="WHAT ARE THE SIX MONTHS?"
                  a="YOUR 180-DAY PROGRESS TRACKER. ONE DAY UNLOCKS AT A TIME (EVERY 24 HOURS). YOU CAN PAUSE ANY TIME LIFE HAPPENS."
                />
                <FaqRow
                  q="HOW DO I TALK TO PLAYERS & THE FOUNDER?"
                  a="OPEN THE CLUBHOUSE IN THE TOP NAV — CHAT IN #GENERAL, OR MESSAGE PLAYERS AND THE FOUNDER PRIVATELY."
                />
                <SheetButton
                  label="TOUR THE ACADEMY"
                  onPress={() => {
                    close();
                    setTourOpen(true);
                  }}
                />
                <SheetButton
                  label="MESSAGE THE FOUNDER"
                  onPress={() => {
                    close();
                    setContactOpen(true);
                  }}
                />
              </View>
            )}

            {sheet === 'logout' && (
              <View>
                <Text style={[styles.sheetEyebrow, { color: colors.loss }]}>LOG OUT</Text>
                <Text style={styles.sheetTitle}>LEAVING THE ACADEMY?</Text>
                <Text style={styles.sheetBody}>
                  Your progress and receipts remain safe in the database. You can sign back in anytime with your email and password.
                </Text>
                <SheetButton label="STAY SIGNED IN" onPress={close} />
                <SheetButton label="LOG OUT" onPress={onSignOut} danger />
              </View>
            )}

            {sheet === 'delete' && (
              <View>
                <Text style={[styles.sheetEyebrow, { color: colors.loss }]}>DELETE ACCOUNT</Text>
                <Text style={styles.sheetTitle}>PERMANENT ACCOUNT DELETION</Text>
                <Text style={styles.sheetBody}>
                  This permanently removes your match receipts, loss journal, checkpoints, and seat reservation.
                </Text>
                <SheetButton label="KEEP MY ACCOUNT" onPress={close} />
                <SheetButton
                  label={deleteArmed ? 'CONFIRM — PERMANENTLY DELETE' : 'DELETE EVERYTHING'}
                  danger
                  onPress={async () => {
                    if (!deleteArmed) {
                      setDeleteArmed(true);
                      return;
                    }
                    await deleteAccountRemote();
                    await wipeLocalData();
                    await wipeProgress();
                    await wipeThread();
                    await wipeMirror();
                    await resetOnboarding();
                    await wipeSession();
                    backend.cloudReset();
                    onSignOut();
                  }}
                />
              </View>
            )}

            {sheet === 'admin' && (
              <View>
                <Text style={[styles.sheetEyebrow, { color: colors.accent }]}>FOUNDER ACCESS</Text>
                <Text style={styles.sheetTitle}>SIGN IN AS FOUNDER</Text>
                <TextInput
                  value={founderEmail}
                  onChangeText={setFounderEmail}
                  placeholder="EMAIL"
                  placeholderTextColor="rgba(143,184,155,0.35)"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.nameInput}
                />
                <TextInput
                  value={founderPassword}
                  onChangeText={setFounderPassword}
                  placeholder="PASSWORD"
                  placeholderTextColor="rgba(143,184,155,0.35)"
                  secureTextEntry
                  style={styles.nameInput}
                />
                {keyError && <Text style={styles.keyError}>{keyError}</Text>}
                <SheetButton
                  label={keyChecking ? 'CHECKING…' : 'OPEN FOUNDER DESK'}
                  onPress={submitFounderLogin}
                />
                <SheetButton label="NOT NOW" onPress={close} ghost />
              </View>
            )}
          </View>
        </View>
      )}

      {deskOpen && founderKey && (
        <View style={StyleSheet.absoluteFill}>
          <FounderDesk
            founderKey={founderKey}
            onForgetKey={forgetFounderKey}
            onClose={() => setDeskOpen(false)}
          />
        </View>
      )}

      {contactOpen && (
        <View style={StyleSheet.absoluteFill}>
          <ContactSheet onClose={() => setContactOpen(false)} />
        </View>
      )}

      {tourOpen && (
        <View style={StyleSheet.absoluteFill}>
          <OnboardingScreen onDone={() => setTourOpen(false)} />
        </View>
      )}
    </View>
  );
}

function SheetButton({
  label,
  onPress,
  danger,
  ghost,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  ghost?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sheetBtn,
        danger && styles.sheetBtnDanger,
        ghost && styles.sheetBtnGhost,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text
        style={[
          styles.sheetBtnTxt,
          danger && { color: colors.loss },
          ghost && { color: colors.muted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function OptionRow({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        active && styles.optionRowActive,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={[styles.radio, active && styles.radioActive]}>
        {active && <CheckIcon size={10} color="#0a0f0a" />}
      </View>
    </Pressable>
  );
}

function FaqRow({ q, a }: { q: string; a: string }) {
  return (
    <View style={styles.faqRow}>
      <Text style={styles.faqQ}>{q}</Text>
      <Text style={styles.faqA}>{a}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingVertical: 14, paddingBottom: 40 },
  setBand: { borderRadius: 16, overflow: 'hidden' },
  title: {
    fontFamily: displayFont,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: 1.2,
    color: colors.fg,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: monoFont,
    fontSize: 7.5,
    letterSpacing: 1.8,
    color: 'rgba(238,242,236,0.85)',
  },

  dashboardGrid: {
    flexDirection: 'column',
    gap: 20,
    marginTop: 18,
  },
  dashboardGridWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
  },

  gridCol: {
    flex: 1,
    width: '100%',
  },
  gridColWide: {
    flex: 1,
  },

  card: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.25)',
    borderRadius: 16,
    backgroundColor: 'rgba(15,26,19,0.85)',
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#0c140e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1, marginLeft: 16 },
  profileName: {
    fontFamily: displayFont,
    fontSize: 22,
    letterSpacing: 1.4,
    color: colors.fg,
  },
  profileId: {
    marginTop: 4,
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: colors.muted,
  },
  profileMeta: {
    marginTop: 4,
    fontFamily: bodyFontBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.primary,
  },

  editBtn: {
    margin: 14,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.35)',
    backgroundColor: 'rgba(57,255,106,0.06)',
  },
  editBtnTxt: { fontFamily: bodyFontBold, fontSize: 11, letterSpacing: 2, color: '#7ed793' },

  manifestoCard: {
    padding: 18,
    borderColor: 'rgba(57,255,106,0.35)',
    backgroundColor: 'rgba(57,255,106,0.03)',
  },
  manifestoHead: {
    fontFamily: bodyFontHeavy,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.primary,
    marginBottom: 10,
  },
  manifestoBody: {
    fontFamily: bodyFont,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(143,184,155,0.92)',
  },

  sectionLabel: {
    marginTop: 20,
    marginLeft: 4,
    fontFamily: bodyFontHeavy,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.muted,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(57,255,106,0.1)' },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.25)',
    backgroundColor: 'rgba(57,255,106,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: {
    borderColor: 'rgba(224,96,92,0.3)',
    backgroundColor: 'rgba(224,96,92,0.06)',
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: bodyFontBold, fontSize: 14, letterSpacing: 0.3, color: colors.fg },
  rowSub: { marginTop: 3, fontFamily: bodyFont, fontSize: 11.5, color: colors.muted },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  valueTxt: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: colors.primary,
  },

  toggleTrack: { width: 40, height: 23, borderRadius: 12, borderWidth: 1, justifyContent: 'center' },
  toggleKnob: { width: 17, height: 17, borderRadius: 9, marginLeft: 2 },
  toggleKnobGlow: {
    shadowColor: '#39FF6A',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },

  dangerCard: { borderColor: 'rgba(224,96,92,0.3)', backgroundColor: 'rgba(224,96,92,0.045)' },
  updateBanner: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.45)',
    backgroundColor: 'rgba(242,192,120,0.08)',
  },
  updateBadgeTxt: { fontFamily: bodyFontHeavy, fontSize: 9.5, letterSpacing: 1.6, color: colors.accent },
  updateTitle: { fontFamily: bodyFontBold, fontSize: 13, letterSpacing: 1, color: colors.accent },
  updateSub: { marginTop: 3, fontFamily: bodyFont, fontSize: 11, color: 'rgba(242,192,120,0.75)' },

  footVersion: {
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.muted,
  },
  footNote: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: monoFont,
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: '#42584a',
  },

  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3, 7, 4, 0.82)',
  },
  sheetDialog: {
    position: 'absolute',
    alignSelf: 'center',
    top: '15%',
    width: '90%',
    maxWidth: 560,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.35)',
    backgroundColor: '#0d160f',
    padding: 24,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 28,
  },
  sheetEyebrow: { fontFamily: bodyFontHeavy, fontSize: 11, letterSpacing: 2.4, color: colors.primary },
  sheetTitle: {
    marginTop: 6,
    fontFamily: displayFont,
    fontSize: 24,
    letterSpacing: 1.4,
    color: colors.fg,
  },
  sheetBody: {
    marginTop: 10,
    fontFamily: bodyFont,
    fontSize: 13,
    lineHeight: 20,
    color: '#a3b7a8',
    marginBottom: 10,
  },
  sheetBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.45)',
    backgroundColor: 'rgba(57,255,106,0.08)',
    alignItems: 'center',
  },
  sheetBtnDanger: { borderColor: 'rgba(224,96,92,0.5)', backgroundColor: 'rgba(224,96,92,0.08)' },
  sheetBtnGhost: { borderColor: 'rgba(143,184,155,0.25)', backgroundColor: 'transparent' },
  sheetBtnTxt: { fontFamily: monoFont, fontSize: 9.5, fontWeight: '900', letterSpacing: 2.4, color: colors.primary },

  unreadDot: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.loss,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadTxt: { fontFamily: monoFont, fontSize: 8, fontWeight: '900', color: '#fff' },
  keyError: { marginTop: 8, fontFamily: monoFont, fontSize: 8, color: colors.loss },

  nameInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.4)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: colors.fg,
    fontFamily: monoFont,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    backgroundColor: 'rgba(10,15,10,0.7)',
  },

  tokenBox: {
    marginVertical: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(242,192,120,0.1)',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  tokenVal: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    color: colors.accent,
    textAlign: 'center',
  },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.16)',
    backgroundColor: 'rgba(10,15,10,0.45)',
  },
  optionRowActive: { borderColor: 'rgba(57,255,106,0.55)', backgroundColor: 'rgba(57,255,106,0.07)' },
  optionLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 1.2, color: colors.fg },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },

  faqRow: {
    marginTop: 10,
    padding: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.14)',
    backgroundColor: 'rgba(10,15,10,0.45)',
  },
  faqQ: { fontFamily: monoFont, fontSize: 8.5, fontWeight: '800', letterSpacing: 1.6, color: colors.fg },
  faqA: { marginTop: 5, fontFamily: bodyFont, fontSize: 12, lineHeight: 18, color: colors.muted },
});
