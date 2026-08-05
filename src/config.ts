// ─────────────────────────────────────────────────────────────
// ACADEMY CLOUD — the engine room is SUPABASE. Full stop.
//
// Auth (anonymous), the seat gate, the vault, the live rooms,
// the till and the founder desk all run on the Supabase project
// below. Nothing else is contacted at runtime.
//
// Both values are read at BUILD time from .env (see .env.example).
// Blank = the client is null and every backend call fails soft,
// so the app still runs fully offline-first.
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

export const PSA_SUPABASE_URL = process.env.EXPO_PUBLIC_PSA_SUPABASE_URL ?? '';
export const PSA_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_PSA_SUPABASE_ANON_KEY ?? '';

// The founder's own APK download link (sideloaded — no app store). Set via env
// at build time; blank falls back to a placeholder so the install assistant
// never shows a dead link. Used by the SideloadAssistant self-service screen.
export const PSA_DOWNLOAD_URL =
  process.env.EXPO_PUBLIC_PSA_DOWNLOAD_URL ?? 'https://proseasonacademy.app/download';
