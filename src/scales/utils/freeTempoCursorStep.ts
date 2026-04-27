import type { PianoScore } from '../../shared/music/scoreTypes';

export type AdvanceFreeTempoCursorResult =
  | {
      kind: 'next';
      measureIndex: number;
      noteIndex: number;
      currentNoteIndices: Map<string, number>;
    }
  | { kind: 'complete' };

/**
 * Next free-tempo cursor position after a successful hit, matching
 * {@link ADVANCE_FREE_TEMPO} in the scales store reducer.
 */
export function advanceFreeTempoCursor(
  score: PianoScore,
  measureIndex: number,
  noteIndex: number,
): AdvanceFreeTempoCursorResult {
  const parts = score.parts;
  const maxMeasures = Math.max(...parts.map(p => p.measures.length), 0);
  let mi = measureIndex;
  let ni = noteIndex + 1;
  while (mi < maxMeasures) {
    const maxNotes = Math.max(...parts.map(p => p.measures[mi]?.notes.length ?? 0), 0);
    while (ni < maxNotes) {
      const hasPlayable = parts.some(p => {
        const note = p.measures[mi]?.notes[ni];
        return note && !note.rest;
      });
      if (hasPlayable) {
        const advNoteIndices = new Map<string, number>();
        for (const part of parts) {
          const key = part.hand === 'right' ? 'rh' : part.hand === 'left' ? 'lh' : 'voice';
          advNoteIndices.set(key, ni);
        }
        return {
          kind: 'next',
          measureIndex: mi,
          noteIndex: ni,
          currentNoteIndices: advNoteIndices,
        };
      }
      ni++;
    }
    mi++;
    ni = 0;
  }
  return { kind: 'complete' };
}
