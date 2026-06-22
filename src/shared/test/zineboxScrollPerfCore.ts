/**
 * Scroll budgets for Zine Box library grid (CUJ-001).
 * Playwright samples rAF gaps while scrolling `.zinebox-library-body`.
 */

/** Target ~60fps — allow one missed frame plus scheduler slack on CI. */
export const ZINEBOX_LIBRARY_SCROLL_MAX_FRAME_MS = 50;

/** Single-frame hitch during parallel CI or image decode — not sustained judder. */
export const ZINEBOX_LIBRARY_SCROLL_MAX_SPIKE_MS = 80;

/** Long tasks (>50ms) during a short scroll burst should stay rare. */
export const ZINEBOX_LIBRARY_SCROLL_MAX_LONG_TASKS = 8;

/** Local dev targets ~60fps; GitHub Actions uses shared CPU and software rendering. */
export function getZineboxScrollPerfLimits(): {
  maxFrameMs: number;
  maxSpikeMs: number;
  maxLongTasks: number;
} {
  if (typeof process !== 'undefined' && process.env.CI) {
    return {
      maxFrameMs: 50,
      maxSpikeMs: 100,
      maxLongTasks: 16,
    };
  }
  return {
    maxFrameMs: ZINEBOX_LIBRARY_SCROLL_MAX_FRAME_MS,
    maxSpikeMs: ZINEBOX_LIBRARY_SCROLL_MAX_SPIKE_MS,
    maxLongTasks: ZINEBOX_LIBRARY_SCROLL_MAX_LONG_TASKS,
  };
}

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
