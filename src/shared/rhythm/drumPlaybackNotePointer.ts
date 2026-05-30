import type { ParsedRhythm, TimeSignature } from '../rhythm/types';

export type DrumPlaybackNotePointer = {
  measureIndex: number;
  noteIndex: number;
};

export function sixteenthsPerMeasureForTimeSignature(timeSignature: TimeSignature): number {
  return timeSignature.denominator === 8
    ? timeSignature.numerator * 2
    : timeSignature.numerator * 4;
}

/** Map elapsed seconds within a looping pattern to the active drum note. */
export function resolveDrumPlaybackNotePointer(
  rhythm: ParsedRhythm,
  timeSignature: TimeSignature,
  bpm: number,
  elapsedSec: number,
): DrumPlaybackNotePointer | null {
  if (!rhythm.isValid || rhythm.measures.length === 0 || elapsedSec < 0 || bpm <= 0) {
    return null;
  }

  const msPerSixteenth = 60_000 / bpm / 4;
  const sixteenthsPerMeasure = sixteenthsPerMeasureForTimeSignature(timeSignature);
  const measureCount = rhythm.measures.length;
  const sixteenthsPerPattern = sixteenthsPerMeasure * measureCount;
  const totalSixteenths = (elapsedSec * 1000) / msPerSixteenth;
  const positionInPattern =
    ((totalSixteenths % sixteenthsPerPattern) + sixteenthsPerPattern) % sixteenthsPerPattern;
  const measureIndex = Math.floor(positionInPattern / sixteenthsPerMeasure);
  const positionInMeasure = positionInPattern % sixteenthsPerMeasure;

  const measure = rhythm.measures[measureIndex];
  if (!measure) return null;

  let cumulativePosition = 0;
  for (let i = 0; i < measure.notes.length; i++) {
    const noteEnd = cumulativePosition + measure.notes[i].durationInSixteenths;
    if (positionInMeasure >= cumulativePosition && positionInMeasure < noteEnd) {
      return { measureIndex, noteIndex: i };
    }
    cumulativePosition = noteEnd;
  }

  const lastIndex = Math.max(0, measure.notes.length - 1);
  return { measureIndex, noteIndex: lastIndex };
}
