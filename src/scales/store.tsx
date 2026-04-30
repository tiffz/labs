import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect, useState } from 'react';
import type { SessionPlan, SessionExercise, ExerciseDefinition, Stage } from './curriculum/types';
import type { ScalesProgressData, PracticeRecord } from './progress/types';
import type { PracticeNoteResult } from '../shared/practice/types';
import type { PianoScore } from '../shared/music/scoreTypes';
import {
  loadProgress,
  saveProgress,
  recordPractice,
  getExerciseProgress,
  markOnboardingSeen,
  markGuidanceIntroduced,
} from './progress/store';
import { planSession } from './curriculum/sessionPlanner';
import { generateScoreForExercise } from './curriculum/scoreGenerator';
import { getMidiInput, MidiInput } from '../shared/midi/midiInput';
import type { MidiDevice } from '../shared/music/scoreTypes';
import { recordMidiNoteOn, recordMidiNoteOff, clearAll as clearTimingStore } from '../shared/practice/practiceTimingStore';
import { AcousticInput } from './utils/acousticInput';
import { createAppAnalytics } from '../shared/utils/analytics';
import { isDebugEnabled, logDebugEvent } from './utils/practiceDebugLog';
import {
  loadAudioPrefs,
  updateAudioPrefs,
  isMicrophonePermissionGranted,
} from './utils/audioPrefs';
import { advanceFreeTempoCursor } from './utils/freeTempoCursorStep';
import { applyPianoDoubleTapStep } from './utils/pianoAdvanceDoubleTap';
import {
  buildSessionSummary,
  type SessionExerciseSummary,
  type SessionRunRecord,
} from './sessionRunSummary';

export type { SessionExerciseSummary, SessionRunRecord } from './sessionRunSummary';

const analytics = createAppAnalytics('scales');

/**
 * Mic input pipeline latency, measured empirically at ~202ms mean (range
 * 152–327ms) by comparing simultaneous MIDI and mic note-on timestamps.
 * 180ms compensation centers the residual around ~22ms, well within the
 * 200ms "perfect" threshold for mic-only grading.
 */
const MIC_LATENCY_COMPENSATION_MS = 180;

type Screen = 'home' | 'session' | 'progress';

export interface ExerciseResult {
  /** Ratio of fully-correct hits (pitch + perfect timing) to total notes. */
  accuracy: number;
  /** Count of notes played with correct pitch AND "perfect" timing. */
  correct: number;
  /** Total note count in the exercise score (non-rest notes). */
  total: number;
  /** Whether this result advanced the user to the next stage. */
  advanced: boolean;
  /**
   * Breakdown by timing judgment, summing to {@link total}. Notes the user
   * never attempted are counted under `missed`.
   */
  breakdown: {
    perfect: number;
    early: number;
    late: number;
    wrongPitch: number;
    missed: number;
  };
}
export type InputMode = 'midi' | 'mic' | 'none';

