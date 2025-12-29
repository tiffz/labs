import { describe, it, expect } from 'vitest';
import { notationToGrid, gridToNotation } from './sequencerUtils';
import type { TimeSignature } from '../types';

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

    it('should track actual length correctly', () => {
      const grid = notationToGrid('D', timeSignature);
      expect(grid.actualLength).toBe(1); // Single note is 1 sixteenth
      expect(grid.cells.length).toBe(1); // Only create cells for actual content
    });
  });

  describe('gridToNotation', () => {
    it('should convert grid to notation (ignoring trailing nulls)', () => {
      const grid = notationToGrid('DKTK', timeSignature);
      const notation = gridToNotation(grid);
      // Should match original, ignoring trailing nulls from minimum 2 measures
      expect(notation).toBe('DKTK');
    });

    it('should handle extended notes', () => {
      const grid = notationToGrid('D-K-', timeSignature);
      const notation = gridToNotation(grid);
      expect(notation).toBe('D-K-');
    });

    it('should handle rests', () => {
      const grid = notationToGrid('__D-', timeSignature);
      const notation = gridToNotation(grid);
      expect(notation).toBe('__D-');
    });

    it('should round-trip complex patterns', () => {
      const original = 'D-T-__T-D---T---';
      const grid = notationToGrid(original, timeSignature);
      const notation = gridToNotation(grid);
      // Should match original (trailing nulls from grid are ignored)
      expect(notation).toBe(original);
    });
  });
});

