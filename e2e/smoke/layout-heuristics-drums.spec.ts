import { test, expect } from '@playwright/test';
import { runHorizontalScrollHeuristicInBrowser } from '../helpers/horizontalScrollHeuristic';

test.describe('Drums layout heuristics', () => {
  test('main has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/drums/');
    await expect(page.getByRole('heading', { name: 'Darbuka Rhythm Trainer' })).toBeVisible({
      timeout: 15_000,
    });

    const result = await page.evaluate(runHorizontalScrollHeuristicInBrowser, {
      rootSelector: 'main#main, #root',
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });
});
