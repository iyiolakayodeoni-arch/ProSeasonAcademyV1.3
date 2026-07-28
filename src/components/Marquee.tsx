import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// infinite horizontal ticker — content rendered twice; translateX loops
// one copy-width for a seamless wrap. Pure reanimated, no timers.
export default function Marquee({ children, pxPerSec = 42 }: { children: React.ReactNode; pxPerSec?: number }) {
  const [contentW, setContentW] = useState(0);
  const x = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== contentW) {
      setContentW(w);
      x.value = 0;
      x.value = withRepeat(
        withTiming(-w, { duration: (w / pxPerSec) * 1000, easing: Easing.linear }),
        -1,
        false,
      );
    }
  };

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={styles.clip}>
      <Animated.View style={[styles.row, style]}>
        <View onLayout={onLayout} style={styles.copy}>
          {children}
        </View>
        {contentW > 0 && <View style={[styles.copy, { width: contentW }]}>{children}</View>}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  row: { flexDirection: 'row' },
  copy: { flexDirection: 'row', alignItems: 'center' },
});
