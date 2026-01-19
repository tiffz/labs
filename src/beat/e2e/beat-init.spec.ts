import { test, expect } from '@playwright/test';

test.describe('Find the Beat - Initialization', () => {
  test('should load the app without errors', async ({ page }) => {
    await page.goto('/beat/');
    
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Find the Beat/);
  });

  test('should display the main heading', async ({ page }) => {
    await page.goto('/beat/');
    
    // Check that the main heading is visible
    const heading = page.locator('h1');
    await expect(heading).toContainText('Find the Beat');
  });

  test('should display media upload area', async ({ page }) => {
    await page.goto('/beat/');
    
    // Check for upload zone
    await expect(page.locator('text=Drop audio or video')).toBeVisible();
  });

  test('should display supported formats info', async ({ page }) => {
    await page.goto('/beat/');
    
    // Check for format info
    await expect(page.locator('text=MP3')).toBeVisible();
  });

  test('should not show playback controls before file upload', async ({ page }) => {
    await page.goto('/beat/');
    
    // BPM display should not be visible initially
    const bpmDisplay = page.locator('[data-testid="bpm-display"]');
    await expect(bpmDisplay).not.toBeVisible();
  });

  test('should have upload button visible', async ({ page }) => {
    await page.goto('/beat/');
    
    // Check for file input or upload button
    const uploadInput = page.locator('input[type="file"]');
    await expect(uploadInput).toBeAttached();
  });
});
