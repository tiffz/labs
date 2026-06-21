import type { TimeSignature } from '../shared/rhythm/types';
import type { MidiDevice } from '../shared/music/scoreTypes';

export interface RawMidiEvent {
  id: string;
  type: 'noteon' | 'noteoff';
  midi: number;
  velocity: number;
  perfMs: number;
  deviceId: string;
}

export type MidiSubdivision = 1 | 2 | 4;

export interface TransportConfig {
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: MidiSubdivision;
  playbackRate: number;
  metronomeEnabled: boolean;
}

export interface CapturedLoop {
  id: string;
  capturedAt: number;
  barCount: number;
  transportSnapshot: TransportConfig;
  loopStartPerfMs: number;
  loopEndPerfMs: number;
  events: readonly RawMidiEvent[];
}

export interface PerformanceNote {
  midi: number;
  startMs: number;
  durationMs: number;
  velocity: number;
}

export interface DisplayNote {
  midi: number;
  beat: number;
  durationBeats: number;
  velocity: number;
}

export interface DisplayLayer {
  strictness: number;
  notes: DisplayNote[];
  timeSignature: TimeSignature;
  beatsPerBar: number;
}

export interface RiffStep {
  id: string;
  pitches: number[];
}

export interface RiffPattern {
  id: string;
  title: string;
  steps: RiffStep[];
  beatsPerStep: number;
}

export type MidiAppMode = 'scratchpad' | 'compose' | 'guide';

export interface MidiState {
  mode: MidiAppMode;
  transport: TransportConfig;
  capturedLoop: CapturedLoop | null;
  notationStrictness: number;
  captureBarCount: number;
  activeRiff: RiffPattern | null;
  activeMidis: ReadonlySet<number>;
  midiDevices: MidiDevice[];
  disabledMidiDeviceIds: ReadonlySet<string>;
  isListening: boolean;
  midiConnected: boolean;
  metronomePlaying: boolean;
  loopPlaying: boolean;
  currentBeat: number;
  guideStepIndex: number | null;
  guideRunning: boolean;
  monitorSoundEnabled: boolean;
}

export const DEFAULT_TRANSPORT: TransportConfig = {
  bpm: 120,
  timeSignature: { numerator: 4, denominator: 4 },
  subdivision: 2,
  playbackRate: 1,
  metronomeEnabled: true,
};

export const DEFAULT_STATE: MidiState = {
  mode: 'scratchpad',
  transport: DEFAULT_TRANSPORT,
  capturedLoop: null,
  notationStrictness: 0.35,
  captureBarCount: 4,
  activeRiff: null,
  activeMidis: new Set(),
  midiDevices: [],
  disabledMidiDeviceIds: new Set(),
  isListening: false,
  midiConnected: false,
  metronomePlaying: false,
  loopPlaying: false,
  currentBeat: 0,
  guideStepIndex: null,
  guideRunning: false,
  monitorSoundEnabled: true,
};
