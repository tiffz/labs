import { useEffect, useRef, useCallback } from 'react';
import { useScales, hasEnabledMidiDevice } from '../store';
import type { PracticeNoteResult, TimingJudgment } from '../../shared/practice/types';
import {
  getAllMidiNoteOnTimes,
  getNoteExpectedTime,
  getRecentMidiPresses,
  pruneStale,
} from '../../shared/practice/practiceTimingStore';
import { pitchClassDistance, deriveOctaveOffset } from '../../shared/practice/pitchMatch';
import { isDebugEnabled, logDebugEvent } from '../utils/practiceDebugLog';

const PERFECT_THRESHOLD_MS = 120;
const PERFECT_THRESHOLD_MIC_MS = 200;
const GRACE_PERIOD_MS = 200;
const GRACE_PERIOD_MIC_MS = 350;
const EVAL_BATCH_WINDOW_MS = 40;
const PROXIMITY_SEMITONES = 2;

interface ExpectedNote {
  pitches: number[];
  noteId: string;
  hand: string;
}

interface PassedNote extends ExpectedNote {
  passedAt: number;
}

function pickTimingReferenceTime(
  relevantTimes: number[],
  expectedTime: number,
): number {
  if (relevantTimes.length === 0) return performance.now();
  return relevantTimes.reduce((closest, current) =>
    Math.abs(current - expectedTime) < Math.abs(closest - expectedTime) ? current : closest
  );
}

/**
 * Invisible component that grades MIDI input against expected notes during
 * timed (metronome) playback in the scales app. Adapted from the piano app's
 * PracticeMode evaluation logic.
 *
 * Each note is graded as perfect/early/late/wrong_pitch/missed based on
 * timing offset from the expected beat position. Results are dispatched
 * via ADD_PRACTICE_RESULT so ScoreDisplay can render visual feedback.
 */
