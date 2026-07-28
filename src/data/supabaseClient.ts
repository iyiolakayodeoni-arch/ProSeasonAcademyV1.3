import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PSA_SUPABASE_ANON_KEY, PSA_SUPABASE_URL } from '../config';

// ─────────────────────────────────────────────────────────────
// SUPABASE CLIENT — one shared instance, session persisted in
// AsyncStorage (anonymous sign-ins = no passwords, ever).
// When the two env vars are unset (dev/offline builds) the client
// is null and every seam function fails soft — the app keeps
// working fully offline, exactly as before.
// ─────────────────────────────────────────────────────────────

export const supabase: SupabaseClient | null =
  PSA_SUPABASE_URL && PSA_SUPABASE_ANON_KEY
    ? createClient(PSA_SUPABASE_URL, PSA_SUPABASE_ANON_KEY, {
        auth: {
          storage: AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const SUPABASE_READY = supabase !== null;
