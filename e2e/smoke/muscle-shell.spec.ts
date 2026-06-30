import { test, expect } from '@playwright/test';
import { expectMuscleCanvasReady } from '../helpers/muscleCanvas';

test.describe('Muscle Memory shell', () => {
  test.describe.configure({ timeout: 60_000 });

  test('warmup exploration and region tabs', async ({ page }) => {
    await page.goto('/muscle/?module=shoulder_neck');
    await expectMuscleCanvasReady(page);
    await expect(page.getByTestId('muscle-workout-panel')).toBeVisible();

    await expect(page.getByTestId('muscle-panel-stack')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Shoulder & neck' })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('slider', { name: 'Depth' }).fill('1');
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Below surface');
  });
});
