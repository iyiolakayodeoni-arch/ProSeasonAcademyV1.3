// ─────────────────────────────────────────────────────────────
// AUTH API — email/password academy door.
// Clear error codes, academy token returned once at sign-up,
// password reset, account deletion, session restore.
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { PSA_SUPABASE_ANON_KEY, PSA_SUPABASE_URL } from '../config';

const TOKEN_CACHE_KEY = 'psa.academy.token.v1';

export type AuthErrorCode =
  | 'INVALID_EMAIL'
  | 'WEAK_PASSWORD'
  | 'USERNAME_SHORT'
  | 'USERNAME_TAKEN'
  | 'EMAIL_TAKEN'
  | 'BAD_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'NO_ACCOUNT'
  | 'NO_PROFILE'
  | 'ACCOUNT_REMOVED'
  | 'INVITE_REQUIRED'
  | 'INVITE_INVALID'
  | 'SEASON_FULL'
  | 'RATE_LIMITED'
  | 'MISSING_FIELDS'
  | 'OFFLINE'
  | 'SIGNUP_FAILED'
  | 'LOGIN_FAILED'
  | 'PROFILE_FAILED'
  | 'UPDATE_FAILED'
  | 'DELETE_FAILED'
  | 'FOUNDER_PROTECTED'
  | 'UNKNOWN';

export const AUTH_ERROR_COPY: Record<AuthErrorCode, string> = {
  INVALID_EMAIL: 'THAT DOES NOT LOOK LIKE AN EMAIL ADDRESS.',
  WEAK_PASSWORD: 'PASSWORD MUST BE AT LEAST 8 CHARACTERS.',
  USERNAME_SHORT: 'ACADEMY NAME NEEDS AT LEAST 3 CHARACTERS.',
  USERNAME_TAKEN: 'THAT ACADEMY NAME IS ALREADY TAKEN — TRY ANOTHER.',
  EMAIL_TAKEN: 'AN ACCOUNT ALREADY EXISTS FOR THAT EMAIL. SIGN IN INSTEAD.',
  BAD_CREDENTIALS: 'EMAIL OR PASSWORD IS WRONG. TRY AGAIN, OR RESET.',
  EMAIL_NOT_CONFIRMED: 'CONFIRM YOUR EMAIL FIRST — CHECK YOUR INBOX.',
  NO_ACCOUNT: 'NO SEAT FOUND FOR THAT EMAIL. CREATE ONE.',
  NO_PROFILE: 'YOUR SEAT COULD NOT BE FOUND. CONTACT THE FOUNDER.',
  ACCOUNT_REMOVED: 'THIS SEAT WAS RELEASED. CONTACT THE FOUNDER IF THAT IS WRONG.',
  INVITE_REQUIRED: 'THIS ACADEMY IS INVITE-ONLY. ENTER THE CODE YOU WERE GIVEN.',
  INVITE_INVALID: 'THAT CODE IS NOT VALID, ALREADY USED, OR EXPIRED.',
  SEASON_FULL: 'SEASON ONE IS FULL — YOU ARE ON THE WAITLIST.',
  RATE_LIMITED: 'TOO MANY TRIES. WAIT A MINUTE, THEN TRY AGAIN.',
  MISSING_FIELDS: 'EMAIL AND PASSWORD ARE BOTH REQUIRED.',
  OFFLINE: 'THE ACADEMY DID NOT ANSWER. CHECK YOUR SIGNAL.',
  SIGNUP_FAILED: 'COULD NOT CREATE YOUR SEAT. TRY AGAIN.',
  LOGIN_FAILED: 'SIGN-IN FAILED. TRY AGAIN.',
  PROFILE_FAILED: 'SEAT CREATED BUT PROFILE FAILED — CONTACT THE FOUNDER.',
  UPDATE_FAILED: 'COULD NOT UPDATE YOUR PASSWORD. TRY AGAIN.',
  DELETE_FAILED: 'COULD NOT DELETE THE ACCOUNT. TRY AGAIN.',
  FOUNDER_PROTECTED: 'THE FOUNDER SEAT CANNOT BE DELETED FROM THE APP.',
  UNKNOWN: 'SOMETHING WENT WRONG. TRY AGAIN.',
};

export interface AuthProfile {
  id: string;
  handle: string;
  username?: string | null;
  email?: string | null;
  academyId: string;
  region?: string;
  country?: string | null;
  countryCode?: string | null;
  isFounder?: boolean;
}

export interface AuthResult {
  ok: true;
  profile: AuthProfile;
  academyToken: string;
  isFounder?: boolean;
  needsLogin?: boolean;
}

export interface AuthFail {
  ok: false;
  error: AuthErrorCode;
  message: string;
  season?: { season: string; cap: number; taken: number };
}

