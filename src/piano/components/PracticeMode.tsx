import React, { useEffect, useRef, useCallback } from 'react';
import { usePiano } from '../store';
import type { PracticeNoteResult, TimingJudgment } from '../types';
import {
  getAllMidiNoteOnTimes,
  getNoteExpectedTime,
} from '../utils/practiceTimingStore';

const PERFECT_THRESHOLD_MS = 120;
const GRACE_PERIOD_MS = 200;
const PROXIMITY_SEMITONES = 12;

interface ExpectedNote { pitches: number[]; noteId: string; hand: string }
interface PassedNote extends ExpectedNote { passedAt: number }

function isAttemptingNote(played: number[], expectedPitches: number[]): boolean {
  return played.some(p => expectedPitches.some(ep => Math.abs(p - ep) <= PROXIMITY_SEMITONES));
}

const PracticeMode: React.FC = () => {
  const { state, dispatch, stopMode } = usePiano();

  const isPracticing = state.activeMode === 'practice' || state.activeMode === 'free-practice';
  const isFreeTempo = state.activeMode === 'free-practice';

  const expectedByPartRef = useRef<Map<string, ExpectedNote>>(new Map());
  const partsPlayedRef = useRef<Set<string>>(new Set());
  const waitingForReleaseRef = useRef(false);
  const evaluatedNoteIds = useRef<Set<string>>(new Set());
  const recentlyPassedRef = useRef<PassedNote[]>([]);
  const graceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    evaluatedNoteIds.current = new Set();
    recentlyPassedRef.current = [];
    expectedByPartRef.current = new Map();
  }, [state.currentRunStartTime]);

  const evaluateFreeTempo = useCallback((played: number[]) => {
    if (waitingForReleaseRef.current) return;

    for (const [partId, expected] of expectedByPartRef.current) {
      if (partsPlayedRef.current.has(partId)) continue;

      const pitchCorrect = expected.pitches.length > 0 &&
        expected.pitches.every(p => played.includes(p));

      if (pitchCorrect) {
        const result: PracticeNoteResult = {
          noteId: expected.noteId,
          expectedPitches: expected.pitches,
          playedPitches: expected.pitches.filter(p => played.includes(p)),
          timingOffsetMs: 0,
          pitchCorrect: true,
          timing: 'perfect',
        };
        dispatch({ type: 'ADD_PRACTICE_RESULT', result });
        evaluatedNoteIds.current.add(expected.noteId);
        partsPlayedRef.current.add(partId);
      }
    }

    const allExpected = [...expectedByPartRef.current.keys()];
    if (allExpected.length > 0 && allExpected.every(id => partsPlayedRef.current.has(id))) {
      waitingForReleaseRef.current = true;
      dispatch({ type: 'ADVANCE_FREE_TEMPO' });
    }
  }, [dispatch]);

  const tryEvaluateNote = useCallback((
    expected: ExpectedNote,
    played: number[],
    midiTimes: ReadonlyMap<number, number>,
  ): boolean => {
    if (evaluatedNoteIds.current.has(expected.noteId)) return true;
    if (!isAttemptingNote(played, expected.pitches)) return false;

    const pitchCorrect = expected.pitches.every(p => played.includes(p));

    const expectedTime = getNoteExpectedTime(expected.noteId) ?? performance.now();
    const matchingPitches = expected.pitches.filter(p => played.includes(p));
    const relevantKeyTimes = matchingPitches
      .map(p => midiTimes.get(p))
      .filter((t): t is number => t !== undefined);
    const earliestPress = relevantKeyTimes.length > 0 ? Math.min(...relevantKeyTimes) : performance.now();
    const timingOffsetMs = earliestPress - expectedTime;

    let timing: TimingJudgment;
    if (!pitchCorrect) {
      timing = 'missed';
    } else if (Math.abs(timingOffsetMs) < PERFECT_THRESHOLD_MS) {
      timing = 'perfect';
    } else if (timingOffsetMs < 0) {
      timing = 'early';
    } else {
      timing = 'late';
    }

    dispatch({ type: 'ADD_PRACTICE_RESULT', result: {
      noteId: expected.noteId,
      expectedPitches: expected.pitches,
      playedPitches: matchingPitches.length > 0 ? matchingPitches : played,
      timingOffsetMs,
      pitchCorrect,
      timing,
    } });
    evaluatedNoteIds.current.add(expected.noteId);
    return true;
  }, [dispatch]);

  const evaluateTimedWithTiming = useCallback((played: number[]) => {
    const midiTimes = getAllMidiNoteOnTimes();

    for (const [, expected] of expectedByPartRef.current) {
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

  useEffect(() => {
    if (!isPracticing || !state.score) {
      expectedByPartRef.current = new Map();
      evaluatedNoteIds.current = new Set();
      recentlyPassedRef.current = [];
      return;
    }
    if (!state.isPlaying && !isFreeTempo) return;

    const prevExpected = expectedByPartRef.current;
    const newExpected = new Map<string, ExpectedNote>();

    const practicedHands: string[] = [];
    if (state.practiceRightHand) practicedHands.push('right');
    if (state.practiceLeftHand) practicedHands.push('left');

    for (const hand of practicedHands) {
      const part = state.score.parts.find(p => p.hand === hand);
      if (!part) continue;

      const measureIdx = isFreeTempo ? state.freeTempoMeasureIndex : state.currentMeasureIndex;
      const noteIdx = isFreeTempo
        ? state.freeTempoNoteIndex
        : (state.currentNoteIndices.get(part.id) ?? -1);

      if (measureIdx >= 0 && measureIdx < part.measures.length && noteIdx >= 0) {
        const measure = part.measures[measureIdx];
        if (noteIdx < measure.notes.length) {
          const note = measure.notes[noteIdx];
          if (!note.rest) {
            newExpected.set(part.id, { pitches: note.pitches, noteId: note.id, hand });
          }
        }
      }
    }

    if (!isFreeTempo && state.isPlaying) {
      for (const [, prev] of prevExpected) {
        if (prev.noteId && !evaluatedNoteIds.current.has(prev.noteId)) {
          const stillExpected = [...newExpected.values()].some(n => n.noteId === prev.noteId);
          if (!stillExpected) {
            recentlyPassedRef.current.push({ ...prev, passedAt: performance.now() });
          }
        }
      }
    }

    expectedByPartRef.current = newExpected;
    partsPlayedRef.current = new Set();
  }, [isPracticing, isFreeTempo, state.score, state.isPlaying, state.currentMeasureIndex,
      state.currentNoteIndices, state.freeTempoMeasureIndex, state.freeTempoNoteIndex,
      state.practiceRightHand, state.practiceLeftHand]);

  useEffect(() => {
    if (!isPracticing) {
      recentlyPassedRef.current = [];
      if (graceTimerRef.current) { clearInterval(graceTimerRef.current); graceTimerRef.current = null; }
      return;
    }

    graceTimerRef.current = window.setInterval(() => {
      const now = performance.now();
      const remaining: PassedNote[] = [];
      for (const passed of recentlyPassedRef.current) {
        if (evaluatedNoteIds.current.has(passed.noteId)) continue;
        if (now - passed.passedAt >= GRACE_PERIOD_MS) {
          dispatch({ type: 'ADD_PRACTICE_RESULT', result: {
            noteId: passed.noteId,
            expectedPitches: passed.pitches,
            playedPitches: [],
            timingOffsetMs: 0,
            pitchCorrect: false,
            timing: 'missed',
          } });
          evaluatedNoteIds.current.add(passed.noteId);
        } else {
          remaining.push(passed);
        }
      }
      recentlyPassedRef.current = remaining;
    }, 50);

    return () => {
      if (graceTimerRef.current) { clearInterval(graceTimerRef.current); graceTimerRef.current = null; }
    };
  }, [isPracticing, dispatch]);

  useEffect(() => {
    if (!isPracticing || !state.score) return;

    if (state.activeMidiNotes.size === 0) {
      waitingForReleaseRef.current = false;
      return;
    }

    const played = Array.from(state.activeMidiNotes);

    if (isFreeTempo) {
      evaluateFreeTempo(played);
    } else if (state.isPlaying) {
      evaluateTimedWithTiming(played);
    }
  }, [state.activeMidiNotes, state.currentMeasureIndex, state.currentNoteIndices,
      isPracticing, isFreeTempo, state.isPlaying, state.score,
      evaluateFreeTempo, evaluateTimedWithTiming]);

  useEffect(() => {
    if (!isFreeTempo || state.freeTempoNoteIndex !== -1) return;
    dispatch({ type: 'END_PRACTICE_RUN' });
    if (state.loopingEnabled && state.score) {
      dispatch({ type: 'START_PRACTICE_RUN' });
      const noteIndices = new Map<string, number>();
      const practicedParts = state.score.parts.filter(p =>
        (p.hand === 'right' && state.practiceRightHand) ||
        (p.hand === 'left' && state.practiceLeftHand)
      );
      for (const part of practicedParts) {
        noteIndices.set(part.id, 0);
      }
      dispatch({ type: 'UPDATE_POSITION', measureIndex: 0, noteIndices });
    } else {
      stopMode();
    }
  }, [isFreeTempo, state.freeTempoNoteIndex, state.loopingEnabled, state.score,
      state.practiceRightHand, state.practiceLeftHand, dispatch, stopMode]);

  return null;
};

export default PracticeMode;
