import { describe, it, expect } from 'vitest';
import { pitchClassDistance, deriveOctaveOffset, deriveOctaveOffsetForHand } from './pitchMatch';

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

  describe('deriveOctaveOffsetForHand', () => {
    it('returns null when no pitch class matches', () => {
      expect(deriveOctaveOffsetForHand([60], [62], 'highest')).toBeNull();
      expect(deriveOctaveOffsetForHand([60], [62], 'lowest')).toBeNull();
    });

    it('picks the highest pitch-class match for the right hand', () => {
      // Player holds C3, C4, and C5 (MIDI 48/60/72); expected is C4.
      // RH should anchor to C5 → +12 offset.
      expect(deriveOctaveOffsetForHand([48, 60, 72], [60], 'highest')).toBe(12);
    });

    it('picks the lowest pitch-class match for the left hand', () => {
      // Same hand, expected is C3. LH should anchor to C3 → 0 offset
      // (choosing the lowest MIDI C available).
      expect(deriveOctaveOffsetForHand([48, 60, 72], [48], 'lowest')).toBe(0);
    });

    it('lets both hands pick distinct octaves from the same played bag', () => {
      // Both hands expect a G; RH scored written G4 (67), LH written G3 (55).
      // Player actually plays G4 (67) + G2 (43) — RH in place, LH two
      // octaves low. RH should anchor to 67 → 0; LH should anchor to 43 → -12.
      const played = [67, 43];
      expect(deriveOctaveOffsetForHand(played, [67], 'highest')).toBe(0);
      expect(deriveOctaveOffsetForHand(played, [55], 'lowest')).toBe(-12);
    });

    // Regression: 2-octave scale grading reuses the same anchoring machinery
    // as 1-octave. The anchor is picked on the FIRST note of each hand,
    // which is always the bottom of the LH pattern and a reasonable note
    // for the RH pattern. After anchoring, the stored offset is reused
    // verbatim for the remaining notes — including notes an octave above
    // the anchor (e.g. the C5 midpoint of a 2-octave C3-C5 LH scale).
    it('anchors on the first note of a 2-octave LH pattern', () => {
      // LH scored to ascend C3 → C4 → C5 (start-MIDI 48). First expected
      // LH note is C3 (48). Player plays C3 exactly → offset 0, and all
      // subsequent LH expected pitches (C4, C5) are taken verbatim.
      expect(deriveOctaveOffsetForHand([48], [48], 'lowest')).toBe(0);
      expect(deriveOctaveOffsetForHand([36], [48], 'lowest')).toBe(-12);
    });

    it('anchors on the first note of a 2-octave RH pattern', () => {
      // RH scored to ascend C4 → C5 → C6 (start-MIDI 60). First expected
      // RH note is C4. Player plays C4 + C6 simultaneously (shouldn't
      // really happen, but RH picks highest of any pitch-class match)
      // → C6 anchors offset +24 for the whole run.
      expect(deriveOctaveOffsetForHand([60, 84], [60], 'highest')).toBe(24);
    });
  });
});
