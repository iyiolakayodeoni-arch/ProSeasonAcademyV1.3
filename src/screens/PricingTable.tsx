import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import GridBackground from '../components/GridBackground';
import { ChevronLeftIcon, CheckIcon } from '../components/Icons';
import { colors, monoFont, displayFont, bodyFont, bodyFontBold, bodyFontHeavy } from '../theme';
import * as backend from '../data/backend';
import { getSettings } from '../data/settings';

// ─────────────────────────────────────────────────────────────
// THE PRICING TABLE — the members set the price with the founder.
//
// This is the "we build it together" promise made concrete. Chat
// scatters; this counts. One answer per member per question,
// editable until the founder closes it.
//
// The tone matters: nobody is being surveyed by a company. They are
// being asked, by name, what a fair deal looks like — and told
// plainly that the answers decide the real prices.
// ─────────────────────────────────────────────────────────────

export default function PricingTable({ onClose }: { onClose: () => void }) {
  const [qs, setQs] = useState<backend.ConsultQ[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { choice?: string; amount?: string; note?: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const currency = getSettings().geo === 'africa' ? '₦' : '$';

  const load = () => {
    void backend.myConsult().then((r) => {
      if (!r) return;
      setQs(r);
      const d: typeof drafts = {};
      for (const q of r) {
        d[q.slug] = {
          choice: q.myChoice ?? undefined,
          amount: q.myAmount != null ? String(q.myAmount) : undefined,
          note: q.myNote ?? undefined,
        };
      }
      setDrafts(d);
    });
  };
  useEffect(load, []);

  const save = async (q: backend.ConsultQ) => {
    const d = drafts[q.slug] ?? {};
    setSaving(q.slug);
    const ok = await backend.answerConsult(q.slug, {
      choice: d.choice,
      amount: d.amount ? Number(d.amount) : undefined,
      note: d.note,
    });
    setSaving(null);
    if (ok) {
      setSaved((s) => ({ ...s, [q.slug]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [q.slug]: false })), 2500);
      load();
    }
  };

  const answeredCount = qs?.filter((q) => q.answered).length ?? 0;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.root}>
      <GridBackground />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOU HELP SET THE PRICE</Text>
        <Text style={styles.title}>THE PRICING TABLE</Text>
        <Text style={styles.sub}>
          THE FOUNDER READS EVERY ANSWER BEFORE ANYTHING IS LOCKED IN
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(300)} style={styles.introCard}>
          <Text style={styles.introTxt}>
            The academy is capped at 1,000 seats, so it has to be paid for by the people in it.
            What it costs is not decided yet — that is what this is. Answer honestly, including
            if the answer is "not worth it". A price nobody can afford helps nobody.
          </Text>
          {qs && (
            <Text style={styles.progress}>
              {answeredCount}/{qs.length} ANSWERED
            </Text>
          )}
        </Animated.View>

        {qs === null && <Text style={styles.empty}>LOADING…</Text>}
        {qs?.length === 0 && (
          <Text style={styles.empty}>
            THE TABLE IS CLOSED. THE FOUNDER IS WORKING THROUGH WHAT EVERYONE SAID.
          </Text>
        )}

        {qs?.map((q, i) => {
          const d = drafts[q.slug] ?? {};
          const dirty =
            (d.choice ?? null) !== q.myChoice ||
            (d.amount ? Number(d.amount) : null) !== q.myAmount ||
            (d.note ?? null) !== q.myNote;
          const canSave =
            dirty &&
            (q.kind !== 'text' || (d.note ?? '').trim().length >= 4) &&
            (q.kind !== 'price' || !!d.amount) &&
            (q.kind !== 'choice' || !!d.choice);

          return (
            <Animated.View
              key={q.slug}
              entering={FadeInDown.delay(60 + i * 40).duration(300)}
              style={[styles.card, q.answered && styles.cardDone]}
            >
              <View style={styles.qHead}>
                <Text style={styles.qNum}>Q{i + 1}</Text>
                {q.answered && (
                  <View style={styles.doneChip}>
                    <CheckIcon size={8} color="#05130a" />
                    <Text style={styles.doneTxt}>ANSWERED</Text>
                  </View>
                )}
              </View>

              <Text style={styles.prompt}>{q.prompt}</Text>
              {q.helper && <Text style={styles.helper}>{q.helper}</Text>}

              {q.kind === 'choice' && (
                <View style={styles.opts}>
                  {(q.options ?? []).map((o) => {
                    const on = d.choice === o;
                    return (
                      <Pressable
                        key={o}
                        onPress={() => setDrafts((s) => ({ ...s, [q.slug]: { ...s[q.slug], choice: o } }))}
                        hitSlop={3}
                      >
                        <View style={[styles.opt, on && styles.optOn]}>
                          <Text style={[styles.optTxt, on && styles.optTxtOn]}>{o}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {q.kind === 'price' && (
                <View style={styles.priceRow}>
                  <Text style={styles.currency}>{currency}</Text>
                  <TextInput
                    value={d.amount ?? ''}
                    onChangeText={(t) =>
                      setDrafts((s) => ({ ...s, [q.slug]: { ...s[q.slug], amount: t.replace(/[^0-9.]/g, '') } }))
                    }
                    placeholder="0"
                    placeholderTextColor="rgba(143,184,155,0.35)"
                    keyboardType="decimal-pad"
                    style={styles.priceInput}
                  />
                  <Text style={styles.perMonth}>/ MONTH</Text>
                </View>
              )}

              {(q.kind === 'text' || q.kind === 'price') && (
                <TextInput
                  value={d.note ?? ''}
                  onChangeText={(t) => setDrafts((s) => ({ ...s, [q.slug]: { ...s[q.slug], note: t } }))}
                  placeholder={q.kind === 'text' ? 'Say it plainly…' : 'Why that number? (optional)'}
                  placeholderTextColor="rgba(143,184,155,0.35)"
                  multiline
                  maxLength={500}
                  style={styles.noteInput}
                />
              )}

              <Pressable onPress={() => void save(q)} disabled={!canSave || saving === q.slug} hitSlop={6}>
                <Text style={[styles.saveBtn, (!canSave || saving === q.slug) && styles.saveOff]}>
                  {saving === q.slug
                    ? 'SAVING…'
                    : saved[q.slug]
                      ? 'SAVED ✓'
                      : q.answered
                        ? 'UPDATE MY ANSWER ›'
                        : 'SUBMIT ›'}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}

        <Text style={styles.foot}>
          YOU CAN CHANGE ANY ANSWER UNTIL THE TABLE CLOSES. NOTHING HERE IS PUBLIC —
          THE FOUNDER SEES THE NUMBERS AND YOUR WORDS, THE HALLS DO NOT.
        </Text>
        <View style={{ height: 24 }} />
      </ScrollView>

      <Pressable onPress={onClose} hitSlop={10} style={styles.back}>
        <ChevronLeftIcon size={15} color={colors.fg} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 46 },
  header: { paddingHorizontal: 18, paddingBottom: 6 },
  eyebrow: { fontFamily: bodyFontHeavy, fontSize: 10, letterSpacing: 2.2, color: colors.accent, textAlign: 'center' },
  title: { marginTop: 4, fontFamily: displayFont, fontSize: 26, letterSpacing: 1.6, color: colors.fg, textAlign: 'center', textTransform: 'uppercase' },
  sub: { marginTop: 6, fontFamily: bodyFontBold, fontSize: 10, letterSpacing: 1, color: 'rgba(143,184,155,0.7)', textAlign: 'center' },
  scroll: { paddingHorizontal: 15, paddingTop: 10 },

  introCard: {
    borderWidth: 1, borderColor: 'rgba(242,192,120,0.35)',
    backgroundColor: 'rgba(34,27,12,0.55)', borderRadius: 11, padding: 12, marginBottom: 12,
  },
  introTxt: { fontFamily: bodyFont, fontSize: 11.5, lineHeight: 17, color: 'rgba(238,242,236,0.9)' },
  progress: { marginTop: 8, fontFamily: bodyFontHeavy, fontSize: 9.5, letterSpacing: 1.5, color: '#f2c078' },

  empty: { marginTop: 20, textAlign: 'center', fontFamily: bodyFont, fontSize: 11.5, lineHeight: 17, letterSpacing: 0.5, color: 'rgba(143,184,155,0.65)' },

  card: {
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.18)',
    backgroundColor: 'rgba(10,20,13,0.72)', borderRadius: 12, padding: 12, marginBottom: 11,
  },
  cardDone: { borderColor: 'rgba(57,255,106,0.4)' },
  qHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qNum: { fontFamily: monoFont, fontSize: 6, fontWeight: '900', letterSpacing: 1.6, color: 'rgba(143,184,155,0.6)' },
  doneChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  doneTxt: { fontFamily: monoFont, fontSize: 5.4, fontWeight: '900', letterSpacing: 1, color: '#05130a' },

  prompt: { marginTop: 6, fontFamily: bodyFontBold, fontSize: 13, lineHeight: 18, letterSpacing: 0.3, color: colors.fg },
  helper: { marginTop: 4, fontFamily: bodyFont, fontSize: 11, lineHeight: 16, color: 'rgba(143,184,155,0.75)' },

  opts: { marginTop: 9, gap: 5 },
  opt: { borderWidth: 1, borderColor: 'rgba(143,184,155,0.28)', borderRadius: 9, paddingVertical: 9, paddingHorizontal: 11 },
  optOn: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.13)' },
  optTxt: { fontFamily: bodyFontBold, fontSize: 11, letterSpacing: 1, color: 'rgba(238,242,236,0.85)' },
  optTxtOn: { color: colors.primary },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  currency: { fontFamily: monoFont, fontSize: 15, fontWeight: '900', color: colors.accent },
  priceInput: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(57,255,106,0.32)', borderRadius: 9,
    paddingHorizontal: 11, paddingVertical: 9, color: colors.fg,
    fontFamily: monoFont, fontSize: 13, fontWeight: '900', letterSpacing: 1,
    backgroundColor: 'rgba(10,15,10,0.6)',
  },
  perMonth: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 1.2, color: 'rgba(143,184,155,0.7)' },

  noteInput: {
    marginTop: 8, minHeight: 62, textAlignVertical: 'top',
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.28)', borderRadius: 9, padding: 9,
    color: colors.fg, fontFamily: monoFont, fontSize: 8, lineHeight: 12.5,
    backgroundColor: 'rgba(10,15,10,0.6)',
  },

  saveBtn: { marginTop: 10, fontFamily: bodyFontHeavy, fontSize: 10.5, letterSpacing: 1.4, color: colors.primary },
  saveOff: { color: 'rgba(143,184,155,0.4)' },

  foot: { marginTop: 4, textAlign: 'center', fontFamily: monoFont, fontSize: 8.5, lineHeight: 13, letterSpacing: 1, color: 'rgba(143,184,155,0.55)' },

  back: {
    position: 'absolute', top: 58, left: 16, width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.2, borderColor: 'rgba(143,184,155,0.4)', backgroundColor: 'rgba(10,17,12,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
});
