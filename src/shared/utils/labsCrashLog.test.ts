import { afterEach, describe, expect, it } from 'vitest';
import {
  PRELOAD_RELOAD_COOLDOWN_MS,
  shouldReloadForPreloadError,
  shouldRecordCrashEntry,
  __resetCrashLogRateLimitForTest,
  __crashLogDedupKeyCountForTest,
} from './labsCrashLog';

describe('shouldReloadForPreloadError (stale-chunk reload loop guard)', () => {
  const now = 1_000_000;

  it('reloads on the first preload error (no prior reload)', () => {
    expect(shouldReloadForPreloadError(now, null)).toBe(true);
  });

  it('reloads when the last reload was longer ago than the cooldown', () => {
    expect(shouldReloadForPreloadError(now, now - PRELOAD_RELOAD_COOLDOWN_MS - 1)).toBe(true);
  });

  it('does NOT reload again within the cooldown (avoids an infinite reload loop)', () => {
    expect(shouldReloadForPreloadError(now, now - 1)).toBe(false);
    expect(shouldReloadForPreloadError(now, now - (PRELOAD_RELOAD_COOLDOWN_MS - 1))).toBe(false);
  });

  it('treats a corrupt (NaN) stored timestamp as a first failure', () => {
    expect(shouldReloadForPreloadError(now, Number.NaN)).toBe(true);
  });
});

describe('shouldRecordCrashEntry (death-spiral rate limit)', () => {
  afterEach(() => __resetCrashLogRateLimitForTest());

  it('drops a repeat of the same error within the dedup window', () => {
    const t = 5_000_000;
    expect(shouldRecordCrashEntry('error-boundary', 'boom', t)).toBe(true);
    expect(shouldRecordCrashEntry('error-boundary', 'boom', t + 500)).toBe(false); // <1s
    expect(shouldRecordCrashEntry('error-boundary', 'boom', t + 1001)).toBe(true); // >1s
  });

  it('allows different errors independently', () => {
    const t = 5_000_000;
    expect(shouldRecordCrashEntry('error-boundary', 'a', t)).toBe(true);
    expect(shouldRecordCrashEntry('error-boundary', 'b', t)).toBe(true);
    expect(shouldRecordCrashEntry('window-error', 'a', t)).toBe(true);
  });

  it('caps total writes within the rolling window so a storm cannot flood', () => {
    const t = 5_000_000;
    // 10 distinct messages allowed within the 5s window...
    for (let i = 0; i < 10; i += 1) {
      expect(shouldRecordCrashEntry('error-boundary', `m${i}`, t + i)).toBe(true);
    }
    // ...the 11th in the same window is dropped.
    expect(shouldRecordCrashEntry('error-boundary', 'm10', t + 11)).toBe(false);
    // After the window passes, writes resume.
    expect(shouldRecordCrashEntry('error-boundary', 'm11', t + 6000)).toBe(true);
  });

  it('does not let the dedup map grow unbounded during a distinct-message storm', () => {
    // A storm of never-repeating messages (IDs/coords in the text) can't collapse on dedup.
    // Without eviction the map would grow with every accepted write; eviction keeps it bounded
    // to the ~1s dedup window. Advance the clock across many windows and assert it stays small.
    const start = 9_000_000;
    for (let i = 0; i < 500; i += 1) {
      // Space calls 100ms apart so time marches well past the 1s dedup window repeatedly.
      shouldRecordCrashEntry('window-error', `unique-${i}`, start + i * 100);
    }
    // Only keys set within the last ~1s dedup window survive — a handful, nowhere near 500.
    expect(__crashLogDedupKeyCountForTest()).toBeLessThan(50);
  });
});
