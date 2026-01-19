import { test, expect } from '@playwright/test';

test.describe('Form Intersections - Initialization', () => {
  test('should load the app without errors', async ({ page }) => {
    await page.goto('/forms/');
    
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Form Intersections/);
  });

  test('should display the 3D canvas', async ({ page }) => {
    await page.goto('/forms/');
    
    // Wait for Three.js canvas to render
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test('should display regenerate button', async ({ page }) => {
    await page.goto('/forms/');
    
    // Check for regenerate button
    const regenerateButton = page.locator('button:has-text("Regenerate")');
    await expect(regenerateButton).toBeVisible();
  });

  test('should display form count control', async ({ page }) => {
    await page.goto('/forms/');
    
    // Check for form count slider or input
    await expect(page.locator('text=Forms')).toBeVisible();
  });

  test('should display view controls', async ({ page }) => {
    await page.goto('/forms/');
    
    // Check for view settings
    await expect(page.locator('text=Show')).toBeVisible();
  });

  test('regenerate button should update the scene', async ({ page }) => {
    await page.goto('/forms/');
    
    // Wait for initial render
    await page.waitForTimeout(1000);
    
    // Click regenerate
    const regenerateButton = page.locator('button:has-text("Regenerate")');
    await regenerateButton.click();
    
    // Canvas should still be visible after regeneration
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});
