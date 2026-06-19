import { test, expect } from '@playwright/test';
import {
  assertMuscleOrbitPerfBudget,
  measureMuscleOrbitPerf,
} from '../helpers/muscleOrbitPerf';

test.describe('Muscle Memory orbit perf', () => {
  test('fundamentals orbit stays within frame budget', async ({ page }) => {
    await page.goto('/muscle/');
    await expect(page.getByTestId('muscle-app')).toBeVisible();
    await expect(page.getByTestId('muscle-training-canvas')).toBeVisible();

    const canvas = page.locator('[data-testid="muscle-training-canvas"] canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    // Wait for skeleton GLB decode + first paint before sampling orbit frames.
    await page.getByRole('radio', { name: /^Skeleton\. Bones and joints only\./ }).click();
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Skeleton view · 12 visible', {
      timeout: 15_000,
    });
    // Let BVH + shader compile finish before sampling (parallel CI shares CPU).
    await page.waitForTimeout(1500);

    const sample = await measureMuscleOrbitPerf(page);
    assertMuscleOrbitPerfBudget(sample);
  });

  test('torso orbit stays within frame budget', async ({ page }) => {
    await page.goto('/muscle/');
    await expect(page.getByTestId('muscle-app')).toBeVisible();

    await page.getByLabel('Training module').selectOption('torso');
    const canvas = page.locator('[data-testid="muscle-training-canvas"] canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1200);

    const sample = await measureMuscleOrbitPerf(page);
    assertMuscleOrbitPerfBudget(sample);
  });
});
