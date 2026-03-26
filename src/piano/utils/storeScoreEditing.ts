import type { NoteDuration, PianoScore } from '../types';
import { durationToBeats, generateNoteId } from '../types';

export function addChordToPart(
  score: PianoScore,
  partId: string,
  pitches: number[],
  dur: NoteDuration,
  isDotted: boolean
): PianoScore {
  const targetPart = score.parts.find((part) => part.id === partId);
  if (!targetPart) return score;

  const beatsPerMeasure =
    (score.timeSignature.numerator / score.timeSignature.denominator) * 4;
  const lastMeasure =
    targetPart.measures[targetPart.measures.length - 1] || { notes: [] };
  const usedBeats = lastMeasure.notes.reduce(
    (sum, note) => sum + durationToBeats(note.duration, note.dotted),
    0
  );
  const noteBeats = durationToBeats(dur, isDotted);
  const newNote = {
    id: generateNoteId(),
    pitches,
    duration: dur,
    dotted: isDotted || undefined,
  };

  const newMeasures =
    usedBeats + noteBeats > beatsPerMeasure + 0.001
      ? [...targetPart.measures, { notes: [newNote] }]
      : [
          ...targetPart.measures.slice(0, -1),
          { notes: [...lastMeasure.notes, newNote] },
        ];

  return {
    ...score,
    parts: score.parts.map((part) =>
      part.id === partId ? { ...part, measures: newMeasures } : part
    ),
  };
}

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
