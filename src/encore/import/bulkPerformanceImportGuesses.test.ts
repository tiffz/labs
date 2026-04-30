import { describe, expect, it } from 'vitest';
import {
  calendarDateFromIsoTimestamp,
  guessDateFromImportText,
  performanceCalendarDateForBulkRow,
} from './bulkPerformanceImportGuesses';

describe('guessDateFromImportText', () => {
  it('parses ISO-like numeric dates in names', () => {
    expect(guessDateFromImportText('rec_2024-09-17_final.mov')).toBe('2024-09-17');
  });

  it('parses “Sep 17, 2024” style names', () => {
    expect(guessDateFromImportText('Sep 17, 2024 - Vampire - Bissap Baobab SF.MOV')).toBe('2024-09-17');
    expect(guessDateFromImportText('September 7, 2025 show.mov')).toBe('2025-09-07');
  });
});

describe('calendarDateFromIsoTimestamp', () => {
  it('uses local calendar day, not UTC slice', () => {
    const d = new Date('2024-09-18T07:00:00.000Z');
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    expect(calendarDateFromIsoTimestamp('2024-09-18T07:00:00.000Z')).toBe(`${y}-${m}-${day}`);
  });
});

describe('performanceCalendarDateForBulkRow', () => {
  it('prefers filename guess over Drive timestamps', () => {
    expect(
      performanceCalendarDateForBulkRow({
        fileName: 'Sep 17, 2024 - Vampire.MOV',
        matchHaystack: '',
        driveCreatedTime: '2024-09-20T12:00:00.000Z',
        driveModifiedTime: '2025-01-01T12:00:00.000Z',
      }),
    ).toBe('2024-09-17');
  });

  it('falls back to created then modified', () => {
    const onlyCreated = performanceCalendarDateForBulkRow({
        fileName: 'no-date-here',
        matchHaystack: '',
        driveCreatedTime: '2024-03-10T15:30:00.000Z',
        driveModifiedTime: '2024-04-01T15:30:00.000Z',
      });
    expect(onlyCreated).toBe(calendarDateFromIsoTimestamp('2024-03-10T15:30:00.000Z'));
  });
});
