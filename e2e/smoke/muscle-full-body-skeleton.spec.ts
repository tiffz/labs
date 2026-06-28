import { test, expect } from '@playwright/test';
import { expectMuscleCanvasReady } from '../helpers/muscleCanvas';

async function setLayerPeelDepth(page: import('@playwright/test').Page, depth: 0 | 1 | 2 | 3) {
  await page.getByRole('slider', { name: 'Depth' }).fill(String(depth));
}

// Caps (not perf budgets): the full-body atlas (~400k tris) load + debug-inventory publish is the
// heaviest WebGL work in the suite. CI runs software WebGL (SwiftShader) on shared 2-core runners
// with several muscle specs loading concurrently, so its wall time is ~2.5x local (37s local was
// observed timing out >90s on CI). These timeouts only bite in the slow tail — the poll resolves as
// soon as the inventory publishes — so generous CI caps cost nothing on green runs while removing
// the timeout flake. See docs/FLAKY_TESTS.md and docs/CI_RELIABILITY.md. Keep retries:0 (no masking).
const isCI = !!process.env.CI;
// Internal serial waits must sum below the test cap: status + inventory (+ canvas via helper).
const STATUS_TIMEOUT_MS = isCI ? 20_000 : 15_000;
const INVENTORY_TIMEOUT_MS = isCI ? 120_000 : 45_000;
const TEST_CAP_MS = isCI ? 180_000 : 90_000;

test.describe('Muscle Memory full body skeleton', () => {
  test('loads core bones at skeleton peel with debug inventory', async ({ page }) => {
    test.setTimeout(TEST_CAP_MS);
    await page.goto('/muscle/?debug=1');
    await expectMuscleCanvasReady(page);

    await setLayerPeelDepth(page, 3);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Skeleton ·', {
      timeout: STATUS_TIMEOUT_MS,
    });

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const debug = window.__MUSCLE_ANATOMY_DEBUG__;
            return debug?.anatomyNodeIds?.length ?? 0;
          }),
        { timeout: INVENTORY_TIMEOUT_MS },
      )
      .toBeGreaterThan(400);

    const missingBones = await page.evaluate(() => {
      const payload = window.__LABS_DEBUG__ as { missingRequiredBones?: string[] } | undefined;
      return payload?.missingRequiredBones ?? ['debug payload missing'];
    });

    expect(missingBones, `Missing bones: ${missingBones.join(', ')}`).toEqual([]);
  });
});

declare global {
  interface Window {
    __MUSCLE_ANATOMY_DEBUG__?: { anatomyNodeIds: string[] };
    __LABS_DEBUG__?: { missingRequiredBones?: string[] };
  }
}
