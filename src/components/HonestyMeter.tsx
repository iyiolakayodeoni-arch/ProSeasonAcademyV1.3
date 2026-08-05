import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { checkHonesty, HonestyOptions } from '../data/honestyGuard';
import { EvidenceMeter } from './StatReadout';
import { colors, monoFont, gradeColor, role, bodyFont } from '../theme';

// ─────────────────────────────────────────────────────────────
// HONESTY METER — the honesty check, made visible.
//
// Principle P6. HonestyBadge did the right work but reported it as a line of
// 9.5px mono ("12 WORDS (74 CHARS) · REFLECTION VERIFIED"). The honesty
// check is the product's most distinctive mechanism — it deserves its most
// distinctive visual. This renders the real checkHonesty() score as a
// calibrated meter (green = substantive, amber = thin, red = evasion), keeps
// the word/char counts as honest provenance, and carries the coach feedback.
//
// The meter reflects the SAME judgment HonestyBadge used — no new heuristic.
// Drop-in compatible: same props, so swapping <HonestyBadge/> → <HonestyMeter/>
// is a one-line change at any call site.
// ─────────────────────────────────────────────────────────────

interface Props {
  text: string;
  options?: HonestyOptions;
  defaultNote?: string;
  coachId?: string;
}

export default function HonestyMeter({ text, options, defaultNote, coachId }: Props) {
  const clean = String(text ?? '').trim();

  if (clean.length === 0) {
    // empty — a quiet, neutral invitation, never a punishment
    return (
      <View style={styles.wrap}>
        <Text style={styles.empty}>
          {defaultNote ?? 'BE HONEST · NO EXCUSES · NO AI WILL EVER WRITE THIS FOR YOU'}
        </Text>
      </View>
    );
  }

  const res = checkHonesty(clean, { ...options, coachId });
  const scorePct = Math.round(res.score * 100);

  if (!res.ok) {
    // evasion / nonsense is a genuine failure the product flags — so the meter
    // wears explicit danger red, distinct from the neutral "not yet" of gradeColor.
    return (
      <View style={[styles.wrap, styles.warnWrap]}>
        <View style={styles.topRow}>
          <Text style={styles.warnTag}>⚠ HONESTY CHECK</Text>
          <Text style={[styles.pct, { color: role.danger }]}>{scorePct}%</Text>
        </View>
        <EvidenceMeter value={scorePct} tint={role.danger} height={6} />
        <Text style={styles.feedback}>{res.feedback}</Text>
        <Text style={styles.prov}>{res.wordCount} WORDS · {res.charCount} CHARS</Text>
      </View>
    );
  }

  // passed — green, with the honest provenance underneath
  return (
    <View style={[styles.wrap, styles.okWrap]}>
      <View style={styles.topRow}>
        <Text style={styles.okTag}>✓ HONEST LEDGER</Text>
        <Text style={[styles.pct, { color: gradeColor(scorePct) }]}>{scorePct}%</Text>
      </View>
      <EvidenceMeter value={scorePct} tint={gradeColor(scorePct)} height={6} />
      <Text style={styles.okNote}>
        {defaultNote ?? 'SUBSTANTIVE REFLECTION VERIFIED — THE LEDGER ACCEPTS IT'}
      </Text>
      <Text style={styles.prov}>{res.wordCount} WORDS · {res.charCount} CHARS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  warnWrap: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(224,96,92,0.4)',
    backgroundColor: 'rgba(224,96,92,0.06)',
  },
  okWrap: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.4)',
    backgroundColor: 'rgba(57,255,106,0.06)',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  warnTag: { fontFamily: monoFont, fontSize: 8, fontWeight: '900', letterSpacing: 1.4, color: role.danger },
  okTag: { fontFamily: monoFont, fontSize: 8, fontWeight: '900', letterSpacing: 1.4, color: colors.primary },
  pct: { fontFamily: monoFont, fontSize: 9, fontWeight: '900' },
  feedback: { marginTop: 6, fontFamily: bodyFont, fontSize: 12, lineHeight: 16.5, color: colors.accent },
  okNote: { marginTop: 6, fontFamily: bodyFont, fontSize: 12, lineHeight: 16.5, color: colors.primary },
  prov: { marginTop: 4, fontFamily: monoFont, fontSize: 6, letterSpacing: 1, color: 'rgba(143,184,155,0.6)' },
  empty: { fontFamily: monoFont, fontSize: 7, letterSpacing: 1.2, color: 'rgba(143,184,155,0.62)' },
});
