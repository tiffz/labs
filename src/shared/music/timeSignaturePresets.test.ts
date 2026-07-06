import { describe, expect, it } from 'vitest';
import {
  COMMON_TIME_SIGNATURE_PRESETS,
  formatTimeSignatureDisplay,
  normalizeTimeSignature,
  timeSignaturesEqual,
} from './timeSignaturePresets';

describe('timeSignaturePresets', () => {
  it('defaults invalid rows to 4/4', () => {
    expect(normalizeTimeSignature(undefined)).toEqual({ numerator: 4, denominator: 4 });
    expect(normalizeTimeSignature({ numerator: 0, denominator: 99 })).toEqual({
      numerator: 4,
      denominator: 4,
    });
  });

  it('preserves asymmetric beat groupings', () => {
    expect(normalizeTimeSignature({ numerator: 7, denominator: 8, beatGrouping: [3, 2, 2] })).toEqual({
      numerator: 7,
      denominator: 8,
      beatGrouping: [3, 2, 2],
    });
  });

  it('formats display labels with spaced slash', () => {
    expect(formatTimeSignatureDisplay({ numerator: 6, denominator: 8 })).toBe('6 / 8');
  });

  it('matches preset meters including grouping', () => {
    const sevenEight = COMMON_TIME_SIGNATURE_PRESETS.find((preset) => preset.label === '7/8')!.timeSignature;
    expect(timeSignaturesEqual(sevenEight, { numerator: 7, denominator: 8, beatGrouping: [3, 2, 2] })).toBe(true);
    expect(timeSignaturesEqual(sevenEight, { numerator: 7, denominator: 8, beatGrouping: [2, 2, 3] })).toBe(false);
  });
});
