import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CANNED_SEED, DeskCategory } from './founderAssist';

// ─────────────────────────────────────────────────────────────
// CANNED-REPLY LIBRARY — the founder's own reusable replies,
// saved on-device, keyed by triage category. Seeds from the
// assistant's default drafts; the founder overrides and adds.
//
// This is the founder's personal tooling (not player-facing), so
// persistence here is fine and does not touch the anti-AI stance.
// ─────────────────────────────────────────────────────────────

const KEY = 'psa.canned-replies.v1';

export interface CannedReply {
  id: string;
  category: DeskCategory;
  body: string;
  /** false = shipped default seed; true = the founder wrote it */
  custom: boolean;
}

let state: CannedReply[] = [];
let hydrated = false;
let hydrating: Promise<void> | null = null;

const listeners = new Set<() => void>();
const getState = () => state;
function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
function emit() { listeners.forEach((l) => l()); }
function set(next: CannedReply[]) {
  state = next;
  emit();
  void AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

function seed(): CannedReply[] {
  return CANNED_SEED.map((s, i) => ({
    id: `seed-${i}`,
    category: s.category,
    body: s.body,
    custom: false,
  }));
}

/** read the library off disk exactly once per app run */
export function hydrateCanned(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = AsyncStorage.getItem(KEY)
    .then((raw: string | null) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as CannedReply[];
          if (Array.isArray(parsed) && parsed.length) {
            state = parsed;
            hydrated = true;
            emit();
            return;
          }
        } catch { /* fall through to seed */ }
      }
      state = seed();
      hydrated = true;
      emit();
    })
    .catch(() => {
      state = seed();
      hydrated = true;
      emit();
    });
  return hydrating;
}

/** save a new founder-written reply for a category */
export function addCanned(category: DeskCategory, body: string): void {
  const text = String(body ?? '').trim();
  if (!text) return;
  // de-dupe by body within the category
  if (state.some((c) => c.category === category && c.body === text)) return;
  set([...state, { id: `c-${Date.now()}`, category, body: text, custom: true }]);
}

/** remove a founder-saved reply (seeds can be restored by wiping the store) */
export function deleteCanned(id: string): void {
  set(state.filter((c) => c.id !== id));
}

export function useCannedReplies(): CannedReply[] {
  const s = useSyncExternalStore(subscribe, getState);
  useEffect(() => { void hydrateCanned(); }, []);
  return s;
}

/** the saved replies that fit a given category (plus OTHER as a fallback pool) */
export function cannedFor(all: CannedReply[], category: DeskCategory): CannedReply[] {
  const main = all.filter((c) => c.category === category);
  const other = all.filter((c) => c.category === 'OTHER');
  // custom first, then seeds; OTHERs last as a fallback
  return [
    ...main.filter((c) => c.custom),
    ...main.filter((c) => !c.custom),
    ...(category !== 'OTHER' ? other : []),
  ];
}
