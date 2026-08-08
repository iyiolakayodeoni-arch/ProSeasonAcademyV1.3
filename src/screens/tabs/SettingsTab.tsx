import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, TextInput, Linking, useWindowDimensions } from 'react-native';
import Constants from 'expo-constants';
import Animated, { FadeIn, FadeInUp, SlideInUp, SlideOutDown, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import GridBackground from '../../components/GridBackground';
import ArtBand from '../../components/ArtBand';
import { colors, monoFont, displayFont, bodyFont, bodyFontBold, bodyFontHeavy } from '../../theme';

// the dressing room — the control room's face
const LOCKERS = require('../../../assets/art/locker-room.jpg');
import { Coach } from '../../data/coaches';
import { journeySeasonFor } from '../../data/journey';
import { useJourneyProgress, wipeProgress } from '../../data/progress';
import { wipeThread } from '../../data/lessonThread';
import { wipeMirror } from '../../data/mirrorSession';
import * as backend from '../../data/backend';
import { DEVICE_LABEL } from '../../data/backend';
import { wipeSession } from '../../data/session';
import { resetOnboarding } from '../../data/onboarding';
import OnboardingScreen from '../OnboardingScreen';
import { sfx, syncMusicToSettings } from '../../audio/sound';
import FounderDesk from '../FounderDesk';
import { isFounder, signInWithEmail } from '../../data/founderAuth';
import { deleteAccountRemote, requestPasswordReset, readCachedAcademyToken } from '../../data/authApi';
import { setNotifPref, getQuietHours, setQuietHours, QuietHours, syncPushRegistration, registerForPush, cancelBaselineUnlocks } from '../../data/notifications';
import { checkForUpdate, UpdateInfo } from '../../data/updateChecker';
import ContactSheet from '../ContactSheet';
import {
  PLATFORMS,
  REGIONS,
  daysInAcademy,
  setDisplayName,
  setPlatform,
  setRegion,
  setToggle,
  useSettings,
  wipeLocalData,
  ToggleKey,
} from '../../data/settings';
import {
  AtIcon,
  BellIcon,
  BroadcastIcon,
  CheckBadgeIcon,
  CheckIcon,
  ChevronRightIcon,
  FilmIcon,
  GamepadIcon,
  HelpIcon,
  JournalIcon,
  LockIcon,
  LogoutIcon,
  PencilIcon,
  PersonIcon,
  PinIcon,
  RouteIcon,
  ScanGlyphIcon,
  TrashIcon,
  WavesGlyphIcon,
} from '../../components/Icons';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

type SheetKind =
  | 'coach'
  | 'edit'
  | 'platform'
  | 'region'
  | 'password'
  | 'help'
  | 'logout'
  | 'delete'
  | 'admin'
  | null;

/** taps on the version line that open the founder's door */
const FOUNDER_TAPS = 5;

// ── the real toggle switch ────────────────────────────────────
function Toggle({ on, onFlip, red }: { on: boolean; onFlip: () => void; red?: boolean }) {
  const active = red ? colors.loss : colors.primary;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(on ? 17 : 1, { duration: 180 }) }],
  }));
  return (
    <Pressable
      onPress={onFlip}
      hitSlop={8}
      style={[
        styles.toggleTrack,
        {
          borderColor: on ? active : colors.border,
          backgroundColor: on ? (red ? 'rgba(224,96,92,0.14)' : 'rgba(57,255,106,0.14)') : '#0c130e',
        },
      ]}
    >
      <Animated.View
        style={[
          styles.toggleKnob,
          { backgroundColor: on ? active : '#4a6353' },
          on && !red && styles.toggleKnobGlow,
          style,
        ]}
      />
    </Pressable>
  );
}

