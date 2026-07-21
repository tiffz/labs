import { test, expect } from '@playwright/test';
import { runHorizontalScrollHeuristicInBrowser } from '../helpers/horizontalScrollHeuristic';
import { runContrastAuditInBrowser } from '../helpers/contrastAudit';
import { runTouchTargetHeuristicInBrowser } from '../helpers/touchTargetHeuristic';

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

  test('narrow phone shell has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/muscle/?module=shoulder_neck');
    await expect(page.getByTestId('muscle-app')).toBeVisible({ timeout: 15_000 });

    const result = await page.evaluate(runHorizontalScrollHeuristicInBrowser, {
      rootSelector: 'main#main',
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });

  // Restores the touch-target coverage lost when /muscle/ was skipped from the
  // generic responsive floor: the full-page scan starved on muscle's WebGL-
  // contended main thread while enumerating the 498-row browse DOM. This scan is
  // scoped to the on-canvas view controls (a 3-button set), so it stays fast even
  // under CI's software renderer — it waits for the canvas to be ready (the
  // controls are hidden until then) but never walks the large browse list.
  // `heavy-page-ci-flake` follow-up — see docs/PROCESS_BACKLOG.md.
  test('canvas view controls meet the 24px touch-target floor on phone', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/muscle/?module=shoulder_neck');
    await expect(page.getByTestId('muscle-app')).toBeVisible({ timeout: 15_000 });

    // The controls only mount/show once the 3D canvas is ready; wait with the
    // same generous budget the muscle study-journey smoke uses on CI WebGL.
    const controls = page.locator('.muscle-canvas-view-controls');
    await expect(controls).toBeVisible({ timeout: 90_000 });

    const result = await page.evaluate(runTouchTargetHeuristicInBrowser, {
      rootSelector: '.muscle-canvas-view-controls',
    });
    expect(result.ok, result.ok ? '' : JSON.stringify(result)).toBe(true);
  });
});
