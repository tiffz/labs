import { test, expect } from '@playwright/test';

test.describe('UI catalog bootstrap', () => {
  test('loads catalog shell and shared component docs', async ({ page }) => {
    await page.goto('/ui/');
    await expect(page).toHaveTitle(/UI Catalog/i);
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Labs UI Components');
  });
});
