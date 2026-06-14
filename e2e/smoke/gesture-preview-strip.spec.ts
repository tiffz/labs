import { test, expect } from '@playwright/test';
import { GESTURE_E2E_PACK_ID, stubGestureDriveThumbnailImages } from '../helpers/gesturePreviewFixtures';

async function stubDriveThumbnailImages(page: Parameters<typeof stubGestureDriveThumbnailImages>[0]): Promise<void> {
  await stubGestureDriveThumbnailImages(page);
}

/**
 * Practice tab collection cards render four preview thumbs per pack.
 * Catches preview-tier regressions (lazy load, wrong I/O order) that Vitest misses.
 */
test.describe('Gesture preview strip', () => {
  test('loads four visible preview images per collection card', async ({ page }) => {
    await stubDriveThumbnailImages(page);

    await page.goto('/gesture/?e2eSeed=1');

    const card = page.locator(`[data-pack-id="${GESTURE_E2E_PACK_ID}"]`);
    await expect(card).toBeVisible({ timeout: 15_000 });

    const strip = card.locator('.gesture-preview-strip');
    await expect(strip).toBeVisible({ timeout: 10_000 });

    await expect.poll(async () => {
      return strip.locator('img.gesture-preview-image.is-visible').count();
    }).toBe(4);
  });
});
