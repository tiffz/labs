import { useEffect, useRef } from 'react';
import { useScales } from '../store';
import { getLatestAttackTime, canAdvanceWhileWaitingForRelease } from '../../shared/practice/freeTempoInput';
import { getAllMidiNoteOnTimes } from '../../shared/practice/practiceTimingStore';
import { pitchClassDistance, deriveOctaveOffset } from '../../shared/practice/pitchMatch';
import type { PianoScore } from '../../shared/music/scoreTypes';
import type { SessionExercise } from '../curriculum/types';
import { advanceFreeTempoCursor } from '../utils/freeTempoCursorStep';
import {
  countFreeTempoPositions,
  matchBothHandsSlot,
  midiPitchClass,
  partitionPlayedForBothHandsLegato,
} from '../utils/freeTempoSlotMatch';

/**
 * Invisible free-tempo "dry run" before START_PRACTICE_RUN. Mirrors
 * {@link FreeTempoGrader} matching rules but keeps cursor state local so the
 * score UI stays frozen until a real run. On a full clean pass (no wrong
 * pitches between), fires {@link onPerfectDryRun} once.
 */
export default function PreStartFreeTempoProbe({
  score,
  hand,
  exerciseId,
  stageId,
  onPerfectDryRun,
}: {
  score: PianoScore;
  hand: SessionExercise['hand'];
  exerciseId: string;
  stageId: string;
  onPerfectDryRun: () => void;
}) {
  const { state } = useScales();
  const { activeMidiNotes } = state;

  const probeMi = useRef(0);
  const probeNi = useRef(0);
  const waitingForReleaseRef = useRef(false);
  const lastAdvanceInputTimeRef = useRef(0);
  const octaveOffsetRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const onPerfectRef = useRef(onPerfectDryRun);
  const matchedStepsRef = useRef(0);
  const requiredHitsRef = useRef(0);
  /** Pitch classes from the last matched chord — lets legato overlap not reset the dry run. */
  const residualPitchClassesRef = useRef<Set<number>>(new Set());

  const allowOctaveFlex = hand !== 'both';

  useEffect(() => {
    onPerfectRef.current = onPerfectDryRun;
  }, [onPerfectDryRun]);

  useEffect(() => {
    probeMi.current = 0;
    probeNi.current = 0;
    waitingForReleaseRef.current = false;
    lastAdvanceInputTimeRef.current = 0;
    octaveOffsetRef.current = null;
    firedRef.current = false;
    matchedStepsRef.current = 0;
    requiredHitsRef.current = countFreeTempoPositions(score);
    residualPitchClassesRef.current = new Set();
  }, [exerciseId, stageId, score]);

  useEffect(() => {
    if (firedRef.current) return;

    if (activeMidiNotes.size === 0) {
      waitingForReleaseRef.current = false;
      return;
    }

    const mi = probeMi.current;
    const ni = probeNi.current;
    if (ni < 0) return;

    const played = Array.from(activeMidiNotes);

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

    const expectedPitches: number[] = [];
    for (const part of score.parts) {
      const note = part.measures[mi]?.notes[ni];
      if (note && !note.rest) {
        expectedPitches.push(...note.pitches);
      }
    }

    if (expectedPitches.length === 0) return;

    const slotPitchClasses = new Set(expectedPitches.map(midiPitchClass));
    const { foreignWrong, playedForChord } = partitionPlayedForBothHandsLegato(
      played,
      slotPitchClasses,
      residualPitchClassesRef.current,
    );

    const wrongNotes = played.filter(p =>
      !expectedPitches.some(ep => pitchClassDistance(p, ep) === 0),
    );

    const resetProbe = () => {
      probeMi.current = 0;
      probeNi.current = 0;
      octaveOffsetRef.current = null;
      waitingForReleaseRef.current = false;
      lastAdvanceInputTimeRef.current = 0;
      matchedStepsRef.current = 0;
      residualPitchClassesRef.current = new Set();
    };

    let matchOk = false;

    if (!allowOctaveFlex && score.parts.length >= 2) {
      if (foreignWrong.length > 0) {
        resetProbe();
        return;
      }
      const bh = matchBothHandsSlot(score, mi, ni, playedForChord);
      matchOk = bh.ok;
      if (!matchOk) {
        if (bh.wrongNotes.length > 0) resetProbe();
        return;
      }
    } else if (allowOctaveFlex) {
      if (foreignWrong.length > 0) {
        resetProbe();
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
      matchOk = true;
    } else {
      if (foreignWrong.length > 0) {
        resetProbe();
        return;
      }
      if (!expectedPitches.every(p => played.includes(p))) {
        if (wrongNotes.length > 0) resetProbe();
        return;
      }
      matchOk = true;
    }

    if (!matchOk) return;

    waitingForReleaseRef.current = true;
    const latestAttack = getLatestAttackTime(played, getAllMidiNoteOnTimes());
    if (latestAttack !== null) {
      lastAdvanceInputTimeRef.current = latestAttack;
    }

    residualPitchClassesRef.current = new Set(expectedPitches.map(midiPitchClass));
    matchedStepsRef.current += 1;
    const stepped = advanceFreeTempoCursor(score, probeMi.current, probeNi.current);
    if (stepped.kind === 'complete') {
      if (
        requiredHitsRef.current < 1
        || matchedStepsRef.current < requiredHitsRef.current
      ) {
        resetProbe();
        return;
      }
      firedRef.current = true;
      onPerfectRef.current();
      return;
    }
    probeMi.current = stepped.measureIndex;
    probeNi.current = stepped.noteIndex;
  }, [activeMidiNotes, score, allowOctaveFlex]);

  return null;
}
