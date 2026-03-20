import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type { PianoScore, MidiDevice, NoteDuration, PracticeNoteResult, PracticeRun, PracticeSession } from './types';
import { generateNoteId, durationToBeats } from './types';
import type { SoundType } from '../chords/types/soundOptions';
import { ScorePlaybackEngine, getScorePlaybackEngine } from './utils/scorePlayback';
import { getMidiInput, type MidiInput } from './utils/midiInput';
import { recordMidiNoteOn, recordMidiNoteOff, clearAll as clearTimingStore } from './utils/practiceTimingStore';
import { DEFAULT_SCORE } from './data/scales';

export type ActiveMode = 'none' | 'play' | 'practice' | 'free-practice';

interface PianoState {
  score: PianoScore | null;
  activeMode: ActiveMode;
  isPlaying: boolean;
  tempo: number;
  soundType: SoundType;
  metronomeEnabled: boolean;
  loopingEnabled: boolean;
  currentMeasureIndex: number;
  currentNoteIndices: Map<string, number>;
  midiConnected: boolean;
  midiDevices: MidiDevice[];
  activeMidiNotes: Set<number>;
  trackMuted: Map<string, boolean>;
  trackVolume: Map<string, number>;
  masterVolume: number;
  masterMuted: boolean;
  metronomeVolume: number;
  practiceResults: PracticeNoteResult[];
  practiceResultsByNoteId: Map<string, PracticeNoteResult>;
  practiceSession: PracticeSession | null;
  currentRunStartTime: number | null;
  practiceLeftHand: boolean;
  practiceRightHand: boolean;
  countingIn: boolean;
  freeTempoNoteIndex: number;
  freeTempoMeasureIndex: number;
  selectedDuration: NoteDuration;
  durationMode: 'auto' | NoteDuration;
  dotted: boolean;
  selectedFinger: number | null;
  inputMode: 'select' | 'step-input';
  sampleLoadingProgress: { loaded: number; total: number } | null;
  viewingRunIndex: number | null;
  undoStack: PianoScore[];
  redoStack: PianoScore[];
  ghostNotes: { midi: number; duration: NoteDuration }[];
}

type Action =
  | { type: 'SET_SCORE'; score: PianoScore }
  | { type: 'SET_ACTIVE_MODE'; mode: ActiveMode }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'SET_TEMPO'; tempo: number }
  | { type: 'SET_SOUND_TYPE'; soundType: SoundType }
  | { type: 'SET_METRONOME'; enabled: boolean }
  | { type: 'SET_LOOPING'; enabled: boolean }
  | { type: 'UPDATE_POSITION'; measureIndex: number; noteIndices: Map<string, number> }
  | { type: 'SET_MIDI_CONNECTED'; connected: boolean }
  | { type: 'SET_MIDI_DEVICES'; devices: MidiDevice[] }
  | { type: 'ADD_MIDI_NOTE'; note: number }
  | { type: 'REMOVE_MIDI_NOTE'; note: number }
  | { type: 'SET_TRACK_MUTED'; partId: string; muted: boolean }
  | { type: 'SET_TRACK_VOLUME'; partId: string; volume: number }
  | { type: 'SET_MASTER_VOLUME'; volume: number }
  | { type: 'SET_MASTER_MUTED'; muted: boolean }
  | { type: 'SET_METRONOME_VOLUME'; volume: number }
  | { type: 'ADD_PRACTICE_RESULT'; result: PracticeNoteResult }
  | { type: 'CLEAR_PRACTICE_RESULTS' }
  | { type: 'SET_SELECTED_DURATION'; duration: NoteDuration }
  | { type: 'SET_DURATION_MODE'; mode: 'auto' | NoteDuration }
  | { type: 'SET_DOTTED'; dotted: boolean }
  | { type: 'SET_INPUT_MODE'; mode: 'select' | 'step-input' }
  | { type: 'SET_SAMPLE_LOADING'; progress: { loaded: number; total: number } | null }
  | { type: 'STEP_INPUT_NOTE'; midi: number; duration?: NoteDuration; dotted?: boolean }
  | { type: 'STEP_INPUT_REST'; duration?: NoteDuration; dotted?: boolean }
  | { type: 'DELETE_LAST_NOTE' }
  | { type: 'CLEAR_ALL_NOTES' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'START_PRACTICE_RUN' }
  | { type: 'END_PRACTICE_RUN' }
  | { type: 'CLEAR_SESSION' }
  | { type: 'SET_PRACTICE_LEFT_HAND'; enabled: boolean }
  | { type: 'SET_PRACTICE_RIGHT_HAND'; enabled: boolean }
  | { type: 'SET_COUNTING_IN'; counting: boolean }
  | { type: 'ADVANCE_FREE_TEMPO' }
  | { type: 'SET_VIEWING_RUN'; index: number | null }
  | { type: 'SET_GHOST_NOTES'; notes: { midi: number; duration: NoteDuration }[] }
  | { type: 'STEP_INPUT_CHORD'; midis: number[]; duration?: NoteDuration; dotted?: boolean };

