import type { Page } from '@playwright/test';
import {
  getMuscleOrbitPerfLimits,
  type MuscleOrbitPerfSample,
} from '../../src/shared/test/muscleOrbitPerfCore';

const ORBIT_STEPS = 24;
const ORBIT_WARMUP_STEPS = 8;
const STEP_DELAY_MS = 16;

type OrbitDragOptions = {
  steps: number;
  stepDelayMs: number;
  /** When true, pointer drag runs but frame gaps are not recorded (GLB settle + shader warm-up). */
  warmupOnly?: boolean;
};

/**
 * Simulates canvas orbit via pointer events and samples rAF frame gaps.
 * Run after the training canvas WebGL context is visible.
 */
export async function measureMuscleOrbitPerf(page: Page): Promise<MuscleOrbitPerfSample> {
  return page.evaluate(
    async ({ steps, stepDelayMs, warmupSteps }) => {
      if (warmupSteps > 0) {
        await runOrbitDrag({ steps: warmupSteps, stepDelayMs, warmupOnly: true });
      }
      return runOrbitDrag({ steps, stepDelayMs, warmupOnly: false });

      async function runOrbitDrag({
        steps: dragSteps,
        stepDelayMs: delayMs,
        warmupOnly = false,
      }: OrbitDragOptions) {
      const frameMs: number[] = [];
      const longTaskDurations: number[] = [];

      let observer: PerformanceObserver | null = null;
      if (!warmupOnly && typeof PerformanceObserver !== 'undefined') {
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

      const canvas = document.querySelector(
        '[data-testid="muscle-training-canvas"] canvas',
      ) as HTMLCanvasElement | null;
      if (!canvas) {
        throw new Error('Muscle training canvas not found');
      }

      const rect = canvas.getBoundingClientRect();
      const startX = rect.left + rect.width * 0.5;
      const startY = rect.top + rect.height * 0.5;

      const dispatch = (type: string, clientX: number, clientY: number) => {
        canvas.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            buttons: type === 'pointerup' ? 0 : 1,
          }),
        );
      };

      let last = performance.now();
      const sampleFrame = () => {
        const now = performance.now();
        frameMs.push(now - last);
        last = now;
      };

      dispatch('pointerdown', startX, startY);

      for (let i = 0; i < dragSteps; i += 1) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (!warmupOnly) sampleFrame();
        dispatch('pointermove', startX + i * 10, startY + i * 4);
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
        last = performance.now();
      }

      dispatch('pointerup', startX + dragSteps * 10, startY + dragSteps * 4);

      if (warmupOnly) {
        return {
          frameSamples: 0,
          maxFrameMs: 0,
          p95FrameMs: 0,
          longTaskCount: 0,
          maxLongTaskMs: 0,
        };
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
      }
    },
    { steps: ORBIT_STEPS, stepDelayMs: STEP_DELAY_MS, warmupSteps: ORBIT_WARMUP_STEPS },
  );
}

export function assertMuscleOrbitPerfBudget(sample: MuscleOrbitPerfSample): void {
  const limits = getMuscleOrbitPerfLimits();
  if (sample.frameSamples < limits.minFrameSamples) {
    throw new Error(`only ${sample.frameSamples} frame samples (need ${limits.minFrameSamples})`);
  }
  if (sample.maxFrameMs > limits.maxSpikeMs) {
    throw new Error(
      `max orbit frame ${sample.maxFrameMs.toFixed(1)}ms exceeds spike budget ${limits.maxSpikeMs}ms`,
    );
  }
  if (sample.p95FrameMs > limits.maxFrameMs) {
    throw new Error(
      `p95 orbit frame ${sample.p95FrameMs.toFixed(1)}ms exceeds budget ${limits.maxFrameMs}ms`,
    );
  }
  if (sample.longTaskCount > limits.maxLongTasks) {
    throw new Error(
      `${sample.longTaskCount} long tasks during orbit exceeds budget ${limits.maxLongTasks}`,
    );
  }
}
