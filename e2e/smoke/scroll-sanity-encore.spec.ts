import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { runHorizontalScrollHeuristicInBrowser } from '../helpers/horizontalScrollHeuristic';
import { runScrollSanityInBrowser } from '../helpers/scrollSanity';

test.describe('Encore scroll sanity', () => {
  test('library route scrolls vertically', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await enterEncoreApp(page);
    await page.goto('/encore/#/library');
    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({
      timeout: 15_000,
    });

    const result = await page.evaluate(runScrollSanityInBrowser, {});
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });

  test('library main has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await enterEncoreApp(page);
    await page.goto('/encore/#/library');
    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({
      timeout: 15_000,
    });

    const result = await page.evaluate(runHorizontalScrollHeuristicInBrowser, {
      rootSelector: 'main#main',
      allowHorizontalScrollSelectors: ['.MuiTableContainer-root'],
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });

  test('practice route scrolls vertically', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await enterEncoreApp(page);
    await page.goto('/encore/#/practice');
    await expect(page.locator('main#main')).toBeVisible({ timeout: 15_000 });

    const result = await page.evaluate(runScrollSanityInBrowser, {});
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });
});
