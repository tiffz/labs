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