async function invokeFn(name: string, body: Record<string, unknown>, authed = false): Promise<any> {
  if (!PSA_SUPABASE_URL || !PSA_SUPABASE_ANON_KEY) return { ok: false, error: 'OFFLINE' };

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    apikey: PSA_SUPABASE_ANON_KEY,
  };
  if (authed && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.authorization = `Bearer ${data.session.access_token}`;
  } else {
    headers.authorization = `Bearer ${PSA_SUPABASE_ANON_KEY}`;
  }

  try {
    const res = await fetch(`${PSA_SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => null);
    if (!j) return { ok: false, error: res.ok ? 'UNKNOWN' : 'OFFLINE' };
    return j;
  } catch {
    return { ok: false, error: 'OFFLINE' };
  }
}

function mapProfile(p: any): AuthProfile {
  return {
    id: String(p.id),
    handle: String(p.handle ?? p.username ?? 'PLAYER'),
    username: p.username ?? null,
    email: p.email ?? null,
    academyId: String(p.academy_id ?? p.academyId ?? ''),
    region: p.region,
    country: p.country ?? null,
    countryCode: p.country_code ?? p.countryCode ?? null,
    isFounder: p.is_founder === true,
  };
}

async function applySession(session: { access_token: string; refresh_token: string } | undefined) {
  if (!supabase || !session?.access_token || !session?.refresh_token) return;
  await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}

export async function cacheAcademyToken(token: string) {
  await AsyncStorage.setItem(TOKEN_CACHE_KEY, token).catch(() => {});
}

export async function readCachedAcademyToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_CACHE_KEY);
  } catch {
    return null;
  }
}

export async function clearCachedAcademyToken() {
  await AsyncStorage.removeItem(TOKEN_CACHE_KEY).catch(() => {});
}

/** create a seat — returns academy token once for secure display */
export async function registerAccount(input: {
  username: string;
  email: string;
  password: string;
  country: string;
  countryCode: string;
  region: string;
  platform?: string;
  inviteCode?: string;
}): Promise<AuthResult | AuthFail> {
  const j = await invokeFn('auth-register', {
    username: input.username,
    email: input.email,
    password: input.password,
    country: input.country,
    countryCode: input.countryCode,
    region: input.region,
    platform: input.platform ?? '',
    inviteCode: input.inviteCode ?? '',
  });

  if (!j?.ok) {
    const code = (j?.error as AuthErrorCode) || 'SIGNUP_FAILED';
    const fail: AuthFail = {
      ok: false,
      error: code in AUTH_ERROR_COPY ? code : 'SIGNUP_FAILED',
      message: AUTH_ERROR_COPY[code in AUTH_ERROR_COPY ? code : 'SIGNUP_FAILED'],
    };
    if (code === 'SEASON_FULL') {
      fail.season = {
        season: j.season ?? 'SEASON ONE',
        cap: j.cap ?? 1000,
        taken: j.taken ?? j.cap ?? 1000,
      };
    }
    return fail;
  }

  await applySession(j.session);
  const profile = mapProfile(j.profile);
  const token = String(j.academyToken ?? profile.academyId);
  await cacheAcademyToken(token);
  return { ok: true, profile, academyToken: token, needsLogin: j.needsLogin === true };
}

/** sign in an existing seat */
export async function loginAccount(email: string, password: string): Promise<AuthResult | AuthFail> {
  const j = await invokeFn('auth-login', { email, password });
  if (!j?.ok) {
    const code = (j?.error as AuthErrorCode) || 'LOGIN_FAILED';
    return {
      ok: false,
      error: code in AUTH_ERROR_COPY ? code : 'LOGIN_FAILED',
      message: AUTH_ERROR_COPY[code in AUTH_ERROR_COPY ? code : 'LOGIN_FAILED'],
    };
  }
  await applySession(j.session);
  const profile = mapProfile(j.profile);
  const token = String(j.academyToken ?? profile.academyId);
  await cacheAcademyToken(token);
  return { ok: true, profile, academyToken: token, isFounder: j.isFounder === true };
}

/** request a password-reset email (always returns success to the UI) */
export async function requestPasswordReset(email: string): Promise<{ ok: true; message: string } | AuthFail> {
  const j = await invokeFn('auth-reset', { action: 'request', email });
  if (!j?.ok && j?.error === 'INVALID_EMAIL') {
    return { ok: false, error: 'INVALID_EMAIL', message: AUTH_ERROR_COPY.INVALID_EMAIL };
  }
  return {
    ok: true,
    message: j?.message ?? 'IF THAT EMAIL HAS A SEAT, A RESET LINK IS ON ITS WAY.',
  };
}

/** update password while a recovery session is active */
export async function updatePassword(password: string): Promise<{ ok: true } | AuthFail> {
  if (!supabase) return { ok: false, error: 'OFFLINE', message: AUTH_ERROR_COPY.OFFLINE };
  if (password.length < 8) return { ok: false, error: 'WEAK_PASSWORD', message: AUTH_ERROR_COPY.WEAK_PASSWORD };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: 'UPDATE_FAILED', message: AUTH_ERROR_COPY.UPDATE_FAILED };
  return { ok: true };
}

/** hard-delete the signed-in account (server + local caller wipes) */
export async function deleteAccountRemote(): Promise<{ ok: true } | AuthFail> {
  const j = await invokeFn('auth-delete', {}, true);
  if (!j?.ok) {
    const code = (j?.error as AuthErrorCode) || 'DELETE_FAILED';
    return {
      ok: false,
      error: code in AUTH_ERROR_COPY ? code : 'DELETE_FAILED',
      message: AUTH_ERROR_COPY[code in AUTH_ERROR_COPY ? code : 'DELETE_FAILED'],
    };
  }
  await clearCachedAcademyToken();
  if (supabase) await supabase.auth.signOut().catch(() => {});
  return { ok: true };
}

/** restore me from a persisted Supabase session */
export async function restoreSession(): Promise<AuthProfile | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return null;
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, handle, username, email, academy_id, region, country, country_code, is_founder, status')
      .eq('auth_user_id', data.session.user.id)
      .maybeSingle();
    if (error || !profile || profile.status === 'removed') return null;
    const mapped = mapProfile(profile);
    if (mapped.academyId) await cacheAcademyToken(mapped.academyId);
    return mapped;
  } catch {
    return null;
  }
}

export async function signOutRemote(): Promise<void> {
  if (supabase) await supabase.auth.signOut().catch(() => {});
}

/** check username before submit (best-effort; register is the source of truth) */
export async function checkUsernameAvailable(username: string): Promise<boolean | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('username_available', { p_username: username.trim() });
    if (error) return null;
    return data === true;
  } catch {
    return null;
  }
}
