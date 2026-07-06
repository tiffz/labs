import { describe, expect, it } from 'vitest';
import {
  buildSixteenthXMap,
  layoutMetronomeDotsInMeasure,
  METRONOME_DOT_NUDGE_PX,
  MIN_DOT_EDGE_GAP_PX,
  noteheadCenterX,
  resolveMetronomeDotXInMeasure,
  type MetronomeDotPlacement,
  type MetronomeLayoutNoteAnchor,
} from './metronomeDotLayout';
import {
  getMetronomeVisualDots,
  metronomeDotRadiusPx,
  type MetronomeDotTier,
} from '../audio/metronome/metronomeVisualDots';
import type { SubdivisionType } from '../audio/metronome/types';
import type { TimeSignature } from '../rhythm/types';

function note(
  overrides: Partial<MetronomeLayoutNoteAnchor> &
    Pick<MetronomeLayoutNoteAnchor, 'noteIndex' | 'x' | 'durationInSixteenths'>,
): MetronomeLayoutNoteAnchor {
  return {
    measureIndex: 0,
    charPosition: 0,
    ...overrides,
  };
}

function minCenterGapPx(
  leftTier: MetronomeDotTier,
  rightTier: MetronomeDotTier,
  leftSubdivision?: SubdivisionType,
  rightSubdivision?: SubdivisionType,
): number {
  return (
    metronomeDotRadiusPx(leftTier, leftSubdivision) +
    metronomeDotRadiusPx(rightTier, rightSubdivision) +
    MIN_DOT_EDGE_GAP_PX
  );
}

function assertNoDotOverlaps(placements: MetronomeDotPlacement[]): void {
  const sorted = [...placements].sort((a, b) => a.x - b.x);
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const left = sorted[i];
    const right = sorted[i + 1];
    if (left.pinnedToNoteOnset && right.pinnedToNoteOnset) continue;
    const minGap = minCenterGapPx(left.tier, right.tier, left.subdivision, right.subdivision);
    expect(right.x - left.x).toBeGreaterThanOrEqual(minGap - 0.001);
  }
}

function assertSameBaseline(placements: MetronomeDotPlacement[]): void {
  for (const placement of placements) {
    expect(placement.cyOffsetPx ?? 0).toBe(0);
  }
}

function layoutWithVisualDots(params: {
  measureIndex?: number;
  timeSignature: TimeSignature;
  subdivisionLevel: 1 | 2 | 3 | 4;
  notePositions: MetronomeLayoutNoteAnchor[];
  measureStartX?: number;
  measureEndX?: number;
}): MetronomeDotPlacement[] {
  const sixteenthsPerMeasure = params.timeSignature.numerator * (16 / params.timeSignature.denominator);
  const dots = getMetronomeVisualDots(params.timeSignature, params.subdivisionLevel).map((dot) => ({
    positionInSixteenths: dot.positionInSixteenths,
    tier: dot.tier,
    subdivision: dot.subdivision,
  }));

  return layoutMetronomeDotsInMeasure({
    measureIndex: params.measureIndex ?? 0,
    dots,
    notePositions: params.notePositions,
    measureStartX: params.measureStartX ?? 80,
    measureEndX: params.measureEndX ?? 320,
    sixteenthsPerMeasure,
  });
}

describe('noteheadCenterX', () => {
  it('nudges from the VexFlow stem origin', () => {
    expect(
      noteheadCenterX(note({ noteIndex: 0, x: 100, durationInSixteenths: 4, headCenterX: 100 })),
    ).toBe(100 + METRONOME_DOT_NUDGE_PX);
  });

  it('uses painted notehead center without nudge when flagged', () => {
    expect(
      noteheadCenterX(
        note({
          noteIndex: 0,
          x: 100,
          durationInSixteenths: 3,
          headCenterX: 118,
          headCenterXIsNotehead: true,
        }),
      ),
    ).toBe(118);
  });
});

