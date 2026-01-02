import { describe, it, expect } from 'vitest';
import { progressionToChords } from './chordTheory';
import type { RomanNumeral } from '../types';

describe('chordTheory', () => {
  it('should convert I-IV-V progression to chords in C major', () => {
    const progression: RomanNumeral[] = ['I', 'IV', 'V'];
    const key = 'C';

    const chords = progressionToChords(progression, key);

    expect(chords).toHaveLength(3);
    expect(chords[0].root).toBe('C');
    expect(chords[1].root).toBe('F');
    expect(chords[2].root).toBe('G');
  });

  it('should convert vi-V-IV-V progression to chords', () => {
    const progression: RomanNumeral[] = ['vi', 'V', 'IV', 'V'];
    const key = 'C';

    const chords = progressionToChords(progression, key);

    expect(chords).toHaveLength(4);
    expect(chords[0].quality).toBe('minor'); // vi is minor
    expect(chords[1].quality).toBe('major'); // V is major
    expect(chords[2].quality).toBe('major'); // IV is major
    expect(chords[3].quality).toBe('major'); // V is major
  });

  it('should handle different keys correctly', () => {
    const progression: RomanNumeral[] = ['I', 'IV', 'V'];
    
    const chordsC = progressionToChords(progression, 'C');
    const chordsG = progressionToChords(progression, 'G');

    expect(chordsC[0].root).toBe('C');
    expect(chordsG[0].root).toBe('G');
  });
});

