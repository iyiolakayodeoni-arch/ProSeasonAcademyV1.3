import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

// A deliberately small measurement layer. It tracks only the six decisions
// that tell us whether the review practice is working — never reflection text,
// scores, recordings, or community content.
export const FUNNEL_EVENTS = [
  'coach_selected',
  'baseline_day_1_started',
  'baseline_completed',
  'match_review_completed',
  'second_match_review_completed',
  'lesson_verdict_recorded',
] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];
export type FunnelEventRecord = { name: FunnelEvent; at: number };

const KEY = 'psa.funnel.v1';

/**
 * Store an event locally first, then mirror it to Supabase when the optional
 * funnel_events migration is live. Repeated milestones are intentionally
 * deduped: this is a conversion funnel, not click analytics.
 */
export async function trackFunnel(name: FunnelEvent): Promise<void> {
  const at = Date.now();
  let events: FunnelEventRecord[] = [];
  try {
    const raw = await AsyncStorage.getItem(KEY);
    events = raw ? JSON.parse(raw) : [];
    if (events.some((event) => event.name === name)) return;
    events = [...events, { name, at }];
    await AsyncStorage.setItem(KEY, JSON.stringify(events));
  } catch {
    // Measurement must never interrupt a player doing their review.
  }

  if (!supabase) return;
  try {
    await supabase.from('funnel_events').insert({ name, occurred_at: new Date(at).toISOString() });
  } catch {
    // The migration may not yet be deployed or the player may be offline.
    // The local record remains the source for a later retry/release.
  }
}

export async function getLocalFunnel(): Promise<FunnelEventRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function hasFunnelEvent(name: FunnelEvent): Promise<boolean> {
  return (await getLocalFunnel()).some((event) => event.name === name);
}
