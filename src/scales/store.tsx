import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type { SessionPlan, SessionExercise } from './curriculum/types';
import type { ScalesProgressData, PracticeRecord } from './progress/types';
import type { PracticeNoteResult } from '../shared/practice/types';
import type { PianoScore } from '../shared/music/scoreTypes';
import { loadProgress, saveProgress, recordPractice, getExerciseProgress } from './progress/store';
import { planSession } from './curriculum/sessionPlanner';
import { getMidiInput, MidiInput } from '../shared/midi/midiInput';
import { recordMidiNoteOn, recordMidiNoteOff, clearAll as clearTimingStore } from '../shared/practice/practiceTimingStore';
import { createAppAnalytics } from '../shared/utils/analytics';

const analytics = createAppAnalytics('scales');

type Screen = 'home' | 'session' | 'progress';

export interface ExerciseResult {
  accuracy: number;
  correct: number;
  total: number;
  advanced: boolean;
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
  practiceResults: Map<string, PracticeNoteResult>;
  currentRunStartTime: number | null;
  midiConnected: boolean;
  inputMode: InputMode;
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
  /** MIDI notes from a wrong-note attempt (brief flash, not recorded). */
  wrongNoteFlash: number[] | null;
}

type Action =
  | { type: 'SET_SCREEN'; screen: Screen }
  | { type: 'START_SESSION'; plan: SessionPlan }
  | { type: 'SET_ACTIVE_EXERCISE'; index: number; score: PianoScore }
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'UPDATE_POSITION'; measureIndex: number; noteIndices: Map<string, number> }
  | { type: 'MIDI_NOTE_ON'; note: number }
  | { type: 'MIDI_NOTE_OFF'; note: number }
  | { type: 'ADD_PRACTICE_RESULT'; result: PracticeNoteResult }
  | { type: 'START_PRACTICE_RUN' }
  | { type: 'FINISH_EXERCISE'; exerciseId: string; stageId: string }
  | { type: 'NEXT_EXERCISE'; score: PianoScore }
  | { type: 'COMPLETE_SESSION' }
  | { type: 'SET_MIDI_CONNECTED'; connected: boolean }
  | { type: 'SET_INPUT_MODE'; mode: InputMode }
  | { type: 'SET_FREE_TEMPO_POSITION'; measureIndex: number; noteIndex: number }
  | { type: 'ADVANCE_FREE_TEMPO' }
  | { type: 'FREE_TEMPO_RUN_COMPLETE' }
  | { type: 'RESTART_FREE_TEMPO' }
  | { type: 'WRONG_NOTE_FLASH'; notes: number[] };

function initialState(): ScalesState {
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
    practiceResults: new Map(),
    currentRunStartTime: null,
    midiConnected: false,
    inputMode: 'none',
    freeTempoMeasureIndex: 0,
    freeTempoNoteIndex: 0,
    hasCompletedRun: false,
    freeTempoRunComplete: false,
    lastExerciseResult: null,
    sessionComplete: false,
    wrongNoteFlash: null,
  };
}

