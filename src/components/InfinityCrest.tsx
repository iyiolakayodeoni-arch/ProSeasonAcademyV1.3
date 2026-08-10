import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { useTrailLoop } from '../hooks/useTrailLoop';
import { colors } from '../theme';

// ─────────────────────────────────────────────────────────────────────────
// THE INFINITY CREST — the signature mark of SPLASH v4.
//
// A single lemniscate that keeps drawing itself in and out, forever. It is
// the whole idea of the academy in one glyph: the season loops, the review
// never ends, growth compounds. Two strokes — a faint base line that anchors
// it and a bright living trail that earns its length — plus a soft halo so
// it reads as a lit sign rather than a thin vector.
//
// The living pulse of the glow comes from CSS (psa-crest-pulse) on web;
// native gets its own under-stroke halo instead, because RN shadows on web
// collapse into a rectangular box-shadow that would read as a dark plate
// behind the mark.
// ─────────────────────────────────────────────────────────────────────────

const WEB = Platform.OS === 'web';

// nominal path length — stroke dash math is normalized via the SVG
// `pathLength` attribute (forwarded at runtime; the TS types lag behind, so
// it is cast, exactly as CoachCard does for its trail).
const CREST_PATH_LENGTH = 260;

// a smooth horizontal lemniscate in a 120×60 viewBox, centred on (60,30)
const CREST_D =
  'M60 30 C60 10 30 10 30 30 C30 50 60 50 60 30 C60 50 90 50 90 30 C90 10 60 10 60 30 Z';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  /** width of the mark (height is half, the 2:1 lemniscate) */
  size?: number;
};

export default function InfinityCrest({ size = 200 }: Props) {
  // the crest owns its own trail so every screen just drops it in
  const { loopProps } = useTrailLoop({ pathLength: CREST_PATH_LENGTH, drawMs: 1700, eraseMs: 1700 });
  const w = size;
  const h = size * 0.5;

  return (
    <View
      {...(WEB ? { className: 'psa-crest-pulse' } : {})}
      style={[styles.wrap, { width: w, height: h }]}
    >
      <Svg width={w} height={h} viewBox="0 0 120 60">
        {/* soft halo so the mark reads as a lit sign on native */}
        {!WEB && (
          <Path
            d={CREST_D}
            fill="none"
            stroke="rgba(57,255,106,0.32)"
            strokeWidth={13}
            strokeLinecap="round"
            {...({ pathLength: CREST_PATH_LENGTH } as object)}
          />
        )}
        {/* faint base line — the crest is always faintly visible */}
        <Path
          d={CREST_D}
          fill="none"
          stroke="rgba(57,255,106,0.26)"
          strokeWidth={2.5}
          strokeLinecap="round"
          {...({ pathLength: CREST_PATH_LENGTH } as object)}
        />
        {/* the living trail — draws on and off, forever */}
        <AnimatedPath
          d={CREST_D}
          fill="none"
          stroke={colors.primary}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${CREST_PATH_LENGTH} ${CREST_PATH_LENGTH}`}
          {...({ pathLength: CREST_PATH_LENGTH } as object)}
          animatedProps={loopProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // no box shadows here — see the file header. The glow lives in the SVG
    // under-stroke (native) and the CSS drop-shadow pulse (web) instead.
    backgroundColor: 'transparent',
  },
});
