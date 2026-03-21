import React, { useEffect, useRef, useCallback } from 'react';
import { usePiano } from '../store';
import type { PracticeNoteResult, TimingJudgment } from '../types';
import {
  getAllMidiNoteOnTimes,
  getNoteExpectedTime,
  getRecentMidiPresses,
  pruneStale,
} from '../utils/practiceTimingStore';
import { matchesChord } from '../utils/chordMatcher';
import { isDebugEnabled, logDebugEvent } from '../utils/practiceDebugLog';

const PERFECT_THRESHOLD_MS = 120;
const GRACE_PERIOD_MS = 200;
const PROXIMITY_SEMITONES = 2;
const EVAL_BATCH_WINDOW_MS = 40;
const MIDI_RE_EVAL_WINDOW_MS = 80;

interface ExpectedNote { pitches: number[]; noteId: string; hand: string; chordSymbol?: string }
interface PassedNote extends ExpectedNote { passedAt: number }

function isAttemptingNote(played: number[], expectedPitches: number[]): boolean {
  return played.some(p => expectedPitches.some(ep => Math.abs(p - ep) <= PROXIMITY_SEMITONES));
}

function hasExactPitchMatch(played: number[], expectedPitches: number[]): boolean {
  return expectedPitches.every(ep => played.includes(ep));
}

function pitchClassDistance(a: number, b: number): number {
  const diff = Math.abs(((a % 12) + 12) % 12 - ((b % 12) + 12) % 12);
  return Math.min(diff, 12 - diff);
}

function pitchClassMatch(played: number[], expectedPitches: number[]): boolean {
  return expectedPitches.length > 0 && expectedPitches.every(ep =>
    played.some(p => pitchClassDistance(p, ep) <= 1)
  );
}

function findPitchClassMidiTime(
  expectedPitch: number,
  midiTimes: ReadonlyMap<number, number>,
): number | undefined {
  const exact = midiTimes.get(expectedPitch);
  if (exact !== undefined) return exact;
  let best: number | undefined;
  for (const [midi, time] of midiTimes) {
    if (pitchClassDistance(midi, expectedPitch) <= 1) {
      if (best === undefined || time < best) best = time;
    }
  }
  return best;
}

/**
 * Assign played notes to expected notes optimally so that each hand
 * gets the best-matching played note rather than one hand "stealing"
 * a note that belongs to the other.
 *
 * Returns a set of noteIds that have an assigned matching played note.
 * Notes NOT in this set should be skipped (not evaluated yet).
 */
function assignPlayedToExpected(
  played: number[],
  expectedNotes: ExpectedNote[],
  midiTimes: ReadonlyMap<number, number>,
  beatDurationMs: number,
): Set<string> {
  const now = performance.now();
  const recentPlayed = played.filter(p => {
    const t = midiTimes.get(p);
    return t !== undefined && (now - t) < beatDurationMs * 1.5;
  });

  const readyIds = new Set<string>();
  const claimed = new Set<number>();

  // Pass 1: exact pitch matches (highest priority)
  for (const exp of expectedNotes) {
    if (exp.chordSymbol) {
      readyIds.add(exp.noteId);
      continue;
    }
    const exactAll = exp.pitches.every(p => recentPlayed.includes(p) && !claimed.has(p));
    if (exactAll) {
      readyIds.add(exp.noteId);
      exp.pitches.forEach(p => claimed.add(p));
    }
  }

  // Pass 2: for remaining unmatched, check if there's a close match (within 2 semitones)
  for (const exp of expectedNotes) {
    if (readyIds.has(exp.noteId)) continue;
    if (exp.chordSymbol) continue;
    const available = recentPlayed.filter(p => !claimed.has(p));
    const allClose = exp.pitches.every(ep =>
      available.some(p => Math.abs(p - ep) <= PROXIMITY_SEMITONES),
    );
    if (allClose) {
      readyIds.add(exp.noteId);
      for (const ep of exp.pitches) {
        const match = available.find(p => Math.abs(p - ep) <= PROXIMITY_SEMITONES);
        if (match !== undefined) claimed.add(match);
      }
    }
  }

  return readyIds;
}

