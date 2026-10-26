import { describe, it, expect } from 'vitest';
import { notationToGrid } from './sequencerUtils';
import type { TimeSignature } from '../types';

// The grid's editing paths (gridToNotation, getLinkedPositions, collapseRepeats) are gone: the
// sequencer edits notation through `setStrokeAt`, covered by sequencer.fuzz.test.ts and the
// named cases in notationEdits.test.ts. What remains is how the grid draws a rhythm.
describe('sequencerUtils', () => {
  const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };

  describe('notationToGrid', () => {
    it('should convert simple notation to grid', () => {
      const grid = notationToGrid('DKTK', timeSignature);
      expect(grid.cells[0]).toBe('dum');
      expect(grid.cells[1]).toBe('ka');
      expect(grid.cells[2]).toBe('tak');
      expect(grid.cells[3]).toBe('ka');
      // Remaining cells are null (grid has minimum 2 measures)
    });

    it('should handle extended notes', () => {
      const grid = notationToGrid('D-K-', timeSignature);
      expect(grid.cells[0]).toBe('dum');
      expect(grid.cells[1]).toBe(null); // Note extends
      expect(grid.cells[2]).toBe('ka');
      expect(grid.cells[3]).toBe(null); // Note extends
    });

    it('should handle rests', () => {
      const grid = notationToGrid('__D-', timeSignature);
      expect(grid.cells[0]).toBe('rest');
      expect(grid.cells[1]).toBe(null); // Rest extends
      expect(grid.cells[2]).toBe('dum');
      expect(grid.cells[3]).toBe(null); // Note extends
    });

    it('should track actual length correctly (padded to measure)', () => {
      const grid = notationToGrid('D', timeSignature);
      // Phase 29: Universal Boundary Alignment enforces full measures
      expect(grid.actualLength).toBe(16);
      expect(grid.cells.length).toBe(16);
    });
  });
});
