import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

/** Stanza (ADR 0030): a picked recording is staged for review and becomes a song only on confirm. */
const MOV = path.join(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/encore-take.mov');

test('a picked recording becomes a song only after "Add song"', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/stanza/');
  const picker = page.locator('input[type="file"][accept^="audio/*,video/mp4"]').first();
  await expect(picker).toBeAttached({ timeout: 15_000 });
  await picker.setInputFiles(MOV);

  const review = page.getByRole('region', { name: 'Songs ready to add' });
  await expect(review.getByText('encore-take.mov')).toBeVisible();
  await expect(review.getByText(/Adds a new song to your library/)).toBeVisible();
  // Nothing added yet: the song would be titled "encore-take" (the review row says "encore-take.mov").
  await expect(page.getByText('encore-take', { exact: true })).toHaveCount(0);

  await review.getByRole('button', { name: 'Add song' }).click();
  await expect(review).toBeHidden({ timeout: 15_000 });
  await expect(page.getByText('encore-take', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
});
