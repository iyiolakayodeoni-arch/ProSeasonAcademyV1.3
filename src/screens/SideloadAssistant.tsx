import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Platform, useWindowDimensions } from 'react-native';
import Constants from 'expo-constants';
import Animated, { FadeInDown } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import ArtBand from '../components/ArtBand';
import LogoMark from '../components/LogoMark';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { CheckRingIcon, ChevronLeftIcon } from '../components/Icons';
import { PSA_DOWNLOAD_URL } from '../config';
import { sendContact } from '../data/backend';
import { getSettings } from '../data/settings';
import { sfx } from '../audio/sound';
import { colors, monoFont, displayFont, bodyFont, bodyFontHeavy } from '../theme';

// the dressing room — install help is just getting your own boots on
const LOCKERS = require('../../assets/art/locker-room.jpg');

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

// ─────────────────────────────────────────────────────────────
// SIDELOAD ASSISTANT — self-service install, so a member who
// can't get through "allow unknown apps" fixes it themselves
// instead of dropping off at the door (or flooding the inbox).
//
// If they're still stuck, one tap sends a pre-filled INSTALL help
// message that lands in the founder's inbox — where the Desk's
// auto-triage tags it INSTALL (answer-first) and drafts a reply.
// That is the loop: friction → self-serve → and if needed, a
// pre-tagged ticket the founder can answer in one edit.
// ─────────────────────────────────────────────────────────────

type Step = { n: number; title: string; body: string; cta?: { label: string; url: string } };

const STEPS: Step[] = [
  {
    n: 1,
    title: 'DOWNLOAD THE APP',
    body: 'Open the download page in your browser and save the ProSeasonAcademy .apk file. It is a single file — no store needed.',
    cta: { label: 'OPEN THE DOWNLOAD PAGE ›', url: PSA_DOWNLOAD_URL },
  },
  {
    n: 2,
    title: 'ALLOW YOUR BROWSER TO INSTALL',
    body:
      Platform.OS === 'android'
        ? 'When you open the file, Android will block it and show "For your security, your phone is not allowed to install unknown apps". Tap SETTINGS → "Install unknown apps" → find your browser → turn ALLOW on. This is safe — you are installing from the academy, not a stranger.'
        : 'Open the file. If your device blocks it, allow installs from your browser in your security settings, then try again.',
  },
  {
    n: 3,
    title: 'OPEN THE FILE & INSTALL',
    body: 'Open the downloaded .apk (check your browser\'s "Downloads" or your Files app). Tap INSTALL. Wait for it to finish — it takes a few seconds.',
  },
  {
    n: 4,
    title: 'OPEN THE ACADEMY & CLAIM YOUR SEAT',
    body: 'Open ProSeasonAcademy. Tap CREATE SEAT, enter username + email + password, pick your country, and lock in your coach. Your academy reference token is generated automatically — save it.',
  },
];

