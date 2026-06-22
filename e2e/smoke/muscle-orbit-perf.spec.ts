import { test, expect } from '@playwright/test';
import {
  assertMuscleOrbitPerfBudget,
  measureMuscleOrbitPerf,
} from '../helpers/muscleOrbitPerf';

async function setLayerPeelDepth(page: import('@playwright/test').Page, depth: 0 | 1 | 2) {
  await page.getByRole('slider', { name: 'Depth' }).fill(String(depth));
}

test.describe('Muscle Memory orbit perf', () => {
  test.describe.configure({ timeout: 60_000 });

  test('fundamentals orbit stays within frame budget', async ({ page }) => {
    await page.goto('/muscle/?module=fundamentals');
    await expect(page.getByTestId('muscle-app')).toBeVisible();
    await expect(page.getByTestId('muscle-training-canvas')).toBeVisible();

    const canvas = page.locator('[data-testid="muscle-training-canvas"] canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    await setLayerPeelDepth(page, 2);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Skeleton · 12 visible', {
      timeout: 15_000,
    });
    // Let BVH + shader compile finish before sampling (parallel CI shares CPU).
    await page.waitForTimeout(2_500);

    const sample = await measureMuscleOrbitPerf(page);
    assertMuscleOrbitPerfBudget(sample);
  });

  test('torso orbit stays within frame budget', async ({ page }) => {
    await page.goto('/muscle/?module=torso');
    await expect(page.getByTestId('muscle-app')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Torso', selected: true })).toBeVisible();

    const canvas = page.locator('[data-testid="muscle-training-canvas"] canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('muscle-layer-status')).toContainText('visible', { timeout: 15_000 });

    await setLayerPeelDepth(page, 2);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Skeleton', { timeout: 15_000 });
    await page.waitForTimeout(2_500);

    const sample = await measureMuscleOrbitPerf(page);
    assertMuscleOrbitPerfBudget(sample);
  });
});
