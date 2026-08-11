// ─────────────────────────────────────────────────────────────
// FC 26/27 CONSOLE NEWS — published drafts from MetaBot (founder-approved).
// Never auto-publishes. Pending items are Desk-only.
// ─────────────────────────────────────────────────────────────

import { supabase } from './supabaseClient';

export interface NewsItem {
  id: string;
  kind: string;
  headline: string;
  body: string;
  cta: string;
  sourceUrl: string;
  sourceName: string;
  discoveredAt: string;
  patchVersion: string | null;
  confidence: number;
  publishedAt: number | null;
  status: string;
}

function map(r: any): NewsItem {
  return {
    id: String(r.id),
    kind: String(r.kind ?? 'META_SHIFT'),
    headline: String(r.headline ?? ''),
    body: String(r.body ?? ''),
    cta: String(r.cta ?? 'READ MORE ›'),
    sourceUrl: String(r.source_url ?? ''),
    sourceName: String(r.source_name ?? 'unknown'),
    discoveredAt: String(r.discovered_at ?? ''),
    patchVersion: r.patch_version ?? null,
    confidence: Number(r.confidence ?? 0.7),
    publishedAt: r.published_at ? new Date(r.published_at).getTime() : null,
    status: String(r.status ?? 'pending_review'),
  };
}

export async function fetchPublishedNews(limit = 30): Promise<NewsItem[]> {
  try {
    const { data, error } = await supabase.rpc('list_published_news', { p_limit: limit });
    if (error || !data) {
      // fallback: direct select if RPC missing
      const r = await supabase
        .from('news_drafts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);
      if (r.error || !r.data) return [];
      return r.data.map(map);
    }
    return (data as any[]).map(map);
  } catch {
    return [];
  }
}

/** founder: pending drafts awaiting approval */
export async function fetchPendingNews(): Promise<NewsItem[]> {
  try {
    const { data, error } = await supabase
      .from('news_drafts')
      .select('*')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return data.map(map);
  } catch {
    return [];
  }
}

export async function reviewNews(
  id: string,
  approve: boolean,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('founder_review_news', {
      p_id: id,
      p_approve: approve,
    });
    return !error && data === true;
  } catch {
    return false;
  }
}
