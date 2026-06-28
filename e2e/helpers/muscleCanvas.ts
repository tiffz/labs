import { expect, type Page } from '@playwright/test';

/**
 * Generous visibility budget for the Muscle Memory WebGL canvas. The 5s Playwright default is too
 * tight: under the **full parallel smoke suite** (and especially when smoke runs right after the
 * heavy presubmit in `presubmit:push`), WebGL context creation + the large Z-Anatomy GLB load can
 * push first paint of `muscle-training-canvas` well past 5s. Using a shared constant keeps every
 * muscle smoke from re-introducing the default-timeout flake. See docs/FLAKY_TESTS.md.
 */
export const MUSCLE_CANVAS_TIMEOUT_MS = 20_000;

/** Wait for the muscle app shell and its WebGL canvas to mount with a load-tolerant timeout. */
export async function expectMuscleCanvasReady(page: Page): Promise<void> {
  await expect(page.getByTestId('muscle-app')).toBeVisible({ timeout: MUSCLE_CANVAS_TIMEOUT_MS });
  await expect(page.getByTestId('muscle-training-canvas')).toBeVisible({
    timeout: MUSCLE_CANVAS_TIMEOUT_MS,
  });
}
