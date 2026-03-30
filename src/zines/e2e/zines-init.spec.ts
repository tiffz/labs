import { test, expect } from '@playwright/test';

test.describe('Zine Studio - Initialization', () => {
  test('should load the app without errors', async ({ page }) => {
    await page.goto('/zines/');
    await expect(page).toHaveTitle(/Zine Studio/);
    await expect(page.locator('#root')).toBeVisible();
  });

  test('should display the main heading', async ({ page }) => {
    await page.goto('/zines/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Zine Studio');
  });

  test('should display upload prompt', async ({ page }) => {
    await page.goto('/zines/');
    await expect(page.getByText(/Click or drag images to upload/i).first()).toBeVisible();
  });
});
