import { test, expect } from '@playwright/test';
import { expectMuscleCanvasReady } from '../helpers/muscleCanvas';

async function setLayerPeelDepth(page: import('@playwright/test').Page, depth: 0 | 1 | 2 | 3) {
  await page.getByRole('slider', { name: 'Depth' }).fill(String(depth));
}

test.describe('Muscle Memory full body skeleton', () => {
  test('loads core bones at skeleton peel with debug inventory', async ({ page }) => {
    // The full-body atlas (~400k tris) can take >30s to load + publish its debug inventory under the
    // parallel smoke suite. The internal waits below (canvas 20s + status 15s + inventory poll 45s)
    // exceed Playwright's default 30s test cap, so raise the test budget or the poll never completes.
    test.setTimeout(90_000);
    await page.goto('/muscle/?debug=1');
    await expectMuscleCanvasReady(page);

    await setLayerPeelDepth(page, 3);
    await expect(page.getByTestId('muscle-layer-status')).toContainText('Skeleton ·', { timeout: 15_000 });

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const debug = window.__MUSCLE_ANATOMY_DEBUG__;
            return debug?.anatomyNodeIds?.length ?? 0;
          }),
        // atlas_complete is ~400k tris; under the parallel smoke suite it can take >30s to
        // load + publish the debug inventory (orbit-perf muscle load observed at 31s).
        { timeout: 45_000 },
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
