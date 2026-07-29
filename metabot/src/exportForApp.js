// Rebuild the file the app reads from: ONLY approved + fresh items.
// Lesson-eligible kinds (SKILL_MOVE / EXPLOIT / TRICK_OF_THE_WEEK) also carry
// the structured `lesson` block the Coaching Screen teaches from.
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
    // structured coaching payload — the Coaching Screen derives TODAY'S
    // MECHANIC, tiles, rule and scan targets from this (never invented).
    lesson: p.lesson ?? buildLesson(p) ?? undefined,
  }));

fs.mkdirSync(path.dirname(APP_FEED_FILE), { recursive: true });
fs.writeFileSync(
  APP_FEED_FILE,
  JSON.stringify({ updatedAt: new Date().toISOString(), currentPatch: store.meta.currentPatch, posts: live }, null, 2),
);

const withLessons = live.filter((p) => p.lesson).length;
console.log(`\n✓ exported ${live.length} approved+fresh post(s) → src/data/liveFeed.json (${withLessons} with lesson blocks)`);
console.log(`  currentPatch: ${store.meta.currentPatch}   store total: ${store.posts.length}\n`);
