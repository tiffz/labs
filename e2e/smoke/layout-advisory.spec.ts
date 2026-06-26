import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { runAxeAuditInPage } from '../helpers/axeAudit';
import { sampleLcpMs } from '../helpers/lcpSampling';
import { runTextTruncationHeuristicInBrowser } from '../helpers/textTruncationHeuristic';

/**
 * Tier-3 advisory layout/a11y checks — scoped regions only (MUI full-page axe is noisy).
 * Failures emit test failures locally; CI treats as merge-blocking smoke when in scoped map.
 */
test.describe('Layout advisory (Tier 3)', () => {
  test('encore library lede passes axe on scoped region', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await enterEncoreApp(page);
    await page.goto('/encore/#/library');
    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({ timeout: 15_000 });

    const result = await runAxeAuditInPage(page, { rootSelector: 'main#main h2' });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });

  test('gesture practice lede passes axe on scoped region', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/gesture/#/practice');
    await expect(page.locator('.gesture-lede')).toBeVisible({ timeout: 15_000 });

    const result = await runAxeAuditInPage(page, { rootSelector: '.gesture-lede' });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });

  test('sight practice shell LCP within budget', async ({ page }) => {
    await page.goto('/sight/');
    await expect(page.locator('#root')).toBeVisible();
    await page.getByRole('button', { name: /^practice$/i }).click();
    await expect(page.locator('.sight-practice-shell')).toBeVisible({ timeout: 15_000 });
    const sample = await sampleLcpMs(page, 3500);
    expect(sample.ok, sample.reason ?? '').toBe(true);
  });

  test('words practice has no clipped headings without ellipsis', async ({ page }) => {
    await page.goto('/words/');
    await expect(page.locator('#root')).toBeVisible({ timeout: 10_000 });
    const result = await page.evaluate(runTextTruncationHeuristicInBrowser, {
      rootSelector: 'main, [role="main"], #root',
      textSelectors: ['h1', 'h2'],
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });
});