const PracticeMode: React.FC = () => {
  const { state, dispatch, stopMode } = usePiano();

  const isPracticing = state.activeMode === 'practice' || state.activeMode === 'free-practice';
  const isFreeTempo = state.activeMode === 'free-practice';
  const useMic = state.microphoneActive;

  const expectedByPartRef = useRef<Map<string, ExpectedNote>>(new Map());
  const partsPlayedRef = useRef<Set<string>>(new Set());
  const waitingForReleaseRef = useRef(false);
  const evaluatedNoteIds = useRef<Set<string>>(new Set());
  const missedNotes = useRef<Map<string, { expected: ExpectedNote; evaluatedAt: number }>>(new Map());
  const recentlyPassedRef = useRef<PassedNote[]>([]);
  const graceTimerRef = useRef<number | null>(null);
  const evalTimerRef = useRef<number | null>(null);

  useEffect(() => {
    evaluatedNoteIds.current = new Set();
    missedNotes.current = new Map();
    recentlyPassedRef.current = [];
    expectedByPartRef.current = new Map();
  }, [state.currentRunStartTime]);

  const checkPitchCorrect = useCallback((played: number[], expected: ExpectedNote): boolean => {
    if (expected.chordSymbol) return matchesChord(played, expected.chordSymbol);
    if (expected.pitches.length === 0) return false;
    if (expected.pitches.every(p => played.includes(p))) return true;
    if (useMic) return pitchClassMatch(played, expected.pitches);
    return false;
  }, [useMic]);

  const evaluateFreeTempo = useCallback((played: number[]) => {
    if (waitingForReleaseRef.current) return;

    for (const [partId, expected] of expectedByPartRef.current) {
      if (partsPlayedRef.current.has(partId)) continue;

      if (checkPitchCorrect(played, expected)) {
        const result: PracticeNoteResult = {
          noteId: expected.noteId,
          expectedPitches: expected.pitches,
          playedPitches: useMic
            ? played.filter(p => expected.pitches.some(ep => pitchClassDistance(p, ep) <= 1))
            : expected.pitches.filter(p => played.includes(p)),
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
  }, [dispatch, checkPitchCorrect, useMic]);

  const tryEvaluateNote = useCallback((
    expected: ExpectedNote,
    played: number[],
    midiTimes: ReadonlyMap<number, number>,
    readyIds?: Set<string>,
  ): boolean => {
    if (evaluatedNoteIds.current.has(expected.noteId)) {
      // Re-evaluation window for both mic and MIDI missed notes
      if (missedNotes.current.has(expected.noteId)) {
        const missed = missedNotes.current.get(expected.noteId)!;
        const window = useMic ? 400 : MIDI_RE_EVAL_WINDOW_MS;
        if (performance.now() - missed.evaluatedAt < window) {
          const pitchNowCorrect = checkPitchCorrect(played, expected);
          if (pitchNowCorrect) {
            missedNotes.current.delete(expected.noteId);
            const expectedTime = getNoteExpectedTime(expected.noteId) ?? performance.now();
            const relevantTimes = useMic
              ? expected.pitches.map(p => findPitchClassMidiTime(p, midiTimes)).filter((t): t is number => t !== undefined)
              : expected.pitches.map(p => midiTimes.get(p)).filter((t): t is number => t !== undefined);
            const press = relevantTimes.length > 0 ? Math.min(...relevantTimes) : performance.now();
            const offset = press - expectedTime;
            const newTiming: TimingJudgment = Math.abs(offset) < PERFECT_THRESHOLD_MS ? 'perfect' : offset < 0 ? 'early' : 'late';
            const correctedPitches = useMic
              ? expected.pitches.filter(ep => played.some(p => pitchClassDistance(p, ep) <= 1))
              : expected.pitches.filter(p => played.includes(p));
            if (isDebugEnabled()) {
              logDebugEvent({
                type: 'eval_attempt', t: performance.now(), noteId: expected.noteId,
                played, expectedPitches: expected.pitches, pitchCorrect: true,
                timing: newTiming, timingOffsetMs: offset, useMic,
                midiTimesSnapshot: [...midiTimes.entries()],
                expectedTime: getNoteExpectedTime(expected.noteId) ?? null,
              });
            }
            dispatch({ type: 'ADD_PRACTICE_RESULT', result: {
              noteId: expected.noteId,
              expectedPitches: expected.pitches,
              playedPitches: correctedPitches.length > 0 ? correctedPitches : played,
              timingOffsetMs: offset,
              pitchCorrect: true,
              timing: newTiming,
            } });
          }
        }
      }
      return true;
    }

    // If we have optimal assignment info, skip notes that don't have a match yet
    if (readyIds && !readyIds.has(expected.noteId)) {
      // Only skip if the note doesn't have an exact pitch in the played set
      if (!expected.chordSymbol && !hasExactPitchMatch(played, expected.pitches)) {
        return false;
      }
    }

    if (!expected.chordSymbol && !hasExactPitchMatch(played, expected.pitches) && !isAttemptingNote(played, expected.pitches)) {
      if (!useMic || !pitchClassMatch(played, expected.pitches)) return false;
    }

    const pitchCorrect = checkPitchCorrect(played, expected);

    const expectedTime = getNoteExpectedTime(expected.noteId) ?? performance.now();

    let matchingPitches = expected.pitches.filter(p => played.includes(p));
    if (matchingPitches.length === 0 && useMic) {
      matchingPitches = expected.pitches.filter(ep =>
        played.some(p => pitchClassDistance(p, ep) <= 1)
      );
    }

    const relevantKeyTimes = useMic
      ? expected.pitches
          .map(p => findPitchClassMidiTime(p, midiTimes))
          .filter((t): t is number => t !== undefined)
      : matchingPitches
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

    // Track misses for re-evaluation (both mic and MIDI)
    if (!pitchCorrect) {
      missedNotes.current.set(expected.noteId, { expected, evaluatedAt: performance.now() });
    }

    if (isDebugEnabled()) {
      logDebugEvent({
        type: 'eval_attempt', t: performance.now(), noteId: expected.noteId,
        played, expectedPitches: expected.pitches, pitchCorrect, timing,
        timingOffsetMs, useMic,
        midiTimesSnapshot: [...midiTimes.entries()],
        expectedTime: getNoteExpectedTime(expected.noteId) ?? null,
      });
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
  }, [dispatch, checkPitchCorrect, useMic]);

  const evaluateTimedWithTiming = useCallback((played: number[]) => {
    const midiTimes = getAllMidiNoteOnTimes();
    const beatDurationMs = 60000 / (state.tempo || 80);

    const allExpected = [...expectedByPartRef.current.values()];
    const readyIds = assignPlayedToExpected(played, allExpected, midiTimes, beatDurationMs);

    for (const [, expected] of expectedByPartRef.current) {
      tryEvaluateNote(expected, played, midiTimes, readyIds);
    }

    const remaining: PassedNote[] = [];
    for (const passed of recentlyPassedRef.current) {
      if (evaluatedNoteIds.current.has(passed.noteId)) continue;
      const wasEvaluated = tryEvaluateNote(passed, played, midiTimes);
      if (!wasEvaluated) remaining.push(passed);
    }
    recentlyPassedRef.current = remaining;
  }, [tryEvaluateNote, state.tempo]);

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
            newExpected.set(part.id, { pitches: note.pitches, noteId: note.id, hand, chordSymbol: note.chordSymbol });
          }
        }
      }
    }

    if (state.practiceChords) {
      const measureIdx = isFreeTempo ? state.freeTempoMeasureIndex : state.currentMeasureIndex;
      for (const part of state.score.parts) {
        if (measureIdx < 0 || measureIdx >= part.measures.length) continue;
        const noteIdx = isFreeTempo ? state.freeTempoNoteIndex : (state.currentNoteIndices.get(part.id) ?? -1);
        if (noteIdx < 0) continue;
        const note = part.measures[measureIdx]?.notes[noteIdx];
        if (note?.chordSymbol && !note.rest) {
          newExpected.set('chords', { pitches: note.pitches, noteId: note.id, hand: 'chords', chordSymbol: note.chordSymbol });
          break;
        }
      }
    }

    const sameAsBefore = newExpected.size === prevExpected.size &&
      [...newExpected.entries()].every(([k, v]) => prevExpected.get(k)?.noteId === v.noteId);
    if (sameAsBefore) return;

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

    if (isDebugEnabled() && newExpected.size > 0) {
      logDebugEvent({
        type: 'expected_change', t: performance.now(),
        expected: [...newExpected.values()].map(e => ({
          noteId: e.noteId, pitches: e.pitches, hand: e.hand, chordSymbol: e.chordSymbol,
        })),
      });
    }
  }, [isPracticing, isFreeTempo, state.score, state.isPlaying, state.currentMeasureIndex,
      state.currentNoteIndices, state.freeTempoMeasureIndex, state.freeTempoNoteIndex,
      state.practiceRightHand, state.practiceLeftHand, state.practiceChords]);

  useEffect(() => {
    if (!isPracticing) {
      recentlyPassedRef.current = [];
      if (graceTimerRef.current) { clearInterval(graceTimerRef.current); graceTimerRef.current = null; }
      return;
    }

    graceTimerRef.current = window.setInterval(() => {
      const now = performance.now();
      const remaining: PassedNote[] = [];
      const midiTimes = getAllMidiNoteOnTimes();
      const beatDurationMs = 60000 / (state.tempo || 80);
      const recentWindow = Math.max(beatDurationMs * 1.5, 800);
      const recentPlayed = getRecentMidiPresses(recentWindow);

      for (const passed of recentlyPassedRef.current) {
        if (evaluatedNoteIds.current.has(passed.noteId)) continue;

        // Try to evaluate with recent presses before declaring a miss
        if (recentPlayed.length > 0) {
          const wasEvaluated = tryEvaluateNote(passed, recentPlayed, midiTimes);
          if (wasEvaluated) continue;
        }

        if (now - passed.passedAt >= GRACE_PERIOD_MS) {
          if (isDebugEnabled()) {
            logDebugEvent({ type: 'grace_miss', t: now, noteId: passed.noteId,
              expectedPitches: passed.pitches, passedAt: passed.passedAt });
          }
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
      pruneStale();
    }, 50);

    return () => {
      if (graceTimerRef.current) { clearInterval(graceTimerRef.current); graceTimerRef.current = null; }
    };
  }, [isPracticing, dispatch, state.tempo, tryEvaluateNote]);

  // Debounced evaluation: wait for both hands to arrive before scoring
  useEffect(() => {
    if (!isPracticing || !state.score) return;

    if (state.activeMidiNotes.size === 0) {
      waitingForReleaseRef.current = false;
    }

    if (isDebugEnabled()) {
      logDebugEvent({ type: 'active_notes_change', t: performance.now(), activeNotes: Array.from(state.activeMidiNotes) });
    }

    if (isFreeTempo) {
      evaluateFreeTempo(Array.from(state.activeMidiNotes));
      return;
    }

    if (!state.isPlaying) return;

    if (evalTimerRef.current) clearTimeout(evalTimerRef.current);
    evalTimerRef.current = window.setTimeout(() => {
      evalTimerRef.current = null;
      const beatDurationMs = 60000 / (state.tempo || 80);
      const recentWindow = Math.max(beatDurationMs * 1.2, 600);
      const played = getRecentMidiPresses(recentWindow);
      if (played.length === 0) return;
      evaluateTimedWithTiming(played);
      pruneStale();
    }, EVAL_BATCH_WINDOW_MS);

    return () => {
      if (evalTimerRef.current) { clearTimeout(evalTimerRef.current); evalTimerRef.current = null; }
    };
  }, [state.activeMidiNotes,
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