function reducer(state: ScalesState, action: Action): ScalesState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen };

    case 'START_SESSION':
      return {
        ...state,
        screen: 'session',
        sessionPlan: action.plan,
        activeExerciseIndex: 0,
        activeExercise: action.plan.exercises[0] ?? null,
        practiceResults: new Map(),
        currentRunStartTime: null,
        lastExerciseResult: null,
        sessionComplete: false,
      };

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
      const next = new Set(state.activeMidiNotes);
      next.add(action.note);
      return { ...state, activeMidiNotes: next };
    }

    case 'MIDI_NOTE_OFF': {
      const next = new Set(state.activeMidiNotes);
      next.delete(action.note);
      return { ...state, activeMidiNotes: next };
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

    case 'FINISH_EXERCISE': {
      const total = state.score
        ? state.score.parts.reduce(
            (sum, p) => sum + p.measures.reduce((ms, m) => ms + m.notes.filter(n => !n.rest).length, 0), 0)
        : 0;
      const correct = Array.from(state.practiceResults.values()).filter(r => r.pitchCorrect).length;
      const accuracy = total > 0 ? correct / total : 0;

      const record: PracticeRecord = {
        exerciseId: action.exerciseId,
        stageId: action.stageId,
        timestamp: Date.now(),
        accuracy,
        noteCount: total,
        correctCount: correct,
      };

      const newProgress = recordPractice(state.progress, record);
      saveProgress(newProgress);

      const afterStageId = getExerciseProgress(newProgress, action.exerciseId).currentStageId;
      const advanced = afterStageId !== action.stageId;

      return {
        ...state,
        progress: newProgress,
        isPlaying: false,
        lastExerciseResult: { accuracy, correct, total, advanced },
      };
    }

    case 'NEXT_EXERCISE': {
      const nextIdx = state.activeExerciseIndex + 1;
      const nextExercise = state.sessionPlan?.exercises[nextIdx] ?? null;
      if (!nextExercise) {
        return { ...state, screen: 'home' };
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

    case 'COMPLETE_SESSION':
      return { ...state, screen: 'home', sessionComplete: true, isPlaying: false, lastExerciseResult: null };

    case 'SET_MIDI_CONNECTED':
      return { ...state, midiConnected: action.connected };

    case 'SET_INPUT_MODE':
      return { ...state, inputMode: action.mode };

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
      const parts = state.score.parts;
      const maxMeasures = Math.max(...parts.map(p => p.measures.length), 0);
      let mi = state.freeTempoMeasureIndex;
      let ni = state.freeTempoNoteIndex + 1;
      while (mi < maxMeasures) {
        const maxNotes = Math.max(...parts.map(p => p.measures[mi]?.notes.length ?? 0), 0);
        while (ni < maxNotes) {
          const hasPlayable = parts.some(p => {
            const note = p.measures[mi]?.notes[ni];
            return note && !note.rest;
          });
          if (hasPlayable) {
            const advNoteIndices = new Map<string, number>();
            for (const part of parts) {
              const key = part.hand === 'right' ? 'rh' : part.hand === 'left' ? 'lh' : 'voice';
              advNoteIndices.set(key, ni);
            }
            return {
              ...state,
              freeTempoMeasureIndex: mi,
              freeTempoNoteIndex: ni,
              currentNoteIndices: advNoteIndices,
              wrongNoteFlash: null,
            };
          }
          ni++;
        }
        mi++;
        ni = 0;
      }
      return { ...state, freeTempoRunComplete: true, hasCompletedRun: true, isPlaying: false };
    }

    case 'FREE_TEMPO_RUN_COMPLETE':
      return { ...state, freeTempoRunComplete: true, hasCompletedRun: true, isPlaying: false };

    case 'RESTART_FREE_TEMPO':
      return {
        ...state,
        freeTempoMeasureIndex: 0,
        freeTempoNoteIndex: 0,
        freeTempoRunComplete: false,
        practiceResults: new Map(),
        currentRunStartTime: Date.now(),
        isPlaying: true,
        lastExerciseResult: null,
        wrongNoteFlash: null,
      };

    case 'WRONG_NOTE_FLASH':
      return { ...state, wrongNoteFlash: action.notes };

    default:
      return state;
  }
}

interface ScalesContextValue {
  state: ScalesState;
  dispatch: React.Dispatch<Action>;
  startSession: () => void;
}

const ScalesContext = createContext<ScalesContextValue | null>(null);

export function ScalesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const midiRef = useRef<MidiInput | null>(null);

  useEffect(() => {
    const midi = getMidiInput();
    midiRef.current = midi;
    midi.onNote((type, note, _velocity, timestamp) => {
      if (type === 'noteon') {
        recordMidiNoteOn(note, timestamp);
        dispatch({ type: 'MIDI_NOTE_ON', note });
      } else {
        recordMidiNoteOff(note);
        dispatch({ type: 'MIDI_NOTE_OFF', note });
      }
    });
    midi.onConnection((connected) => {
      dispatch({ type: 'SET_MIDI_CONNECTED', connected });
      if (connected) {
        dispatch({ type: 'SET_INPUT_MODE', mode: 'midi' });
      }
    });
    midi.init();
    return () => { clearTimingStore(); };
  }, []);

  const startSession = useCallback(() => {
    const plan = planSession(state.progress);
    dispatch({ type: 'START_SESSION', plan });
    analytics.trackEvent('session_start', {
      exercise_count: plan.exercises.length,
    });
  }, [state.progress]);

  return (
    <ScalesContext.Provider value={{ state, dispatch, startSession }}>
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
