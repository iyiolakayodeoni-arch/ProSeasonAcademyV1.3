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

// ── BASELINE WEEK — day-unlock local notifications ──────────
// When a day seals, the next day unlocks exactly 24h later. A local
// notification (scheduled by the OS, so it fires even if the app is
// closed) is the nudge that brings the player back for that day's
// one match — the pacing contract working as a reminder, never a nag.

export const BASELINE_UNLOCK_CHANNEL = 'baseline-week';

/** per-day notification copy (1–7) */
export function baselineUnlockCopy(day: number): { title: string; body: string } {
  switch (day) {
    case 6:
      return {
        title: 'DAY 6 — THE WEEK SO FAR',
        body: 'No match today. Open the app and sit with what you named — the reflection unlocks your last question tomorrow.',
      };
    case 7:
      return {
        title: 'DAY 7 — THE LAST QUESTION',
        body: 'Your Baseline Week is complete. One honest answer about where your game is going — then your profile seals.',
      };
    default:
      return {
        title: `DAY ${day} IS UNLOCKED — MATCH ${day}`,
        body: 'One ranked match, then watch the evidence, name your moments and analyse each one. The mirror is waiting.',
      };
  }
}

/**
 * Schedule the local notification that fires when the next Baseline
 * day unlocks. Safe to call repeatedly — Expo dedupes by identifier.
 * Fails soft when notifications are unavailable or permission is
 * denied; the in-app REST countdown is the fallback.
 */
export async function scheduleBaselineUnlock(day: number, unlockAt: number): Promise<boolean> {
  const Notifications = await loadExpoNotifications();
  if (!Notifications) return false;
  try {
    // show while the app is open too
    Notifications.setNotificationHandler?.({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== 'granted') return false;
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(BASELINE_UNLOCK_CHANNEL, {
        name: 'Baseline Week',
        importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
      });
    }
    const copy = baselineUnlockCopy(day);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: copy.title,
        body: copy.body,
        data: { deepLink: 'journey' },
        sound: Platform.OS === 'android' ? undefined : 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes?.DATE ?? 'date',
        date: new Date(unlockAt),
        channelId: Platform.OS === 'android' ? BASELINE_UNLOCK_CHANNEL : undefined,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** cancel every pending Baseline Week unlock notification (Delete Account) */
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
