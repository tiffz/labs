import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type { SessionPlan, SessionExercise } from './curriculum/types';
import type { ScalesProgressData, PracticeRecord } from './progress/types';
import type { PracticeNoteResult } from '../shared/practice/types';
import type { PianoScore } from '../shared/music/scoreTypes';
import { loadProgress, saveProgress, recordPractice } from './progress/store';
import { planSession } from './curriculum/sessionPlanner';
import { getMidiInput, MidiInput } from '../shared/midi/midiInput';
import { recordMidiNoteOn, recordMidiNoteOff, clearAll as clearTimingStore } from '../shared/practice/practiceTimingStore';

type Screen = 'home' | 'session' | 'result' | 'progress';

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
  /** Free-tempo tracking */
  freeTempoMeasureIndex: number;
  freeTempoNoteIndex: number;
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
  | { type: 'FINISH_EXERCISE'; record: PracticeRecord }
  | { type: 'NEXT_EXERCISE'; score: PianoScore }
  | { type: 'SET_MIDI_CONNECTED'; connected: boolean }
  | { type: 'SET_FREE_TEMPO_POSITION'; measureIndex: number; noteIndex: number }
  | { type: 'ADVANCE_FREE_TEMPO' };

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
    freeTempoMeasureIndex: 0,
    freeTempoNoteIndex: 0,
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
      };

    case 'FINISH_EXERCISE': {
      const newProgress = recordPractice(state.progress, action.record);
      saveProgress(newProgress);
      return {
        ...state,
        progress: newProgress,
        isPlaying: false,
        screen: 'result',
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
      };
    }

    case 'SET_MIDI_CONNECTED':
      return { ...state, midiConnected: action.connected };

    case 'SET_FREE_TEMPO_POSITION':
      return {
        ...state,
        freeTempoMeasureIndex: action.measureIndex,
        freeTempoNoteIndex: action.noteIndex,
      };

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
            return { ...state, freeTempoMeasureIndex: mi, freeTempoNoteIndex: ni };
          }
          ni++;
        }
        mi++;
        ni = 0;
      }
      return { ...state, freeTempoNoteIndex: -1 };
    }

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
    });
    midi.init();
    return () => { clearTimingStore(); };
  }, []);

  const startSession = useCallback(() => {
    const plan = planSession(state.progress);
    dispatch({ type: 'START_SESSION', plan });
  }, [state.progress]);

  return (
    <ScalesContext.Provider value={{ state, dispatch, startSession }}>
      {children}
    </ScalesContext.Provider>
  );
}

export function useScales(): ScalesContextValue {
  const ctx = useContext(ScalesContext);
  if (!ctx) throw new Error('useScales must be used inside ScalesProvider');
  return ctx;
}
