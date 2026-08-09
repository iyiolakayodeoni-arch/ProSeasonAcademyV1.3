// WebAppChrome — PWA installation & keyboard handling helper.
// Returns null visually so everything integrates into the real Web App header and UI.

import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';

let cachedPromptEvent: any = null;

export function usePwaInstall() {
  const [installable, setInstallable] = useState<boolean>(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      cachedPromptEvent = e;
      setInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const triggerInstall = async () => {
    if (!cachedPromptEvent) return;
    try {
      await cachedPromptEvent.prompt();
      const choice = await cachedPromptEvent.userChoice;
      if (choice?.outcome === 'accepted') {
        cachedPromptEvent = null;
        setInstallable(false);
      }
    } catch {
      /* no-op */
    }
  };

  return { canInstall: installable, triggerInstall };
}

export default function WebAppChrome(_props: { visibleRoute?: string }) {
  return null;
}
