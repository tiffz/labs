import { test, expect } from '@playwright/test';

test.describe('Form Intersections - Initialization', () => {
  test('should load the app without errors', async ({ page }) => {
    await page.goto('/forms/');
    await expect(page).toHaveTitle(/Form Intersections/);
    await expect(page.locator('#root')).toBeVisible();
  });

  test('should render the 3D canvas', async ({ page }) => {
    await page.goto('/forms/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });
});
