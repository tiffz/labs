import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type TestInfo } from '@playwright/test';
import { VISUAL_ROUTE_SPECS } from '../routeRegistry';
import {
  configureDeterministicBrowserState,
  waitForVisualReady,
  warmUpCatsTabbedPanelMaterialFonts,
  type VisualRouteSpec,
} from './visualTestUtils';

const ROUTE_SPECS: VisualRouteSpec[] = VISUAL_ROUTE_SPECS;

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
    test(`${spec.id} desktop baseline`, async ({ page }, testInfo) => {
      await configureDeterministicBrowserState(page);
      const snapshotName = snapshotForProject(
        `${spec.id}-desktop.png`,
        testInfo.project.name
      );

      await page.goto(spec.route, { waitUntil: 'load' });
      await waitForVisualReady(page, spec);
      if (spec.id === 'cats') {
        await warmUpCatsTabbedPanelMaterialFonts(page);
      }
      // Single capture: toHaveScreenshot is the only full-page shot (avoids mismatch vs a prior screenshot()).
      await attachBaselineIfPresent(testInfo, snapshotName);
      await expect(page).toHaveScreenshot(snapshotName, { fullPage: true });
    });

    test(`${spec.id} mobile baseline`, async ({ page }, testInfo) => {
      await configureDeterministicBrowserState(page);
      await page.setViewportSize({ width: 390, height: 844 });
      const snapshotName = snapshotForProject(
        `${spec.id}-mobile.png`,
        testInfo.project.name
      );

      await page.goto(spec.route, { waitUntil: 'load' });
      await waitForVisualReady(page, spec);
      if (spec.id === 'cats') {
        await warmUpCatsTabbedPanelMaterialFonts(page);
      }
      await attachBaselineIfPresent(testInfo, snapshotName);
      await expect(page).toHaveScreenshot(snapshotName, { fullPage: true });
    });
  }
});
