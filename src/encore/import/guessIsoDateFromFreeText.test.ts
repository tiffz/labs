import { describe, expect, it } from 'vitest';
import { guessIsoDateFromFreeText } from './guessIsoDateFromFreeText';

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