interface ScalesState {
  screen: Screen;
  progress: ScalesProgressData;
  sessionPlan: SessionPlan | null;
  activeExerciseIndex: number;
  activeExercise: SessionExercise | null;
  score: PianoScore | null;
  isPlaying: boolean;
  currentMeasureIndex: number;
  currentNoteIndices: Map<string, number>;
  activeMidiNotes: Set<number>;
  /**
   * Increments on every physical note-on (MIDI or mic). Unlike
   * `activeMidiNotes`, survives batched on+off in one React update so UI
   * can edge-detect a tap without requiring the key to stay down.
   */
  midiNoteOnPulse: number;
  /**
   * On Home, the last pulse value that was used to "arm" or absorb the
   * practice-from-key tap. The next note-on with a higher pulse can start
   * a session (mirrors edge detection without racing React effects).
   */
  homeMidiGatePulse: number;
  /**
   * True when HomeScreen modal overlays are open (mastery, review, onboarding).
   * Blocks starting practice from the first piano key until closed.
   */
  homeStartBlocked: boolean;
  /**
   * One-shot for Home UI: session started from home via key while "Next lesson"
   * was showing (powers the brief "Piano key heard" acknowledgement).
   */
  homePracticeCue: null | 'midi_continue';
  /**
   * On Home only: first step of a piano "double tap" (press → release → press).
   * `released` flips true on MIDI note-off for that pitch so duplicate note-on
   * spam from one physical strike cannot start a session.
   */
  homeNoteDoubleTapAwait: null | { note: number; perfMs: number; released: boolean };
  /**
   * Incremented on every MIDI/mic note on/off so SessionScreen can subscribe
   * without duplicating the global MidiInput callback.
   */
  midiShortcutWave: number;
  /** Latest pitch event for session piano shortcut double-tap logic. */
  midiShortcutLast: { kind: 'on' | 'off'; note: number; perfMs: number } | null;
  practiceResults: Map<string, PracticeNoteResult>;
  currentRunStartTime: number | null;
  midiConnected: boolean;
  midiDevices: MidiDevice[];
  /** IDs of MIDI devices the user has explicitly disabled. */
  disabledMidiDeviceIds: Set<string>;
  inputMode: InputMode;
  microphoneActive: boolean;
  /** Free-tempo tracking */
  freeTempoMeasureIndex: number;
  freeTempoNoteIndex: number;
  /** Whether the user has completed at least one full run of the current exercise. */
  hasCompletedRun: boolean;
  /** Whether a free-tempo run just finished (all notes played). */
  freeTempoRunComplete: boolean;
  /** Result from the most recently finished exercise (shown as banner before next exercise). */
  lastExerciseResult: ExerciseResult | null;
  /** True when the user just finished a full session (controls home screen CTA). */
  sessionComplete: boolean;
  /**
   * `progress.currentTierId` when the current practice session began. At
   * COMPLETE_SESSION, if this differs from the current tier, the learner
   * graduated a tier and we show the home celebration; otherwise we chain
   * straight into the next planned session.
   */
  sessionTierIdAtStart: string | null;
  /**
   * Per-FINISH_EXERCISE run records for the *currently active* session.
   * Reset on START_SESSION; consumed and cleared on COMPLETE_SESSION
   * (where it gets aggregated into `lastSessionSummary`).
   */
  currentSessionRuns: SessionRunRecord[];
  /**
   * Snapshot of the most recently completed session, persisted in memory
   * until the next session starts. Drives the post-session summary card
   * on the Home screen. Null until at least one session completes.
   */
  lastSessionSummary: SessionExerciseSummary[] | null;
  /** MIDI notes from a wrong-note attempt (brief flash, not recorded). */
  wrongNoteFlash: number[] | null;
}

type Action =
  | { type: 'SET_SCREEN'; screen: Screen }
  | { type: 'SET_HOME_START_BLOCKED'; blocked: boolean }
  | { type: 'ABSORB_HOME_NOTE_GATE' }
  | { type: 'CLEAR_HOME_PRACTICE_CUE' }
  | { type: 'START_SESSION'; plan: SessionPlan }
  | { type: 'SET_ACTIVE_EXERCISE'; index: number; score: PianoScore }
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'UPDATE_POSITION'; measureIndex: number; noteIndices: Map<string, number> }
  | { type: 'MIDI_NOTE_ON'; note: number; perfMs: number }
  | { type: 'MIDI_NOTE_OFF'; note: number; perfMs: number }
  | { type: 'ADD_PRACTICE_RESULT'; result: PracticeNoteResult }
  | { type: 'START_PRACTICE_RUN' }
  /**
   * User manually stopped mid-run. Abandons the in-progress attempt and
   * wipes any partial grading state (per-note colors, playhead position,
   * free-tempo cursor) without producing an ExerciseResult, so the score
   * view returns to a clean pre-run state.
   */
  | { type: 'STOP_PRACTICE_RUN' }
  | { type: 'FINISH_EXERCISE'; exerciseId: string; stageId: string; purpose?: 'drill' }
  /**
   * Free-tempo only: after a perfect silent dry run ("Nice" overlay), record a
   * full-accuracy history row so the streak matches what the learner just
   * proved, before the scored engine pass. Does not touch session run
   * summaries or `lastExerciseResult`.
   */
  | { type: 'RECORD_FREE_TEMPO_WARMUP_HIT'; exerciseId: string; stageId: string; noteCount: number }
  | { type: 'NEXT_EXERCISE'; score: PianoScore; targetIndex?: number }
  | { type: 'COMPLETE_SESSION' }
  | { type: 'SET_MIDI_CONNECTED'; connected: boolean }
  | { type: 'SET_MIDI_DEVICES'; devices: MidiDevice[] }
  | { type: 'TOGGLE_MIDI_DEVICE'; deviceId: string }
  | { type: 'SET_INPUT_MODE'; mode: InputMode }
  | { type: 'SET_MICROPHONE_ACTIVE'; active: boolean }
  | { type: 'SET_FREE_TEMPO_POSITION'; measureIndex: number; noteIndex: number }
  | { type: 'ADVANCE_FREE_TEMPO' }
  | { type: 'FREE_TEMPO_RUN_COMPLETE' }
  | { type: 'RESTART_FREE_TEMPO' }
  | { type: 'WRONG_NOTE_FLASH'; notes: number[] }
  | { type: 'LOAD_STAGE'; exercise: SessionExercise; score: PianoScore }
  | { type: 'MARK_ONBOARDING_SEEN' }
  | { type: 'MARK_GUIDANCE_INTRODUCED'; stage: Stage; exercise: ExerciseDefinition };

