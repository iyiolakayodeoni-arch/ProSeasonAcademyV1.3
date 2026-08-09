// ResponsiveFrame — premium web shell. True responsive, no 430px cage.
import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useLayoutInfo, ResponsiveContext } from '../hooks/useResponsive';
import { tierZoom } from '../hooks/useBreakpoint';

interface Props { children?: React.ReactNode; }

let cssInjected = false;
function ensureGlobalCSS() {
  if (cssInjected) return;
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('psa-global-css')) { cssInjected = true; return; }
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
  ensureMeta('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover, user-scalable=yes');
  ensureMeta('theme-color', '#050a06');
  ensureMeta('apple-mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  ensureMeta('mobile-web-app-capable', 'yes');
  ensureMeta('description', 'ProSeason Academy — Premium football coaching & 6-month development platform for FC players.');
  if (document && !document.title) document.title = 'ProSeason Academy — Premium Football Coaching';
  cssInjected = true;
}

export default function ResponsiveFrame({ children }: Props) {
  const info = useLayoutInfo();
  useEffect(() => { ensureGlobalCSS(); }, []);

  // 10-foot & large-monitor scaling. TV viewers sit ~3m away, so the whole
  // frame is visually enlarged (CSS zoom on #root) while layout math runs in
  // the scaled-down box that useBreakpoint exposes — exactly like browser
  // zoom, applied automatically per device tier. The data attribute lets the
  // global CSS shrink #root's own box by the same factor so nothing
  // overflows the physical viewport.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const zoom = tierZoom(info.bp);
    document.documentElement.style.setProperty('--psa-zoom', String(zoom));
    document.documentElement.setAttribute('data-psa-tier', info.bp);
  }, [info.bp]);

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
  nativeRoot: { flex: 1, backgroundColor: '#050a06' },
  // height comes from the shell's min-height, not a raw 100vh — under the
  // TV zoom a bare 100vh would render taller than the physical viewport
  webAppRoot: { flex: 1, width: '100%', backgroundColor: '#050a06' } as any,
});
