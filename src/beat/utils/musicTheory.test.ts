import { describe, it, expect } from 'vitest';
import { transposeKey, getInterval, areEnharmonic, NOTE_NAMES, NOTE_TO_INDEX } from './musicTheory';

describe('musicTheory', () => {
  describe('transposeKey', () => {
    it('should transpose up by semitones', () => {
      expect(transposeKey('C', 1)).toBe('C#');
      expect(transposeKey('C', 2)).toBe('D');
      expect(transposeKey('C', 3)).toBe('Eb');
      expect(transposeKey('C', 4)).toBe('E');
      expect(transposeKey('C', 5)).toBe('F');
      expect(transposeKey('C', 7)).toBe('G');
      expect(transposeKey('C', 12)).toBe('C'); // Octave
    });

    it('should transpose down by semitones', () => {
      expect(transposeKey('C', -1)).toBe('B');
      expect(transposeKey('C', -2)).toBe('Bb');
      expect(transposeKey('C', -3)).toBe('A');
      expect(transposeKey('C', -5)).toBe('G');
      expect(transposeKey('C', -12)).toBe('C'); // Octave
    });

    it('should handle transposition from sharp keys', () => {
      expect(transposeKey('F#', 1)).toBe('G');
      expect(transposeKey('C#', 2)).toBe('Eb');
      expect(transposeKey('G#', -1)).toBe('G');
    });

    it('should handle transposition from flat keys', () => {
      expect(transposeKey('Bb', 1)).toBe('B');
      expect(transposeKey('Eb', 2)).toBe('F');
      expect(transposeKey('Ab', -1)).toBe('G');
      expect(transposeKey('Db', 1)).toBe('D');
    });

    it('should handle common musical transpositions', () => {
      // Transpose F minor to G minor (up 2 semitones)
      expect(transposeKey('F', 2)).toBe('G');
      
      // Transpose from concert pitch to Bb instruments (down 2 semitones)
      expect(transposeKey('C', -2)).toBe('Bb');
      
      // Transpose from concert pitch to Eb instruments (down 3 semitones)
      expect(transposeKey('C', -3)).toBe('A');
    });

    it('should handle large transposition values', () => {
      expect(transposeKey('C', 13)).toBe('C#'); // More than an octave up
      expect(transposeKey('C', 24)).toBe('C');  // Two octaves
      expect(transposeKey('C', -13)).toBe('B'); // More than an octave down
      expect(transposeKey('C', -24)).toBe('C'); // Two octaves down
    });

    it('should return original key for unknown notes', () => {
      expect(transposeKey('X', 2)).toBe('X');
      expect(transposeKey('', 2)).toBe('');
      expect(transposeKey('Csharp', 1)).toBe('Csharp');
    });

    it('should handle enharmonic input equivalently', () => {
      // C# and Db should transpose to the same result
      expect(transposeKey('C#', 1)).toBe(transposeKey('Db', 1));
      expect(transposeKey('F#', 2)).toBe(transposeKey('Gb', 2));
      expect(transposeKey('G#', -1)).toBe(transposeKey('Ab', -1));
    });
  });

  describe('getInterval', () => {
    it('should return correct intervals', () => {
      expect(getInterval('C', 'C')).toBe(0);   // Unison
      expect(getInterval('C', 'C#')).toBe(1);  // Minor 2nd
      expect(getInterval('C', 'D')).toBe(2);   // Major 2nd
      expect(getInterval('C', 'E')).toBe(4);   // Major 3rd
      expect(getInterval('C', 'F')).toBe(5);   // Perfect 4th
      expect(getInterval('C', 'G')).toBe(7);   // Perfect 5th
      expect(getInterval('C', 'A')).toBe(9);   // Major 6th
      expect(getInterval('C', 'B')).toBe(11);  // Major 7th
    });

    it('should handle intervals from non-C roots', () => {
      expect(getInterval('G', 'D')).toBe(7);   // G to D is a perfect 5th
      expect(getInterval('F', 'C')).toBe(7);   // F to C is a perfect 5th
      expect(getInterval('A', 'E')).toBe(7);   // A to E is a perfect 5th
    });

    it('should return 0 for unknown notes', () => {
      expect(getInterval('X', 'C')).toBe(0);
      expect(getInterval('C', 'X')).toBe(0);
    });
  });

  describe('areEnharmonic', () => {
    it('should identify enharmonic equivalents', () => {
      expect(areEnharmonic('C#', 'Db')).toBe(true);
      expect(areEnharmonic('D#', 'Eb')).toBe(true);
      expect(areEnharmonic('F#', 'Gb')).toBe(true);
      expect(areEnharmonic('G#', 'Ab')).toBe(true);
      expect(areEnharmonic('A#', 'Bb')).toBe(true);
    });

    it('should return true for same note', () => {
      expect(areEnharmonic('C', 'C')).toBe(true);
      expect(areEnharmonic('F#', 'F#')).toBe(true);
    });

    it('should return false for non-enharmonic notes', () => {
      expect(areEnharmonic('C', 'D')).toBe(false);
      expect(areEnharmonic('F#', 'G')).toBe(false);
      expect(areEnharmonic('Bb', 'B')).toBe(false);
    });

    it('should return false for unknown notes', () => {
      expect(areEnharmonic('X', 'C')).toBe(false);
      expect(areEnharmonic('C', 'X')).toBe(false);
    });
  });

  describe('NOTE_NAMES', () => {
    it('should have 12 note names', () => {
      expect(NOTE_NAMES).toHaveLength(12);
    });

    it('should start with C', () => {
      expect(NOTE_NAMES[0]).toBe('C');
    });

    it('should use flats for black keys where conventional', () => {
      expect(NOTE_NAMES[3]).toBe('Eb');  // Not D#
      expect(NOTE_NAMES[8]).toBe('Ab');  // Not G#
      expect(NOTE_NAMES[10]).toBe('Bb'); // Not A#
    });
  });

  describe('NOTE_TO_INDEX', () => {
    it('should map all 12 chromatic notes', () => {
      expect(NOTE_TO_INDEX['C']).toBe(0);
      expect(NOTE_TO_INDEX['D']).toBe(2);
      expect(NOTE_TO_INDEX['E']).toBe(4);
      expect(NOTE_TO_INDEX['F']).toBe(5);
      expect(NOTE_TO_INDEX['G']).toBe(7);
      expect(NOTE_TO_INDEX['A']).toBe(9);
      expect(NOTE_TO_INDEX['B']).toBe(11);
    });

    it('should map both sharp and flat enharmonics', () => {
      expect(NOTE_TO_INDEX['C#']).toBe(NOTE_TO_INDEX['Db']);
      expect(NOTE_TO_INDEX['D#']).toBe(NOTE_TO_INDEX['Eb']);
      expect(NOTE_TO_INDEX['F#']).toBe(NOTE_TO_INDEX['Gb']);
      expect(NOTE_TO_INDEX['G#']).toBe(NOTE_TO_INDEX['Ab']);
      expect(NOTE_TO_INDEX['A#']).toBe(NOTE_TO_INDEX['Bb']);
    });
  });
});
