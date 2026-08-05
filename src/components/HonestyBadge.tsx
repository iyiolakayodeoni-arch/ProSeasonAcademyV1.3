import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { checkHonesty, HonestyOptions } from '../data/honestyGuard';
import { colors, monoFont, bodyFontBold } from '../theme';

interface Props {
  text: string;
  options?: HonestyOptions;
  defaultNote?: string;
  coachId?: string;
}

/**
 * Visual honesty indicator for reflection forms.
 * Gives immediate coach-voiced feedback when a player types keyboard mash,
 * repetitive spam, or evasion shortcuts, and confirms when their
 * reflection is substantive and honest.
 */
export default function HonestyBadge({ text, options, defaultNote, coachId }: Props) {
  const clean = String(text ?? '').trim();
  if (clean.length === 0) {
    return (
      <Text style={styles.emptyTxt}>
        {defaultNote ?? 'BE HONEST · NO EXCUSES, NO AI WILL EVER WRITE THIS FOR YOU'}
      </Text>
    );
  }

  const res = checkHonesty(clean, { ...options, coachId });
  if (!res.ok) {
    return (
      <View style={styles.warnWrap}>
        <Text style={styles.warnTxt}>⚠️ [HONESTY CHECK] {res.feedback}</Text>
      </View>
    );
  }

  return (
    <Text style={styles.okTxt}>
      {defaultNote
        ? `✓ [HONEST LEDGER] ${defaultNote}`
        : `✓ [HONEST LEDGER] ${res.wordCount} WORDS (${res.charCount} CHARS) · REFLECTION VERIFIED`}
    </Text>
  );
}

const styles = StyleSheet.create({
  emptyTxt: {
    fontFamily: monoFont,
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: 'rgba(143,184,155,0.65)',
    marginTop: 6,
  },
  warnWrap: {
    marginTop: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(242,192,120,0.5)',
    backgroundColor: 'rgba(242,192,120,0.08)',
  },
  warnTxt: {
    fontFamily: bodyFontBold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.accent,
  },
  okTxt: {
    fontFamily: monoFont,
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: colors.primary,
    marginTop: 6,
  },
});
