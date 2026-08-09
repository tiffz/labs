import { expect, test } from '@playwright/test';
import { clickStanzaLibraryCard } from '../helpers/stanzaLibrary';
import {
  assertAudioContextCountStable,
  assertHeapGrowthWithinBudget,
  installAudioContextCounter,
  readAudioContextCount,
  sampleJsHeap,
  waitForLocalAudioLoopWraps,
} from '../helpers/stanzaPlaybackSoak';
import { STANZA_E2E_SOAK_SONG_TITLE } from '../../src/stanza/e2e/stanzaE2eBootstrap';

const SOAK_LOOP_COUNT = 20;
const WARMUP_WRAP_COUNT = 2;

test.describe('Stanza playback soak', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('STANZA_E2E_HOOKS', '1');
    });
    await installAudioContextCounter(page);
    await page.goto('/stanza/');
    await page.waitForFunction(
      () => typeof window !== 'undefined' && (window as Window & { __stanzaE2e?: unknown }).__stanzaE2e != null,
    );
    // Metronome + drums ON. A bare audio row cannot reach the schedulers that leaked an
    // AudioContext per loop wrap — see `buildE2eSongWithSoakPlayback`.
    await page.evaluate(async () => {
      const w = window as Window & { __stanzaE2e?: { seedSongWithSoakPlayback: () => Promise<string> } };
      await w.__stanzaE2e!.seedSongWithSoakPlayback();
    });
    await clickStanzaLibraryCard(page, STANZA_E2E_SOAK_SONG_TITLE);
    await expect(page.locator('.stanza-playback-stack')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Loop whole song' }).click();
    await page.locator('button.stanza-play-btn').click();
    await page.waitForFunction(() => {
      const audio = document.querySelector('audio.stanza-local-audio') as HTMLAudioElement | null;
      return audio != null && !audio.paused && audio.duration > 1;
    });
  });

  // @soak: excluded from PR-CI full smoke (test:e2e:smoke greps it out);
  // runs nightly (test:e2e:soak) and in stanza-scoped e2e runs.
  test(`${SOAK_LOOP_COUNT} loop wraps without runaway heap growth @soak`, async ({ page }) => {
    await waitForLocalAudioLoopWraps(page, WARMUP_WRAP_COUNT, 30_000);

    const baselineContexts = await readAudioContextCount(page);
    const baselineHeap = await sampleJsHeap(page);
    test.info().annotations.push({
      type: 'heap-baseline',
      description: baselineHeap
        ? `${(baselineHeap.usedBytes / (1024 * 1024)).toFixed(1)}MB used`
        : 'performance.memory unavailable',
    });

    await waitForLocalAudioLoopWraps(
      page,
      WARMUP_WRAP_COUNT + SOAK_LOOP_COUNT,
      Math.max(120_000, SOAK_LOOP_COUNT * 4_000),
    );

    await expect
      .poll(async () => {
        const audio = page.locator('audio.stanza-local-audio');
        return audio.evaluate((el) => !(el as HTMLAudioElement).paused);
      })
      .toBe(true);

    // Exact and deterministic — assert this BEFORE the heap budget, which is a noisy proxy that
    // can absorb a handful of leaked contexts without tripping.
    const afterContexts = await readAudioContextCount(page);
    test.info().annotations.push({
      type: 'audio-contexts',
      description: `${baselineContexts} at baseline, ${afterContexts} after ${SOAK_LOOP_COUNT} wraps`,
    });
    assertAudioContextCountStable(baselineContexts, afterContexts, SOAK_LOOP_COUNT);

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
        description: 'Chromium performance.memory not exposed — loop count assertion only',
      });
    }
  });
});
