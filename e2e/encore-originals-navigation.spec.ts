import { test, expect } from '@playwright/test';

test.describe('Encore Originals', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/encore/');
    await page.waitForSelector('#root', { state: 'attached' });
  });

  test('navigates to originals tab and creates blank draft', async ({ page }) => {
    await page.goto('/encore/#/originals');
    await expect(page.getByRole('heading', { name: 'Originals' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'New Original' }).click();
    await expect(page.getByLabel('Song title')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Write lyrics' }).click();
    const lyricsChart = page.getByLabel('Lyrics chart');
    await expect(lyricsChart).toBeVisible({ timeout: 10_000 });
    await lyricsChart.fill('[Verse 1]\nTest line\n\n[Chorus]\n');
    await page.reload();
    await page.getByRole('button', { name: 'Write lyrics' }).click();
    await expect(lyricsChart).toHaveValue(/\[Verse 1\][\s\S]*Test line/, { timeout: 10_000 });
  });
});
