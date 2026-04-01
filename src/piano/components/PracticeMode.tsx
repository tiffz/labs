import React, { useEffect, useRef, useCallback } from 'react';
import { usePiano } from '../store';
import type { PracticeNoteResult, TimingJudgment } from '../types';
import {
  getAllMidiNoteOnTimes,
  getNoteExpectedTime,
  getRecentMidiPresses,
  isNoteHeld,
  pruneStale,
} from '../utils/practiceTimingStore';
import { matchesChord } from '../utils/chordMatcher';
import { isDebugEnabled, logDebugEvent } from '../utils/practiceDebugLog';
import {
  canAdvanceWhileWaitingForRelease,
  getLatestAttackTime,
} from '../utils/freeTempoInput';
import { resolveFreeTempoLoopStartPosition } from '../utils/freeTempoLoop';

const PERFECT_THRESHOLD_MS = 120;
const GRACE_PERIOD_MS = 200;
const PROXIMITY_SEMITONES = 2;
const EVAL_BATCH_WINDOW_MS = 40;
const MIDI_RE_EVAL_WINDOW_MS = 80;
// Acoustic detection uses a rolling majority window, which adds onset latency.
const MIC_TIMING_COMPENSATION_MS = 160;
// Avoid anchoring mic timing to stale held notes from previous beats.
const MIC_TIMING_MAX_EARLY_WINDOW_MS = 260;

interface ExpectedNote {
  pitches: number[];
  noteId: string;
  hand: string;
  chordSymbol?: string;
  tieStart?: boolean;
  tieStop?: boolean;
}
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

function pitchClassMatchWithTolerance(
  played: number[],
  expectedPitches: number[],
  tolerance: number,
): boolean {
  return expectedPitches.length > 0 && expectedPitches.every(ep =>
    played.some(p => pitchClassDistance(p, ep) <= tolerance)
  );
}

function shouldAllowPitchClassMatch(
  expected: ExpectedNote,
  useMic: boolean,
  allowChordPracticeOctaveFlex: boolean,
): boolean {
  // For hand-note grading, allow octave-free pitch-class matching.
  // Chord-symbol grading remains gated by practice-chords mode.
  if (expected.hand === 'left' || expected.hand === 'right') return true;
  return useMic || allowChordPracticeOctaveFlex;
}

function deriveOctaveOffset(played: number[], expectedPitches: number[]): number | null {
  const deltas: number[] = [];
  for (const expected of expectedPitches) {
    for (const actual of played) {
      if (pitchClassDistance(actual, expected) === 0) {
        deltas.push(actual - expected);
      }
    }
  }
  if (deltas.length === 0) return null;
  const avgDelta = deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
  return Math.round(avgDelta / 12) * 12;
}

function getHandSplitPoint(expectedNotes: ExpectedNote[]): number {
  const leftPitches = expectedNotes
    .filter((note) => note.hand === 'left')
    .flatMap((note) => note.pitches);
  const rightPitches = expectedNotes
    .filter((note) => note.hand === 'right')
    .flatMap((note) => note.pitches);
  if (leftPitches.length === 0 || rightPitches.length === 0) return 60;
  const leftMax = Math.max(...leftPitches);
  const rightMin = Math.min(...rightPitches);
  return (leftMax + rightMin) / 2;
}

function getRelevantPlayedNotesForExpected(
  played: number[],
  expected: ExpectedNote,
  expectedTime: number,
  midiTimes: ReadonlyMap<number, number>,
  useMic: boolean,
  expectedNotes: ExpectedNote[]
): number[] {
  const now = performance.now();
  const timeWindow = useMic ? 700 : 460;
  const timeFiltered = played.filter((midi) => {
    const noteOnTime = midiTimes.get(midi);
    if (noteOnTime === undefined) return false;
    return (
      Math.abs(noteOnTime - expectedTime) <= timeWindow &&
      now - noteOnTime <= timeWindow + 120
    );
  });
  const candidates = timeFiltered.length > 0 ? timeFiltered : played;
  const splitPoint = getHandSplitPoint(expectedNotes);
  if (expected.hand === 'left') {
    return candidates.filter((midi) => midi <= splitPoint + 2);
  }
  if (expected.hand === 'right') {
    return candidates.filter((midi) => midi >= splitPoint - 2);
  }
  return candidates;
}

