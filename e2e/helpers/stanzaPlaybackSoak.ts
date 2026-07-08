import type { Page } from '@playwright/test';

export type JsHeapSample = { usedBytes: number; totalBytes: number };

/** Chrome-only; returns null when `performance.memory` is unavailable (e.g. Firefox). */
export async function sampleJsHeap(page: Page): Promise<JsHeapSample | null> {
  return page.evaluate(() => {
    const mem = (
      performance as Performance & {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
      }
    ).memory;
    if (!mem) return null;
    return { usedBytes: mem.usedJSHeapSize, totalBytes: mem.totalJSHeapSize };
  });
}

/**
 * Wait until local main audio completes `wrapCount` loop-all wraps (near end → near start).
 * Uses page-global counters so repeated calls in one session accumulate safely.
 */
export async function waitForLocalAudioLoopWraps(
  page: Page,
  wrapCount: number,
  timeoutMs: number,
): Promise<void> {
  await page.waitForFunction(
    ({ targetCount }) => {
      type SoakState = {
        __stanzaSoakWrapCount?: number;
        __stanzaSoakLastNearEnd?: boolean;
      };
      const w = window as Window & SoakState;
      const audio = document.querySelector('audio.stanza-local-audio') as HTMLAudioElement | null;
      if (!audio || audio.paused || !Number.isFinite(audio.duration) || audio.duration <= 1) {
        return false;
      }
      w.__stanzaSoakWrapCount ??= 0;
      const nearEnd = audio.currentTime >= audio.duration - 0.35;
      const nearStart = audio.currentTime < 0.35;
      if (nearEnd) w.__stanzaSoakLastNearEnd = true;
      if (w.__stanzaSoakLastNearEnd && nearStart) {
        w.__stanzaSoakWrapCount += 1;
        w.__stanzaSoakLastNearEnd = false;
      }
      return (w.__stanzaSoakWrapCount ?? 0) >= targetCount;
    },
    { targetCount: wrapCount },
    { timeout: timeoutMs },
  );
}

/** Allow modest GC noise; fail on runaway heap growth during long loop playback. */
export const STANZA_SOAK_HEAP_GROWTH_MAX_RATIO = 1.55;

export function assertHeapGrowthWithinBudget(before: JsHeapSample, after: JsHeapSample): void {
  const maxAllowed = before.usedBytes * STANZA_SOAK_HEAP_GROWTH_MAX_RATIO;
  if (after.usedBytes > maxAllowed) {
    const beforeMb = (before.usedBytes / (1024 * 1024)).toFixed(1);
    const afterMb = (after.usedBytes / (1024 * 1024)).toFixed(1);
    throw new Error(
      `JS heap grew from ${beforeMb}MB to ${afterMb}MB (max ${STANZA_SOAK_HEAP_GROWTH_MAX_RATIO}x baseline)`,
    );
  }
}
