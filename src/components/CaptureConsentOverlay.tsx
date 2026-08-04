import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { useMatchWatcher } from '../data/matchWatcher';
import { colors, monoFont } from '../theme';

/**
 * A visible hand-off before Android's protected MediaProjection prompt.
 *
 * The operating-system consent dialog is the only place a player can grant
 * capture access. This layer intentionally has no approve/dismiss action:
 * it tells the player what is happening while that dialog is being opened,
 * and remains up until the watcher receives its first frame.
 */
export default function CaptureConsentOverlay() {
  const watcher = useMatchWatcher();
  const visible = watcher.available && watcher.status === 'arming';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.scrim} pointerEvents="auto">
        <View style={styles.card}>
          <View style={styles.eyebrowRow}>
            <View style={styles.dot} />
            <Text style={styles.eyebrow}>THE EYE · CONSENT REQUIRED</Text>
          </View>
          <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
          <Text style={styles.title}>ANDROID IS OPENING THE SCREEN-CAPTURE PROMPT</Text>
          <Text style={styles.copy}>
            Look for Android’s “Start now” permission panel. Nothing is captured until you approve it. The Eye only reads the match score and recording starts when you begin the match.
          </Text>
          <View style={styles.rule} />
          <Text style={styles.foot}>IF NO SYSTEM PANEL APPEARS, WAIT A MOMENT — THEN TRY ARM THE EYE AGAIN.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(3, 8, 5, 0.88)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 390, borderWidth: 1, borderColor: colors.primary, borderRadius: 18, backgroundColor: '#0c1710', padding: 22, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 24, elevation: 12 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  eyebrow: { color: colors.primary, fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  spinner: { marginVertical: 22 },
  title: { color: '#f0f7f1', fontFamily: monoFont, fontSize: 16, fontWeight: '900', lineHeight: 23, letterSpacing: 0.25, textAlign: 'center' },
  copy: { marginTop: 14, color: '#b4c5b8', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  rule: { height: 1, backgroundColor: 'rgba(57,255,106,0.22)', marginVertical: 17 },
  foot: { color: '#91a895', fontFamily: monoFont, fontSize: 8, fontWeight: '800', lineHeight: 13, letterSpacing: 0.5, textAlign: 'center' },
});