function initialState(): ScalesState {
  const audioPrefs = loadAudioPrefs();
  return {
    screen: 'home',
    progress: loadProgress(),
    sessionPlan: null,
    activeExerciseIndex: 0,
    activeExercise: null,
    score: null,
    isPlaying: false,
    currentMeasureIndex: -1,
    currentNoteIndices: new Map(),
    activeMidiNotes: new Set(),
    midiNoteOnPulse: 0,
    homeMidiGatePulse: 0,
    homeStartBlocked: false,
    homePracticeCue: null,
    homeNoteDoubleTapAwait: null,
    midiShortcutWave: 0,
    midiShortcutLast: null,
    practiceResults: new Map(),
    currentRunStartTime: null,
    midiConnected: false,
    midiDevices: [],
    // Restore the user's previously-disabled MIDI devices so they don't
    // reappear as "active" on every page load.
    disabledMidiDeviceIds: new Set(audioPrefs.disabledMidiDeviceIds),
    inputMode: 'none',
    microphoneActive: false,
    freeTempoMeasureIndex: 0,
    freeTempoNoteIndex: 0,
    hasCompletedRun: false,
    freeTempoRunComplete: false,
    lastExerciseResult: null,
    sessionComplete: false,
    sessionTierIdAtStart: null,
    currentSessionRuns: [],
    lastSessionSummary: null,
    wrongNoteFlash: null,
  };
}

/**
 * Aggregate a flat list of per-run records (one per FINISH_EXERCISE) into
 * a per-exercise rollup for the post-session summary card. Order matches
 * the order each exercise was *first practiced* in the session, so the
 * card reads in playback order.
 *
 * Status precedence: a single drill run flips status to `drilled` (the
 * user opted in deliberately, so it's the most informative label).
 * Otherwise any advancement makes it `cleared`. The fallback is `shaky`
 * — practiced but no progression and no deliberate drilling.
 */
function hasPracticeInput(state: ScalesState): boolean {
  return (
    state.midiDevices.some(d => d.connected && !state.disabledMidiDeviceIds.has(d.id))
    || state.microphoneActive
  );
}

function bumpMidiShortcut(
  state: ScalesState,
  kind: 'on' | 'off',
  note: number,
  perfMs: number,
): Pick<ScalesState, 'midiShortcutWave' | 'midiShortcutLast'> {
  return {
    midiShortcutWave: state.midiShortcutWave + 1,
    midiShortcutLast: { kind, note, perfMs },
  };
}

function transitionStartSession(state: ScalesState, plan: SessionPlan): ScalesState {
  const first = plan.exercises[0] ?? null;
  const score = first ? generateScoreForExercise(first) : null;
  return {
    ...state,
    screen: 'session',
    sessionPlan: plan,
    activeExerciseIndex: 0,
    activeExercise: first,
    score,
    practiceResults: new Map(),
    currentRunStartTime: null,
    lastExerciseResult: null,
    sessionComplete: false,
    currentSessionRuns: [],
    homePracticeCue: null,
    homeNoteDoubleTapAwait: null,
    hasCompletedRun: false,
    freeTempoRunComplete: false,
    freeTempoMeasureIndex: 0,
    freeTempoNoteIndex: 0,
    isPlaying: false,
    currentMeasureIndex: -1,
    currentNoteIndices: new Map(),
    sessionTierIdAtStart: state.progress.currentTierId,
  };
}