export default function SideloadAssistant({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState(1);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [stuckNote, setStuckNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { loopProps, glowStyle } = useTrailLoop({ pathLength: 260, drawMs: 1800, eraseMs: 1800 });
  const { width: winW } = useWindowDimensions();
  const bandW = Math.min(winW, 430);

  const markDone = (n: number) => {
    sfx('tap');
    setDone((d) => ({ ...d, [n]: true }));
    if (n < STEPS.length) setActive(n + 1);
  };

  const tellFounder = async () => {
    setSending(true);
    const id = getSettings().academyId || 'NOT SIGNED IN YET';
    const step = STEPS.find((s) => s.n === active);
    const body = `INSTALL HELP — stuck on step ${active}: ${step?.title ?? ''}. Device: [your phone model]. Academy ID: ${id}. What I see: [describe it].`;
    const err = await sendContact('question', body);
    setSending(false);
    sfx('whoosh');
    if (err === 'RATE_LIMITED') {
      setStuckNote("YOU ALREADY SENT ONE THIS HOUR — THE FOUNDER HAS IT. HE'LL REPLY IN-APP.");
    } else if (err === 'OFFLINE') {
      setStuckNote('NO CONNECTION RIGHT NOW — TRY AGAIN WHEN YOU HAVE SIGNAL.');
    } else if (err) {
      setStuckNote('COULD NOT SEND — TRY AGAIN IN A MOMENT.');
    } else {
      setStuckNote('SENT. THE FOUNDER READS THESE HIMSELF — YOUR REPLY COMES BACK HERE IN-APP.');
    }
  };

  return (
    <View style={styles.flex}>
      <GridBackground />
      <Pressable onPress={onClose} hitSlop={10} style={styles.backBtn}>
        <ChevronLeftIcon size={15} color={colors.fg} />
      </Pressable>

      {/* the dressing-room band — getting in is just getting your boots on */}
      <ArtBand source={LOCKERS} width={bandW} height={140} warmAt={{ x: bandW * 0.5, y: 38, r: bandW * 0.55 }} style={{ marginTop: -46 }}>
        <LogoMark size={34} loopProps={loopProps} glowStyle={glowStyle} />
        <Text style={styles.eyebrow}>INSTALL HELP</Text>
        <Text style={styles.bandTitle}>GET IN IN FOUR STEPS</Text>
        <Text style={styles.sub}>
          No app store — you install one file yourself, in this order. Stuck? The founder is at the bottom.
        </Text>
      </ArtBand>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scroll}>

        {STEPS.map((s, i) => {
          const on = active === s.n;
          const isDone = !!done[s.n];
          return (
            <Animated.View
              key={s.n}
              entering={FadeInDown.delay(i * 60).duration(300)}
              style={[styles.step, on && styles.stepOn, isDone && styles.stepDone]}
            >
              <View style={styles.stepHead}>
                <View style={[styles.stepNum, isDone && styles.stepNumDone]}>
                  {isDone ? <CheckRingIcon size={15} color={colors.primary} /> : <Text style={styles.stepNumTxt}>{s.n}</Text>}
                </View>
                <Text style={[styles.stepTitle, isDone && { color: 'rgba(143,184,155,0.7)' }]}>{s.title}</Text>
              </View>
              <Text style={styles.stepBody}>{s.body}</Text>
              {s.cta && (
                <Pressable onPress={() => { sfx('tap'); void Linking.openURL(s.cta!.url).catch(() => {}); }} hitSlop={6}>
                  <View style={styles.dlBtn}>
                    <Text style={styles.dlBtnTxt}>{s.cta.label}</Text>
                  </View>
                </Pressable>
              )}
              <View style={styles.stepFoot}>
                <Pressable onPress={() => { setActive(s.n); setStuckNote(null); }} hitSlop={6}>
                  <Text style={[styles.ghostBtn, on && { color: colors.primary }]}>
                    {isDone ? 'REOPEN' : on ? 'ON THIS STEP' : 'JUMP HERE'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => markDone(s.n)} hitSlop={6}>
                  <Text style={styles.linkBtn}>{isDone ? 'DONE ✓' : 'DONE — NEXT ›'}</Text>
                </Pressable>
              </View>
            </Animated.View>
          );
        })}

        {/* still stuck → pre-filled ticket into the triaged inbox */}
        <View style={styles.stuckCard}>
          <Text style={styles.stuckTag}>STILL STUCK?</Text>
          <Text style={styles.stuckBody}>
            ONE TAP TELLS THE FOUNDER WHICH STEP BLOCKED YOU. HE READS IT HIMSELF AND REPLIES IN-APP.
            (STEP {active} IS SELECTED — TAP A STEP ABOVE FIRST IF YOU MEAN A DIFFERENT ONE.)
          </Text>
          <Pressable onPress={() => void tellFounder()} disabled={sending} hitSlop={6}>
            <View style={[styles.stuckBtn, sending && styles.stuckBtnBusy]}>
              <Text style={styles.stuckBtnTxt}>{sending ? 'SENDING…' : `I'M STUCK ON STEP ${active} — TELL THE FOUNDER ›`}</Text>
            </View>
          </Pressable>
          {stuckNote && <Text style={styles.stuckNote}>{stuckNote}</Text>}
        </View>

        <Text style={styles.foot}>PROSEASONACADEMY · VERSION {APP_VERSION} · NO STORE, BY DESIGN</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg, paddingTop: 46 },
  backBtn: {
    position: 'absolute', top: 54, left: 16, zIndex: 5, width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.2, borderColor: 'rgba(143,184,155,0.4)', backgroundColor: 'rgba(10,17,12,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  eyebrow: { marginTop: 6, fontFamily: monoFont, fontSize: 8, fontWeight: '900', letterSpacing: 3, color: colors.accent },
  bandTitle: { marginTop: 5, fontFamily: displayFont, fontSize: 27, lineHeight: 28, letterSpacing: 0.8, color: colors.fg, textShadowColor: 'rgba(57,255,106,0.45)', textShadowRadius: 10 },
  sub: {
    marginTop: 7, fontFamily: bodyFont, fontSize: 12, lineHeight: 16.5,
    color: 'rgba(238,242,236,0.85)',
  },
  step: {
    borderWidth: 1.1, borderColor: 'rgba(31,56,38,0.9)', borderRadius: 14, backgroundColor: 'rgba(12,20,14,0.7)',
    padding: 13, marginBottom: 10,
  },
  stepOn: { borderColor: 'rgba(57,255,106,0.6)', shadowColor: colors.primary, shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  stepDone: { borderColor: 'rgba(57,255,106,0.35)', backgroundColor: 'rgba(15,26,19,0.5)' },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNum: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1.3, borderColor: 'rgba(57,255,106,0.5)',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(57,255,106,0.06)',
  },
  stepNumDone: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.12)' },
  stepNumTxt: { fontFamily: monoFont, fontSize: 12, fontWeight: '900', color: colors.primary },
  stepTitle: { flex: 1, fontFamily: bodyFontHeavy, fontSize: 13.5, letterSpacing: 0.4, color: colors.fg },
  stepBody: { marginTop: 8, fontFamily: bodyFont, fontSize: 12.5, lineHeight: 18.5, color: '#c4d4c8' },
  dlBtn: {
    marginTop: 10, borderWidth: 1.1, borderColor: colors.primary, borderRadius: 10, backgroundColor: 'rgba(57,255,106,0.08)',
    paddingVertical: 10, alignItems: 'center',
  },
  dlBtnTxt: { fontFamily: bodyFontHeavy, fontSize: 12.5, letterSpacing: 0.8, color: colors.primary },
  stepFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  ghostBtn: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.2, color: 'rgba(143,184,155,0.6)' },
  linkBtn: { fontFamily: monoFont, fontSize: 6.8, fontWeight: '900', letterSpacing: 1.3, color: colors.primary },

  stuckCard: {
    marginTop: 16, borderWidth: 1.2, borderColor: 'rgba(242,192,120,0.45)', borderRadius: 14,
    backgroundColor: 'rgba(38,30,12,0.5)', padding: 14,
  },
  stuckTag: { fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.8, color: colors.accent },
  stuckBody: { marginTop: 7, fontFamily: bodyFont, fontSize: 12, lineHeight: 17, color: 'rgba(238,242,236,0.82)' },
  stuckBtn: {
    marginTop: 11, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
  },
  stuckBtnBusy: { opacity: 0.6 },
  stuckBtnTxt: { fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.2, color: '#0a0f0a' },
  stuckNote: { marginTop: 9, fontFamily: monoFont, fontSize: 6.6, lineHeight: 11, letterSpacing: 0.8, fontWeight: '700', color: colors.primary },
  foot: { marginTop: 16, textAlign: 'center', fontFamily: monoFont, fontSize: 6.2, letterSpacing: 2.2, color: 'rgba(143,184,155,0.4)' },
});
