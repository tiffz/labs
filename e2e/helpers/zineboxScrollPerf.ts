import type { Page } from '@playwright/test';
import {
  getZineboxScrollPerfLimits,
  type ZineboxScrollPerfSample,
} from '../../src/shared/test/zineboxScrollPerfCore';

const SCROLL_STEPS = 24;
const SCROLL_WARMUP_STEPS = 6;
const SCROLL_DELTA_PX = 180;
const STEP_DELAY_MS = 24;

/**
 * Scrolls the library body (not window) and samples frame / long-task stats.
 */
export async function measureZineboxLibraryScrollPerf(page: Page): Promise<ZineboxScrollPerfSample> {
  return page.evaluate(
    async ({ steps, warmupSteps, delta, stepDelayMs, scrollerSelector }) => {
      const scroller = document.querySelector(scrollerSelector);
      if (!scroller) {
        throw new Error(`Missing scroll container: ${scrollerSelector}`);
      }

      async function runScrollBurst({
        burstSteps,
        recordSamples,
      }: {
        burstSteps: number;
        recordSamples: boolean;
      }) {
        const frameMs: number[] = [];
        const longTaskDurations: number[] = [];

        let observer: PerformanceObserver | null = null;
        if (recordSamples && typeof PerformanceObserver !== 'undefined') {
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

        for (let i = 0; i < burstSteps; i += 1) {
          scroller!.scrollTop += delta;
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          if (recordSamples) sampleFrame();
          await new Promise<void>((resolve) => setTimeout(resolve, stepDelayMs));
          last = performance.now();
        }

        if (observer) observer.disconnect();

        if (!recordSamples) {
          return {
            frameSamples: 0,
            maxFrameMs: 0,
            p95FrameMs: 0,
            longTaskCount: 0,
            maxLongTaskMs: 0,
          };
        }

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
      }

      if (warmupSteps > 0) {
        await runScrollBurst({ burstSteps: warmupSteps, recordSamples: false });
        scroller.scrollTop = 0;
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }

      return runScrollBurst({ burstSteps: steps, recordSamples: true });
    },
    {
      steps: SCROLL_STEPS,
      warmupSteps: SCROLL_WARMUP_STEPS,
      delta: SCROLL_DELTA_PX,
      stepDelayMs: STEP_DELAY_MS,
      scrollerSelector: '.zinebox-library-body',
    },
  );
}

/**
 * Advisory scroll-perf report: warns when over budget but never fails the test.
 *
 * Frame timing on a shared CI runner is dominated by hardware, not the app, so the budget is
 * advisory. The blocking guard is the deterministic `toHaveCount` (grid renders all cover cards)
 * in the spec. A real jank regression still surfaces as a `[scroll-perf]` warning in CI logs.
 * See docs/TEST_STRATEGY.md § Low-ROI test removal (principle 5).
 */
export function reportZineboxLibraryScrollBudget(sample: ZineboxScrollPerfSample): void {
  const limits = getZineboxScrollPerfLimits();
  const violations: string[] = [];
  if (sample.p95FrameMs > limits.maxFrameMs) {
    violations.push(`p95 frame ${sample.p95FrameMs.toFixed(1)}ms > ${limits.maxFrameMs}ms`);
  }
  if (sample.maxFrameMs > limits.maxSpikeMs) {
    violations.push(`max frame ${sample.maxFrameMs.toFixed(1)}ms > spike ${limits.maxSpikeMs}ms`);
  }
  if (sample.longTaskCount > limits.maxLongTasks) {
    violations.push(`${sample.longTaskCount} long tasks > ${limits.maxLongTasks}`);
  }
  if (violations.length > 0) {
    console.warn(`[scroll-perf] zinebox library (advisory): ${violations.join('; ')}`);
  }
}