describe('buildSixteenthXMap', () => {
  const baseParams = {
    measureIndex: 0,
    measureStartX: 80,
    measureEndX: 320,
    sixteenthsPerMeasure: 16,
  };

  it('interpolates subdivisions between sparse note onsets in time', () => {
    const sparseNotes: MetronomeLayoutNoteAnchor[] = [
      note({ noteIndex: 0, charPosition: 0, x: 100, durationInSixteenths: 4, headCenterX: 100 }),
      note({ noteIndex: 1, charPosition: 12, x: 280, durationInSixteenths: 4, headCenterX: 280 }),
    ];

    const map = buildSixteenthXMap({ ...baseParams, notePositions: sparseNotes });
    const x0 = noteheadCenterX(sparseNotes[0]);
    const x12 = noteheadCenterX(sparseNotes[1]);

    expect(map[8]).toBeCloseTo(x0 + ((x12 - x0) * 8) / 12, 5);
  });

  it('evenly spaces subdivisions between a quarter note and a sixteenth run', () => {
    const notes: MetronomeLayoutNoteAnchor[] = [
      note({ noteIndex: 0, charPosition: 0, x: 100, durationInSixteenths: 4, headCenterX: 100 }),
      note({ noteIndex: 1, charPosition: 4, x: 160, durationInSixteenths: 1, headCenterX: 160 }),
      note({ noteIndex: 2, charPosition: 5, x: 172, durationInSixteenths: 1, headCenterX: 172 }),
      note({ noteIndex: 3, charPosition: 6, x: 184, durationInSixteenths: 1, headCenterX: 184 }),
      note({ noteIndex: 4, charPosition: 7, x: 196, durationInSixteenths: 1, headCenterX: 196 }),
    ];

    const map = buildSixteenthXMap({ ...baseParams, notePositions: notes });
    const x0 = noteheadCenterX(notes[0]);
    const x4 = noteheadCenterX(notes[1]);

    expect(map[1]).toBeCloseTo(x0 + (x4 - x0) / 4, 5);
    expect(map[4]).toBe(x4);
    expect(map[5]).toBe(noteheadCenterX(notes[2]));
  });
});

describe('resolveMetronomeDotXInMeasure', () => {
  const notes: MetronomeLayoutNoteAnchor[] = [
    note({ noteIndex: 0, charPosition: 0, x: 100, durationInSixteenths: 4, headCenterX: 100 }),
    note({ noteIndex: 1, charPosition: 4, x: 160, durationInSixteenths: 4, headCenterX: 160 }),
    note({ noteIndex: 2, charPosition: 8, x: 220, durationInSixteenths: 4, headCenterX: 220 }),
    note({ noteIndex: 3, charPosition: 12, x: 280, durationInSixteenths: 4, headCenterX: 280 }),
  ];

  const baseParams = {
    measureIndex: 0,
    notePositions: notes,
    measureStartX: 80,
    measureEndX: 320,
    sixteenthsPerMeasure: 16,
  };

  it('aligns downbeats with notehead centers', () => {
    expect(
      resolveMetronomeDotXInMeasure({ ...baseParams, positionInSixteenths: 0 }),
    ).toBe(noteheadCenterX(notes[0]));

    expect(
      resolveMetronomeDotXInMeasure({ ...baseParams, positionInSixteenths: 8 }),
    ).toBe(noteheadCenterX(notes[2]));
  });
});

