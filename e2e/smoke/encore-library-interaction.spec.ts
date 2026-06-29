import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { measureClickUntil, reportInteractionLatency } from '../helpers/interactionLatency';
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
    const ms = await measureClickUntil(page, practiceTab, async () => {
      await expect(page.getByRole('heading', { name: 'Your practice' })).toBeVisible({ timeout: 10_000 });
    });

    reportInteractionLatency(ms, TAB_NAVIGATION_BUDGET_MS, 'library → practice tab');
    await expect(page).toHaveURL(/#\/practice/);
  });
});
