import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { seedZineboxE2eGoogleSession } from '../helpers/zineboxDriveImport';
import { stubEncoreSignedInDrive } from '../helpers/encoreDriveStub';

/** Song page files (ADR 0030): a picked chart stages for review and uploads only on confirm. */
test('a chart stages, then uploads to Drive on confirm', async ({ page }) => {
  test.setTimeout(60_000);
  await seedZineboxE2eGoogleSession(page);
  const drive = await stubEncoreSignedInDrive(page, {});
  await enterEncoreApp(page);
  await page.goto('/encore/#/library');
  await expect(page.getByRole('heading', { name: /repertoire$/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Add song' }).first().click();
  const addSong = page.getByRole('dialog', { name: 'Add song' });
  await addSong.getByLabel('Title').fill('E2E Staged Song');
  await addSong.getByLabel('Artist').fill('Labs Agent');
  await addSong.getByRole('button', { name: 'Add song' }).click();
  await expect(page).toHaveURL(/#\/song\//, { timeout: 15_000 });

  await page
    .locator('input[type="file"][accept=".pdf,.xml,.musicxml,.mxl,image/*"]')
    .setInputFiles({ name: 'Lead sheet.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.1') });
  const review = page.getByRole('region', { name: 'Files ready to upload' });
  await expect(review.getByText('Chart · Uploads to your Drive', { exact: false })).toBeVisible();
  expect(drive.uploads).toEqual([]);

  await review.getByRole('button', { name: 'Upload' }).click();
  await expect(review).toBeHidden({ timeout: 15_000 });
  expect(drive.uploads).toHaveLength(1);
});
