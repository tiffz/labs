import { useEffect, useRef } from 'react';
import { useScales } from '../store';
import { getLatestAttackTime, canAdvanceWhileWaitingForRelease } from '../../shared/practice/freeTempoInput';
import { getAllMidiNoteOnTimes } from '../../shared/practice/practiceTimingStore';
import { pitchClassDistance, deriveOctaveOffset } from '../../shared/practice/pitchMatch';
import type { PracticeNoteResult } from '../../shared/practice/types';

/**
 * Invisible component that evaluates MIDI input against the expected notes
 * in a free-tempo exercise, following the same release-gated pattern as the
 * piano app's PracticeMode.
 *
 * Only correct hits are recorded — wrong notes are silently ignored so the
 * player can experiment without penalty.
 *
 * For right-hand-only exercises, matching is octave-flexible: the first note
 * anchors the octave offset, and subsequent notes are checked relative to
 * that anchor. This lets the player choose any starting octave.
 */
export default function FreeTempoGrader() {
  const { state, dispatch } = useScales();
  const { score, activeMidiNotes, freeTempoMeasureIndex, freeTempoNoteIndex, activeExercise } = state;
  const waitingForReleaseRef = useRef(false);
  const lastAdvanceInputTimeRef = useRef(0);
  const octaveOffsetRef = useRef<number | null>(null);

  const allowOctaveFlex = activeExercise?.hand !== 'both';

  useEffect(() => {
    octaveOffsetRef.current = null;
  }, [activeExercise?.exerciseId, activeExercise?.stageId]);

  useEffect(() => {
    if (activeMidiNotes.size === 0) {
      waitingForReleaseRef.current = false;
      return;
    }

    if (!score) return;

    const mi = freeTempoMeasureIndex;
    const ni = freeTempoNoteIndex;
    if (ni < 0) return;

    const played = Array.from(activeMidiNotes);

    // Release gating: after advancing, require keys to be released and
    // a new attack before grading the next note (prevents double-advance).
    if (waitingForReleaseRef.current) {
      const canAdvance = canAdvanceWhileWaitingForRelease({
        played,
        midiTimes: getAllMidiNoteOnTimes(),
        lastAdvanceInputTime: lastAdvanceInputTimeRef.current,
        canBypassForTieContinuation: false,
      });
      if (!canAdvance) return;
      waitingForReleaseRef.current = false;
    }

    // Gather expected pitches across all parts at this position
    const expectedPitches: number[] = [];
    const noteIds: string[] = [];

    for (const part of score.parts) {
      const note = part.measures[mi]?.notes[ni];
      if (note && !note.rest) {
        expectedPitches.push(...note.pitches);
        noteIds.push(note.id);
      }
    }

    if (expectedPitches.length === 0) return;

    let matchedPitches: number[];

    // Identify played notes that don't match any expected pitch class
    const wrongNotes = played.filter(p =>
      !expectedPitches.some(ep => pitchClassDistance(p, ep) === 0),
    );

    if (allowOctaveFlex) {
      const pcMatch = expectedPitches.every(ep =>
        played.some(p => pitchClassDistance(p, ep) === 0),
      );
      if (!pcMatch) {
        if (wrongNotes.length > 0) dispatch({ type: 'WRONG_NOTE_FLASH', notes: wrongNotes });
        return;
      }

      if (octaveOffsetRef.current === null) {
        octaveOffsetRef.current = deriveOctaveOffset(played, expectedPitches) ?? 0;
      }

      const anchored = expectedPitches.map(p => p + octaveOffsetRef.current!);
      if (!anchored.every(p => played.includes(p))) return;
      matchedPitches = anchored;
    } else {
      if (!expectedPitches.every(p => played.includes(p))) {
        if (wrongNotes.length > 0) dispatch({ type: 'WRONG_NOTE_FLASH', notes: wrongNotes });
        return;
      }
      matchedPitches = expectedPitches;
    }

    // Record a correct result for each part's note
    for (const noteId of noteIds) {
      const result: PracticeNoteResult = {
        noteId,
        expectedPitches,
        playedPitches: played.filter(p => matchedPitches.includes(p)),
        timingOffsetMs: 0,
        pitchCorrect: true,
        timing: 'perfect',
      };
      dispatch({ type: 'ADD_PRACTICE_RESULT', result });
    }

    // Gate next advance behind key release
    waitingForReleaseRef.current = true;
    const latestAttack = getLatestAttackTime(played, getAllMidiNoteOnTimes());
    if (latestAttack !== null) {
      lastAdvanceInputTimeRef.current = latestAttack;
    }

    dispatch({ type: 'ADVANCE_FREE_TEMPO' });
  }, [activeMidiNotes, score, freeTempoMeasureIndex, freeTempoNoteIndex, dispatch, allowOctaveFlex]);

  return null;
}
