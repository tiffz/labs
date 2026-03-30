import { test, expect } from '@playwright/test';

test.describe('Find the Beat - Initialization', () => {
  test('should load the app without errors', async ({ page }) => {
    await page.goto('/beat/');
    await expect(page).toHaveTitle(/Find the Beat/);
    await expect(page.locator('#root')).toBeVisible();
  });

  test('should render the primary app heading', async ({ page }) => {
    await page.goto('/beat/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Find the Beat');
  });

  test('should render at least one upload input', async ({ page }) => {
    await page.goto('/beat/');
    await expect(page.locator('input[type="file"]').first()).toBeAttached();
  });
});
