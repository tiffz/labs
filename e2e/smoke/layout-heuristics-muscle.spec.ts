import { test, expect } from '@playwright/test';
import { runHorizontalScrollHeuristicInBrowser } from '../helpers/horizontalScrollHeuristic';
import { runContrastAuditInBrowser } from '../helpers/contrastAudit';

test.describe('Muscle layout heuristics', () => {
  test('shell main has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/muscle/?module=shoulder_neck');
    await expect(page.getByTestId('muscle-app')).toBeVisible({ timeout: 15_000 });

    const result = await page.evaluate(runHorizontalScrollHeuristicInBrowser, {
      rootSelector: 'main#main',
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });

  test('shell text meets contrast guard', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/muscle/?module=shoulder_neck');
    await expect(page.getByTestId('muscle-app')).toBeVisible({ timeout: 15_000 });

    const result = await page.evaluate(runContrastAuditInBrowser, {
      rootSelector: 'main#main',
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });
});
