import { test, expect } from '@playwright/test';
import {
  collectPageConsoleErrors,
  prepareGestureE2ePage,
  stubGestureDriveThumbnailImages,
} from '../helpers/gesturePreviewFixtures';
import { measureClickUntil, reportInteractionLatency } from '../helpers/interactionLatency';
import { DEFAULT_INTERACTION_BUDGET_MS } from '../../src/shared/test/interactionLatencyCore';

/**
 * CUJ-001: Configure practice session — interaction responsiveness.
 * Catches render-cascade regressions (session controls re-rendering preview grid).
 *
 * @see src/gesture/CUJs.md
 */
test.describe('Gesture practice interaction latency', () => {
  test.beforeEach(async ({ page }) => {
    await prepareGestureE2ePage(page);
    await stubGestureDriveThumbnailImages(page);
  });

  test('session length radios respond within budget', async ({ page }) => {
    const consoleErrors = collectPageConsoleErrors(page);
    await page.goto('/gesture/?e2eSeed=1');

    const limitedRadio = page.getByRole('radio', { name: 'Limited session length' });
    const endlessRadio = page.getByRole('radio', { name: 'Endless session' });
    const photoLimit = page.locator('#gesture-session-photo-limit');

    await expect(limitedRadio).toBeVisible({ timeout: 15_000 });

    const toLimitedMs = await measureClickUntil(page, limitedRadio, async () => {
      await expect(photoLimit).toBeEnabled();
    });
    reportInteractionLatency(toLimitedMs, DEFAULT_INTERACTION_BUDGET_MS, 'session length: limited');

    const toEndlessMs = await measureClickUntil(page, endlessRadio, async () => {
      await expect(photoLimit).toBeDisabled();
    });
    reportInteractionLatency(toEndlessMs, DEFAULT_INTERACTION_BUDGET_MS, 'session length: endless');

    const blobErrors = consoleErrors.filter(
      (line) => line.includes('ERR_FILE_NOT_FOUND') && line.includes('blob:'),
    );
    expect(blobErrors).toEqual([]);
  });

  test('timer preset toggle responds within budget', async ({ page }) => {
    await page.goto('/gesture/?e2eSeed=1');

    const twoMin = page.getByRole('button', { name: '2 min' });
    await expect(twoMin).toBeVisible({ timeout: 15_000 });

    const ms = await measureClickUntil(page, twoMin, async () => {
      await expect(twoMin).toHaveAttribute('aria-pressed', 'true');
    });
    reportInteractionLatency(ms, DEFAULT_INTERACTION_BUDGET_MS, 'timer preset toggle');
  });
});