// ── one settings row ──────────────────────────────────────────
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
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && onPress && { backgroundColor: 'rgba(57,255,106,0.04)' }]}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, danger && { color: '#e8a5a2' }]}>{title}</Text>
        {!!sub && <Text style={[styles.rowSub, danger && { color: 'rgba(224,96,92,0.55)' }]}>{sub}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

const Chevron = () => <ChevronRightIcon size={13} color={colors.muted} />;

export default function SettingsTab({
  coach,
  onSignOut,
  onOpenJourney,
  onOpenGuide,
}: {
  coach: Coach;
  onSignOut: () => void;
  onOpenJourney: () => void;
  onOpenGuide: () => void;
}) {
  const s = useSettings();
  const progress = useJourneyProgress();
  const { width: winW } = useWindowDimensions();
  const bandW = Math.min(winW, 430) - 32; // page padding is 16 a side
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [ticketOpen, setTicketOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  // The account page opens with only the decisions a member needs. Less-used
  // delivery, sound and device controls live behind one deliberate reveal.
  const [showControls, setShowControls] = useState(false);

  // ── THE FOUNDER'S DOOR — tap the version line 5× ──
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
  const [quiet, setQuiet] = useState<QuietHours>({ enabled: false, start: 22, end: 7 });
  const [pushNote, setPushNote] = useState<string | null>(null);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  useEffect(() => { void backend.unreadFromAcademy().then(setUnreadAcademy); }, [contactOpen]);

  useEffect(() => {
    void readCachedAcademyToken().then(setAcademyToken);
    void getQuietHours().then(setQuiet);
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
      else { setFounderEmail(''); setFounderPassword(''); setKeyError(null); setSheet('admin'); }
      return;
    }
    setTaps(n);
  };

  const submitFounderLogin = async () => {
    if (!founderEmail.trim() || !founderPassword || keyChecking) return;
    setKeyChecking(true); setKeyError(null);
    const profile = await signInWithEmail(founderEmail, founderPassword);
    setKeyChecking(false);
    if (!profile) { setKeyError('FOUNDER ACCOUNT NOT VERIFIED. CHECK YOUR EMAIL AND PASSWORD.'); return; }
    setFounderAllowed(true); setFounderKey('authenticated-founder'); setFounderPassword(''); setSheet(null); setDeskOpen(true);
  };

  const forgetFounderKey = () => { setFounderAllowed(false); setFounderKey(null); setDeskOpen(false); };

  const SEASON = journeySeasonFor(coach.id);
  const coachShort = coach.name.split(' ')[0].toUpperCase();
  const stageN = Math.min(progress.currentStage, SEASON.totalStages);
  const stage = SEASON.stages.find((x) => x.n === stageN);
  const pathDone = progress.completedCount >= SEASON.totalStages;
  const xp = progress.xp.toLocaleString('en-US');

  const open = (k: Exclude<SheetKind, null>) => {
    if (k === 'edit') setNameDraft(s.displayName);
    if (k === 'delete') setDeleteArmed(false);
    setSheet(k);
  };
  const close = () => setSheet(null);

  const flip = (key: ToggleKey) => {
    const next = !s.toggles[key];
    sfx('toggle');
    // notification prefs sync upstream; journey/audio toggles stay local
    if (
      key === 'coachMessages' ||
      key === 'matchScanResults' ||
      key === 'filmRoomAlerts' ||
      key === 'communityMentions' ||
      key === 'founderAnnouncements' ||
      key === 'fcMobileNews' ||
      key === 'groupSessions'
    ) {
      setNotifPref(key, next);
    } else {
      setToggle(key, next);
    }
    if (key === 'music') syncMusicToSettings();
  };

  return (
    <View style={styles.flex}>
      <GridBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
        {/* header — the dressing-room band carries the title */}
        <Animated.View entering={FadeInUp.duration(320)}>
          <ArtBand source={LOCKERS} width={bandW} height={104} style={styles.setBand} warmAt={{ x: bandW * 0.5, y: 30, r: bandW * 0.55 }}>
            <Text style={styles.title} numberOfLines={1}>SETTINGS</Text>
            <Text style={styles.subtitle}>YOUR PROFILE · YOUR PROGRESS · YOUR NOISE LEVEL</Text>
          </ArtBand>
          <View style={styles.topLine}>
            <View>
              <Text style={styles.brand}>PROSEASONACADEMY</Text>
              <View style={styles.brandRule} />
            </View>
            <Text style={styles.controlRoom}>CONTROL ROOM</Text>
          </View>
        </Animated.View>

        {/* ── update checker — Supabase config.latest_version/latest_apk_url ── */}
        {update?.available && (
          <Animated.View entering={FadeInUp.delay(40).duration(300)}>
            <Pressable
              style={({ pressed }) => [styles.updateBanner, pressed && { opacity: 0.75 }]}
              onPress={() => {
                if (update.apkUrl) Linking.openURL(update.apkUrl).catch(() => {});
              }}
            >
              <View style={styles.updateBadge}>
                <Text style={styles.updateBadgeTxt}>NEW</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.updateTitle}>VERSION {update.latest} AVAILABLE</Text>
                <Text style={styles.updateSub}>
                  YOU'RE ON {update.current}.{update.note ? ` ${update.note}` : ' TAP TO DOWNLOAD THE UPDATE.'}
                </Text>
              </View>
              <ChevronRightIcon size={14} color={colors.accent} />
            </Pressable>
          </Animated.View>
        )}

        {/* ── player card ── */}
        <Animated.View entering={FadeInUp.delay(60).duration(340)} style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <PersonIcon size={26} color={colors.primary} />
              </View>
              <View style={styles.avatarBadge}>
                <CheckBadgeIcon size={15} color={colors.primary} />
              </View>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.profileName}>{s.displayName}</Text>
              <Text style={styles.profileId}>ACADEMY ID · {s.academyId}</Text>
              <Text style={styles.profilePath}>
                {pathDone ? `PROGRESS COMPLETE — YOUR RECEIPTS ARE IN` : `CHAPTER ${stageN} — YOUR PROGRESS`}
              </Text>
            </View>
          </View>

          <View style={styles.statStrip}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{s.div}</Text>
              <Text style={styles.statLabel}>CURRENT DIV</Text>
            </View>
            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={styles.statValue}>{xp}</Text>
              <Text style={styles.statLabel}>ACADEMY XP</Text>
            </View>
            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={styles.statValue}>×{s.bestStreak}</Text>
              <Text style={styles.statLabel}>BEST STREAK</Text>
            </View>
            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={styles.statValue}>{daysInAcademy(s.joinedAt)}D</Text>
              <Text style={styles.statLabel}>IN ACADEMY</Text>
            </View>
          </View>

          <Pressable style={({ pressed }) => [styles.editBtn, pressed && { backgroundColor: 'rgba(57,255,106,0.08)' }]} onPress={() => open('edit')}>
            <PencilIcon size={12} color="#7ed793" />
            <Text style={styles.editBtnTxt}>EDIT PROFILE</Text>
            <ChevronRightIcon size={11} color="#7ed793" />
          </Pressable>
        </Animated.View>

        {/* ── coach & journey ── */}
        <Animated.View entering={FadeInUp.delay(120).duration(340)}>
          <Text style={styles.sectionLabel}>COACH & PROGRESS</Text>
          <View style={styles.card}>
            <Row
              icon={<PersonIcon size={16} color="#57d07c" />}
              title="Your Coach"
              sub="YOUR VOICE & ACCOUNTABILITY PARTNER THIS SEASON"
              right={
                <View style={styles.valueRow}>
                  <Image source={coach.portrait} style={styles.coachChip} />
                  <Text style={styles.valueTxt}>{coachShort}</Text>
                  <Chevron />
                </View>
              }
              onPress={() => open('coach')}
            />
            <Row
              icon={<RouteIcon size={16} color="#57d07c" />}
              title="Current Chapter"
              sub={pathDone ? '6 OF 6 · PROGRESS COMPLETE' : `${stageN} OF ${SEASON.totalStages} · ${stage?.key ?? ''}`}
              right={
                <View style={styles.valueRow}>
                  <Text style={styles.valueTxt}>{pathDone ? 'COMPLETE' : 'IN PROGRESS'}</Text>
                  <Chevron />
                </View>
              }
              onPress={onOpenJourney}
            />
            <Row
              icon={<HelpIcon size={15} color="#f2c078" />}
              title="How the Academy works"
              sub="PLAY ONE MATCH · REVIEW IT · CARRY ONE LESSON"
              right={<Chevron />}
              onPress={onOpenGuide}
            />
            <Row
              icon={<ScanGlyphIcon size={15} color="#57d07c" />}
              title="Auto-check new evidence"
              sub="CHECK EVIDENCE AFTER A MATCH REVIEW"
              right={<Toggle on={s.toggles.matchScanAutoRead} onFlip={() => flip('matchScanAutoRead')} />}
            />
            <Row
              icon={<JournalIcon size={15} color="#57d07c" />}
              title="Loss Notes"
              sub={`${coachShort}'S RULE — LOG ONE LINE PER LOSS`}
              right={<Toggle on={s.toggles.lossJournal} onFlip={() => flip('lossJournal')} />}
              last
            />
          </View>
        </Animated.View>

        {/* ── only the account actions that matter day-to-day ── */}
        <Animated.View entering={FadeInUp.delay(165).duration(340)}>
          <Text style={styles.sectionLabel}>ACCOUNT & SUPPORT</Text>
          <View style={styles.card}>
            <Row
              icon={<LockIcon size={14} color="#57d07c" />}
              title="Security"
              sub="PASSWORD, SEAT AND ACADEMY TOKEN"
              right={<Chevron />}
              onPress={() => open('password')}
            />
            <Row
              icon={<HelpIcon size={15} color="#57d07c" />}
              title="Help & support"
              sub="HOW THE PRACTICE WORKS · BUGS · A HUMAN"
              right={<Chevron />}
              onPress={() => open('help')}
            />
            <Row
              icon={<AtIcon size={15} color="#f2c078" />}
              title="Contact the founder"
              sub={unreadAcademy > 0 ? 'YOU HAVE A MESSAGE FROM THE ACADEMY' : 'PRIVATE LINE — QUESTIONS, IDEAS, BUGS'}
              right={unreadAcademy > 0 ? <View style={styles.unreadDot}><Text style={styles.unreadTxt}>{unreadAcademy}</Text></View> : <Chevron />}
              onPress={() => { setContactOpen(true); void backend.markAcademyRead(); }}
            />
            <Row
              icon={<GamepadIcon size={15} color="#57d07c" />}
              title={showControls ? 'Hide extra controls' : 'More controls'}
              sub="NOTIFICATIONS, SOUND AND DEVICE OPTIONS"
              right={<Chevron />}
              onPress={() => setShowControls((value) => !value)}
              last
            />
          </View>
        </Animated.View>

        {showControls && (
          <>
        {/* ── the academy manifesto: the chinedu way ── */}
        <Animated.View entering={FadeInUp.delay(170).duration(340)}>
          <Text style={styles.sectionLabel}>REVIEW ROUTINE</Text>
          <View style={[styles.card, { padding: 14, borderColor: 'rgba(57,255,106,0.35)', backgroundColor: 'rgba(57,255,106,0.03)' }]}>
            <Text style={[styles.profileName, { fontSize: 11, color: colors.primary }]}>
              THE HARD WAY IS THE EASY WAY · TECH IS MEANT TO ELEVATE
            </Text>
            <Text style={{ marginTop: 8, fontFamily: bodyFont, fontSize: 12, lineHeight: 18, color: 'rgba(143,184,155,0.9)' }}>
              1. RECORD & WATCH: Record your console match as usual before kick-off (PS Share / Xbox Capture / capture card), play your match, then watch your tape back.
              {'\n'}2. PEN TO PAPER: There is a special connection a biro has to a book that cannot be typed. Pen down the key moments, unusual events, and answers on paper first.
              {'\n'}3. 30-MINUTE COOL-DOWN: Let your mind settle for 30 minutes after full time.
              {'\n'}4. LOG TO DATABASE: Once your head has cooled, open the app and type your penned truth into your database.
              {'\n\n'}In a world looking for the easy way out, we tell you that the hard way is the easy way, and the easy way is the hard way. Tech is meant to elevate and not make you dormant.
            </Text>
          </View>
        </Animated.View>

        {/* ── notifications ── */}
        <Animated.View entering={FadeInUp.delay(180).duration(340)}>
          <Text style={styles.sectionLabel}>NOTIFICATIONS — YOUR NOISE LEVEL</Text>
          <View style={styles.card}>
            <Row
              icon={<BellIcon size={15} color="#57d07c" />}
              title="Coach messages"
              sub={`WHEN ${coachShort} SENDS A SESSION OR LESSON`}
              right={<Toggle on={s.toggles.coachMessages} onFlip={() => flip('coachMessages')} />}
            />
            <Row
              icon={<ScanGlyphIcon size={15} color="#57d07c" />}
              title="Match Review results"
              sub="PING YOU THE SECOND YOUR SCAN LANDS"
              right={<Toggle on={s.toggles.matchScanResults} onFlip={() => flip('matchScanResults')} />}
            />
            <Row
              icon={<FilmIcon size={15} color="#57d07c" />}
              title="Coach Screen live alerts"
              sub="WHEN A COACH GOES LIVE IN THE ROOM"
              right={<Toggle on={s.toggles.filmRoomAlerts} onFlip={() => flip('filmRoomAlerts')} />}
            />
            <Row
              icon={<AtIcon size={15} color="#57d07c" />}
              title="Community mentions"
              sub="@PINGS IN YOUR ROOMS"
              right={<Toggle on={s.toggles.communityMentions} onFlip={() => flip('communityMentions')} />}
            />
            <Row
              icon={<BellIcon size={15} color="#f2c078" />}
              title="Founder announcements"
              sub="OFFICIAL HOME POSTS FROM POCOLASTONES"
              right={<Toggle on={s.toggles.founderAnnouncements !== false} onFlip={() => flip('founderAnnouncements')} />}
            />
            <Row
              icon={<BellIcon size={15} color="#57d07c" />}
              title="FC 26/27 Console news"
              sub="FOUNDER-APPROVED CONSOLE META ALERTS"
              right={<Toggle on={s.toggles.fcMobileNews !== false} onFlip={() => flip('fcMobileNews')} />}
            />
            <Row
              icon={<BellIcon size={15} color="#57d07c" />}
              title="Group session reminders"
              sub="FOUR-DAY COACH GROUP PINGS"
              right={<Toggle on={s.toggles.groupSessions !== false} onFlip={() => flip('groupSessions')} />}
            />
            <Row
              icon={<BellIcon size={15} color="#57d07c" />}
              title="Quiet hours"
              sub={quiet.enabled ? `${quiet.start}:00–${quiet.end}:00 LOCAL · TAP TO TOGGLE` : 'OFF · TAP TO ENABLE 22:00–07:00'}
              right={<Toggle on={quiet.enabled} onFlip={() => {
                const next = { ...quiet, enabled: !quiet.enabled };
                setQuiet(next);
                void setQuietHours(next);
              }} />}
            />
            <Row
              icon={<BellIcon size={15} color="#57d07c" />}
              title="Enable push delivery"
              sub={pushNote ?? 'REQUEST PERMISSION + REGISTER THIS DEVICE'}
              right={<Chevron />}
              onPress={() => {
                void registerForPush().then((r) => {
                  setPushNote(r.ok ? 'PUSH ARMED ON THIS DEVICE' : `PUSH: ${r.reason ?? 'FAILED'}`);
                  void syncPushRegistration();
                });
              }}
              last
            />
          </View>
        </Animated.View>

        {/* ── sound — the academy's ear ── */}
        <Animated.View entering={FadeInUp.delay(210).duration(340)}>
          <Text style={styles.sectionLabel}>SOUND — HOW LOUD THE ACADEMY BREATHES</Text>
          <View style={styles.card}>
            <Row
              icon={<WavesGlyphIcon size={15} color="#57d07c" />}
              title="Academy ambience"
              sub="THE QUIET NIGHT-STADIUM PAD UNDER THE HOME FEED"
              right={<Toggle on={s.toggles.music} onFlip={() => flip('music')} />}
            />
            <Row
              icon={<BroadcastIcon size={15} color="#57d07c" />}
              title="Sound effects"
              sub="TAPS, BUBBLE POPS AND THE WHISTLE"
              right={<Toggle on={s.toggles.soundFx} onFlip={() => flip('soundFx')} />}
              last
            />
          </View>
        </Animated.View>

        {/* ── game & account ── */}
        <Animated.View entering={FadeInUp.delay(240).duration(340)}>
          <Text style={styles.sectionLabel}>GAME & ACCOUNT</Text>
          <View style={styles.card}>
            <Row
              icon={<GamepadIcon size={15} color="#57d07c" />}
              title="Platform"
              sub="WHERE YOUR MATCHES GET SCANNED"
              right={
                <View style={styles.valueRow}>
                  <Text style={styles.valueTxt}>{s.platform}</Text>
                  <Chevron />
                </View>
              }
              onPress={() => open('platform')}
            />
            <Row
              icon={<PinIcon size={15} color="#57d07c" />}
              title="Region / Server"
              sub="AFFECTS SCAN MATCHMAKING WINDOWS"
              right={
                <View style={styles.valueRow}>
                  <Text style={styles.valueTxt}>{s.region}</Text>
                  <Chevron />
                </View>
              }
              onPress={() => open('region')}
            />
            <Row
              icon={<LockIcon size={14} color="#57d07c" />}
              title="Password & security"
              right={<Chevron />}
              onPress={() => open('password')}
            />
            <Row
              icon={<HelpIcon size={15} color="#57d07c" />}
              title="Help & support"
              sub="BUGS · QUESTIONS · TALK TO A HUMAN"
              right={<Chevron />}
              onPress={() => open('help')}
            />
            <Row
              icon={<AtIcon size={15} color="#f2c078" />}
              title="Contact the founder"
              sub={unreadAcademy > 0 ? 'YOU HAVE A MESSAGE FROM THE ACADEMY' : 'PRIVATE LINE — QUESTIONS, IDEAS, BUGS'}
              right={
                unreadAcademy > 0 ? (
                  <View style={styles.unreadDot}>
                    <Text style={styles.unreadTxt}>{unreadAcademy}</Text>
                  </View>
                ) : (
                  <Chevron />
                )
              }
              onPress={() => { setContactOpen(true); void backend.markAcademyRead(); }}
              last
            />
          </View>
        </Animated.View>

          </>
        )}

        {/* ── danger zone ── */}
        <Animated.View entering={FadeInUp.delay(300).duration(340)}>
          <Text style={[styles.sectionLabel, { color: 'rgba(224,96,92,0.75)' }]}>DANGER ZONE</Text>
          <View style={[styles.card, styles.dangerCard]}>
            <Row
              icon={<LogoutIcon size={15} color={colors.loss} />}
              title="Log out"
              sub="YOUR PROGRESS WAITS FOR YOU"
              right={<ChevronRightIcon size={13} color="rgba(224,96,92,0.6)" />}
              onPress={() => open('logout')}
              danger
            />
            <Row
              icon={<TrashIcon size={15} color={colors.loss} />}
              title="Delete account"
              sub="MATCH HISTORY, NOTES AND XP GO WITH IT — NO UNDO"
              right={<ChevronRightIcon size={13} color="rgba(224,96,92,0.6)" />}
              onPress={() => open('delete')}
              danger
              last
            />
          </View>
        </Animated.View>

        {/* the founder's door hides in plain sight — 5 taps */}
        <Pressable onPress={tapVersion} hitSlop={10}>
          <Text style={styles.footVersion}>
            PROSEASONACADEMY · VERSION {APP_VERSION}
            {founderKey ? ' · ★' : ''}
          </Text>
        </Pressable>
        <Text style={styles.footNote}>BUILD 24.07 · MADE FOR THE PLAYERS WHO STAY AFTER FULL-TIME</Text>
      </ScrollView>

      {/* ── bottom sheet ── */}
      {sheet && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          </Animated.View>
          <Animated.View entering={SlideInUp.duration(260)} exiting={SlideOutDown.duration(200)} style={styles.sheet}>
            <View style={styles.sheetHandle} />

            {sheet === 'coach' && (
              <View>
                <Text style={styles.sheetEyebrow}>YOUR COACH</Text>
                <View style={styles.sheetCoachRow}>
                  <Image source={coach.portrait} style={styles.sheetCoachImg} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetTitle}>{coach.name.toUpperCase()}</Text>
                    <Text style={styles.sheetCoachSub}>
                      {coach.title} · RATING {coach.rating}
                    </Text>
                  </View>
                </View>
                <Text style={styles.sheetBody}>
                  {`Switching coaches resets your path progress — so the academy doesn't allow it. ${coachShort} walked in with you; ${coachShort} walks out with you. That's the deal you locked in.`}
                </Text>
                <SheetButton label="UNDERSTOOD" onPress={close} />
              </View>
            )}

            {sheet === 'edit' && (
              <View>
                <Text style={styles.sheetEyebrow}>EDIT PROFILE</Text>
                <Text style={styles.sheetTitle}>CALL YOURSELF SOMETHING</Text>
                <Text style={styles.sheetBody}>
                  Letters, numbers and underscores — 12 characters max. This is the name your coach shouts across the film room.
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
                <Text style={styles.sheetEyebrow}>PLATFORM</Text>
                <Text style={styles.sheetTitle}>WHERE YOUR MATCHES GET SCANNED</Text>
                {PLATFORMS.map((p) => (
                  <OptionRow
                    key={p}
                    label={p}
                    sub={p === 'PS5 / XBOX' ? 'PS5 / XBOX SERIES X|S — CONSOLE CAPTURE & CLIPS' : 'PC / EA APP / STEAM — RECORD AS USUAL'}
                    active={s.platform === p}
                    onPress={() => setPlatform(p)}
                  />
                ))}
                <SheetButton label="DONE" onPress={close} ghost />
              </View>
            )}

            {sheet === 'region' && (
              <View>
                <Text style={styles.sheetEyebrow}>REGION / SERVER</Text>
                <Text style={styles.sheetTitle}>SCAN MATCHMAKING WINDOWS</Text>
                {REGIONS.map((r) => (
                  <OptionRow key={r} label={r} active={s.region === r} onPress={() => setRegion(r)} />
                ))}
                <SheetButton label="DONE" onPress={close} ghost />
              </View>
            )}

            {sheet === 'password' && (
              <View>
                <Text style={styles.sheetEyebrow}>SECURITY</Text>
                <Text style={styles.sheetTitle}>PASSWORD & SEAT</Text>
                <Text style={styles.sheetBody}>
                  You sign in with email + password. Your academy reference token is generated once
                  and stored on this device.
                </Text>
                <Text style={styles.sheetBody}>
                  ACADEMY TOKEN · {academyToken ?? s.academyId}{'\n'}
                  EMAIL · {s.email ?? '—'}{'\n'}
                  SEAT HELD ON · {DEVICE_LABEL}{'\n'}
                  COUNTRY · {s.country ?? '—'} {s.countryCode ? `(${s.countryCode})` : ''}
                  {s.geoUncertain ? ' · LOCATION UNCERTAIN' : s.geoVerified ? ' · VERIFIED' : ''}
                </Text>
                {resetNote && <Text style={[styles.sheetBody, { color: colors.primary }]}>{resetNote}</Text>}
                <SheetButton
                  label="SEND PASSWORD RESET EMAIL"
                  onPress={async () => {
                    if (!s.email) {
                      setResetNote('NO EMAIL ON THIS SEAT — SIGN IN AGAIN.');
                      return;
                    }
                    const r = await requestPasswordReset(s.email);
                    setResetNote(r.ok ? r.message : r.message);
                  }}
                />
                <SheetButton label="DONE" onPress={close} ghost />
              </View>
            )}

            {sheet === 'help' && (
              <View>
                <Text style={styles.sheetEyebrow}>HELP & SUPPORT</Text>
                <Text style={styles.sheetTitle}>START WITH THE NEXT MATCH</Text>
                <FaqRow q="WHAT DO I DO ON HOME?" a="LOOK FOR THE GREEN MATCH REVIEW BUTTON. IF YOU HAVE OR JUST FINISHED A REAL MATCH, TAP IT. IF YOU DO NOT, YOU ARE NOT BEHIND — COME BACK AFTER THE MATCH." />
                <FaqRow q="HOW DO I COMPLETE A CHAPTER?" a="A CHAPTER MOVES WHEN YOUR MATCH RECEIPTS MEET ITS EVIDENCE TARGETS. THE MATCH REVIEW HELPS YOU CREATE THE EVIDENCE; PROGRESS SHOWS WHAT IS STILL NEEDED." />
                <FaqRow q="DO I NEED TO USE EVERY FEATURE?" a="NO. THE CORE IS PLAY, REVIEW, CARRY. NEWS, COMMUNITY AND ADVANCED TRACKING ARE OPTIONAL SUPPORT TOOLS." />
                <FaqRow q="CAN I SWITCH COACHES?" a="NO — THE PATH LOCK IS PERMANENT. THAT'S THE ACADEMY." />
                <FaqRow q="WHERE IS MY DATA?" a="ON THIS DEVICE, AND MIRRORED TO YOUR ACADEMY SEAT WHEN YOU HAVE SIGNAL." />
                <SheetButton
                  label="READ THE STEP-BY-STEP GUIDE"
                  onPress={() => {
                    close();
                    onOpenGuide();
                  }}
                />
                <SheetButton
                  label="TOUR THE ACADEMY"
                  onPress={() => {
                    close();
                    setTourOpen(true);
                  }}
                />
                <SheetButton
                  label={ticketOpen ? 'TICKET OPENED — WE REPLY IN-APP' : 'TALK TO A HUMAN'}
                  onPress={() => {
                    // TODO(real-support): open a support ticket against the player profile
                    console.log('[support] human ticket requested (seam)');
                    setTicketOpen(true);
                  }}
                />
              </View>
            )}

            {sheet === 'logout' && (
              <View>
                <Text style={[styles.sheetEyebrow, { color: colors.loss }]}>LOG OUT</Text>
                <Text style={styles.sheetTitle}>LEAVING ALREADY?</Text>
                <Text style={styles.sheetBody}>Your journey waits — it patiently judges. Your path, XP and scans stay exactly where you left them.</Text>
                <SheetButton label="STAY" onPress={close} />
                <SheetButton label="LOG OUT" onPress={onSignOut} danger />
              </View>
            )}

            {sheet === 'delete' && (
              <View>
                <Text style={[styles.sheetEyebrow, { color: colors.loss }]}>DELETE ACCOUNT</Text>
                <Text style={styles.sheetTitle}>THIS BURNS EVERYTHING</Text>
                <Text style={styles.sheetBody}>
                  Path, scans, badges and XP go with it — no undo, no recovery, no appeals. Your coach will not take it personally. He will also not forget it.
                </Text>
                <SheetButton label="KEEP MY ACCOUNT" onPress={close} />
                <SheetButton
                  label={deleteArmed ? 'CONFIRM — DELETE EVERYTHING' : 'DELETE EVERYTHING'}
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
                    await resetOnboarding(); // a brand-new account gets the tour again
                    await cancelBaselineUnlocks(); // no unlock nags for a dead account
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
                <Text style={styles.sheetBody}>Use your Supabase founder account. No founder key is stored on this device.</Text>
                <TextInput value={founderEmail} onChangeText={setFounderEmail} placeholder="EMAIL" placeholderTextColor="rgba(143,184,155,0.35)" autoCapitalize="none" keyboardType="email-address" style={styles.nameInput} />
                <TextInput value={founderPassword} onChangeText={setFounderPassword} placeholder="PASSWORD" placeholderTextColor="rgba(143,184,155,0.35)" secureTextEntry style={styles.nameInput} />
                {keyError && <Text style={styles.keyError}>{keyError}</Text>}
                <SheetButton label={keyChecking ? 'CHECKING…' : 'OPEN FOUNDER DESK'} onPress={submitFounderLogin} />
                <SheetButton label="NOT NOW" onPress={close} ghost />
              </View>
            )}

          </Animated.View>
        </View>
      )}

      {/* ── FOUNDER DESK — full-screen, key-gated ── */}
      {deskOpen && founderKey && (
        <View style={StyleSheet.absoluteFill}>
          <FounderDesk
            founderKey={founderKey}
            onForgetKey={forgetFounderKey}
            onClose={() => setDeskOpen(false)}
          />
        </View>
      )}

      {/* ── CONTACT — private line to the founder ── */}
      {contactOpen && (
        <View style={StyleSheet.absoluteFill}>
          <ContactSheet onClose={() => setContactOpen(false)} />
        </View>
      )}

      {/* ── ACADEMY TOUR — replayable from Help & support ── */}
      {tourOpen && (
        <View style={StyleSheet.absoluteFill}>
          <OnboardingScreen onDone={() => setTourOpen(false)} />
        </View>
      )}
    </View>
  );
}

