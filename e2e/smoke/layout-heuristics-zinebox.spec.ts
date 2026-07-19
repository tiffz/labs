import { test, expect } from '@playwright/test';
import { expectZineboxLibraryChrome } from '../helpers/zineboxLibrary';
import { runHorizontalScrollHeuristicInBrowser } from '../helpers/horizontalScrollHeuristic';

test.describe('Zinebox layout heuristics', () => {
  test('library main has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/zinebox/?e2eSeed=1');
    await expectZineboxLibraryChrome(page);

    const result = await page.evaluate(runHorizontalScrollHeuristicInBrowser, {
      rootSelector: 'main#main',
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });

  test('narrow phone library has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/zinebox/?e2eSeed=1');
    await expectZineboxLibraryChrome(page);

    const result = await page.evaluate(runHorizontalScrollHeuristicInBrowser, {
      rootSelector: 'main#main',
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });
});
