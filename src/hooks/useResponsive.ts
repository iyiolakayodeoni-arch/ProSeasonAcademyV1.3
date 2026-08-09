// Combined responsive hook for screen components.
// Exposes breakpoint info + full web app content width that screens should
// target. On mobile, this is full-bleed with comfortable padding. On wide
// screens (tablets, laptops, desktops), it expands into a full desktop canvas
// up to 1380px width with multi-column grids!

import { createContext, useContext } from 'react';
import { useBreakpoint, BreakpointInfo } from './useBreakpoint';

export interface LayoutInfo extends BreakpointInfo {
  /** The max content width screens should fill. */
  contentWidth: number;
  /** Pad the sides of scroll content by this much on the current tier. */
  contentPad: number;
  /** True ONLY on small phone viewports (< 768px). False on tablet / laptop / desktop. */
  isPhoneColumn: boolean;
  /** Whether the screen is a 2-column or 3-column desktop layout */
  isMultiColumn: boolean;
}

const defaults: LayoutInfo = {
  bp: 'phone',
  isHandset: true,
  isWide: false,
  isLaptopUp: false,
  isDesktopUp: false,
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
  contentPad: 16,
  isPhoneColumn: true,
  isMultiColumn: false,
};

const Ctx = createContext<LayoutInfo>(defaults);

export const ResponsiveContext = Ctx;

export function useResponsive(): LayoutInfo {
  return useContext(Ctx);
}

/** Hook used by the ResponsiveFrame / WebShell provider to compute layout info. */
export function useLayoutInfo(): LayoutInfo {
  const bp = useBreakpoint();

  let contentWidth: number;
  let contentPad: number;
  let isPhoneColumn: boolean;
  let isMultiColumn: boolean;

  if (bp.bp === 'phone') {
    contentWidth = bp.w;
    contentPad = 16;
    isPhoneColumn = true;
    isMultiColumn = false;
  } else if (bp.bp === 'phablet') {
    contentWidth = Math.min(bp.w, 680);
    contentPad = 20;
    isPhoneColumn = true;
    isMultiColumn = false;
  } else if (bp.bp === 'tablet') {
    contentWidth = Math.min(bp.w - 48, 960);
    contentPad = 24;
    isPhoneColumn = false;
    isMultiColumn = true;
  } else if (bp.bp === 'laptop') {
    contentWidth = Math.min(bp.w - 64, 1280);
    contentPad = 32;
    isPhoneColumn = false;
    isMultiColumn = true;
  } else if (bp.bp === 'desktop') {
    contentWidth = Math.min(bp.w - 80, 1380);
    contentPad = 36;
    isPhoneColumn = false;
    isMultiColumn = true;
  } else {
    // tv
    contentWidth = Math.min(bp.w - 120, 1500);
    contentPad = 40;
    isPhoneColumn = false;
    isMultiColumn = true;
  }

  return { ...bp, contentWidth, contentPad, isPhoneColumn, isMultiColumn };
}
