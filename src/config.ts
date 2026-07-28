// ─────────────────────────────────────────────────────────────
// ACADEMY CLOUD address — YOUR server, your rules, ₦0.
// Dev default is localhost; production value comes from the
// EXPO_PUBLIC_PSA_SERVER env at build time (see server/DEPLOYMENT.md
// for the zero-naira hosting guide).
// ─────────────────────────────────────────────────────────────
export const PSA_SERVER_URL =
  process.env.EXPO_PUBLIC_PSA_SERVER ?? 'http://127.0.0.1:8788';

// ── Supabase engine room (set at build time; blank = offline-first) ──
export const PSA_SUPABASE_URL = process.env.EXPO_PUBLIC_PSA_SUPABASE_URL ?? '';
export const PSA_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_PSA_SUPABASE_ANON_KEY ?? '';
