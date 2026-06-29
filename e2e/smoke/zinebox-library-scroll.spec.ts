import { expect, test } from '@playwright/test';

import { expectZineboxLibraryChrome } from '../helpers/zineboxLibrary';
import {
  measureZineboxLibraryScrollPerf,
  reportZineboxLibraryScrollBudget,
} from '../helpers/zineboxScrollPerf';

test.describe('Zine Box library scroll perf', () => {
  test('library grid scroll stays within frame budget', async ({ page }) => {
    await page.goto('/zinebox/?e2eSeed=1&e2eScrollGrid=1');
    await expect(page).toHaveTitle(/Zine Box/i);
    await expectZineboxLibraryChrome(page);

    const grid = page.locator('.zinebox-library-grid');
    await expect(grid.locator('.zinebox-cover-card').first()).toBeVisible({ timeout: 15000 });
    await expect(grid.locator('.zinebox-cover-card')).toHaveCount(54, { timeout: 15000 });

    const sample = await measureZineboxLibraryScrollPerf(page);
    reportZineboxLibraryScrollBudget(sample);
  });
});
