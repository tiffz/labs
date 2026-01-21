import { describe, it, expect } from 'vitest';
import {
  insertPatternAtPosition,
  replacePatternAtPosition,
  getPatternDuration,
  findMeasureBoundaries
} from './dragAndDrop';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import type { TimeSignature } from '../types';

describe('dragAndDrop', () => {
  const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };

  // Helper to allow tests to remain concise
  const insert = (not: string, pos: number, pat: string) => {
    const parsed = parseRhythm(not, timeSignature);
    return insertPatternAtPosition(not, pos, pat, parsed, timeSignature);
  };

  const replace = (not: string, pos: number, pat: string, dur: number) => {
    const parsed = parseRhythm(not, timeSignature);
    return replacePatternAtPosition(not, pos, pat, dur, timeSignature, parsed);
  };

  describe('insertPatternAtPosition', () => {
    it('should insert at the beginning of notation', () => {
      const result = insert('DKTK', 0, 'T');
      expect(result).toBe('TDKTK');
    });

    it('should insert at the end of notation', () => {
      const result = insert('DKTK', 4, 'T');
      expect(result).toBe('DKTKT');
    });

    it('should insert at a note boundary (between notes)', () => {
      const result = insert('DKTK', 2, 'S');
      expect(result).toBe('DKSTK');
    });

    it('should break a long note when inserting in the middle', () => {
      // D--- is a whole note (4 sixteenths), insert at position 2 (middle)
      const result = insert('D---', 2, 'T');
      // Should become D- (half note) + T + D- (half note)
      expect(result).toBe('D-TD-');
    });

    it('should break a long note at various positions', () => {
      // D--- is a whole note (4 sixteenths)
      // Insert at position 1: D (quarter rest of original) + T + D-- (3/4 of original)
      const result1 = insert('D---', 1, 'T');
      expect(result1).toBe('DTD--');

      // Insert at position 3: D-- (3/4 of original) + T + D (quarter rest)
      const result3 = insert('D---', 3, 'T');
      expect(result3).toBe('D--TD');
    });

    it('should break a rest when inserting in the middle', () => {
      // ____ is 4 sixteenth rests
      const result = insert('____', 2, 'D');
      expect(result).toBe('__D__');
    });

    it('should handle inserting a pattern (not just single note)', () => {
      // D--- is a whole note, insert pattern at position 2
      const result = insert('D---', 2, 'TK');
      expect(result).toBe('D-TKD-');
    });

    it('should handle complex notation with multiple notes', () => {
      // D-T- = half Dum + half Tak
      // Insert at position 3 (middle of Tak)
      const result = insert('D-T-', 3, 'K');
      // D- stays, T becomes split at position 1 of itself
      // T (1 sixteenth) + K + - (1 sixteenth -> becomes another T)
      expect(result).toBe('D-TKT');
    });
  });

  describe('replacePatternAtPosition', () => {
    it('should replace at the start of a note', () => {
      const result = replace('DKTK', 0, 'S', 1);
      expect(result.newNotation).toBe('SKTK');
      expect(result.replacedLength).toBe(1);
    });

    it('should break a note when replacing in the middle', () => {
      // D--- is 4 sixteenths, replace at position 2 with T (1 sixteenth)
      const result = replace('D---', 2, 'T', 1);
      // Original: D--- = 4 sixteenths at positions 0,1,2,3
      // Prefix: positions 0-1 = D- (2 sixteenths)
      // Pattern T replaces 1 sixteenth at position 2
      // Remaining: position 3 = D (1 sixteenth, just the note head)
      // Total: D- + T + D = 2 + 1 + 1 = 4 sixteenths (correct!)
      expect(result.newNotation).toBe('D-TD');
      expect(result.replacedStart).toBe(2);
    });

    it('should break a long tied note (16 sixteenths) when replacing in the middle', () => {
      // D--------------- is 16 sixteenths (whole note)
      // Replace at position 8 with K (1 sixteenth)
      const result = replace('D---------------', 8, 'K', 1);
      // Should become: D------- (8 sixteenths) + K (1) + D------ (7 sixteenths) = 16 total
      expect(result.newNotation).toBe('D-------KD------');
      expect(result.replacedStart).toBe(8);
      expect(result.newNotation.length).toBe(16); // Total chars should stay 16
    });

    it('should correctly break tied note at various positions', () => {
      // Test breaking at position 4 (1/4 through the note)
      const result4 = replace('D---------------', 4, 'K', 1);
      // D--- (4) + K (1) + D---------- (11) = 16
      expect(result4.newNotation).toBe('D---KD----------');
      expect(result4.newNotation.length).toBe(16);

      // Test breaking at position 12 (3/4 through the note)
      const result12 = replace('D---------------', 12, 'K', 1);
      // D----------- (12) + K (1) + D-- (3) = 16
      expect(result12.newNotation).toBe('D-----------KD--');
      expect(result12.newNotation.length).toBe(16);
    });

    it('should break note at measure boundary correctly', () => {
      // Test with notation spanning two measures (32 sixteenths in 4/4)
      // D------------------------------- = 32 sixteenths (2 measures)
      // Replace at position 16 (start of measure 2) with K
      const result = replace('D-------------------------------', 16, 'K', 1);
      // D--------------- (16) + K (1) + D-------------- (15) = 32
      expect(result.newNotation).toBe('D---------------KD--------------');
      expect(result.newNotation.length).toBe(32);
    });

    it('should correctly replace at the start of a note (boundary case)', () => {
      // D---T--- = Dum(4) + Tak(4) = 8 sixteenths
      // Replace at position 4 (start of Tak) with K (1 sixteenth)
      const result = replace('D---T---', 4, 'K', 1);
      // D--- (4) + K (1) + T-- (3) = 8
      // The Tak note should be properly broken, not just sliced
      expect(result.newNotation).toBe('D---KT--');
      expect(result.newNotation.length).toBe(8);
    });

    it('should correctly replace at position 0', () => {
      // Replace at the very start of notation
      const result = replace('D---T---', 0, 'K', 1);
      // K (1) + D-- (3) + T--- (4) = 8
      expect(result.newNotation).toBe('KD--T---');
      expect(result.newNotation.length).toBe(8);
    });

    it('should handle replacing entire note at boundary', () => {
      // D---T--- = 8 sixteenths
      // Replace at position 4 with K--- (4 sixteenths, same duration as Tak)
      const result = replace('D---T---', 4, 'K---', 4);
      // D--- (4) + K--- (4) = 8 (Tak is completely replaced)
      expect(result.newNotation).toBe('D---K---');
      expect(result.newNotation.length).toBe(8);
    });

    it('should handle replacing at the end (append)', () => {
      const result = replace('DK', 2, 'T', 1);
      expect(result.newNotation).toBe('DKT');
    });

    it('should insert pattern at exact position 16 (start of measure 2) in a 32-sixteenth tied note', () => {
      // Scenario: User has a tied whole note spanning 2 measures (32 sixteenths)
      // User clicks at the start of measure 2 (position 16)
      // Pattern should START at position 16, not END there
      const tiedNote = 'T-------------------------------'; // 32 sixteenths
      expect(tiedNote.length).toBe(32);

      // Insert a sixteenth Ka note at position 16
      const result = replace(tiedNote, 16, 'K', 1);

      // Expected: T--------------- (16) + K (1) + T-------------- (15) = 32
      expect(result.newNotation).toBe('T---------------KT--------------');
      expect(result.newNotation.length).toBe(32);

      // Verify K is at position 16 (the 17th character, 0-indexed as 16)
      expect(result.newNotation[16]).toBe('K');
    });

    it('should insert quarter note (4 sixteenths) at position 16 - pattern should START at 16, not END there', () => {
      // This tests the "longer patterns placed to END at insertion point" issue
      const tiedNote = 'T-------------------------------'; // 32 sixteenths

      // Insert a quarter note Ka at position 16
      const result = replace(tiedNote, 16, 'K---', 4);

      // Expected: T--------------- (16) + K--- (4) + T----------- (12) = 32
      expect(result.newNotation).toBe('T---------------K---T-----------');
      expect(result.newNotation.length).toBe(32);

      // Verify K is at position 16 (pattern STARTS at 16, not ENDS there)
      expect(result.newNotation[16]).toBe('K');
      expect(result.newNotation[17]).toBe('-');
      expect(result.newNotation[18]).toBe('-');
      expect(result.newNotation[19]).toBe('-');
      // Position 20 should be T (second part of tied note)
      expect(result.newNotation[20]).toBe('T');
    });

    it('should replace multiple notes with a longer pattern', () => {
      // Replace from position 0 with a pattern that spans 4 sixteenths
      const result = replace('DKTK', 0, 'S---', 4);
      expect(result.newNotation).toBe('S---');
    });
  });

  describe('getPatternDuration', () => {
    it('should calculate single note durations', () => {
      expect(getPatternDuration('D')).toBe(1);
      expect(getPatternDuration('D-')).toBe(2);
      expect(getPatternDuration('D---')).toBe(4);
    });

    it('should calculate pattern durations', () => {
      expect(getPatternDuration('DKTK')).toBe(4);
      expect(getPatternDuration('D-T-')).toBe(4);
      expect(getPatternDuration('D---T---')).toBe(8);
    });

    it('should handle rests', () => {
      expect(getPatternDuration('_')).toBe(1);
      expect(getPatternDuration('__')).toBe(2);
      expect(getPatternDuration('D_K_')).toBe(4);
    });
  });

  describe('findMeasureBoundaries', () => {
    it('should find boundaries in simple notation', () => {
      // In 4/4, one measure = 16 sixteenths
      // DKTKDKTKDKTKDKTK = 16 sixteenths = 1 complete measure
      const boundaries = findMeasureBoundaries('DKTKDKTKDKTKDKTK', timeSignature);
      expect(boundaries).toContain(0);
      expect(boundaries).toContain(16);
    });

    it('should handle multi-measure notation', () => {
      // 32 sixteenths = 2 measures in 4/4
      const notation = 'DKTKDKTKDKTKDKTK' + 'DKTKDKTKDKTKDKTK';
      const boundaries = findMeasureBoundaries(notation, timeSignature);
      expect(boundaries).toContain(0);
      expect(boundaries).toContain(16);
      expect(boundaries).toContain(32);
    });

    it('should handle notes spanning measure boundaries', () => {
      // D--------------- = whole note (16 sixteenths) = 1 measure
      // Two whole notes = 2 measures
      const notation = 'D---------------D---------------';
      const boundaries = findMeasureBoundaries(notation, timeSignature);
      expect(boundaries).toContain(0);
      expect(boundaries).toContain(16);
    });

    it('should work with shorter notation (incomplete measures)', () => {
      // 4 notes = only 4 sixteenths, not a full measure
      const boundaries = findMeasureBoundaries('DKTK', timeSignature);
      expect(boundaries).toEqual([0]); // Only the start, no complete measures
    });
  });

  describe('moveSelection (algorithm simulation)', () => {
    /**
     * Simulates the move selection algorithm from App.tsx
     * This tests the core logic independently of React
     */
    function simulateMoveSelection(
      notation: string,
      fromStart: number,
      fromEnd: number,
      toPosition: number
    ): string {
      const cleanNotation = notation.replace(/[\s\n]/g, '');
      const selectionLength = fromEnd - fromStart;
      const selectedPattern = cleanNotation.slice(fromStart, fromEnd);

      // Helper to heal orphaned dashes
      const healOrphanedDashes = (notationAfterRemoval: string): string => {
        if (fromStart < notationAfterRemoval.length && notationAfterRemoval[fromStart] === '-') {
          const removedStartChar = cleanNotation[fromStart];
          const soundCharMap: Record<string, string> = {
            'D': 'D', 'd': 'D', 'T': 'T', 't': 'T', 'K': 'K', 'k': 'K', 'S': 'S', 's': 'S'
          };
          const soundChar = soundCharMap[removedStartChar];
          if (soundChar) {
            return notationAfterRemoval.slice(0, fromStart) + soundChar + notationAfterRemoval.slice(fromStart + 1);
          }
        }
        return notationAfterRemoval;
      };

      let finalInsertPosition: number;

      if (toPosition <= fromStart) {
        // Moving BACKWARD
        let notationWithoutSelection = cleanNotation.slice(0, fromStart) + cleanNotation.slice(fromEnd);
        notationWithoutSelection = healOrphanedDashes(notationWithoutSelection);
        return insert(notationWithoutSelection, toPosition, selectedPattern);
      } else {
        // Moving FORWARD
        let notationWithoutSelection = cleanNotation.slice(0, fromStart) + cleanNotation.slice(fromEnd);
        notationWithoutSelection = healOrphanedDashes(notationWithoutSelection);

        if (toPosition >= fromEnd) {
          finalInsertPosition = toPosition - selectionLength;
        } else {
          finalInsertPosition = fromStart;
        }

        finalInsertPosition = Math.max(0, Math.min(finalInsertPosition, notationWithoutSelection.length));
        return insert(notationWithoutSelection, finalInsertPosition, selectedPattern);
      }
    }

    describe('moving backward', () => {
      it('should move a note from the end to the beginning', () => {
        // Original: DKTK, select T at position 2, move to position 0
        // D=0, K=1, T=2, K=3
        const result = simulateMoveSelection('DKTK', 2, 3, 0);
        expect(result).toBe('TDKK');
      });

      it('should move a note to the middle (backward)', () => {
        // Original: DKTK, select K at position 3, move to position 1
        const result = simulateMoveSelection('DKTK', 3, 4, 1);
        expect(result).toBe('DKKT');
      });

      it('should move a multi-char pattern backward', () => {
        // Original: DKT-K, select T- at positions 2-4, move to position 0
        const result = simulateMoveSelection('DKT-K', 2, 4, 0);
        expect(result).toBe('T-DKK');
      });
    });

    describe('moving forward', () => {
      it('should move a note from the beginning to the end', () => {
        // Original: DKTK, select D at position 0, move to position 4 (end)
        const result = simulateMoveSelection('DKTK', 0, 1, 4);
        // After removing D: KTK (3 chars)
        // toPosition 4 >= fromEnd 1, so finalPos = 4 - 1 = 3
        // Insert at position 3: KTK + D = KTKD
        expect(result).toBe('KTKD');
      });

      it('should move a note forward by one position', () => {
        // Original: DKTK, select D at position 0, move to position 2
        const result = simulateMoveSelection('DKTK', 0, 1, 2);
        // After removing D: KTK (3 chars)
        // toPosition 2 >= fromEnd 1, so finalPos = 2 - 1 = 1
        // Insert at position 1: K + D + TK = KDTK
        expect(result).toBe('KDTK');
      });

      it('should move a multi-char pattern forward', () => {
        // Original: D-KTK, select D- at positions 0-2, move to position 4
        const result = simulateMoveSelection('D-KTK', 0, 2, 4);
        // After removing D-: KTK (3 chars)
        // toPosition 4 >= fromEnd 2, so finalPos = 4 - 2 = 2
        // Insert at position 2: KT + D- + K = KTD-K
        expect(result).toBe('KTD-K');
      });

      it('should move to the very end', () => {
        // Original: DKTS, select D at position 0, move to position 4 (end)
        const result = simulateMoveSelection('DKTS', 0, 1, 4);
        // After removing D: KTS (3 chars)
        // finalPos = 4 - 1 = 3, insert at end
        expect(result).toBe('KTSD');
      });
    });

    describe('edge cases with tied notes', () => {
      it('should handle moving into a tied note (long note)', () => {
        // Original: DT---, select D at 0, move to position 3 (middle of T---)
        const result = simulateMoveSelection('DT---', 0, 1, 3);
        // After removing D: T--- (4 chars)
        // finalPos = 3 - 1 = 2 (inside the T--- note)
        // insertPatternAtPosition should break T--- at position 2
        // T- + D + T- = T-DT-
        expect(result).toBe('T-DT-');
      });

      it('should handle moving a tied note', () => {
        // Original: D---K, select D--- at 0-4, move to position 5 (end)
        const result = simulateMoveSelection('D---K', 0, 4, 5);
        // After removing D---: K (1 char)
        // finalPos = 5 - 4 = 1, insert at end
        expect(result).toBe('KD---');
      });

      it('should heal orphaned dashes when removing start of tied note', () => {
        // Original: D---K, select D at position 0 (just the D), move to position 5
        // This leaves --- which are orphaned
        const result = simulateMoveSelection('D---K', 0, 1, 5);
        // After removing D: ---K (4 chars), but --- becomes D-- (healed)
        // Wait, the healing logic uses cleanNotation[fromStart] = 'D', so it replaces - with D
        // Actually fromStart=0, notationAfterRemoval='---K', notationAfterRemoval[0]='-'
        // cleanNotation[fromStart=0]='D', so we replace with 'D'
        // Healed: D--K
        // finalPos = 5 - 1 = 4, insert at end
        expect(result).toBe('D--KD');
      });
    });

    describe('position boundary cases', () => {
      it('should handle moving to the exact end position', () => {
        const result = simulateMoveSelection('DKTK', 0, 1, 4);
        expect(result).toBe('KTKD');
      });

      it('should handle moving from middle to end', () => {
        const result = simulateMoveSelection('DKTKSR', 2, 4, 6);
        // Select TK at 2-4, move to position 6
        // After removal: DKSR (4 chars)
        // finalPos = 6 - 2 = 4, at end
        expect(result).toBe('DKSRTK');
      });

      it('should not duplicate notes', () => {
        // This test verifies the bug where notes were duplicated
        const result = simulateMoveSelection('DKTK', 1, 2, 3);
        // Select K at 1, move to position 3 (before last K)
        // After removal: DTK (3 chars)
        // finalPos = 3 - 1 = 2
        // Insert at position 2: DT + K + K = DTKK
        expect(result).toBe('DTKK');
        // Should NOT be DTKKK (duplicated)
        expect(result).not.toBe('DTKKK');
      });

      it('should handle adjacent swap (swap two adjacent notes)', () => {
        // Original: DK, select D at 0, move to position 2
        const result = simulateMoveSelection('DK', 0, 1, 2);
        // After removal: K
        // finalPos = 2 - 1 = 1, at end
        expect(result).toBe('KD');
      });
    });
  });
});

