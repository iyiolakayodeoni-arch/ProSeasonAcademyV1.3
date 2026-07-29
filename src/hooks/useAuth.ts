import { useCallback, useState } from 'react';
import * as authApi from '../data/authApi';
import * as backend from '../data/backend';
import { getSettings, setAcademyId, setDisplayName, setEmail } from '../data/settings';

// ─────────────────────────────────────────────────────────────
// AUTH HOOK — email/password door with clear loading + errors.
// Register returns the academy token once for secure display.
// Login restores the seat. Offline still fails soft.
// ─────────────────────────────────────────────────────────────

export type AuthApi = {
  loading: boolean;
  lastError: string | null;
  clearError: () => void;
  register: (input: {
    username: string;
    email: string;
    password: string;
    country: string;
    countryCode: string;
    region: string;
    inviteCode?: string;
  }) => Promise<authApi.AuthResult | authApi.AuthFail>;
  login: (email: string, password: string) => Promise<authApi.AuthResult | authApi.AuthFail>;
  requestReset: (email: string) => Promise<{ ok: true; message: string } | authApi.AuthFail>;
  /** legacy anonymous path — kept for offline/dev */
  enterAcademy: (handle: string, inviteCode?: string) => Promise<backend.CloudUser | null>;
};

function applyProfile(profile: authApi.AuthProfile) {
  setDisplayName(profile.handle || profile.username || 'PLAYER');
  if (profile.email) setEmail(profile.email);
  if (profile.academyId) setAcademyId(profile.academyId);
  backend.setMeFromProfile(profile);
}

export function useAuth(): AuthApi {
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const register = useCallback(async (input: {
    username: string;
    email: string;
    password: string;
    country: string;
    countryCode: string;
    region: string;
    inviteCode?: string;
  }) => {
    if (loading) {
      return { ok: false as const, error: 'RATE_LIMITED' as const, message: authApi.AUTH_ERROR_COPY.RATE_LIMITED };
    }
    setLoading(true);
    setLastError(null);
    try {
      const s = getSettings();
      const result = await authApi.registerAccount({
        ...input,
        platform: s.platform,
      });
      if (result.ok) applyProfile(result.profile);
      else setLastError(result.message);
      return result;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const login = useCallback(async (email: string, password: string) => {
    if (loading) {
      return { ok: false as const, error: 'RATE_LIMITED' as const, message: authApi.AUTH_ERROR_COPY.RATE_LIMITED };
    }
    setLoading(true);
    setLastError(null);
    try {
      const result = await authApi.loginAccount(email, password);
      if (result.ok) applyProfile(result.profile);
      else setLastError(result.message);
      return result;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const requestReset = useCallback(async (email: string) => {
    setLastError(null);
    return authApi.requestPasswordReset(email);
  }, []);

  const enterAcademy = useCallback(
    async (handle: string, inviteCode?: string): Promise<backend.CloudUser | null> => {
      if (loading) return null;
      setLoading(true);
      try {
        const s = getSettings();
        const name = handle.trim() || s.displayName;
        const me = await backend.ensureAuth(name, '', s.platform, s.geo, inviteCode);
        if (me) {
          setDisplayName(me.handle);
          setAcademyId(me.academyId);
        }
        return me;
      } finally {
        setLoading(false);
      }
    },
    [loading],
  );

  return {
    loading,
    lastError,
    clearError: () => setLastError(null),
    register,
    login,
    requestReset,
    enterAcademy,
  };
}
