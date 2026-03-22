import { describe, expect, it } from 'vitest';
import {
  buildSectionChordSymbols,
  computeCompletionPadMeasures,
} from './chordProgressionCompletion';

describe('chord progression completion helpers', () => {
  it('pads measures so sections end on the last chord of the cycle', () => {
    expect(computeCompletionPadMeasures(6, 4)).toBe(2);
    const completed = 6 + computeCompletionPadMeasures(6, 4);
    expect(completed).toBe(8);
    const symbols = buildSectionChordSymbols(['F', 'G', 'C', 'Am'], completed);
    expect(symbols).toEqual(['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'Am']);
    expect(symbols[symbols.length - 1]).toBe('Am');
  });

  it('does not add completion padding when section already aligns', () => {
    expect(computeCompletionPadMeasures(8, 4)).toBe(0);
    expect(computeCompletionPadMeasures(4, 1)).toBe(0);
    expect(computeCompletionPadMeasures(0, 4)).toBe(0);
  });

  it('holds the last completed chord for trailing synthetic measures', () => {
    const symbols = buildSectionChordSymbols(['C', 'G', 'Am', 'F'], 8, 9);
    expect(symbols).toEqual(['C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F', 'F']);
  });
});
