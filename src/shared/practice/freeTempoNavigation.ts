import type { PianoScore } from '../music/scoreTypes';

/**
 * Scan forward through practiced parts to find the next non-rest note position.
 */
export function findNextFreeTempoPosition(
  practicedParts: PianoScore['parts'],
  startMeasureIndex: number,
  startNoteIndex: number
): { measureIndex: number; noteIndex: number } | null {
  if (practicedParts.length === 0) return null;
  const maxMeasures = Math.max(...practicedParts.map((part) => part.measures.length), 0);
  let measureIndex = Math.max(0, startMeasureIndex);
  let noteIndex = Math.max(-1, startNoteIndex) + 1;

  while (measureIndex < maxMeasures) {
    const maxNotesInMeasure = Math.max(
      ...practicedParts.map((part) => part.measures[measureIndex]?.notes.length ?? 0),
      0
    );
    while (noteIndex < maxNotesInMeasure) {
      const hasPlayableNote = practicedParts.some((part) => {
        const note = part.measures[measureIndex]?.notes[noteIndex];
        return Boolean(note && !note.rest);
      });
      if (hasPlayableNote) {
        return { measureIndex, noteIndex };
      }
      noteIndex += 1;
    }
    measureIndex += 1;
    noteIndex = 0;
  }

  return null;
}
