import { useEffect, useRef, useCallback } from 'react';
import { useScales, hasEnabledMidiDevice } from '../store';
import type { PracticeNoteResult, TimingJudgment } from '../../shared/practice/types';
import {
  getAllMidiNoteOnTimes,
  getNoteExpectedTime,
  getRecentMidiPresses,
  pruneStale,
} from '../../shared/practice/practiceTimingStore';
import {
  pitchClassDistance,
  deriveOctaveOffset,
  deriveOctaveOffsetForHand,
} from '../../shared/practice/pitchMatch';
import { isDebugEnabled, logDebugEvent } from '../utils/practiceDebugLog';

// Scales practice is about precision; we use tighter timing windows than
// the piano app (which uses 120ms / 200ms grace) so that "perfect" actually
// means on the beat. With the prior 120ms window at slower tempos, notes
// played a tenth of a beat early/late were still tallied as perfect, which
// felt much too lenient given the visual feedback (blue/amber colouring).
const PERFECT_THRESHOLD_MS = 80;
const PERFECT_THRESHOLD_MIC_MS = 140;
const GRACE_PERIOD_MS = 160;
const GRACE_PERIOD_MIC_MS = 280;
const EVAL_BATCH_WINDOW_MS = 40;
const PROXIMITY_SEMITONES = 2;

interface ExpectedNote {
  pitches: number[];
  noteId: string;
  hand: string;
  partId: string;
  /**
   * Written pitches of the *other* hand at this same beat, if this is a
   * both-hand exercise. Used to validate the LH-below-RH invariant when
   * granting octave flex to the left hand.
   */
  siblingPitches?: number[];
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
  /**
   * Per-part octave anchor (multiple of 12). Each hand anchors once on its
   * first successful match and reuses that offset for the rest of the run.
   * Per-part (rather than a single shared offset) so that in both-hand
   * exercises the left hand can choose any lower octave independently of
   * where the right hand sits.
   */
  const octaveOffsetsRef = useRef<Map<string, number>>(new Map());

  const isBothHandsExercise = activeExercise?.hand === 'both';

  useEffect(() => {
    evaluatedNoteIds.current = new Set();
    recentlyPassedRef.current = [];
    octaveOffsetsRef.current = new Map();
  }, [state.currentRunStartTime]);

  /**
   * Decide an octave anchor for `expected`, or return null if no candidate
   * pitch class in `played` matches. In both-hand exercises:
   *   • RH anchors to the highest matching played pitch — if the user is
   *     playing both hands, that's the RH octave.
   *   • LH anchors to the lowest matching played pitch, provided the
   *     resulting LH register stays strictly below the RH register
   *     (either the already-anchored RH, or the written RH as a fallback
   *     when RH hasn't anchored yet). This prevents a single played RH
   *     note from "counting" as the LH too.
   * In single-hand exercises we fall back to the averaging-based
   * `deriveOctaveOffset`, unchanged.
   */
  const deriveOffsetForPart = useCallback((
    expected: ExpectedNote,
    played: number[],
  ): number | null => {
    if (!isBothHandsExercise) {
      return deriveOctaveOffset(played, expected.pitches);
    }
    if (expected.hand === 'right') {
      return deriveOctaveOffsetForHand(played, expected.pitches, 'highest');
    }
    if (expected.hand === 'left') {
      const candidate = deriveOctaveOffsetForHand(played, expected.pitches, 'lowest');
      if (candidate === null) return null;
      const lhAnchoredLow = Math.min(...expected.pitches.map(p => p + candidate));
      // Find a reference RH pitch: prefer the anchored RH if available,
      // otherwise fall back to the written sibling pitch so a first-note
      // LH attempt can still be placed relative to the scale's register.
      let rhReferenceLow: number | null = null;
      for (const [otherPartId, other] of expectedRef.current) {
        if (other.hand !== 'right') continue;
        const rhOffset = octaveOffsetsRef.current.get(otherPartId);
        const rhPitches = rhOffset !== undefined
          ? other.pitches.map(p => p + rhOffset)
          : other.pitches;
        rhReferenceLow = Math.min(...rhPitches);
        break;
      }
      if (rhReferenceLow === null && expected.siblingPitches) {
        rhReferenceLow = Math.min(...expected.siblingPitches);
      }
      if (rhReferenceLow !== null && lhAnchoredLow >= rhReferenceLow) {
        return null;
      }
      return candidate;
    }
    return deriveOctaveOffset(played, expected.pitches);
  }, [isBothHandsExercise]);

  const getAnchoredPitches = useCallback((
    expected: ExpectedNote,
    played: number[],
  ): number[] => {
    const cached = octaveOffsetsRef.current.get(expected.partId);
    if (cached !== undefined) {
      return expected.pitches.map(p => p + cached);
    }
    const derived = deriveOffsetForPart(expected, played);
    if (derived === null) return expected.pitches;
    octaveOffsetsRef.current.set(expected.partId, derived);
    return expected.pitches.map(p => p + derived);
  }, [deriveOffsetForPart]);

  const tryEvaluateNote = useCallback((
    expected: ExpectedNote,
    played: number[],
    midiTimes: ReadonlyMap<number, number>,
  ): boolean => {
    if (evaluatedNoteIds.current.has(expected.noteId)) return true;
    if (played.length === 0) return false;

    const expectedTime = getNoteExpectedTime(expected.noteId) ?? performance.now();
    const anchored = getAnchoredPitches(expected, played);

    const isAttempting = played.some(p =>
      anchored.some(ep =>
        Math.abs(p - ep) <= PROXIMITY_SEMITONES || pitchClassDistance(p, ep) === 0
      )
    );
    if (!isAttempting) return false;

    const pitchCorrect = anchored.every(ep => played.some(p => p === ep));

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
  }, [dispatch, getAnchoredPitches, perfectThreshold]);

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
            partId: part.id,
          });
        }
      }
    }

    // In both-hand mode, surface each hand's sibling pitches so the LH
    // anchor logic can fall back to the *written* RH register before the
    // RH has had a chance to anchor itself.
    if (newExpected.size > 1) {
      const entries = [...newExpected.entries()];
      for (const [partId, note] of entries) {
        const sibling = entries.find(([otherId, other]) =>
          otherId !== partId && other.hand !== note.hand,
        );
        if (sibling) {
          newExpected.set(partId, { ...note, siblingPitches: sibling[1].pitches });
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
