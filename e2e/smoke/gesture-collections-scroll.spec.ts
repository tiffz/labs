import { test, expect } from '@playwright/test';
import {
  measureGestureCollectionsScrollPerf,
  reportGestureCollectionsScrollBudget,
} from '../helpers/gestureScrollPerf';
import {
  collectPageConsoleErrors,
  prepareGestureE2ePage,
  stubGestureDriveThumbnailImages,
} from '../helpers/gesturePreviewFixtures';

test.describe('Gesture collections scroll perf', () => {
  test('Collections grid scroll stays within frame budget', async ({ page }) => {
    const consoleErrors = collectPageConsoleErrors(page);
    await prepareGestureE2ePage(page);
    await stubGestureDriveThumbnailImages(page);

    await page.goto('/gesture/?e2eSeed=1&e2eScrollGrid=1');

    await page.getByRole('tab', { name: 'Collections' }).click();

    const grid = page.locator('.gesture-collection-grid--compact');
    await expect(grid.locator('.gesture-collection-card--manage').first()).toBeVisible({
      timeout: 15_000,
    });

    await expect(grid.locator('.gesture-collection-card--manage')).toHaveCount(21, {
      timeout: 10_000,
    });

    const sample = await measureGestureCollectionsScrollPerf(page);
    reportGestureCollectionsScrollBudget(sample);

    const blobErrors = consoleErrors.filter(
      (line) => line.includes('ERR_FILE_NOT_FOUND') && line.includes('blob:'),
    );
    expect(blobErrors).toEqual([]);
  });
});
