import { test, expect } from '@playwright/test';
import { GESTURE_E2E_PACK_ID, stubGestureDriveThumbnailImages } from '../helpers/gesturePreviewFixtures';
import { runLayoutHeuristicsInBrowser } from '../helpers/layoutHeuristics';

/**
 * Catches “obvious bad” layout: cramped shell padding and unreadable muted copy.
 * Complements gesture-preview-strip (functional) with ux-spec-violation heuristics.
 */
test.describe('Gesture layout heuristics', () => {
  test('practice shell has panel padding and readable muted lede', async ({ page }) => {
    await stubGestureDriveThumbnailImages(page);
    await page.goto('/gesture/?e2eSeed=1');

    await expect(page.locator('.gesture-shell')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(`[data-pack-id="${GESTURE_E2E_PACK_ID}"]`)).toBeVisible({
      timeout: 15_000,
    });

    const result = await page.evaluate(runLayoutHeuristicsInBrowser, {
      containerSelector: '.gesture-shell',
      contentSelector: '.gesture-header',
      mutedTextSelector: '.gesture-lede',
    });

    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });
});
