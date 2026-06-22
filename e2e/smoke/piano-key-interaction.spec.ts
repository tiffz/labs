import { test, expect } from '@playwright/test';

/** @see src/piano/CUJs.md */
test.describe('Piano load interaction', () => {
  test('shell loads without uncaught errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/piano/');
    await expect(page.locator('#root')).toBeVisible({ timeout: 15_000 });

    expect(pageErrors).toEqual([]);
  });
});
