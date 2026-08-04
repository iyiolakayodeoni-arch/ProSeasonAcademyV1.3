import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────
// THE MATCH VAULT — every match you play, logged and graded.
//
// This is the MATCH SCAN backend. FC Mobile exposes no official
// match feed (and we ship no third-party services), so the vault
// is HONOR-SYSTEM INGEST: you play, you log the truth in under
// 15 seconds, and the scan grades the vault — objectives, scores,
// self-certified rules. The seam for automatic ingest is the
// `source` field: today every row is 'manual'; the day a real
// feed exists (on-device post-match scan), rows land as 'scan'
// and nothing else in the app changes.
//
// Journey objectives carry a machine-readable `check` (see
// journey.ts) — `objectiveCount` evaluates it against the vault,
// so "Win 2 ranked matches without sprint" is a REAL number, not
// a painted one.
// ─────────────────────────────────────────────────────────────

/** THE MIND's 1..5 head-state ladder (index 0 = composure 1). Manual by
 *  design: we do not watch or tag your match for you — manual observation
 *  and self-reporting is where mental resilience is forged. */
export const COMPOSURE_LABELS = ['TILTED', 'SHOOK', 'OKAY', 'CALM', 'ICE IN VEINS'] as const;

export const MATCH_MODES = ['RANKED', 'CASUAL', 'TOURNAMENT'] as const;
export type MatchMode = (typeof MATCH_MODES)[number];

export const OPP_STYLES = ['LOW BLOCK', 'HIGH PRESS', 'COUNTERS', 'POSSESSION', 'LONG BALL', 'HARD TO TELL'] as const;
export type OppStyle = (typeof OPP_STYLES)[number];

/** when the WINNING goal went in (only meaningful on a W) */
export type DecisiveWindow = 'EARLY' | 'AFTER 60' | 'AFTER 80';

export interface MatchEntry {
  id: string;
  at: number; // epoch ms
  source: 'manual' | 'scan' | 'watcher'; // 'watcher' = auto-logged by the on-device Match Watcher
  gf: number; // goals you scored
  ga: number; // goals you conceded
  mode: MatchMode;
  oppStyle: OppStyle;
  passAcc: number | null; // % read off the post-match screen (null = didn't check)
  noSprint: boolean; // kept the no-sprint rule (self-cert)
  mechanicsUsed: number; // taught mechanics used 0..3 (3 = 3+, self-cert)
  ledAt75: boolean | null; // were you leading at 75'? (only W)
  decisive: DecisiveWindow | null; // when your winner went in (only W)
  // ── THE MIND (semi-automatic by design: the machine counts goals,
  //    only the player can report the psychology) ──
  composure: number | null; // 1..5 self-rated head state (null = skipped)
  note: string | null; // match-scan debrief: key moments + psychology + review line
}

export type MatchDraft = Omit<MatchEntry, 'id' | 'at' | 'source'>;

export interface VaultState {
  matches: MatchEntry[]; // newest first
}

// ── machine-readable journey objectives ───────────────────────
// Pure data, evaluated by `objectiveCount`. `count` = how many
// qualifying matches/goals/lines complete the objective.
export type ObjectiveCheck =
  | { kind: 'journal'; count: number } // Loss Journal lines written
  | { kind: 'thread'; count: number } // Thread lessons settled (held + broke)
  | { kind: 'matches_played'; count: number } // matches logged in the vault
  | { kind: 'composure'; count: number } // matches with a self-rated head state
  | { kind: 'win'; count: number; rankedOnly?: boolean; noSprint?: boolean }
  | { kind: 'pass_acc'; min: number; count: number; rankedOnly?: boolean }
  | { kind: 'concede_max'; max: number; count: number; rankedOnly?: boolean }
  | { kind: 'goals_vs_style'; style: OppStyle; count: number } // cumulative goals vs that style
  | { kind: 'win_decisive_after'; minute: 60 | 80; count: number } // wins where the winner went in after minute X
  | { kind: 'close_out'; count: number } // wins banked while leading at 75'
  | { kind: 'win_with_mechanics'; mechanics: number; count: number; rankedOnly?: boolean }
  | { kind: 'clean_sheet'; count: number; noSprint?: boolean };

