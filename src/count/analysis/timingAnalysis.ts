/**
 * Pure functions for timing analysis computations.
 */

export interface TimingBucket {
  rangeMs: [number, number];
  count: number;
  label: string;
}

export function buildTimingHistogram(deltas: number[], bucketSize: number = 5): TimingBucket[] {
  const min = -50;
  const max = 50;
  const buckets: TimingBucket[] = [];

  for (let start = min; start < max; start += bucketSize) {
    const end = start + bucketSize;
    const count = deltas.filter((d) => d >= start && d < end).length;
    buckets.push({
      rangeMs: [start, end],
      count,
      label: `${start >= 0 ? '+' : ''}${start}`,
    });
  }

  return buckets;
}

export function classifyAccuracy(deltaMs: number): 'excellent' | 'good' | 'fair' | 'poor' {
  const abs = Math.abs(deltaMs);
  if (abs <= 10) return 'excellent';
  if (abs <= 20) return 'good';
  if (abs <= 35) return 'fair';
  return 'poor';
}

export function computeRunningAverage(deltas: number[], windowSize: number = 10): number | null {
  if (deltas.length === 0) return null;
  const window = deltas.slice(-windowSize);
  return window.reduce((a, b) => a + b, 0) / window.length;
}