// Consolidated Mapping Tests (from debug files)
import { mapLogicalToStringIndex } from './dragAndDrop';

describe('Mapping Debug & Regressions', () => {
  const timeSignature: TimeSignature = { numerator: 4, denominator: 4, beatGrouping: [4, 4, 4, 4] };

  describe('Full String Mapping Debug', () => {
    const input = `T-K-K---S-----TK | % |x6 | DKTKD-DKTKD--DKSK-DKTDKTK| T-D---K-___TKT-D | DDKKT-ST-SSK-- | KDD--D__DD-----|: DKTKKTKTTKTKD--D:|x3`;

    it('should map M12 (Section Start) correctly', () => {
      const parsed = parseRhythm(input, timeSignature);
      // M0 (1) + M1 (1) + M2..M7 (6 repeats) = 8 measures.
      // M8, M9, M10, M11 (Linear).
      // M12 is Section Start.
      const mStart = 12 * 16;
      const map = mapLogicalToStringIndex(input, mStart, parsed, timeSignature);
      const charAtTarget = input[map.index];
      const context = input.slice(map.index, map.index + 10);

      expect(charAtTarget).toBe('D');
      expect(context).toContain('DKTK');
    });

    it('should map M13 (Ghost) back to M12 string index', () => {
      const parsed = parseRhythm(input, timeSignature);
      const mStart = 13 * 16;
      const map = mapLogicalToStringIndex(input, mStart, parsed, timeSignature);
      const charAtTarget = input[map.index];
      expect(charAtTarget).toBe('D');
    });
  });

  describe('Section Repeat Mapping', () => {
    const notation = 'D---D---D---D---|: T---T---T---T--- :|x3';

    it('should map logical position of Section Start correctly', () => {
      const parsed = parseRhythm(notation, timeSignature);
      // M0 takes 16 chars + header. M1 starts after M0.
      // M1 is "T...". Logical pos of M1 Start = 16.
      const map = mapLogicalToStringIndex(notation, 16, parsed, timeSignature);
      const charAtTarget = notation[map.index];
      expect(charAtTarget).toBe('T');
    });

    it('should map logical position of Ghost Measure correctly (M2)', () => {
      const parsed = parseRhythm(notation, timeSignature);
      // M2 is the first ghost of the section repeat.
      const m2Pos = 32;
      const map = mapLogicalToStringIndex(notation, m2Pos, parsed, timeSignature);
      const charAtTarget = notation[map.index];
      expect(charAtTarget).toBe('T');
    });
  });

  describe('Multi-Measure Repeat Editing Reproduction', () => {
    describe('Scenario 1: Simile Repeats (| % |xN)', () => {
      // Notation: M0(D...), M1(Simile of M0), M2(Ghost of M1)
      const notation = 'D---D---D---D---|%|x2';

      it('should map note selection in Simile measure to the % symbol', () => {
        const parsed = parseRhythm(notation, timeSignature);
        // User clicks 2nd beat (Tick 20) in M1 (Simile)
        const map = mapLogicalToStringIndex(notation, 20, parsed, timeSignature);
        const char = notation[map.index];
        expect(char).toBe('%');
      });
    });

    describe('Scenario 2: Section Repeats (|: A | B :|xN)', () => {
      const sectionNotation = '|: D--- | k--- :|x2';

      it('should map ghost edits back to source note correctly', () => {
        const parsed = parseRhythm(sectionNotation, timeSignature);
        // User clicks 'k' in M3 (Ghost of M1).
        // M0, M1 (Source). M2, M3 (Ghost).
        const targetTick = 48; // Start of M3
        const map = mapLogicalToStringIndex(sectionNotation, targetTick, parsed, timeSignature);
        expect(sectionNotation[map.index]).toBe('k');
      });
    });
  });
});
