import type { Page } from '@playwright/test';
import {
  ZINEBOX_LIBRARY_SCROLL_MAX_FRAME_MS,
  ZINEBOX_LIBRARY_SCROLL_MAX_LONG_TASKS,
  type ZineboxScrollPerfSample,
} from '../../src/shared/test/zineboxScrollPerfCore';

const SCROLL_STEPS = 24;
const SCROLL_DELTA_PX = 180;
const STEP_DELAY_MS = 24;

/**
 * Scrolls the library body (not window) and samples frame / long-task stats.
 */
export async function measureZineboxLibraryScrollPerf(page: Page): Promise<ZineboxScrollPerfSample> {
  return page.evaluate(
    async ({ steps, delta, stepDelayMs, scrollerSelector }) => {
      const scroller = document.querySelector(scrollerSelector);
      if (!scroller) {
        throw new Error(`Missing scroll container: ${scrollerSelector}`);
      }

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
        scroller.scrollTop += delta;
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        sampleFrame();
        await new Promise<void>((resolve) => setTimeout(resolve, stepDelayMs));
        last = performance.now();
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
    {
      steps: SCROLL_STEPS,
      delta: SCROLL_DELTA_PX,
      stepDelayMs: STEP_DELAY_MS,
      scrollerSelector: '.zinebox-library-body',
    },
  );
}

export function assertZineboxLibraryScrollBudget(sample: ZineboxScrollPerfSample): void {
  if (sample.maxFrameMs > ZINEBOX_LIBRARY_SCROLL_MAX_FRAME_MS) {
    throw new Error(
      `max scroll frame ${sample.maxFrameMs.toFixed(1)}ms exceeds budget ${ZINEBOX_LIBRARY_SCROLL_MAX_FRAME_MS}ms`,
    );
  }
  if (sample.p95FrameMs > ZINEBOX_LIBRARY_SCROLL_MAX_FRAME_MS) {
    throw new Error(
      `p95 scroll frame ${sample.p95FrameMs.toFixed(1)}ms exceeds budget ${ZINEBOX_LIBRARY_SCROLL_MAX_FRAME_MS}ms`,
    );
  }
  if (sample.longTaskCount > ZINEBOX_LIBRARY_SCROLL_MAX_LONG_TASKS) {
    throw new Error(
      `${sample.longTaskCount} long tasks during scroll exceeds budget ${ZINEBOX_LIBRARY_SCROLL_MAX_LONG_TASKS}`,
    );
  }
}
