// Rebuild the file the app reads from: ONLY approved + fresh items.
// Lesson-eligible kinds also carry the structured `lesson` block.
// When SUPABASE_URL + SERVICE_ROLE are set, also upsert drafts into
// news_drafts for founder review in the Desk (never auto-publishes).
import fs from 'node:fs';
import path from 'node:path';
import { APP_FEED_FILE } from './config.js';
import { loadStore } from './store.js';
import { buildLesson } from './lessons.js';

const store = loadStore();

const live = store.posts
  .filter((p) => p.status === 'approved' && ['fresh', 'aging'].includes(p.lifecycle))
  .sort((a, b) => (a.discoveredAt < b.discoveredAt ? 1 : -1))
  .map((p) => ({
    id: p.id,
    origin: 'metabot',
    kind: p.kind,
    headline: p.headline,
    body: p.body,
    cta: p.cta,
    blog: p.blog,
    animationVariant: p.animationVariant ?? p.lesson?.clip?.variant,
    patchVersion: p.patchVersion,
    discoveredAt: p.discoveredAt,
    sourceName: p.sourceName,
    sourceUrl: p.sourceUrl,
    lifecycle: p.lifecycle,
    lesson: p.lesson ?? buildLesson(p) ?? undefined,
  }));

fs.mkdirSync(path.dirname(APP_FEED_FILE), { recursive: true });
fs.writeFileSync(
  APP_FEED_FILE,
  JSON.stringify({ updatedAt: new Date().toISOString(), currentPatch: store.meta.currentPatch, posts: live }, null, 2),
);

const withLessons = live.filter((p) => p.lesson).length;
console.log(`\n✓ exported ${live.length} approved+fresh post(s) → src/data/liveFeed.json (${withLessons} with lesson blocks)`);
console.log(`  currentPatch: ${store.meta.currentPatch}   store total: ${store.posts.length}`);

// ── optional: push ALL pending + approved drafts into Supabase for Desk review ──
const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_PSA_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (url && key) {
  const drafts = store.posts.filter((p) =>
    ['pending_review', 'approved', 'rejected'].includes(p.status),
  );
  let upserted = 0;
  for (const p of drafts) {
    const row = {
      id: p.id,
      kind: p.kind,
      headline: p.headline,
      body: p.body,
      cta: p.cta ?? 'READ MORE ›',
      source_url: p.sourceUrl,
      source_name: p.sourceName ?? 'unknown',
      discovered_at: p.discoveredAt,
      patch_version: p.patchVersion ?? null,
      confidence: p.confidence ?? 0.7,
      status: p.status === 'approved' ? 'published' : p.status,
      fingerprint: p.fingerprint ?? null,
      published_at: p.status === 'approved' ? new Date().toISOString() : null,
      reviewed_at: p.reviewedAt ?? null,
    };
    try {
      const res = await fetch(`${url}/rest/v1/news_drafts?on_conflict=id`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: key,
          authorization: `Bearer ${key}`,
          prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(row),
      });
      if (res.ok || res.status === 201) upserted++;
      else console.log(`  ! news_drafts ${p.id}: HTTP ${res.status}`);
    } catch (e) {
      console.log(`  ! news_drafts ${p.id}: ${String(e).slice(0, 100)}`);
    }
  }
  console.log(`  supabase news_drafts upserted: ${upserted}/${drafts.length}`);
} else {
  console.log('  (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to sync drafts to the Desk)');
}
console.log('');
