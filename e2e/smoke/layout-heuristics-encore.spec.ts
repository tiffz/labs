import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { runLayoutHeuristicsInBrowser } from '../helpers/layoutHeuristics';

/**
 * Catches cramped page chrome and unreadable secondary copy on Encore library.
 */
test.describe('Encore layout heuristics', () => {
  test('library route has main padding and readable header description', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await enterEncoreApp(page);
    await page.goto('/encore/#/library');

    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({
      timeout: 15_000,
    });

    const result = await page.evaluate(runLayoutHeuristicsInBrowser, {
      containerSelector: 'main#main',
      contentSelector: 'main#main h2',
      mutedTextSelector: 'main#main .MuiTypography-body2',
    });

    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });
});
