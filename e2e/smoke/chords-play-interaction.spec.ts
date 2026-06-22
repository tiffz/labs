import { test, expect } from '@playwright/test';

/** @see src/chords/CUJs.md */
test.describe('Chords load interaction', () => {
  test('shell loads without uncaught errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/chords/');
    await expect(page.locator('#root')).toBeVisible({ timeout: 15_000 });

    expect(pageErrors).toEqual([]);
  });
});
