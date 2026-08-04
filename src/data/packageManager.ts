import { Linking } from 'react-native';

// ─────────────────────────────────────────────────────────────
// ONLIVERSITY PACKAGE MANAGER — deep-link bridge.
//
// When ProSeasonAcademy (or any Onliversity app) has an update, it opens the
// Onliversity PM on that app's update screen via the custom scheme
// `onliversitypm://update?app=<id>`. If the PM isn't installed on the device,
// it falls back to the direct APK download (the existing self-update path) so
// nobody is ever blocked.
//
// We try openURL directly (not canOpenURL) because Android 11+ package
// visibility can make canOpenURL return false even when the PM IS installed;
// openURL rejects if nothing handles the scheme, which is what we fall back on.
// ─────────────────────────────────────────────────────────────

const PM_SCHEME = 'onliversitypm';

export async function openInPackageManager(
  appId: string,
  fallbackApkUrl?: string | null,
): Promise<boolean> {
  const deepLink = `${PM_SCHEME}://update?app=${encodeURIComponent(appId)}`;
  try {
    await Linking.openURL(deepLink);
    return true; // the PM opened
  } catch {
    // PM not installed → direct sideload, so the member is never stuck
    if (fallbackApkUrl) {
      try {
        await Linking.openURL(fallbackApkUrl);
      } catch {
        /* last resort: nothing we can do silently */
      }
    }
    return false;
  }
}

/** the app id ProSeasonAcademy uses in the catalog */
export const PSA_APP_ID = 'proseasonacademy';
