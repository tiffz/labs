import { describe, expect, it } from 'vitest';
import { PRELOAD_RELOAD_COOLDOWN_MS, shouldReloadForPreloadError } from './labsCrashLog';

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
