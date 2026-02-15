import { describe, it, expect } from 'vitest';
import {
  getLineIndex,
  computeLineBoundaries,
  BOUNDARY_ZONE_HALF_WIDTH,
} from './dropPreview';
import { calculateInsertionLineFromGap } from './insertionTargetFinder';
import type { Gap } from './insertionTargetFinder';
import type { NotePosition } from './dropTargetFinder';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a NotePosition with sensible defaults. */
function makeNote(overrides: Partial<NotePosition> & { charPosition: number; x: number }): NotePosition {
  return {
    measureIndex: 0,
    noteIndex: 0,
    y: 60,
    width: 60,
    height: 20,
    durationInSixteenths: 4,
    staveY: 40,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getLineIndex
// ---------------------------------------------------------------------------

describe('getLineIndex', () => {
  it('returns 0 for notes on the first stave line (staveY=40)', () => {
    const note = makeNote({ charPosition: 0, x: 100, staveY: 40 });
    expect(getLineIndex(note)).toBe(0);
  });

  it('returns 1 for notes on the second stave line (staveY=140)', () => {
    const note = makeNote({ charPosition: 0, x: 100, staveY: 140 });
    expect(getLineIndex(note)).toBe(1);
  });

  it('returns 2 for notes on the third stave line (staveY=240)', () => {
    const note = makeNote({ charPosition: 0, x: 100, staveY: 240 });
    expect(getLineIndex(note)).toBe(2);
  });

  it('falls back to y-based estimation when staveY is undefined', () => {
    // With y=60, estimatedStaveY = 60-20 = 40, lineIndex = round((40-40)/100) = 0
    const note = makeNote({ charPosition: 0, x: 100, staveY: undefined, y: 60 });
    expect(getLineIndex(note)).toBe(0);
  });

  it('estimates second line from y position when staveY is undefined', () => {
    // With y=160, estimatedStaveY = 160-20 = 140, lineIndex = round((140-40)/100) = 1
    const note = makeNote({ charPosition: 0, x: 100, staveY: undefined, y: 160 });
    expect(getLineIndex(note)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// computeLineBoundaries
// ---------------------------------------------------------------------------

describe('computeLineBoundaries', () => {
  it('returns empty array for empty input', () => {
    expect(computeLineBoundaries([])).toEqual([]);
  });

  it('returns start + end boundaries for a single note', () => {
    const note = makeNote({ charPosition: 0, x: 100, width: 60, durationInSixteenths: 4 });
    const boundaries = computeLineBoundaries([note]);

    // Should have 2 boundaries: before and after the single note
    expect(boundaries).toHaveLength(2);

    // Boundary before
    expect(boundaries[0].x).toBe(100);         // at note start
    expect(boundaries[0].charPos).toBe(0);     // insert at note's charPos

    // Boundary after
    expect(boundaries[1].x).toBe(160);         // note.x + note.width
    expect(boundaries[1].charPos).toBe(4);     // note.charPos + note.duration
  });

  it('returns N+1 boundaries for N consecutive notes', () => {
    const notes = [
      makeNote({ charPosition: 0,  x: 100, width: 60, durationInSixteenths: 4 }),
      makeNote({ charPosition: 4,  x: 160, width: 60, durationInSixteenths: 4 }),
      makeNote({ charPosition: 8,  x: 220, width: 60, durationInSixteenths: 4 }),
    ];
    const boundaries = computeLineBoundaries(notes);

    // 3 notes → 4 boundaries
    expect(boundaries).toHaveLength(4);

    // Before first note
    expect(boundaries[0]).toMatchObject({ x: 100, charPos: 0 });

    // Between note 0 and note 1
    expect(boundaries[1]).toMatchObject({ x: 160, charPos: 4 });

    // Between note 1 and note 2
    expect(boundaries[2]).toMatchObject({ x: 220, charPos: 8 });

    // After last note
    expect(boundaries[3]).toMatchObject({ x: 280, charPos: 12 });
  });

  it('sorts notes by x position regardless of input order', () => {
    const notes = [
      makeNote({ charPosition: 8,  x: 220, width: 60, durationInSixteenths: 4 }),
      makeNote({ charPosition: 0,  x: 100, width: 60, durationInSixteenths: 4 }),
      makeNote({ charPosition: 4,  x: 160, width: 60, durationInSixteenths: 4 }),
    ];
    const boundaries = computeLineBoundaries(notes);

    // Should still be in correct x-sorted order
    expect(boundaries[0].x).toBe(100);
    expect(boundaries[1].x).toBe(160);
    expect(boundaries[2].x).toBe(220);
    expect(boundaries[3].x).toBe(280);
  });

  it('handles notes with different widths', () => {
    // Quarter note (wide) followed by sixteenth (narrow)
    const notes = [
      makeNote({ charPosition: 0,  x: 100, width: 100, durationInSixteenths: 4 }),
      makeNote({ charPosition: 4,  x: 200, width: 25,  durationInSixteenths: 1 }),
    ];
    const boundaries = computeLineBoundaries(notes);

    expect(boundaries).toHaveLength(3);
    expect(boundaries[0]).toMatchObject({ x: 100, charPos: 0 });
    expect(boundaries[1]).toMatchObject({ x: 200, charPos: 4 });
    expect(boundaries[2]).toMatchObject({ x: 225, charPos: 5 });
  });
});

// ---------------------------------------------------------------------------
// Zone detection (boundary proximity)
// ---------------------------------------------------------------------------

describe('zone detection logic', () => {
  // These tests verify the core rule:
  // |cursor - boundary.x| <= BOUNDARY_ZONE_HALF_WIDTH → insertion
  // otherwise → replacement

  const notes = [
    makeNote({ charPosition: 0,  x: 100, width: 80, durationInSixteenths: 4 }),
    makeNote({ charPosition: 4,  x: 180, width: 80, durationInSixteenths: 4 }),
  ];

  const boundaries = computeLineBoundaries(notes);
  // boundaries: x=100 (before A), x=180 (between A-B), x=260 (after B)

  function isInsertionZone(svgX: number): boolean {
    let minDist = Infinity;
    for (const b of boundaries) {
      minDist = Math.min(minDist, Math.abs(svgX - b.x));
    }
    // Also check before-first / after-last
    const isBeforeFirst = svgX < notes[0].x;
    const lastNote = notes[notes.length - 1];
    const isAfterLast = svgX > lastNote.x + lastNote.width;
    return minDist <= BOUNDARY_ZONE_HALF_WIDTH || isBeforeFirst || isAfterLast;
  }

  it('cursor in center of note A → replace (not insertion)', () => {
    // Center of A is at x=140 (100 + 80/2). Nearest boundary is x=100 at distance 40, or x=180 at distance 40.
    expect(isInsertionZone(140)).toBe(false);
  });

  it('cursor in center of note B → replace (not insertion)', () => {
    // Center of B is at x=220. Nearest boundary is x=180 at distance 40, or x=260 at distance 40.
    expect(isInsertionZone(220)).toBe(false);
  });

  it('cursor at boundary between A and B → insertion', () => {
    expect(isInsertionZone(180)).toBe(true);
  });

  it('cursor just inside insertion zone (left side of boundary) → insertion', () => {
    // boundary at x=180, zone extends to 180 - BOUNDARY_ZONE_HALF_WIDTH
    expect(isInsertionZone(180 - BOUNDARY_ZONE_HALF_WIDTH)).toBe(true);
  });

  it('cursor just inside insertion zone (right side of boundary) → insertion', () => {
    expect(isInsertionZone(180 + BOUNDARY_ZONE_HALF_WIDTH)).toBe(true);
  });

  it('cursor just outside insertion zone (left) → replace', () => {
    expect(isInsertionZone(180 - BOUNDARY_ZONE_HALF_WIDTH - 1)).toBe(false);
  });

  it('cursor just outside insertion zone (right) → replace', () => {
    expect(isInsertionZone(180 + BOUNDARY_ZONE_HALF_WIDTH + 1)).toBe(false);
  });

  it('cursor before first note → insertion', () => {
    expect(isInsertionZone(50)).toBe(true);
  });

  it('cursor after last note → insertion', () => {
    expect(isInsertionZone(300)).toBe(true);
  });

  it('BOUNDARY_ZONE_HALF_WIDTH is reasonable (8-20px range)', () => {
    expect(BOUNDARY_ZONE_HALF_WIDTH).toBeGreaterThanOrEqual(8);
    expect(BOUNDARY_ZONE_HALF_WIDTH).toBeLessThanOrEqual(20);
  });
});

describe('directional consistency', () => {
  // Verify the key UX guarantee: moving left from a boundary leads to replacing
  // the note on the left, and moving right leads to replacing the note on the right.

  const noteA = makeNote({ charPosition: 0,  x: 100, width: 80, durationInSixteenths: 4 });
  const noteB = makeNote({ charPosition: 4,  x: 180, width: 80, durationInSixteenths: 4 });
  const notes = [noteA, noteB];
  const boundaries = computeLineBoundaries(notes);

  function closestBoundaryCharPos(svgX: number) {
    let closest = boundaries[0];
    let minDist = Infinity;
    for (const b of boundaries) {
      const d = Math.abs(svgX - b.x);
      if (d < minDist) {
        minDist = d;
        closest = b;
      }
    }
    return { closest, minDist };
  }

  it('at the A-B boundary, the insertion charPos equals the end of A / start of B', () => {
    const { closest } = closestBoundaryCharPos(180);
    // charPos should be A.charPosition + A.duration = 0 + 4 = 4, which is also B.charPosition
    expect(closest.charPos).toBe(4);
  });

  it('moving left from boundary center eventually exits the insertion zone', () => {
    // Start at boundary (x=180), move left pixel by pixel
    let exitedAt = -1;
    for (let x = 180; x >= 100; x--) {
      const { minDist } = closestBoundaryCharPos(x);
      if (minDist > BOUNDARY_ZONE_HALF_WIDTH) {
        exitedAt = x;
        break;
      }
    }
    // Should exit at 180 - BOUNDARY_ZONE_HALF_WIDTH - 1
    expect(exitedAt).toBe(180 - BOUNDARY_ZONE_HALF_WIDTH - 1);
    // And the exit should be within note A's visual bounds
    expect(exitedAt).toBeGreaterThanOrEqual(noteA.x);
    expect(exitedAt).toBeLessThan(noteA.x + noteA.width);
  });

  it('moving right from boundary center eventually exits the insertion zone', () => {
    let exitedAt = -1;
    for (let x = 180; x <= 260; x++) {
      const { minDist } = closestBoundaryCharPos(x);
      if (minDist > BOUNDARY_ZONE_HALF_WIDTH) {
        exitedAt = x;
        break;
      }
    }
    expect(exitedAt).toBe(180 + BOUNDARY_ZONE_HALF_WIDTH + 1);
    // Exit should be within note B's visual bounds
    expect(exitedAt).toBeGreaterThanOrEqual(noteB.x);
    expect(exitedAt).toBeLessThan(noteB.x + noteB.width);
  });
});

// ---------------------------------------------------------------------------
// calculateInsertionLineFromGap
// ---------------------------------------------------------------------------

describe('calculateInsertionLineFromGap', () => {
  it('returns a vertically fixed line centered on the stave', () => {
    const gap: Gap = {
      charStart: 4,
      charEnd: 4,
      xStart: 148,
      xEnd: 152,
      y: 60,
      lineIndex: 0,
    };

    const result = calculateInsertionLineFromGap(gap);

    // X should be midpoint of gap
    expect(result.x).toBe(150);

    // staveTop = 40 + 0*100 = 40
    // staveMiddleLineY = 40 + (100/5)*2 = 80
    // top = 80 - 25 = 55
    // bottom = 80 + 35 = 115
    expect(result.top).toBe(55);
    expect(result.bottom).toBe(115);
  });

  it('does not change vertical position based on any external state', () => {
    const gap: Gap = {
      charStart: 0,
      charEnd: 0,
      xStart: 98,
      xEnd: 102,
      y: 60,
      lineIndex: 0,
    };

    const result1 = calculateInsertionLineFromGap(gap);
    const result2 = calculateInsertionLineFromGap(gap);

    // Results should be identical - no randomness or external dependency
    expect(result1.top).toBe(result2.top);
    expect(result1.bottom).toBe(result2.bottom);
  });

  it('positions correctly for the second stave line', () => {
    const gap: Gap = {
      charStart: 16,
      charEnd: 16,
      xStart: 98,
      xEnd: 102,
      y: 160,
      lineIndex: 1,
    };

    const result = calculateInsertionLineFromGap(gap);

    // staveTop = 40 + 1*100 = 140
    // staveMiddleLineY = 140 + 40 = 180
    // top = 180 - 25 = 155
    // bottom = 180 + 35 = 215
    expect(result.top).toBe(155);
    expect(result.bottom).toBe(215);
  });

  it('produces a line of consistent height regardless of stave line', () => {
    const gap0: Gap = { charStart: 0, charEnd: 0, xStart: 98, xEnd: 102, y: 60, lineIndex: 0 };
    const gap1: Gap = { charStart: 0, charEnd: 0, xStart: 98, xEnd: 102, y: 160, lineIndex: 1 };
    const gap2: Gap = { charStart: 0, charEnd: 0, xStart: 98, xEnd: 102, y: 260, lineIndex: 2 };

    const r0 = calculateInsertionLineFromGap(gap0);
    const r1 = calculateInsertionLineFromGap(gap1);
    const r2 = calculateInsertionLineFromGap(gap2);

    const height0 = r0.bottom - r0.top;
    const height1 = r1.bottom - r1.top;
    const height2 = r2.bottom - r2.top;

    expect(height0).toBe(height1);
    expect(height1).toBe(height2);
    // Height should be 25 + 35 = 60px
    expect(height0).toBe(60);
  });
});
