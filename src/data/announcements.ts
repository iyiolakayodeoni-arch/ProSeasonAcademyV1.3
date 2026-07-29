// ─────────────────────────────────────────────────────────────
// FOUNDER ANNOUNCEMENTS — official Home feed, not community chat.
// Posted only by authenticated founders. Read/unread + optional expiry.
// ─────────────────────────────────────────────────────────────

import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

export type AnnouncementType = 'update' | 'alert' | 'patch' | 'welcome';

export interface FounderAnnouncement {
  id: number;
  authorHandle: string;
  title: string;
  body: string;
  linkUrl: string | null;
  updateType: AnnouncementType;
  publishedAt: number;
  expiresAt: number | null;
  isRead: boolean;
}

const READ_KEY = 'psa.announcements.read.v1';
let cache: FounderAnnouncement[] = [];
let localRead = new Set<string>();
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

async function hydrateReads() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(READ_KEY);
    if (raw) localRead = new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
}

function persistReads() {
  AsyncStorage.setItem(READ_KEY, JSON.stringify([...localRead])).catch(() => {});
}

function mapRow(r: any): FounderAnnouncement {
  const id = Number(r.id);
  return {
    id,
    authorHandle: String(r.author_handle ?? 'POCOLASTONES'),
    title: String(r.title ?? ''),
    body: String(r.body ?? ''),
    linkUrl: r.link_url ?? null,
    updateType: (r.update_type ?? 'update') as AnnouncementType,
    publishedAt: r.published_at ? new Date(r.published_at).getTime() : Date.now(),
    expiresAt: r.expires_at ? new Date(r.expires_at).getTime() : null,
    isRead: r.is_read === true || localRead.has(String(id)),
  };
}

export async function fetchAnnouncements(): Promise<FounderAnnouncement[]> {
  await hydrateReads();
  if (!supabase) {
    emit();
    return cache;
  }
  try {
    const { data, error } = await supabase.rpc('list_announcements');
    if (error || !data) {
      // table may not exist yet — fail soft
      return cache;
    }
    cache = (data as any[]).map(mapRow);
    emit();
    return cache;
  } catch {
    return cache;
  }
}

export function getAnnouncements(): FounderAnnouncement[] {
  return cache;
}

export function unreadAnnouncementCount(): number {
  return cache.filter((a) => !a.isRead).length;
}

export async function markAnnouncementRead(id: number): Promise<void> {
  localRead.add(String(id));
  persistReads();
  cache = cache.map((a) => (a.id === id ? { ...a, isRead: true } : a));
  emit();
  if (!supabase) return;
  try {
    await supabase.rpc('mark_announcement_read', { p_id: id });
  } catch {
    /* local is enough */
  }
}

export async function markAllAnnouncementsRead(): Promise<void> {
  for (const a of cache) localRead.add(String(a.id));
  persistReads();
  cache = cache.map((a) => ({ ...a, isRead: true }));
  emit();
  if (!supabase) return;
  try {
    for (const a of cache) await supabase.rpc('mark_announcement_read', { p_id: a.id });
  } catch {
    /* ignore */
  }
}

/** founder publish — requires authenticated founder session */
export async function publishAnnouncement(input: {
  title: string;
  body: string;
  linkUrl?: string;
  updateType?: AnnouncementType;
  expiresDays?: number;
  author?: string;
}): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'OFFLINE' };
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) return { ok: false, error: 'EMPTY' };
  try {
    const { data, error } = await supabase.rpc('publish_announcement', {
      p_title: title,
      p_body: body,
      p_link: input.linkUrl ?? null,
      p_type: input.updateType ?? 'update',
      p_expires_days: input.expiresDays ?? null,
      p_author: input.author ?? 'POCOLASTONES',
    });
    if (error) {
      if (String(error.message).includes('FOUNDER_ONLY')) return { ok: false, error: 'FOUNDER_ONLY' };
      return { ok: false, error: 'FAILED' };
    }
    await fetchAnnouncements();
    return { ok: true, id: Number(data) };
  } catch {
    return { ok: false, error: 'FAILED' };
  }
}

export function useAnnouncements(): {
  items: FounderAnnouncement[];
  unread: number;
  refresh: () => void;
} {
  const items = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => cache,
  );
  useEffect(() => {
    void fetchAnnouncements();
  }, []);
  return {
    items,
    unread: items.filter((a) => !a.isRead).length,
    refresh: () => {
      void fetchAnnouncements();
    },
  };
}

export function formatAnnouncementWhen(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const mon = months[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dd} ${mon} · ${hh}:${mm}`;
}
