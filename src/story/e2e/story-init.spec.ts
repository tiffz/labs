import { test, expect } from '@playwright/test';

test.describe('Story Generator - Initialization', () => {
  test('should load the story generator app shell', async ({ page }) => {
    await page.goto('/story/');
    await expect(page.locator('h1')).toContainText('Save the Cat!');
    await expect(page.locator('#root')).toBeVisible();
  });

  test('should show welcome copy for initial state', async ({ page }) => {
    await page.goto('/story/');
    await expect(page.getByText('Welcome to Save the Cat!')).toBeVisible();
  });

  test('should show generate story action', async ({ page }) => {
    await page.goto('/story/');
    await expect(page.getByRole('button', { name: /Generate Story/i })).toBeVisible();
  });
});

