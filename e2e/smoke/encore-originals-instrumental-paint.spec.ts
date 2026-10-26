import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';

/**
 * An instrumental chart (no lyrics) can be painted: arm a chord, click the line's add slot, repeat.
 * Before, an empty or chord-only line had nothing to click, so an instrumental could only be pasted.
 */
test('chords can be painted onto a section with no lyrics', async ({ page }) => {
  await enterEncoreApp(page);
  await page.goto('/encore/#/originals');
  await expect(page.getByRole('heading', { name: 'Originals' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'New Original' }).click();
  await page.getByRole('button', { name: 'Write lyrics' }).click();
  await page.getByLabel('Lyrics chart').fill('[Intro]\n\n[Solo]\n');
  await page.getByRole('button', { name: 'Add chords' }).click();

  const pick = page.getByRole('group', { name: 'Pick a chord' });
  await pick.getByRole('button', { name: 'Am', exact: true }).click();
  await page.getByRole('button', { name: 'Add Am to this line' }).first().click();
  await page.getByRole('button', { name: 'Add Am to this line' }).first().click();
  await pick.getByRole('button', { name: 'F', exact: true }).click();
  await page.getByRole('button', { name: 'Add F to this line' }).first().click();

  const intro = page.locator('.encore-originals-paint-line--chords-only').first();
  await expect(intro.locator('.encore-originals-chord-badge')).toHaveText(['Am', 'Am', 'F']);
});
