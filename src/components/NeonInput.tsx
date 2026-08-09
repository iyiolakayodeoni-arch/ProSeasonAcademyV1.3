import React from 'react';
import { TextInput, TextInputProps, StyleSheet, Platform } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, bodyFontStrong } from '../theme';

const BLUR = 'rgba(143,184,155,0.18)';
type Props = TextInputProps;

export default function NeonInput(props: Props) {
  const focus = useSharedValue(0);
  const wrapStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [BLUR, colors.primary]),
    shadowOpacity: 0.08 + focus.value * 0.32,
    shadowRadius: 8 + focus.value * 12,
    transform: [{ scale: 1 + focus.value * 0.004 }],
  }));
  return (
    <Animated.View style={[styles.wrap, wrapStyle, Platform.OS === 'web' && focus.value === 1 ? ({ outline: 'none' } as any) : null]}>
      <TextInput
        placeholderTextColor="rgba(143,184,155,0.42)"
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        style={[styles.input, props.style]}
        onFocus={(e) => { focus.value = withTiming(1, { duration: 180 }); props.onFocus?.(e); }}
        onBlur={(e) => { focus.value = withTiming(0, { duration: 220 }); props.onBlur?.(e); }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 20, 14, 0.72)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontFamily: bodyFontStrong,
    fontSize: 13.5,
    letterSpacing: 0.4,
    color: colors.fg,
  },
});
