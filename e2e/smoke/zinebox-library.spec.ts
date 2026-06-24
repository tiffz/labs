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
    await expect(page.getByRole('button', { name: /Open a random unread zine/i })).toBeEnabled({
      timeout: 15000,
    });
    await expect(page.locator('.zinebox-cover-card').first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Open a random unread zine/i }).click();
    await expect(page).toHaveURL(/#\/read\//, { timeout: 15000 });
  });
});
