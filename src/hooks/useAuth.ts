import { useCallback, useState } from 'react';

// ─────────────────────────────────────────────────────────────
// AUTH SEAM — everything auth-related lives behind this one hook.
// Right now every function is a STUB: logs to console + simulates
// latency. To go live, replace the bodies with real calls
// (Supabase/Firebase/your API) — the UI never changes.
// ─────────────────────────────────────────────────────────────

export type SignInPayload = { email: string; username: string; password: string };

export type AuthApi = {
  loading: 'signin' | 'create' | 'forgot' | null;
  handleSignIn: (payload: SignInPayload) => Promise<void>;
  handleCreateAccount: () => Promise<void>;
  handleForgotPassword: (email: string) => Promise<void>;
};

const FAKE_LATENCY_MS = 900;

export function useAuth(): AuthApi {
  const [loading, setLoading] = useState<AuthApi['loading']>(null);

  const simulate = useCallback(async (kind: NonNullable<AuthApi['loading']>, work: () => void) => {
    if (loading) return;
    setLoading(kind);
    try {
      work();
      await new Promise((r) => setTimeout(r, FAKE_LATENCY_MS));
    } finally {
      setLoading(null);
    }
  }, [loading]);

  const handleSignIn = useCallback(
    (payload: SignInPayload) =>
      simulate('signin', () => {
        // TODO(real-auth): e.g. supabase.auth.signInWithPassword({ email, password })
        console.log('[auth] signIn →', { email: payload.email, username: payload.username });
      }),
    [simulate],
  );

  const handleCreateAccount = useCallback(
    () =>
      simulate('create', () => {
        // TODO(real-auth): navigate to a Create Account flow / supabase.auth.signUp(...)
        console.log('[auth] createAccount tapped (stub — no navigation yet)');
      }),
    [simulate],
  );

  const handleForgotPassword = useCallback(
    (email: string) =>
      simulate('forgot', () => {
        // TODO(real-auth): supabase.auth.resetPasswordForEmail(email)
        console.log('[auth] forgotPassword tapped (stub) →', email || '(no email entered)');
      }),
    [simulate],
  );

  return { loading, handleSignIn, handleCreateAccount, handleForgotPassword };
}
