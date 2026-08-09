// Responsive breakpoint helpers for the ProSeason Academy web/tablet/TV shell.
// Screens/components call useBreakpoint() to adapt layouts. Numbers are chosen
// to feel natural on real device classes:
//   'phone'   < 640px  — the original mobile layout (pixel-perfect behavior)
//   'phablet' 640–899 — small tablets / large phones / split-screen
//   'tablet'  900–1279 — iPads, small laptops, landscape tablets
//   'laptop'  1280–1599 — standard laptops (MacBook 13", 14")
//   'desktop' 1600–2399 — large monitors / ultrawides
//   'tv'      2400+ or coarse-pointer large screen — 10-foot (TV/console) mode
//
// A cheap device-capability hook (isTouch, isCoarse, canHover, prefersReduced)
// is included so layouts can decide to use hit-train-sized buttons on TV or
// show hover polish on a laptop mouse without Platform.OS splits everywhere.

import { useEffect, useState } from 'react';
import { PixelRatio, useWindowDimensions, Platform } from 'react-native';

export type Breakpoint = 'phone' | 'phablet' | 'tablet' | 'laptop' | 'desktop' | 'tv';

export interface BreakpointInfo {
  bp: Breakpoint;
  /** true on phone AND phablet — i.e. "handset" flows. */
  isHandset: boolean;
  /** true on tablet and larger — "wide" layout tier. */
  isWide: boolean;
  /** true laptop+. */
  isLaptopUp: boolean;
  /** true on tv (2400+ px or coarse pointer + large screen). */
  isTV: boolean;
  /** width in CSS pixels */
  w: number;
  /** height in CSS pixels */
  h: number;
  /** density */
  dpr: number;
  // capabilities (meaningful on web; safe defaults on native)
  canHover: boolean;
  isCoarsePointer: boolean;
  isTouch: boolean;
  prefersReducedMotion: boolean;
  /** max content width for the main "phone/tablet" canvas */
  frameWidth: number;
  /** font scale multiplier so TV/10-foot reads across the room */
  fontScale: number;
  /** minimum touch target (bigger on TV, standard on phones/tablets) */
  hitSlop: number;
}

function pickBp(w: number, coarseAndLarge: boolean): Breakpoint {
  if (coarseAndLarge && w >= 1400) return 'tv';
  if (w >= 2400) return 'tv';
  if (w >= 1600) return 'desktop';
  if (w >= 1280) return 'laptop';
  if (w >= 900) return 'tablet';
  if (w >= 640) return 'phablet';
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

export function useBreakpoint(): BreakpointInfo {
  const { width, height } = useWindowDimensions();
  const [caps, setCaps] = useState(() => measure());

  // On web, watch for media-query changes (e.g. user adds a mouse, docks window,
  // rotates a 2-in-1). On native this is a no-op.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const update = () => setCaps(measure());
    window.addEventListener('resize', update);
    const queries: MediaQueryList[] = [];
    const subs: Array<() => void> = [];
    const mqs = [
      '(hover: hover)',
      '(pointer: coarse)',
      '(pointer: fine)',
      '(prefers-reduced-motion: reduce)',
    ];
    for (const q of mqs) {
      try {
        const m = window.matchMedia(q);
        queries.push(m);
        const handler = () => update();
        if (m.addEventListener) m.addEventListener('change', handler);
        else m.addListener(handler);
        subs.push(() => {
          if (m.removeEventListener) m.removeEventListener('change', handler);
          else m.removeListener(handler);
        });
      } catch {
        /* ignore */
      }
    }
    return () => {
      window.removeEventListener('resize', update);
      subs.forEach((s) => s());
    };
  }, []);

  const coarseAndLarge = caps.isCoarsePointer && width >= 1400;
  const bp = pickBp(width, coarseAndLarge);

  // Frame width: on phones fill the screen; on phablet/tablet cap to a comfortable
  // reading width; on laptop+ use a "phone-like premium device" frame so the existing
  // mobile-first screens remain visually balanced with side chrome.
  let frameWidth: number;
  if (bp === 'phone') frameWidth = width;
  else if (bp === 'phablet') frameWidth = Math.min(width - 32, 560);
  else if (bp === 'tablet') frameWidth = Math.min(width - 64, 720);
  else if (bp === 'laptop') frameWidth = Math.min(width - 80, 460);
  else if (bp === 'desktop') frameWidth = Math.min(width - 120, 500);
  else frameWidth = Math.min(width - 220, 640); // tv

  // Font scale & hit targets grow for TV/10-foot mode.
  let fontScale = 1;
  let hitSlop = 48;
  if (bp === 'phablet') fontScale = 1.05;
  else if (bp === 'tablet') fontScale = 1.1;
  else if (bp === 'laptop') fontScale = 1;
  else if (bp === 'desktop') fontScale = 1.05;
  else if (bp === 'tv') {
    fontScale = 1.35;
    hitSlop = 72;
  }

  return {
    bp,
    isHandset: bp === 'phone' || bp === 'phablet',
    isWide: bp === 'tablet' || bp === 'laptop' || bp === 'desktop' || bp === 'tv',
    isLaptopUp: bp === 'laptop' || bp === 'desktop' || bp === 'tv',
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
