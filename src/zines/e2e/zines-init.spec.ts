import { test, expect } from '@playwright/test';

test.describe('Zine Studio - Initialization', () => {
  test('should load the app without errors', async ({ page }) => {
    await page.goto('/zines/');
    
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Zine Studio/);
  });

  test('should display the main heading', async ({ page }) => {
    await page.goto('/zines/');
    
    // Check that the main heading is visible
    const heading = page.locator('h1');
    await expect(heading).toContainText('Zine Studio');
  });

  test('should display mode toggle options', async ({ page }) => {
    await page.goto('/zines/');
    
    // Check that mode options are visible
    await expect(page.locator('text=Minizine')).toBeVisible();
    await expect(page.locator('text=Booklet')).toBeVisible();
  });

  test('should display upload area', async ({ page }) => {
    await page.goto('/zines/');
    
    // Check that upload instructions are visible
    await expect(page.locator('text=Drop images here')).toBeVisible();
  });

  test('should display paper configuration options', async ({ page }) => {
    await page.goto('/zines/');
    
    // Check that paper size option is visible
    await expect(page.locator('text=Paper Size')).toBeVisible();
  });

  test('should display export options', async ({ page }) => {
    await page.goto('/zines/');
    
    // Check that export button area exists
    const exportButton = page.locator('button:has-text("Export")');
    await expect(exportButton).toBeVisible();
  });
});
