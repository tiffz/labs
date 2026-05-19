import { describe, expect, it, vi, afterEach } from 'vitest';
import { formatLabsDriveInstant } from './formatLabsDriveInstant';

describe('formatLabsDriveInstant', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats today with local time', () => {
    vi.useFakeTimers();
    const now = new Date(2026, 4, 18, 14, 0, 0);
    vi.setSystemTime(now);
    const earlierToday = new Date(2026, 4, 18, 9, 6, 0).toISOString();
    const result = formatLabsDriveInstant(earlierToday);
    expect(result).toMatch(/^today,/);
  });

  it('formats yesterday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 18, 14, 0, 0));
    const yesterday = new Date(2026, 4, 17, 9, 0, 0).toISOString();
    const result = formatLabsDriveInstant(yesterday);
    expect(result).toMatch(/^yesterday,/);
  });

  it('returns the input when parsing fails', () => {
    expect(formatLabsDriveInstant('not-a-date')).toBe('not-a-date');
  });
});
