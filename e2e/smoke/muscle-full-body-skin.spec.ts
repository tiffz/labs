import { test, expect } from '@playwright/test';

async function setLayerPeelDepth(page: import('@playwright/test').Page, depth: 0 | 1 | 2 | 3 | 4) {
  await page.getByRole('slider', { name: 'Depth' }).fill(String(depth));
}

test.describe('Muscle Memory full body skin', () => {
  test.describe.configure({ timeout: 60_000 });

  test('loads unified skin envelope at full figure peel with debug inventory', async ({ page }) => {
    await page.goto('/muscle/?debug=1');
    await expect(page.getByTestId('muscle-app')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Full body', selected: true })).toBeVisible();
    await expect(page.getByTestId('muscle-training-canvas')).toBeVisible({ timeout: 15_000 });

    await setLayerPeelDepth(page, 0);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Full figure', { timeout: 15_000 });

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const debug = window.__MUSCLE_ANATOMY_DEBUG__;
            return debug?.skinNodeIds?.length ?? 0;
          }),
        { timeout: 20_000 },
      )
      .toBeGreaterThan(0);

    const { missingSkin, skinIds } = await page.evaluate(() => {
      const payload = window.__LABS_DEBUG__ as { missingRequiredSkin?: string[] } | undefined;
      return {
        missingSkin: payload?.missingRequiredSkin ?? ['debug payload missing'],
        skinIds: window.__MUSCLE_ANATOMY_DEBUG__?.skinNodeIds ?? [],
      };
    });

    expect(missingSkin, `Missing skin overlays: ${missingSkin.join(', ')}`).toEqual([]);
    expect(skinIds.some((id) => id.includes('skin'))).toBe(true);
  });
});

declare global {
  interface Window {
    __MUSCLE_ANATOMY_DEBUG__?: { anatomyNodeIds: string[]; skinNodeIds: string[] };
    __LABS_DEBUG__?: { missingRequiredSkin?: string[] };
  }
}
