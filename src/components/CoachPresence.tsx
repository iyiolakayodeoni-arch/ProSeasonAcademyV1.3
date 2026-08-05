import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// COACH PRESENCE — the living halo that says a person is on the other end.
// Wraps the coach's circular avatar with a slow breathing glow and a
// heartbeat ring that expands and fades on a loop. Pure Reanimated — zero
// native deps, zero per-frame layout work. The motion is deliberately slow:
// a pulse, not a notification. This is the brand's "receipts not rewards"
// applied to presence — he is there because he is there, not to hook you.
// ─────────────────────────────────────────────────────────────────────────

type Props = {
  /** the avatar's diameter — the halo hugs it */
  size: number;
  color?: string;
  children: React.ReactNode;
};

export default function CoachPresence({ size, color = colors.primary, children }: Props) {
  const breath = useSharedValue(0);
  const heartbeat = useSharedValue(0);

  useEffect(() => {
    breath.value = withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }), -1, true);
    heartbeat.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.out(Easing.quad) }), -1, false);
  }, [breath, heartbeat]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + breath.value * 0.4,
    transform: [{ scale: 1 + breath.value * 0.05 }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - heartbeat.value),
    transform: [{ scale: 1 + heartbeat.value * 0.42 }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* breathing halo — the glow of the floodlight he stands under */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2 + 4,
            backgroundColor: 'rgba(57,255,106,0.12)',
            shadowColor: color,
            shadowOpacity: 0.85,
            shadowRadius: 13,
            shadowOffset: { width: 0, height: 0 },
          },
          haloStyle,
        ]}
      />
      {/* expanding ring — a heartbeat, not a notification */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: size / 2 + 4, borderWidth: 1.4, borderColor: color },
          ringStyle,
        ]}
      />
      {children}
    </View>
  );
}
