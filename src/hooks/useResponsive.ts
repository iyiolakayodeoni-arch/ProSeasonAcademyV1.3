// Combined responsive hook for screen components.
// Exposes breakpoint info + the "content" max width that a screen should
// target inside the ResponsiveFrame. On phone/phablet, this is literally
// the viewport (full-bleed). Inside the desktop/TV frame it's the frame
// interior width, so screens can lay out a wider reading column instead
// of locking every panel to 430px.

import { createContext, useContext } from 'react';
import { useBreakpoint, BreakpointInfo } from './useBreakpoint';

export interface LayoutInfo extends BreakpointInfo {
  /** The width screens should fill. Use this instead of viewport width
   *  for content caps. */
  contentWidth: number;
  /** Pad the sides of scroll content by this much on the current tier. */
  contentPad: number;
  /** True when screens should render a phone-tight single column (i.e.
   *  on phone/phablet and inside the desktop/TV "device frame"). */
  isPhoneColumn: boolean;
}

const defaults: LayoutInfo = {
  bp: 'phone',
  isHandset: true,
  isWide: false,
  isLaptopUp: false,
  isTV: false,
  w: 390,
  h: 844,
  dpr: 2,
  canHover: false,
  isCoarsePointer: true,
  isTouch: true,
  prefersReducedMotion: false,
  frameWidth: 390,
  fontScale: 1,
  hitSlop: 48,
  contentWidth: 390,
  contentPad: 20,
  isPhoneColumn: true,
};

const Ctx = createContext<LayoutInfo>(defaults);

export const ResponsiveContext = Ctx;

export function useResponsive(): LayoutInfo {
  return useContext(Ctx);
}

/** Hook used by the ResponsiveFrame provider to compute the layout info. */
export function useLayoutInfo(): LayoutInfo {
  const bp = useBreakpoint();

  let contentWidth: number;
  let contentPad: number;
  let isPhoneColumn: boolean;

  if (bp.bp === 'phone') {
    contentWidth = bp.w;
    contentPad = 20;
    isPhoneColumn = true;
  } else if (bp.bp === 'phablet') {
    contentWidth = Math.min(bp.w - 32, 560);
    contentPad = 24;
    isPhoneColumn = false;
  } else if (bp.bp === 'tablet') {
    // Tablet: full-width reading column, no fake phone frame
    contentWidth = Math.min(bp.w - 64, 880);
    contentPad = 32;
    isPhoneColumn = false;
  } else if (bp.bp === 'laptop') {
    // Laptop: centered premium "phone" preview
    contentWidth = Math.min(bp.w - 80, 460);
    contentPad = 20;
    isPhoneColumn = true;
  } else if (bp.bp === 'desktop') {
    contentWidth = Math.min(bp.w - 120, 500);
    contentPad = 24;
    isPhoneColumn = true;
  } else {
    // tv
    contentWidth = Math.min(bp.w - 220, 640);
    contentPad = 36;
    isPhoneColumn = true;
  }

  return { ...bp, contentWidth, contentPad, isPhoneColumn };
}
