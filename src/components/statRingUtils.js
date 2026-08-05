// Small pure helper for StatRing geometry so it can be tested from Node
export function computeRingMetrics(value, size = 64) {
  const v = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
  const R = Math.floor(size * 0.42);
  const C = 2 * Math.PI * R;
  const dash = (v / 100) * C;
  return { value: v, R, C, dash };
}
