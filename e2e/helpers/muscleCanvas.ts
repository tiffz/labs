import { expect, type Page } from '@playwright/test';

/**
 * Generous visibility budget for the Muscle Memory WebGL canvas. The 5s Playwright default is too
 * tight: under the **full parallel smoke suite** (and especially when smoke runs right after the
 * heavy presubmit in `presubmit:push`), WebGL context creation + the large Z-Anatomy GLB load can
 * push first paint of `muscle-training-canvas` well past 5s. Parallel muscle smokes (shoulder GLB +
 * full-body atlas) contend for software WebGL on CI — use 40s per readiness gate. See docs/FLAKY_TESTS.md.
 */
export const MUSCLE_CANVAS_TIMEOUT_MS = 40_000;

/** Wait for the muscle app shell, WebGL canvas, and first anatomy scene layout. */
export async function expectMuscleCanvasReady(page: Page): Promise<void> {
  await expect(page.getByTestId('muscle-app')).toBeVisible({ timeout: MUSCLE_CANVAS_TIMEOUT_MS });
  await expect(page.getByTestId('muscle-training-canvas')).toBeVisible({
    timeout: MUSCLE_CANVAS_TIMEOUT_MS,
  });
  await expect(page.locator('.muscle-canvas-wrap.is-ready')).toBeVisible({
    timeout: MUSCLE_CANVAS_TIMEOUT_MS,
  });
}
