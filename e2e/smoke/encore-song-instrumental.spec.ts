import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';

/** A repertoire song marked instrumental drops the lyric-centred guided exercises. */
test('marking a song instrumental hides the lyric exercises', async ({ page }) => {
  await enterEncoreApp(page);
  await page.goto('/encore/#/library');
  await expect(page.getByRole('heading', { name: /repertoire$/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Add song' }).first().click();
  const addSong = page.getByRole('dialog', { name: 'Add song' });
  await addSong.getByLabel('Title').fill('E2E Instrumental Solo');
  await addSong.getByLabel('Artist').fill('Labs Agent');
  await addSong.getByRole('button', { name: 'Add song' }).click();
  await expect(page).toHaveURL(/#\/song\//, { timeout: 15_000 });
  await expect(page.getByText('Guided exercises')).toBeVisible();

  await page.getByRole('button', { name: 'Song actions' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Instrumental (no lyrics)' }).click();
  await expect(page.getByText('Guided exercises')).toHaveCount(0);

  await page.getByRole('button', { name: 'Song actions' }).click();
  await expect(page.getByRole('menuitemcheckbox', { name: 'Instrumental (no lyrics)' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});
