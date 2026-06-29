import { expect, test } from '@playwright/test';

import { expectZineboxLibraryChrome } from '../helpers/zineboxLibrary';

test.describe('Zine Box library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zinebox/?e2eSeed=1');
    await expect(page).toHaveTitle(/Zine Box/i);
    await expectZineboxLibraryChrome(page);
  });

  test('upload dialog opens from header', async ({ page }) => {
    await page.getByRole('button', { name: /Upload zines/i }).click();
    await expect(page.locator('[data-testid="zinebox-upload-zone"]')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Add PDF zines/i })).toBeVisible();
  });

  test('random unread opens reader', async ({ page }) => {
    const openButton = page.getByRole('button', { name: /Open a random unread zine/i });
    await expect(openButton).toBeEnabled({ timeout: 15000 });
    await expect(page.locator('.zinebox-cover-card').first()).toBeVisible({ timeout: 15000 });

    // Re-dispatch the click until the reader route engages. Under parallel CI load the first click
    // can land before the unread selection is ready, so a single click + long URL wait flaked
    // (toHaveURL timeout). This hardens a test-action race — navigation itself is synchronous — and
    // keeps the functional assertion (we reach the reader). See docs/FLAKY_TEST_REGISTRY.md.
    await expect(async () => {
      if (!/#\/read\//.test(page.url())) {
        await openButton.click();
      }
      await expect(page).toHaveURL(/#\/read\//, { timeout: 4000 });
    }).toPass({ timeout: 20000 });
  });
});
