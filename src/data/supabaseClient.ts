import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PSA_SUPABASE_ANON_KEY, PSA_SUPABASE_URL } from '../config';

// ─────────────────────────────────────────────────────────────
// SUPABASE CLIENT — one shared instance, session persisted in
// AsyncStorage. Credentials are required (enforced in config.ts).
// ─────────────────────────────────────────────────────────────

export const supabase: SupabaseClient = createClient(
  PSA_SUPABASE_URL,
  PSA_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

export const SUPABASE_READY = true;