// ── sheet building blocks ─────────────────────────────────────
function SheetButton({ label, onPress, danger, ghost }: { label: string; onPress: () => void; danger?: boolean; ghost?: boolean }) {
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
      <Text style={[styles.sheetBtnTxt, danger && { color: colors.loss }, ghost && { color: colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

function OptionRow({ label, sub, active, accent, onPress }: { label: string; sub?: string; active: boolean; accent?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.optionRow, active && styles.optionRowActive, pressed && { opacity: 0.8 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionLabel, accent && active && { color: colors.accent }]}>{label}</Text>
        {!!sub && <Text style={styles.optionSub}>{sub}</Text>}
      </View>
      <View style={[styles.radio, active && styles.radioActive]}>{active && <CheckIcon size={9} color="#0a0f0a" />}</View>
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
  scroll: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 26 },

  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14, marginBottom: 12 },
  brand: { fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 2.4, color: colors.fg },
  brandRule: { marginTop: 3, height: 2, width: '70%', backgroundColor: colors.primary, borderRadius: 1 },
  controlRoom: { fontFamily: bodyFontBold, fontSize: 9.5, letterSpacing: 2, color: colors.muted },
  setBand: { marginTop: 8, borderRadius: 15 },
  title: { fontFamily: displayFont, fontSize: 28, lineHeight: 29, letterSpacing: 1.2, color: colors.fg, textTransform: 'uppercase', textShadowColor: 'rgba(57,255,106,0.4)', textShadowRadius: 9 },
  subtitle: { marginTop: 6, fontFamily: monoFont, fontSize: 6.4, letterSpacing: 1.8, color: 'rgba(238,242,236,0.85)' },

  card: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.28)',
    borderRadius: 16,
    backgroundColor: 'rgba(15,26,19,0.82)',
    overflow: 'hidden',
  },

  profileRow: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 12 },
  avatarWrap: { width: 54, height: 54 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#0c130e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: { position: 'absolute', right: -2, bottom: -2 },
  profileText: { flex: 1, marginLeft: 13 },
  profileName: { fontFamily: displayFont, fontSize: 19, letterSpacing: 1.4, color: colors.fg, textTransform: 'uppercase' },
  profileId: { marginTop: 2, fontFamily: monoFont, fontSize: 9, fontWeight: '700', letterSpacing: 1.6, color: colors.muted },
  profilePath: { marginTop: 3, fontFamily: bodyFontBold, fontSize: 9.5, letterSpacing: 1.4, color: colors.primary },

  statStrip: {
    flexDirection: 'row',
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.22)',
    borderRadius: 11,
    backgroundColor: 'rgba(10,15,10,0.5)',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  statCellBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(57,255,106,0.14)' },
  statValue: { fontFamily: displayFont, fontSize: 17, letterSpacing: 0.6, color: colors.primary },
  statLabel: { marginTop: 3, fontFamily: bodyFontBold, fontSize: 8.5, letterSpacing: 1.5, color: colors.muted },

  editBtn: {
    margin: 12,
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.4)',
  },
  editBtnTxt: { fontFamily: bodyFontBold, fontSize: 10, letterSpacing: 2.4, color: '#7ed793' },

  sectionLabel: { marginTop: 18, marginLeft: 3, fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 2.2, color: colors.muted },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 11, gap: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(57,255,106,0.1)' },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.25)',
    backgroundColor: 'rgba(57,255,106,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { borderColor: 'rgba(224,96,92,0.3)', backgroundColor: 'rgba(224,96,92,0.06)' },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: bodyFontBold, fontSize: 13, letterSpacing: 0.3, color: colors.fg },
  rowSub: { marginTop: 2, fontFamily: bodyFont, fontSize: 10.5, letterSpacing: 0.5, color: colors.muted },

  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  valueTxt: { fontFamily: monoFont, fontSize: 9.5, fontWeight: '800', letterSpacing: 1.4, color: colors.primary },
  coachChip: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(57,255,106,0.4)' },

  toggleTrack: { width: 38, height: 21, borderRadius: 11, borderWidth: 1, justifyContent: 'center' },
  toggleKnob: { width: 15, height: 15, borderRadius: 8, marginLeft: 2 },
  toggleKnobGlow: { shadowColor: '#39FF6A', shadowOpacity: 0.7, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },

  dangerCard: { borderColor: 'rgba(224,96,92,0.3)', backgroundColor: 'rgba(224,96,92,0.045)' },

  updateBanner: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.45)',
    backgroundColor: 'rgba(242,192,120,0.08)',
  },
  updateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(242,192,120,0.22)',
  },
  updateBadgeTxt: { fontFamily: bodyFontHeavy, fontSize: 9, letterSpacing: 1.6, color: colors.accent },
  updateTitle: { fontFamily: bodyFontBold, fontSize: 12, letterSpacing: 1, color: colors.accent },
  updateSub: { marginTop: 3, fontFamily: bodyFont, fontSize: 10, letterSpacing: 0.5, color: 'rgba(242,192,120,0.7)' },

  footVersion: { marginTop: 18, textAlign: 'center', fontFamily: monoFont, fontSize: 9, fontWeight: '700', letterSpacing: 2, color: colors.muted },
  footNote: { marginTop: 4, textAlign: 'center', fontFamily: monoFont, fontSize: 8, fontWeight: '700', letterSpacing: 1.6, color: '#42584a' },

  // sheet
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(4,8,5,0.72)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(57,255,106,0.3)',
    backgroundColor: '#0d160f',
    paddingHorizontal: 18,
    paddingBottom: 26,
    paddingTop: 8,
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#1f3826', marginBottom: 12 },
  sheetEyebrow: { fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 2.4, color: colors.primary },
  sheetTitle: { marginTop: 6, fontFamily: displayFont, fontSize: 22, letterSpacing: 1.4, color: colors.fg, textTransform: 'uppercase' },
  sheetBody: { marginTop: 9, fontFamily: bodyFont, fontSize: 12, lineHeight: 18, letterSpacing: 0.3, color: '#9db4a3', marginBottom: 8 },
  sheetCoachRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  sheetCoachImg: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.primary },
  sheetCoachSub: { marginTop: 3, fontFamily: bodyFont, fontSize: 10.5, letterSpacing: 1, color: colors.muted },
  sheetFootnote: { marginTop: 10, textAlign: 'center', fontFamily: monoFont, fontSize: 5.8, fontWeight: '700', letterSpacing: 1.4, color: '#42584a' },
  sheetBtn: {
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.45)',
    backgroundColor: 'rgba(57,255,106,0.08)',
    alignItems: 'center',
  },
  sheetBtnDanger: { borderColor: 'rgba(224,96,92,0.5)', backgroundColor: 'rgba(224,96,92,0.08)' },
  sheetBtnGhost: { borderColor: 'rgba(143,184,155,0.25)', backgroundColor: 'transparent' },
  sheetBtnTxt: { fontFamily: monoFont, fontSize: 8.8, fontWeight: '900', letterSpacing: 2.4, color: colors.primary },

  unreadDot: {
    minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.loss,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  unreadTxt: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', color: '#fff' },
  keyError: {
    marginTop: 7,
    fontFamily: monoFont,
    fontSize: 6.6,
    lineHeight: 10,
    letterSpacing: 1,
    color: colors.loss,
  },

  nameInput: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.4)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: colors.fg,
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    backgroundColor: 'rgba(10,15,10,0.6)',
  },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    padding: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.16)',
    backgroundColor: 'rgba(10,15,10,0.45)',
  },
  optionRowActive: { borderColor: 'rgba(57,255,106,0.55)', backgroundColor: 'rgba(57,255,106,0.07)' },
  optionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: colors.fg },
  optionSub: { marginTop: 2, fontFamily: monoFont, fontSize: 6, fontWeight: '700', letterSpacing: 1.1, color: colors.muted },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },

  faqRow: { marginTop: 10, padding: 11, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(57,255,106,0.14)', backgroundColor: 'rgba(10,15,10,0.45)' },
  faqQ: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '800', letterSpacing: 1.6, color: colors.fg },
  faqA: { marginTop: 4, fontFamily: monoFont, fontSize: 6.6, lineHeight: 11, letterSpacing: 0.8, color: colors.muted },
});
