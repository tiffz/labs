import { test, expect } from '@playwright/test';

async function setLayerPeelDepth(page: import('@playwright/test').Page, depth: 0 | 1 | 2 | 3 | 4) {
  await page.getByRole('slider', { name: 'Depth' }).fill(String(depth));
}

test.describe('Muscle Memory full body skeleton', () => {
  test('loads core bones at skeleton peel with debug inventory', async ({ page }) => {
    await page.goto('/muscle/?debug=1');
    await expect(page.getByTestId('muscle-app')).toBeVisible();
    await expect(page.getByTestId('muscle-training-canvas')).toBeVisible({ timeout: 15_000 });

    await setLayerPeelDepth(page, 4);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Skeleton ·', { timeout: 15_000 });

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const debug = window.__MUSCLE_ANATOMY_DEBUG__;
            return debug?.anatomyNodeIds?.length ?? 0;
          }),
        { timeout: 20_000 },
      )
      .toBeGreaterThan(400);

    const missingBones = await page.evaluate(() => {
      const payload = window.__LABS_DEBUG__ as { missingRequiredBones?: string[] } | undefined;
      return payload?.missingRequiredBones ?? ['debug payload missing'];
    });

    expect(missingBones, `Missing bones: ${missingBones.join(', ')}`).toEqual([]);
  });
});

declare global {
  interface Window {
    __MUSCLE_ANATOMY_DEBUG__?: { anatomyNodeIds: string[]; skinNodeIds: string[] };
    __LABS_DEBUG__?: { missingRequiredBones?: string[] };
  }
}
