import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type TestInfo } from '@playwright/test';
import {
  configureDeterministicBrowserState,
  waitForVisualReady,
  warmUpCatsTabbedPanelMaterialFonts,
  type VisualRouteSpec,
} from './visualTestUtils';

const ROUTE_SPECS: VisualRouteSpec[] = [
  { id: 'home', route: '/', title: /Tiff Zhang Labs/i, readySelector: '.container' },
  { id: 'cats', route: '/cats/', title: /Cat Clicker/i, readySelector: '.world-viewport-container' },
  { id: 'zines', route: '/zines/', title: /Zine Studio/i, readySelector: '#root' },
  { id: 'corp', route: '/corp/', title: /Corporate Ladder/i, readySelector: '#map-container' },
  { id: 'drums', route: '/drums/', title: /Darbuka Rhythm Trainer/i, readySelector: '#root' },
  { id: 'story', route: '/story/', title: /Save the Cat/i, readySelector: '#root' },
  { id: 'chords', route: '/chords/', title: /Chord Progression Generator/i, readySelector: '#root' },
  { id: 'forms', route: '/forms/', title: /Form Intersections/i, readySelector: '#root' },
  { id: 'beat', route: '/beat/', title: /Find the Beat/i, readySelector: '#root' },
  { id: 'words', route: '/words/', title: /Words in Rhythm/i, readySelector: '#root' },
  { id: 'pitch', route: '/pitch/', title: /Vocal Pitch Detector/i, readySelector: '#root' },
  { id: 'piano', route: '/piano/', title: /Piano Practice/i, readySelector: '#root' },
  { id: 'ui', route: '/ui/', title: /UI Catalog/i, readySelector: '#root' },
  { id: 'universal-tom', route: '/drums/universal_tom/', title: /Universal Tom Importer/i, readySelector: '#root' },
];

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
