import { Beam, Fraction, StaveNote } from 'vexflow';
import type { RenderContext } from 'vexflow';
import type { TimeSignature } from '../types';

/** Compound-meter beam groups (6/8, 12/8, …) beam in threes; simple meters beam by beat. */
export function getChordBeamGroups(timeSignature: TimeSignature): Fraction[] {
  const { numerator, denominator } = timeSignature;
  if (numerator > 3 && numerator % 3 === 0) {
    return [new Fraction(3, denominator)];
  }
  if (denominator === 8) {
    return [new Fraction(3, 8)];
  }
  return [new Fraction(1, denominator)];
}

export function generateChordClefBeams(
  notes: StaveNote[],
  timeSignature: TimeSignature,
  clef: 'treble' | 'bass',
): Beam[] {
  const stemDirection = clef === 'treble' ? 1 : -1;
  const beams = Beam.generateBeams(notes, {
    groups: getChordBeamGroups(timeSignature),
    beamRests: false,
    stemDirection,
  });
  notes.forEach((note) => {
    if (!note.isRest()) {
      note.setStemDirection(stemDirection);
    }
  });
  return beams;
}

export function suppressBeamedNoteFlags(beams: Beam[]): void {
  const beamedNotes = new Set<StaveNote>();
  beams.forEach((beam) => {
    beam.getNotes().forEach((note) => {
      beamedNotes.add(note as StaveNote);
    });
  });
  beamedNotes.forEach((note) => {
    note.setFlagStyle({ fillStyle: 'transparent', strokeStyle: 'transparent' });
  });
}

/** VexFlow sometimes omits stem SVG for beamed chord clusters until explicitly redrawn. */
export function redrawBeamedStemsIfMissing(
  notes: StaveNote[],
  context: RenderContext,
): void {
  notes.forEach((note) => {
    if (note.isRest()) return;
    const normalizedDuration = note.getDuration().replace('r', '').replace('d', '');
    if (normalizedDuration === 'w' || normalizedDuration === 'h') return;

    const stem = note.getStem();
    if (!stem) return;

    const svgEl = note.getSVGElement();
    const stemEls = svgEl?.querySelectorAll(
      '.vf-stem, path[class*="stem"], line[class*="stem"]',
    );
    if (!stemEls || stemEls.length === 0) {
      try {
        stem.setContext(context).draw();
      } catch {
        // Non-critical — beam may still render acceptably.
      }
    }
  });
}

export function removeOrphanBeamedFlags(container: ParentNode): void {
  container.querySelectorAll('.vf-flag, [class*="vf-flag"]').forEach((node) => {
    const classList = node instanceof Element ? node.getAttribute('class') ?? '' : '';
    if (!classList.includes('stem')) {
      node.remove();
    }
  });
}
