// Onliversity PM — the installer bridge.
//
// Downloads an APK to app-private cache, verifies its SHA-256 against the
// manifest (defense against a tampered host/hijacked URL), and hands it to the
// system installer via a FileProvider content:// URI. The system ALWAYS shows
// the "Install unknown app" prompt — silent install is impossible on standard
// Android, and that is the OS, not us.
//
// Uses the SDK-57 expo-file-system File API (File.createDownloadTask with
// onProgress). The native side (InstallerModule) reads the file from the same
// cache dir; the FileProvider is configured to cover it. If the module is
// missing (Expo Go / web / iOS) every call fails soft so the store shows an
// honest "not available here" instead of crashing.

import { NativeModules } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';

const Native = NativeModules.OnliversityInstaller as
  | {
      canRequestInstalls(): Promise<boolean>;
      openInstallPermissionSettings(): Promise<boolean>;
      sha256OfFile(filename: string): Promise<string>;
      contentUriForApk(filename: string): Promise<string>;
      installedVersionCodeOf(pkg: string): Promise<number>;
    }
  | undefined;

/** is the native installer available (dev build on Android)? */
export function installerAvailable(): boolean {
  return !!Native;
}

/** does this PM have the right to install unknown apps? */
export async function canRequestInstalls(): Promise<boolean> {
  if (!Native) return false;
  try {
    return await Native.canRequestInstalls();
  } catch {
    return false;
  }
}

/** send the user to the per-app "install unknown apps" / restricted-settings screen */
export async function openInstallPermissionSettings(): Promise<boolean> {
  if (!Native) return false;
  try {
    return await Native.openInstallPermissionSettings();
  } catch {
    return false;
  }
}

/** installed versionCode of another Onliversity app by package (-1 if absent) */
export async function installedVersionCodeOf(pkg: string): Promise<number> {
  if (!Native) return -1;
  try {
    return await Native.installedVersionCodeOf(pkg);
  } catch {
    return -1;
  }
}

/** download an APK to cache with progress; returns the filename the native side hashes */
export async function downloadApk(
  url: string,
  filename: string,
  onProgress?: (ratio: number) => void,
): Promise<string> {
  const destination = new File(Paths.cache, filename);
  const task = File.createDownloadTask(url, destination, {
    onProgress: (p: any) => {
      const total = Number(p?.totalBytes ?? 0);
      const written = Number(p?.bytesWritten ?? 0);
      if (onProgress && total > 0) onProgress(written / total);
    },
  });
  const file = await task.downloadAsync();
  if (!file) throw new Error('download did not complete');
  return filename;
}

/** SHA-256 (hex) of a downloaded file — compared against the manifest */
export async function sha256Of(filename: string): Promise<string | null> {
  if (!Native) return null;
  try {
    return (await Native.sha256OfFile(filename)).toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Hand the APK to the system installer. ALWAYS shows the system install prompt;
 * returns true if the install intent launched (not whether the user accepted).
 */
export async function installApk(filename: string): Promise<boolean> {
  if (!Native) return false;
  try {
    const contentUri = await Native.contentUriForApk(filename);
    // FLAG_ACTIVITY_NEW_TASK (0x10000000) | FLAG_GRANT_READ_URI_PERMISSION (0x1)
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      type: 'application/vnd.android.package-archive',
      flags: 0x10000001,
    });
    return true;
  } catch {
    return false;
  }
}

/** remove a downloaded APK after install (keep cache clean) */
export async function purgeDownload(filename: string): Promise<void> {
  try {
    await new File(Paths.cache, filename).delete();
  } catch {
    /* best effort */
  }
}
