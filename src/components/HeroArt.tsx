import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// ─────────────────────────────────────────────────────────────────────────
// HERO ART — the 3D illustration that explains the app at a glance:
// a football at the centre of a glowing infinity loop, ringed by the four
// stages of the ritual (PLAY → WATCH → WRITE → CARRY ONE LESSON).
//
// The artwork is a single rendered PNG (assets/art/hero-loop-3d.png); the
// only motion added here is a gentle, infinite float + glow so the static
// image still feels alive on screen without any 3D runtime code.
// ─────────────────────────────────────────────────────────────────────────

const HERO_ART = require('../../assets/art/hero-loop-3d.png');

const WEB = Platform.OS === 'web';

export default function HeroArt({ width }: { width: number }) {
  // infinite, gentle up/down drift
  const float = useSharedValue(0);
  // soft breathing glow
  const glow = useSharedValue(0.45);

  React.useEffect(() => {
    float.value = withRepeat(
      withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    glow.value = withRepeat(
      withTiming(0.9, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [float, glow]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 + float.value * 12 }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  const size = width;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {/* ambient green glow breathing behind the image */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          glowStyle,
          {
            width: size * 0.82,
            height: size * 0.82,
            borderRadius: size * 0.41,
          },
        ]}
      />
      <Animated.View
        entering={FadeInDown.duration(800)}
        style={[floatStyle, { width: size, height: size }]}
      >
        <Image
          source={HERO_ART}
          style={{ width: size, height: size }}
          resizeMode="contain"
          // on web, hint the browser to smooth-scale the large PNG
          {...(WEB ? ({ renderToHardwareTextureAndroid: true } as object) : {})}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(57,255,106,0.18)',
    shadowColor: '#39FF6A',
    shadowOpacity: 0.55,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
    // android glow
    elevation: 16,
  },
});
