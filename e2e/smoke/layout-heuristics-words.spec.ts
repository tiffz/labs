import { test, expect } from '@playwright/test';
import { runHorizontalScrollHeuristicInBrowser } from '../helpers/horizontalScrollHeuristic';

test.describe('Words layout heuristics', () => {
  test('main has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/words/');
    await expect(page.locator('main#main')).toBeVisible({ timeout: 15_000 });

    const result = await page.evaluate(runHorizontalScrollHeuristicInBrowser, {
      rootSelector: 'main#main',
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });
});
