import { computeRingMetrics } from '../src/components/statRingUtils.js';

function approx(a, b, eps = 1e-6) {
  return Math.abs(a - b) < eps;
}

const r1 = computeRingMetrics(50, 64);
if (r1.value !== 50) {
  console.error('FAILED: value clamping/rounding');
  process.exit(1);
}
if (r1.R <= 0 || !Number.isFinite(r1.C) || r1.dash <= 0) {
  console.error('FAILED: invalid geometry for 50%');
  process.exit(1);
}

const r2 = computeRingMetrics(0, 64);
if (r2.dash !== 0) {
  console.error('FAILED: 0% should produce dash 0');
  process.exit(1);
}

const r3 = computeRingMetrics(100, 100);
if (r3.value !== 100) {
  console.error('FAILED: 100% clamped');
  process.exit(1);
}

console.log('OK: statRing geometry tests passed');
process.exit(0);
