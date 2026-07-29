import { useCallback, useEffect, useRef, useState } from 'react';
import { JourneyStage } from '../data/journey';
import { MatchEntry, objectiveCount } from '../data/matches';

// ─────────────────────────────────────────────────────────────
// MATCH SCAN state machine — armed → scanning → passed | failed.
//
// The scan is REAL: it grades the player's own Match Vault against
// this stage's machine-checkable objectives. Nothing passes because
// a timer expired — a stage clears only when the ledger says the
// work was actually done.
//
// Match entry stays honour-system (FC Mobile has no public feed);
// THE EYE prefills the score where the native watcher exists. Both
// land in the same vault, so grading never cares which one wrote it.
// ─────────────────────────────────────────────────────────────

export type ScanStatus = 'armed' | 'scanning' | 'passed' | 'failed';

export interface ScanTargetSpec {
  label: string;
  target: string; // "5+" | "0 FLAGS"
}

export interface ScanValue extends ScanTargetSpec {
  value: string; // observed value, e.g. "6"
  met: boolean;
}

export interface ScanResult {
  values: ScanValue[];
  passed: boolean;
}

/** how long the coach "watches the tape" before the verdict lands */
const READ_WINDOW_MS = 1800;

/**
 * Grade a stage against the vault. Every objective on the stage
 * carries a machine-readable `check`; `objectiveCount` resolves it
 * against real matches + real journal lines. A stage passes only
 * when EVERY objective is met.
 */
export function gradeStage(
  stage: JourneyStage,
  matches: MatchEntry[],
  journalTotal: number,
): ScanResult {
  const objectives = stage.objectives ?? [];
  if (!objectives.length) return { values: [], passed: false };

  const values: ScanValue[] = objectives.map((o) => {
    const count = o.check ? objectiveCount(o.check, matches, journalTotal) : o.done;
    return {
      label: o.label,
      target: String(o.target),
      value: String(Math.min(count, o.target)),
      met: count >= o.target,
    };
  });

  return { values, passed: values.every((v) => v.met) };
}

export function useMatchScan(
  stage: JourneyStage,
  matches: MatchEntry[],
  journalTotal: number,
  onPassed?: (r: ScanResult) => void,
) {
  const [status, setStatus] = useState<ScanStatus>('armed');
  const [result, setResult] = useState<ScanResult | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // keep the freshest ledger without restarting an in-flight read
  const latest = useRef({ stage, matches, journalTotal });
  latest.current = { stage, matches, journalTotal };

  const applyResult = useCallback(
    (r: ScanResult) => {
      setResult(r);
      setStatus(r.passed ? 'passed' : 'failed');
      if (r.passed) onPassed?.(r);
    },
    [onPassed],
  );

  /** arm the scan → read the vault → verdict */
  const start = useCallback(() => {
    if (status === 'scanning') return;
    setStatus('scanning');
    setResult(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const { stage: s, matches: m, journalTotal: j } = latest.current;
      applyResult(gradeStage(s, m, j));
    }, READ_WINDOW_MS);
  }, [status, applyResult]);

  /** grade immediately — used when a fresh match was just logged in-room */
  const gradeNow = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setStatus('scanning');
    setResult(null);
    timer.current = setTimeout(() => {
      const { stage: s, matches: m, journalTotal: j } = latest.current;
      applyResult(gradeStage(s, m, j));
    }, 900);
  }, [applyResult]);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setStatus('armed');
    setResult(null);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { status, result, start, gradeNow, reset };
}
