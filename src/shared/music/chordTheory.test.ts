import { describe, expect, it } from 'vitest';
import { progressionToChords, romanNumeralToChord } from './chordTheory';
import type { RomanNumeral } from './chordTypes';

describe('shared chordTheory', () => {
  it('converts common progression in major mode', () => {
    const progression: RomanNumeral[] = ['I', 'V', 'vi', 'IV'];
    const chords = progressionToChords(progression, 'C');
    expect(chords.map((chord) => chord.root)).toEqual(['C', 'G', 'A', 'F']);
    expect(chords.map((chord) => chord.quality)).toEqual([
      'major',
      'major',
      'minor',
      'major',
    ]);
  });

  it('supports explicit harmonic mode for minor mapping', () => {
    const iChord = romanNumeralToChord('i', 'A', 'minor');
    const ivChord = romanNumeralToChord('iv', 'A', 'minor');
    expect(iChord.root).toBe('A');
    expect(ivChord.root).toBe('D');
    expect(iChord.quality).toBe('minor');
  });

  it('spells diatonic roots for flat keys with flats', () => {
    const progression: RomanNumeral[] = ['I', 'IV', 'V'];
    const chords = progressionToChords(progression, 'Ab');
    expect(chords.map((chord) => chord.root)).toEqual(['Ab', 'Db', 'Eb']);
  });
});