function isPitchNearExpected(
  midi: number,
  expectedPitches: number[],
  allowPitchClass: boolean,
  useMic: boolean,
): boolean {
  return expectedPitches.some(
    (expectedPitch) =>
      Math.abs(midi - expectedPitch) <= PROXIMITY_SEMITONES ||
      (allowPitchClass && pitchClassDistance(midi, expectedPitch) <= (useMic ? 1 : 0)),
  );
}

function pickTimingReferenceTime(
  relevantTimes: number[],
  expectedTime: number,
  useMic: boolean,
): number {
  if (relevantTimes.length === 0) return performance.now();
  const filtered = useMic
    ? relevantTimes.filter((time) => time >= expectedTime - MIC_TIMING_MAX_EARLY_WINDOW_MS)
    : relevantTimes;
  const source = filtered.length > 0 ? filtered : relevantTimes;
  return source.reduce((closest, current) => (
    Math.abs(current - expectedTime) < Math.abs(closest - expectedTime) ? current : closest
  ));
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
  allowPitchClassForHands = false,
  useMic = false,
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
    const exactAll = exp.pitches.every((expectedPitch) =>
      recentPlayed.some(
        (playedPitch) =>
          !claimed.has(playedPitch) &&
          (
            playedPitch === expectedPitch ||
            (allowPitchClassForHands && pitchClassDistance(playedPitch, expectedPitch) === 0)
          )
      )
    );
    if (exactAll) {
      readyIds.add(exp.noteId);
      exp.pitches.forEach((expectedPitch) => {
        const claimedPitch = recentPlayed.find(
          (playedPitch) =>
            !claimed.has(playedPitch) &&
            (
              playedPitch === expectedPitch ||
              (allowPitchClassForHands && pitchClassDistance(playedPitch, expectedPitch) === 0)
            )
        );
        if (claimedPitch !== undefined) claimed.add(claimedPitch);
      });
    }
  }

  // Pass 2: for remaining unmatched, check if there's a close match (within 2 semitones)
  for (const exp of expectedNotes) {
    if (readyIds.has(exp.noteId)) continue;
    if (exp.chordSymbol) continue;
    const available = recentPlayed.filter(p => !claimed.has(p));
    const allowPitchClass = allowPitchClassForHands || exp.hand === 'left' || exp.hand === 'right';
    const allClose = exp.pitches.every(ep =>
      available.some(
        p =>
          (useMic && Math.abs(p - ep) <= PROXIMITY_SEMITONES) ||
          (allowPitchClass && pitchClassDistance(p, ep) === 0) ||
          p === ep,
      ),
    );
    if (allClose) {
      readyIds.add(exp.noteId);
      for (const ep of exp.pitches) {
        const match = available.find(
          p =>
            (useMic && Math.abs(p - ep) <= PROXIMITY_SEMITONES) ||
            (allowPitchClass && pitchClassDistance(p, ep) === 0) ||
            p === ep,
        );
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
  const allowChordPracticeOctaveFlex = state.practiceChords;

  const expectedByPartRef = useRef<Map<string, ExpectedNote>>(new Map());
  const partsPlayedRef = useRef<Set<string>>(new Set());
  const waitingForReleaseRef = useRef(false);
  const evaluatedNoteIds = useRef<Set<string>>(new Set());
  const missedNotes = useRef<Map<string, { expected: ExpectedNote; evaluatedAt: number }>>(new Map());
  const recentlyPassedRef = useRef<PassedNote[]>([]);
  const graceTimerRef = useRef<number | null>(null);
  const evalTimerRef = useRef<number | null>(null);
  const octaveAnchorByHandRef = useRef<Map<string, number>>(new Map());
  const lastFreeTempoAdvanceInputTimeRef = useRef<number>(-Infinity);

  useEffect(() => {
    evaluatedNoteIds.current = new Set();
    missedNotes.current = new Map();
    recentlyPassedRef.current = [];
    expectedByPartRef.current = new Map();
    octaveAnchorByHandRef.current = new Map();
    lastFreeTempoAdvanceInputTimeRef.current = -Infinity;
  }, [state.currentRunStartTime]);

  const getAnchoredExpectedPitches = useCallback((expected: ExpectedNote, played: number[]): number[] => {
    if (useMic || expected.chordSymbol) {
      return expected.pitches;
    }
    const existingOffset = octaveAnchorByHandRef.current.get(expected.hand);
    if (existingOffset !== undefined) {
      return expected.pitches.map((pitch) => pitch + existingOffset);
    }
    const detectedOffset = deriveOctaveOffset(played, expected.pitches);
    if (detectedOffset === null) {
      return expected.pitches;
    }
    octaveAnchorByHandRef.current.set(expected.hand, detectedOffset);
    return expected.pitches.map((pitch) => pitch + detectedOffset);
  }, [useMic]);

  const checkPitchCorrect = useCallback((played: number[], expected: ExpectedNote): boolean => {
    if (expected.chordSymbol) return matchesChord(played, expected.chordSymbol);
    if (expected.pitches.length === 0) return false;
    if (expected.pitches.every(p => played.includes(p))) return true;
    if (shouldAllowPitchClassMatch(expected, useMic, allowChordPracticeOctaveFlex)) {
      return pitchClassMatchWithTolerance(played, expected.pitches, useMic ? 1 : 0);
    }
    return false;
  }, [useMic, allowChordPracticeOctaveFlex]);

  const evaluateFreeTempo = useCallback((played: number[]) => {
    if (waitingForReleaseRef.current) {
      const expectedNow = [...expectedByPartRef.current.values()];
      // For ties in free-tempo mode, continuation notes should advance while held.
      const canBypassReleaseForTieContinuation =
        expectedNow.length > 0 &&
        expectedNow.every((expected) => {
          if (expected.chordSymbol || !expected.tieStop) return false;
          const anchored = getAnchoredExpectedPitches(expected, played);
          return anchored.length > 0 && anchored.every((pitch) => isNoteHeld(pitch));
        });
      const canAdvance = canAdvanceWhileWaitingForRelease({
        played,
        midiTimes: getAllMidiNoteOnTimes(),
        lastAdvanceInputTime: lastFreeTempoAdvanceInputTimeRef.current,
        canBypassForTieContinuation: canBypassReleaseForTieContinuation,
      });
      if (!canAdvance) return;
      waitingForReleaseRef.current = false;
    }

    for (const [partId, expected] of expectedByPartRef.current) {
      if (partsPlayedRef.current.has(partId)) continue;
      const anchoredExpected = {
        ...expected,
        pitches: getAnchoredExpectedPitches(expected, played),
      };

      if (checkPitchCorrect(played, anchoredExpected)) {
        const result: PracticeNoteResult = {
          noteId: expected.noteId,
          expectedPitches: anchoredExpected.pitches,
          playedPitches: useMic
            ? played.filter(p => anchoredExpected.pitches.some(ep => pitchClassDistance(p, ep) <= 1))
            : anchoredExpected.pitches.filter(p => played.includes(p)),
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
      const latestAttack = getLatestAttackTime(played, getAllMidiNoteOnTimes());
      if (latestAttack !== null) {
        lastFreeTempoAdvanceInputTimeRef.current = latestAttack;
      }
      dispatch({ type: 'ADVANCE_FREE_TEMPO' });
    }
  }, [dispatch, checkPitchCorrect, getAnchoredExpectedPitches, useMic]);

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
          const expectedTime = getNoteExpectedTime(expected.noteId) ?? performance.now();
          const scopedPlayed = getRelevantPlayedNotesForExpected(
            played,
            expected,
            expectedTime,
            midiTimes,
            useMic,
            [...expectedByPartRef.current.values()]
          );
          const pitchNowCorrect = checkPitchCorrect(scopedPlayed, expected);
          if (pitchNowCorrect) {
            missedNotes.current.delete(expected.noteId);
            const relevantTimes = useMic
              ? played
                  .filter((midi) => isPitchNearExpected(midi, expected.pitches, true, useMic))
                  .map((midi) => midiTimes.get(midi))
                  .filter((t): t is number => t !== undefined)
              : expected.pitches.map(p => midiTimes.get(p)).filter((t): t is number => t !== undefined);
            const press = pickTimingReferenceTime(relevantTimes, expectedTime, useMic);
            const rawOffset = press - expectedTime;
            const offset = useMic ? rawOffset - MIC_TIMING_COMPENSATION_MS : rawOffset;
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

    const expectedTime = getNoteExpectedTime(expected.noteId) ?? performance.now();
    const allowPitchClassForExpected = shouldAllowPitchClassMatch(
      expected,
      useMic,
      allowChordPracticeOctaveFlex
    );
    const scopedPlayed = getRelevantPlayedNotesForExpected(
      played,
      expected,
      expectedTime,
      midiTimes,
      useMic,
      [...expectedByPartRef.current.values()]
    );
    const anchoredExpectedPitches = getAnchoredExpectedPitches(expected, scopedPlayed);
    const anchoredExpected: ExpectedNote = { ...expected, pitches: anchoredExpectedPitches };

    // If we have optimal assignment info, skip notes that don't have a match yet
    if (readyIds && !readyIds.has(expected.noteId)) {
      // Only skip if the note doesn't have an exact pitch in the played set
      if (
        !expected.chordSymbol &&
        !hasExactPitchMatch(scopedPlayed, anchoredExpectedPitches) &&
        !(
          allowPitchClassForExpected &&
          pitchClassMatchWithTolerance(
            scopedPlayed,
            anchoredExpectedPitches,
            useMic ? 1 : 0
          )
        )
      ) {
        return false;
      }
    }

    if (
      !expected.chordSymbol &&
      !hasExactPitchMatch(scopedPlayed, anchoredExpectedPitches) &&
      !isAttemptingNote(scopedPlayed, anchoredExpectedPitches)
    ) {
      if (
        !allowPitchClassForExpected ||
        !pitchClassMatchWithTolerance(
          scopedPlayed,
          anchoredExpectedPitches,
          useMic ? 1 : 0
        )
      ) {
        return false;
      }
    }

    const tieHeldNow =
      !useMic &&
      !!expected.tieStop &&
      !expected.chordSymbol &&
      anchoredExpectedPitches.length > 0 &&
      anchoredExpectedPitches.every((pitch) => isNoteHeld(pitch));
    const pitchCorrect = tieHeldNow ? true : checkPitchCorrect(scopedPlayed, anchoredExpected);

    let matchingPitches = anchoredExpectedPitches.filter((p) => scopedPlayed.includes(p));
    if (matchingPitches.length === 0 && allowPitchClassForExpected) {
      matchingPitches = anchoredExpectedPitches.filter(ep =>
        scopedPlayed.some(p => pitchClassDistance(p, ep) <= (useMic ? 1 : 0))
      );
    }

    const heldTieContinuation = tieHeldNow;

    const relevantKeyTimes =
      (useMic || allowPitchClassForExpected || expected.chordSymbol)
        ? scopedPlayed
            .filter((midi) =>
              expected.chordSymbol
                ? true
                : isPitchNearExpected(
                  midi,
                  anchoredExpectedPitches,
                  allowPitchClassForExpected,
                  useMic
                ),
            )
            .map((midi) => midiTimes.get(midi))
            .filter((t): t is number => t !== undefined)
        : matchingPitches
            .map((p) => midiTimes.get(p))
            .filter((t): t is number => t !== undefined);

    const timingPress = heldTieContinuation
      ? expectedTime
      : pickTimingReferenceTime(relevantKeyTimes, expectedTime, useMic);
    const rawTimingOffsetMs = timingPress - expectedTime;
    const timingOffsetMs = useMic
      ? rawTimingOffsetMs - MIC_TIMING_COMPENSATION_MS
      : rawTimingOffsetMs;

    const attemptedPitch =
      expected.chordSymbol ? scopedPlayed.length > 0 : isAttemptingNote(scopedPlayed, anchoredExpectedPitches);
    let timing: TimingJudgment;
    if (heldTieContinuation && pitchCorrect) {
      timing = 'perfect';
    } else if (!pitchCorrect) {
      timing = attemptedPitch ? 'wrong_pitch' : 'missed';
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
        played: scopedPlayed, expectedPitches: anchoredExpectedPitches, pitchCorrect, timing,
        timingOffsetMs, useMic,
        midiTimesSnapshot: [...midiTimes.entries()],
        expectedTime: getNoteExpectedTime(expected.noteId) ?? null,
      });
    }

    dispatch({ type: 'ADD_PRACTICE_RESULT', result: {
      noteId: expected.noteId,
      expectedPitches: anchoredExpectedPitches,
      playedPitches: matchingPitches.length > 0 ? matchingPitches : played,
      timingOffsetMs,
      pitchCorrect,
      timing,
    } });
    evaluatedNoteIds.current.add(expected.noteId);
    return true;
  }, [dispatch, checkPitchCorrect, useMic, allowChordPracticeOctaveFlex, getAnchoredExpectedPitches]);

  const evaluateTimedWithTiming = useCallback((played: number[]) => {
    const midiTimes = getAllMidiNoteOnTimes();
    const beatDurationMs = 60000 / (state.tempo || 80);

    const allExpected = [...expectedByPartRef.current.values()];
    const allowPitchClassForHands = !useMic;
    const readyIds = assignPlayedToExpected(
      played,
      allExpected,
      midiTimes,
      beatDurationMs,
      allowPitchClassForHands,
      useMic
    );

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
  }, [tryEvaluateNote, state.tempo, useMic]);

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
    if (state.practiceVoice) practicedHands.push('voice');

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
            newExpected.set(part.id, {
              pitches: note.pitches,
              noteId: note.id,
              hand,
              chordSymbol: note.chordSymbol,
              tieStart: note.tieStart,
              tieStop: note.tieStop,
            });
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
          newExpected.set('chords', {
            pitches: note.pitches,
            noteId: note.id,
            hand: 'chords',
            chordSymbol: note.chordSymbol,
            tieStart: note.tieStart,
            tieStop: note.tieStop,
          });
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
      state.practiceRightHand, state.practiceLeftHand, state.practiceVoice, state.practiceChords]);

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
      isPracticing, isFreeTempo, state.isPlaying, state.score, state.tempo,
      state.freeTempoMeasureIndex, state.freeTempoNoteIndex,
      evaluateFreeTempo, evaluateTimedWithTiming]);

  useEffect(() => {
    if (!isFreeTempo || state.freeTempoNoteIndex !== -1) return;
    dispatch({ type: 'END_PRACTICE_RUN' });
    if (state.loopingEnabled && state.score) {
      dispatch({ type: 'START_PRACTICE_RUN' });
      const practicedParts = state.score.parts.filter(p =>
        (p.hand === 'right' && state.practiceRightHand) ||
        (p.hand === 'left' && state.practiceLeftHand) ||
        (p.hand === 'voice' && state.practiceVoice)
      );
      const startMeasure = state.selectedMeasureRange?.start ?? 0;
      const loopStart = resolveFreeTempoLoopStartPosition(practicedParts, startMeasure);
      dispatch({
        type: 'SET_FREE_TEMPO_POSITION',
        measureIndex: loopStart.measureIndex,
        noteIndex: loopStart.noteIndex,
        partIds: practicedParts.map((part) => part.id),
      });
    } else {
      stopMode();
    }
  }, [isFreeTempo, state.freeTempoNoteIndex, state.loopingEnabled, state.score,
      state.practiceRightHand, state.practiceLeftHand, state.practiceVoice, state.selectedMeasureRange, dispatch, stopMode]);

  return null;
};

export default PracticeMode;
