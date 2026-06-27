import { test, expect } from '@playwright/test';
import { configureDeterministicBrowserState } from './visualTestUtils';

async function setLayerPeelDepth(page: import('@playwright/test').Page, depth: 0 | 1 | 2 | 3 | 4) {
  await page.getByRole('slider', { name: 'Depth' }).fill(String(depth));
}

test.describe('Muscle Memory full body skin visual baseline', () => {
  test.describe.configure({ timeout: 90_000 });

  test('full figure peel 0 canvas matches prod-parity baseline', async ({ page }) => {
    await configureDeterministicBrowserState(page);
    await page.goto('/muscle/');
    await expect(page.getByTestId('muscle-app')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Full body', selected: true })).toBeVisible();
    await expect(page.getByTestId('muscle-training-canvas')).toBeVisible({ timeout: 15_000 });

    await setLayerPeelDepth(page, 0);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Full figure', { timeout: 15_000 });

    // Wait for WebGL skin meshes before capture (same signal as smoke inventory test).
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const canvas = document.querySelector('[data-testid="muscle-training-canvas"] canvas');
            return canvas instanceof HTMLCanvasElement && canvas.width > 0 ? 1 : 0;
          }),
        { timeout: 25_000 },
      )
      .toBe(1);

    // Let orbit + skin materials settle (no ?debug overlays — prod-like view).
    await page.waitForTimeout(2500);

    const webglCanvas = page.locator('[data-testid="muscle-training-canvas"] canvas');
    await expect(webglCanvas).toBeVisible({ timeout: 15_000 });
    await expect(webglCanvas).toHaveScreenshot('muscle-full-body-skin-peel0-canvas.png', {
      maxDiffPixelRatio: 0.02,
      timeout: 30_000,
    });
  });
});
