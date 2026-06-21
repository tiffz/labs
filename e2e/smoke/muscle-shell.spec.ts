import { test, expect } from '@playwright/test';

test.describe('Muscle Memory shell', () => {
  test('warmup exploration and region tabs', async ({ page }) => {
    await page.goto('/muscle/?module=shoulder_neck');
    await expect(page.getByTestId('muscle-app')).toBeVisible();
    await expect(page.getByTestId('muscle-workout-panel')).toBeVisible();
    await expect(page.getByTestId('muscle-training-canvas')).toBeVisible();

    await expect(page.getByRole('tab', { name: 'Warmup' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Shoulder & neck' })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('slider', { name: 'Depth' }).fill('1');
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Under the skin');
  });
});
