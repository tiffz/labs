import { test, expect } from '@playwright/test';
import {
  GESTURE_E2E_PACK_ID,
  assertGesturePreviewStripHttps,
  collectPageConsoleErrors,
  prepareGestureE2ePage,
  stubGestureDriveThumbnailImages,
} from '../helpers/gesturePreviewFixtures';

async function stubDriveThumbnailImages(page: Parameters<typeof stubGestureDriveThumbnailImages>[0]): Promise<void> {
  await stubGestureDriveThumbnailImages(page);
}

/**
 * Collections tab cards render four preview thumbs per pack (Practice select cards show two).
 * Catches preview-tier regressions (lazy load, wrong I/O order, blob display) that Vitest misses.
 */
test.describe('Gesture preview strip', () => {
  test('loads four visible preview images per collection card', async ({ page }) => {
    const consoleErrors = collectPageConsoleErrors(page);
    await prepareGestureE2ePage(page);
    await stubDriveThumbnailImages(page);

    await page.goto('/gesture/?e2eSeed=1');

    await page.getByRole('tab', { name: 'Collections' }).click();

    const card = page.locator(`[data-pack-id="${GESTURE_E2E_PACK_ID}"].gesture-collection-card--manage`);
    await expect(card).toBeVisible({ timeout: 15_000 });

    const strip = card.locator('.gesture-preview-strip');
    await expect(strip).toBeVisible({ timeout: 10_000 });

    await assertGesturePreviewStripHttps(strip, 4);

    const blobErrors = consoleErrors.filter(
      (line) => line.includes('ERR_FILE_NOT_FOUND') && line.includes('blob:'),
    );
    expect(blobErrors, 'preview strip should not reference revoked blob URLs').toEqual([]);
  });

  test('practice select cards load two https preview images', async ({ page }) => {
    await prepareGestureE2ePage(page);
    await stubDriveThumbnailImages(page);

    await page.goto('/gesture/?e2eSeed=1');

    const card = page.locator(`[data-pack-id="${GESTURE_E2E_PACK_ID}"].gesture-collection-card--selectable`);
    await expect(card).toBeVisible({ timeout: 15_000 });

    const strip = card.locator('.gesture-preview-strip');
    await assertGesturePreviewStripHttps(strip, 2);
  });
});
