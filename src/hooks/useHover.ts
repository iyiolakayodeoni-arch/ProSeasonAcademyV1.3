// useHover — pointer-hover state for Pressables, web-first.
// On native (touch) there is no hover, so the bind object is empty and the
// hook simply reports `hovered === false`. Screens pair this with a shared
// value + withTiming so hover feedback eases in/out instead of snapping —
// the same instrument tempo the rest of the product breathes on.

import { useMemo, useState } from 'react';
import { Platform } from 'react-native';

export interface HoverBind {
  onHoverIn?: () => void;
  onHoverOut?: () => void;
}

export function useHover(): { hovered: boolean; bind: HoverBind } {
  const [hovered, setHovered] = useState(false);

  const bind = useMemo<HoverBind>(() => {
    if (Platform.OS !== 'web') return {};
    return {
      onHoverIn: () => setHovered(true),
      onHoverOut: () => setHovered(false),
    };
  }, []);

  return { hovered, bind };
}

export default useHover;
