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

    await openButton.click();
    await expect(page.getByRole('button', { name: /Back to library/i })).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/#\/read\//, { timeout: 15000 });
  });

  test('one PDF opens the review before it is added (ADR 0030)', async ({ page }) => {
    // A single PDF used to import on pick, while two or more opened "Review import".
    await page.getByRole('button', { name: /Upload zines/i }).click();
    const zone = page.locator('[data-testid="zinebox-upload-zone"]');
    await expect(zone).toBeVisible({ timeout: 15000 });
    await zone.locator('input[type="file"]').setInputFiles({
      name: 'E2E single zine.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'),
    });
    await expect(page.getByRole('dialog', { name: /Review import/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Import 1 PDF/ }).click();
    await expect(page.getByText(/Added 1 PDF/i)).toBeVisible({ timeout: 30000 });
  });
});
