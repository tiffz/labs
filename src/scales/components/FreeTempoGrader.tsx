import { useEffect, useRef } from 'react';
import { useScales } from '../store';
import { getLatestAttackTime, canAdvanceWhileWaitingForRelease } from '../../shared/practice/freeTempoInput';
import { getAllMidiNoteOnTimes } from '../../shared/practice/practiceTimingStore';
import { pitchClassDistance, deriveOctaveOffset } from '../../shared/practice/pitchMatch';
import type { PracticeNoteResult } from '../../shared/practice/types';
import { isDebugEnabled, logDebugEvent } from '../utils/practiceDebugLog';
import {
  matchBothHandsSlot,
  midiPitchClass,
  partitionPlayedForBothHandsLegato,
} from '../utils/freeTempoSlotMatch';

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
  const {
    score,
    activeMidiNotes,
    freeTempoMeasureIndex,
    freeTempoNoteIndex,
    activeExercise,
    currentRunStartTime,
    hasCompletedRun,
  } = state;
  const waitingForReleaseRef = useRef(false);
  const lastAdvanceInputTimeRef = useRef(0);
  const octaveOffsetRef = useRef<number | null>(null);
  const residualPitchClassesRef = useRef<Set<number>>(new Set());

  const allowOctaveFlex = activeExercise?.hand !== 'both';

  useEffect(() => {
    octaveOffsetRef.current = null;
    residualPitchClassesRef.current = new Set();
  }, [activeExercise?.exerciseId, activeExercise?.stageId]);

  /**
   * Each run is keyed by `currentRunStartTime` (START_PRACTICE_RUN /
   * RESTART_FREE_TEMPO). Reset the octave anchor every run; after the first
   * full completion, require a key release before the first note of the next
   * run counts — otherwise held keys match the first expected pitch early.
   */
  useEffect(() => {
    if (currentRunStartTime == null) return;
    octaveOffsetRef.current = null;
    residualPitchClassesRef.current = new Set();
    if (hasCompletedRun) {
      waitingForReleaseRef.current = true;
    }
  }, [currentRunStartTime, hasCompletedRun]);

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

    const slotPitchClasses = new Set(expectedPitches.map(midiPitchClass));
    const { foreignWrong, playedForChord } = partitionPlayedForBothHandsLegato(
      played,
      slotPitchClasses,
      residualPitchClassesRef.current,
    );

    let matchedPitches: number[];
    /** When set, dispatch one practice row per stave note (both-hands chord). */
    let bothHandsPerNote: { noteId: string; expectedMidi: number; playedMidi: number }[] | null =
      null;

    // Legacy helper for strict-MIDI branch (exact key match, not octave-flex).
    const wrongNotes = played.filter(p =>
      !expectedPitches.some(ep => pitchClassDistance(p, ep) === 0),
    );

    if (allowOctaveFlex) {
      if (foreignWrong.length > 0) {
        dispatch({ type: 'WRONG_NOTE_FLASH', notes: foreignWrong });
        return;
      }
      const pcMatch = expectedPitches.every(ep =>
        playedForChord.some(p => pitchClassDistance(p, ep) === 0),
      );
      if (!pcMatch) return;

      if (octaveOffsetRef.current === null) {
        const forAnchor = played.filter(
          p =>
            slotPitchClasses.has(midiPitchClass(p))
            || residualPitchClassesRef.current.has(midiPitchClass(p)),
        );
        octaveOffsetRef.current = deriveOctaveOffset(
          forAnchor.length > 0 ? forAnchor : played,
          expectedPitches,
        ) ?? 0;
      }

      const anchored = expectedPitches.map(p => p + octaveOffsetRef.current!);
      if (!anchored.every(p => played.includes(p))) return;
      matchedPitches = anchored;
    } else if (score.parts.length >= 2) {
      if (foreignWrong.length > 0) {
        dispatch({ type: 'WRONG_NOTE_FLASH', notes: foreignWrong });
        return;
      }
      const bh = matchBothHandsSlot(score, mi, ni, playedForChord);
      if (!bh.ok) {
        if (bh.wrongNotes.length > 0) dispatch({ type: 'WRONG_NOTE_FLASH', notes: bh.wrongNotes });
        return;
      }
      matchedPitches = bh.consumedMidi;
      bothHandsPerNote = bh.perNote;
    } else {
      if (foreignWrong.length > 0) {
        dispatch({ type: 'WRONG_NOTE_FLASH', notes: foreignWrong });
        return;
      }
      if (!expectedPitches.every(p => played.includes(p))) {
        if (wrongNotes.length > 0) dispatch({ type: 'WRONG_NOTE_FLASH', notes: wrongNotes });
        return;
      }
      matchedPitches = expectedPitches;
    }

    if (bothHandsPerNote) {
      for (const row of bothHandsPerNote) {
        const result: PracticeNoteResult = {
          noteId: row.noteId,
          expectedPitches: [row.expectedMidi],
          playedPitches: [row.playedMidi],
          timingOffsetMs: 0,
          pitchCorrect: true,
          timing: 'perfect',
        };
        if (isDebugEnabled()) {
          logDebugEvent({
            type: 'eval_attempt',
            t: performance.now(),
            noteId: row.noteId,
            played,
            expectedPitches: [row.expectedMidi],
            pitchCorrect: true,
            timing: 'perfect',
            timingOffsetMs: 0,
            midiTimesSnapshot: Array.from(getAllMidiNoteOnTimes().entries()),
            expectedTime: null,
          });
        }
        dispatch({ type: 'ADD_PRACTICE_RESULT', result });
      }
    } else {
      for (const noteId of noteIds) {
        const result: PracticeNoteResult = {
          noteId,
          expectedPitches,
          playedPitches: played.filter(p => matchedPitches.includes(p)),
          timingOffsetMs: 0,
          pitchCorrect: true,
          timing: 'perfect',
        };
        if (isDebugEnabled()) {
          logDebugEvent({
            type: 'eval_attempt', t: performance.now(), noteId,
            played, expectedPitches, pitchCorrect: true, timing: 'perfect',
            timingOffsetMs: 0, midiTimesSnapshot: Array.from(getAllMidiNoteOnTimes().entries()),
            expectedTime: null,
          });
        }
        dispatch({ type: 'ADD_PRACTICE_RESULT', result });
      }
    }

    // Gate next advance behind key release
    waitingForReleaseRef.current = true;
    const latestAttack = getLatestAttackTime(played, getAllMidiNoteOnTimes());
    if (latestAttack !== null) {
      lastAdvanceInputTimeRef.current = latestAttack;
    }

    residualPitchClassesRef.current = new Set(expectedPitches.map(midiPitchClass));
    dispatch({ type: 'ADVANCE_FREE_TEMPO' });
  }, [activeMidiNotes, score, freeTempoMeasureIndex, freeTempoNoteIndex, dispatch, allowOctaveFlex]);

  return null;
}
