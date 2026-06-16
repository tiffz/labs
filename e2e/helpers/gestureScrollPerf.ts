import type { Page } from '@playwright/test';
import {
  COLLECTIONS_SCROLL_MAX_FRAME_MS,
  COLLECTIONS_SCROLL_MAX_LONG_TASKS,
  type GestureScrollPerfSample,
} from '../../src/shared/test/gestureScrollPerfCore';

const SCROLL_STEPS = 24;
const SCROLL_DELTA_PX = 180;
const STEP_DELAY_MS = 24;

/**
 * Scripts a burst of scroll + rAF samples and returns frame / long-task stats.
 * Run after the Collections grid is visible.
 */
export async function measureGestureCollectionsScrollPerf(
  page: Page,
): Promise<GestureScrollPerfSample> {
  return page.evaluate(
    async ({ steps, delta, stepDelayMs }) => {
      const frameMs: number[] = [];
      const longTaskDurations: number[] = [];

      let observer: PerformanceObserver | null = null;
      if (typeof PerformanceObserver !== 'undefined') {
        try {
          observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.duration >= 50) longTaskDurations.push(entry.duration);
            }
          });
          observer.observe({ entryTypes: ['longtask'] });
        } catch {
          observer = null;
        }
      }

      let last = performance.now();
      const sampleFrame = () => {
        const now = performance.now();
        frameMs.push(now - last);
        last = now;
      };

      for (let i = 0; i < steps; i += 1) {
        window.scrollBy(0, delta);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        sampleFrame();
        await new Promise<void>((resolve) => setTimeout(resolve, stepDelayMs));
      }

      if (observer) observer.disconnect();

      const sortedFrames = [...frameMs].sort((a, b) => a - b);
      const p95Index = Math.min(sortedFrames.length - 1, Math.floor(sortedFrames.length * 0.95));
      const maxLong = longTaskDurations.length > 0 ? Math.max(...longTaskDurations) : 0;

      return {
        frameSamples: frameMs.length,
        maxFrameMs: sortedFrames[sortedFrames.length - 1] ?? 0,
        p95FrameMs: sortedFrames[p95Index] ?? 0,
        longTaskCount: longTaskDurations.length,
        maxLongTaskMs: maxLong,
      };
    },
    { steps: SCROLL_STEPS, delta: SCROLL_DELTA_PX, stepDelayMs: STEP_DELAY_MS },
  );
}

export function assertGestureCollectionsScrollBudget(sample: GestureScrollPerfSample): void {
  if (sample.maxFrameMs > COLLECTIONS_SCROLL_MAX_FRAME_MS) {
    throw new Error(
      `max scroll frame ${sample.maxFrameMs.toFixed(1)}ms exceeds budget ${COLLECTIONS_SCROLL_MAX_FRAME_MS}ms`,
    );
  }
  if (sample.p95FrameMs > COLLECTIONS_SCROLL_MAX_FRAME_MS) {
    throw new Error(
      `p95 scroll frame ${sample.p95FrameMs.toFixed(1)}ms exceeds budget ${COLLECTIONS_SCROLL_MAX_FRAME_MS}ms`,
    );
  }
  if (sample.longTaskCount > COLLECTIONS_SCROLL_MAX_LONG_TASKS) {
    throw new Error(
      `${sample.longTaskCount} long tasks during scroll exceeds budget ${COLLECTIONS_SCROLL_MAX_LONG_TASKS}`,
    );
  }
}
