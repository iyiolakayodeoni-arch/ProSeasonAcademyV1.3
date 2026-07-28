import { useCallback, useState } from 'react';
import * as backend from '../data/backend';
import { getSettings } from '../data/settings';

// ─────────────────────────────────────────────────────────────
// AUTH SEAM — the academy has no passwords, by design.
//
// Sign-up and sign-in are the SAME tap: the device claims an
// anonymous Supabase session, then `ensure-profile` either hands
// back an existing profile or claims one of SEASON ONE's seats.
// There is nothing to remember, nothing to reset, and no web form
// to phish — which is exactly why there is no password field.
//
// Returns the claimed identity, or null when the academy is
// unreachable (the app then runs fully offline) — the caller
// checks `backend.getSeasonGate()` to tell "offline" from "full".
// ─────────────────────────────────────────────────────────────

export type AuthApi = {
  loading: boolean;
  /** claim (or re-claim) this device's academy seat */
  enterAcademy: (handle: string) => Promise<backend.CloudUser | null>;
};

export function useAuth(): AuthApi {
  const [loading, setLoading] = useState(false);

  const enterAcademy = useCallback(
    async (handle: string): Promise<backend.CloudUser | null> => {
      if (loading) return null;
      setLoading(true);
      try {
        const s = getSettings();
        const name = handle.trim() || s.displayName;
        return await backend.ensureAuth(name, '', s.platform, s.geo);
      } finally {
        setLoading(false);
      }
    },
    [loading],
  );

  return { loading, enterAcademy };
}
