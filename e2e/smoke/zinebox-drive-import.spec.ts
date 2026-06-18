import { expect, test } from '@playwright/test';

import { expectZineboxLibraryChrome } from '../helpers/zineboxLibrary';
import {
  E2E_ZINEBOX_DRIVE_FOLDER_URL,
  seedZineboxE2eGoogleSession,
  stubZineboxDriveFolderImportApi,
} from '../helpers/zineboxDriveImport';

test.describe('Zine Box Drive folder import', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await seedZineboxE2eGoogleSession(page);
    await stubZineboxDriveFolderImportApi(page);
    await page.goto('/zinebox/?e2eSeed=1');
    await expect(page).toHaveTitle(/Zine Box/i);
    await expectZineboxLibraryChrome(page);
  });

  test('review import shows blocking job progress', async ({ page }) => {
    await page.getByRole('button', { name: /Upload zines/i }).click();
    await expect(page.locator('[data-testid="zinebox-upload-zone"]')).toBeVisible({ timeout: 15000 });

    await page.getByLabel('Drive folder URL or id').fill(E2E_ZINEBOX_DRIVE_FOLDER_URL);
    await expect(page.getByRole('button', { name: /Review import/i })).toBeEnabled({ timeout: 15000 });
    await page.getByRole('button', { name: /Review import/i }).click();

    await expect(page.getByRole('heading', { name: /Review Drive import/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('button', { name: /Import 1 PDF/i })).toBeEnabled({ timeout: 15000 });

    await page.getByRole('button', { name: /Import 1 PDF/i }).click();

    await expect(page.getByRole('progressbar')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Added 1 PDF/i)).toBeVisible({ timeout: 30000 });
  });
});
