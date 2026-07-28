import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import LogoMark from '../components/LogoMark';
import StoreSheet from './StoreSheet';
import ContactSheet from './ContactSheet';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { Coach } from '../data/coaches';
import * as backend from '../data/backend';
import { colors, monoFont } from '../theme';

// ─────────────────────────────────────────────────────────────
// THE LAPSED GATE — the door when a pass runs out.
//
// The academy is paid-only after the trial: limited seats, serious
// people. But "shut" must never feel like "punished". Two rules
// this screen keeps:
//
//   1. NOTHING IS LOST. Their vault, journal, XP and badges are all
//      still on the device and on the server. Say so, first line.
//   2. THE LINE STAYS OPEN. Contact still works, because someone
//      whose card failed — or who paid an hour ago and is waiting
//      on a manual grant — must be able to reach a human.
// ─────────────────────────────────────────────────────────────

export default function LapsedGate({
  coach,
  access,
  onRecheck,
}: {
  coach: Coach;
  access: backend.MyAccess;
  onRecheck: () => void;
}) {
  const { loopProps, glowStyle } = useTrailLoop({ pathLength: 260, drawMs: 2000, eraseMs: 2000 });
  const [till, setTill] = useState(false);
  const [contact, setContact] = useState(false);
  const [checking, setChecking] = useState(false);

  const recheck = async () => {
    setChecking(true);
    await backend.myAccess();
    setChecking(false);
    onRecheck();
  };

  const expired = access.expiresAt ? new Date(access.expiresAt).toLocaleDateString() : null;

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.root}>
      <GridBackground />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.crest}>
          <LogoMark size={78} loopProps={loopProps} glowStyle={glowStyle} />
        </View>

        <Animated.View entering={FadeInDown.duration(320)}>
          <Text style={styles.eyebrow}>YOUR PASS HAS RUN OUT</Text>
          <Text style={styles.title}>THE DOOR IS SHUT{'\n'}— NOT LOCKED</Text>
          {expired && <Text style={styles.expired}>EXPIRED {expired.toUpperCase()}</Text>}
        </Animated.View>

        {/* the reassurance comes before the ask */}
        <Animated.View entering={FadeInDown.delay(80).duration(320)} style={styles.keepCard}>
          <Text style={styles.keepTag}>NOTHING HAS BEEN DELETED</Text>
          <Text style={styles.keepBody}>
            Your Match Vault, every line in the Loss Journal, your XP, your badges and the stages
            you cleared are all exactly where you left them. Renew and you carry straight on from
            the same node — you do not start again.
          </Text>
        </Animated.View>

        {/* the coach says it in his own voice */}
        <Animated.View entering={FadeInDown.delay(140).duration(320)} style={styles.coachRow}>
          <Image source={coach.portrait} style={styles.coachImg} />
          <View style={styles.coachBubble}>
            <Text style={styles.coachTxt}>
              {coach.id === 'obinna'
                ? '“The seat is still yours for now. But this academy is small on purpose — I can only work properly with people who are actually in it. Come back and we pick up where we stopped.”'
                : '“I am not chasing you. The seats are counted and there are people waiting. When you are serious, the door opens and we go again — same node, no excuses.”'}
            </Text>
            <Text style={styles.coachWho}>— {coach.name.toUpperCase()}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(320)} style={styles.whyCard}>
          <Text style={styles.whyTag}>WHY THE ACADEMY IS PAID</Text>
          <Text style={styles.whyBody}>
            Season One is capped so every member gets real attention. A capped intake only works
            if the people in it are committed — the same way a course with limited places does not
            hold a seat for someone who has not enrolled. That is the whole deal, and it is what
            keeps this worth being part of.
          </Text>
        </Animated.View>

        <Pressable onPress={() => setTill(true)}>
          <View style={styles.cta}>
            <Text style={styles.ctaTxt}>SEE THE PASSES ›</Text>
          </View>
        </Pressable>

        <Pressable onPress={() => void recheck()} hitSlop={8}>
          <Text style={styles.ghost}>{checking ? 'CHECKING…' : 'I HAVE ALREADY PAID — CHECK AGAIN'}</Text>
        </Pressable>

        <Pressable onPress={() => setContact(true)} hitSlop={8}>
          <Text style={styles.ghost}>SOMETHING IS WRONG — MESSAGE THE FOUNDER</Text>
        </Pressable>

        <Text style={styles.foot}>
          PAYMENTS ARE CONFIRMED BY HAND. IF YOU HAVE JUST PAID, GIVE IT A LITTLE TIME — OR MESSAGE HIM.
        </Text>
        <View style={{ height: 26 }} />
      </ScrollView>

      {till && (
        <View style={StyleSheet.absoluteFill}>
          <StoreSheet onClose={() => { setTill(false); onRecheck(); }} />
        </View>
      )}
      {contact && (
        <View style={StyleSheet.absoluteFill}>
          <ContactSheet onClose={() => setContact(false)} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  crest: { alignItems: 'center', marginBottom: 18 },

  eyebrow: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 2.4, color: colors.accent, textAlign: 'center' },
  title: { marginTop: 6, fontFamily: monoFont, fontSize: 17, fontWeight: '900', letterSpacing: 1.6, lineHeight: 23, color: colors.fg, textAlign: 'center' },
  expired: { marginTop: 6, fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.6, color: 'rgba(143,184,155,0.6)', textAlign: 'center' },

  keepCard: {
    marginTop: 18, borderWidth: 1, borderColor: 'rgba(57,255,106,0.34)',
    backgroundColor: 'rgba(10,24,15,0.8)', borderRadius: 12, padding: 13,
  },
  keepTag: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.7, color: colors.primary },
  keepBody: { marginTop: 6, fontFamily: monoFont, fontSize: 7.4, lineHeight: 12, letterSpacing: 0.4, color: 'rgba(238,242,236,0.9)' },

  coachRow: { flexDirection: 'row', gap: 9, marginTop: 14 },
  coachImg: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(242,192,120,0.5)' },
  coachBubble: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(242,192,120,0.3)',
    backgroundColor: 'rgba(32,26,12,0.6)', borderRadius: 11, padding: 11,
  },
  coachTxt: { fontFamily: monoFont, fontSize: 7.4, lineHeight: 12, color: 'rgba(238,242,236,0.92)' },
  coachWho: { marginTop: 6, fontFamily: monoFont, fontSize: 5.8, fontWeight: '900', letterSpacing: 1.3, color: '#f2c078' },

  whyCard: { marginTop: 14, borderLeftWidth: 2, borderLeftColor: 'rgba(143,184,155,0.35)', paddingLeft: 10 },
  whyTag: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.5, color: 'rgba(143,184,155,0.85)' },
  whyBody: { marginTop: 4, fontFamily: monoFont, fontSize: 6.8, lineHeight: 11, letterSpacing: 0.3, color: 'rgba(143,184,155,0.85)' },

  cta: { marginTop: 20, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  ctaTxt: { fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 2.2, color: '#05130a' },

  ghost: { marginTop: 13, textAlign: 'center', fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.3, color: 'rgba(143,184,155,0.8)' },
  foot: { marginTop: 18, textAlign: 'center', fontFamily: monoFont, fontSize: 5.8, lineHeight: 9.5, letterSpacing: 1, color: 'rgba(143,184,155,0.5)' },
});
