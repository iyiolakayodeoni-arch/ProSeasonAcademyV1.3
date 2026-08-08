// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS — Expo push token registration, prefs, quiet hours.
// Delivery is drained by push-dispatch edge function.
// Deep links: home | journey | community | settings | film-room | scan
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { getSettings, setToggle, ToggleKey } from './settings';

const TOKEN_KEY = 'psa.push.token.v1';
const QUIET_KEY = 'psa.push.quiet.v1';

export type NotifPrefKey =
  | 'coachMessages'
  | 'matchScanResults'
  | 'filmRoomAlerts'
  | 'communityMentions'
  | 'founderAnnouncements'
  | 'fcMobileNews'
  | 'groupSessions';

export type DeepLink =
  | 'home'
  | 'journey'
  | 'community'
  | 'settings'
  | 'film-room'
  | 'scan'
  | 'vault';

export interface QuietHours {
  enabled: boolean;
  /** local hour 0-23 */
  start: number;
  end: number;
}

const DEFAULT_QUIET: QuietHours = { enabled: false, start: 22, end: 7 };

let pushModule: any = null;
async function loadExpoNotifications(): Promise<any | null> {
  if (pushModule) return pushModule;
  try {
    // optional peer — present once expo-notifications is installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    pushModule = require('expo-notifications');
    return pushModule;
  } catch {
    return null;
  }
}

export async function getQuietHours(): Promise<QuietHours> {
  try {
    const raw = await AsyncStorage.getItem(QUIET_KEY);
    if (!raw) return { ...DEFAULT_QUIET };
    return { ...DEFAULT_QUIET, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_QUIET };
  }
}

export async function setQuietHours(q: QuietHours): Promise<void> {
  await AsyncStorage.setItem(QUIET_KEY, JSON.stringify(q)).catch(() => {});
  await syncPushRegistration();
}

function prefsPayload() {
  const t = getSettings().toggles;
  return {
    coachMessages: t.coachMessages,
    matchScanResults: t.matchScanResults,
    filmRoomAlerts: t.filmRoomAlerts,
    communityMentions: t.communityMentions,
    founderAnnouncements: t.founderAnnouncements !== false,
    fcMobileNews: t.fcMobileNews !== false,
    groupSessions: t.groupSessions !== false,
  };
}

/** request OS permission + register Expo token with the backend */
export async function registerForPush(): Promise<{ ok: boolean; token?: string; reason?: string }> {
  const Notifications = await loadExpoNotifications();
  if (!Notifications) {
    return { ok: false, reason: 'EXPO_NOTIFICATIONS_MISSING' };
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      final = req.status;
    }
    if (final !== 'granted') return { ok: false, reason: 'DENIED' };

    // projectId is optional on bare Expo; Constants may supply it
    let token: string | undefined;
    try {
      const Constants = require('expo-constants').default;
      const projectId =
        Constants?.easConfig?.projectId ?? Constants?.expoConfig?.extra?.eas?.projectId;
      const res = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();
      token = res?.data;
    } catch {
      return { ok: false, reason: 'TOKEN_FAILED' };
    }
    if (!token) return { ok: false, reason: 'TOKEN_FAILED' };

    await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
    await syncTokenToBackend(token);
    return { ok: true, token };
  } catch {
    return { ok: false, reason: 'FAILED' };
  }
}

async function syncTokenToBackend(token: string) {
  if (!supabase) return;
  const quiet = await getQuietHours();
  try {
    await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: Platform.OS,
      p_prefs: prefsPayload(),
      p_quiet_start: quiet.enabled ? quiet.start : null,
      p_quiet_end: quiet.enabled ? quiet.end : null,
    });
  } catch {
    /* fail soft */
  }
}

export async function syncPushRegistration(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) await syncTokenToBackend(token);
  } catch {
    /* ignore */
  }
}

/** flip a notif toggle and push prefs upstream */
export function setNotifPref(key: ToggleKey, on: boolean) {
  setToggle(key, on);
  void syncPushRegistration();
}

export function parseDeepLink(data: any): DeepLink | null {
  const raw = String(data?.deepLink ?? data?.deep_link ?? '');
  const allowed: DeepLink[] = ['home', 'journey', 'community', 'settings', 'film-room', 'scan', 'vault'];
  return (allowed as string[]).includes(raw) ? (raw as DeepLink) : null;
}

// ── BASELINE WEEK ─────────────────────────────────────────────
// Baseline days use a short 30-minute reset. The screen itself shows the
// countdown; no push permission is required just to keep the commitment.

/** Clear any legacy Baseline Week notifications when an account is deleted. */
export async function cancelBaselineUnlocks(): Promise<void> {
  const Notifications = await loadExpoNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    /* best effort */
  }
}

/** hook: register once when the hub mounts */
export function usePushRegistration(enabled: boolean) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'denied' | 'missing' | 'failed'>('idle');
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void registerForPush().then((r) => {
      if (!alive) return;
      if (r.ok) setStatus('ok');
      else if (r.reason === 'DENIED') setStatus('denied');
      else if (r.reason === 'EXPO_NOTIFICATIONS_MISSING') setStatus('missing');
      else setStatus('failed');
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return status;
}
