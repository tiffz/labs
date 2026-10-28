import { test, expect, type Page } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { seedZineboxE2eGoogleSession } from '../helpers/zineboxDriveImport';
import { stubEncoreSignedInDrive } from '../helpers/encoreDriveStub';

/**
 * Bulk score import runs through the shared upload code (ADR 0030): when one file fails, the rows
 * that imported leave the table and the failed one is listed with the reason. Before, a failure
 * kept every row, so a retry attached the scores that had already imported a second time.
 */
async function addSong(page: Page, title: string) {
  await page.getByRole('button', { name: 'Add song' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add song' });
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByLabel('Artist').fill('Labs Agent');
  await dialog.getByRole('button', { name: 'Add song' }).click();
  await expect(page).toHaveURL(/#\/song\//, { timeout: 15_000 });
  await page.getByRole('link', { name: 'Back to library' }).click();
  await expect(page).toHaveURL(/#\/library/);
}

test('a failed score stays listed with the reason; the imported one leaves', async ({ page }) => {
  test.setTimeout(90_000);
  await seedZineboxE2eGoogleSession(page);
  const drive = await stubEncoreSignedInDrive(page, {});
  // Registered after the stub, so it answers first: the upload of this one file fails.
  await page.route(/uploadType=resumable/, async (route) => {
    if (route.request().postData()?.includes('Blue Skies')) {
      return route.fulfill({ status: 403, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' });
    }
    return route.fallback();
  });
  await enterEncoreApp(page);
  await page.goto('/encore/#/library');
  await expect(page.getByRole('heading', { name: /repertoire$/i })).toBeVisible({ timeout: 15_000 });
  await addSong(page, 'Moon River');
  await addSong(page, 'Blue Skies');

  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await page.getByRole('menuitem', { name: /Bulk import scores/ }).click();
  const dialog = page.getByRole('dialog', { name: /score/i });
  await dialog.locator('input[type="file"]').setInputFiles([
    { name: 'Moon River.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 moon') },
    { name: 'Blue Skies.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 blue skies score') },
  ]);
  const importButton = dialog.getByRole('button', { name: 'Import 2 scores' });
  await expect(importButton).toBeEnabled({ timeout: 10_000 });
  await importButton.click();

  const failures = dialog.getByLabel('Files not imported');
  await expect(failures).toContainText('Blue Skies.pdf', { timeout: 15_000 });
  await expect(dialog.getByRole('cell', { name: /Moon River\.pdf/ })).toHaveCount(0);
  expect(drive.uploads).toContain('Moon River.pdf');
});
