import { useCallback, useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────
// MATCH SCAN state machine — armed → scanning → passed | failed.
// Accepts LIVE result data (match-ingest service) via the
// `liveResult` seam; until that service exists, pressing the CTA
// resolves a deterministic mock after a short read window.
// TODO(real-match-scan): replace mockScanResult() with the real
// match-result ingest (FC Mobile account link → post-match stats),
// then feed the same ScanResult shape into `applyResult`.
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

/** deterministic demo result — every target met, believable margins */
export function mockScanResult(targets: ScanTargetSpec[]): ScanResult {
  const values: ScanValue[] = targets.map((t) => {
    const m = t.target.match(/\d+/);
    const n = m ? parseInt(m[0], 10) : 0;
    const value = n === 0 ? '0' : `${n + 1}`;
    return { ...t, value, met: true };
  });
  return { values, passed: true };
}

export function useMatchScan(
  targets: ScanTargetSpec[],
  liveResult: ScanResult | null,
  onPassed?: (r: ScanResult) => void,
) {
  const [status, setStatus] = useState<ScanStatus>('armed');
  const [result, setResult] = useState<ScanResult | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyResult = useCallback(
    (r: ScanResult) => {
      setResult(r);
      setStatus(r.passed ? 'passed' : 'failed');
      if (r.passed) onPassed?.(r);
    },
    [onPassed],
  );

  // live seam: as soon as a real match result lands, the card resolves
  useEffect(() => {
    if (liveResult) applyResult(liveResult);
  }, [liveResult, applyResult]);

  const start = useCallback(() => {
    if (status === 'scanning') return;
    setStatus('scanning');
    setResult(null);
    // mock read window — swap for the real ingest listener (see header note)
    console.log('[match-scan] scan started — awaiting match result (mock resolves in 2.8s) TODO(real-match-scan)');
    timer.current = setTimeout(() => applyResult(mockScanResult(targets)), 2800);
  }, [status, targets, applyResult]);

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

  return { status, result, start, reset };
}