const STORAGE_KEY = 'psa.match-vault.v1';
const MAX_GOALS = 9; // stepper ceiling — nobody needs 10 in the vault

let state: VaultState = { matches: [] };
let hydrated = false;

const listeners = new Set<() => void>();
const getState = () => state;
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function set(next: Partial<VaultState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw: string | null) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<VaultState>;
      if (Array.isArray(saved.matches)) {
        state = { matches: saved.matches.filter(isMatchEntry) };
        listeners.forEach((l) => l());
      }
    })
    .catch(() => {});
}
void ensureHydrated();

/** defensive: only revive rows that look like real entries */
function isMatchEntry(m: unknown): m is MatchEntry {
  const e = m as MatchEntry;
  return !!e && typeof e.id === 'string' && typeof e.gf === 'number' && typeof e.ga === 'number';
}

/** imperative read for non-React code (community share actions etc.) */
export function getVault(): VaultState {
  return state;
}

let seq = 1;
export function addMatch(draft: MatchDraft, source: MatchEntry['source'] = 'manual'): MatchEntry {
  const entry: MatchEntry = {
    ...draft,
    gf: clampGoals(draft.gf),
    ga: clampGoals(draft.ga),
    composure: draft.composure == null ? null : Math.max(1, Math.min(5, Math.round(draft.composure))),
    note: draft.note?.trim() ? draft.note.trim().slice(0, 600) : null,
    id: `M${Date.now().toString(36)}${(seq++).toString(36)}`,
    at: Date.now(),
    source,
  };
  set({ matches: [entry, ...state.matches] });
  // push to the academy server if it's reachable (dynamic import —
  // cloudSync imports this file, so a static import would cycle)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { pushMatch } = require('./cloudSync');
    pushMatch(entry);
  } catch {
    /* cloud layer not loaded yet; the outbox flush on boot covers it */
  }
  return entry;
}

export function removeMatch(id: string) {
  set({ matches: state.matches.filter((m) => m.id !== id) });
}

/** attach/update a self-rated head state on an existing receipt (THE MIND
 *  is semi-automatic by design: the machine counts goals, the player owns
 *  the psychology — the Mirror Session writes it after the full-time
 *  reflection, before the review). */
export function setMatchComposure(id: string, composure: number) {
  const c = Math.max(1, Math.min(5, Math.round(composure)));
  set({
    matches: state.matches.map((m) => (m.id === id ? { ...m, composure: c } : m)),
  });
}

// server row shape (backend.ts ServerMatchRow) — declared structurally
// here so the cloud layer can feed us rows without a circular import
export interface ServerMatchRowLike {
  client_id: string;
  at: number;
  gf: number;
  ga: number;
  mode: string | null;
  opp_style: string | null;
  pass_acc: number | null;
  no_sprint: number;
  mechanics_used: number;
  led_at75: number | null;
  decisive: string | null;
  source: string;
  composure?: number | null;
  note?: string | null;
}

/** merge matches that came from the server (other devices) into the
 *  local vault — dedupe by id, keep newest-first ordering. */
export function mergeServerMatches(rows: ServerMatchRowLike[]) {
  const known = new Set(state.matches.map((m) => m.id));
  const fresh: MatchEntry[] = [];
  for (const r of rows) {
    if (!r || known.has(r.client_id)) continue;
    fresh.push({
      id: r.client_id,
      at: r.at,
      source: r.source === 'watcher' ? 'watcher' : 'manual',
      gf: clampGoals(r.gf),
      ga: clampGoals(r.ga),
      mode: (MATCH_MODES as readonly string[]).includes(r.mode ?? '') ? (r.mode as MatchMode) : 'RANKED',
      oppStyle: (OPP_STYLES as readonly string[]).includes(r.opp_style ?? '') ? (r.opp_style as OppStyle) : 'HARD TO TELL',
      passAcc: r.pass_acc,
      noSprint: r.no_sprint === 1,
      mechanicsUsed: Math.max(0, Math.min(3, r.mechanics_used ?? 0)),
      ledAt75: r.led_at75 === null ? null : r.led_at75 === 1,
      decisive: (r.decisive as DecisiveWindow | null) ?? null,
      composure: r.composure ?? null,
      note: r.note ?? null,
    });
    known.add(r.client_id);
  }
  if (fresh.length) {
    set({ matches: [...state.matches, ...fresh].sort((a, b) => b.at - a.at) });
  }
}

