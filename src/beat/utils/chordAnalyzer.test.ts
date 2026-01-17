/**
 * Chord Analyzer Unit Tests
 *
 * Contains utility functions for testing chord/key detection.
 * Actual test cases are defined in public/.hidden/test-config.json
 * to avoid committing copyrighted content references.
 *
 * Run test runner: npx tsx src/beat/tests/chordAnalysisRunner.ts public/.hidden/test-config.json
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Check if two keys match (accounting for enharmonic equivalents)
 */
export function keysMatch(detected: string, expected: string): boolean {
  const enharmonics: Record<string, string> = {
    'C#': 'Db', 'Db': 'C#',
    'D#': 'Eb', 'Eb': 'D#',
    'F#': 'Gb', 'Gb': 'F#',
    'G#': 'Ab', 'Ab': 'G#',
    'A#': 'Bb', 'Bb': 'A#',
  };

  if (detected === expected) return true;
  return enharmonics[detected] === expected || enharmonics[expected] === detected;
}

/**
 * Check if the detected key is the relative major/minor of expected
 */
export function isRelativeKey(
  detected: { key: string; scale: string },
  expected: { key: string; scale: string }
): boolean {
  const noteToSemitone: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
  };

  const detectedSemi = noteToSemitone[detected.key];
  const expectedSemi = noteToSemitone[expected.key];

  if (detectedSemi === undefined || expectedSemi === undefined) return false;

  // Relative major is 3 semitones above minor
  if (expected.scale === 'minor' && detected.scale === 'major') {
    return (expectedSemi + 3) % 12 === detectedSemi;
  }
  // Relative minor is 3 semitones below major (or 9 above)
  if (expected.scale === 'major' && detected.scale === 'minor') {
    return (expectedSemi + 9) % 12 === detectedSemi;
  }

  return false;
}

/**
 * Simplify a chord name by removing extensions
 */
export function simplifyChord(chord: string): string {
  return chord
    .replace(/maj7.*$/, '')
    .replace(/min7.*$/, 'm')
    .replace(/7.*$/, '')
    .replace(/sus\d?$/, '')
    .replace(/add\d+$/, '')
    .replace(/\(.*\)$/, '')
    .replace(/6$/, '')
    .replace(/9$/, '')
    .replace(/11$/, '')
    .replace(/13$/, '');
}

/**
 * Calculate overlap between detected and expected chord lists
 */
export function chordsOverlap(detected: string[], expected: string[]): number {
  const simplifiedDetected = new Set(detected.map(simplifyChord));
  let matches = 0;

  for (const chord of expected) {
    const simplified = simplifyChord(chord);
    if (simplifiedDetected.has(simplified)) {
      matches++;
    }
  }

  return expected.length > 0 ? matches / expected.length : 0;
}

/**
 * Check if BPM is within tolerance
 */
export function bpmWithinTolerance(
  detected: number,
  expected: number,
  tolerance: number
): boolean {
  return Math.abs(detected - expected) <= tolerance;
}

/**
 * Check if BPM is an octave of expected (half or double time)
 */
export function isOctaveBpm(detected: number, expected: number): boolean {
  const ratio = detected / expected;
  return Math.abs(ratio - 0.5) < 0.05 || Math.abs(ratio - 2) < 0.05;
}

// ============================================================================
// Unit Tests for Utilities
// ============================================================================

