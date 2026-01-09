import { describe, it, expect } from 'vitest';
import { notationToGrid, gridToNotation, type SequencerGrid } from './sequencerUtils';
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

  describe('edge cases', () => {
    describe('leading nulls (should become rests)', () => {
      it('should convert leading nulls to rests', () => {
        // Simulating user clicking position 2 without clicking positions 0, 1
        const grid: SequencerGrid = {
          cells: [null, null, 'dum', null],
          sixteenthsPerMeasure: 16,
          actualLength: 4,
        };
        const notation = gridToNotation(grid);
        expect(notation).toBe('__D-');
      });

      it('should convert multiple leading nulls to rests', () => {
        const grid: SequencerGrid = {
          cells: [null, null, null, null, 'tak'],
          sixteenthsPerMeasure: 16,
          actualLength: 5,
        };
        const notation = gridToNotation(grid);
        expect(notation).toBe('____T');
      });

      it('should convert a single leading null to rest', () => {
        const grid: SequencerGrid = {
          cells: [null, 'dum'],
          sixteenthsPerMeasure: 16,
          actualLength: 2,
        };
        const notation = gridToNotation(grid);
        expect(notation).toBe('_D');
      });
    });

    describe('intermediate nulls (between notes that are not extensions)', () => {
      it('should extend notes when nulls immediately follow', () => {
        // D-- T = dum for 3 sixteenths, tak for 1 sixteenth
        const grid: SequencerGrid = {
          cells: ['dum', null, null, 'tak'],
          sixteenthsPerMeasure: 16,
          actualLength: 4,
        };
        const notation = gridToNotation(grid);
        expect(notation).toBe('D--T');
      });

      it('should handle explicit rests between notes', () => {
        // Grid with explicit rest between sounds
        const grid: SequencerGrid = {
          cells: ['dum', null, 'rest', null, 'tak'],
          sixteenthsPerMeasure: 16,
          actualLength: 5,
        };
        const notation = gridToNotation(grid);
        expect(notation).toBe('D-__T');
      });
    });

    describe('tied notes (spanning measures)', () => {
      it('should handle notes spanning measure boundaries', () => {
        // A note that spans from end of measure 1 into measure 2
        // Measure 1: positions 0-15, Measure 2: positions 16-31
        // Dum at position 14 extending to position 17 (4 sixteenths across boundary)
        const cells = new Array(18).fill(null);
        cells[14] = 'dum';
        // Positions 15, 16, 17 are null (extending the note)
        
        const grid: SequencerGrid = {
          cells,
          sixteenthsPerMeasure: 16,
          actualLength: 18,
        };
        const notation = gridToNotation(grid);
        // 14 leading rests + dum extending 4 sixteenths
        expect(notation).toBe('______________D---');
      });

      it('should round-trip tied notes correctly', () => {
        // Create a simple tied note pattern
        const original = 'D---------------'; // Whole note (16 sixteenths)
        const grid = notationToGrid(original, timeSignature);
        const notation = gridToNotation(grid);
        expect(notation).toBe(original);
      });
    });

    describe('clicking in the middle of a tied note', () => {
      it('should properly handle inserting a sound in the middle of an extended note', () => {
        // Original: D------- (dum for 8 sixteenths)
        // User clicks position 4 with tak
        // Result: D--- T--- (dum for 4, tak for 4)
        const grid: SequencerGrid = {
          cells: ['dum', null, null, null, 'tak', null, null, null],
          sixteenthsPerMeasure: 16,
          actualLength: 8,
        };
        const notation = gridToNotation(grid);
        expect(notation).toBe('D---T---');
      });

      it('should handle inserting a sound that splits a note at position 1', () => {
        // Original: D--- (dum for 4)
        // User clicks position 1 with tak
        // Result: DT-- (dum for 1, tak for 3)
        const grid: SequencerGrid = {
          cells: ['dum', 'tak', null, null],
          sixteenthsPerMeasure: 16,
          actualLength: 4,
        };
        const notation = gridToNotation(grid);
        expect(notation).toBe('DT--');
      });
    });

    describe('empty grid', () => {
      it('should return empty string for grid with all nulls', () => {
        const grid: SequencerGrid = {
          cells: [null, null, null, null],
          sixteenthsPerMeasure: 16,
          actualLength: 0,
        };
        const notation = gridToNotation(grid);
        expect(notation).toBe('');
      });

      it('should return empty string for empty cells array', () => {
        const grid: SequencerGrid = {
          cells: [],
          sixteenthsPerMeasure: 16,
          actualLength: 0,
        };
        const notation = gridToNotation(grid);
        expect(notation).toBe('');
      });
    });

    describe('rest-only patterns', () => {
      it('should handle a measure of just rests', () => {
        const original = '________________'; // 16 sixteenth rests
        const grid = notationToGrid(original, timeSignature);
        const notation = gridToNotation(grid);
        expect(notation).toBe(original);
      });

      it('should handle rests then sounds', () => {
        const original = '________D-T-K-T-'; // 8 rests then sounds
        const grid = notationToGrid(original, timeSignature);
        const notation = gridToNotation(grid);
        expect(notation).toBe(original);
      });
    });

    describe('complex patterns', () => {
      it('should handle alternating sounds and rests', () => {
        const original = 'D___T___K___S___';
        const grid = notationToGrid(original, timeSignature);
        const notation = gridToNotation(grid);
        expect(notation).toBe(original);
      });

      it('should handle rapid successive notes', () => {
        const original = 'DTKS'; // All sixteenth notes
        const grid = notationToGrid(original, timeSignature);
        const notation = gridToNotation(grid);
        expect(notation).toBe(original);
      });

      it('should handle single extended rest followed by notes', () => {
        const original = '____D-T-';
        const grid = notationToGrid(original, timeSignature);
        const notation = gridToNotation(grid);
        expect(notation).toBe(original);
      });
    });
  });
});

