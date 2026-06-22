import { test, expect } from '@playwright/test';
import { stubGestureDriveThumbnailImages } from '../helpers/gesturePreviewFixtures';
import { runHorizontalScrollHeuristicInBrowser } from '../helpers/horizontalScrollHeuristic';
import { runScrollSanityInBrowser } from '../helpers/scrollSanity';

test.describe('Gesture scroll sanity', () => {
  test('practice shell scrolls vertically', async ({ page }) => {
    await stubGestureDriveThumbnailImages(page);
    await page.goto('/gesture/?e2eSeed=1');
    await expect(page.locator('.gesture-shell')).toBeVisible({ timeout: 15_000 });

    const result = await page.evaluate(runScrollSanityInBrowser, {});
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });

  test('collections route has no horizontal overflow on shell', async ({ page }) => {
    await stubGestureDriveThumbnailImages(page);
    await page.goto('/gesture/?e2eSeed=1#/collections');
    await expect(page.locator('.gesture-shell')).toBeVisible({ timeout: 15_000 });

    const result = await page.evaluate(runHorizontalScrollHeuristicInBrowser, {
      rootSelector: '.gesture-shell',
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });
});
