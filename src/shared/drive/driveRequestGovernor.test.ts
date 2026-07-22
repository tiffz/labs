import { describe, expect, it } from 'vitest';
import {
  DRIVE_MAX_CONCURRENT_REQUESTS,
  DRIVE_RETRY_AFTER_MAX_MS,
  computeDriveRetryBackoffMs,
  computeDriveRetryWaitMs,
  driveInFlightRequestCount,
  parseRetryAfterMs,
  runWithDriveConcurrencyLimit,
} from './driveRequestGovernor';
import {
  LABS_DRIVE_AUTO_PULL_INTERVAL_MS,
  LABS_DRIVE_AUTO_PULL_MIN_INTERVAL_MS,
} from './labsDrivePortfolioBackupConstants';

describe('parseRetryAfterMs', () => {
  it('parses delta-seconds', () => {
    expect(parseRetryAfterMs('2', 0)).toBe(2000);
    expect(parseRetryAfterMs('  30 ', 0)).toBe(30_000);
  });

  it('parses an HTTP-date relative to now', () => {
    const now = Date.parse('2026-07-19T00:00:00Z');
    const later = 'Sun, 19 Jul 2026 00:00:05 GMT';
    expect(parseRetryAfterMs(later, now)).toBe(5000);
  });

  it('clamps a past HTTP-date up to 0', () => {
    const now = Date.parse('2026-07-19T00:01:00Z');
    expect(parseRetryAfterMs('Sun, 19 Jul 2026 00:00:00 GMT', now)).toBe(0);
  });

  it('clamps a hostile value to the max', () => {
    expect(parseRetryAfterMs('999999', 0)).toBe(DRIVE_RETRY_AFTER_MAX_MS);
  });

  it('returns null for missing / unparseable headers', () => {
    expect(parseRetryAfterMs(null, 0)).toBeNull();
    expect(parseRetryAfterMs('', 0)).toBeNull();
    expect(parseRetryAfterMs('soon', 0)).toBeNull();
  });
});

describe('computeDriveRetryBackoffMs (exponential + full jitter)', () => {
  it('grows the ceiling exponentially per attempt', () => {
    const atCeiling = (attempt: number) => computeDriveRetryBackoffMs(attempt, () => 0.999999);
    const a1 = atCeiling(1);
    const a2 = atCeiling(2);
    const a3 = atCeiling(3);
    expect(a2).toBeGreaterThan(a1);
    expect(a3).toBeGreaterThan(a2);
    // Not a fixed constant: base 500 doubling → ~500, ~1000, ~2000 at the ceiling.
    expect(a1).toBeLessThan(600);
    expect(a3).toBeGreaterThan(1500);
  });

  it('is jittered — same attempt yields different delays for different rng draws', () => {
    const low = computeDriveRetryBackoffMs(3, () => 0.1);
    const high = computeDriveRetryBackoffMs(3, () => 0.9);
    expect(low).not.toBe(high);
    expect(high).toBeGreaterThan(low);
  });

  it('samples the full [0, ceiling) range (full jitter, not equal jitter)', () => {
    expect(computeDriveRetryBackoffMs(4, () => 0)).toBe(0);
  });
});

describe('computeDriveRetryWaitMs (Retry-After floor)', () => {
  it('waits at least the Retry-After header value', () => {
    // Small jitter draw would otherwise pick a sub-second backoff; the 2s header wins.
    const wait = computeDriveRetryWaitMs('2', 1, 0, () => 0.0);
    expect(wait).toBeGreaterThanOrEqual(2000);
  });

  it('falls back to jittered backoff when no Retry-After is present', () => {
    const wait = computeDriveRetryWaitMs(null, 2, 0, () => 0.5);
    expect(wait).toBe(computeDriveRetryBackoffMs(2, () => 0.5));
  });
});

describe('auto-pull rate floor (abuse-prevention regression guard)', () => {
  // A stray edit dropping the silent re-pull cadence into the seconds range would let a
  // visible tab hammer Drive. Keep the minimum interval at >= 1 minute.
  it('holds the silent re-pull minimum interval at >= 60s', () => {
    expect(LABS_DRIVE_AUTO_PULL_MIN_INTERVAL_MS).toBeGreaterThanOrEqual(60_000);
  });

  it('keeps the steady-state re-pull interval no shorter than its minimum', () => {
    expect(LABS_DRIVE_AUTO_PULL_INTERVAL_MS).toBeGreaterThanOrEqual(LABS_DRIVE_AUTO_PULL_MIN_INTERVAL_MS);
  });
});

describe('runWithDriveConcurrencyLimit (bounded global concurrency)', () => {
  it(`never runs more than DRIVE_MAX_CONCURRENT_REQUESTS (${DRIVE_MAX_CONCURRENT_REQUESTS}) at once`, async () => {
    const cap = DRIVE_MAX_CONCURRENT_REQUESTS;
    const total = cap + 8;
    let active = 0;
    let maxActive = 0;
    const gates: Array<() => void> = [];

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    const runs = Array.from({ length: total }, () =>
      runWithDriveConcurrencyLimit(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise<void>((resolve) => gates.push(resolve));
        active -= 1;
      }),
    );

    // Let every task that can acquire a slot start and park on its gate.
    await flush();
    expect(active).toBe(cap);
    expect(driveInFlightRequestCount()).toBe(cap);

    // Drain: releasing one gate frees a slot, letting a queued task start.
    while (gates.length > 0) {
      const release = gates.shift()!;
      release();
      await flush();
    }

    await Promise.all(runs);
    expect(maxActive).toBe(cap);
    expect(active).toBe(0);
    expect(driveInFlightRequestCount()).toBe(0);
  });
});
