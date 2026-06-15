import { test, expect } from '@playwright/test';
import { measureClickUntil } from '../helpers/interactionLatency';
import { DEFAULT_INTERACTION_BUDGET_MS, RELAXED_INTERACTION_BUDGET_MS } from '../../src/shared/test/interactionLatencyCore';

/**
 * CUJ-001: Daily practice — interaction + layout.
 * @see src/sight/CUJs.md
 */
test.describe('Sight practice interaction', () => {
  test('practice loads and swatch tap responds within budget', async ({ page }) => {
    await page.goto('/sight/');

    const practiceBtn = page.getByRole('button', { name: /^practice$/i });
    await expect(practiceBtn).toBeVisible({ timeout: 10_000 });

    const loadMs = await measureClickUntil(page, practiceBtn, async () => {
      await expect(page.locator('.sight-practice-body')).toBeVisible();
    });
    expect(loadMs).toBeLessThanOrEqual(RELAXED_INTERACTION_BUDGET_MS);

    const swatch = page.getByRole('button', { name: /swatch/i }).first();
    await expect(swatch).toBeVisible({ timeout: 5_000 });

    const tapMs = await measureClickUntil(page, swatch, async () => {
      await expect(page.locator('.sight-compare-verdict--visible')).toBeVisible({ timeout: 3_000 });
    });
    expect(tapMs).toBeLessThanOrEqual(DEFAULT_INTERACTION_BUDGET_MS);
  });

  test('practice footer pins to viewport bottom', async ({ page }) => {
    await page.goto('/sight/');
    await page.getByRole('button', { name: /^practice$/i }).click();
    await expect(page.locator('.sight-footer')).toBeVisible({ timeout: 10_000 });

    const gap = await page.evaluate(() => {
      const footer = document.querySelector('.sight-footer');
      const app = document.querySelector('.sight-app');
      if (!footer || !app) return 999;
      const footerRect = footer.getBoundingClientRect();
      const appRect = app.getBoundingClientRect();
      return Math.abs(appRect.bottom - footerRect.bottom);
    });

    expect(gap).toBeLessThanOrEqual(8);
  });
});
