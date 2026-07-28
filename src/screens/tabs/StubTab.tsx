import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import Animated, { FadeInUp } from 'react-native-reanimated';
import GridBackground from '../../components/GridBackground';
import { colors, monoFont } from '../../theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

// honest "next build" placeholder so the tab bar is complete today —
// community rooms + full settings ship from their approved designs next.
export default function StubTab({
  title,
  blurb,
  onSignOut,
}: {
  title: string;
  blurb: string;
  onSignOut?: () => void;
}) {
  return (
    <View style={styles.flex}>
      <GridBackground />
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <Animated.View entering={FadeInUp.duration(350)} style={styles.card}>
          <Text style={styles.kicker}>NEXT BUILD</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.blurb}>{blurb}</Text>
        </Animated.View>

        {onSignOut && (
          <Pressable onPress={onSignOut} style={styles.signOut}>
            <Text style={styles.signOutTxt}>SIGN OUT</Text>
          </Pressable>
        )}

        <Text style={styles.footVersion}>PROSEASONACADEMY · VERSION {APP_VERSION}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 22, paddingBottom: 16 },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.35)',
    borderRadius: 16,
    backgroundColor: 'rgba(15,26,19,0.8)',
    padding: 22,
    width: '100%',
    alignItems: 'center',
  },
  kicker: { fontFamily: monoFont, fontSize: 7, fontWeight: '800', letterSpacing: 3, color: colors.muted },
  title: { marginTop: 8, fontSize: 16, fontWeight: '900', letterSpacing: 2, color: colors.fg, textAlign: 'center' },
  blurb: { marginTop: 10, fontFamily: monoFont, fontSize: 8.5, lineHeight: 14, letterSpacing: 0.8, color: '#9db4a3', textAlign: 'center' },
  signOut: {
    marginTop: 22,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signOutTxt: { fontFamily: monoFont, fontSize: 8.5, fontWeight: '700', letterSpacing: 2, color: colors.muted },
  footVersion: { marginTop: 18, fontFamily: monoFont, fontSize: 6.3, letterSpacing: 2.6, color: 'rgba(143,184,155,0.4)' },
});
