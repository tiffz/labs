import { expect, type Locator, type Page } from '@playwright/test';

/** Adds a song and opens its performance editor. Needs a signed-in session. */
export async function openNewPerformance(page: Page): Promise<Locator> {
  await page.goto('/encore/#/library');
  // Signed in, the heading names the account ("E2E's repertoire").
  await expect(page.getByRole('heading', { name: /repertoire$/i })).toBeVisible(
    { timeout: 15_000 }
  );
  await page.getByRole('button', { name: 'Add song' }).first().click();
  const addSong = page.getByRole('dialog', { name: 'Add song' });
  await addSong.getByLabel('Title').fill('E2E Ownership Song');
  await addSong.getByLabel('Artist').fill('Labs Agent');
  await addSong.getByRole('button', { name: 'Add song' }).click();
  await expect(page).toHaveURL(/#\/song\//, { timeout: 15_000 });
  await page
    .getByRole('button', { name: /Add performance|Log performance/ })
    .first()
    .click();
  const editor = page
    .getByRole('dialog')
    .filter({ has: page.getByPlaceholder('YouTube, Google Drive, or URL') });
  await expect(editor).toBeVisible({ timeout: 10_000 });
  return editor;
}
