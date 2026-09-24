import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { measureClickBlocking, reportInteractionBlocking } from '../helpers/interactionLatency';
import { TAB_NAVIGATION_BUDGET_MS } from '../../src/shared/test/interactionLatencyCore';

/**
 * CUJ-001: Library ↔ Practice tab responsiveness.
 * @see src/encore/CUJs.md
 */
test.describe('Encore library interaction latency', () => {
  test('practice tab responds within budget', async ({ page }) => {
    await enterEncoreApp(page);
    await page.goto('/encore/#/library');
    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({ timeout: 15_000 });

    const practiceTab = page.getByRole('tab', { name: 'Practice' });
    /*
     * Blocking, not just wall clock. Encore is where the render-cascade class actually bit (#214):
     * the main thread was blocked for 2,144ms across 29 long tasks while every individual
     * interaction still resolved promptly, so a click-until-condition measurement saw nothing.
     */
    const measurement = await measureClickBlocking(page, practiceTab, async () => {
      await expect(page.getByRole('heading', { name: 'Your practice' })).toBeVisible({ timeout: 10_000 });
    });

    reportInteractionBlocking(measurement, TAB_NAVIGATION_BUDGET_MS, 'library → practice tab');
    await expect(page).toHaveURL(/#\/practice/);
  });
});
