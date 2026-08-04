import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { checkForUpdate, UpdateInfo } from '../data/updateChecker';
import { openInPackageManager, PSA_APP_ID } from '../data/packageManager';
import { sfx } from '../audio/sound';
import { colors, monoFont } from '../theme';

// ─────────────────────────────────────────────────────────────
// UPDATE BANNER — shown when a newer build exists.
//
// Tapping it opens the ONLIVERSITY PACKAGE MANAGER on this app's update
// screen; if the PM isn't installed, it falls back to the direct APK
// download. Either way the member gets the update — no Play Store needed.
// ─────────────────────────────────────────────────────────────

export default function UpdateBanner() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    void checkForUpdate().then(setInfo);
  }, []);

  if (!info?.available) return null;

  const open = () => {
    sfx('whoosh');
    void openInPackageManager(PSA_APP_ID, info.apkUrl);
  };

  return (
    <Pressable onPress={open} hitSlop={6}>
      <View style={styles.wrap}>
        <View style={styles.row}>
          <Text style={styles.tag}>UPDATE {info.latest} IS OUT</Text>
          <Text style={styles.open}>OPEN IN ONLIVERSITY ›</Text>
        </View>
        {!!info.note && <Text style={styles.body}>{info.note}</Text>}
        <Text style={styles.hint}>
          YOU'RE ON {info.current}. THE PM INSTALLS IT IN ONE TAP — OR A DIRECT DOWNLOAD IF YOU DON'T HAVE IT YET.
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 9,
    borderWidth: 1.2,
    borderColor: 'rgba(242,192,120,0.55)',
    borderRadius: 12,
    backgroundColor: 'rgba(38,30,12,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { fontFamily: monoFont, fontSize: 8, fontWeight: '900', letterSpacing: 1.6, color: colors.accent },
  open: { fontFamily: monoFont, fontSize: 7, fontWeight: '900', letterSpacing: 1.2, color: colors.accent },
  body: { marginTop: 5, fontFamily: monoFont, fontSize: 7, lineHeight: 11, letterSpacing: 0.6, color: '#e6d9bf' },
  hint: { marginTop: 6, fontFamily: monoFont, fontSize: 5.8, lineHeight: 9, letterSpacing: 1, color: 'rgba(143,184,155,0.6)' },
});