export default function TimedGrader() {
  const { state, dispatch } = useScales();
  const { score, activeMidiNotes, activeExercise, isPlaying, microphoneActive } = state;
  const micOnly = microphoneActive && !hasEnabledMidiDevice(state);
  const perfectThreshold = micOnly ? PERFECT_THRESHOLD_MIC_MS : PERFECT_THRESHOLD_MS;
  const gracePeriod = micOnly ? GRACE_PERIOD_MIC_MS : GRACE_PERIOD_MS;

  const expectedRef = useRef<Map<string, ExpectedNote>>(new Map());
  const evaluatedNoteIds = useRef<Set<string>>(new Set());
  const recentlyPassedRef = useRef<PassedNote[]>([]);
  const graceTimerRef = useRef<number | null>(null);
  const evalTimerRef = useRef<number | null>(null);
  const octaveOffsetRef = useRef<number | null>(null);

  const allowOctaveFlex = activeExercise?.hand !== 'both';

  useEffect(() => {
    evaluatedNoteIds.current = new Set();
    recentlyPassedRef.current = [];
    octaveOffsetRef.current = null;
  }, [state.currentRunStartTime]);

  const getAnchoredPitches = useCallback((pitches: number[], played: number[]): number[] => {
    if (!allowOctaveFlex) return pitches;

    if (octaveOffsetRef.current !== null) {
      return pitches.map(p => p + octaveOffsetRef.current!);
    }

    const offset = deriveOctaveOffset(played, pitches);
    if (offset === null) return pitches;

    octaveOffsetRef.current = offset;
    return pitches.map(p => p + offset);
  }, [allowOctaveFlex]);

  const tryEvaluateNote = useCallback((
    expected: ExpectedNote,
    played: number[],
    midiTimes: ReadonlyMap<number, number>,
  ): boolean => {
    if (evaluatedNoteIds.current.has(expected.noteId)) return true;
    if (played.length === 0) return false;

    const expectedTime = getNoteExpectedTime(expected.noteId) ?? performance.now();
    const anchored = getAnchoredPitches(expected.pitches, played);

    const isAttempting = played.some(p =>
      anchored.some(ep =>
        Math.abs(p - ep) <= PROXIMITY_SEMITONES || pitchClassDistance(p, ep) === 0
      )
    );
    if (!isAttempting) return false;

    const pitchCorrect = anchored.every(ep =>
      played.some(p => p === ep || (allowOctaveFlex && pitchClassDistance(p, ep) === 0))
    );

    const relevantTimes = played
      .filter(p => anchored.some(ep =>
        p === ep || pitchClassDistance(p, ep) === 0 || Math.abs(p - ep) <= PROXIMITY_SEMITONES
      ))
      .map(p => midiTimes.get(p))
      .filter((t): t is number => t !== undefined);

    const press = pickTimingReferenceTime(relevantTimes, expectedTime);
    const timingOffsetMs = press - expectedTime;

    let timing: TimingJudgment;
    if (!pitchCorrect) {
      timing = isAttempting ? 'wrong_pitch' : 'missed';
    } else if (Math.abs(timingOffsetMs) < perfectThreshold) {
      timing = 'perfect';
    } else if (timingOffsetMs < 0) {
      timing = 'early';
    } else {
      timing = 'late';
    }

    const result: PracticeNoteResult = {
      noteId: expected.noteId,
      expectedPitches: anchored,
      playedPitches: played.filter(p =>
        anchored.some(ep => p === ep || pitchClassDistance(p, ep) === 0)
      ),
      timingOffsetMs,
      pitchCorrect,
      timing,
    };

    if (isDebugEnabled()) {
      logDebugEvent({
        type: 'eval_attempt', t: performance.now(), noteId: expected.noteId,
        played, expectedPitches: anchored, pitchCorrect, timing,
        timingOffsetMs,
        midiTimesSnapshot: Array.from(midiTimes.entries()),
        expectedTime: getNoteExpectedTime(expected.noteId) ?? null,
      });
    }

    dispatch({ type: 'ADD_PRACTICE_RESULT', result });
    evaluatedNoteIds.current.add(expected.noteId);
    return true;
  }, [dispatch, allowOctaveFlex, getAnchoredPitches, perfectThreshold]);

  const evaluateTimed = useCallback((played: number[]) => {
    const midiTimes = getAllMidiNoteOnTimes();

    for (const [, expected] of expectedRef.current) {
      tryEvaluateNote(expected, played, midiTimes);
    }

    const remaining: PassedNote[] = [];
    for (const passed of recentlyPassedRef.current) {
      if (evaluatedNoteIds.current.has(passed.noteId)) continue;
      const wasEvaluated = tryEvaluateNote(passed, played, midiTimes);
      if (!wasEvaluated) remaining.push(passed);
    }
    recentlyPassedRef.current = remaining;
  }, [tryEvaluateNote]);

  // Track expected notes from current playback position
  useEffect(() => {
    if (!score || !isPlaying) {
      expectedRef.current = new Map();
      return;
    }

    const newExpected = new Map<string, ExpectedNote>();
    for (const part of score.parts) {
      const measureIdx = state.currentMeasureIndex;
      const noteIdx = state.currentNoteIndices.get(part.id) ?? -1;

      if (measureIdx >= 0 && measureIdx < part.measures.length && noteIdx >= 0) {
        const note = part.measures[measureIdx]?.notes[noteIdx];
        if (note && !note.rest) {
          newExpected.set(part.id, {
            pitches: note.pitches,
            noteId: note.id,
            hand: part.hand ?? 'right',
          });
        }
      }
    }

    const prev = expectedRef.current;
    const same = newExpected.size === prev.size &&
      [...newExpected.entries()].every(([k, v]) => prev.get(k)?.noteId === v.noteId);
    if (same) return;

    // Move unevaluated previous notes to "recently passed" for grace period
    for (const [, prevNote] of prev) {
      if (!evaluatedNoteIds.current.has(prevNote.noteId)) {
        const stillCurrent = [...newExpected.values()].some(n => n.noteId === prevNote.noteId);
        if (!stillCurrent) {
          recentlyPassedRef.current.push({ ...prevNote, passedAt: performance.now() });
        }
      }
    }

    if (isDebugEnabled() && newExpected.size > 0) {
      logDebugEvent({
        type: 'expected_change', t: performance.now(),
        expected: [...newExpected.values()].map(e => ({
          noteId: e.noteId, pitches: e.pitches, hand: e.hand,
        })),
      });
    }

    expectedRef.current = newExpected;
  }, [score, isPlaying, state.currentMeasureIndex, state.currentNoteIndices]);

  // Grace period: try late evaluation, then mark missed
  useEffect(() => {
    if (!isPlaying) {
      recentlyPassedRef.current = [];
      if (graceTimerRef.current) {
        clearInterval(graceTimerRef.current);
        graceTimerRef.current = null;
      }
      return;
    }

    graceTimerRef.current = window.setInterval(() => {
      const now = performance.now();
      const beatDurationMs = 60000 / (activeExercise?.bpm || 80);
      const recentWindow = Math.max(beatDurationMs * 1.5, 800);
      const recentPlayed = getRecentMidiPresses(recentWindow);
      const midiTimes = getAllMidiNoteOnTimes();
      const remaining: PassedNote[] = [];

      for (const passed of recentlyPassedRef.current) {
        if (evaluatedNoteIds.current.has(passed.noteId)) continue;

        if (recentPlayed.length > 0) {
          const wasEvaluated = tryEvaluateNote(passed, recentPlayed, midiTimes);
          if (wasEvaluated) continue;
        }

        if (now - passed.passedAt >= gracePeriod) {
          if (isDebugEnabled()) {
            logDebugEvent({ type: 'grace_miss', t: now, noteId: passed.noteId,
              expectedPitches: passed.pitches, passedAt: passed.passedAt });
          }
          dispatch({
            type: 'ADD_PRACTICE_RESULT',
            result: {
              noteId: passed.noteId,
              expectedPitches: passed.pitches,
              playedPitches: [],
              timingOffsetMs: 0,
              pitchCorrect: false,
              timing: 'missed',
            },
          });
          evaluatedNoteIds.current.add(passed.noteId);
        } else {
          remaining.push(passed);
        }
      }
      recentlyPassedRef.current = remaining;
      pruneStale();
    }, 50);

    return () => {
      if (graceTimerRef.current) {
        clearInterval(graceTimerRef.current);
        graceTimerRef.current = null;
      }
    };
  }, [isPlaying, dispatch, activeExercise?.bpm, tryEvaluateNote, gracePeriod]);

  // Debounced evaluation on MIDI input changes
  useEffect(() => {
    if (!isPlaying || !score) return;

    if (evalTimerRef.current) clearTimeout(evalTimerRef.current);
    evalTimerRef.current = window.setTimeout(() => {
      evalTimerRef.current = null;
      const beatDurationMs = 60000 / (activeExercise?.bpm || 80);
      const recentWindow = Math.max(beatDurationMs * 1.2, 600);
      const played = getRecentMidiPresses(recentWindow);
      if (played.length === 0) return;
      evaluateTimed(played);
      pruneStale();
    }, EVAL_BATCH_WINDOW_MS);

    return () => {
      if (evalTimerRef.current) {
        clearTimeout(evalTimerRef.current);
        evalTimerRef.current = null;
      }
    };
  }, [activeMidiNotes, isPlaying, score, activeExercise?.bpm, evaluateTimed]);

  return null;
}
