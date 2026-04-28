import type { MelodiaExercise, PitchTrailPoint } from './types';
import {
  DEFAULT_COMFORT_HIGH,
  DEFAULT_COMFORT_LOW,
  type ComfortRange,
} from './storage';

export type MelodiaPhase = 'calibration' | 'audiation' | 'sing' | 'review' | 'debug';

export interface MelodiaState {
  phase: MelodiaPhase;
  exercise: MelodiaExercise | null;
  /** Semitones the loaded score was transposed by from the raw catalog entry. */
  transposeSemitones: number;
  /** A non-fatal warning surfaced when the score didn't fit the singer's range. */
  transposeWarning: string | null;
  /** Index into the linear path that produced this exercise. */
  pathIndex: number;
  /** Number of items in the linear path; cached so the router can render "Lesson n/N". */
  pathLength: number;
  /** Captured calibration MIDI from the "Sing your Do" path, if any. */
  calibrationMidi: number | null;
  comfort: ComfortRange;
  /** Adaptive scaffolding level for the *current* exercise (snapshot read at LOAD_EXERCISE). */
  helpLevel: number;
  /** True after the audiation playhead reaches the end. */
  audiationDone: boolean;
  /** Live pitch samples captured during the sing phase. */
  pitchTrail: PitchTrailPoint[];
  /** Recorded vocal blob from the sing phase. */
  performanceBlob: Blob | null;
  /** When set, app starts at the catalog/import "debug" phase. */
  debugMode: boolean;
}

export const initialMelodiaState: MelodiaState = {
  phase: 'calibration',
  exercise: null,
  transposeSemitones: 0,
  transposeWarning: null,
  pathIndex: 0,
  pathLength: 0,
  calibrationMidi: null,
  comfort: { low: DEFAULT_COMFORT_LOW, high: DEFAULT_COMFORT_HIGH },
  helpLevel: 0,
  audiationDone: false,
  pitchTrail: [],
  performanceBlob: null,
  debugMode: false,
};

export type MelodiaAction =
  | {
      type: 'INIT';
      phase: MelodiaPhase;
      pathIndex: number;
      pathLength: number;
      comfort: ComfortRange;
      calibrationMidi: number | null;
      debugMode: boolean;
    }
  | {
      type: 'CALIBRATION_DONE';
      calibrationMidi: number | null;
      comfort: ComfortRange;
    }
  | {
      type: 'LOAD_EXERCISE';
      exercise: MelodiaExercise;
      transposeSemitones: number;
      transposeWarning: string | null;
      pathIndex: number;
      helpLevel: number;
    }
  | { type: 'AUDIATION_DONE' }
  | { type: 'GO_SING' }
  | { type: 'RECORD_PITCH_SAMPLE'; t: number; midi: number | null }
  | { type: 'SING_STOP'; performanceBlob: Blob | null }
  | { type: 'GO_REVIEW' }
  | { type: 'PRACTICE_AGAIN' }
  | { type: 'NEXT_LESSON_PENDING' }
  | { type: 'SET_HELP_LEVEL'; level: number }
  | { type: 'GO_DEBUG' }
  | { type: 'GO_CALIBRATION' };

export function melodiaReducer(state: MelodiaState, action: MelodiaAction): MelodiaState {
  switch (action.type) {
    case 'INIT':
      return {
        ...state,
        phase: action.phase,
        pathIndex: action.pathIndex,
        pathLength: action.pathLength,
        comfort: action.comfort,
        calibrationMidi: action.calibrationMidi,
        debugMode: action.debugMode,
      };

    case 'CALIBRATION_DONE':
      return {
        ...state,
        phase: 'audiation',
        calibrationMidi: action.calibrationMidi,
        comfort: action.comfort,
        exercise: null,
        audiationDone: false,
        pitchTrail: [],
        performanceBlob: null,
      };

    case 'LOAD_EXERCISE':
      return {
        ...state,
        phase: 'audiation',
        exercise: action.exercise,
        transposeSemitones: action.transposeSemitones,
        transposeWarning: action.transposeWarning,
        pathIndex: action.pathIndex,
        helpLevel: action.helpLevel,
        audiationDone: false,
        pitchTrail: [],
        performanceBlob: null,
      };

    case 'AUDIATION_DONE':
      return state.phase === 'audiation' ? { ...state, audiationDone: true } : state;

    case 'GO_SING':
      if (state.phase !== 'audiation') return state;
      return { ...state, phase: 'sing', pitchTrail: [], performanceBlob: null };

    case 'RECORD_PITCH_SAMPLE':
      if (state.phase !== 'sing') return state;
      return {
        ...state,
        pitchTrail: [...state.pitchTrail, { t: action.t, midi: action.midi }],
      };

    case 'SING_STOP':
      return { ...state, performanceBlob: action.performanceBlob };

    case 'GO_REVIEW':
      return state.phase === 'sing' || state.phase === 'audiation'
        ? { ...state, phase: 'review' }
        : state;

    case 'PRACTICE_AGAIN':
      return {
        ...state,
        phase: 'audiation',
        audiationDone: false,
        pitchTrail: [],
        performanceBlob: null,
      };

    case 'NEXT_LESSON_PENDING':
      return {
        ...state,
        phase: 'audiation',
        audiationDone: false,
        pitchTrail: [],
        performanceBlob: null,
        exercise: null,
      };

    case 'SET_HELP_LEVEL':
      return { ...state, helpLevel: Math.max(0, Math.min(3, Math.floor(action.level))) };

    case 'GO_DEBUG':
      return { ...state, phase: 'debug' };

    case 'GO_CALIBRATION':
      return {
        ...state,
        phase: 'calibration',
        exercise: null,
        audiationDone: false,
        pitchTrail: [],
        performanceBlob: null,
      };

    default:
      return state;
  }
}
