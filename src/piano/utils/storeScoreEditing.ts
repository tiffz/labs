import type { NoteDuration, PianoScore } from '../types';
import { durationToBeats, generateNoteId } from '../types';

// Re-export from shared for backwards compatibility with existing callers.
export { findNextFreeTempoPosition } from '../../shared/practice/freeTempoNavigation';

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