describe('layoutMetronomeDotsInMeasure', () => {
  const timeSignature = { numerator: 4, denominator: 4 };

  it('aligns beat dots on painted notehead centers (dotted eighth)', () => {
    const dottedEighthHeadCenter = 214;
    const placements = layoutMetronomeDotsInMeasure({
      measureIndex: 2,
      dots: [{ positionInSixteenths: 0, tier: 'beat', subdivision: 'quarter' }],
      notePositions: [
        note({
          measureIndex: 2,
          noteIndex: 0,
          charPosition: 32,
          x: 200,
          durationInSixteenths: 3,
          headCenterX: dottedEighthHeadCenter,
          headCenterXIsNotehead: true,
        }),
      ],
      measureStartX: 180,
      measureEndX: 300,
      sixteenthsPerMeasure: 16,
    });

    expect(placements[0]?.x).toBe(dottedEighthHeadCenter);
  });

  it('aligns downbeat under a leading rest when the rest is the first anchor', () => {
    const restCenter = 142;
    const noteCenter = 168;
    const placements = layoutMetronomeDotsInMeasure({
      measureIndex: 0,
      dots: [{ positionInSixteenths: 0, tier: 'downbeat', subdivision: 'accent' }],
      notePositions: [
        note({
          noteIndex: 0,
          charPosition: 0,
          x: 130,
          durationInSixteenths: 1,
          headCenterX: restCenter,
          headCenterXIsNotehead: true,
        }),
        note({
          noteIndex: 1,
          charPosition: 1,
          x: 160,
          durationInSixteenths: 1,
          headCenterX: noteCenter,
          headCenterXIsNotehead: true,
        }),
      ],
      measureStartX: 80,
      measureEndX: 320,
      sixteenthsPerMeasure: 16,
    });

    expect(placements[0]?.x).toBe(restCenter);
    expect(placements[0]?.x).toBeGreaterThan(80 + 20);
  });

  it('returns one placement per dot sorted by position on a shared baseline', () => {
    const wholeNote = note({
      noteIndex: 0,
      charPosition: 0,
      x: 100,
      durationInSixteenths: 16,
      headCenterX: 100,
    });

    const placements = layoutMetronomeDotsInMeasure({
      measureIndex: 0,
      dots: [
        { positionInSixteenths: 4, tier: 'beat', subdivision: 'quarter' },
        { positionInSixteenths: 0, tier: 'downbeat', subdivision: 'accent' },
        { positionInSixteenths: 2, tier: 'subdivision', subdivision: 'eighth' },
      ],
      notePositions: [wholeNote],
      measureStartX: 80,
      measureEndX: 320,
      sixteenthsPerMeasure: 16,
    });

    expect(placements.map((p) => p.positionInSixteenths)).toEqual([0, 2, 4]);
    expect(placements[0].x).toBe(noteheadCenterX(wholeNote));
    assertSameBaseline(placements);
  });

  describe('edge cases — no horizontal collisions', () => {
    it('quarter-note groove (Q Q 2e Q)', () => {
      const notes: MetronomeLayoutNoteAnchor[] = [
        note({ noteIndex: 0, charPosition: 0, x: 100, durationInSixteenths: 4, headCenterX: 100 }),
        note({ noteIndex: 1, charPosition: 4, x: 160, durationInSixteenths: 4, headCenterX: 160 }),
        note({ noteIndex: 2, charPosition: 8, x: 210, durationInSixteenths: 2, headCenterX: 210 }),
        note({ noteIndex: 3, charPosition: 10, x: 230, durationInSixteenths: 2, headCenterX: 230 }),
        note({ noteIndex: 4, charPosition: 12, x: 280, durationInSixteenths: 4, headCenterX: 280 }),
      ];

      const placements = layoutWithVisualDots({
        timeSignature,
        subdivisionLevel: 4,
        notePositions: notes,
      });

      assertSameBaseline(placements);
      assertNoDotOverlaps(placements);
    });

    it('tight sixteenth-note run (four 16ths on one beat)', () => {
      const notes: MetronomeLayoutNoteAnchor[] = [
        note({ noteIndex: 0, charPosition: 0, x: 100, durationInSixteenths: 4, headCenterX: 100 }),
        note({ noteIndex: 1, charPosition: 4, x: 158, durationInSixteenths: 1, headCenterX: 158 }),
        note({ noteIndex: 2, charPosition: 5, x: 168, durationInSixteenths: 1, headCenterX: 168 }),
        note({ noteIndex: 3, charPosition: 6, x: 178, durationInSixteenths: 1, headCenterX: 178 }),
        note({ noteIndex: 4, charPosition: 7, x: 188, durationInSixteenths: 1, headCenterX: 188 }),
        note({ noteIndex: 5, charPosition: 8, x: 220, durationInSixteenths: 4, headCenterX: 220 }),
        note({ noteIndex: 6, charPosition: 12, x: 280, durationInSixteenths: 4, headCenterX: 280 }),
      ];

      const placements = layoutWithVisualDots({
        timeSignature,
        subdivisionLevel: 4,
        notePositions: notes,
      });

      assertSameBaseline(placements);
      assertNoDotOverlaps(placements);

      for (const onset of [4, 5, 6, 7]) {
        const dot = placements.find((p) => p.positionInSixteenths === onset);
        const anchor = notes.find((n) => n.charPosition === onset)!;
        expect(dot?.x).toBe(noteheadCenterX(anchor));
        expect(dot?.pinnedToNoteOnset).toBe(true);
      }
    });

    it('keeps last-beat sixteenth dots on noteheads (does not stretch to barline)', () => {
      const notes: MetronomeLayoutNoteAnchor[] = [
        note({ noteIndex: 0, charPosition: 0, x: 100, durationInSixteenths: 2, headCenterX: 100, headCenterXIsNotehead: true }),
        note({ noteIndex: 1, charPosition: 2, x: 130, durationInSixteenths: 2, headCenterX: 130, headCenterXIsNotehead: true }),
        note({ noteIndex: 2, charPosition: 4, x: 160, durationInSixteenths: 2, headCenterX: 160, headCenterXIsNotehead: true }),
        note({ noteIndex: 3, charPosition: 6, x: 190, durationInSixteenths: 2, headCenterX: 190, headCenterXIsNotehead: true }),
        note({ noteIndex: 4, charPosition: 8, x: 220, durationInSixteenths: 2, headCenterX: 220, headCenterXIsNotehead: true }),
        note({ noteIndex: 5, charPosition: 10, x: 250, durationInSixteenths: 2, headCenterX: 250, headCenterXIsNotehead: true }),
        note({ noteIndex: 6, charPosition: 12, x: 268, durationInSixteenths: 1, headCenterX: 268, headCenterXIsNotehead: true }),
        note({ noteIndex: 7, charPosition: 13, x: 278, durationInSixteenths: 1, headCenterX: 278, headCenterXIsNotehead: true }),
        note({ noteIndex: 8, charPosition: 14, x: 288, durationInSixteenths: 1, headCenterX: 288, headCenterXIsNotehead: true }),
        note({ noteIndex: 9, charPosition: 15, x: 298, durationInSixteenths: 1, headCenterX: 298, headCenterXIsNotehead: true }),
      ];

      const measureEndX = 360;
      const placements = layoutWithVisualDots({
        timeSignature,
        subdivisionLevel: 4,
        notePositions: notes,
        measureEndX,
      });

      assertSameBaseline(placements);
      assertNoDotOverlaps(placements);

      for (const onset of [12, 13, 14, 15]) {
        const dot = placements.find((p) => p.positionInSixteenths === onset);
        const anchor = notes.find((n) => n.charPosition === onset)!;
        expect(dot?.x).toBe(noteheadCenterX(anchor));
        expect(dot?.pinnedToNoteOnset).toBe(true);
      }

      const lastSixteenthDot = placements.find((p) => p.positionInSixteenths === 15)!;
      expect(lastSixteenthDot.x).toBeLessThan(measureEndX - 40);
      expect(lastSixteenthDot.x).toBeCloseTo(298, 0);
    });

    it('dotted-eighth + sixteenth and eighth pairs', () => {
      const notes: MetronomeLayoutNoteAnchor[] = [
        note({ noteIndex: 0, charPosition: 0, x: 100, durationInSixteenths: 3, headCenterX: 112, headCenterXIsNotehead: true }),
        note({ noteIndex: 1, charPosition: 3, x: 132, durationInSixteenths: 1, headCenterX: 140, headCenterXIsNotehead: true }),
        note({ noteIndex: 2, charPosition: 4, x: 148, durationInSixteenths: 2, headCenterX: 156, headCenterXIsNotehead: true }),
        note({ noteIndex: 3, charPosition: 6, x: 168, durationInSixteenths: 2, headCenterX: 176, headCenterXIsNotehead: true }),
        note({ noteIndex: 4, charPosition: 8, x: 200, durationInSixteenths: 3, headCenterX: 212, headCenterXIsNotehead: true }),
        note({ noteIndex: 5, charPosition: 11, x: 232, durationInSixteenths: 1, headCenterX: 240, headCenterXIsNotehead: true }),
        note({ noteIndex: 6, charPosition: 12, x: 248, durationInSixteenths: 2, headCenterX: 256, headCenterXIsNotehead: true }),
        note({ noteIndex: 7, charPosition: 14, x: 268, durationInSixteenths: 2, headCenterX: 276, headCenterXIsNotehead: true }),
      ];

      const placements = layoutWithVisualDots({
        timeSignature,
        subdivisionLevel: 4,
        notePositions: notes,
      });

      assertSameBaseline(placements);
      assertNoDotOverlaps(placements);
    });

    it('rest-only measure (linear spacing, all subdivision dots)', () => {
      const placements = layoutWithVisualDots({
        timeSignature,
        subdivisionLevel: 4,
        notePositions: [],
      });

      expect(placements.length).toBeGreaterThan(0);
      assertSameBaseline(placements);
      assertNoDotOverlaps(placements);
    });

    it('extremely cramped sixteenths (minimum notehead spacing)', () => {
      const notes: MetronomeLayoutNoteAnchor[] = Array.from({ length: 16 }, (_, i) =>
        note({
          noteIndex: i,
          charPosition: i,
          x: 90 + i * 7,
          durationInSixteenths: 1,
          headCenterX: 90 + i * 7,
        }),
      );

      const placements = layoutWithVisualDots({
        timeSignature,
        subdivisionLevel: 4,
        notePositions: notes,
      });

      assertSameBaseline(placements);
      assertNoDotOverlaps(placements);
    });

    it('uses smaller radius for sixteenth than eighth subdivisions', () => {
      expect(metronomeDotRadiusPx('subdivision', 'sixteenth')).toBeLessThan(
        metronomeDotRadiusPx('subdivision', 'eighth'),
      );
    });

    it('spreads trailing subdivisions toward the barline when the measure has slack', () => {
      const notes: MetronomeLayoutNoteAnchor[] = [
        note({ noteIndex: 0, charPosition: 0, x: 100, durationInSixteenths: 4, headCenterX: 107, headCenterXIsNotehead: true }),
        note({ noteIndex: 1, charPosition: 4, x: 160, durationInSixteenths: 4, headCenterX: 167, headCenterXIsNotehead: true }),
        note({ noteIndex: 2, charPosition: 8, x: 220, durationInSixteenths: 4, headCenterX: 227, headCenterXIsNotehead: true }),
        note({ noteIndex: 3, charPosition: 12, x: 240, durationInSixteenths: 4, headCenterX: 247, headCenterXIsNotehead: true }),
      ];

      const placements = layoutWithVisualDots({
        timeSignature,
        subdivisionLevel: 4,
        notePositions: notes,
        measureEndX: 360,
      });

      const trailingSubs = placements.filter(
        (p) => p.tier === 'subdivision' && p.positionInSixteenths > 12,
      );
      expect(trailingSubs.length).toBeGreaterThan(1);
      expect(trailingSubs[trailingSubs.length - 1].x).toBeGreaterThan(300);
      expect(trailingSubs[trailingSubs.length - 1].x - trailingSubs[0].x).toBeGreaterThan(24);
    });
  });
});
