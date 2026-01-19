import { test, expect } from '@playwright/test';

test.describe('Chord Progression Generator - Initialization', () => {
  test('should load the app without errors', async ({ page }) => {
    await page.goto('/chords/');
    
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Chord Progression Generator/);
  });

  test('should display the chord score', async ({ page }) => {
    await page.goto('/chords/');
    
    // Wait for VexFlow to render - look for SVG element
    const svg = page.locator('svg');
    await expect(svg.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display play/stop controls', async ({ page }) => {
    await page.goto('/chords/');
    
    // Check for play button
    const playButton = page.locator('button:has-text("Play")');
    await expect(playButton).toBeVisible();
  });

  test('should display randomize button', async ({ page }) => {
    await page.goto('/chords/');
    
    // Check for randomize button
    const randomizeButton = page.locator('button:has-text("Randomize")');
    await expect(randomizeButton).toBeVisible();
  });

  test('should display tempo control', async ({ page }) => {
    await page.goto('/chords/');
    
    // Check for tempo display
    await expect(page.locator('text=BPM')).toBeVisible();
  });

  test('should display key signature control', async ({ page }) => {
    await page.goto('/chords/');
    
    // Check for key signature section
    await expect(page.locator('text=Key')).toBeVisible();
  });

  test('should display time signature tabs', async ({ page }) => {
    await page.goto('/chords/');
    
    // Check for time signature options
    await expect(page.locator('text=4/4')).toBeVisible();
  });

  test('should display styling options', async ({ page }) => {
    await page.goto('/chords/');
    
    // Check for styling section
    await expect(page.locator('text=Styling')).toBeVisible();
  });
});