// eslint-disable-next-line react-refresh/only-export-components -- exported for tests alongside Provider
export const initialState: PianoState = {
  score: DEFAULT_SCORE,
  activeMode: 'none',
  isPlaying: false,
  tempo: 80,
  soundType: 'piano',
  metronomeEnabled: true,
  loopingEnabled: true,
  currentMeasureIndex: 0,
  currentNoteIndices: new Map(),
  midiConnected: false,
  midiDevices: [],
  activeMidiNotes: new Set(),
  trackMuted: new Map(),
  trackVolume: new Map([['rh', 1], ['lh', 1]]),
  masterVolume: 1,
  masterMuted: false,
  metronomeVolume: 0.7,
  practiceResults: [],
  practiceResultsByNoteId: new Map(),
  practiceSession: null,
  currentRunStartTime: null,
  practiceLeftHand: true,
  practiceRightHand: true,
  countingIn: false,
  freeTempoNoteIndex: 0,
  freeTempoMeasureIndex: 0,
  selectedDuration: 'quarter',
  durationMode: 'auto',
  dotted: false,
  selectedFinger: null,
  inputMode: 'select',
  sampleLoadingProgress: null,
  viewingRunIndex: null,
  undoStack: [],
  redoStack: [],
  ghostNotes: [],
};

function addChordToPart(
  score: PianoScore, partId: string, pitches: number[], dur: NoteDuration, isDotted: boolean,
): PianoScore {
  const targetPart = score.parts.find(p => p.id === partId);
  if (!targetPart) return score;
  const beatsPerMeasure = (score.timeSignature.numerator / score.timeSignature.denominator) * 4;
  const lastMeasure = targetPart.measures[targetPart.measures.length - 1] || { notes: [] };
  const usedBeats = lastMeasure.notes.reduce((sum, n) => sum + durationToBeats(n.duration, n.dotted), 0);
  const noteBeats = durationToBeats(dur, isDotted);
  const newNote = { id: generateNoteId(), pitches, duration: dur, dotted: isDotted || undefined };
  let newMeasures;
  if (usedBeats + noteBeats > beatsPerMeasure + 0.001) {
    newMeasures = [...targetPart.measures, { notes: [newNote] }];
  } else {
    newMeasures = [...targetPart.measures.slice(0, -1), { notes: [...lastMeasure.notes, newNote] }];
  }
  return { ...score, parts: score.parts.map(p => p.id === partId ? { ...p, measures: newMeasures } : p) };
}

