// Web shim for expo-keep-awake. Uses the Screen Wake Lock API if present.
import { useEffect } from 'react';

let wakeLock: any = null;

async function acquire() {
  try {
    if ('wakeLock' in navigator) {
      // @ts-ignore
      wakeLock = await (navigator as any).wakeLock.request('screen');
    }
  } catch {
    /* noop */
  }
}
function release() {
  try { wakeLock?.release?.(); } catch { /* noop */ }
  wakeLock = null;
}

export function useKeepAwake() {
  useEffect(() => {
    acquire();
    const onVis = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      release();
    };
  }, []);
}
export function activateKeepAwake() { acquire(); }
export function deactivateKeepAwake() { release(); }
export default function KeepAwake() { useKeepAwake(); return null; }
