import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type { PianoScore, MidiDevice, NoteDuration, PracticeNoteResult, PracticeRun, PracticeSession, Key } from './types';
import { generateNoteId, durationToBeats } from './types';
import type { SoundType } from '../chords/types/soundOptions';
import { ScorePlaybackEngine, getScorePlaybackEngine } from './utils/scorePlayback';
import { getMidiInput, type MidiInput } from './utils/midiInput';
import { recordMidiNoteOn, recordMidiNoteOff, clearAll as clearTimingStore } from './utils/practiceTimingStore';
import { DEFAULT_SCORE } from './data/scales';
import { addRecord, type PracticeRecord } from './utils/practiceHistory';
import { AcousticInput } from './utils/acousticInput';
import type { SongPracticeSettings, GlobalPracticePreferences } from './utils/libraryStorage';
import { SmartBeatMap } from './utils/smartBeatMap';
import { isDebugEnabled, logDebugEvent } from './utils/practiceDebugLog';

export type ActiveMode = 'none' | 'play' | 'practice' | 'free-practice';

export interface ScoreSection {
  name: string;
  startMeasure: number;
  endMeasure: number;
}

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
  fullScore: PianoScore | null;
  sections: ScoreSection[];
  activeSectionIndex: number | null;
  zoomLevel: number;
  selectedMeasureRange: { start: number; end: number } | null;
  showVocalPart: boolean;
  practiceVoice: boolean;
  showRightHand: boolean;
  showLeftHand: boolean;
  isExerciseScore: boolean;
  drumEnabled: boolean;
  drumVolume: number;
  currentBeat: number;
  editSnapshot: PianoScore | null;
  showChords: boolean;
  practiceChords: boolean;
  mediaFile: { name: string; url: string; type: 'audio' | 'video' } | null;
  mediaStartOffset: number;
  mediaVolume: number;
  mediaMuted: boolean;
  mediaVisible: boolean;
  microphoneActive: boolean;
  detectedPitch: number | null;
  countInEveryLoop: boolean;
  smartMetronomeEnabled: boolean;
  hasTempoVariance: boolean;
  mediaBeats: number[] | null;
  midiSoundEnabled: boolean;
  midiSoundVolume: number;
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
  | { type: 'STEP_INPUT_CHORD'; midis: number[]; duration?: NoteDuration; dotted?: boolean }
  | { type: 'SET_SCORE_FROM_ABC'; score: PianoScore }
  | { type: 'SET_SECTIONS'; sections: ScoreSection[] }
  | { type: 'LOAD_SECTION'; index: number }
  | { type: 'CLEAR_SECTIONS' }
  | { type: 'SET_ZOOM'; level: number }
  | { type: 'SELECT_MEASURE'; index: number }
  | { type: 'SELECT_MEASURE_RANGE'; index: number }
  | { type: 'CLEAR_MEASURE_SELECTION' }
  | { type: 'SET_SHOW_VOCAL'; show: boolean }
  | { type: 'SET_PRACTICE_VOICE'; enabled: boolean }
  | { type: 'SET_SHOW_RIGHT_HAND'; show: boolean }
  | { type: 'SET_SHOW_LEFT_HAND'; show: boolean }
  | { type: 'SET_IS_EXERCISE'; isExercise: boolean }
  | { type: 'SET_DRUM_ENABLED'; enabled: boolean }
  | { type: 'SET_DRUM_VOLUME'; volume: number }
  | { type: 'SET_CURRENT_BEAT'; beat: number }
  | { type: 'CANCEL_EDIT' }
  | { type: 'UPDATE_SCORE_META'; title?: string; key?: Key; tempo?: number; timeSignature?: { numerator: number; denominator: number } }
  | { type: 'TRANSPOSE_SCORE'; semitones: number }
  | { type: 'SET_SHOW_CHORDS'; show: boolean }
  | { type: 'SET_PRACTICE_CHORDS'; enabled: boolean }
  | { type: 'SET_MEDIA_FILE'; file: PianoState['mediaFile'] }
  | { type: 'SET_MEDIA_START_OFFSET'; offset: number }
  | { type: 'SET_MEDIA_VOLUME'; volume: number }
  | { type: 'SET_MEDIA_MUTED'; muted: boolean }
  | { type: 'SET_MEDIA_VISIBLE'; visible: boolean }
  | { type: 'SET_MICROPHONE_ACTIVE'; active: boolean }
  | { type: 'SET_DETECTED_PITCH'; pitch: number | null }
  | { type: 'SET_COUNT_IN_EVERY_LOOP'; enabled: boolean }
  | { type: 'SET_SMART_METRONOME'; enabled: boolean }
  | { type: 'SET_MEDIA_BEATS'; beats: number[] | null; hasTempoVariance: boolean }
  | { type: 'SET_MIDI_SOUND'; enabled: boolean }
  | { type: 'SET_MIDI_SOUND_VOLUME'; volume: number }
  | { type: 'CANCEL_PRACTICE_RUN' }
  | { type: 'RESTORE_PRACTICE_SETTINGS'; settings: SongPracticeSettings }
  | { type: 'RESTORE_GLOBAL_PREFERENCES'; prefs: GlobalPracticePreferences };

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
  trackVolume: new Map([['rh', 1], ['lh', 1], ['voice', 1]]),
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
  fullScore: null,
  sections: [],
  activeSectionIndex: null,
  zoomLevel: 1.0,
  selectedMeasureRange: null,
  showVocalPart: false,
  practiceVoice: false,
  showRightHand: true,
  showLeftHand: true,
  isExerciseScore: true,
  drumEnabled: false,
  drumVolume: 0.7,
  currentBeat: 0,
  editSnapshot: null,
  showChords: true,
  practiceChords: false,
  mediaFile: null,
  mediaStartOffset: 0,
  mediaVolume: 0.8,
  mediaMuted: false,
  mediaVisible: true,
  microphoneActive: false,
  detectedPitch: null,
  countInEveryLoop: false,
  smartMetronomeEnabled: false,
  hasTempoVariance: false,
  mediaBeats: null,
  midiSoundEnabled: false,
  midiSoundVolume: 0.7,
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
    case 'SET_SCORE': {
      const measureCount = Math.max(...action.score.parts.map(p => p.measures.length), 0);
      let autoZoom = 1.0;
      if (measureCount > 40) autoZoom = 0.6;
      else if (measureCount > 20) autoZoom = 0.7;
      else if (measureCount > 8) autoZoom = 0.85;
      const hasVocal = action.score.parts.some(p => p.hand === 'voice');
      return {
        ...state, score: action.score, tempo: action.score.tempo,
        currentMeasureIndex: 0, currentNoteIndices: new Map(),
        practiceResults: [], practiceResultsByNoteId: new Map(),
        fullScore: null, sections: [], activeSectionIndex: null,
        zoomLevel: autoZoom, selectedMeasureRange: null,
        showVocalPart: hasVocal,
        isExerciseScore: false,
      };
    }
    case 'SET_SCORE_FROM_ABC': {
      if (!state.score) return state;
      return {
        ...state,
        score: action.score,
        undoStack: [...state.undoStack.slice(-49), state.score],
        redoStack: [],
      };
    }
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
    case 'CANCEL_PRACTICE_RUN':
      return {
        ...state,
        currentRunStartTime: null,
        practiceResults: [],
        practiceResultsByNoteId: new Map(),
      };
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
    case 'SET_INPUT_MODE': {
      if (action.mode === 'step-input') {
        return { ...state, inputMode: action.mode, editSnapshot: state.score ? JSON.parse(JSON.stringify(state.score)) : null, undoStack: [], redoStack: [] };
      }
      return { ...state, inputMode: action.mode, editSnapshot: null, undoStack: [], redoStack: [] };
    }
    case 'CANCEL_EDIT':
      return { ...state, inputMode: 'select', score: state.editSnapshot ?? state.score, editSnapshot: null, undoStack: [], redoStack: [] };
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
        (p.hand === 'left' && state.practiceLeftHand) ||
        (p.hand === 'voice' && state.practiceVoice)
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
    case 'SET_SECTIONS':
      return { ...state, sections: action.sections, activeSectionIndex: null };
    case 'LOAD_SECTION': {
      const section = state.sections[action.index];
      const source = state.fullScore ?? state.score;
      if (!section || !source) return state;
      const slicedParts = source.parts.map(p => ({
        ...p,
        measures: p.measures.slice(section.startMeasure, section.endMeasure + 1),
      }));
      const sectionScore: PianoScore = {
        ...source,
        id: `${source.id}-section-${action.index}`,
        title: `${source.title} — ${section.name}`,
        parts: slicedParts,
      };
      return {
        ...state,
        score: sectionScore,
        fullScore: state.fullScore ?? source,
        activeSectionIndex: action.index,
        currentMeasureIndex: 0,
        currentNoteIndices: new Map(),
      };
    }
    case 'CLEAR_SECTIONS':
      return {
        ...state,
        sections: [],
        activeSectionIndex: null,
        score: state.fullScore ?? state.score,
        fullScore: null,
      };
    case 'SET_ZOOM':
      return { ...state, zoomLevel: Math.max(0.4, Math.min(2.0, action.level)) };
    case 'SELECT_MEASURE': {
      return { ...state, selectedMeasureRange: { start: action.index, end: action.index } };
    }
    case 'SELECT_MEASURE_RANGE': {
      if (!state.selectedMeasureRange) {
        return { ...state, selectedMeasureRange: { start: action.index, end: action.index } };
      }
      const start = Math.min(state.selectedMeasureRange.start, action.index);
      const end = Math.max(state.selectedMeasureRange.start, action.index);
      return { ...state, selectedMeasureRange: { start, end } };
    }
    case 'CLEAR_MEASURE_SELECTION':
      return { ...state, selectedMeasureRange: null };
    case 'SET_SHOW_VOCAL':
      return { ...state, showVocalPart: action.show };
    case 'SET_PRACTICE_VOICE':
      return { ...state, practiceVoice: action.enabled };
    case 'SET_SHOW_RIGHT_HAND':
      return { ...state, showRightHand: action.show, practiceRightHand: action.show ? state.practiceRightHand : false };
    case 'SET_SHOW_LEFT_HAND':
      return { ...state, showLeftHand: action.show, practiceLeftHand: action.show ? state.practiceLeftHand : false };
    case 'SET_IS_EXERCISE':
      return { ...state, isExerciseScore: action.isExercise };
    case 'SET_DRUM_ENABLED':
      return { ...state, drumEnabled: action.enabled };
    case 'SET_DRUM_VOLUME':
      return { ...state, drumVolume: action.volume };
    case 'UPDATE_SCORE_META': {
      if (!state.score) return state;
      const updated = { ...state.score };
      if (action.title !== undefined) updated.title = action.title;
      if (action.key !== undefined) updated.key = action.key;
      if (action.tempo !== undefined) updated.tempo = action.tempo;
      if (action.timeSignature !== undefined) updated.timeSignature = action.timeSignature;
      return { ...state, score: updated, tempo: updated.tempo };
    }
    case 'TRANSPOSE_SCORE': {
      if (!state.score) return state;
      const semi = action.semitones;
      const KEY_ORDER: Key[] = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
      const FLAT_ORDER: Key[] = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
      const keyIdx: Record<string, number> = {
        'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,
        'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11,
      };
      const usesFlats = ['C','F','Bb','Eb','Ab','Db','Gb'].includes(state.score.key);
      const oldIdx = keyIdx[state.score.key] ?? 0;
      const newIdx = ((oldIdx + semi) % 12 + 12) % 12;
      const newKey = (usesFlats ? FLAT_ORDER : KEY_ORDER)[newIdx];
      const CHORD_ROOTS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
      const FLAT_ROOTS = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
      const roots = usesFlats ? FLAT_ROOTS : CHORD_ROOTS;

      function transposeChord(sym: string): string {
        const m = sym.match(/^([A-G][#b]?)(.*)/);
        if (!m) return sym;
        const ri = keyIdx[m[1]];
        if (ri === undefined) return sym;
        const ni = ((ri + semi) % 12 + 12) % 12;
        return roots[ni] + m[2];
      }

      const newParts = state.score.parts.map(part => ({
        ...part,
        measures: part.measures.map(measure => ({
          ...measure,
          notes: measure.notes.map(note => ({
            ...note,
            pitches: note.rest ? [] : note.pitches.map(p => p + semi),
            chordSymbol: note.chordSymbol ? transposeChord(note.chordSymbol) : undefined,
          })),
        })),
      }));
      return { ...state, score: { ...state.score, key: newKey, parts: newParts } };
    }
    case 'SET_SHOW_CHORDS':
      return { ...state, showChords: action.show };
    case 'SET_PRACTICE_CHORDS':
      return { ...state, practiceChords: action.enabled };
    case 'SET_MEDIA_FILE':
      return {
        ...state, mediaFile: action.file,
        ...(action.file === null ? { mediaBeats: null, hasTempoVariance: false, smartMetronomeEnabled: false } : {}),
      };
    case 'SET_MEDIA_START_OFFSET':
      return { ...state, mediaStartOffset: action.offset };
    case 'SET_MEDIA_VOLUME':
      return { ...state, mediaVolume: action.volume };
    case 'SET_MEDIA_MUTED':
      return { ...state, mediaMuted: action.muted };
    case 'SET_MEDIA_VISIBLE':
      return { ...state, mediaVisible: action.visible };
    case 'SET_MICROPHONE_ACTIVE':
      return { ...state, microphoneActive: action.active };
    case 'SET_DETECTED_PITCH':
      return { ...state, detectedPitch: action.pitch };
    case 'SET_COUNT_IN_EVERY_LOOP':
      return { ...state, countInEveryLoop: action.enabled };
    case 'SET_SMART_METRONOME':
      return { ...state, smartMetronomeEnabled: action.enabled };
    case 'SET_MIDI_SOUND':
      return { ...state, midiSoundEnabled: action.enabled };
    case 'SET_MIDI_SOUND_VOLUME':
      return { ...state, midiSoundVolume: action.volume };
    case 'SET_MEDIA_BEATS':
      return { ...state, mediaBeats: action.beats, hasTempoVariance: action.hasTempoVariance };
    case 'SET_CURRENT_BEAT':
      return { ...state, currentBeat: action.beat };
    case 'RESTORE_PRACTICE_SETTINGS': {
      const s = action.settings;
      const trackMuted = new Map(Object.entries(s.trackMuted));
      const trackVolume = new Map(Object.entries(s.trackVolume));
      const hasVocal = s.score.parts.some(p => p.hand === 'voice');
      return {
        ...state,
        score: s.score,
        tempo: s.tempo,
        showVocalPart: hasVocal && s.showVocalPart,
        showRightHand: s.showRightHand,
        showLeftHand: s.showLeftHand,
        showChords: s.showChords,
        practiceRightHand: s.practiceRightHand,
        practiceLeftHand: s.practiceLeftHand,
        practiceVoice: s.practiceVoice,
        practiceChords: s.practiceChords,
        drumEnabled: s.drumEnabled,
        drumVolume: s.drumVolume,
        zoomLevel: s.zoomLevel,
        selectedMeasureRange: s.selectedMeasureRange,
        trackMuted,
        trackVolume,
        currentMeasureIndex: 0,
        currentNoteIndices: new Map(),
        practiceResults: [],
        practiceResultsByNoteId: new Map(),
        fullScore: null,
        sections: [],
        activeSectionIndex: null,
        isExerciseScore: false,
      };
    }
    case 'RESTORE_GLOBAL_PREFERENCES': {
      const p = action.prefs;
      return {
        ...state,
        masterVolume: p.masterVolume,
        masterMuted: p.masterMuted,
        metronomeVolume: p.metronomeVolume,
        metronomeEnabled: p.metronomeEnabled,
        loopingEnabled: p.loopingEnabled,
        countInEveryLoop: p.countInEveryLoop,
        soundType: p.soundType,
        midiSoundEnabled: p.midiSoundEnabled ?? false,
        midiSoundVolume: p.midiSoundVolume ?? 0.7,
      };
    }
    default:
      return state;
  }
}

interface PianoContextValue {
  state: PianoState;
  dispatch: React.Dispatch<Action>;
  engine: ScorePlaybackEngine;
  toggleMicrophone: () => void;
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
  const acousticRef = useRef<AcousticInput | null>(null);
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
    midi.onNote((type, note, velocity, timestamp) => {
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
        if (s.midiSoundEnabled) {
          engine.playMidiNote(note, velocity * s.midiSoundVolume);
        }
      } else {
        recordMidiNoteOff(note);
        dispatch({ type: 'REMOVE_MIDI_NOTE', note });
        if (stateRef.current.midiSoundEnabled) {
          engine.stopMidiNote(note);
        }
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

  const getPlaybackScore = useCallback((): { score: PianoScore; measureOffset: number } | null => {
    const s = stateRef.current;
    if (!s.score) return null;
    if (s.selectedMeasureRange) {
      const { start, end } = s.selectedMeasureRange;
      const slicedParts = s.score.parts.map(p => ({
        ...p,
        measures: p.measures.slice(start, end + 1),
      }));
      return {
        score: { ...s.score, id: `${s.score.id}-sel`, parts: slicedParts },
        measureOffset: start,
      };
    }
    return { score: s.score, measureOffset: 0 };
  }, []);

  const startPlayback = useCallback(() => {
    const gen = ++playbackGenRef.current;
    const s = stateRef.current;
    const ps = getPlaybackScore();
    if (!ps) return;

    engine.setTempo(s.tempo);
    engine.setLoop(s.loopingEnabled);
    engine.setLoopCallback(null);
    engine.setSmartBeatMap(
      s.smartMetronomeEnabled && s.mediaBeats
        ? new SmartBeatMap(s.mediaBeats, s.mediaStartOffset)
        : null,
    );

    const onEnd = () => {
      if (playbackGenRef.current !== gen) return;
      dispatch({ type: 'SET_PLAYING', playing: false });
      dispatch({ type: 'SET_ACTIVE_MODE', mode: 'none' });
      dispatch({ type: 'UPDATE_POSITION', measureIndex: -1, noteIndices: new Map() });
    };

    engine.start(ps.score, s.soundType, (beat, measureIdx, noteIndices, isPlaying) => {
      if (playbackGenRef.current !== gen) return;
      dispatch({ type: 'UPDATE_POSITION', measureIndex: measureIdx + ps.measureOffset, noteIndices });
      dispatch({ type: 'SET_CURRENT_BEAT', beat });
      if (!isPlaying) return;
    }, onEnd).then(() => {
      if (playbackGenRef.current !== gen) return;
      dispatch({ type: 'SET_PLAYING', playing: true });
      engine.setMetronome(stateRef.current.metronomeEnabled);
    });
  }, [engine, getPlaybackScore]);

  const launchPracticePlayback = useCallback(async (gen: number, ps: ReturnType<typeof getPlaybackScore>) => {
    if (!ps) return;
    const currentState = stateRef.current;
    if (currentState.activeMode !== 'practice') return;

    const useCountInLoop = currentState.countInEveryLoop && currentState.loopingEnabled;

    engine.setTempo(currentState.tempo);
    engine.setLoop(useCountInLoop ? false : currentState.loopingEnabled);
    engine.setSmartBeatMap(
      currentState.smartMetronomeEnabled && currentState.mediaBeats
        ? new SmartBeatMap(currentState.mediaBeats, currentState.mediaStartOffset)
        : null,
    );
    engine.setLoopCallback(useCountInLoop ? null : () => {
      if (playbackGenRef.current !== gen) return;
      dispatch({ type: 'END_PRACTICE_RUN' });
      dispatch({ type: 'START_PRACTICE_RUN' });
    });

    const onEnd = () => {
      if (playbackGenRef.current !== gen) return;
      dispatch({ type: 'END_PRACTICE_RUN' });

      if (useCountInLoop) {
        dispatch({ type: 'START_PRACTICE_RUN' });
        dispatch({ type: 'SET_COUNTING_IN', counting: true });
        engine.playCountIn(stateRef.current.tempo).then(() => {
          if (playbackGenRef.current !== gen) return;
          dispatch({ type: 'SET_COUNTING_IN', counting: false });
          if (stateRef.current.activeMode !== 'practice') return;
          launchPracticePlayback(gen, ps);
        });
        return;
      }

      dispatch({ type: 'SET_PLAYING', playing: false });
      dispatch({ type: 'SET_ACTIVE_MODE', mode: 'none' });
      dispatch({ type: 'UPDATE_POSITION', measureIndex: -1, noteIndices: new Map() });
    };

    engine.start(ps.score, currentState.soundType, (beat, measureIdx, noteIndices, isPlaying) => {
      if (playbackGenRef.current !== gen) return;
      dispatch({ type: 'UPDATE_POSITION', measureIndex: measureIdx + ps.measureOffset, noteIndices });
      dispatch({ type: 'SET_CURRENT_BEAT', beat });
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
    const ps = getPlaybackScore();
    if (!ps) return;
    dispatch({ type: 'START_PRACTICE_RUN' });
    if (isDebugEnabled()) {
      logDebugEvent({ type: 'practice_start', t: performance.now(), mode: 'practice',
        tempo: s.tempo, scoreTitle: s.score?.title || '', practiceRH: s.practiceRightHand,
        practiceLH: s.practiceLeftHand, micActive: s.microphoneActive });
    }

    dispatch({ type: 'SET_COUNTING_IN', counting: true });
    await engine.playCountIn(s.tempo);
    if (playbackGenRef.current !== gen) return;
    dispatch({ type: 'SET_COUNTING_IN', counting: false });

    await launchPracticePlayback(gen, ps);
  }, [engine, getPlaybackScore, launchPracticePlayback]);

  const startFreePractice = useCallback(() => {
    const s = stateRef.current;
    if (!s.score) return;
    dispatch({ type: 'START_PRACTICE_RUN' });
    if (isDebugEnabled()) {
      logDebugEvent({ type: 'practice_start', t: performance.now(), mode: 'free-practice',
        tempo: s.tempo, scoreTitle: s.score.title || '', practiceRH: s.practiceRightHand,
        practiceLH: s.practiceLeftHand, micActive: s.microphoneActive });
    }

    const startMeasure = s.selectedMeasureRange?.start ?? 0;
    const noteIndices = new Map<string, number>();
    const practicedParts = s.score.parts.filter(p =>
      (p.hand === 'right' && s.practiceRightHand) ||
      (p.hand === 'left' && s.practiceLeftHand) ||
      (p.hand === 'voice' && s.practiceVoice)
    );
    for (const part of practicedParts) {
      noteIndices.set(part.id, 0);
    }
    dispatch({ type: 'UPDATE_POSITION', measureIndex: startMeasure, noteIndices });
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
      if (isDebugEnabled()) {
        logDebugEvent({ type: 'practice_end', t: performance.now(), resultCount: s.practiceResults.length });
      }

      const getMeasureCount = () => {
        if (!s.score) return 0;
        if (s.selectedMeasureRange) {
          return Math.max(0, s.selectedMeasureRange.end - s.selectedMeasureRange.start + 1);
        }
        return Math.max(...s.score.parts.map((p) => p.measures.length), 0);
      };

      const getProgressRatio = () => {
        const measureCount = getMeasureCount();
        if (measureCount <= 0) return 1;
        if (s.activeMode === 'free-practice') {
          const measureIdx = s.freeTempoMeasureIndex >= 0 ? s.freeTempoMeasureIndex : 0;
          if (s.selectedMeasureRange) {
            const relative = measureIdx - s.selectedMeasureRange.start;
            return Math.max(0, Math.min(1, (relative + 1) / measureCount));
          }
          return Math.max(0, Math.min(1, (measureIdx + 1) / measureCount));
        }
        const measureIdx = s.currentMeasureIndex >= 0 ? s.currentMeasureIndex : 0;
        if (s.selectedMeasureRange) {
          const relative = measureIdx - s.selectedMeasureRange.start;
          return Math.max(0, Math.min(1, (relative + 1) / measureCount));
        }
        return Math.max(0, Math.min(1, (measureIdx + 1) / measureCount));
      };

      const shouldDiscardCurrentRun =
        s.currentRunStartTime !== null &&
        getProgressRatio() < 0.5;

      const runs = [...(s.practiceSession?.runs ?? [])];
      if (!shouldDiscardCurrentRun && s.currentRunStartTime && s.practiceSession) {
        const total = s.practiceResults.length;
        const hits = s.practiceResults.filter((r) => r.timing === 'perfect' && r.pitchCorrect).length;
        runs.push({
          startTime: s.currentRunStartTime,
          endTime: Date.now(),
          results: [...s.practiceResults],
          accuracy: total > 0 ? Math.round((hits / total) * 100) : 0,
        });
      }

      if (shouldDiscardCurrentRun) {
        dispatch({ type: 'CANCEL_PRACTICE_RUN' });
      } else {
        dispatch({ type: 'END_PRACTICE_RUN' });
      }

      // Save practice record
      if (runs.length > 0 && s.score) {
        const avgAcc = Math.round(runs.reduce((sum, r) => sum + r.accuracy, 0) / runs.length);
        const bestAcc = Math.max(...runs.map((r) => r.accuracy));
        const totalMs = runs.reduce((sum, r) => sum + (r.endTime - r.startTime), 0);
        const hands: string[] = [];
        if (s.practiceRightHand) hands.push('right');
        if (s.practiceLeftHand) hands.push('left');
        if (s.practiceChords) hands.push('chords');
        const record: PracticeRecord = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: Date.now(),
          scoreId: s.score.id,
          scoreTitle: s.score.title || 'Untitled',
          tempo: s.tempo,
          runs,
          bestAccuracy: bestAcc,
          averageAccuracy: avgAcc,
          totalDurationMs: totalMs,
          practiceMode: s.activeMode === 'free-practice' ? 'free-practice' : 'practice',
          handsUsed: hands,
        };
        addRecord(record);
      }
    }
    dispatch({ type: 'SET_ACTIVE_MODE', mode: 'none' });
    dispatch({ type: 'UPDATE_POSITION', measureIndex: -1, noteIndices: new Map() });
  }, [engine]);

  const toggleMicrophone = useCallback(async () => {
    if (acousticRef.current?.isRunning()) {
      acousticRef.current.stop();
      acousticRef.current = null;
      dispatch({ type: 'SET_MICROPHONE_ACTIVE', active: false });
      dispatch({ type: 'SET_DETECTED_PITCH', pitch: null });
    } else {
      const acoustic = new AcousticInput({
        onNoteOn: (midi) => {
          recordMidiNoteOn(midi, performance.now());
          dispatch({ type: 'ADD_MIDI_NOTE', note: midi });
        },
        onNoteOff: (midi) => {
          recordMidiNoteOff(midi);
          dispatch({ type: 'REMOVE_MIDI_NOTE', note: midi });
        },
        onPitchDetected: (midi) => {
          dispatch({ type: 'SET_DETECTED_PITCH', pitch: midi });
        },
      });
      try {
        await acoustic.start();
        acousticRef.current = acoustic;
        dispatch({ type: 'SET_MICROPHONE_ACTIVE', active: true });
      } catch (err) {
        console.error('Microphone access failed:', err);
      }
    }
  }, []);

  // Load global preferences + last selection on mount
  useEffect(() => {
    import('./utils/libraryStorage').then(({ getGlobalPreferences, getLastSelection, getSongSettings }) => {
      const prefs = getGlobalPreferences();
      if (prefs) {
        dispatch({ type: 'RESTORE_GLOBAL_PREFERENCES', prefs });
        if (prefs.microphoneEnabled && !acousticRef.current?.isRunning()) {
          toggleMicrophone();
        }
      }
      const last = getLastSelection();
      if (last?.score) {
        if (!last.isExercise) {
          const saved = getSongSettings(last.score.id);
          if (saved) {
            dispatch({ type: 'RESTORE_PRACTICE_SETTINGS', settings: saved });
            engine.setTempo(saved.tempo);
            return;
          }
        }
        dispatch({ type: 'SET_SCORE', score: last.score });
        dispatch({ type: 'SET_IS_EXERCISE', isExercise: last.isExercise });
        engine.setTempo(last.score.tempo);
      }
    });
  }, [dispatch, toggleMicrophone, engine]);

  // Auto-save per-song practice settings (debounced)
  const songSaveTimerRef = useRef<number | null>(null);
  const { score, tempo, showVocalPart, showRightHand, showLeftHand, showChords,
    practiceRightHand, practiceLeftHand, practiceVoice, practiceChords,
    drumEnabled, drumVolume, zoomLevel, selectedMeasureRange,
    trackMuted, trackVolume, isExerciseScore } = state;
  useEffect(() => {
    if (!score || isExerciseScore) return;
    const scoreId = score.id;
    if (songSaveTimerRef.current) clearTimeout(songSaveTimerRef.current);
    songSaveTimerRef.current = window.setTimeout(() => {
      const settings: import('./utils/libraryStorage').SongPracticeSettings = {
        tempo, showVocalPart, showRightHand, showLeftHand, showChords,
        practiceRightHand, practiceLeftHand, practiceVoice, practiceChords,
        drumEnabled, drumVolume, zoomLevel, selectedMeasureRange,
        trackMuted: Object.fromEntries(trackMuted),
        trackVolume: Object.fromEntries(trackVolume),
        score,
      };
      import('./utils/libraryStorage').then(({ saveSongSettings, syncLibraryEntryFromScore }) => {
        saveSongSettings(scoreId, settings);
        syncLibraryEntryFromScore(score);
      });
    }, 1500);
    return () => { if (songSaveTimerRef.current) clearTimeout(songSaveTimerRef.current); };
  }, [score, tempo, showVocalPart, showRightHand, showLeftHand, showChords,
      practiceRightHand, practiceLeftHand, practiceVoice, practiceChords,
      drumEnabled, drumVolume, zoomLevel, selectedMeasureRange,
      trackMuted, trackVolume, isExerciseScore]);

  // Persist last selection so it's restored on refresh
  const selectionSaveRef = useRef<number | null>(null);
  useEffect(() => {
    if (!score) return;
    if (selectionSaveRef.current) clearTimeout(selectionSaveRef.current);
    selectionSaveRef.current = window.setTimeout(() => {
      import('./utils/libraryStorage').then(({ saveLastSelection }) => {
        saveLastSelection({ score, isExercise: isExerciseScore });
      });
    }, 500);
    return () => { if (selectionSaveRef.current) clearTimeout(selectionSaveRef.current); };
  }, [score, isExerciseScore]);

  // Auto-save global practice preferences (debounced)
  const globalSaveTimerRef = useRef<number | null>(null);
  const { masterVolume, masterMuted, metronomeVolume, metronomeEnabled,
    loopingEnabled, countInEveryLoop, soundType, microphoneActive, midiSoundEnabled,
    midiSoundVolume } = state;
  useEffect(() => {
    if (globalSaveTimerRef.current) clearTimeout(globalSaveTimerRef.current);
    globalSaveTimerRef.current = window.setTimeout(() => {
      const prefs: import('./utils/libraryStorage').GlobalPracticePreferences = {
        masterVolume, masterMuted, metronomeVolume, metronomeEnabled,
        loopingEnabled, countInEveryLoop, soundType,
        microphoneEnabled: microphoneActive,
        midiSoundEnabled,
        midiSoundVolume,
      };
      import('./utils/libraryStorage').then(({ saveGlobalPreferences }) => {
        saveGlobalPreferences(prefs);
      });
    }, 1500);
    return () => { if (globalSaveTimerRef.current) clearTimeout(globalSaveTimerRef.current); };
  }, [masterVolume, masterMuted, metronomeVolume, metronomeEnabled,
      loopingEnabled, countInEveryLoop, soundType, microphoneActive, midiSoundEnabled,
      midiSoundVolume]);

  useEffect(() => {
    if (soundType !== 'piano-sampled') return;
    let cancelled = false;
    const preload = async () => {
      try {
        await engine.prepareSoundType('piano-sampled');
      } catch {
        // Keep UI responsive; playback still retries on demand.
      }
      if (cancelled) return;
    };
    void preload();
    return () => {
      cancelled = true;
    };
  }, [engine, soundType]);

  const value: PianoContextValue = {
    state, dispatch, engine, midi, startMode, stopMode, loadScore, toggleMicrophone,
  };
  return <PianoContext.Provider value={value}>{children}</PianoContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook exported with Provider (standard pattern)
export function usePiano(): PianoContextValue {
  const ctx = useContext(PianoContext);
  if (!ctx) throw new Error('usePiano must be used within PianoProvider');
  return ctx;
}
