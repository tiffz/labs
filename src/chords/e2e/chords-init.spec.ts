import { test, expect } from '@playwright/test';

test.describe('Chord Progression Generator - Initialization', () => {
  test('should load the app without errors', async ({ page }) => {
    await page.goto('/chords/');
    await expect(page).toHaveTitle(/Chord Progression Generator/);
    await expect(page.locator('#root')).toBeVisible();
  });

  test('should display rendered chord notation', async ({ page }) => {
    await page.goto('/chords/');
    const svg = page.locator('svg');
    await expect(svg.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display basic playback and randomize controls', async ({ page }) => {
    await page.goto('/chords/');
    await expect(page.locator('.play-button')).toBeVisible();
    await expect(page.getByRole('button', { name: /Randomize/i }).first()).toBeVisible();
  });
});
