import { test, expect } from '@playwright/test';
import { measureClickUntil, reportInteractionLatency } from '../helpers/interactionLatency';
import { RELAXED_INTERACTION_BUDGET_MS } from '../../src/shared/test/interactionLatencyCore';

/**
 * CUJ-001: Words section controls — interaction latency.
 * @see src/words/CUJs.md
 */
test.describe('Words practice interaction', () => {
  test('add section responds within budget', async ({ page }) => {
    await page.goto('/words/');
    await expect(page.locator('main#main')).toBeVisible({ timeout: 15_000 });

    const addVerse = page.getByRole('button', { name: /verse/i }).first();
    await expect(addVerse).toBeVisible({ timeout: 10_000 });

    // Warmup — first section add may compile layout under parallel full-smoke CPU load.
    await addVerse.click();
    await expect(page.locator('.words-section-card').first()).toBeVisible({ timeout: 5_000 });

    const ms = await measureClickUntil(page, addVerse, async () => {
      await expect(page.locator('.words-section-card')).toHaveCount(2, { timeout: 5_000 });
    });
    reportInteractionLatency(ms, RELAXED_INTERACTION_BUDGET_MS, 'add section');
  });
});
