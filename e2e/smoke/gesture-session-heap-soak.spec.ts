import { test, expect } from '@playwright/test';
import {
  GESTURE_E2E_PACK_ID,
  prepareGestureE2ePage,
  stubGestureDriveThumbnailImages,
} from '../helpers/gesturePreviewFixtures';
import { assertHeapGrowthWithinBudget, sampleJsHeap } from '../helpers/stanzaPlaybackSoak';

const SOAK_SESSION_COUNT = 10;
const WARMUP_SESSION_COUNT = 2;

/**
 * Gesture session heap soak — runs the zen session to completion repeatedly
 * (4 seeded photos per round, restarted via "Practice again") and asserts JS
 * heap growth stays bounded. Catches media-cache leaks (blob URLs, prefetch
 * cache, decode buffers) plus session teardown leaks that a single-advance
 * smoke misses. See docs/GESTURE_MEDIA_STABILITY.md.
 */
test.describe('Gesture session heap soak', () => {
  test.setTimeout(180_000);

  // @soak: excluded from PR-CI full smoke (test:e2e:smoke greps it out);
  // runs nightly (test:e2e:soak) and in gesture-scoped e2e runs.
  test(`${SOAK_SESSION_COUNT} full sessions without runaway heap growth @soak`, async ({ page }) => {
    await prepareGestureE2ePage(page);
    await stubGestureDriveThumbnailImages(page);
    await page.goto('/gesture/?e2eSeed=1');

    const packCard = page.locator(
      `[data-pack-id="${GESTURE_E2E_PACK_ID}"].gesture-collection-card--selectable`,
    );
    await expect(packCard).toBeVisible({ timeout: 15_000 });
    // With no stored session config, packs with photos auto-select once counts load.
    await expect(
      packCard.locator('.gesture-collection-card-preview-toggle'),
    ).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 });

    await page.getByRole('radio', { name: 'Endless session' }).check();
    const enterButton = page.getByRole('button', { name: 'Enter the room' });
    await expect(enterButton).toBeEnabled();
    await enterButton.click();

    const sessionImage = page.locator('img.gesture-zen-image');
    await expect(sessionImage).toBeVisible({ timeout: 20_000 });

    const skipButton = page.getByRole('button', { name: 'Skip to next photo' });
    const practiceAgain = page.getByRole('button', { name: 'Practice again' });

    // Skip through all photos until the debrief appears, then restart.
    const runSessions = async (count: number) => {
      for (let i = 0; i < count; i += 1) {
        for (let advances = 0; advances < 20; advances += 1) {
          if (await practiceAgain.isVisible()) break;
          // Debrief can replace the dock between the visibility check and the
          // click on slow runners — treat a missed click as "session ended".
          await skipButton.click({ timeout: 2_000 }).catch(() => {});
          await page.waitForTimeout(50);
        }
        await expect(practiceAgain).toBeVisible({ timeout: 10_000 });
        await practiceAgain.click();
        await expect(sessionImage).toBeVisible({ timeout: 20_000 });
      }
    };

    await runSessions(WARMUP_SESSION_COUNT);
    const baselineHeap = await sampleJsHeap(page);
    test.info().annotations.push({
      type: 'heap-baseline',
      description: baselineHeap
        ? `${(baselineHeap.usedBytes / (1024 * 1024)).toFixed(1)}MB used`
        : 'performance.memory unavailable',
    });

    await runSessions(SOAK_SESSION_COUNT);

    const afterHeap = await sampleJsHeap(page);
    if (baselineHeap && afterHeap) {
      assertHeapGrowthWithinBudget(baselineHeap, afterHeap);
      test.info().annotations.push({
        type: 'heap-after',
        description: `${(afterHeap.usedBytes / (1024 * 1024)).toFixed(1)}MB used`,
      });
    } else {
      test.info().annotations.push({
        type: 'heap-skipped',
        description: 'Chromium performance.memory not exposed — session count assertion only',
      });
    }
  });
});
