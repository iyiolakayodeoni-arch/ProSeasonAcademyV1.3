import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, bodyFontStrong } from '../theme';

const BLUR_BORDER = 'rgba(57,255,106,0.3)';

type Props = TextInputProps;

// Dark rounded field with a glowing green border that smooth-fades
// brighter on focus (no instant snap) and back on blur.
export default function NeonInput(props: Props) {
  const focus = useSharedValue(0);

  const wrapStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [BLUR_BORDER, colors.primary]),
    shadowOpacity: 0.06 + focus.value * 0.4,
    shadowRadius: 4 + focus.value * 10,
  }));

  return (
    <Animated.View style={[styles.wrap, wrapStyle]}>
      <TextInput
        placeholderTextColor="rgba(143,184,155,0.45)"
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        style={[styles.input, props.style]}
        onFocus={(e) => {
          focus.value = withTiming(1, { duration: 180 });
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          focus.value = withTiming(0, { duration: 220 });
          props.onBlur?.(e);
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1.2,
    borderRadius: 10,
    backgroundColor: 'rgba(15,26,19,0.85)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  input: {
    height: 54,
    paddingHorizontal: 16,
    fontFamily: bodyFontStrong,
    fontSize: 14,
    letterSpacing: 0.5,
    color: colors.fg,
  },
});
