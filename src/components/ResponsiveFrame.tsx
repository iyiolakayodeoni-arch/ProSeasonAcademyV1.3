// ResponsiveFrame — the premium "stage" wrapping the ProSeason Academy app
// on web. Behavior across tiers:
//   - Phones/phablets: full-bleed (no chrome, no fake device) → identical to
//     the mobile experience users already know.
//   - Tablets (landscape/iPad): the app fills the window with comfortable
//     side gutters so cards/text don't stretch absurdly wide.
//   - Laptops/desktops: a centered premium "device-frame" card with soft
//     halo and a tiny status dot, surrounded by ambient gradient backdrop.
//   - TVs / 10-foot (>=2400px or coarse pointer + large screen): larger
//     type/hit targets, a first-key "TV MODE" hint, and a bigger frame.
// On iOS/Android native this is a no-op (full-screen flex), so the existing
// native behavior/layout is preserved.

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useLayoutInfo, ResponsiveContext } from '../hooks/useResponsive';

interface Props {
  children?: React.ReactNode;
}

// Inject the global web stylesheet exactly once.
let cssInjected = false;
function ensureGlobalCSS() {
  if (cssInjected) return;
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('psa-global-css')) {
    cssInjected = true;
    return;
  }
  // CSS lives in a TS string module so Metro doesn't need a CSS loader.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GLOBAL_CSS } = require('../web/globalCss');
  const style = document.createElement('style');
  style.id = 'psa-global-css';
  style.type = 'text/css';
  style.appendChild(document.createTextNode(GLOBAL_CSS || ''));
  document.head.appendChild(style);

  const ensureMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };
  ensureMeta(
    'viewport',
    'width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover, user-scalable=yes',
  );
  ensureMeta('theme-color', '#0a0f0a');
  ensureMeta('apple-mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  ensureMeta('mobile-web-app-capable', 'yes');
  ensureMeta(
    'description',
    'ProSeason Academy — premium football coaching on any device: phone, tablet, laptop, desktop and TV.',
  );

  // Ensure the page title is set for browser tabs / PWAs.
  if (document && !document.title) document.title = 'ProSeason Academy';

  cssInjected = true;
}

export default function ResponsiveFrame({ children }: Props) {
  const info = useLayoutInfo();

  useEffect(() => {
    ensureGlobalCSS();
  }, []);

  // Native: don't wrap at all → existing behavior, zero layout risk.
  if (Platform.OS !== 'web') {
    return (
      <ResponsiveContext.Provider value={info}>
        <View style={styles.nativeRoot}>{children}</View>
      </ResponsiveContext.Provider>
    );
  }

  const { bp, w, h } = info;

  // Decide frame geometry per breakpoint.
  const { frameStyle, stageClass } = useMemo(() => {
    const cls = ['psa-stage'];
    let st: any;
    if (bp === 'phone') {
      cls.push('psa-stage--handset');
      st = { width: '100%', maxWidth: '100%', height: '100dvh', borderRadius: 0 };
    } else if (bp === 'phablet') {
      cls.push('psa-stage--handset');
      st = {
        width: Math.min(w - 0, w),
        maxWidth: 560,
        height: '100dvh',
        borderRadius: 0,
      };
    } else if (bp === 'tablet') {
      cls.push('psa-stage--tablet');
      st = {
        width: Math.min(w - 48, 900),
        maxWidth: 900,
        height: Math.min(h - 48, 1200),
        borderRadius: 28,
      };
    } else if (bp === 'laptop') {
      st = {
        width: info.frameWidth,
        maxWidth: 480,
        height: Math.min(h - 56, 1024),
        borderRadius: 44,
      };
    } else if (bp === 'desktop') {
      st = {
        width: info.frameWidth,
        maxWidth: 520,
        height: Math.min(h - 72, 1120),
        borderRadius: 48,
      };
    } else {
      // tv
      cls.push('psa-stage--tv');
      st = {
        width: info.frameWidth,
        maxWidth: 700,
        height: Math.min(h - 120, 1280),
        borderRadius: 40,
      };
    }
    return { frameStyle: st, stageClass: cls.join(' ') };
  }, [bp, w, h, info.frameWidth]);

  return (
    <ResponsiveContext.Provider value={info}>
      <div className={stageClass}>
        <div className="psa-frame" style={frameStyle}>
          <View style={styles.appContainer}>{children}</View>
        </div>
      </div>
    </ResponsiveContext.Provider>
  );
}

const styles = StyleSheet.create({
  nativeRoot: { flex: 1, backgroundColor: '#0a0f0a' },
  appContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0f0a',
    overflow: 'hidden',
  },
});
