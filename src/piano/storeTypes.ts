// State, action, and initial-state types extracted from `store.tsx`.
// Re-exported from `store.tsx` for backward-compat with existing callers.
// See docs/COMPONENT_DECOMPOSITION_PATTERN.md.

import type {
  PianoScore,
  MidiDevice,
  MicrophoneDevice,
  NoteDuration,
  PracticeNoteResult,
  PracticeSession,
  Key,
} from './types';
import type { SoundType } from '../shared/music/soundOptions';
import type { SongPracticeSettings, GlobalPracticePreferences } from './utils/libraryStorage';
import { DEFAULT_SCORE } from './data/scales';

export type ActiveMode = 'none' | 'play' | 'practice' | 'free-practice';

export interface ScoreSection {
  name: string;
  startMeasure: number;
  endMeasure: number;
}

export interface PianoState {
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
  midiInputEnabled: boolean;
  midiDevices: MidiDevice[];
  microphoneDevices: MicrophoneDevice[];
  selectedMicrophoneDeviceId: string;
  activeMicrophoneLabel: string | null;
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

export type Action =
  | { type: 'SET_SCORE'; score: PianoScore }
  | { type: 'SET_SCORE_WITH_HISTORY'; score: PianoScore }
  | { type: 'SET_ACTIVE_MODE'; mode: ActiveMode }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'SET_TEMPO'; tempo: number }
  | { type: 'SET_SOUND_TYPE'; soundType: SoundType }
  | { type: 'SET_METRONOME'; enabled: boolean }
  | { type: 'SET_LOOPING'; enabled: boolean }
  | { type: 'UPDATE_POSITION'; measureIndex: number; noteIndices: Map<string, number> }
  | { type: 'SET_MIDI_CONNECTED'; connected: boolean }
  | { type: 'SET_MIDI_INPUT_ENABLED'; enabled: boolean }
  | { type: 'SET_MIDI_DEVICES'; devices: MidiDevice[] }
  | { type: 'SET_MICROPHONE_DEVICES'; devices: MicrophoneDevice[] }
  | { type: 'SET_SELECTED_MICROPHONE_DEVICE'; deviceId: string }
  | { type: 'SET_ACTIVE_MICROPHONE_LABEL'; label: string | null }
  | { type: 'ADD_MIDI_NOTE'; note: number }
  | { type: 'REMOVE_MIDI_NOTE'; note: number }
  | { type: 'CLEAR_ACTIVE_MIDI_NOTES' }
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
  | { type: 'SET_FREE_TEMPO_POSITION'; measureIndex: number; noteIndex: number; partIds: string[] }
  | { type: 'SET_VIEWING_RUN'; index: number | null }
  | { type: 'SET_GHOST_NOTES'; notes: { midi: number; duration: NoteDuration }[] }
  | { type: 'STEP_INPUT_CHORD'; midis: number[]; duration?: NoteDuration; dotted?: boolean }
  | { type: 'SET_SCORE_FROM_ABC'; score: PianoScore }
  | { type: 'SET_SECTIONS'; sections: ScoreSection[] }
  | { type: 'LOAD_SECTION'; index: number }
  | { type: 'UNLOAD_SECTION' }
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
  midiInputEnabled: true,
  midiDevices: [],
  microphoneDevices: [{ id: 'default', name: 'System default' }],
  selectedMicrophoneDeviceId: 'default',
  activeMicrophoneLabel: null,
  activeMidiNotes: new Set(),
  trackMuted: new Map(),
  trackVolume: new Map([
    ['rh', 1],
    ['lh', 1],
    ['voice', 1],
  ]),
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
