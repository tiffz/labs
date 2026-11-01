import { test, expect } from '../labsTest';
import { enterEncoreApp } from '../helpers/enterEncoreApp';

/** "Instrumental (no lyrics)": no lyrics stage, an instrumental outline, chords-first editing. */
test('marking a new original instrumental drops the lyrics stage', async ({ page }) => {
  await enterEncoreApp(page);
  await page.goto('/encore/#/originals');
  await expect(page.getByRole('heading', { name: 'Originals' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'New Original' }).click();
  await expect(page.getByLabel('Song title')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: /Write lyrics/ })).toBeVisible();

  await page.getByRole('button', { name: 'More actions' }).click();
  const item = page.getByRole('menuitemcheckbox', { name: 'Instrumental (no lyrics)' });
  await expect(item).toHaveAttribute('aria-checked', 'false');
  await item.click();

  await expect(page.getByRole('button', { name: /Write lyrics/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Add chords/ }).click();
  // The untouched Verse/Chorus outline became an instrumental one.
  for (const section of ['Intro', 'Theme', 'Solo', 'Outro']) {
    await expect(page.getByText(section, { exact: true }).first()).toBeVisible();
  }

  await page.getByRole('button', { name: 'More actions' }).click();
  await expect(page.getByRole('menuitemcheckbox', { name: 'Instrumental (no lyrics)' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});