describe('Chord Analysis Utilities', () => {
  describe('keysMatch', () => {
    it('should match identical keys', () => {
      expect(keysMatch('C', 'C')).toBe(true);
      expect(keysMatch('F', 'F')).toBe(true);
    });

    it('should match enharmonic equivalents', () => {
      expect(keysMatch('C#', 'Db')).toBe(true);
      expect(keysMatch('Db', 'C#')).toBe(true);
      expect(keysMatch('Ab', 'G#')).toBe(true);
      expect(keysMatch('Bb', 'A#')).toBe(true);
    });

    it('should not match different keys', () => {
      expect(keysMatch('C', 'D')).toBe(false);
      expect(keysMatch('F', 'G')).toBe(false);
    });
  });

  describe('isRelativeKey', () => {
    it('should identify relative major/minor pairs', () => {
      // F minor's relative major is Ab major
      expect(isRelativeKey({ key: 'Ab', scale: 'major' }, { key: 'F', scale: 'minor' })).toBe(true);
      // A minor's relative major is C major
      expect(isRelativeKey({ key: 'C', scale: 'major' }, { key: 'A', scale: 'minor' })).toBe(true);
      // D minor's relative major is F major
      expect(isRelativeKey({ key: 'F', scale: 'major' }, { key: 'D', scale: 'minor' })).toBe(true);
    });

    it('should not match non-relative keys', () => {
      expect(isRelativeKey({ key: 'C', scale: 'major' }, { key: 'F', scale: 'minor' })).toBe(false);
      expect(isRelativeKey({ key: 'G', scale: 'major' }, { key: 'A', scale: 'minor' })).toBe(false);
    });
  });

  describe('simplifyChord', () => {
    it('should remove 7th extensions', () => {
      expect(simplifyChord('Cmaj7')).toBe('C');
      expect(simplifyChord('Dm7')).toBe('Dm');
      expect(simplifyChord('G7')).toBe('G');
    });

    it('should remove sus extensions', () => {
      expect(simplifyChord('Dsus4')).toBe('D');
      expect(simplifyChord('Asus2')).toBe('A');
      expect(simplifyChord('Bbsus')).toBe('Bb');
    });

    it('should handle complex extensions', () => {
      expect(simplifyChord('Dbmaj7(no3rd)')).toBe('Db');
      expect(simplifyChord('Ebsus2')).toBe('Eb');
    });
  });

  describe('chordsOverlap', () => {
    it('should calculate correct overlap', () => {
      const detected = ['Fm', 'Db', 'Eb', 'Bb'];
      const expected = ['Fm', 'Db', 'Eb', 'Bbm'];
      // 3 out of 4 match (Bb vs Bbm is different)
      expect(chordsOverlap(detected, expected)).toBeCloseTo(0.75);
    });

    it('should return 1.0 for perfect match', () => {
      const chords = ['Fm', 'Ab', 'Eb'];
      expect(chordsOverlap(chords, chords)).toBe(1.0);
    });

    it('should return 0 for no match', () => {
      expect(chordsOverlap(['C', 'G', 'Am'], ['Fm', 'Bb', 'Eb'])).toBe(0);
    });
  });

  describe('bpmWithinTolerance', () => {
    it('should accept BPM within tolerance', () => {
      expect(bpmWithinTolerance(138, 137, 2)).toBe(true);
      expect(bpmWithinTolerance(136, 137, 2)).toBe(true);
    });

    it('should reject BPM outside tolerance', () => {
      expect(bpmWithinTolerance(140, 137, 2)).toBe(false);
      expect(bpmWithinTolerance(134, 137, 2)).toBe(false);
    });
  });

  describe('isOctaveBpm', () => {
    it('should identify half-time', () => {
      expect(isOctaveBpm(68, 137)).toBe(true);
      expect(isOctaveBpm(69, 137)).toBe(true);
    });

    it('should identify double-time', () => {
      expect(isOctaveBpm(274, 137)).toBe(true);
    });

    it('should not match non-octave BPMs', () => {
      expect(isOctaveBpm(100, 137)).toBe(false);
      expect(isOctaveBpm(137, 137)).toBe(false);
    });
  });
});

// ============================================================================
// Key Detection Tests - bVI Relationship
// ============================================================================

describe('Key Detection - bVI Relationship', () => {
  /**
   * The bVI chord is the major chord built on the lowered 6th scale degree.
   * In minor keys, bVI is extremely common and often more prominent than the tonic.
   * 
   * Examples:
   * - F minor: bVI = Db major (very common in "Let It Go")
   * - A minor: bVI = F major
   * - D minor: bVI = Bb major
   * 
   * The key detection should recognize when a detected major key might actually
   * be the bVI of a minor key.
   */

  /**
   * Calculate the bVI relationship: bVI is 8 semitones above (or 4 below) the minor tonic
   * Or equivalently: the minor key is 4 semitones above the bVI
   */
  function getMinorKeyFromBVI(majorKey: string): string {
    const noteToSemitone: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
      'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
    };
    const semitoneToNote = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    
    const majorSemitone = noteToSemitone[majorKey];
    if (majorSemitone === undefined) return '';
    
    // Minor key is 4 semitones above bVI
    const minorSemitone = (majorSemitone + 4) % 12;
    return semitoneToNote[minorSemitone];
  }

  it('should correctly identify bVI to minor key relationships', () => {
    // Db major is bVI of F minor
    expect(getMinorKeyFromBVI('Db')).toBe('F');
    
    // F major is bVI of A minor
    expect(getMinorKeyFromBVI('F')).toBe('A');
    
    // Bb major is bVI of D minor
    expect(getMinorKeyFromBVI('Bb')).toBe('D');
    
    // Ab major is bVI of C minor
    expect(getMinorKeyFromBVI('Ab')).toBe('C');
    
    // Eb major is bVI of G minor
    expect(getMinorKeyFromBVI('Eb')).toBe('G');
  });

  it('should understand Let It Go key relationships', () => {
    // Let It Go is in F minor
    // The bVI chord (Db) is very prominent in the song
    // Key detection might initially detect Db major but should prefer F minor
    
    const detectedMajor = 'Db';
    const expectedMinor = 'F';
    
    expect(getMinorKeyFromBVI(detectedMajor)).toBe(expectedMinor);
  });
});
