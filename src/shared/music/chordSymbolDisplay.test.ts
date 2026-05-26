import { describe, expect, it } from 'vitest';
import { chordSymbolToRomanDisplay, formatChordForDisplay } from './chordSymbolDisplay';

describe('chordSymbolDisplay', () => {
  it('maps diatonic chords to roman numerals in C major', () => {
    expect(chordSymbolToRomanDisplay('C', 'C')).toBe('I');
    expect(chordSymbolToRomanDisplay('Am', 'C')).toBe('vi');
    expect(chordSymbolToRomanDisplay('G7', 'C')).toBe('V7');
    expect(chordSymbolToRomanDisplay('Fmaj7', 'C')).toBe('IVmaj7');
  });

  it('maps diatonic chords to roman numerals in F minor', () => {
    expect(chordSymbolToRomanDisplay('Fm', 'Fm')).toBe('i');
    expect(chordSymbolToRomanDisplay('Bb', 'Fm')).toBe('IV');
    expect(chordSymbolToRomanDisplay('Eb', 'Fm')).toBe('VII');
    expect(chordSymbolToRomanDisplay('Ab', 'Fm')).toBe('III');
    expect(chordSymbolToRomanDisplay('Cm', 'Fm')).toBe('v');
    expect(chordSymbolToRomanDisplay('C', 'Fm')).toBe('V');
    expect(chordSymbolToRomanDisplay('Bb7', 'Fm')).toBe('IV7');
    expect(chordSymbolToRomanDisplay('Fm7', 'Fm')).toBe('im7');
  });

  it('keeps letters when notation mode is letters', () => {
    expect(formatChordForDisplay('Am', 'C', 'letters')).toBe('Am');
    expect(formatChordForDisplay('Am', 'C', 'roman')).toBe('vi');
    expect(formatChordForDisplay('Bb', 'Fm', 'roman')).toBe('IV');
  });
});