function reducer(state: ScalesState, action: Action): ScalesState {
  switch (action.type) {
    case 'SET_SCREEN': {
      if (action.screen === 'home') {
        return {
          ...state,
          screen: 'home',
          homeMidiGatePulse: state.midiNoteOnPulse,
          homeStartBlocked: false,
          homeNoteDoubleTapAwait: null,
          sessionTierIdAtStart: null,
        };
      }
      return {
        ...state,
        screen: action.screen,
        homeStartBlocked: false,
        homeNoteDoubleTapAwait: null,
      };
    }

    case 'SET_HOME_START_BLOCKED':
      return action.blocked === state.homeStartBlocked ? state : { ...state, homeStartBlocked: action.blocked };

    case 'ABSORB_HOME_NOTE_GATE':
      return {
        ...state,
        homeMidiGatePulse: state.midiNoteOnPulse,
        homeNoteDoubleTapAwait: null,
      };

    case 'CLEAR_HOME_PRACTICE_CUE':
      return state.homePracticeCue === null ? state : { ...state, homePracticeCue: null };

    case 'START_SESSION':
      return transitionStartSession(state, action.plan);

    case 'SET_ACTIVE_EXERCISE':
      return {
        ...state,
        activeExerciseIndex: action.index,
        activeExercise: state.sessionPlan?.exercises[action.index] ?? null,
        score: action.score,
        practiceResults: new Map(),
        currentMeasureIndex: -1,
        currentNoteIndices: new Map(),
        currentRunStartTime: null,
        isPlaying: false,
        freeTempoMeasureIndex: 0,
        freeTempoNoteIndex: 0,
        hasCompletedRun: false,
        freeTempoRunComplete: false,
      };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.isPlaying };

    case 'UPDATE_POSITION':
      return {
        ...state,
        currentMeasureIndex: action.measureIndex,
        currentNoteIndices: action.noteIndices,
      };

    case 'MIDI_NOTE_ON': {
      const perfMs = action.perfMs;
      const nextPulse = state.midiNoteOnPulse + 1;
      const next = new Set(state.activeMidiNotes);
      next.add(action.note);
      const shortcut = bumpMidiShortcut(state, 'on', action.note, perfMs);

      if (state.screen !== 'home') {
        return {
          ...state,
          activeMidiNotes: next,
          midiNoteOnPulse: nextPulse,
          homeNoteDoubleTapAwait: null,
          ...shortcut,
        };
      }

      if (!hasPracticeInput(state) || state.homeStartBlocked || nextPulse <= state.homeMidiGatePulse) {
        return {
          ...state,
          activeMidiNotes: next,
          midiNoteOnPulse: nextPulse,
          homeNoteDoubleTapAwait: null,
          ...shortcut,
        };
      }

      const { complete, next: homeNext } = applyPianoDoubleTapStep(
        state.homeNoteDoubleTapAwait,
        'on',
        action.note,
        perfMs,
      );

      if (complete) {
        const plan = planSession(state.progress);
        const started = transitionStartSession(state, plan);
        analytics.trackEvent('session_start', {
          exercise_count: plan.exercises.length,
          source: 'home_double_note',
        });
        return {
          ...started,
          activeMidiNotes: next,
          midiNoteOnPulse: nextPulse,
          homeMidiGatePulse: nextPulse,
          homePracticeCue: state.sessionComplete ? 'midi_continue' : null,
          ...shortcut,
        };
      }

      return {
        ...state,
        activeMidiNotes: next,
        midiNoteOnPulse: nextPulse,
        homeNoteDoubleTapAwait: homeNext,
        ...shortcut,
      };
    }

    case 'MIDI_NOTE_OFF': {
      const next = new Set(state.activeMidiNotes);
      next.delete(action.note);
      const shortcut = bumpMidiShortcut(state, 'off', action.note, action.perfMs);
      if (state.screen !== 'home') {
        return {
          ...state,
          activeMidiNotes: next,
          homeNoteDoubleTapAwait: null,
          ...shortcut,
        };
      }
      const { next: homeAwait } = applyPianoDoubleTapStep(
        state.homeNoteDoubleTapAwait,
        'off',
        action.note,
        action.perfMs,
      );
      return {
        ...state,
        activeMidiNotes: next,
        homeNoteDoubleTapAwait: homeAwait,
        ...shortcut,
      };
    }

    case 'ADD_PRACTICE_RESULT': {
      const next = new Map(state.practiceResults);
      next.set(action.result.noteId, action.result);
      return { ...state, practiceResults: next };
    }

    case 'START_PRACTICE_RUN':
      return {
        ...state,
        practiceResults: new Map(),
        currentRunStartTime: Date.now(),
        freeTempoRunComplete: false,
        lastExerciseResult: null,
      };

    case 'STOP_PRACTICE_RUN':
      return {
        ...state,
        isPlaying: false,
        practiceResults: new Map(),
        currentMeasureIndex: -1,
        currentNoteIndices: new Map(),
        currentRunStartTime: null,
        freeTempoMeasureIndex: 0,
        freeTempoNoteIndex: 0,
        freeTempoRunComplete: false,
        wrongNoteFlash: null,
      };

    case 'RECORD_FREE_TEMPO_WARMUP_HIT': {
      const n = action.noteCount;
      if (n < 1) return state;
      const record: PracticeRecord = {
        exerciseId: action.exerciseId,
        stageId: action.stageId,
        timestamp: Date.now(),
        accuracy: 1,
        noteCount: n,
        correctCount: n,
        purpose: 'warmup',
      };
      const newProgress = recordPractice(state.progress, record);
      saveProgress(newProgress);
      return { ...state, progress: newProgress };
    }

    case 'FINISH_EXERCISE': {
      const total = state.score
        ? state.score.parts.reduce(
            (sum, p) => sum + p.measures.reduce((ms, m) => ms + m.notes.filter(n => !n.rest).length, 0), 0)
        : 0;

      // A note counts as fully "correct" only when both pitch and timing
      // are right — matching the piano app's rule. Previously the scales
      // app counted any pitch-correct note as correct, so early/late notes
      // (colored blue/amber in the score) were silently tallied as 100%.
      const results = Array.from(state.practiceResults.values());
      const perfect = results.filter(r => r.pitchCorrect && r.timing === 'perfect').length;
      const early = results.filter(r => r.pitchCorrect && r.timing === 'early').length;
      const late = results.filter(r => r.pitchCorrect && r.timing === 'late').length;
      const wrongPitch = results.filter(r => r.timing === 'wrong_pitch').length;
      const explicitMissed = results.filter(r => r.timing === 'missed').length;
      // Notes we never evaluated at all (e.g. user stopped early) are
      // implicit misses so the breakdown always sums to `total`.
      const implicitMissed = Math.max(0, total - results.length);
      const breakdown = {
        perfect,
        early,
        late,
        wrongPitch,
        missed: explicitMissed + implicitMissed,
      };
      const correct = perfect;
      const accuracy = total > 0 ? correct / total : 0;

      const record: PracticeRecord = {
        exerciseId: action.exerciseId,
        stageId: action.stageId,
        timestamp: Date.now(),
        accuracy,
        noteCount: total,
        correctCount: correct,
        breakdown,
        purpose: action.purpose,
      };

      const beforeProgress = getExerciseProgress(state.progress, action.exerciseId);
      const newProgress = recordPractice(state.progress, record);
      saveProgress(newProgress);

      const afterProgress = getExerciseProgress(newProgress, action.exerciseId);
      // Final-stage clears bump `completedStageId` to the last stage id but
      // intentionally leave `currentStageId` there (no "next" stage). The old
      // `currentStageId !== stageId` check therefore missed fluent-gate / last-
      // level completions and kept the auto-loop + boundary UI stuck off.
      const advanced =
        afterProgress.currentStageId !== beforeProgress.currentStageId
        || (afterProgress.completedStageId ?? null) !== (beforeProgress.completedStageId ?? null);

      const runRecord: SessionRunRecord = {
        exerciseId: action.exerciseId,
        stageId: action.stageId,
        advanced,
        accuracy,
        purpose: action.purpose,
      };

      return {
        ...state,
        progress: newProgress,
        isPlaying: false,
        currentMeasureIndex: -1,
        currentNoteIndices: new Map(),
        freeTempoRunComplete: false,
        lastExerciseResult: { accuracy, correct, total, advanced, breakdown },
        currentSessionRuns: [...state.currentSessionRuns, runRecord],
      };
    }

    case 'NEXT_EXERCISE': {
      const nextIdx = action.targetIndex ?? state.activeExerciseIndex + 1;
      const nextExercise = state.sessionPlan?.exercises[nextIdx] ?? null;
      if (!nextExercise) {
        return {
          ...state,
          screen: 'home',
          homeMidiGatePulse: state.midiNoteOnPulse,
          homeNoteDoubleTapAwait: null,
          sessionTierIdAtStart: null,
        };
      }
      return {
        ...state,
        screen: 'session',
        activeExerciseIndex: nextIdx,
        activeExercise: nextExercise,
        score: action.score,
        practiceResults: new Map(),
        currentRunStartTime: null,
        isPlaying: false,
        currentMeasureIndex: -1,
        currentNoteIndices: new Map(),
        freeTempoMeasureIndex: 0,
        freeTempoNoteIndex: 0,
        hasCompletedRun: false,
        freeTempoRunComplete: false,
        lastExerciseResult: null,
      };
    }

    case 'COMPLETE_SESSION': {
      const summary = buildSessionSummary(state.currentSessionRuns);
      const tierAtStart = state.sessionTierIdAtStart;
      const tierGraduated =
        tierAtStart !== null && tierAtStart !== state.progress.currentTierId;

      const afterClearingRuns = {
        ...state,
        isPlaying: false,
        lastExerciseResult: null,
        currentSessionRuns: [],
        homeMidiGatePulse: state.midiNoteOnPulse,
        homeNoteDoubleTapAwait: null,
      };

      if (tierGraduated) {
        return {
          ...afterClearingRuns,
          screen: 'home',
          sessionComplete: true,
          lastSessionSummary: summary,
          sessionPlan: null,
          activeExercise: null,
          activeExerciseIndex: 0,
          score: null,
          sessionTierIdAtStart: null,
        };
      }

      const nextPlan = planSession(afterClearingRuns.progress);
      if (nextPlan.exercises.length === 0) {
        return {
          ...afterClearingRuns,
          screen: 'home',
          sessionComplete: false,
          lastSessionSummary: null,
          sessionPlan: null,
          activeExercise: null,
          activeExerciseIndex: 0,
          score: null,
          sessionTierIdAtStart: null,
        };
      }

      analytics.trackEvent('session_start', {
        exercise_count: nextPlan.exercises.length,
        chain_after_session: true,
      });

      return transitionStartSession(
        {
          ...afterClearingRuns,
          lastSessionSummary: null,
        },
        nextPlan,
      );
    }

    case 'SET_MIDI_CONNECTED':
      return {
        ...state,
        midiConnected: action.connected,
        inputMode: !action.connected && state.inputMode === 'midi' ? 'none' : state.inputMode,
      };

    case 'SET_MIDI_DEVICES':
      return { ...state, midiDevices: action.devices };

    case 'TOGGLE_MIDI_DEVICE': {
      const next = new Set(state.disabledMidiDeviceIds);
      if (next.has(action.deviceId)) {
        next.delete(action.deviceId);
      } else {
        next.add(action.deviceId);
      }
      const hasEnabledDevice = state.midiDevices.some(d => d.connected && !next.has(d.id));
      return {
        ...state,
        disabledMidiDeviceIds: next,
        inputMode: !hasEnabledDevice && state.inputMode === 'midi'
          ? (state.microphoneActive ? 'mic' : 'none')
          : hasEnabledDevice && state.midiConnected
            ? 'midi'
            : state.inputMode,
      };
    }

    case 'SET_INPUT_MODE':
      return { ...state, inputMode: action.mode };

    case 'SET_MICROPHONE_ACTIVE':
      return { ...state, microphoneActive: action.active };

    case 'SET_FREE_TEMPO_POSITION': {
      const noteIndices = new Map<string, number>();
      if (state.score) {
        for (const part of state.score.parts) {
          const key = part.hand === 'right' ? 'rh' : part.hand === 'left' ? 'lh' : 'voice';
          noteIndices.set(key, action.noteIndex);
        }
      }
      return {
        ...state,
        freeTempoMeasureIndex: action.measureIndex,
        freeTempoNoteIndex: action.noteIndex,
        currentNoteIndices: noteIndices,
      };
    }

    case 'ADVANCE_FREE_TEMPO': {
      if (!state.score) return state;
      const stepped = advanceFreeTempoCursor(
        state.score,
        state.freeTempoMeasureIndex,
        state.freeTempoNoteIndex,
      );
      if (stepped.kind === 'next') {
        return {
          ...state,
          freeTempoMeasureIndex: stepped.measureIndex,
          freeTempoNoteIndex: stepped.noteIndex,
          currentNoteIndices: stepped.currentNoteIndices,
          wrongNoteFlash: null,
        };
      }
      return {
        ...state,
        freeTempoRunComplete: true,
        hasCompletedRun: true,
        isPlaying: false,
        currentMeasureIndex: -1,
        currentNoteIndices: new Map(),
      };
    }

    case 'FREE_TEMPO_RUN_COMPLETE':
      return {
        ...state,
        freeTempoRunComplete: true,
        hasCompletedRun: true,
        isPlaying: false,
        currentMeasureIndex: -1,
        currentNoteIndices: new Map(),
      };

    case 'RESTART_FREE_TEMPO':
      return {
        ...state,
        freeTempoMeasureIndex: 0,
        freeTempoNoteIndex: 0,
        freeTempoRunComplete: false,
        hasCompletedRun: false,
        practiceResults: new Map(),
        currentRunStartTime: Date.now(),
        isPlaying: true,
        lastExerciseResult: null,
        wrongNoteFlash: null,
      };

    case 'WRONG_NOTE_FLASH':
      return { ...state, wrongNoteFlash: action.notes };

    case 'LOAD_STAGE':
      return {
        ...state,
        activeExercise: action.exercise,
        score: action.score,
        practiceResults: new Map(),
        currentMeasureIndex: -1,
        currentNoteIndices: new Map(),
        currentRunStartTime: null,
        isPlaying: false,
        freeTempoMeasureIndex: 0,
        freeTempoNoteIndex: 0,
        hasCompletedRun: false,
        freeTempoRunComplete: false,
        lastExerciseResult: null,
      };

    case 'MARK_ONBOARDING_SEEN': {
      const next = markOnboardingSeen(state.progress);
      if (next === state.progress) return state;
      saveProgress(next);
      return { ...state, progress: next };
    }

    case 'MARK_GUIDANCE_INTRODUCED': {
      const next = markGuidanceIntroduced(
        state.progress,
        action.stage,
        action.exercise,
      );
      if (next === state.progress) return state;
      saveProgress(next);
      return { ...state, progress: next };
    }

    default:
      return state;
  }
}

