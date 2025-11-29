import { describe, it, expect } from 'vitest';
import {
  calculateReplacementHighlights,
  calculateInsertionLinePosition,
} from './previewRenderer';
import type { NotePosition } from './dropTargetFinder';

describe('previewRenderer', () => {
  const createNotePosition = (
    measureIndex: number,
    noteIndex: number,
    charPosition: number,
    x: number,
    y: number,
    width: number = 20,
    height: number = 30,
    durationInSixteenths: number = 4
  ): NotePosition => ({
    measureIndex,
    noteIndex,
    charPosition,
    x,
    y,
    width,
    height,
    durationInSixteenths,
  });

  describe('calculateReplacementHighlights', () => {
    it('should return empty array when no notes overlap replacement range', () => {
      const notes: NotePosition[] = [
        createNotePosition(0, 0, 0, 100, 100, 20, 30, 4),
        createNotePosition(0, 1, 4, 200, 100, 20, 30, 4),
      ];
      
      const highlights = calculateReplacementHighlights(notes, 10, 12);
      
      expect(highlights).toEqual([]);
    });

    it('should highlight notes that overlap replacement range', () => {
      const notes: NotePosition[] = [
        createNotePosition(0, 0, 0, 100, 100, 20, 30, 4),
        createNotePosition(0, 1, 4, 200, 100, 20, 30, 4),
        createNotePosition(0, 2, 8, 300, 100, 20, 30, 4),
      ];
      
      // Replace from position 2 to 10 (overlaps notes at 0-4, 4-8, and 8-12)
      const highlights = calculateReplacementHighlights(notes, 2, 10);
      
      expect(highlights.length).toBe(3); // All three notes overlap
      expect(highlights[0].x).toBe(97); // note.x - padding
      expect(highlights[1].x).toBe(197); // second note.x - padding
      expect(highlights[2].x).toBe(297); // third note.x - padding
    });

    it('should highlight partial notes that overlap range', () => {
      const notes: NotePosition[] = [
        createNotePosition(0, 0, 0, 100, 100, 20, 30, 4),
      ];
      
      // Replace from position 1 to 3 (partial overlap)
      const highlights = calculateReplacementHighlights(notes, 1, 3);
      
      expect(highlights.length).toBe(1);
      expect(highlights[0].x).toBe(97);
    });

    it('should clamp highlight height to stave bounds', () => {
      const notes: NotePosition[] = [
        // Note at y=40 (top of first stave)
        createNotePosition(0, 0, 0, 100, 40, 20, 30, 4),
      ];
      
      const highlights = calculateReplacementHighlights(notes, 0, 4);
      
      expect(highlights.length).toBe(1);
      const highlight = highlights[0];
      expect(highlight.y).toBeGreaterThanOrEqual(40); // Should not go above stave top
      expect(highlight.y + highlight.height).toBeLessThanOrEqual(140); // Should not go below stave bottom
    });
  });

  describe('calculateInsertionLinePosition', () => {
    it('should return null when no notes are available', () => {
      const result = calculateInsertionLinePosition([], 0);
      expect(result).toBeNull();
    });

    it('should calculate position for insertion at the beginning', () => {
      const notes: NotePosition[] = [
        createNotePosition(0, 0, 0, 100, 100),
      ];
      
      const result = calculateInsertionLinePosition(notes, 0);
      
      expect(result).not.toBeNull();
      expect(result?.x).toBe(90); // insertNote.x - 10
    });

    it('should calculate position for insertion between notes', () => {
      const notes: NotePosition[] = [
        createNotePosition(0, 0, 0, 100, 100, 20, 30, 4),
        createNotePosition(0, 1, 4, 200, 100, 20, 30, 4),
      ];
      
      // Insert at position 4 (end of first note, start of second note)
      // First note: charPosition 0, noteEnd = 4
      // dropPosition (4) === noteEnd (4), so enters dropPosition === noteEnd branch
      // nextNote is second note, and nextNote.charPosition (4) === dropPosition (4)
      // So it selects the second note as insertNote (insert at start of second note)
      // Then dropPosition (4) === noteStart (4), so lineX = insertNote.x = 200
      const result = calculateInsertionLinePosition(notes, 4);
      
      expect(result).not.toBeNull();
      expect(result?.x).toBe(200); // insertNote.x (second note) when dropPosition matches both note boundaries
    });

    it('should interpolate X position when inserting within a note', () => {
      const notes: NotePosition[] = [
        createNotePosition(0, 0, 0, 100, 100, 40, 30, 8), // Note from 0-8
      ];
      
      // Insert at position 4 (middle of note)
      const result = calculateInsertionLinePosition(notes, 4);
      
      expect(result).not.toBeNull();
      expect(result?.x).toBe(120); // 100 + (40 * 0.5) = 120
    });

    it('should calculate position for insertion at the end', () => {
      const notes: NotePosition[] = [
        createNotePosition(0, 0, 0, 100, 100, 20, 30, 4),
      ];
      
      // Insert after last note
      const result = calculateInsertionLinePosition(notes, 10);
      
      expect(result).not.toBeNull();
      expect(result?.x).toBe(130); // lastNote.x + lastNote.width + 10
    });

    it('should handle notes on different lines', () => {
      const notes: NotePosition[] = [
        createNotePosition(0, 0, 0, 100, 100, 20, 30, 4),
        createNotePosition(0, 1, 4, 200, 200, 20, 30, 4), // Different line
      ];
      
      // Insert at position 4 (end of first note, start of second note)
      // First note: charPosition 0, noteEnd = 4
      // dropPosition (4) === noteEnd (4), so enters dropPosition === noteEnd branch
      // nextNote is second note, and nextNote.charPosition (4) === dropPosition (4)
      // So it selects the second note as insertNote (insert at start of second note)
      // Then dropPosition (4) === noteStart (4), so lineX = insertNote.x = 200
      const result = calculateInsertionLinePosition(notes, 4);
      
      expect(result).not.toBeNull();
      expect(result?.x).toBe(200); // insertNote.x (second note) when dropPosition matches both note boundaries
    });

    it('should calculate correct vertical bounds', () => {
      const notes: NotePosition[] = [
        createNotePosition(0, 0, 0, 100, 100),
      ];
      
      const result = calculateInsertionLinePosition(notes, 0);
      
      expect(result).not.toBeNull();
      expect(result?.top).toBeGreaterThan(0);
      expect(result?.bottom).toBeGreaterThan(result?.top);
      expect(result?.bottom - result?.top).toBeLessThanOrEqual(100); // Should fit within stave
    });
  });
});

