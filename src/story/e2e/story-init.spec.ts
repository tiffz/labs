import { test, expect } from '@playwright/test';

test.describe('Story Generator - Initialization', () => {
  test('should load the story generator page', async ({ page }) => {
    await page.goto('/story/');

    // Check main heading
    await expect(page.locator('h1')).toContainText('Save the Cat!');
    await expect(page.locator('text=Random Story Generator')).toBeVisible();
  });

  test('should display genre and theme selectors', async ({ page }) => {
    await page.goto('/story/');

    // Check genre selector
    await expect(page.locator('text=Select a Genre:')).toBeVisible();

    // Check theme selector
    await expect(page.locator('text=Select a Theme:')).toBeVisible();
  });

  test('should have Random selected by default', async ({ page }) => {
    await page.goto('/story/');

    // Check that Random is selected for genre
    const genreRandomRadio = page.locator('input[name="genre"][value="Random"]');
    await expect(genreRandomRadio).toBeChecked();

    // Check that Random is selected for theme
    const themeRandomRadio = page.locator('input[name="theme"][value="Random"]');
    await expect(themeRandomRadio).toBeChecked();
  });

  test('should display the generate button', async ({ page }) => {
    await page.goto('/story/');

    const generateButton = page.locator('button:has-text("Generate Story Plot")');
    await expect(generateButton).toBeVisible();
  });

  test('should display footer', async ({ page }) => {
    await page.goto('/story/');

    await expect(
      page.locator('text=Based on the story structures from "Save the Cat! Writes a Novel"')
    ).toBeVisible();
  });

  test('should display all genre options', async ({ page }) => {
    await page.goto('/story/');

    const genres = [
      'Random',
      'Whydunit',
      'Rites of Passage',
      'Institutionalized',
      'Superhero',
      'Dude with a Problem',
      'Fool Triumphant',
      'Buddy Love',
      'Out of the Bottle',
      'Golden Fleece',
      'Monster in the House',
    ];

    for (const genre of genres) {
      await expect(page.locator(`label:has-text("${genre}")`)).toBeVisible();
    }
  });

  test('should display all theme options', async ({ page }) => {
    await page.goto('/story/');

    const themes = [
      'Random',
      'Forgiveness',
      'Love',
      'Acceptance',
      'Faith',
      'Fear',
      'Trust',
      'Survival',
      'Selflessness',
      'Responsibility',
      'Redemption',
    ];

    for (const theme of themes) {
      await expect(page.locator(`label:has-text("${theme}")`)).toBeVisible();
    }
  });
});

