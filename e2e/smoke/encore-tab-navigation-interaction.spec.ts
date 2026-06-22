import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { measureClickUntil } from '../helpers/interactionLatency';
import { TAB_NAVIGATION_BUDGET_MS } from '../../src/shared/test/interactionLatencyCore';

/**
 * CUJ-001: Top-level Encore tab switches stay responsive after keep-alive mounts.
 * @see src/encore/CUJs.md
 */
test.describe('Encore tab navigation latency', () => {
  test.beforeEach(async ({ page }) => {
    await enterEncoreApp(page);
    await page.goto('/encore/#/library');
    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({ timeout: 15_000 });
  });

  test('library → practice → repertoire round trip within budget', async ({ page }) => {
    const practiceTab = page.getByRole('tab', { name: 'Practice' });
    let ms = await measureClickUntil(page, practiceTab, async () => {
      await expect(page.getByRole('heading', { name: 'Your practice' })).toBeVisible({ timeout: 10_000 });
    });
    expect(ms).toBeLessThanOrEqual(TAB_NAVIGATION_BUDGET_MS);

    const repertoireTab = page.getByRole('tab', { name: 'Repertoire' });
    ms = await measureClickUntil(page, repertoireTab, async () => {
      await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({ timeout: 10_000 });
    });
    expect(ms).toBeLessThanOrEqual(TAB_NAVIGATION_BUDGET_MS);
  });

  test('library → originals → performances within budget', async ({ page }) => {
    const originalsTab = page.getByRole('tab', { name: 'Originals' });
    let ms = await measureClickUntil(page, originalsTab, async () => {
      await expect(page.getByRole('heading', { name: 'Originals' })).toBeVisible({ timeout: 10_000 });
    });
    expect(ms).toBeLessThanOrEqual(TAB_NAVIGATION_BUDGET_MS);

    const performancesTab = page.getByRole('tab', { name: 'Performances' });
    ms = await measureClickUntil(page, performancesTab, async () => {
      await expect(page.getByRole('heading', { name: 'Performances' })).toBeVisible({ timeout: 10_000 });
    });
    expect(ms).toBeLessThanOrEqual(TAB_NAVIGATION_BUDGET_MS);
  });
});
