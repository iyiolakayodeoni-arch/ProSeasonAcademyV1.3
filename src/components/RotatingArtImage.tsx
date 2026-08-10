import React, { useEffect, useState } from 'react';
import { Image, ImageProps, ImageSourcePropType, StyleProp, ImageStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

/**
 * A quiet visual slideshow for the academy's photographic plates. Keep the
 * first source relevant to the screen; the remaining sources are optional
 * alternates. Images crossfade rather than snapping, and a single source is
 * rendered exactly like a normal Image. `blurRadius` lets a surface soften
 * the plate (e.g. the sign-in backdrop) so foreground content reads clearly.
 */
export default function RotatingArtImage({
  sources,
  intervalMs = 10_000,
  style,
  resizeMode = 'cover',
  blurRadius,
}: {
  sources: ImageSourcePropType | ImageSourcePropType[];
  intervalMs?: number;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageProps['resizeMode'];
  blurRadius?: number;
}) {
  const choices = Array.isArray(sources) ? sources : [sources];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (choices.length < 2) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % choices.length), intervalMs);
    return () => clearInterval(timer);
  }, [choices.length, intervalMs]);

  const current = choices[index];
  const previous = choices[(index - 1 + choices.length) % choices.length];
  if (choices.length < 2 || index === 0)
    return <Image source={current} style={style} resizeMode={resizeMode} blurRadius={blurRadius} />;

  return (
    <>
      <Image source={previous} style={style} resizeMode={resizeMode} blurRadius={blurRadius} />
      <Animated.Image
        key={`art-${index}`}
        entering={FadeIn.duration(900)}
        source={current}
        style={style}
        resizeMode={resizeMode}
        blurRadius={blurRadius}
      />
    </>
  );
}
