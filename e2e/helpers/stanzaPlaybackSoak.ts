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

/**
 * Count every `AudioContext` the page constructs, from before app code runs.
 *
 * Heap growth is a lagging, noisy proxy: a handful of leaked contexts can hide inside GC jitter
 * well under the 1.55x budget, which is how a context-per-loop-wrap leak survived this soak. The
 * count is exact and fails on the FIRST extra context, so install this alongside the heap check.
 *
 * Must run via `page.addInitScript` — patching after load misses contexts made during startup.
 */
export async function installAudioContextCounter(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as Window & { __stanzaAudioContextCount?: number };
    w.__stanzaAudioContextCount = 0;
    for (const key of ['AudioContext', 'webkitAudioContext'] as const) {
      const Original = (window as unknown as Record<string, unknown>)[key] as
        | (new (...args: unknown[]) => unknown)
        | undefined;
      if (typeof Original !== 'function') continue;
      const Counted = function (this: unknown, ...args: unknown[]) {
        w.__stanzaAudioContextCount = (w.__stanzaAudioContextCount ?? 0) + 1;
        return new Original(...args);
      } as unknown as new (...args: unknown[]) => unknown;
      Counted.prototype = Original.prototype;
      (window as unknown as Record<string, unknown>)[key] = Counted;
    }
  });
}

export async function readAudioContextCount(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as Window & { __stanzaAudioContextCount?: number }).__stanzaAudioContextCount ?? 0,
  );
}

/**
 * Budget for NEW contexts created across the measured wraps. Zero is the real invariant — every
 * driver allocates once per session — but allow a small margin for a lazily-created context whose
 * first use happens to land after the baseline sample.
 */
export const STANZA_SOAK_MAX_NEW_AUDIO_CONTEXTS = 2;

export function assertAudioContextCountStable(before: number, after: number, wraps: number): void {
  const created = after - before;
  if (created > STANZA_SOAK_MAX_NEW_AUDIO_CONTEXTS) {
    throw new Error(
      `${created} new AudioContext(s) across ${wraps} loop wraps (max ${STANZA_SOAK_MAX_NEW_AUDIO_CONTEXTS}). ` +
        `A driver is allocating per play or per wrap instead of once per session — browsers cap ` +
        `contexts per document and then throw.`,
    );
  }
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
