// ResponsiveFrame — the Web App Shell wrapping the ProSeason Academy platform.
// Provides a genuine, responsive full-width web app container across:
//   - Mobile phones (< 768px): clean responsive layout with touch-friendly navigation.
//   - Tablets (768px–1023px): spacious layout with multi-column capabilities.
//   - Laptops & Desktops (1024px+): full desktop web app experience with integrated
//     top navigation, wide dashboard grids, and responsive content canvas.
// On native iOS/Android this is a no-op (full-screen flex), preserving native behavior.

import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useLayoutInfo, ResponsiveContext } from '../hooks/useResponsive';

interface Props {
  children?: React.ReactNode;
}

let cssInjected = false;
function ensureGlobalCSS() {
  if (cssInjected) return;
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('psa-global-css')) {
    cssInjected = true;
    return;
  }
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
  ensureMeta('theme-color', '#070c08');
  ensureMeta('apple-mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  ensureMeta('mobile-web-app-capable', 'yes');
  ensureMeta(
    'description',
    'ProSeason Academy — Football coaching, match reviews, and 6-month player development web app for FC console players.',
  );

  if (document && !document.title) document.title = 'ProSeason Academy';

  cssInjected = true;
}

export default function ResponsiveFrame({ children }: Props) {
  const info = useLayoutInfo();

  useEffect(() => {
    ensureGlobalCSS();
  }, []);

  // Native: clean flex container
  if (Platform.OS !== 'web') {
    return (
      <ResponsiveContext.Provider value={info}>
        <View style={styles.nativeRoot}>{children}</View>
      </ResponsiveContext.Provider>
    );
  }

  return (
    <ResponsiveContext.Provider value={info}>
      <div className="psa-web-shell">
        <View style={styles.webAppRoot}>{children}</View>
      </div>
    </ResponsiveContext.Provider>
  );
}

const styles = StyleSheet.create({
  nativeRoot: { flex: 1, backgroundColor: '#070c08' },
  webAppRoot: {
    flex: 1,
    width: '100%',
    minHeight: '100vh',
    backgroundColor: '#070c08',
  } as any,
});
