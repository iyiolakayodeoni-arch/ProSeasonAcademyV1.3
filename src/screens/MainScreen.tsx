import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import LogoMark from '../components/LogoMark';
import TabBar, { MainTab } from '../components/TabBar';
import HomeTab from './tabs/HomeTab';
import JourneyTab from './tabs/JourneyTab';
import CommunityTab from './tabs/CommunityTab';
import SettingsTab from './tabs/SettingsTab';
import CoachingScreen from './CoachingScreen';
import { useAmbientAudio } from '../audio/AudioManager';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { Coach } from '../data/coaches';
import { JourneyStage } from '../data/journey';
import * as backend from '../data/backend';
import LapsedGate from './LapsedGate';
import TermsSheet from './TermsSheet';
import { colors, monoFont } from '../theme';

type Props = {
  coach: Coach;
  onSignOut: () => void;
};

type StageOrigin = { x: number; y: number };
type RoomState = { stage: JourneyStage; origin: StageOrigin };

// the tabbed academy core: shared crest on top, tab bar on bottom,
// tab bodies in between. Tapping a Journey node doesn't navigate —
// the node ZOOMS open into the Coaching Screen (shared-element style),
// and the back chevron zooms straight back out onto the map.
export default function MainScreen({ coach, onSignOut }: Props) {
  const [access, setAccess] = useState<backend.MyAccess | null>(null);
  const [tos, setTos] = useState<backend.MyTos | null>(null);
  const checkTos = useCallback(() => { void backend.myTos().then(setTos); }, []);
  useEffect(checkTos, [checkTos]);
  const checkAccess = useCallback(() => {
    void backend.myAccess().then((a) => setAccess(a));
  }, []);
  useEffect(checkAccess, [checkAccess]);

  const [tab, setTab] = useState<MainTab>('home');
  const { loopProps, glowStyle } = useTrailLoop({ pathLength: 260, drawMs: 1800, eraseMs: 1800 });

  // ── stage-zoom transition state ──
  const [room, setRoom] = useState<RoomState | null>(null);
  useAmbientAudio(room ? 'film-room' : tab === 'community' ? 'community' : 'home');
  const zoom = useSharedValue(0);
  const { width: W, height: H } = useWindowDimensions();
  const ox = room?.origin.x ?? W / 2;
  const oy = room?.origin.y ?? H / 3;

  const openStage = useCallback(
    (stage: JourneyStage, origin: StageOrigin) => {
      setRoom({ stage, origin });
      zoom.value = 0;
      zoom.value = withTiming(1, { duration: 470, easing: Easing.out(Easing.cubic) });
    },
    [zoom],
  );

  const closeRoom = useCallback(() => {
    zoom.value = withTiming(0, { duration: 380, easing: Easing.inOut(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(setRoom)(null);
    });
  }, [zoom]);

  // the whole screen scales/expands FROM the tapped node's position
  const shellStyle = useAnimatedStyle(() => {
    const z = zoom.value;
    return {
      transform: [
        { translateX: (ox - W / 2) * (1 - z) },
        { translateY: (oy - H / 2) * (1 - z) },
        { scale: 0.055 + 0.945 * z },
      ],
      borderRadius: 30 + 430 * (1 - z),
      borderWidth: 2 * (1 - z),
      opacity: interpolate(z, [0, 0.05], [0, 1]),
      backgroundColor: interpolateColor(z, [0, 0.9, 1], ['#12301c', colors.bg, colors.bg]),
    };
  });
  // the node itself blooms as the shell grows (the "morph" read)
  const ghostStyle = useAnimatedStyle(() => ({
    opacity: interpolate(zoom.value, [0, 0.3], [1, 0]),
    transform: [{ scale: interpolate(zoom.value, [0, 0.3], [1, 3.4]) }],
  }));
  // screen content fades in during the back half of the zoom
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(zoom.value, [0.3, 0.8], [0, 1]),
  }));

  // the terms come first — nobody is ever removed wondering why
  if (tos && !tos.accepted) {
    return <TermsSheet onAccepted={() => { checkTos(); checkAccess(); }} />;
  }

  // paid-only academy: a lapsed pass closes the floor. Nothing is
  // deleted — the gate explains that and keeps the contact line open.
  if (access && access.paidOnly && access.state === 'lapsed') {
    return <LapsedGate coach={coach} access={access} onRecheck={checkAccess} />;
  }

  return (
    <View style={styles.root}>
      {/* shared brand crest — top center of every tab */}
      <View style={styles.crestWrap}>
        <LogoMark size={30} loopProps={loopProps} glowStyle={glowStyle} />
      </View>

      <View style={styles.body}>
        {tab === 'home' && <HomeTab coach={coach} />}
        {tab === 'journey' && <JourneyTab coach={coach} onOpenStage={openStage} />}
        {tab === 'community' && <CommunityTab coach={coach} />}
        {tab === 'settings' && (
          <SettingsTab coach={coach} onSignOut={onSignOut} onOpenJourney={() => setTab('journey')} />
        )}
      </View>

      {tos?.deadlineAt != null && access?.state !== 'lapsed' && (() => {
        const d = Math.max(0, Math.ceil((tos.deadlineAt! - Date.now()) / 86400000));
        if (d > 7) return null;
        return (
          <View style={styles.deadlineBar}>
            <Text style={styles.deadlineTxt}>
              {d === 0 ? 'YOUR SEAT IS DECIDED TODAY' : `${d} DAY${d === 1 ? '' : 'S'} TO TAKE A PLAN`} — SETTINGS › THE TILL
            </Text>
          </View>
        );
      })()}

      {access?.state === 'grace' && (
        <View style={styles.graceBar}>
          <Text style={styles.graceTxt}>
            PASS EXPIRED · {access.graceLeft} DAY{access.graceLeft === 1 ? '' : 'S'} OF GRACE LEFT — RENEW TO KEEP GOING
          </Text>
        </View>
      )}

      <TabBar active={tab} onChange={setTab} />

      {/* ── the zoomed-in stage room (covers tabs + crest) ── */}
      {room && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={[styles.zoomShell, shellStyle]}>
            <Animated.View style={[styles.zoomContent, contentStyle]}>
              <CoachingScreen coach={coach} stage={room.stage} onClose={closeRoom} />
            </Animated.View>
          </Animated.View>
          {/* node ghost — blooms out of the map as the shell takes over */}
          <Animated.View pointerEvents="none" style={[styles.zoomGhost, { left: ox - 24, top: oy - 24 }, ghostStyle]}>
            <Text style={styles.zoomGhostNum}>{room.stage.n}</Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 46 },
  deadlineBar: { backgroundColor: 'rgba(224,96,92,0.92)', paddingVertical: 6, paddingHorizontal: 12 },
  deadlineTxt: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.2, color: '#fff', textAlign: 'center' },
  graceBar: { backgroundColor: 'rgba(242,192,120,0.92)', paddingVertical: 6, paddingHorizontal: 12 },
  graceTxt: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.2, color: '#2a1410', textAlign: 'center' },
  crestWrap: { alignItems: 'center', height: 36, justifyContent: 'center' },
  body: { flex: 1, minHeight: 0 },

  zoomShell: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderColor: colors.primary,
    backgroundColor: colors.bg,
  },
  zoomContent: { flex: 1 },
  zoomGhost: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  zoomGhostNum: { fontFamily: monoFont, fontSize: 14, fontWeight: '900', color: '#05130a' },
});
