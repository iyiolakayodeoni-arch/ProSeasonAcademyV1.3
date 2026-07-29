import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import { ChevronLeftIcon, CheckIcon } from '../components/Icons';
import { colors, monoFont } from '../theme';
import * as backend from '../data/backend';

// ─────────────────────────────────────────────────────────────
// CONTACT — the private line to the founder.
//
// Not a support ticket queue with a robot on the end: it lands in
// his inbox, he reads it, and his reply comes back into this same
// thread. Rate-limited to 5/hour at the database so the line stays
// usable for real problems.
// ─────────────────────────────────────────────────────────────

const KINDS: { key: backend.ContactKind; label: string }[] = [
  { key: 'question', label: 'QUESTION' },
  { key: 'suggestion', label: 'SUGGESTION' },
  { key: 'bug', label: 'BUG' },
  { key: 'message', label: 'JUST TALK' },
];

const MIN_LEN = 10;

export default function ContactSheet({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<backend.ContactKind>('question');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<backend.ContactRow[] | null>(null);

  const loadThread = () => {
    void backend.myContactThread().then(setThread);
  };
  useEffect(loadThread, []);

  const canSend = body.trim().length >= MIN_LEN && !sending;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    const err = await backend.sendContact(kind, body);
    setSending(false);
    if (err) {
      setError(
        err === 'RATE_LIMITED'
          ? "YOU'VE SENT 5 MESSAGES THIS HOUR. TAKE A BREATH — HE'LL GET TO THEM."
          : err === 'OFFLINE'
            ? 'NO SIGNAL. YOUR MESSAGE WASN\u2019T SENT — TRY AGAIN WHEN YOU\u2019RE BACK ONLINE.'
            : 'THAT DIDN\u2019T SEND. TRY AGAIN IN A MOMENT.',
      );
      return;
    }
    setBody('');
    setSent(true);
    loadThread();
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.root}>
      <GridBackground />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>DIRECT LINE</Text>
        <Text style={styles.title}>TALK TO THE FOUNDER</Text>
        <Text style={styles.sub}>
          PRIVATE. NOBODY IN THE HALLS SEES THIS — JUST HIM.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(320)} style={styles.card}>
          <Text style={styles.label}>WHAT IS THIS?</Text>
          <View style={styles.kindRow}>
            {KINDS.map((k) => {
              const on = kind === k.key;
              return (
                <Pressable key={k.key} onPress={() => setKind(k.key)} hitSlop={4}>
                  <View style={[styles.chip, on && styles.chipOn]}>
                    <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{k.label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>SAY IT PLAINLY</Text>
          <TextInput
            value={body}
            onChangeText={(t) => {
              setBody(t);
              setError(null);
            }}
            placeholder="What's on your mind? Bugs, ideas, what you'd pay for, what's annoying you…"
            placeholderTextColor="rgba(143,184,155,0.35)"
            multiline
            maxLength={2000}
            style={styles.input}
          />
          <Text style={styles.count}>
            {body.trim().length < MIN_LEN
              ? `${MIN_LEN - body.trim().length} MORE CHARACTERS`
              : `${body.length}/2000`}
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}
          {sent && (
            <View style={styles.sentRow}>
              <CheckIcon size={10} color={colors.primary} />
              <Text style={styles.sentTxt}>SENT — HE READS EVERY ONE.</Text>
            </View>
          )}

          <Pressable onPress={send} disabled={!canSend}>
            <View style={[styles.cta, !canSend && styles.ctaOff]}>
              <Text style={styles.ctaTxt}>{sending ? 'SENDING…' : 'SEND IT'}</Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* the thread — his replies land here */}
        {thread && thread.length > 0 && (
          <Animated.View entering={FadeInDown.delay(120).duration(320)} style={styles.card}>
            <Text style={styles.label}>YOUR THREAD</Text>
            {thread.map((m) => {
              // messages FROM the academy (warnings, reminders, the welcome)
              // must never look like something the member wrote themselves
              const warn = m.fromAcademy && m.kind === 'warning';
              return (
                <View
                  key={m.id}
                  style={[
                    styles.threadRow,
                    m.fromAcademy && styles.fromAcademy,
                    warn && styles.fromWarning,
                  ]}
                >
                  <View style={styles.threadHead}>
                    <Text style={[styles.threadKind, warn && { color: colors.loss }]}>
                      {m.fromAcademy ? (warn ? '⚠ THE ACADEMY' : 'THE ACADEMY') : String(m.kind).toUpperCase()}
                    </Text>
                    <Text style={styles.threadAt}>{new Date(m.at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.threadBody}>{m.body}</Text>
                  {m.reply ? (
                    <View style={styles.replyBox}>
                      <Text style={styles.replyWho}>FOUNDER</Text>
                      <Text style={styles.replyTxt}>{m.reply}</Text>
                    </View>
                  ) : !m.fromAcademy ? (
                    <Text style={styles.pending}>WAITING ON HIM</Text>
                  ) : null}
                </View>
              );
            })}
          </Animated.View>
        )}

        <Text style={styles.foot}>
          THE ACADEMY IS SMALL ON PURPOSE. THAT IS WHY THIS LINE IS REAL.
        </Text>
        <View style={{ height: 20 }} />
      </ScrollView>

      <Pressable onPress={onClose} hitSlop={10} style={styles.back}>
        <ChevronLeftIcon size={15} color={colors.fg} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 46 },
  header: { paddingHorizontal: 18, paddingBottom: 8 },
  eyebrow: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 2.2, color: colors.accent, textAlign: 'center' },
  title: { marginTop: 4, fontFamily: monoFont, fontSize: 15, fontWeight: '900', letterSpacing: 2, color: colors.fg, textAlign: 'center' },
  sub: { marginTop: 4, fontFamily: monoFont, fontSize: 6.2, letterSpacing: 1.3, color: 'rgba(143,184,155,0.7)', textAlign: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },

  card: {
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.2)',
    backgroundColor: 'rgba(10,20,13,0.72)',
    borderRadius: 12,
    padding: 13,
    marginBottom: 12,
  },
  label: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 1.8, color: 'rgba(143,184,155,0.85)' },

  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: 'rgba(143,184,155,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  chipOn: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.12)' },
  chipTxt: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.2, color: 'rgba(143,184,155,0.8)' },
  chipTxtOn: { color: colors.primary },

  input: {
    marginTop: 7,
    minHeight: 110,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.32)',
    borderRadius: 10,
    padding: 11,
    color: colors.fg,
    fontFamily: monoFont,
    fontSize: 9,
    lineHeight: 14,
    backgroundColor: 'rgba(10,15,10,0.6)',
  },
  count: { marginTop: 5, fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1, color: 'rgba(143,184,155,0.5)', textAlign: 'right' },

  error: { marginTop: 8, fontFamily: monoFont, fontSize: 6.4, lineHeight: 10, letterSpacing: 1, color: colors.loss },
  sentRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  sentTxt: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.2, color: colors.primary },

  cta: { marginTop: 12, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  ctaOff: { opacity: 0.35 },
  ctaTxt: { fontFamily: monoFont, fontSize: 8, fontWeight: '900', letterSpacing: 2, color: '#05130a' },

  threadRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(143,184,155,0.14)', paddingTop: 9 },
  fromAcademy: { borderLeftWidth: 2, borderLeftColor: colors.primary, paddingLeft: 8 },
  fromWarning: { borderLeftColor: colors.loss },
  threadHead: { flexDirection: 'row', justifyContent: 'space-between' },
  threadKind: { fontFamily: monoFont, fontSize: 5.8, fontWeight: '900', letterSpacing: 1.4, color: colors.accent },
  threadAt: { fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1, color: 'rgba(143,184,155,0.5)' },
  threadBody: { marginTop: 4, fontFamily: monoFont, fontSize: 8, lineHeight: 12.5, color: 'rgba(238,242,236,0.9)' },
  replyBox: { marginTop: 7, borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: 8 },
  replyWho: { fontFamily: monoFont, fontSize: 5.8, fontWeight: '900', letterSpacing: 1.4, color: colors.accent },
  replyTxt: { marginTop: 2, fontFamily: monoFont, fontSize: 8, lineHeight: 12.5, color: colors.fg },
  pending: { marginTop: 6, fontFamily: monoFont, fontSize: 5.8, letterSpacing: 1.2, color: 'rgba(143,184,155,0.5)' },

  foot: { marginTop: 4, textAlign: 'center', fontFamily: monoFont, fontSize: 6, letterSpacing: 1.4, color: 'rgba(143,184,155,0.5)' },

  back: {
    position: 'absolute', top: 58, left: 16, width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.2, borderColor: 'rgba(143,184,155,0.4)', backgroundColor: 'rgba(10,17,12,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
});
