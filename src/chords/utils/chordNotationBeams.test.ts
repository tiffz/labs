import { describe, expect, it } from 'vitest';
import { Fraction } from 'vexflow';
import { getChordBeamGroups } from './chordNotationBeams';

describe('chordNotationBeams', () => {
  it('beams compound meters in groups of three', () => {
    expect(getChordBeamGroups({ numerator: 12, denominator: 8 })).toEqual([
      new Fraction(3, 8),
    ]);
    expect(getChordBeamGroups({ numerator: 6, denominator: 8 })).toEqual([
      new Fraction(3, 8),
    ]);
  });

  it('beams simple meters by beat value', () => {
    expect(getChordBeamGroups({ numerator: 4, denominator: 4 })).toEqual([
      new Fraction(1, 4),
    ]);
  });
});
