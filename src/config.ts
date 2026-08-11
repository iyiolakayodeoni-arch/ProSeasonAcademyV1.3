// ─────────────────────────────────────────────────────────────
// ACADEMY CLOUD — the engine room is SUPABASE. Full stop.
//
// Auth (anonymous), the seat gate, the vault, the live rooms,
// the member app and the founder desk run on the Supabase project
// below. Nothing else is contacted at runtime.
//
// Both values are read at BUILD time from .env (see .env.example).
// Missing credentials = build fails fast with clear error message.
//
// The anon key is public by design — every table is guarded by
// Row Level Security in Postgres. The service_role key must NEVER
// appear in this app.
//
// FALLBACK ONLY: `server/` holds the self-hosted Node/SQLite
// backend. It is kept as a proven ₦0 escape hatch and as the
// behavioural map for what the database must do — it is NOT wired
// into the app and nothing here talks to it. To ever revive it,
// re-point `src/data/backend.ts` (the single seam) at it; no
// screen would need to change.
// ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.EXPO_PUBLIC_PSA_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_PSA_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase credentials. Please create a .env file with EXPO_PUBLIC_PSA_SUPABASE_URL and EXPO_PUBLIC_PSA_SUPABASE_ANON_KEY. See .env.example for details.'
  );
}

export const PSA_SUPABASE_URL = SUPABASE_URL;
export const PSA_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

// Optional OCR backend for native/mobile screenshot reading. When blank, the app
// falls back to web OCR or pasted-text assist. Point this at a deployed route
// like https://api.proseasonacademy.app/ocr/stats-screen
export const PSA_OCR_URL = process.env.EXPO_PUBLIC_PSA_OCR_URL ?? '';

// The founder's own APK download link (sideloaded — no app store). Set via env
// at build time; blank falls back to a placeholder so the install assistant
// never shows a dead link. Used by the SideloadAssistant self-service screen.
export const PSA_DOWNLOAD_URL =
  process.env.EXPO_PUBLIC_PSA_DOWNLOAD_URL ?? 'https://proseasonacademy.app/download';
