import { test, expect } from '../labsTest';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { gotoEncoreOriginalsQueue } from '../helpers/encoreOriginalsQueue';
import { seedZineboxE2eGoogleSession } from '../helpers/zineboxDriveImport';
import { stubEncoreSignedInDrive } from '../helpers/encoreDriveStub';

/**
 * Original song files (ADR 0030): a reference is staged for review, uploads to Drive only on
 * confirm, and is refused while signed out instead of being kept as a link that dies on reload.
 */
const PDF = { name: 'Lead sheet.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.1\n%%EOF') };

/** The references list's own file input (its accept string is unique on the page). */
const referencesInput = (page: import('@playwright/test').Page) =>
  page.locator('input[type="file"][accept^="audio/*,image/*,.pdf"]');

async function openBrainstorm(page: import('@playwright/test').Page) {
  await gotoEncoreOriginalsQueue(page);
  await page.getByText('E2E Queue A', { exact: true }).click();
  // A fresh seeded song opens on the Brainstorm step, where the song files live.
  await expect(page.locator('.encore-originals-song-references')).toBeVisible({ timeout: 15_000 });
}

test('a reference stages, then uploads to Drive on confirm', async ({ page }) => {
  test.setTimeout(60_000);
  await seedZineboxE2eGoogleSession(page);
  const drive = await stubEncoreSignedInDrive(page, {});
  await enterEncoreApp(page);
  await openBrainstorm(page);

  await referencesInput(page).setInputFiles(PDF);
  const review = page.getByRole('region', { name: 'References ready to add' });
  await expect(review.getByText('Lead sheet.pdf')).toBeVisible();
  await expect(review.getByText(/^Uploads to your Drive/)).toBeVisible();
  expect(drive.uploads).toEqual([]);

  await review.getByRole('button', { name: 'Add reference' }).click();
  await expect(review).toBeHidden({ timeout: 15_000 });
  expect(drive.uploads).toHaveLength(1);
  await expect(page.locator('.encore-originals-song-references').getByText('Lead sheet.pdf')).toBeVisible();
});

test('signed out, a reference is refused rather than kept until reload', async ({ page }) => {
  await enterEncoreApp(page);
  await openBrainstorm(page);

  await referencesInput(page).setInputFiles(PDF);
  const review = page.getByRole('region', { name: 'References ready to add' });
  await expect(review.getByText('Sign in with Google to save files here.')).toBeVisible();
  await expect(review.getByRole('button', { name: 'Add reference' })).toBeDisabled();
});
