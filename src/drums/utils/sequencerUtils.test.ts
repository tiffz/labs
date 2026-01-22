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

    it('should track actual length correctly (padded to measure)', () => {
      const grid = notationToGrid('D', timeSignature);
      // Phase 29: Universal Boundary Alignment enforces full measures
      expect(grid.actualLength).toBe(16);
      expect(grid.cells.length).toBe(16);
    });
  });

  describe('gridToNotation', () => {
    it('should convert grid to notation (stripping padding)', () => {
      const grid = notationToGrid('DKTK', timeSignature);
      const notation = gridToNotation(grid);
      // gridToNotation should return canonical full measures
      expect(notation).toBe('DKTK____________');
    });

    it('should handle extended notes', () => {
      const grid = notationToGrid('D-K-', timeSignature);
      const notation = gridToNotation(grid);
      expect(notation).toBe('D-K-____________');
    });

    it('should handle rests', () => {
      const grid = notationToGrid('__D-', timeSignature);
      const notation = gridToNotation(grid);
      expect(notation).toBe('__D-____________');
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
        // Note: New gridToNotation adds Barlines | at 16th intervals.
        expect(notation).toBe('______________D- | --');
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
        expect(notation).toBe('DTKS____________');
      });

      it('should handle single extended rest followed by notes', () => {
        const original = '____D-T-';
        const grid = notationToGrid(original, timeSignature);
        const notation = gridToNotation(grid);
        expect(notation).toBe('____D-T-________');
      });
    });
  });
});


import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import { collapseRepeats, getLinkedPositions } from './sequencerUtils';

describe('Sequencer Utils Debug & Regressions', () => {
  const timeSignature: TimeSignature = { numerator: 4, denominator: 4, beatGrouping: [4, 4, 4, 4] };

  describe('Round Trip Stability', () => {
    const input = `T-K-K---S-----TK | % |x6 | DKTKD-DKTKD--DKSK-DKTDKTK| T-D---K-___TKT-D | DDKKT-ST-SSK-- | KDD--D__DD-----|: DKTKKTKTTKTKD--D :|x3`;

    it.skip('should be stable on round trip', () => {
      const grid = notationToGrid(input, timeSignature);
      // Manually parse to get repeats logic simulation
      const parsed = parseRhythm(input, timeSignature);
      const output = gridToNotation(grid, parsed.repeats);

      const cleanOutput = output.replace(/[\s\n]/g, '');
      const expectedCanonical = "T-K-K---S-----TK|%|x6|DKTKD-DKTKD--DKS|K-DKTDKTK_______|T-D---K-___TKT-D|DDKKT-ST-SSK--__|KDD--D__DD-----D|KTKKTKTTKTKD--DD|x3|KTKKTKTTKTKD--D_";

      // Expect exact canonical match (spaces stripped)
      expect(cleanOutput).toBe(expectedCanonical.replace(/[\s\n]/g, ''));
    });
  });

  describe('Robust Sequencer Collapse', () => {
    it('should collapse adjacent single measures (A A)', () => {
      const slices = ['A', 'A'];
      const result = collapseRepeats(slices, undefined);
      expect(result).toBe('A |x2');
    });

    it('should collapse flat multi-measure patterns (A B A B)', () => {
      const slices = ['A', 'B', 'A', 'B'];
      const result = collapseRepeats(slices, undefined);
      expect(result).toBe('|: A | B :|x2');
    });
  });

  describe('Sequencer Junk Note Bug', () => {
    it('should not add junk notes when editing a section repeat', () => {
      // Input: |: D... :|x3 (Source + 3 repeats = 4 measures)
      const input = '|: D--------------- :|x3';
      const initialGrid = notationToGrid(input, timeSignature);

      // Expect 48 ticks (3 measures * 16) for Total Count
      expect(initialGrid.actualLength).toBeGreaterThanOrEqual(48);

      // Edit: Replace start of all 4 measures with 'tak'
      // simulating a linked edit
      const newCells = [...initialGrid.cells];
      [0, 16, 32, 48].forEach(idx => newCells[idx] = 'tak');

      const editedGrid = { ...initialGrid, cells: newCells };
      const parsed = parseRhythm(input, timeSignature);
      const output = gridToNotation(editedGrid, parsed.repeats);
      const cleanOutput = output.replace(/[\s\n]/g, '');

      // Should preserve x3 and not append junk measure
      expect(cleanOutput).toBe('|:T---------------:|x3');
      expect(output).not.toContain('| T');
    });
  });

  describe('Sequencer Linked Editing', () => {
    const repeats = [
      { type: 'section' as const, startMeasure: 0, endMeasure: 1, repeatCount: 2 }
    ];
    const sixteenths = 16;

    it('should return linked positions for Source Measure (M0)', () => {
      // Section |: A | B :|x2
      // M0(A), M1(B) -> Source
      // M2(A), M3(B) -> Ghost 1
      // M4(A), M5(B) -> Ghost 2
      const pos = 0; // First beat of M0
      const linked = getLinkedPositions(pos, repeats, sixteenths);

      // Expect links to M2(A) and M4(A)
      // M0=0. M2=32. M4=64.
      expect(linked).toContain(0);
      expect(linked).toContain(32);
      expect(linked).toContain(64);
    });

    it('should return linked positions for Ghost Measure (M2) linking back to Source', () => {
      const posM2 = 32; // First beat of M2 (Ghost A)
      const linked = getLinkedPositions(posM2, repeats, sixteenths);

      // Should include M0 (Source)
      expect(linked).toContain(0);
      expect(linked).toContain(32);
      expect(linked).toContain(64);
    });
  });
});
