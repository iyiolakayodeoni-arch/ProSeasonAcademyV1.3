import React, { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import LandingScreen from './src/screens/LandingScreen';
import HomeFeedScreen from './src/screens/HomeFeedScreen';
import { colors } from './src/theme';

// Font names MUST match the strings used in src/theme.ts
// (displayFont = 'Anton_400Regular', bodyFont = 'Barlow_500Medium', etc.)
const FONTS = {
  Anton_400Regular: require('@expo-google-fonts/anton/400Regular/Anton_400Regular.ttf'),
  Barlow_400Regular: require('@expo-google-fonts/barlow/400Regular/Barlow_400Regular.ttf'),
  Barlow_500Medium: require('@expo-google-fonts/barlow/500Medium/Barlow_500Medium.ttf'),
  Barlow_500Medium_Italic: require('@expo-google-fonts/barlow/500Medium_Italic/Barlow_500Medium_Italic.ttf'),
  Barlow_600SemiBold: require('@expo-google-fonts/barlow/600SemiBold/Barlow_600SemiBold.ttf'),
  Barlow_700Bold: require('@expo-google-fonts/barlow/700Bold/Barlow_700Bold.ttf'),
  Barlow_800ExtraBold: require('@expo-google-fonts/barlow/800ExtraBold/Barlow_800ExtraBold.ttf'),
};

export default function App() {
  const [fontsLoaded] = useFonts(FONTS);
  const [screen, setScreen] = useState<'landing' | 'feed'>('landing');

  // Web: paint the page dark behind the app so there is no white flash.
  useEffect(() => {
    if (Platform.OS === 'web') {
      const doc = document as any;
      doc.documentElement.style.backgroundColor = colors.bg;
      doc.body.style.backgroundColor = colors.bg;
    }
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {screen === 'landing' ? (
        <LandingScreen onEnter={() => setScreen('feed')} />
      ) : (
        <HomeFeedScreen />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
