import { describe, it, expect } from 'vitest';
import { generateStyledChordNotes } from './chordStyling';
import type { Chord } from '../types';
import type { TimeSignature } from '../types';

describe('chordStyling', () => {
  const createMockChord = (): Chord => ({
    root: 0, // C
    quality: 'major',
    notes: [60, 64, 67], // C, E, G
  });

  const createMockVoicing = () => [60, 64, 67]; // C major chord

  it('should generate styled chord notes for 4/4 time', () => {
    const chord = createMockChord();
    const trebleVoicing = createMockVoicing();
    const bassVoicing = [48]; // C
    const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };

    const result = generateStyledChordNotes(
      chord,
      trebleVoicing,
      bassVoicing,
      'simple',
      timeSignature
    );

    expect(result).toBeDefined();
    expect(result.trebleNotes.length).toBeGreaterThan(0);
    expect(result.bassNotes.length).toBeGreaterThan(0);
  });

  it('should generate styled chord notes for 3/4 time', () => {
    const chord = createMockChord();
    const trebleVoicing = createMockVoicing();
    const bassVoicing = [48];
    const timeSignature: TimeSignature = { numerator: 3, denominator: 4 };

    const result = generateStyledChordNotes(
      chord,
      trebleVoicing,
      bassVoicing,
      'simple',
      timeSignature
    );

    expect(result).toBeDefined();
    expect(result.trebleNotes.length).toBeGreaterThan(0);
    expect(result.bassNotes.length).toBeGreaterThan(0);
  });

  it('should generate styled chord notes for waltz pattern', () => {
    const chord = createMockChord();
    const trebleVoicing = createMockVoicing();
    const bassVoicing = [48];
    const timeSignature: TimeSignature = { numerator: 3, denominator: 4 };

    const result = generateStyledChordNotes(
      chord,
      trebleVoicing,
      bassVoicing,
      'waltz',
      timeSignature
    );

    expect(result).toBeDefined();
    expect(result.trebleNotes.length).toBeGreaterThan(0);
    expect(result.bassNotes.length).toBeGreaterThan(0);
    
    // Waltz should have rest at start of treble
    expect(result.trebleNotes[0].notes.length).toBe(0); // First should be rest
  });

  it('should handle different styling strategies', () => {
    const chord = createMockChord();
    const trebleVoicing = createMockVoicing();
    const bassVoicing = [48];
    const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };

    const strategies: Array<'simple' | 'one-per-beat' | 'oom-pahs' | 'waltz'> = [
      'simple',
      'one-per-beat',
      'oom-pahs',
    ];

    strategies.forEach(strategy => {
      const result = generateStyledChordNotes(
        chord,
        trebleVoicing,
        bassVoicing,
        strategy,
        timeSignature
      );

      expect(result).toBeDefined();
      expect(result.trebleNotes.length).toBeGreaterThan(0);
      expect(result.bassNotes.length).toBeGreaterThan(0);
    });
  });
});

