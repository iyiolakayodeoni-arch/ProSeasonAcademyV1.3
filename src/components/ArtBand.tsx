import React from 'react';
import { ImageSourcePropType, StyleSheet, View, ViewStyle } from 'react-native';
import PhotoVeil from './PhotoVeil';
import RotatingArtImage from './RotatingArtImage';

// ─────────────────────────────────────────────────────────────────────────
// ARTBAND — the shared photographic header/strip every screen reuses so the
// whole app reads as one world. A landscape art plate (all plates are shot
// at 1376×768) cropped to a band, melted into the page with PhotoVeil, with
// optional overlay content (title text, chips, stats) pinned bottom-left.
//
// Rules (DESIGN_SYSTEM): one photo per surface, veil does the blending —
// never a hard edge or a boxed "banner"; overlay text is the headline, never
// paragraphs; the warm kiss stays whisper-quiet.
// ─────────────────────────────────────────────────────────────────────────

export const ART_ASPECT = 1376 / 768;

type Props = {
  /** One plate, or a themed set that gently crossfades every 10 seconds. */
  source: ImageSourcePropType | ImageSourcePropType[];
  /** render width of the band (usually the screen/column width) */
  width: number;
  /** band height — default 176 */
  height?: number;
  /** crop bias: pixels to lift the frame (negative reveals more sky); if
      omitted the frame is vertically centered on the overflow */
  lift?: number;
  /** quiet warm floodlight accent, canvas coords — off by default? no: warm
      kiss upper-right is the house default; pass null to disable */
  warmAt?: { x: number; y: number; r: number } | null;
  /** 'deep' melts into the page (header bands); 'light' for inside cards */
  veil?: 'deep' | 'light';
  grain?: number;
  children?: React.ReactNode;
  /** wrapper style for overlay children (default: pinned bottom-left) */
  overlayStyle?: ViewStyle | ViewStyle[];
  style?: ViewStyle;
};

export default function ArtBand({
  source,
  width,
  height = 176,
  lift,
  warmAt,
  veil = 'deep',
  grain,
  children,
  overlayStyle,
  style,
}: Props) {
  const frameH = width / ART_ASPECT;
  // default: show the lower two-thirds of the plate (subjects live low)
  const top = lift !== undefined ? lift : -(frameH - height) * 0.62;
  const warm = warmAt === undefined ? { x: width * 0.78, y: height * 0.24, r: width * 0.5 } : warmAt;
  return (
    <View style={[{ width, height, overflow: 'hidden' }, style]}>
      <RotatingArtImage
        sources={source}
        style={{ position: 'absolute', left: 0, top, width, aspectRatio: ART_ASPECT }}
        resizeMode="cover"
      />
      <PhotoVeil width={width} height={height} weight={veil} warmAt={warm ?? undefined} grain={grain} />
      {children ? <View style={[styles.overlay, overlayStyle]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
});
