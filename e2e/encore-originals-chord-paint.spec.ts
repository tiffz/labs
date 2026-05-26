import { test, expect } from '@playwright/test';

test.describe('Encore Originals chord paint', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/encore/#/originals');
    await expect(page.getByRole('heading', { name: 'Originals' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'New Original' }).click();
    await expect(page.getByLabel('Song title')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Write lyrics' }).click();
    const lyricsChart = page.getByLabel('Lyrics chart');
    await expect(lyricsChart).toBeVisible({ timeout: 10_000 });
    await lyricsChart.fill('[Verse 1]\n[Bb]around here\n');
    await page.getByRole('button', { name: 'Add chords' }).click();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible({ timeout: 10_000 });
  });

  test('moves a selected chord when clicking another word', async ({ page }) => {
    const bbBadge = page.locator('.encore-originals-chord-badge', { hasText: 'Bb' }).first();
    await expect(bbBadge).toBeVisible();
    await bbBadge.click();
    await expect(bbBadge).toHaveAttribute('aria-pressed', 'true');

    await page.locator('.encore-originals-lyric-token', { hasText: 'here' }).click();

    const hereIndex = await page
      .locator('.encore-originals-lyric-token', { hasText: 'here' })
      .evaluate((el) => el.textContent);
    expect(hereIndex).toContain('here');

    const badgesOnHere = page.locator('.encore-originals-chord-slot', {
      has: page.locator('.encore-originals-chord-badge', { hasText: 'Bb' }),
    });
    await expect(badgesOnHere.first()).toBeVisible({ timeout: 5_000 });
  });
});
