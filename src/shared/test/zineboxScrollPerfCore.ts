/**
 * Scroll budgets for Zine Box library grid (CUJ-001).
 * Playwright samples rAF gaps while scrolling `.zinebox-library-body`.
 */

/** Target ~60fps — allow one missed frame plus scheduler slack on CI. */
export const ZINEBOX_LIBRARY_SCROLL_MAX_FRAME_MS = 50;

/** Long tasks (>50ms) during a short scroll burst should stay rare. */
export const ZINEBOX_LIBRARY_SCROLL_MAX_LONG_TASKS = 8;

export type ZineboxScrollPerfSample = {
  frameSamples: number;
  maxFrameMs: number;
  p95FrameMs: number;
  longTaskCount: number;
  maxLongTaskMs: number;
};

export function formatZineboxScrollPerfMessage(sample: ZineboxScrollPerfSample): string {
  return `scroll perf: maxFrame=${sample.maxFrameMs.toFixed(1)}ms p95=${sample.p95FrameMs.toFixed(1)}ms longTasks=${sample.longTaskCount} maxLong=${sample.maxLongTaskMs.toFixed(1)}ms`;
}
