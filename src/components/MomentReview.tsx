import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { EyeIcon, XMarkIcon } from './Icons';
import HonestyBadge from './HonestyBadge';
import { Coach } from '../data/coaches';
import {
  KeyMomentKind,
  MOMENT_WINDOWS,
  MOMENT_MIN_ANSWER,
  PLAYER_MOMENTS,
  TaggedMoment,
  momentQuestion,
} from '../data/scanMoments';
import { sfx } from '../audio/sound';
import { colors, monoFont } from '../theme';

// ─────────────────────────────────────────────────────────────
// MOMENT REVIEW — the shared key-moment block of the MATCH SCAN.
//
// Used in both places the ritual runs:
//   · the 5-match BASELINE trial (tags + questions, NO lesson —
//     the data builds the psychology profile), and
//   · every STAGE scan (tags + questions, then THE LESSON).
//
// The player tags the moments that made or broke the match;
// EYE-tagged goal markers arrive pre-seeded by the caller with
// `auto: true`. Each tag earns ONE guiding question from the
// coach — he asks, the player reasons, nobody gets handed a
// verdict. Nothing completes until every tag has a window and
// an honest answer (see momentsComplete()).
// ─────────────────────────────────────────────────────────────

const MAX_MOMENTS = 5;

let keySeq = 1;

export function makeMoment(kind: KeyMomentKind, partial?: Partial<TaggedMoment>): TaggedMoment {
  return {
    id: `km-${Date.now().toString(36)}-${(keySeq++).toString(36)}`,
    kind,
    when: null,
    answer: '',
    ...partial,
  };
}

type Props = {
  coach: Coach;
  moments: TaggedMoment[];
  onChange: (next: TaggedMoment[]) => void;
  /** framing line under the label (baseline copy vs stage copy) */
  cue: string;
};

