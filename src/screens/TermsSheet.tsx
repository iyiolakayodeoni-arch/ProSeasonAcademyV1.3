import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import LogoMark from '../components/LogoMark';
import { CheckIcon } from '../components/Icons';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { colors, monoFont } from '../theme';
import * as backend from '../data/backend';

// ─────────────────────────────────────────────────────────────
// THE TERMS — shown once, on enrolment, before anything else.
//
// The founder's point: nobody should ever be removed and wonder why.
// So the rules arrive at the start, in plain words, and the member
// taps to say they have read them. The deadline is on the same
// screen, because "when do I have to decide?" is the question they
// will actually have.
//
// Blocking by design — this is the one screen that must be read.
// ─────────────────────────────────────────────────────────────

export default function TermsSheet({ onAccepted }: { onAccepted: () => void }) {
  const { loopProps, glowStyle } = useTrailLoop({ pathLength: 260, drawMs: 2000, eraseMs: 2000 });
  const [tos, setTos] = useState<backend.MyTos | null>(null);
  const [readToEnd, setReadToEnd] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void backend.myTos().then(setTos);
  }, []);

  const accept = async () => {
    if (!tos || busy) return;
    setBusy(true);
    const ok = await backend.acceptTos(tos.version);
    setBusy(false);
    if (ok) onAccepted();
  };

  const daysLeft =
    tos?.deadlineAt != null
      ? Math.max(0, Math.ceil((tos.deadlineAt - Date.now()) / 86400000))
      : null;

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.root}>
      <GridBackground />

      <View style={styles.header}>
        <LogoMark size={54} loopProps={loopProps} glowStyle={glowStyle} />
        <Text style={styles.eyebrow}>BEFORE YOU START</Text>
        <Text style={styles.title}>HOW THIS WORKS</Text>
        <Text style={styles.sub}>READ IT ONCE. THEN NOTHING HERE CAN SURPRISE YOU.</Text>
      </View>

      {daysLeft != null && (
        <View style={styles.deadline}>
          <Text style={styles.deadlineTxt}>
            YOUR TRIAL RUNS {daysLeft} MORE DAY{daysLeft === 1 ? '' : 'S'} — THE DATE IS ALWAYS IN SETTINGS
          </Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator
        onScroll={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 40) {
            setReadToEnd(true);
          }
        }}
        scrollEventThrottle={80}
      >
        <Animated.View entering={FadeInDown.duration(300)} style={styles.card}>
          <Text style={styles.body}>{tos?.body ?? 'Loading the terms…'}</Text>
        </Animated.View>
        <View style={{ height: 14 }} />
      </ScrollView>

      <View style={styles.footer}>
        {!readToEnd && <Text style={styles.hint}>SCROLL TO THE END TO CONTINUE</Text>}
        <Pressable onPress={() => void accept()} disabled={!readToEnd || busy || !tos}>
          <View style={[styles.cta, (!readToEnd || busy) && styles.ctaOff]}>
            {readToEnd && <CheckIcon size={11} color="#05130a" />}
            <Text style={styles.ctaTxt}>
              {busy ? 'SAVING…' : 'I HAVE READ THIS — LET ME IN'}
            </Text>
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 52 },
  header: { alignItems: 'center', paddingHorizontal: 20 },
  eyebrow: { marginTop: 10, fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 2.2, color: colors.accent },
  title: { marginTop: 4, fontFamily: monoFont, fontSize: 16, fontWeight: '900', letterSpacing: 2, color: colors.fg },
  sub: { marginTop: 4, fontFamily: monoFont, fontSize: 6, letterSpacing: 1.2, color: 'rgba(143,184,155,0.7)', textAlign: 'center' },

  deadline: {
    marginTop: 12, marginHorizontal: 16, borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.5)', backgroundColor: 'rgba(38,30,12,0.6)',
    borderRadius: 9, paddingVertical: 8, paddingHorizontal: 11,
  },
  deadlineTxt: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 1.2, color: '#f2c078', textAlign: 'center' },

  scroll: { paddingHorizontal: 16, paddingTop: 12 },
  card: {
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.18)',
    backgroundColor: 'rgba(10,20,13,0.72)', borderRadius: 12, padding: 14,
  },
  body: { fontFamily: monoFont, fontSize: 8, lineHeight: 13.5, letterSpacing: 0.2, color: 'rgba(238,242,236,0.92)' },

  footer: { paddingHorizontal: 16, paddingBottom: 22, paddingTop: 8 },
  hint: { textAlign: 'center', marginBottom: 7, fontFamily: monoFont, fontSize: 6, letterSpacing: 1.3, color: 'rgba(143,184,155,0.6)' },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14,
  },
  ctaOff: { opacity: 0.35 },
  ctaTxt: { fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.8, color: '#05130a' },
});
