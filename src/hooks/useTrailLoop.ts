import { useEffect } from 'react';
import {
  Easing,
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

export type TrailLoop = {
  /** attach to an AnimatedPath via animatedProps */
  loopProps: any;
  /** subtle opacity pulse for glow elements (reanimated style) */
  glowStyle: any;
  pathLength: number;
  dash: SharedValue<number>;
};

type Options = {
  /** nominal svg pathLength for dash math */
  pathLength: number;
  /** ms for the draw-in half of the loop */
  drawMs?: number;
  /** ms for the erase-out half of the loop */
  eraseMs?: number;
  /** stagger the loop (ms) so multiple trails don't move in sync */
  phaseOffsetMs?: number;
};

/**
 * The winding-journey-trail loop: a path draws itself in, then erases itself
 * out, forever. Shared by the splash crest, the sign-in header logo and the
 * per-coach trail inside each CoachCard.
 */
export function useTrailLoop({
  pathLength,
  drawMs = 2400,
  eraseMs = 2400,
  phaseOffsetMs = 0,
}: Options): TrailLoop {
  const dash = useSharedValue(pathLength);
  const glow = useSharedValue(0.8);

  useEffect(() => {
    dash.value = withDelay(
      phaseOffsetMs,
      withRepeat(
        withSequence(
          withTiming(0, { duration: drawMs, easing: Easing.inOut(Easing.quad) }),
          withTiming(-pathLength, { duration: eraseMs, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.8, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(dash);
      cancelAnimation(glow);
    };
  }, [dash, glow, pathLength, drawMs, eraseMs, phaseOffsetMs]);

  const loopProps = useAnimatedProps(() => ({ strokeDashoffset: dash.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return { loopProps, glowStyle, pathLength, dash };
}