// eslint-disable-next-line react-refresh/only-export-components -- exported for tests alongside Provider
export function reducer(state: PianoState, action: Action): PianoState {
  switch (action.type) {
    case 'SET_SCORE':
      return {
        ...state, score: action.score, tempo: action.score.tempo,
        currentMeasureIndex: 0, currentNoteIndices: new Map(),
        practiceResults: [], practiceResultsByNoteId: new Map(),
      };
    case 'SET_ACTIVE_MODE':
      return {
        ...state, activeMode: action.mode,
        practiceResults: action.mode !== 'none' ? [] : state.practiceResults,
        practiceResultsByNoteId: action.mode !== 'none' ? new Map() : state.practiceResultsByNoteId,
        practiceSession: action.mode !== 'none' && state.score
          ? (state.practiceSession ?? { scoreId: state.score.id, runs: [] })
          : state.practiceSession,
        currentRunStartTime: null,
        freeTempoNoteIndex: 0,
        freeTempoMeasureIndex: 0,
        viewingRunIndex: null,
      };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.playing };
    case 'SET_TEMPO':
      return { ...state, tempo: action.tempo };
    case 'SET_SOUND_TYPE':
      return { ...state, soundType: action.soundType };
    case 'SET_METRONOME':
      return { ...state, metronomeEnabled: action.enabled };
    case 'SET_LOOPING':
      return { ...state, loopingEnabled: action.enabled };
    case 'UPDATE_POSITION':
      return { ...state, currentMeasureIndex: action.measureIndex, currentNoteIndices: action.noteIndices };
    case 'SET_MIDI_CONNECTED':
      return { ...state, midiConnected: action.connected };
    case 'SET_MIDI_DEVICES':
      return { ...state, midiDevices: action.devices };
    case 'ADD_MIDI_NOTE':
      return { ...state, activeMidiNotes: new Set([...state.activeMidiNotes, action.note]) };
    case 'REMOVE_MIDI_NOTE': {
      const next = new Set(state.activeMidiNotes);
      next.delete(action.note);
      return { ...state, activeMidiNotes: next };
    }
    case 'SET_TRACK_MUTED':
      return { ...state, trackMuted: new Map(state.trackMuted).set(action.partId, action.muted) };
    case 'SET_TRACK_VOLUME':
      return { ...state, trackVolume: new Map(state.trackVolume).set(action.partId, action.volume) };
    case 'SET_MASTER_VOLUME':
      return { ...state, masterVolume: action.volume };
    case 'SET_MASTER_MUTED':
      return { ...state, masterMuted: action.muted };
    case 'SET_METRONOME_VOLUME':
      return { ...state, metronomeVolume: action.volume };
    case 'ADD_PRACTICE_RESULT': {
      const results = [...state.practiceResults, action.result];
      const byId = new Map(state.practiceResultsByNoteId);
      byId.set(action.result.noteId, action.result);
      return { ...state, practiceResults: results, practiceResultsByNoteId: byId };
    }
    case 'CLEAR_PRACTICE_RESULTS':
      return { ...state, practiceResults: [], practiceResultsByNoteId: new Map() };
    case 'START_PRACTICE_RUN':
      return {
        ...state, practiceResults: [], practiceResultsByNoteId: new Map(),
        currentRunStartTime: Date.now(), freeTempoNoteIndex: 0, freeTempoMeasureIndex: 0,
        viewingRunIndex: null,
      };
    case 'END_PRACTICE_RUN': {
      if (!state.currentRunStartTime || !state.practiceSession) return state;
      const total = state.practiceResults.length;
      const hits = state.practiceResults.filter(r => r.timing === 'perfect' && r.pitchCorrect).length;
      const run: PracticeRun = {
        startTime: state.currentRunStartTime,
        endTime: Date.now(),
        results: [...state.practiceResults],
        accuracy: total > 0 ? Math.round((hits / total) * 100) : 0,
      };
      return {
        ...state,
        practiceSession: {
          ...state.practiceSession,
          runs: [...state.practiceSession.runs, run],
        },
        currentRunStartTime: null,
      };
    }
    case 'CLEAR_SESSION':
      return {
        ...state,
        practiceSession: state.score ? { scoreId: state.score.id, runs: [] } : null,
        viewingRunIndex: null,
      };
    case 'SET_SELECTED_DURATION':
      return { ...state, selectedDuration: action.duration };
    case 'SET_DURATION_MODE':
      return {
        ...state, durationMode: action.mode,
        selectedDuration: action.mode !== 'auto' ? action.mode : state.selectedDuration,
      };
    case 'SET_DOTTED':
      return { ...state, dotted: action.dotted };
    case 'SET_INPUT_MODE':
      return { ...state, inputMode: action.mode };
    case 'SET_SAMPLE_LOADING':
      return { ...state, sampleLoadingProgress: action.progress };
    case 'STEP_INPUT_NOTE': {
      if (!state.score || state.inputMode !== 'step-input') return state;
      const prevScore = state.score;
      const partId = action.midi < 60 ? 'lh' : 'rh';
      const targetPart = prevScore.parts.find(p => p.id === partId);
      if (!targetPart) return state;
      const dur = action.duration ?? state.selectedDuration;
      const isDotted = action.dotted ?? state.dotted;
      const beatsPerMeasure = (prevScore.timeSignature.numerator / prevScore.timeSignature.denominator) * 4;
      const lastMeasure = targetPart.measures[targetPart.measures.length - 1] || { notes: [] };
      const usedBeats = lastMeasure.notes.reduce((sum, n) => sum + durationToBeats(n.duration, n.dotted), 0);
      const noteBeats = durationToBeats(dur, isDotted);
      const newNote = { id: generateNoteId(), pitches: [action.midi], duration: dur, dotted: isDotted || undefined };
      let newMeasures;
      if (usedBeats + noteBeats > beatsPerMeasure + 0.001) {
        newMeasures = [...targetPart.measures, { notes: [newNote] }];
      } else {
        newMeasures = [...targetPart.measures.slice(0, -1), { notes: [...lastMeasure.notes, newNote] }];
      }
      const updatedParts = prevScore.parts.map(p => p.id === partId ? { ...p, measures: newMeasures } : p);
      const newScore = { ...prevScore, parts: updatedParts };
      return {
        ...state, score: newScore,
        undoStack: [...state.undoStack.slice(-49), prevScore],
        redoStack: [],
      };
    }
    case 'STEP_INPUT_REST': {
      if (!state.score || state.inputMode !== 'step-input') return state;
      const prevScore = state.score;
      const rh = prevScore.parts.find(p => p.id === 'rh');
      if (!rh) return state;
      const dur = action.duration ?? state.selectedDuration;
      const isDotted = action.dotted ?? state.dotted;
      const beatsPerMeasure = (prevScore.timeSignature.numerator / prevScore.timeSignature.denominator) * 4;
      const lastMeasure = rh.measures[rh.measures.length - 1] || { notes: [] };
      const usedBeats = lastMeasure.notes.reduce((sum, n) => sum + durationToBeats(n.duration, n.dotted), 0);
      const noteBeats = durationToBeats(dur, isDotted);
      const restNote = { id: generateNoteId(), pitches: [] as number[], duration: dur, rest: true, dotted: isDotted || undefined };
      let newMeasures;
      if (usedBeats + noteBeats > beatsPerMeasure + 0.001) {
        newMeasures = [...rh.measures, { notes: [restNote] }];
      } else {
        newMeasures = [...rh.measures.slice(0, -1), { notes: [...lastMeasure.notes, restNote] }];
      }
      const updatedParts = prevScore.parts.map(p => p.id === 'rh' ? { ...p, measures: newMeasures } : p);
      const newScore = { ...prevScore, parts: updatedParts };
      return {
        ...state, score: newScore,
        undoStack: [...state.undoStack.slice(-49), prevScore],
        redoStack: [],
      };
    }
    case 'DELETE_LAST_NOTE': {
      if (!state.score) return state;
      const prevScore = state.score;
      const allParts = prevScore.parts.filter(p => p.measures.some(m => m.notes.length > 0));
      if (allParts.length === 0) return state;
      const targetPart = allParts[allParts.length - 1];
      const lastM = targetPart.measures[targetPart.measures.length - 1];
      if (!lastM || lastM.notes.length === 0) return state;
      let newMeasures;
      if (lastM.notes.length <= 1) {
        if (targetPart.measures.length <= 1) {
          newMeasures = [{ notes: [] }];
        } else {
          newMeasures = targetPart.measures.slice(0, -1);
        }
      } else {
        newMeasures = [...targetPart.measures.slice(0, -1), { notes: lastM.notes.slice(0, -1) }];
      }
      const updatedParts = prevScore.parts.map(p => p.id === targetPart.id ? { ...p, measures: newMeasures } : p);
      const newScore = { ...prevScore, parts: updatedParts };
      return {
        ...state, score: newScore,
        undoStack: [...state.undoStack.slice(-49), prevScore],
        redoStack: [],
      };
    }
    case 'CLEAR_ALL_NOTES': {
      if (!state.score) return state;
      const prevScore = state.score;
      const updatedParts = prevScore.parts.map(p => ({
        ...p, measures: [{ notes: [] }],
      }));
      const newScore = { ...prevScore, parts: updatedParts };
      return {
        ...state, score: newScore,
        undoStack: [...state.undoStack.slice(-49), prevScore],
        redoStack: [],
      };
    }
    case 'UNDO': {
      if (state.undoStack.length === 0 || !state.score) return state;
      const prevScore = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        score: prevScore,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.score],
      };
    }
    case 'REDO': {
      if (state.redoStack.length === 0 || !state.score) return state;
      const nextScore = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        score: nextScore,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, state.score],
      };
    }
    case 'SET_PRACTICE_LEFT_HAND':
      return { ...state, practiceLeftHand: action.enabled };
    case 'SET_PRACTICE_RIGHT_HAND':
      return { ...state, practiceRightHand: action.enabled };
    case 'SET_COUNTING_IN':
      return { ...state, countingIn: action.counting };
    case 'ADVANCE_FREE_TEMPO': {
      if (!state.score) return state;
      const practicedParts = state.score.parts.filter(p =>
        (p.hand === 'right' && state.practiceRightHand) ||
        (p.hand === 'left' && state.practiceLeftHand)
      );
      if (practicedParts.length === 0) return state;
      const refPart = practicedParts[0];
      let mi = state.freeTempoMeasureIndex;
      let ni = state.freeTempoNoteIndex + 1;
      while (mi < refPart.measures.length) {
        const m = refPart.measures[mi];
        while (ni < m.notes.length) {
          if (!m.notes[ni].rest) {
            const noteIndices = new Map<string, number>();
            for (const p of practicedParts) {
              noteIndices.set(p.id, ni);
            }
            return {
              ...state, freeTempoMeasureIndex: mi, freeTempoNoteIndex: ni,
              currentMeasureIndex: mi, currentNoteIndices: noteIndices,
            };
          }
          ni++;
        }
        mi++;
        ni = 0;
      }
      return { ...state, freeTempoNoteIndex: -1 };
    }
    case 'SET_VIEWING_RUN':
      return { ...state, viewingRunIndex: action.index };
    case 'STEP_INPUT_CHORD': {
      if (!state.score || state.inputMode !== 'step-input') return state;
      const prevScore = state.score;
      const dur = action.duration ?? state.selectedDuration;
      const isDotted = action.dotted ?? state.dotted;
      const trebleMidis = action.midis.filter(m => m >= 60);
      const bassMidis = action.midis.filter(m => m < 60);
      let newScore = prevScore;
      if (trebleMidis.length > 0) newScore = addChordToPart(newScore, 'rh', trebleMidis, dur, isDotted);
      if (bassMidis.length > 0) newScore = addChordToPart(newScore, 'lh', bassMidis, dur, isDotted);
      return {
        ...state, score: newScore,
        undoStack: [...state.undoStack.slice(-49), prevScore],
        redoStack: [],
      };
    }
    case 'SET_GHOST_NOTES':
      return { ...state, ghostNotes: action.notes };
    default:
      return state;
  }
}

