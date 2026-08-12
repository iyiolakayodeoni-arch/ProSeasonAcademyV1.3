// ─────────────────────────────────────────────────────────────
// UPDATE CHECKER — polls Supabase for the latest version.
//
// On boot the app checks config.latest_version against its own
// version (from app.json). When the live version is newer, it
// returns the APK download URL so the app can show an update
// prompt. No Play Store, no account — just a direct download link
// hosted on GitHub Releases, the same way modded APK sites work.
//
// The two config rows that drive this live in Supabase:
//   config.latest_version   = "1.4.0"
//   config.latest_apk_url   = "https://github.com/.../releases/..."
//
// Update them from the Founder Desk or SQL Editor. The app reads
// them; you never push a new build just to tell people about one.
// ─────────────────────────────────────────────────────────────

import Constants from 'expo-constants';
import { supabase } from './supabaseClient';

export interface UpdateInfo {
  /** the version THIS device is running (from app.json) */
  current: string;
  /** the latest version available for download */
  latest: string;
  /** true when the live version is strictly newer */
  available: boolean;
  /** direct APK download URL — tap to download, then sideload */
  apkUrl: string | null;
  /** human line shown in the prompt */
  note: string | null;
  /** when the latest config was last touched */
  checkedAt: number;
}

let cache: UpdateInfo | null = null;

/**
 * Compare two semver-like strings (e.g. "1.3.0" vs "1.4.0").
 * Returns positive when B is newer, zero when equal, negative
 * when A is newer (shouldn't happen in normal use).
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pb[i] || 0) - (pa[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** call once on boot — cheap, hits one config table */
export async function checkForUpdate(): Promise<UpdateInfo> {
  const current = Constants.expoConfig?.version ?? '1.3.0';


  try {
    const { data, error } = await supabase
      .from('config')
      .select('key, value')
      .in('key', ['latest_version', 'latest_apk_url', 'latest_update_note']);

    if (error) throw error;

    const cfg = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    const latest = cfg.latest_version ?? current;
    const apkUrl = cfg.latest_apk_url ?? null;
    const note = cfg.latest_update_note ?? null;
    const available = compareVersions(current, latest) > 0;

    cache = { current, latest, available, apkUrl, note, checkedAt: Date.now() };
    return cache;
  } catch {
    // fail soft — nobody is blocked from using the app because a
    // version check timed out
    return {
      current,
      latest: current,
      available: false,
      apkUrl: null,
      note: null,
      checkedAt: Date.now(),
    };
  }
}

/** the last result without re-fetching */
export function lastUpdateCheck(): UpdateInfo | null {
  return cache;
}
