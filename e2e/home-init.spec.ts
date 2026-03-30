import { test, expect } from '@playwright/test';

test.describe('Labs home bootstrap', () => {
  test('loads home catalog and primary app links', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Tiff Zhang Labs/i);
    await expect(page.locator('h1')).toContainText('Tiff Zhang Labs');
    await expect(page.locator('a[href="/drums/"]')).toBeVisible();
    await expect(page.locator('a[href="/cats/"]')).toBeVisible();
  });
});
