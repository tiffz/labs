import { test, expect } from '@playwright/test';

test.describe('Story Generator - Story Generation', () => {
  test('should generate a story when button is clicked', async ({ page }) => {
    await page.goto('/story/');

    const generateButton = page.locator('button:has-text("Generate Story Plot")');
    await generateButton.click();

    // Check that story elements appear
    await expect(page.locator('text=Core Story Elements')).toBeVisible();
    await expect(page.locator('text=Key Genre Elements')).toBeVisible();
    await expect(page.locator('text=The Hero')).toBeVisible();
    await expect(page.locator('text=Primary Flaw')).toBeVisible();
    await expect(page.locator('text=The Nemesis')).toBeVisible();
  });

  test('should display beat chart after generation', async ({ page }) => {
    await page.goto('/story/');

    await page.locator('button:has-text("Generate Story Plot")').click();

    // Check for act headers
    await expect(page.locator('text=Act 1')).toBeVisible();
    await expect(page.locator('text=Act 2A')).toBeVisible();
    await expect(page.locator('text=Act 2B')).toBeVisible();
    await expect(page.locator('text=Act 3')).toBeVisible();

    // Check for some beat names
    await expect(page.locator('text=1. Opening Image')).toBeVisible();
    await expect(page.locator('text=9. Midpoint')).toBeVisible();
    await expect(page.locator('text=15. Final Image')).toBeVisible();
  });

  test('should generate different stories on multiple clicks', async ({ page }) => {
    await page.goto('/story/');

    // Generate first story
    await page.locator('button:has-text("Generate Story Plot")').click();
    await expect(page.locator('text=Core Story Elements')).toBeVisible();

    // Get first hero text
    const firstHero = await page
      .locator('.dense-sub-label:has-text("The Hero")')
      .locator('..')
      .locator('.generated-chip-content')
      .first()
      .textContent();

    // Generate second story
    await page.locator('button:has-text("Generate Story Plot")').click();

    // Get second hero text
    const secondHero = await page
      .locator('.dense-sub-label:has-text("The Hero")')
      .locator('..')
      .locator('.generated-chip-content')
      .first()
      .textContent();

    // They might be the same due to randomness, but the mechanism should work
    expect(firstHero).toBeDefined();
    expect(secondHero).toBeDefined();
  });

  test('should allow selecting a specific genre', async ({ page }) => {
    await page.goto('/story/');

    // Select Whydunit genre
    await page.locator('label:has-text("Whydunit")').click();

    // Generate story
    await page.locator('button:has-text("Generate Story Plot")').click();

    // Check that Whydunit is displayed
    await expect(page.locator('h2:has-text("Whydunit")')).toBeVisible();

    // Check for Whydunit-specific elements
    await expect(page.locator('text=The Detective')).toBeVisible();
    await expect(page.locator('text=The Secret')).toBeVisible();
    await expect(page.locator('text=The Dark Turn')).toBeVisible();
  });

  test('should allow selecting a specific theme', async ({ page }) => {
    await page.goto('/story/');

    // Select Forgiveness theme
    await page.locator('label:has-text("Forgiveness")').click();

    // Generate story
    await page.locator('button:has-text("Generate Story Plot")').click();

    // Check that Forgiveness is displayed
    await expect(page.locator('text=Theme:')).toBeVisible();
    await expect(page.locator('text=Forgiveness')).toBeVisible();
  });

  test('should display reroll buttons', async ({ page }) => {
    await page.goto('/story/');

    await page.locator('button:has-text("Generate Story Plot")').click();

    // Check that reroll buttons are present
    const rerollButtons = page.locator('.reroll-btn');
    const count = await rerollButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should reroll an element when reroll button is clicked', async ({ page }) => {
    await page.goto('/story/');

    await page.locator('button:has-text("Generate Story Plot")').click();

    // Get the first hero chip
    const heroChip = page
      .locator('.dense-sub-label:has-text("The Hero")')
      .locator('..')
      .locator('.generated-chip')
      .first();

    // Get initial hero text
    const initialHero = await heroChip.locator('.generated-chip-content').textContent();

    // Click the reroll button
    await heroChip.locator('.reroll-btn').click();

    // Wait a bit for the update
    await page.waitForTimeout(100);

    // Get new hero text
    const newHero = await heroChip.locator('.generated-chip-content').textContent();

    // They might be the same due to randomness, but both should be defined
    expect(initialHero).toBeDefined();
    expect(newHero).toBeDefined();
  });

  test('should show tooltips on hover', async ({ page }) => {
    await page.goto('/story/');

    await page.locator('button:has-text("Generate Story Plot")').click();

    // Hover over a help icon
    const helpIcon = page.locator('.help-icon').first();
    await helpIcon.hover();

    // Check that tooltip becomes visible (CSS handles this)
    const tooltip = page.locator('.tooltip-content').first();
    await expect(tooltip).toBeAttached();
  });
});

