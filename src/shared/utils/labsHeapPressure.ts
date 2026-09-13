/**
 * Warn about a heap that is heading for an out-of-memory kill, while there is still a page alive to
 * write the warning.
 *
 * The owner reports Stanza "regularly crashes". Her crash log holds four entries, one of them an
 * `out of memory`. Four is not "regularly" — and the discrepancy is the finding, not a
 * contradiction: **a tab killed for memory has no JavaScript left to record why.** The log is
 * structurally blind to the exact failure mode most likely to be hers, and the one OOM entry we did
 * capture got lucky.
 *
 * So this samples the heap on a slow interval and writes an entry when usage crosses a share of the
 * limit, BEFORE the kill. The trend matters more than the absolute: a leak during practice shows as
 * a ratchet that never comes back down across loop wraps, which is invisible in a single reading.
 *
 * Chrome-only (`performance.memory` is non-standard and unshipped elsewhere), degrades to a no-op,
 * and never throws — instrumentation that can crash the app it is diagnosing is worse than none.
 */

/** Non-standard Chrome heap counters. */
type ChromeMemory = {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
};

export type LabsHeapSample = {
  usedBytes: number;
  limitBytes: number;
  /** 0–1 share of the limit in use. */
  ratio: number;
};

/** Warn here; Chrome tends to kill somewhere above this, with little warning. */
export const LABS_HEAP_WARN_RATIO = 0.7;
/** Re-warn only after climbing this much further, so one session cannot flood 50 log slots. */
export const LABS_HEAP_REWARN_STEP = 0.1;

export function readLabsHeapSample(perf: Partial<Performance> | undefined): LabsHeapSample | null {
  const memory = (perf as { memory?: Partial<ChromeMemory> } | undefined)?.memory;
  if (!memory) return null;
  const usedBytes = memory.usedJSHeapSize;
  const limitBytes = memory.jsHeapSizeLimit;
  if (typeof usedBytes !== 'number' || typeof limitBytes !== 'number') return null;
  if (!Number.isFinite(usedBytes) || !Number.isFinite(limitBytes) || limitBytes <= 0) return null;
  return { usedBytes, limitBytes, ratio: usedBytes / limitBytes };
}

/**
 * Should this sample be written down, given the worst already reported?
 *
 * Reports on first crossing, then only after a further {@link LABS_HEAP_REWARN_STEP}, so a session
 * that sits just over the line writes one entry rather than hundreds — the crash log keeps 50, and
 * flooding it would evict the crash we are trying to read.
 */
export function shouldReportHeapPressure(
  sample: LabsHeapSample | null,
  lastReportedRatio: number | null,
): boolean {
  if (!sample) return false;
  if (sample.ratio < LABS_HEAP_WARN_RATIO) return false;
  if (lastReportedRatio == null) return true;
  return sample.ratio >= lastReportedRatio + LABS_HEAP_REWARN_STEP;
}

const MB = 1024 * 1024;

/** One line that says how bad it is and what was happening, without needing a heap dump to read. */
export function formatHeapPressureMessage(sample: LabsHeapSample, note?: string): string {
  const used = Math.round(sample.usedBytes / MB);
  const limit = Math.round(sample.limitBytes / MB);
  const pct = Math.round(sample.ratio * 100);
  const suffix = note ? ` · ${note}` : '';
  return `Heap pressure: ${used}MB of ${limit}MB (${pct}%) — approaching an out-of-memory tab kill${suffix}`;
}
