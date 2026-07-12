import { describe, expect, it } from 'vitest';

import { dateInputValueToIso, earliestPublishDateIso, isoToDateInputValue } from './publishDateUtils';

describe('publishDateUtils', () => {
  it('round-trips local calendar dates', () => {
    const iso = dateInputValueToIso('2024-03-15');
    expect(isoToDateInputValue(iso)).toBe('2024-03-15');
  });

  it('picks the earliest publish date', () => {
    expect(
      earliestPublishDateIso([
        { publishedAt: '2024-06-01T12:00:00.000Z' },
        { publishedAt: '2024-03-15T12:00:00.000Z' },
        { publishedAt: '2025-01-01T12:00:00.000Z' },
      ]),
    ).toBe('2024-03-15T12:00:00.000Z');
    expect(earliestPublishDateIso([])).toBeNull();
  });
});
