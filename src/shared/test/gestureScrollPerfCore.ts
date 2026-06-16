/**
 * Scroll / sustained-render budgets for Gesture Collections grid (CUJ-003).
 * Playwright measures wall-clock frame gaps during scripted scroll — not a true FPS counter,
 * but catches main-thread stalls that feel janky.
 */

/** Target ~60fps — allow one missed frame plus scheduler slack on CI. */
export const COLLECTIONS_SCROLL_MAX_FRAME_MS = 50;

/** Long tasks (>50ms) during a short scroll burst should stay rare. */
export const COLLECTIONS_SCROLL_MAX_LONG_TASKS = 6;

export type GestureScrollPerfSample = {
  frameSamples: number;
  maxFrameMs: number;
  p95FrameMs: number;
  longTaskCount: number;
  maxLongTaskMs: number;
};

export function summarizeGestureScrollFrames(frameMs: number[]): {
  maxFrameMs: number;
  p95FrameMs: number;
} {
  if (frameMs.length === 0) return { maxFrameMs: 0, p95FrameMs: 0 };
  const sorted = [...frameMs].sort((a, b) => a - b);
  const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return {
    maxFrameMs: sorted[sorted.length - 1] ?? 0,
    p95FrameMs: sorted[p95Index] ?? 0,
  };
}

export function formatGestureScrollPerfMessage(sample: GestureScrollPerfSample): string {
  return `scroll perf: maxFrame=${sample.maxFrameMs.toFixed(1)}ms p95=${sample.p95FrameMs.toFixed(1)}ms longTasks=${sample.longTaskCount} maxLong=${sample.maxLongTaskMs.toFixed(1)}ms`;
}
