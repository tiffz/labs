import { test, expect } from '../../../e2e/labsTest';

test.describe('Story Generator - Story Generation', () => {
  test('should generate a story when button is clicked', async ({ page }) => {
    await page.goto('/story/');

    const generateButton = page.getByRole('button', { name: 'Generate Story', exact: true });
    await generateButton.click();

    // Check that story elements appear
    await expect(page.locator('text=Core Story Elements')).toBeVisible();
    await expect(page.locator('text=Key Genre Elements')).toBeVisible();
    for (const element of ['hero', 'flaw', 'nemesis']) {
      await expect(page.getByRole('button', { name: `Reroll ${element}` })).toBeVisible();
    }
  });

  test('should display beat chart after generation', async ({ page }) => {
    await page.goto('/story/');

    await page.getByRole('button', { name: 'Generate Story', exact: true }).click();

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

  test('a selected genre drives the genre elements', async ({ page }) => {
    await page.goto('/story/');

    await page.locator('label[for="genre-whydunit"]').click();
    await expect(page.getByRole('radio', { name: 'Whydunit' })).toBeChecked();
    await page.getByRole('button', { name: 'Generate Story', exact: true }).click();

    for (const element of ['The Detective', 'The Secret', 'The Dark Turn']) {
      await expect(page.getByRole('button', { name: `Reroll ${element}` })).toBeVisible();
    }
  });

  test('rerolling one element keeps it filled', async ({ page }) => {
    await page.goto('/story/');
    await page.getByRole('button', { name: 'Generate Story', exact: true }).click();

    const reroll = page.getByRole('button', { name: 'Reroll hero' });
    const hero = reroll.locator('..');
    await expect(hero).not.toHaveText('');
    await reroll.click();
    await expect(hero).not.toHaveText('');
  });

  test('reroll buttons explain themselves on hover', async ({ page }) => {
    await page.goto('/story/');
    await page.getByRole('button', { name: 'Generate Story', exact: true }).click();

    await page.getByRole('button', { name: 'Reroll hero' }).hover();
    await expect(page.getByRole('tooltip', { name: 'Reroll this element' })).toBeVisible();
  });
});
