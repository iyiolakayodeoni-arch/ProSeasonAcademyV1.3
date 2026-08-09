// WebAppChrome — web-only UI chrome that lives OUTSIDE the phone frame:
//  - A tiny "ProSeason • Web" badge top-left (hidden on small phones)
//  - A PWA "Install" button if the browser exposes beforeinstallprompt
//  - A subtle keyboard-shortcut legend on laptops/desktops
//  - A 10-foot/TV focus helper ("press any key") when coarse pointer + big screen
//
// On iOS/Android native this returns null so nothing extra ever renders.

import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Text, View, StyleSheet, Pressable } from 'react-native';
import { useBreakpoint } from '../hooks/useBreakpoint';

type Route = 'signin' | 'coach' | 'scan' | 'hub';

interface Props {
  visibleRoute: Route;
}

let cachedPromptEvent: any = null;

export default function WebAppChrome({ visibleRoute }: Props) {
  const bp = useBreakpoint();
  const [installable, setInstallable] = useState<any | null>(null);
  const [installed, setInstalled] = useState(false);
  const [tvHintSeen, setTvHintSeen] = useState(false);
  const [installHover, setInstallHover] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      cachedPromptEvent = e;
      setInstallable(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!bp.isTV || tvHintSeen) return;
    const dismiss = () => setTvHintSeen(true);
    window.addEventListener('keydown', dismiss, { once: true });
    window.addEventListener('pointerdown', dismiss, { once: true });
    return () => {
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('pointerdown', dismiss);
    };
  }, [bp.isTV, tvHintSeen]);

  const onInstall = async () => {
    if (!cachedPromptEvent) return;
    try {
      await cachedPromptEvent.prompt();
      const choice = await cachedPromptEvent.userChoice;
      if (choice?.outcome === 'accepted') {
        setInstalled(true);
        cachedPromptEvent = null;
        setInstallable(null);
      }
    } catch {
      /* no-op */
    }
  };

  const showChrome = Platform.OS === 'web' && !bp.isHandset;
  const showInstall = Platform.OS === 'web' && !!installable && !installed;
  const showLegend = Platform.OS === 'web' && bp.canHover && bp.isLaptopUp;
  const showTvHint = Platform.OS === 'web' && bp.isTV && !tvHintSeen;

  const routeLabel = useMemo(() => {
    switch (visibleRoute) {
      case 'signin': return 'Sign in';
      case 'coach': return 'Pick your coach';
      case 'scan': return 'Baseline';
      case 'hub': return 'Today';
      default: return '';
    }
  }, [visibleRoute]);

  if (!showChrome) return null;

  // Web-only CSS class names for backdrop-filter / hover polish so we stay
  // within React Native's typings.
  const badgeClass = 'psa-badge';
  const legendClass = 'psa-legend';
  const installClass = installHover ? 'psa-install-btn psa-install-btn--hover' : 'psa-install-btn';

  return (
    <>
      {/* Top-left brand + route badge */}
      <View
        style={[
          styles.badge,
          bp.isTV && { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 18 },
        ]}
        // className is honoured by react-native-web; native ignores it.
        {...({ className: badgeClass } as any)}
        pointerEvents="none"
      >
        <Text
          style={[
            styles.badgeBrand,
            bp.isTV && { fontSize: 16, letterSpacing: 3 },
          ]}
        >
          PROSEASON
        </Text>
        <Text style={[styles.badgeDot, bp.isTV && { fontSize: 18 }]}>•</Text>
        <Text style={[styles.badgeRoute, bp.isTV && { fontSize: 16 }]}>{routeLabel}</Text>
      </View>

      {/* Top-right PWA install button */}
      {showInstall && (
        <Pressable
          style={({ pressed }) => [
            styles.installBtn,
            installHover && styles.installBtnHover,
            pressed && styles.installBtnPressed,
            bp.isTV && { paddingVertical: 16, paddingHorizontal: 26, borderRadius: 16 },
          ]}
          onPress={onInstall}
          onHoverIn={() => setInstallHover(true)}
          onHoverOut={() => setInstallHover(false)}
          accessibilityRole="button"
          accessibilityLabel="Install ProSeason Academy as an app"
          {...({ className: installClass } as any)}
        >
          <Text style={[styles.installText, bp.isTV && { fontSize: 18 }]}>↓ Install App</Text>
        </Pressable>
      )}

      {/* Keyboard shortcut legend */}
      {showLegend && (
        <View
          style={styles.legend}
          {...({ className: legendClass } as any)}
          pointerEvents="none"
        >
          <Text style={styles.legendTitle}>Keyboard</Text>
          <Text style={styles.legendRow}><Key>TAB</Key> move focus</Text>
          <Text style={styles.legendRow}><Key>↵</Key> select</Text>
          <Text style={styles.legendRow}><Key>ESC</Key> back</Text>
        </View>
      )}

      {/* TV / 10-foot first-interaction hint */}
      {showTvHint && (
        <View style={styles.tvHint} pointerEvents="none">
          <Text style={styles.tvHintTitle}>PROSEASON • TV MODE</Text>
          <Text style={styles.tvHintSub}>Sit back. Press any key or tap to begin.</Text>
        </View>
      )}
    </>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return <Text style={styles.keyCap}>{children}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 18,
    left: 20,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 15, 10, 0.55)',
    borderColor: 'rgba(198,255,60,0.18)',
    borderWidth: 1,
  },
  badgeBrand: {
    color: '#c6ff3c',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  badgeDot: { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
  badgeRoute: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },

  installBtn: {
    position: 'absolute',
    top: 18,
    right: 20,
    zIndex: 30,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#c6ff3c',
    cursor: 'pointer',
  } as any,
  installBtnHover: { backgroundColor: '#d6ff6b' },
  installBtnPressed: { backgroundColor: '#b8ef2e' },
  installText: { color: '#0a0f0a', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  legend: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    zIndex: 30,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(10,15,10,0.55)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    gap: 4,
  },
  legendTitle: { color: '#c6ff3c', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 2 },
  legendRow: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  keyCap: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginRight: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  tvHint: {
    position: 'absolute',
    inset: 0,
    zIndex: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,8,10,0.65)',
  },
  tvHintTitle: { color: '#c6ff3c', fontSize: 44, fontWeight: '900', letterSpacing: 8 },
  tvHintSub: { color: 'rgba(255,255,255,0.8)', fontSize: 22, marginTop: 12, letterSpacing: 1 },
});
