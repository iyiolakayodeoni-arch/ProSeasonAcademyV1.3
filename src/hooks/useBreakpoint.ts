// Responsive breakpoint helpers for the ProSeason Academy Web App.
// Numbers align to real device classes:
//   'phone'   < 768px  — mobile phones
//   'tablet'  768–1023px — tablets and split screens
//   'laptop'  1024–1439px — standard laptops and desktops
//   'desktop' 1440px+ — widescreen monitors / desktops
//   'tv'      2400px+ or coarse-pointer large screen — 10-foot mode

import { useEffect, useState } from 'react';
import { PixelRatio, useWindowDimensions, Platform } from 'react-native';

export type Breakpoint = 'phone' | 'phablet' | 'tablet' | 'laptop' | 'desktop' | 'tv';

export interface BreakpointInfo {
  bp: Breakpoint;
  /** true on phone (< 768px) */
  isHandset: boolean;
  /** true on tablet and larger (>= 768px) — wide layout tier */
  isWide: boolean;
  /** true laptop+ (>= 1024px) */
  isLaptopUp: boolean;
  /** true desktop+ (>= 1440px) */
  isDesktopUp: boolean;
  /** true on tv (2400+ px or coarse pointer + large screen) */
  isTV: boolean;
  /** width in CSS pixels */
  w: number;
  /** height in CSS pixels */
  h: number;
  /** density */
  dpr: number;
  // capabilities
  canHover: boolean;
  isCoarsePointer: boolean;
  isTouch: boolean;
  prefersReducedMotion: boolean;
  /** max content width for the main canvas */
  frameWidth: number;
  /** font scale multiplier */
  fontScale: number;
  /** touch target slop */
  hitSlop: number;
}

function pickBp(w: number, h: number, coarseAndLarge: boolean, coarse: boolean): Breakpoint {
  // A phone turned sideways is still a phone. Coarse pointer + low viewport
  // + modest width means landscape handset — it must keep the phone column,
  // never the tablet split (which assumes portrait-ish heights).
  if (coarse && h < 500 && w < 950) return w >= 540 ? 'phablet' : 'phone';
  if (coarseAndLarge && w >= 1400) return 'tv';
  if (w >= 2400) return 'tv';
  if (w >= 1440) return 'desktop';
  if (w >= 1024) return 'laptop';
  if (w >= 768) return 'tablet';
  if (w >= 540) return 'phablet';
  return 'phone';
}

function webMq(query: string): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return window.matchMedia?.(query)?.matches ?? false;
}

function measure(): {
  w: number;
  h: number;
  dpr: number;
  canHover: boolean;
  isCoarsePointer: boolean;
  isTouch: boolean;
  prefersReducedMotion: boolean;
} {
  const dims = require('react-native').Dimensions;
  const { width, height } = dims.get('window');
  const dpr = PixelRatio.get() ?? 1;
  const canHover = Platform.OS === 'web' ? webMq('(hover: hover) and (pointer: fine)') : false;
  const coarse = Platform.OS === 'web' ? webMq('(pointer: coarse)') : true;
  const touch =
    Platform.OS === 'web' ? ('ontouchstart' in (typeof window !== 'undefined' ? window : ({} as any))) : true;
  const reduced = Platform.OS === 'web' ? webMq('(prefers-reduced-motion: reduce)') : false;
  return { w: width, h: height, dpr, canHover, isCoarsePointer: coarse, isTouch: touch, prefersReducedMotion: reduced };
}

/** Visual scale applied per tier on web (see ResponsiveFrame + globalCss).
    TVs sit ~3m away, big monitors ~1m — the frame is enlarged like browser
    zoom while layout math runs in the *scaled-down* CSS box below. */
export function tierZoom(bp: Breakpoint): number {
  if (bp === 'tv') return 1.35;
  if (bp === 'desktop') return 1.08;
  return 1;
}

export function useBreakpoint(): BreakpointInfo {
  const { width: rawW, height: rawH } = useWindowDimensions();
  const [caps, setCaps] = useState(() => measure());

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const update = () => setCaps(measure());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const coarseAndLarge = caps.isCoarsePointer && rawW >= 1400;
  const bp = pickBp(rawW, rawH, coarseAndLarge, caps.isCoarsePointer);

  // The tier is chosen from the RAW viewport, but when the frame is visually
  // enlarged (zoom > 1) the app must lay out inside the scaled-down CSS box,
  // exactly like browser zoom: expose the effective dimensions.
  const zoom = Platform.OS === 'web' ? tierZoom(bp) : 1;
  const width = Math.round(rawW / zoom);
  const height = Math.round(rawH / zoom);

  let frameWidth: number;
  if (bp === 'phone') frameWidth = width;
  else if (bp === 'phablet') frameWidth = Math.min(width, 680);
  else if (bp === 'tablet') frameWidth = Math.min(width - 48, 960);
  else if (bp === 'laptop') frameWidth = Math.min(width - 64, 1280);
  else if (bp === 'desktop') frameWidth = Math.min(width - 80, 1400);
  else frameWidth = Math.min(width - 120, 1500); // tv

  let fontScale = 1;
  let hitSlop = 48;
  if (bp === 'tablet') fontScale = 1.02;
  else if (bp === 'laptop') fontScale = 1.05;
  else if (bp === 'desktop') fontScale = 1.08;
  else if (bp === 'tv') {
    fontScale = 1.25;
    hitSlop = 64;
  }

  const isHandset = bp === 'phone' || bp === 'phablet';
  const isWide = !isHandset;
  const isLaptopUp = bp === 'laptop' || bp === 'desktop' || bp === 'tv';
  const isDesktopUp = bp === 'desktop' || bp === 'tv';

  return {
    bp,
    isHandset,
    isWide,
    isLaptopUp,
    isDesktopUp,
    isTV: bp === 'tv',
    w: width,
    h: height,
    dpr: caps.dpr,
    canHover: caps.canHover,
    isCoarsePointer: caps.isCoarsePointer,
    isTouch: caps.isTouch,
    prefersReducedMotion: caps.prefersReducedMotion,
    frameWidth,
    fontScale,
    hitSlop,
  };
}