export function clampGoals(n: number): number {
  return Math.max(0, Math.min(MAX_GOALS, Math.round(n)));
}

// ── derived read helpers ──────────────────────────────────────

export type MatchResult = 'W' | 'D' | 'L';
export function resultOf(m: Pick<MatchEntry, 'gf' | 'ga'>): MatchResult {
  return m.gf > m.ga ? 'W' : m.gf < m.ga ? 'L' : 'D';
}

/** one-glance match line, e.g. "W 3–1 · RANKED · VS LOW BLOCK" */
export function describeMatch(m: MatchEntry): string {
  return `${resultOf(m)} ${m.gf}–${m.ga} · ${m.mode} · VS ${m.oppStyle}`;
}

/** grade one objective against the whole vault (+ journal + thread totals) */
export function objectiveCount(
  check: ObjectiveCheck,
  matches: MatchEntry[],
  journalTotal: number,
  threadTotal = 0,
): number {
  const ranked = (m: MatchEntry, only?: boolean) => !only || m.mode === 'RANKED';
  switch (check.kind) {
    case 'journal':
      return journalTotal;
    case 'thread':
      return threadTotal;
    case 'matches_played':
      return matches.length;
    case 'composure':
      return matches.filter((m) => m.composure != null).length;
    case 'win':
      return matches.filter((m) => resultOf(m) === 'W' && ranked(m, check.rankedOnly) && (!check.noSprint || m.noSprint)).length;
    case 'pass_acc':
      return matches.filter((m) => m.passAcc != null && m.passAcc >= check.min && ranked(m, check.rankedOnly)).length;
    case 'concede_max':
      return matches.filter((m) => m.ga <= check.max && ranked(m, check.rankedOnly)).length;
    case 'goals_vs_style':
      return matches.filter((m) => m.oppStyle === check.style).reduce((sum, m) => sum + m.gf, 0);
    case 'win_decisive_after':
      return matches.filter((m) => {
        if (resultOf(m) !== 'W' || !m.decisive || m.decisive === 'EARLY') return false;
        if (check.minute === 80) return m.decisive === 'AFTER 80';
        return m.decisive === 'AFTER 60' || m.decisive === 'AFTER 80';
      }).length;
    case 'close_out':
      return matches.filter((m) => resultOf(m) === 'W' && m.ledAt75 === true).length;
    case 'win_with_mechanics':
      return matches.filter((m) => resultOf(m) === 'W' && m.mechanicsUsed >= check.mechanics && ranked(m, check.rankedOnly)).length;
    case 'clean_sheet':
      return matches.filter((m) => m.ga === 0 && (!check.noSprint || m.noSprint)).length;
    default:
      return 0;
  }
}

// ── the hook + aggregates ─────────────────────────────────────

export interface VaultStats {
  played: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  cleanSheets: number;
  winStreak: number;
  lastMatch: MatchEntry | null;
}

export function useMatches(): VaultState & VaultStats {
  useEffect(ensureHydrated, []);
  const s = useSyncExternalStore(subscribe, getState);
  return { ...s, ...computeStats(s.matches) };
}

function computeStats(matches: MatchEntry[]): VaultStats {
  let w = 0;
  let d = 0;
  let l = 0;
  let gf = 0;
  let ga = 0;
  let cleanSheets = 0;
  for (const m of matches) {
    const r = resultOf(m);
    if (r === 'W') w += 1;
    else if (r === 'D') d += 1;
    else l += 1;
    gf += m.gf;
    ga += m.ga;
    if (m.ga === 0) cleanSheets += 1;
  }
  let winStreak = 0;
  for (const m of matches) {
    // newest first — count consecutive Ws from the top
    if (resultOf(m) === 'W') winStreak += 1;
    else break;
  }
  return { played: matches.length, w, d, l, gf, ga, cleanSheets, winStreak, lastMatch: matches[0] ?? null };
}
