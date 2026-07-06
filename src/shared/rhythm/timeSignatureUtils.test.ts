import { describe, expect, it } from 'vitest';
import {
  getBeatGroupingInSixteenths,
  getDefaultBeatGrouping,
  isAsymmetricTimeSignature,
  isCompoundTimeSignature,
} from './timeSignatureUtils';

describe('getDefaultBeatGrouping — /16', () => {
  it('treats compound /16 like /8: groups of 3 sixteenths', () => {
    expect(getDefaultBeatGrouping({ numerator: 6, denominator: 16 })).toEqual([3, 3]);
    expect(getDefaultBeatGrouping({ numerator: 9, denominator: 16 })).toEqual([3, 3, 3]);
    expect(getDefaultBeatGrouping({ numerator: 12, denominator: 16 })).toEqual([3, 3, 3, 3]);
  });

  it('uses asymmetric defaults in sixteenth units', () => {
    expect(getDefaultBeatGrouping({ numerator: 5, denominator: 16 })).toEqual([3, 2]);
    expect(getDefaultBeatGrouping({ numerator: 7, denominator: 16 })).toEqual([3, 2, 2]);
    expect(getDefaultBeatGrouping({ numerator: 11, denominator: 16 })).toEqual([3, 3, 3, 2]);
  });

  it('uses one sixteenth per beat for regular /16 (parallel to /4)', () => {
    expect(getDefaultBeatGrouping({ numerator: 4, denominator: 16 })).toEqual([1, 1, 1, 1]);
    expect(getDefaultBeatGrouping({ numerator: 8, denominator: 16 })).toEqual([
      1, 1, 1, 1, 1, 1, 1, 1,
    ]);
  });

  it('converts /16 groupings to sixteenths without scaling', () => {
    const ts = { numerator: 8, denominator: 16 as const };
    expect(getBeatGroupingInSixteenths(getDefaultBeatGrouping(ts), ts)).toEqual([
      1, 1, 1, 1, 1, 1, 1, 1,
    ]);
  });
});

describe('isCompoundTimeSignature — /16', () => {
  it('marks /16 numerators divisible by 3 as compound', () => {
    expect(isCompoundTimeSignature({ numerator: 6, denominator: 16 })).toBe(true);
    expect(isCompoundTimeSignature({ numerator: 8, denominator: 16 })).toBe(false);
  });
});

describe('isAsymmetricTimeSignature — /16', () => {
  it('still flags non-multiples-of-4 /16 meters', () => {
    expect(isAsymmetricTimeSignature({ numerator: 5, denominator: 16 })).toBe(true);
    expect(isAsymmetricTimeSignature({ numerator: 8, denominator: 16 })).toBe(false);
  });
});
