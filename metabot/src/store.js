import fs from 'node:fs';
import path from 'node:path';
import { STORE_FILE, DATA_DIR, STALE_DAYS } from './config.js';

// Smallest store that works: a versioned JSON file.
// Swap these four functions for Supabase/Firebase calls later —
// nothing else in the pipeline changes.

const EMPTY = { meta: { currentPatch: 'unknown', lastRunAt: null }, seenFingerprints: [], posts: [] };

export function loadStore() {
  if (!fs.existsSync(STORE_FILE)) return structuredClone(EMPTY);
  return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
}

export function saveStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

export function addPosts(store, posts) {
  store.posts.push(...posts);
  for (const p of posts) store.seenFingerprints.push(p.fingerprint);
  return posts.length;
}

// freshness: age out old finds instantly when the game patches,
// and mark anything past STALE_DAYS so it leaves the live feed.
export function sweepStaleness(store, { now = new Date(), currentPatch }) {
  const notes = [];
  for (const p of store.posts) {
    if (p.lifecycle === 'archived') continue;
    const ageDays = (now - new Date(p.discoveredAt)) / 86400000;
    let next = 'fresh';
    if (currentPatch && p.patchVersion !== 'unknown' && currentPatch !== 'unknown' && p.patchVersion !== currentPatch) {
      next = 'stale-patch';
    } else if (ageDays > STALE_DAYS) {
      next = 'stale-age';
    } else if (ageDays > STALE_DAYS * 0.66) {
      next = 'aging';
    }
    if (next !== p.lifecycle) {
      notes.push(`${p.id}: ${p.lifecycle} → ${next}`);
      p.lifecycle = next;
    }
  }
  return notes;
}

export function postsByStatus(store, status) {
  return store.posts.filter((p) => p.status === status);
}
