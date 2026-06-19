/**
 * Sustained-render budgets for Muscle Memory 3D orbit (CUJ-001).
 * Playwright samples rAF deltas during simulated canvas drag — proxy for 60fps feel.
 */

/** ~60fps with one missed frame + CI software-WebGL slack. */
export const ORBIT_MAX_FRAME_MS = 20;

/** Single-frame hitch during parallel CI or shader warm-up — not sustained judder. */
export const ORBIT_MAX_SPIKE_MS = 50;

/** Long tasks (>50ms) during a short orbit burst should stay rare (parallel CI may inflate). */
export const ORBIT_MAX_LONG_TASKS = 8;

export const ORBIT_MIN_FRAME_SAMPLES = 20;

export type MuscleOrbitPerfSample = {
  frameSamples: number;
  maxFrameMs: number;
  p95FrameMs: number;
  longTaskCount: number;
  maxLongTaskMs: number;
};

export function summarizeMuscleOrbitFrames(frameMs: number[]): {
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

export function formatMuscleOrbitPerfMessage(sample: MuscleOrbitPerfSample): string {
  return `orbit perf: maxFrame=${sample.maxFrameMs.toFixed(1)}ms p95=${sample.p95FrameMs.toFixed(1)}ms longTasks=${sample.longTaskCount} maxLong=${sample.maxLongTaskMs.toFixed(1)}ms`;
}
