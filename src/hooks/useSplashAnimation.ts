import { useEffect, useMemo, useRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { useTrailLoop } from './useTrailLoop';

// Animated TextInput renders a reanimated shared value as live text
// (the % readout) without React re-renders.
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export const LOOP_PATH_LENGTH = 260; // svg pathLength for the winding trail

type Options = {
  /** total bar duration in ms (default 2300) */
  duration?: number;
  /** optional gate — bar won't pass 90% until this resolves (fonts, auth check…) */
  waitFor?: Promise<unknown>;
  /** called once when the bar is complete AND the gate resolved */
  onComplete?: () => void;
};

/**
 * Drives the splash screen's progress bar + % readout.
 * The logo trail loop itself comes from useTrailLoop (shared with Sign-In).
 */
export function useSplashAnimation({ duration = 2300, waitFor, onComplete }: Options = {}) {
  const progress = useSharedValue(0);
  const completed = useRef(false);
  const trail = useTrailLoop({ pathLength: LOOP_PATH_LENGTH, drawMs: 1600, eraseMs: 1600 });

  const fireComplete = () => {
    if (!completed.current) {
      completed.current = true;
      onComplete?.();
    }
  };

  useEffect(() => {
    let cancelled = false;
    // fill quickly to 90%, then hold until the gate resolves
    progress.value = withTiming(0.9, { duration: duration * 0.85 });
    const gate = waitFor ?? Promise.resolve();
    Promise.all([gate, new Promise((r) => setTimeout(r, duration))]).then(() => {
      if (cancelled) return;
      progress.value = withTiming(1, { duration: 300 }, (finished) => {
        if (finished) runOnJS(fireComplete)();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimation(progress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, waitFor]);

  // bar fill (scaled from the left)
  const animatedFillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  // live percentage text
  const pctProps = useAnimatedProps<TextInputProps>(() => ({
    text: `${Math.round(progress.value * 100)}%`,
    defaultValue: '0%',
  }));

  return useMemo(
    () => ({
      AnimatedTextInput,
      animatedFillStyle,
      pctProps,
      loopProps: trail.loopProps,
      glowStyle: trail.glowStyle,
      progress,
    }),
    [animatedFillStyle, pctProps, trail.loopProps, trail.glowStyle, progress],
  );
}