interface PianoContextValue {
  state: PianoState;
  dispatch: React.Dispatch<Action>;
  engine: ScorePlaybackEngine;
  midi: MidiInput;
  startMode: (mode: ActiveMode) => void;
  stopMode: () => void;
  loadScore: (score: PianoScore) => void;
}

const PianoContext = createContext<PianoContextValue | null>(null);

export function PianoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const engineRef = useRef<ScorePlaybackEngine>(getScorePlaybackEngine());
  const midiRef = useRef<MidiInput>(getMidiInput());
  const countInTimerRef = useRef<number | null>(null);
  const playbackGenRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const engine = engineRef.current;
  const midi = midiRef.current;

  useEffect(() => {
    engine.loadClickSound();
  }, [engine]);

  const midiHoldTimers = useRef<Map<number, number>>(new Map());
  const midiChordBuffer = useRef<{ notes: number[]; timer: number | null }>({ notes: [], timer: null });
  const midiReleaseBuffer = useRef<{ notes: { midi: number; startTime: number }[]; timer: number | null }>({ notes: [], timer: null });

  useEffect(() => {
    midi.onConnection((connected, devices) => {
      dispatch({ type: 'SET_MIDI_CONNECTED', connected });
      dispatch({ type: 'SET_MIDI_DEVICES', devices });
    });
    midi.onNote((type, note, _velocity, timestamp) => {
      if (type === 'noteon') {
        recordMidiNoteOn(note, timestamp);
        dispatch({ type: 'ADD_MIDI_NOTE', note });
        const s = stateRef.current;
        if (s.inputMode === 'step-input') {
          if (s.durationMode === 'auto') {
            midiHoldTimers.current.set(note, Date.now());
          } else {
            midiChordBuffer.current.notes.push(note);
            if (midiChordBuffer.current.timer !== null) clearTimeout(midiChordBuffer.current.timer);
            midiChordBuffer.current.timer = window.setTimeout(() => {
              const notes = midiChordBuffer.current.notes;
              midiChordBuffer.current.notes = [];
              midiChordBuffer.current.timer = null;
              if (notes.length === 1) {
                dispatch({ type: 'STEP_INPUT_NOTE', midi: notes[0] });
              } else if (notes.length > 1) {
                dispatch({ type: 'STEP_INPUT_CHORD', midis: notes });
              }
            }, 80);
          }
        }
        engine.playNote(note);
      } else {
        recordMidiNoteOff(note);
        dispatch({ type: 'REMOVE_MIDI_NOTE', note });
        const s = stateRef.current;
        if (s.inputMode === 'step-input' && s.durationMode === 'auto') {
          const startTime = midiHoldTimers.current.get(note);
          midiHoldTimers.current.delete(note);
          if (startTime !== undefined) {
            midiReleaseBuffer.current.notes.push({ midi: note, startTime });
            if (midiReleaseBuffer.current.timer !== null) clearTimeout(midiReleaseBuffer.current.timer);
            midiReleaseBuffer.current.timer = window.setTimeout(() => {
              const buffered = midiReleaseBuffer.current.notes;
              midiReleaseBuffer.current.notes = [];
              midiReleaseBuffer.current.timer = null;
              const earliestStart = Math.min(...buffered.map(n => n.startTime));
              const holdMs = Date.now() - earliestStart;
              const beatMs = 60000 / stateRef.current.tempo;
              const holdBeats = holdMs / beatMs;
              let dur: import('./types').NoteDuration;
              if (holdBeats >= 3) dur = 'whole';
              else if (holdBeats >= 1.5) dur = 'half';
              else if (holdBeats >= 0.75) dur = 'quarter';
              else if (holdBeats >= 0.375) dur = 'eighth';
              else dur = 'sixteenth';
              if (buffered.length === 1) {
                dispatch({ type: 'STEP_INPUT_NOTE', midi: buffered[0].midi, duration: dur });
              } else if (buffered.length > 1) {
                dispatch({ type: 'STEP_INPUT_CHORD', midis: buffered.map(n => n.midi), duration: dur });
              }
            }, 80);
          }
        }
      }
    });
    midi.init();
  }, [midi, engine]);

  const loadScore = useCallback((score: PianoScore) => {
    if (engine.isPlaying()) engine.stop();
    dispatch({ type: 'SET_SCORE', score });
    engine.setTempo(score.tempo);
  }, [engine]);

  const startPlayback = useCallback(() => {
    const gen = ++playbackGenRef.current;
    const s = stateRef.current;
    if (!s.score) return;

    engine.setTempo(s.tempo);
    engine.setLoop(s.loopingEnabled);
    engine.setLoopCallback(null);

    const onEnd = () => {
      if (playbackGenRef.current !== gen) return;
      dispatch({ type: 'SET_PLAYING', playing: false });
      dispatch({ type: 'SET_ACTIVE_MODE', mode: 'none' });
      dispatch({ type: 'UPDATE_POSITION', measureIndex: -1, noteIndices: new Map() });
    };

    engine.start(s.score, s.soundType, (_beat, measureIdx, noteIndices, isPlaying) => {
      if (playbackGenRef.current !== gen) return;
      dispatch({ type: 'UPDATE_POSITION', measureIndex: measureIdx, noteIndices });
      if (!isPlaying) return;
    }, onEnd).then(() => {
      if (playbackGenRef.current !== gen) return;
      dispatch({ type: 'SET_PLAYING', playing: true });
      engine.setMetronome(stateRef.current.metronomeEnabled);
    });
  }, [engine]);

  const startPracticeRun = useCallback(async () => {
    const gen = ++playbackGenRef.current;
    const s = stateRef.current;
    if (!s.score) return;
    dispatch({ type: 'START_PRACTICE_RUN' });

    dispatch({ type: 'SET_COUNTING_IN', counting: true });
    await engine.playCountIn(s.tempo);
    if (playbackGenRef.current !== gen) return;
    dispatch({ type: 'SET_COUNTING_IN', counting: false });

    const currentState = stateRef.current;
    if (currentState.activeMode !== 'practice') return;

    engine.setTempo(currentState.tempo);
    engine.setLoop(currentState.loopingEnabled);
    engine.setLoopCallback(() => {
      if (playbackGenRef.current !== gen) return;
      dispatch({ type: 'END_PRACTICE_RUN' });
      dispatch({ type: 'START_PRACTICE_RUN' });
    });

    const onEnd = () => {
      if (playbackGenRef.current !== gen) return;
      dispatch({ type: 'END_PRACTICE_RUN' });
      dispatch({ type: 'SET_PLAYING', playing: false });
      dispatch({ type: 'SET_ACTIVE_MODE', mode: 'none' });
      dispatch({ type: 'UPDATE_POSITION', measureIndex: -1, noteIndices: new Map() });
    };

    engine.start(currentState.score!, currentState.soundType, (_beat, measureIdx, noteIndices, isPlaying) => {
      if (playbackGenRef.current !== gen) return;
      dispatch({ type: 'UPDATE_POSITION', measureIndex: measureIdx, noteIndices });
      if (!isPlaying) return;
    }, onEnd).then(() => {
      if (playbackGenRef.current !== gen) return;
      dispatch({ type: 'SET_PLAYING', playing: true });
      engine.setMetronome(stateRef.current.metronomeEnabled);
    });
  }, [engine]);

  const startFreePractice = useCallback(() => {
    const s = stateRef.current;
    if (!s.score) return;
    dispatch({ type: 'START_PRACTICE_RUN' });

    const noteIndices = new Map<string, number>();
    const practicedParts = s.score.parts.filter(p =>
      (p.hand === 'right' && s.practiceRightHand) ||
      (p.hand === 'left' && s.practiceLeftHand)
    );
    for (const part of practicedParts) {
      noteIndices.set(part.id, 0);
    }
    dispatch({ type: 'UPDATE_POSITION', measureIndex: 0, noteIndices });
  }, []);

  const startMode = useCallback((mode: ActiveMode) => {
    playbackGenRef.current++;
    if (engine.isPlaying()) engine.stop();
    if (countInTimerRef.current) {
      clearTimeout(countInTimerRef.current);
      countInTimerRef.current = null;
    }
    dispatch({ type: 'SET_PLAYING', playing: false });
    dispatch({ type: 'SET_ACTIVE_MODE', mode });

    switch (mode) {
      case 'play':
        startPlayback();
        break;
      case 'practice':
        startPracticeRun();
        break;
      case 'free-practice':
        startFreePractice();
        break;
    }
  }, [engine, startPlayback, startPracticeRun, startFreePractice]);

  const stopMode = useCallback(() => {
    playbackGenRef.current++;
    if (countInTimerRef.current) {
      clearTimeout(countInTimerRef.current);
      countInTimerRef.current = null;
    }
    engine.setLoop(false);
    engine.setLoopCallback(null);
    if (engine.isPlaying()) engine.stop();
    dispatch({ type: 'SET_PLAYING', playing: false });
    dispatch({ type: 'SET_COUNTING_IN', counting: false });
    clearTimingStore();

    const s = stateRef.current;
    if (s.activeMode === 'practice' || s.activeMode === 'free-practice') {
      dispatch({ type: 'END_PRACTICE_RUN' });
    }
    dispatch({ type: 'SET_ACTIVE_MODE', mode: 'none' });
    dispatch({ type: 'UPDATE_POSITION', measureIndex: -1, noteIndices: new Map() });
  }, [engine]);

  const value: PianoContextValue = {
    state, dispatch, engine, midi, startMode, stopMode, loadScore,
  };
  return <PianoContext.Provider value={value}>{children}</PianoContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook exported with Provider (standard pattern)
export function usePiano(): PianoContextValue {
  const ctx = useContext(PianoContext);
  if (!ctx) throw new Error('usePiano must be used within PianoProvider');
  return ctx;
}
