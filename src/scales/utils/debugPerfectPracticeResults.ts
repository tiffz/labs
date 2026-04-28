import type { PianoScore, ScoreNote } from '../../shared/music/scoreTypes';
import type { PracticeNoteResult } from '../../shared/practice/types';

/** Every non-rest scored note in the exercise (same coverage as FINISH_EXERCISE totals). */
export function collectGradedScoreNotes(score: PianoScore): ScoreNote[] {
  const out: ScoreNote[] = [];
  for (const part of score.parts) {
    for (const measure of part.measures) {
      for (const n of measure.notes) {
        if (!n.rest && n.pitches.length > 0) out.push(n);
      }
    }
  }
  return out;
}

export function perfectPracticeResultForNote(note: ScoreNote): PracticeNoteResult {
  const pitches = [...note.pitches];
  return {
    noteId: note.id,
    expectedPitches: pitches,
    playedPitches: pitches,
    timingOffsetMs: 0,
    pitchCorrect: true,
    timing: 'perfect',
  };
}
