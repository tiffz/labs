// @vitest-environment node
/**
 * Why this exists: the owner reports Stanza "regularly crashes", and her crash log holds four
 * entries. That is not a contradiction — a tab killed for memory has no JavaScript left to record
 * why, so the log is blind to exactly that failure. These tests pin the two properties that make
 * the warning useful: it fires before the kill, and it does not flood the 50-entry log.
 */
import { describe, expect, it } from 'vitest';
import {
  LABS_HEAP_REWARN_STEP,
  LABS_HEAP_WARN_RATIO,
  formatHeapPressureMessage,
  readLabsHeapSample,
  shouldReportHeapPressure,
} from './labsHeapPressure';

const MB = 1024 * 1024;
const perfWith = (usedMb: number, limitMb: number) =>
  ({
    memory: {
      usedJSHeapSize: usedMb * MB,
      totalJSHeapSize: usedMb * MB,
      jsHeapSizeLimit: limitMb * MB,
    },
  }) as unknown as Performance;

describe('readLabsHeapSample', () => {
  it('reads Chrome heap counters', () => {
    const s = readLabsHeapSample(perfWith(1400, 2000));
    expect(s?.ratio).toBeCloseTo(0.7, 5);
    expect(s?.usedBytes).toBe(1400 * MB);
  });

  it('returns null where performance.memory does not exist, rather than guessing', () => {
    expect(readLabsHeapSample(undefined)).toBeNull();
    expect(readLabsHeapSample({} as Performance)).toBeNull();
    expect(readLabsHeapSample({ memory: {} } as unknown as Performance)).toBeNull();
  });

  it('rejects nonsense counters instead of dividing by zero', () => {
    expect(
      readLabsHeapSample({
        memory: { usedJSHeapSize: 10, totalJSHeapSize: 10, jsHeapSizeLimit: 0 },
      } as unknown as Performance),
    ).toBeNull();
  });
});

describe('shouldReportHeapPressure', () => {
  const at = (ratio: number) => ({ usedBytes: ratio * 1000, limitBytes: 1000, ratio });

  it('stays quiet below the warning threshold', () => {
    expect(shouldReportHeapPressure(at(LABS_HEAP_WARN_RATIO - 0.01), null)).toBe(false);
  });

  it('reports the first crossing — the point of the whole thing is to write before the kill', () => {
    expect(shouldReportHeapPressure(at(LABS_HEAP_WARN_RATIO), null)).toBe(true);
  });

  it('does not re-report small wobbles around the same level', () => {
    const first = LABS_HEAP_WARN_RATIO;
    expect(shouldReportHeapPressure(at(first + 0.01), first)).toBe(false);
  });

  it('re-reports once it has climbed a further step — that is the leak signal', () => {
    const first = LABS_HEAP_WARN_RATIO;
    expect(shouldReportHeapPressure(at(first + LABS_HEAP_REWARN_STEP), first)).toBe(true);
  });

  it('reports nothing when there is no sample', () => {
    expect(shouldReportHeapPressure(null, null)).toBe(false);
  });
});

describe('formatHeapPressureMessage', () => {
  it('is readable without a heap dump', () => {
    const msg = formatHeapPressureMessage({ usedBytes: 1400 * MB, limitBytes: 2000 * MB, ratio: 0.7 });
    expect(msg).toContain('1400MB');
    expect(msg).toContain('2000MB');
    expect(msg).toContain('70%');
    expect(msg).toMatch(/out-of-memory/i);
  });
});
