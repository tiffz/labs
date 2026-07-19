import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRefreshRateLimit, recordRefreshSuccess, REFRESH_RATE_LIMITS } from './rateLimit';

/** Minimal in-memory KV standing in for Cloudflare KVNamespace (get/put only). */
function fakeKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  } as unknown as KVNamespace;
}

describe('refresh rate limiter (charge-after-success)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first refresh and does not charge on check alone', async () => {
    const kv = fakeKv();
    expect((await checkRefreshRateLimit(kv, 'sid', '1.2.3.4')).allowed).toBe(true);
    // Repeated checks without a success stay allowed — failed attempts no longer eat quota.
    expect((await checkRefreshRateLimit(kv, 'sid', '1.2.3.4')).allowed).toBe(true);
    expect((await checkRefreshRateLimit(kv, 'sid', '1.2.3.4')).allowed).toBe(true);
  });

  it('enforces the min interval only after a successful refresh', async () => {
    const kv = fakeKv();
    await recordRefreshSuccess(kv, 'sid', '1.2.3.4');
    const blocked = await checkRefreshRateLimit(kv, 'sid', '1.2.3.4');
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toMatch(/too soon/i);

    vi.advanceTimersByTime(REFRESH_RATE_LIMITS.MIN_REFRESH_INTERVAL_MS + 1);
    expect((await checkRefreshRateLimit(kv, 'sid', '1.2.3.4')).allowed).toBe(true);
  });

  it('caps successful refreshes per session per hour', async () => {
    const kv = fakeKv();
    for (let i = 0; i < REFRESH_RATE_LIMITS.MAX_REFRESH_PER_HOUR; i += 1) {
      await recordRefreshSuccess(kv, 'sid', '1.2.3.4');
      vi.advanceTimersByTime(REFRESH_RATE_LIMITS.MIN_REFRESH_INTERVAL_MS + 1);
    }
    const blocked = await checkRefreshRateLimit(kv, 'sid', '1.2.3.4');
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toMatch(/hourly/i);
  });

  it('resets the hourly count in the next hour bucket', async () => {
    const kv = fakeKv();
    for (let i = 0; i < REFRESH_RATE_LIMITS.MAX_REFRESH_PER_HOUR; i += 1) {
      await recordRefreshSuccess(kv, 'sid', '1.2.3.4');
      vi.advanceTimersByTime(REFRESH_RATE_LIMITS.MIN_REFRESH_INTERVAL_MS + 1);
    }
    expect((await checkRefreshRateLimit(kv, 'sid', '1.2.3.4')).allowed).toBe(false);
    vi.advanceTimersByTime(60 * 60_000);
    expect((await checkRefreshRateLimit(kv, 'sid', '1.2.3.4')).allowed).toBe(true);
  });

  it('rate-limits by IP across sessions', async () => {
    const kv = fakeKv();
    // Sessions rotate, IP stays: the IP bucket keeps counting.
    for (let i = 0; i < REFRESH_RATE_LIMITS.MAX_REFRESH_PER_IP_HOUR; i += 1) {
      await recordRefreshSuccess(kv, `sid-${i}`, '9.9.9.9');
    }
    vi.advanceTimersByTime(REFRESH_RATE_LIMITS.MIN_REFRESH_INTERVAL_MS + 1);
    const blocked = await checkRefreshRateLimit(kv, 'fresh-session', '9.9.9.9');
    expect(blocked.allowed).toBe(false);
  });
});
