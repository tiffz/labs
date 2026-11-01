import { test, expect } from '../labsTest';

/** @see src/story/CUJs.md */
test.describe('Story load interaction', () => {
  test('story shell loads without uncaught errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/story/');
    await expect(page.locator('#root')).toBeVisible({ timeout: 15_000 });

    expect(pageErrors).toEqual([]);
  });
});
