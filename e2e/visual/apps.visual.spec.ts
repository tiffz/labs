import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { VISUAL_ROUTE_SPECS, VISUAL_VIEWPORTS } from '../routeRegistry';
import {
  configureDeterministicBrowserState,
  waitForVisualReady,
  warmUpCatsTabbedPanelMaterialFonts,
  type VisualRouteSpec,
} from './visualTestUtils';

const ROUTE_SPECS: VisualRouteSpec[] = VISUAL_ROUTE_SPECS;

/**
 * Per-route preparation that runs after `page.goto` and before readiness waits.
 * Use for states that need an interaction (e.g. dismissing the Encore access gate),
 * not for data seeding — seed via URL params (`?e2eSeed=1`) in the route registry.
 */
const VISUAL_PREPARE: Record<string, (page: Page) => Promise<void>> = {
  'encore-library': async (page) => {
    await page.waitForSelector('#root', { state: 'attached' });
    const continueLocal = page.getByRole('button', { name: 'Continue without Google' });
    if (await continueLocal.isVisible().catch(() => false)) {
      await continueLocal.click();
    }
    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({
      timeout: 15_000,
    });
  },
};

test.describe('Visual regression baselines for app routes', () => {
  const thisDir = path.dirname(fileURLToPath(import.meta.url));
  const snapshotDir = path.resolve(thisDir, 'apps.visual.spec.ts-snapshots');
  const defaultProjectName = 'visual';

  function snapshotForProject(baseName: string, projectName: string): string {
    if (projectName === defaultProjectName) return baseName;
    return baseName.replace('.png', `-${projectName}.png`);
  }

  /**
   * Refuse to WRITE a baseline anywhere but Linux.
   *
   * Baselines are compared on Linux CI, and Linux renders differently from macOS in ways that are
   * invisible when you look at the picture: classic scrollbars occupy layout width where macOS uses
   * zero-width overlay scrollbars, so a page that fits on macOS gains a scrollbar on Linux, content
   * reflows, and text wraps a line earlier. Font hinting differs too.
   *
   * A macOS-authored baseline is therefore not merely "slightly off" — it can never pass in CI.
   * `zinebox-library-mobile.png` was captured that way on 2026-08-15 and turned the nightly
   * Portfolio Audit red every night for five days, while passing locally for whoever generated it.
   * Confirmed by restoring that baseline and watching it pass on macOS and fail on Linux.
   *
   * `--update-snapshots` writes unconditionally; the DEFAULT `missing` mode also writes silently
   * for any route with no committed baseline, which is how a new route acquires a bad one without
   * anybody choosing to. Both are blocked here.
   *
   * The two supported paths are `npm run test:e2e:visual:docker` (Linux container) and
   * `scripts/import-visual-baselines-from-artifacts.mjs` against a CI artifact.
   */
  function assertBaselineWritesAreLinuxOnly(testInfo: TestInfo, snapshotName: string): void {
    if (process.platform === 'linux') return;

    const mode = testInfo.config.updateSnapshots;
    const overwrites = mode === 'all' || mode === 'changed';
    const fillsGap = mode === 'missing' && !fs.existsSync(path.join(snapshotDir, snapshotName));
    if (!overwrites && !fillsGap) return;

    throw new Error(
      `Refusing to write ${snapshotName} on ${process.platform}: visual baselines are only valid ` +
        `when captured on Linux, which is what CI compares against. A macOS capture can pass here ` +
        `and fail in CI forever (scrollbar width and font hinting differ).\n` +
        `  Regenerate on Linux:  npm run test:e2e:visual:docker\n` +
        `  Or import from CI:    gh run download <run-id> -n visual-regression-artifacts -D <dir> ` +
        `&& node scripts/import-visual-baselines-from-artifacts.mjs <dir>/test-results`
    );
  }

  async function attachBaselineIfPresent(testInfo: TestInfo, snapshotName: string): Promise<void> {
    try {
      await testInfo.attach(`baseline-${snapshotName}`, {
        path: path.join(snapshotDir, snapshotName),
        contentType: 'image/png',
      });
    } catch {
      // Baseline may not exist during first generation runs.
    }
  }

  for (const spec of ROUTE_SPECS) {
    for (const viewport of spec.viewports) {
      // Bracketed id keeps `--grep` matching unambiguous in run-scoped-visual.mts.
      test(`[${spec.id}] ${viewport} baseline`, async ({ page }, testInfo) => {
        await configureDeterministicBrowserState(page);
        await page.setViewportSize(VISUAL_VIEWPORTS[viewport]);
        const snapshotName = snapshotForProject(
          `${spec.id}-${viewport}.png`,
          testInfo.project.name
        );

        await page.goto(spec.route, { waitUntil: 'load' });
        await VISUAL_PREPARE[spec.id]?.(page);
        await waitForVisualReady(page, spec);
        if (spec.id === 'cats') {
          await warmUpCatsTabbedPanelMaterialFonts(page);
        }
        assertBaselineWritesAreLinuxOnly(testInfo, snapshotName);
        // Single capture: toHaveScreenshot is the only full-page shot (avoids mismatch vs a prior screenshot()).
        await attachBaselineIfPresent(testInfo, snapshotName);
        await expect(page).toHaveScreenshot(snapshotName, {
          fullPage: true,
          mask: spec.maskSelectors?.map((selector) => page.locator(selector)),
          // Screenshot stabilization (two consecutive matching captures) can need
          // more than the default 5s on heavy shells (WebGL, large full pages).
          timeout: 20_000,
        });
      });
    }
  }
});
