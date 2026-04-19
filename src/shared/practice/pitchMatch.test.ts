import { describe, it, expect } from 'vitest';
import { pitchClassDistance, deriveOctaveOffset } from './pitchMatch';

describe('pitchMatch', () => {
  describe('pitchClassDistance', () => {
    it('returns 0 for same pitch class in any octave', () => {
      expect(pitchClassDistance(60, 60)).toBe(0); // C4 and C4
      expect(pitchClassDistance(60, 72)).toBe(0); // C4 and C5
      expect(pitchClassDistance(60, 48)).toBe(0); // C4 and C3
    });

    it('returns the shorter modular distance (wrap-around)', () => {
      expect(pitchClassDistance(0, 1)).toBe(1); // C to C#
      expect(pitchClassDistance(0, 11)).toBe(1); // C to B (wrap)
      expect(pitchClassDistance(0, 6)).toBe(6); // tritone — max distance
    });

    it('is symmetric', () => {
      expect(pitchClassDistance(3, 9)).toBe(pitchClassDistance(9, 3));
      expect(pitchClassDistance(2, 11)).toBe(pitchClassDistance(11, 2));
    });

    it('handles negative inputs via modular normalization', () => {
      expect(pitchClassDistance(-1, 11)).toBe(0);
      expect(pitchClassDistance(-12, 0)).toBe(0);
    });
  });

  describe('deriveOctaveOffset', () => {
    it('returns null when no pitch class matches', () => {
      // Player hit C but expected D — no pitch-class match.
      expect(deriveOctaveOffset([60], [62])).toBeNull();
    });

    it('returns 0 when played matches expected exactly', () => {
      expect(deriveOctaveOffset([60, 64, 67], [60, 64, 67])).toBe(0);
    });

    it('detects a one-octave-up offset', () => {
      // Player played C5 E5 G5 but expected C4 E4 G4
      expect(deriveOctaveOffset([72, 76, 79], [60, 64, 67])).toBe(12);
    });

    it('detects a one-octave-down offset', () => {
      expect(deriveOctaveOffset([48, 52, 55], [60, 64, 67])).toBe(-12);
    });

    it('rounds near-octave averages to the nearest multiple of 12', () => {
      // Mixed: two notes one-octave-up, one note same-octave. Average (8) rounds to 12.
      expect(deriveOctaveOffset([72, 76, 67], [60, 64, 67])).toBe(12);
    });
  });
});