interface ScalesContextValue {
  state: ScalesState;
  dispatch: React.Dispatch<Action>;
  startSession: () => void;
  startMicrophoneInput: () => Promise<boolean>;
  stopMicrophoneInput: () => void;
  toggleMicrophone: () => void;
  toggleMidiDevice: (deviceId: string) => void;
  /**
   * True during the initial boot window while we're attempting to auto-restore
   * the user's saved audio input. Consumers (e.g. the InputGateway) should use
   * this to avoid flashing a "no input" state before restoration completes.
   */
  audioBootstrapping: boolean;
  /**
   * False until the first Web MIDI `requestMIDIAccess` + device enumeration
   * finishes. Keeps {@link InputGateway} hidden until we know whether a
   * keyboard is already connected (avoids a one-frame "connect your piano"
   * flash for MIDI users).
   */
  midiReady: boolean;
}

const ScalesContext = createContext<ScalesContextValue | null>(null);

export function ScalesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const midiRef = useRef<MidiInput | null>(null);
  const acousticRef = useRef<AcousticInput | null>(null);
  const disabledDeviceIdsRef = useRef<Set<string>>(new Set());
  // Start in a "bootstrapping" state whenever the user had saved audio
  // preferences that we're about to try to restore. This suppresses the
  // InputGateway modal during the brief async window while we query the
  // permission API and start the mic.
  const [audioBootstrapping, setAudioBootstrapping] = useState(
    () => loadAudioPrefs().microphoneRequested,
  );
  const [midiReady, setMidiReady] = useState(false);

  useEffect(() => {
    disabledDeviceIdsRef.current = state.disabledMidiDeviceIds;
    // Persist disabled-device choices so they stick across refreshes.
    updateAudioPrefs({
      disabledMidiDeviceIds: Array.from(state.disabledMidiDeviceIds),
    });
  }, [state.disabledMidiDeviceIds]);

  useEffect(() => {
    let cancelled = false;
    const midi = getMidiInput();
    midiRef.current = midi;
    midi.onNote((type, note, _velocity, timestamp, deviceId) => {
      if (disabledDeviceIdsRef.current.has(deviceId)) return;
      if (type === 'noteon') {
        recordMidiNoteOn(note, timestamp);
        dispatch({ type: 'MIDI_NOTE_ON', note, perfMs: performance.now() });
        if (isDebugEnabled()) {
          logDebugEvent({ type: 'note_on', t: performance.now(), midi: note, source: 'midi',
            rawTimestamp: timestamp, compensatedTimestamp: timestamp });
        }
      } else {
        recordMidiNoteOff(note);
        dispatch({ type: 'MIDI_NOTE_OFF', note, perfMs: performance.now() });
        if (isDebugEnabled()) logDebugEvent({ type: 'note_off', t: performance.now(), midi: note, source: 'midi' });
      }
    });
    midi.onConnection((connected, devices) => {
      dispatch({ type: 'SET_MIDI_CONNECTED', connected });
      dispatch({ type: 'SET_MIDI_DEVICES', devices });
      const hasEnabled = devices.some(d => d.connected && !disabledDeviceIdsRef.current.has(d.id));
      if (connected && hasEnabled) {
        dispatch({ type: 'SET_INPUT_MODE', mode: 'midi' });
      }
    });
    void midi.init().finally(() => {
      if (!cancelled) setMidiReady(true);
    });
    return () => {
      cancelled = true;
      clearTimingStore();
    };
  }, []);

  const startMicrophoneInput = useCallback(async (): Promise<boolean> => {
    if (acousticRef.current?.isRunning()) return true;
    const acoustic = new AcousticInput({
      onNoteOn: (midi) => {
        const rawTime = performance.now();
        const compensated = rawTime - MIC_LATENCY_COMPENSATION_MS;
        recordMidiNoteOn(midi, compensated);
        dispatch({ type: 'MIDI_NOTE_ON', note: midi, perfMs: performance.now() });
        if (isDebugEnabled()) {
          logDebugEvent({ type: 'note_on', t: rawTime, midi, source: 'mic',
            rawTimestamp: rawTime, compensatedTimestamp: compensated });
        }
      },
      onNoteOff: (midi) => {
        recordMidiNoteOff(midi);
        dispatch({ type: 'MIDI_NOTE_OFF', note: midi, perfMs: performance.now() });
        if (isDebugEnabled()) logDebugEvent({ type: 'note_off', t: performance.now(), midi, source: 'mic' });
      },
    });
    try {
      await acoustic.start();
      acousticRef.current = acoustic;
      dispatch({ type: 'SET_MICROPHONE_ACTIVE', active: true });
      dispatch({ type: 'SET_INPUT_MODE', mode: 'mic' });
      updateAudioPrefs({ microphoneRequested: true });
      return true;
    } catch {
      dispatch({ type: 'SET_MICROPHONE_ACTIVE', active: false });
      return false;
    }
  }, []);

  const stopMicrophoneInput = useCallback(() => {
    acousticRef.current?.stop();
    acousticRef.current = null;
    dispatch({ type: 'SET_MICROPHONE_ACTIVE', active: false });
    updateAudioPrefs({ microphoneRequested: false });
    if (!midiRef.current?.isConnected()) {
      dispatch({ type: 'SET_INPUT_MODE', mode: 'none' });
    }
  }, []);

  const toggleMicrophone = useCallback(async () => {
    if (acousticRef.current?.isRunning()) {
      stopMicrophoneInput();
    } else {
      await startMicrophoneInput();
    }
  }, [startMicrophoneInput, stopMicrophoneInput]);

  // Auto-restore the microphone on boot when the user previously had it
  // enabled AND the browser already has a persistent grant. We never call
  // getUserMedia on mount without a granted permission, to avoid surprising
  // the user with a prompt on an "inactive" tab.
  useEffect(() => {
    let cancelled = false;
    const prefs = loadAudioPrefs();
    if (!prefs.microphoneRequested) {
      setAudioBootstrapping(false);
      return;
    }
    (async () => {
      try {
        const granted = await isMicrophonePermissionGranted();
        if (cancelled) return;
        if (granted && !acousticRef.current?.isRunning()) {
          await startMicrophoneInput();
        }
      } finally {
        if (!cancelled) setAudioBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startMicrophoneInput]);

  const toggleMidiDevice = useCallback((deviceId: string) => {
    dispatch({ type: 'TOGGLE_MIDI_DEVICE', deviceId });
  }, []);

  const startSession = useCallback(() => {
    const plan = planSession(state.progress);
    dispatch({ type: 'START_SESSION', plan });
    analytics.trackEvent('session_start', {
      exercise_count: plan.exercises.length,
    });
  }, [state.progress]);

  return (
    <ScalesContext.Provider value={{ state, dispatch, startSession, startMicrophoneInput, stopMicrophoneInput, toggleMicrophone, toggleMidiDevice, audioBootstrapping, midiReady }}>
      {children}
    </ScalesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- co-located context hook is conventional
export function useScales(): ScalesContextValue {
  const ctx = useContext(ScalesContext);
  if (!ctx) throw new Error('useScales must be used inside ScalesProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components -- utility derived from state
export function hasEnabledMidiDevice(state: Pick<ScalesState, 'midiDevices' | 'disabledMidiDeviceIds'>): boolean {
  return state.midiDevices.some(d => d.connected && !state.disabledMidiDeviceIds.has(d.id));
}
