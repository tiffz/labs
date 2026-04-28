import { test, expect } from '@playwright/test';

test.describe('Pitch detector bootstrap', () => {
  test('renders app shell and pitch controls', async ({ page }) => {
    await page.goto('/pitch/');
    await expect(page).toHaveTitle(/Find Your Pitch|Tiff Zhang Labs/i);
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.getByRole('button', { name: /Start listening|Stop listening/i })).toBeVisible();
  });
});
