import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';
import { gotoEncoreOriginalsQueue } from '../helpers/encoreOriginalsQueue';
import { runHorizontalScrollHeuristicInBrowser } from '../helpers/horizontalScrollHeuristic';
import { runLayoutHeuristicsInBrowser } from '../helpers/layoutHeuristics';
import { runContrastAuditInBrowser } from '../helpers/contrastAudit';

/**
 * Catches cramped page chrome and unreadable secondary copy on Encore library.
 */
test.describe('Encore layout heuristics', () => {
  test('library route has main padding and readable header description', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await enterEncoreApp(page);
    await page.goto('/encore/#/library');

    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({
      timeout: 15_000,
    });

    const result = await page.evaluate(runLayoutHeuristicsInBrowser, {
      containerSelector: 'main#main',
      contentSelector: 'main#main h2',
      mutedTextSelector: 'main#main .MuiTypography-body2',
    });

    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });

  test('library main text meets contrast guard', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await enterEncoreApp(page);
    await page.goto('/encore/#/library');

    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({
      timeout: 15_000,
    });

    const result = await page.evaluate(runContrastAuditInBrowser, {
      rootSelector: 'main#main',
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });

  test('originals song dashboard has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await enterEncoreApp(page);
    await gotoEncoreOriginalsQueue(page, { viewMode: 'grid' });

    const dashboard = page.getByTestId('originals-song-dashboard');
    const result = await dashboard.evaluate((el) => {
      const overflowPx = el.scrollWidth - el.clientWidth;
      if (overflowPx <= 1) return { ok: true as const };
      return {
        ok: false as const,
        check: 'horizontal-scroll' as const,
        reason: `dashboard overflows horizontally by ${overflowPx}px`,
        details: { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, overflowPx },
      };
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });

  test('originals route main has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await enterEncoreApp(page);
    await gotoEncoreOriginalsQueue(page);

    const result = await page.evaluate(runHorizontalScrollHeuristicInBrowser, {
      rootSelector: 'main#main',
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });

  test('narrow phone library has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterEncoreApp(page);
    await page.goto('/encore/#/library');

    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({
      timeout: 15_000,
    });

    const result = await page.evaluate(runHorizontalScrollHeuristicInBrowser, {
      rootSelector: 'main#main',
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });
});
