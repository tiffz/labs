import { describe, it, expect } from 'vitest';
import { findDropTarget, calculateExactCharPosition, type NotePosition } from './dropTargetFinder';

describe('dropTargetFinder', () => {
  describe('calculateExactCharPosition', () => {
    it('should return charPosition when cursor is at note start', () => {
      const notePos: NotePosition = {
        measureIndex: 0, noteIndex: 0, charPosition: 8,
        x: 100, y: 60, width: 80, height: 20, durationInSixteenths: 16, staveY: 40
      };
      
      const result = calculateExactCharPosition(100, notePos);
      expect(result).toBe(8); // At start of note
    });

    it('should return charPosition + duration when cursor is at note end', () => {
      const notePos: NotePosition = {
        measureIndex: 0, noteIndex: 0, charPosition: 8,
        x: 100, y: 60, width: 80, height: 20, durationInSixteenths: 16, staveY: 40
      };
      
      const result = calculateExactCharPosition(180, notePos);
      expect(result).toBe(24); // charPosition (8) + duration (16)
    });

    it('should snap to note start when cursor is in first half', () => {
      const notePos: NotePosition = {
        measureIndex: 0, noteIndex: 0, charPosition: 0,
        x: 100, y: 60, width: 100, height: 20, durationInSixteenths: 16, staveY: 40
      };
      
      // Cursor at 40% through the note (first half) - should snap to start
      const result = calculateExactCharPosition(140, notePos);
      expect(result).toBe(0); // Snapped to note start
    });

    it('should snap to note end when cursor is in second half', () => {
      const notePos: NotePosition = {
        measureIndex: 0, noteIndex: 0, charPosition: 0,
        x: 100, y: 60, width: 100, height: 20, durationInSixteenths: 16, staveY: 40
      };
      
      // Cursor at 60% through the note (second half) - should snap to end
      const result = calculateExactCharPosition(160, notePos);
      expect(result).toBe(16); // Snapped to note end (charPosition + duration)
    });

    it('should snap tied notes to meaningful boundaries', () => {
      // Second visual note of a tied note (starts at char position 16)
      const notePos: NotePosition = {
        measureIndex: 1, noteIndex: 0, charPosition: 16,
        x: 50, y: 60, width: 80, height: 20, durationInSixteenths: 8, staveY: 40,
        isTiedFrom: true, tiedGroupStart: 0, tiedGroupEnd: 24
      };
      
      // Cursor at 75% through this visual note (second half) - should snap to end
      // Note: midpoint is at x=90 (50+40), so anything > 90 snaps to end
      const result = calculateExactCharPosition(110, notePos);
      expect(result).toBe(24); // Snapped to note end (16 + 8 = 24)
    });

    it('should return charPosition for cursor before note', () => {
      const notePos: NotePosition = {
        measureIndex: 0, noteIndex: 0, charPosition: 8,
        x: 100, y: 60, width: 80, height: 20, durationInSixteenths: 16, staveY: 40
      };
      
      const result = calculateExactCharPosition(50, notePos); // Before note
      expect(result).toBe(8);
    });

    it('should return end position for cursor after note', () => {
      const notePos: NotePosition = {
        measureIndex: 0, noteIndex: 0, charPosition: 8,
        x: 100, y: 60, width: 80, height: 20, durationInSixteenths: 16, staveY: 40
      };
      
      const result = calculateExactCharPosition(250, notePos); // After note
      expect(result).toBe(24); // 8 + 16
    });
  });

  describe('findDropTarget', () => {
    it('should return null for empty note positions', () => {
      const result = findDropTarget(100, 100, []);
      expect(result).toBeNull();
    });

    it('should find a note when cursor is directly over it', () => {
      const notePositions: NotePosition[] = [
        { measureIndex: 0, noteIndex: 0, charPosition: 0, x: 50, y: 60, width: 30, height: 20, durationInSixteenths: 4, staveY: 40 },
        { measureIndex: 0, noteIndex: 1, charPosition: 4, x: 100, y: 60, width: 30, height: 20, durationInSixteenths: 4, staveY: 40 },
      ];

      const result = findDropTarget(115, 70, notePositions);
      expect(result).not.toBeNull();
      expect(result?.charPosition).toBe(4);
    });

    it('should prefer the NEXT note when cursor is in a gap between notes', () => {
      // Two notes with a gap between them (85-100)
      const notePositions: NotePosition[] = [
        { measureIndex: 0, noteIndex: 0, charPosition: 0, x: 50, y: 60, width: 35, height: 20, durationInSixteenths: 8, staveY: 40 },
        { measureIndex: 1, noteIndex: 0, charPosition: 16, x: 100, y: 60, width: 35, height: 20, durationInSixteenths: 8, staveY: 40 },
      ];

      // Cursor at x=92 (in the gap, closer to the second note)
      const result = findDropTarget(92, 70, notePositions);
      expect(result).not.toBeNull();
      // Should prefer the NEXT note (charPosition: 16) over the previous one
      expect(result?.charPosition).toBe(16);
    });

    it('should return exact position at start of note when clicking in gap before it', () => {
      const notePositions: NotePosition[] = [
        { measureIndex: 0, noteIndex: 0, charPosition: 0, x: 50, y: 60, width: 35, height: 20, durationInSixteenths: 16, staveY: 40 },
        { measureIndex: 1, noteIndex: 0, charPosition: 16, x: 100, y: 60, width: 35, height: 20, durationInSixteenths: 16, staveY: 40 },
      ];

      // Cursor at x=95 (just before the second note at x=100)
      const result = findDropTarget(95, 70, notePositions);
      expect(result).not.toBeNull();
      expect(result?.charPosition).toBe(16);
      // exactCharPosition should be 16 (start of note) since cursor is before noteStartX
      expect(result?.exactCharPosition).toBe(16);
    });

    it('should prefer the NEXT note when cursor is exactly at the boundary between two adjacent notes', () => {
      // Two adjacent notes: first ends at x=85 (50+35), second starts at x=85
      const notePositions: NotePosition[] = [
        { measureIndex: 0, noteIndex: 0, charPosition: 0, x: 50, y: 60, width: 35, height: 20, durationInSixteenths: 16, staveY: 40 },
        { measureIndex: 1, noteIndex: 0, charPosition: 16, x: 85, y: 60, width: 35, height: 20, durationInSixteenths: 16, staveY: 40 },
      ];

      // Cursor at exactly x=85 (boundary between notes)
      // Should prefer the SECOND note (intuitive for insertion at start of next measure)
      const result = findDropTarget(85, 70, notePositions);
      expect(result).not.toBeNull();
      expect(result?.charPosition).toBe(16); // Second note
      expect(result?.exactCharPosition).toBe(16); // Start of second note
    });

    it('should prefer notes on the same visual line', () => {
      const notePositions: NotePosition[] = [
        { measureIndex: 0, noteIndex: 0, charPosition: 0, x: 50, y: 60, width: 30, height: 20, durationInSixteenths: 4, staveY: 40 },
        { measureIndex: 1, noteIndex: 0, charPosition: 16, x: 50, y: 160, width: 30, height: 20, durationInSixteenths: 4, staveY: 140 }, // Second line
      ];

      // Cursor at Y=70, should find first line note
      const result = findDropTarget(50, 70, notePositions);
      expect(result).not.toBeNull();
      expect(result?.charPosition).toBe(0);
    });

    it('should handle tied note properties', () => {
      const notePositions: NotePosition[] = [
        { 
          measureIndex: 0, noteIndex: 0, charPosition: 0, x: 50, y: 60, width: 30, height: 20, 
          durationInSixteenths: 4, staveY: 40,
          isTiedTo: true,
          tiedGroupStart: 0,
          tiedGroupEnd: 8,
        },
        { 
          measureIndex: 0, noteIndex: 1, charPosition: 4, x: 100, y: 60, width: 30, height: 20, 
          durationInSixteenths: 4, staveY: 40,
          isTiedFrom: true,
          tiedGroupStart: 0,
          tiedGroupEnd: 8,
        },
      ];

      const result = findDropTarget(115, 70, notePositions);
      expect(result).not.toBeNull();
      expect(result?.notePos.isTiedFrom).toBe(true);
      expect(result?.notePos.tiedGroupStart).toBe(0);
      expect(result?.notePos.tiedGroupEnd).toBe(8);
    });
  });

  describe('NotePosition with tied note properties', () => {
    it('should correctly represent a tied note group', () => {
      // A whole note split into two half notes across measures
      const tiedGroup: NotePosition[] = [
        {
          measureIndex: 0,
          noteIndex: 0,
          charPosition: 12,
          x: 200,
          y: 60,
          width: 30,
          height: 20,
          durationInSixteenths: 4, // Quarter note at end of measure
          staveY: 40,
          isTiedTo: true,
          tiedGroupStart: 12,
          tiedGroupEnd: 28, // Full group spans 16 sixteenths
        },
        {
          measureIndex: 1,
          noteIndex: 0,
          charPosition: 16,
          x: 50,
          y: 160, // Second line
          width: 40,
          height: 20,
          durationInSixteenths: 8, // Half note continuation
          staveY: 140,
          isTiedFrom: true,
          isTiedTo: true,
          tiedGroupStart: 12,
          tiedGroupEnd: 28,
        },
        {
          measureIndex: 1,
          noteIndex: 1,
          charPosition: 24,
          x: 100,
          y: 160,
          width: 30,
          height: 20,
          durationInSixteenths: 4, // Quarter note final part
          staveY: 140,
          isTiedFrom: true,
          tiedGroupStart: 12,
          tiedGroupEnd: 28,
        },
      ];

      // All notes in the group should have the same tiedGroupStart and tiedGroupEnd
      expect(tiedGroup[0].tiedGroupStart).toBe(12);
      expect(tiedGroup[0].tiedGroupEnd).toBe(28);
      expect(tiedGroup[1].tiedGroupStart).toBe(12);
      expect(tiedGroup[1].tiedGroupEnd).toBe(28);
      expect(tiedGroup[2].tiedGroupStart).toBe(12);
      expect(tiedGroup[2].tiedGroupEnd).toBe(28);

      // First note should only be tiedTo
      expect(tiedGroup[0].isTiedTo).toBe(true);
      expect(tiedGroup[0].isTiedFrom).toBeUndefined();

      // Middle note should be both tiedFrom and tiedTo
      expect(tiedGroup[1].isTiedFrom).toBe(true);
      expect(tiedGroup[1].isTiedTo).toBe(true);

      // Last note should only be tiedFrom
      expect(tiedGroup[2].isTiedFrom).toBe(true);
      expect(tiedGroup[2].isTiedTo).toBeUndefined();
    });
  });
});
