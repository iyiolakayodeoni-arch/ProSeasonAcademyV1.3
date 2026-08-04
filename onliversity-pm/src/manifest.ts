// Onliversity PM — the catalog manifest.
//
// A single static JSON file lists every Onliversity app. The PM reads it,
// compares each app's manifest versionCode against the one installed on the
// device, and offers UPDATE / INSTALL. You ship a new version by editing one
// JSON file (version, apkUrl, sha256, notes) — no rebuild of either app.

export interface CatalogApp {
  id: string;
  name: string;
  package: string; // android applicationId, e.g. com.onliversity.proseasonacademy
  version: string; // human, e.g. "1.4.0"
  versionCode: number; // integer, monotonic — the thing updates are decided on
  apkUrl: string;
  sha256: string; // hex — the PM verifies the downloaded APK against this
  sizeBytes?: number;
  minAndroid?: number; // API level floor
  releaseNotes?: string;
  releasedAt?: string;
  /** storefront fields */
  status?: 'live' | 'coming_soon';
  tagline?: string; // one-line pitch on the card
  description?: string; // longer body on the detail/teaser
  eta?: string; // "SEASON TWO" / "2026" for coming-soon
  accent?: string; // hex card accent
}

/** is this app installable right now, or just a coming-soon teaser? */
export function isLive(a: CatalogApp): boolean {
  return (a.status ?? 'live') === 'live' && !!a.apkUrl && typeof a.versionCode === 'number';
}

export interface Catalog {
  schema: number;
  generatedAt?: string;
  apps: CatalogApp[];
}

// Default: Supabase Storage. Override at build via EXPO_PUBLIC_ONLIVERSITY_CATALOG.
export const CATALOG_URL =
  process.env.EXPO_PUBLIC_ONLIVERSITY_CATALOG ??
  'https://ymnkphqgjxexsnbgtqvk.supabase.co/storage/v1/object/public/onliversity/onliversity-catalog.json';

/** fetch + validate the catalog; fail soft to an empty list (never crash the store) */
export async function fetchCatalog(): Promise<Catalog | null> {
  try {
    const r = await fetch(CATALOG_URL, { cache: 'no-store' });
    if (!r.ok) return null;
    const data = (await r.json()) as Catalog;
    if (!data || !Array.isArray(data.apps)) return null;
    return data;
  } catch {
    return null;
  }
}

export type AppUpdateState = 'UP_TO_DATE' | 'UPDATE' | 'INSTALL' | 'UNKNOWN';

/** decide what the button should say, given the installed versionCode (-1 = absent) */
export function updateState(manifestCode: number, installedCode: number): AppUpdateState {
  if (installedCode < 0) return 'INSTALL';
  if (manifestCode > installedCode) return 'UPDATE';
  if (manifestCode === installedCode) return 'UP_TO_DATE';
  return 'UNKNOWN';
}