export default function MomentReview({ coach, moments, onChange, cue }: Props) {
  const [showBank, setShowBank] = useState(false);
  const coachFirst = coach.name.split(' ')[0];

  const tag = (kind: KeyMomentKind) => {
    if (moments.length >= MAX_MOMENTS) return;
    sfx('pop');
    onChange([...moments, makeMoment(kind)]);
  };
  const patch = (id: string, next: Partial<TaggedMoment>) =>
    onChange(moments.map((m) => (m.id === id ? { ...m, ...next } : m)));
  const remove = (id: string) => {
    sfx('tap');
    onChange(moments.filter((m) => m.id !== id));
  };

  // how many earlier moments share the kind — rotates the question bank
  const nthOfKind = (m: TaggedMoment) =>
    moments.filter((x) => x.kind === m.kind && x.id !== m.id && moments.indexOf(x) < moments.indexOf(m)).length;

  return (
    <View>
      <Text style={styles.cue}>{cue}</Text>

      {/* ── tag grid — the player IS the scanner's second lens ── */}
      <View style={styles.tagHeader}>
        <Text style={styles.fieldLabel}>TAG THE MOMENTS THAT MADE OR BROKE IT ({moments.length}/{MAX_MOMENTS})</Text>
        {moments.length > 0 && (
          <Pressable onPress={() => setShowBank((v) => !v)} hitSlop={6}>
            <Text style={styles.moreTags}>{showBank ? 'HIDE THE TAG BANK' : '+ ANOTHER MOMENT'}</Text>
          </Pressable>
        )}
      </View>
      {(showBank || moments.length === 0) && (
        <View style={styles.chipRow}>
          {PLAYER_MOMENTS.map((m) => (
            <Pressable key={m} onPress={() => tag(m)} disabled={moments.length >= MAX_MOMENTS} style={[styles.chip, moments.length >= MAX_MOMENTS && { opacity: 0.4 }]}>
              <Text style={styles.chipTxt}>+ {m}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {moments.length === 0 && (
        <Text style={styles.emptyHint}>
          THE SCORE IS NOT THE MATCH. ONE TAG IS ENOUGH TO START — THE THROW-IN YOU TOOK LIKE IT OWED YOU MONEY COUNTS TOO.
        </Text>
      )}

      {/* ── one card per tag: window + the coach's question + your answer ── */}
      {moments.map((m, i) => {
        const qIndex = nthOfKind(m);
        return (
          <Animated.View key={m.id} entering={FadeInDown.duration(260)} style={[styles.momentCard, m.auto && styles.momentCardEye]}>
            <View style={styles.momentTop}>
              <View style={[styles.kindPill, m.auto && styles.kindPillEye]}>
                {m.auto && <EyeIcon size={9} color="#0a0f0a" />}
                <Text style={[styles.kindPillTxt, m.auto && { color: '#0a0f0a' }]}>
                  {m.auto ? `EYE TAGGED · ${m.kind}` : m.kind}
                </Text>
              </View>
              <Pressable onPress={() => remove(m.id)} hitSlop={8}>
                <XMarkIcon size={10} color="rgba(143,184,155,0.6)" />
              </Pressable>
            </View>
            {m.auto && m.eyeNote ? <Text style={styles.eyeNote}>{m.eyeNote}</Text> : null}

            <View style={styles.whenRow}>
              {MOMENT_WINDOWS.map((w) => (
                <Pressable
                  key={w.key}
                  onPress={() => patch(m.id, { when: m.when === w.key ? null : w.key })}
                  style={[styles.whenChip, m.when === w.key && styles.whenChipOn]}
                >
                  <Text style={[styles.whenChipTxt, m.when === w.key && styles.whenChipTxtOn]}>{w.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.qLabel}>
              {coachFirst.toUpperCase()} ASKS ABOUT THIS {m.auto ? 'MARKER' : 'MOMENT'}:
            </Text>
            <Text style={styles.qText}>“{momentQuestion(coach.id, m.kind, qIndex)}”</Text>
            <TextInput
              value={m.answer}
              onChangeText={(t) => patch(m.id, { answer: t.slice(0, 160) })}
              placeholder="THINK FIRST. THEN ANSWER — YOUR WORDS."
              placeholderTextColor={colors.muted}
              style={styles.input}
              multiline
              maxLength={160}
            />
            <HonestyBadge
              text={m.answer}
              options={{ minLength: MOMENT_MIN_ANSWER, minWords: 2 }}
              defaultNote={`MOMENT ${i + 1} · SPEAK TRUTH, NOT EXCUSES`}
              coachId={coach.id}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  cue: { marginTop: 10, fontFamily: monoFont, fontSize: 6.7, lineHeight: 12.4, fontWeight: '800', letterSpacing: 1.2, color: colors.warm },

  tagHeader: { marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  fieldLabel: { flex: 1, fontFamily: monoFont, fontSize: 6.2, fontWeight: '800', letterSpacing: 1.8, color: colors.muted },
  moreTags: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', letterSpacing: 1.3, color: colors.primary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(242,192,120,0.3)', backgroundColor: 'rgba(10,15,10,0.5)',
  },
  chipTxt: { fontFamily: monoFont, fontSize: 6.2, fontWeight: '800', letterSpacing: 1.2, color: colors.muted },
  emptyHint: { marginTop: 10, fontFamily: monoFont, fontSize: 5.8, lineHeight: 10.5, fontWeight: '700', letterSpacing: 1.1, color: 'rgba(143,184,155,0.5)' },

  momentCard: {
    marginTop: 10, borderWidth: 1.1, borderColor: 'rgba(242,192,120,0.4)', borderRadius: 12,
    backgroundColor: 'rgba(22,18,8,0.55)', padding: 11,
  },
  momentCardEye: { borderColor: 'rgba(57,255,106,0.4)', backgroundColor: 'rgba(10,18,12,0.6)' },
  momentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kindPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: 'rgba(242,192,120,0.55)', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3.5, backgroundColor: 'rgba(242,192,120,0.07)',
  },
  kindPillEye: { backgroundColor: colors.primary, borderColor: colors.primary },
  kindPillTxt: { fontFamily: monoFont, fontSize: 6.4, fontWeight: '900', letterSpacing: 1.5, color: colors.accent },
  eyeNote: { marginTop: 5, fontFamily: monoFont, fontSize: 5.6, fontWeight: '700', letterSpacing: 1.1, color: colors.muted },

  whenRow: { flexDirection: 'row', gap: 6, marginTop: 9 },
  whenChip: {
    flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(57,255,106,0.2)', backgroundColor: 'rgba(10,15,10,0.5)',
  },
  whenChipOn: { borderColor: colors.primary, backgroundColor: 'rgba(57,255,106,0.12)' },
  whenChipTxt: { fontFamily: monoFont, fontSize: 5.8, fontWeight: '800', letterSpacing: 1.1, color: colors.muted },
  whenChipTxtOn: { color: colors.primary },

  qLabel: { marginTop: 11, fontFamily: monoFont, fontSize: 5.8, fontWeight: '800', letterSpacing: 1.8, color: colors.muted },
  qText: { marginTop: 5, fontSize: 10.5, lineHeight: 15.5, fontStyle: 'italic', fontWeight: '700', color: '#e7d9bd' },
  input: {
    marginTop: 8, borderWidth: 1, borderColor: 'rgba(242,192,120,0.35)', backgroundColor: '#0a0f0a',
    borderRadius: 10, color: colors.fg, fontFamily: monoFont, fontSize: 10.5, lineHeight: 15,
    padding: 9, minHeight: 50, textAlignVertical: 'top',
  },
  count: { marginTop: 4, fontFamily: monoFont, fontSize: 5.4, letterSpacing: 1, textAlign: 'right', color: colors.muted },
});
