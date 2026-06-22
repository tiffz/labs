import { test, expect } from '@playwright/test';
import { enterEncoreApp } from './helpers/enterEncoreApp';

test.describe('Encore Originals', () => {
  test.beforeEach(async ({ page }) => {
    await enterEncoreApp(page);
  });

  test('navigates to originals tab and creates blank draft', async ({ page }) => {
    await page.goto('/encore/#/originals');
    await expect(page.getByRole('heading', { name: 'Originals' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'New Original' }).click();
    const titleField = page.getByPlaceholder('Untitled original');
    await expect(titleField).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/#\/originals\/(?!new)[^/?#]+$/, { timeout: 15_000 });
    await page.getByRole('button', { name: 'Write lyrics' }).click();
    const lyricsChart = page.getByLabel('Lyrics chart');
    await expect(lyricsChart).toBeVisible({ timeout: 10_000 });
    await lyricsChart.fill('[Verse 1]\nTest line\n\n[Chorus]\n');
    // Write mode reconciles to chordPro on debounce before persisting parent state.
    await page.waitForTimeout(900);
    await page.reload();
    await page.getByRole('button', { name: 'Write lyrics' }).click();
    await expect(lyricsChart).toHaveValue(/\[Verse 1\][\s\S]*Test line/, { timeout: 10_000 });
  });
});
