import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';

/**
 * Cheap integration smokes for Encore hash routes that mount performance list UI
 * (providers, tabs, Practice compact panel). Catches shell wiring regressions
 * that Vitest and HMR can miss.
 */
test.describe('Encore performance routes', () => {
  test('library and practice hash routes render', async ({ page }) => {
    await enterEncoreApp(page);
    await page.goto('/encore/#/library');
    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({ timeout: 15_000 });

    await page.goto('/encore/#/practice');
    await expect(page.getByRole('heading', { name: 'Your practice' })).toBeVisible({ timeout: 15_000 });
  });

  test('practice tab navigation from repertoire', async ({ page }) => {
    await enterEncoreApp(page);
    await page.goto('/encore/#/library');
    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('tab', { name: 'Practice' }).click();
    await expect(page).toHaveURL(/#\/practice/);
    await expect(page.getByRole('heading', { name: 'Your practice' })).toBeVisible({ timeout: 15_000 });
  });
});
