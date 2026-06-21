import { describe, expect, it } from 'vitest';
import {
  encoreDateInRange,
  encoreDateRangeFromCalendarYear,
  encoreDateRangeFromFilterRecord,
  encoreDateRangeToFilterRecord,
  isEncoreDateRangeActive,
} from './encoreDateRangeFilter';

describe('encoreDateRangeFilter', () => {
  it('encoreDateInRange respects inclusive after/before bounds', () => {
    expect(encoreDateInRange('2026-01-15T12:00:00.000Z', { after: '2026-01-01' })).toBe(true);
    expect(encoreDateInRange('2025-12-31', { after: '2026-01-01' })).toBe(false);
    expect(encoreDateInRange('2026-06-01', { before: '2026-05-31' })).toBe(false);
    expect(encoreDateInRange('2026-03-10', { after: '2026-01-01', before: '2026-12-31' })).toBe(true);
  });

  it('round-trips filter record keys', () => {
    const range = { after: '2025-06-01', before: '2025-12-31' };
    const stored = encoreDateRangeToFilterRecord('perfDate', range);
    expect(encoreDateRangeFromFilterRecord(stored, 'perfDate')).toEqual(range);
    expect(isEncoreDateRangeActive(encoreDateRangeFromFilterRecord({}, 'perfDate'))).toBe(false);
  });

  it('converts calendar year to full-year range', () => {
    expect(encoreDateRangeFromCalendarYear('2024')).toEqual({
      after: '2024-01-01',
      before: '2024-12-31',
    });
  });
});
