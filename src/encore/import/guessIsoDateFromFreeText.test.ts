import { describe, expect, it, vi } from 'vitest';
import {
  calendarDateFromIsoTimestamp,
  guessIsoDateFromFreeText,
} from './guessIsoDateFromFreeText';

describe('calendarDateFromIsoTimestamp', () => {
  it('returns the local-timezone calendar day, not the UTC slice', () => {
    // 2026-05-16T04:00:00Z is May 15 9pm in PDT (UTC-7). The naïve `.toISOString().slice(0,10)`
    // bug returned "2026-05-16" — the date the user is actually living in is "2026-05-15".
    const evening = '2026-05-16T04:00:00.000Z';
    const localYmd = (() => {
      const d = new Date(evening);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${da}`;
    })();
    expect(calendarDateFromIsoTimestamp(evening)).toBe(localYmd);
  });

  it('falls back to today when the input is missing or unparseable', () => {
    const today = (() => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${da}`;
    })();
    expect(calendarDateFromIsoTimestamp()).toBe(today);
    expect(calendarDateFromIsoTimestamp('   ')).toBe(today);
    expect(calendarDateFromIsoTimestamp('not-a-date')).toBe(today);
  });

  it('does not roll the date forward when called late in the user\'s local evening', () => {
    // Pin "now" to 2026-05-15 21:00 in the test runner's local timezone. Whichever zone CI is
    // in, the local calendar day stays May 15 — the bug we're guarding against would silently
    // hand back May 16 if `.toISOString().slice(0,10)` ever crept back in.
    vi.useFakeTimers();
    try {
      const localEvening = new Date(2026, 4, 15, 21, 0, 0, 0); // month is 0-indexed
      vi.setSystemTime(localEvening);
      expect(calendarDateFromIsoTimestamp()).toBe('2026-05-15');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('guessIsoDateFromFreeText', () => {
  it('parses ISO-like numeric dates in names', () => {
    expect(guessIsoDateFromFreeText('rec_2024-09-17_final.mov')).toBe('2024-09-17');
  });

  it('parses dotted or underscored YMD', () => {
    expect(guessIsoDateFromFreeText('x 2024.09.17 x')).toBe('2024-09-17');
    expect(guessIsoDateFromFreeText('x 2024_09_17 x')).toBe('2024-09-17');
  });

  it('parses compact YYYYMMDD when valid', () => {
    expect(guessIsoDateFromFreeText('show_20240917_final.mov')).toBe('2024-09-17');
    expect(guessIsoDateFromFreeText('20241399')).toBe(null);
  });

  it('parses “Sep 17, 2024” and “feb 8, 2024” style names', () => {
    expect(guessIsoDateFromFreeText('Sep 17, 2024 - Vampire - Bissap Baobab SF.MOV')).toBe('2024-09-17');
    expect(guessIsoDateFromFreeText('back to black - google - feb 8, 2024.mov')).toBe('2024-02-08');
    expect(guessIsoDateFromFreeText('Feb. 8, 2024 rehearsal.mov')).toBe('2024-02-08');
    expect(guessIsoDateFromFreeText('September 7, 2025 show.mov')).toBe('2025-09-07');
  });

  it('parses day-first month-name forms', () => {
    expect(guessIsoDateFromFreeText('8 Feb 2024 clip.mov')).toBe('2024-02-08');
    expect(guessIsoDateFromFreeText('8th of February 2024.mov')).toBe('2024-02-08');
  });

  it('rejects impossible dates', () => {
    expect(guessIsoDateFromFreeText('2024-02-31')).toBe(null);
  });
});
