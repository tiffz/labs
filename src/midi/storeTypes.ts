import type { MidiDevice } from '../shared/music/scoreTypes';
import type {
  CapturedLoop,
  MidiAppMode,
  MidiState,
  MidiSubdivision,
  RiffPattern,
  RiffStep,
  TransportConfig,
} from './types';
import { DEFAULT_STATE } from './types';

export type MidiAction =
  | { type: 'SET_MODE'; mode: MidiAppMode }
  | { type: 'SET_TRANSPORT'; patch: Partial<TransportConfig> }
  | { type: 'SET_NOTATION_STRICTNESS'; value: number }
  | { type: 'SET_CAPTURE_BAR_COUNT'; count: number }
  | { type: 'SET_MIDI_DEVICES'; devices: MidiDevice[] }
  | { type: 'TOGGLE_MIDI_DEVICE'; deviceId: string }
  | { type: 'SET_MIDI_CONNECTED'; connected: boolean }
  | { type: 'SET_LISTENING'; listening: boolean }
  | { type: 'MIDI_NOTE_ON'; midi: number }
  | { type: 'MIDI_NOTE_OFF'; midi: number }
  | { type: 'CAPTURE_LAST_BARS'; loop: CapturedLoop }
  | { type: 'CLEAR_CAPTURE' }
  | { type: 'SET_METRONOME_PLAYING'; playing: boolean }
  | { type: 'SET_LOOP_PLAYING'; playing: boolean }
  | { type: 'SET_CURRENT_BEAT'; beat: number }
  | { type: 'SET_MONITOR_SOUND'; enabled: boolean }
  | { type: 'SET_ACTIVE_RIFF'; riff: RiffPattern | null }
  | { type: 'ADD_RIFF_STEP'; step: RiffStep }
  | { type: 'UNDO_RIFF_STEP' }
  | { type: 'SET_RIFF_BEATS_PER_STEP'; beats: number }
  | { type: 'SET_GUIDE_RUNNING'; running: boolean }
  | { type: 'SET_GUIDE_STEP_INDEX'; index: number | null }
  | { type: 'GUIDE_STEP_MATCHED'; nextIndex: number };

export function hasEnabledMidiDevice(
  state: Pick<MidiState, 'midiDevices' | 'disabledMidiDeviceIds'>,
): boolean {
  return state.midiDevices.some(
    (device) => device.connected && !state.disabledMidiDeviceIds.has(device.id),
  );
}

function syncListeningState(state: MidiState): Pick<MidiState, 'midiConnected' | 'isListening'> {
  const midiConnected = state.midiDevices.some((device) => device.connected);
  return {
    midiConnected,
    isListening: hasEnabledMidiDevice(state),
  };
}

export function midiReducer(state: MidiState, action: MidiAction): MidiState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'SET_TRANSPORT':
      return { ...state, transport: { ...state.transport, ...action.patch } };
    case 'SET_NOTATION_STRICTNESS':
      return { ...state, notationStrictness: Math.max(0, Math.min(1, action.value)) };
    case 'SET_CAPTURE_BAR_COUNT':
      return { ...state, captureBarCount: Math.max(1, Math.min(16, action.count)) };
    case 'SET_MIDI_DEVICES': {
      const next = { ...state, midiDevices: action.devices };
      return { ...next, ...syncListeningState(next) };
    }
    case 'TOGGLE_MIDI_DEVICE': {
      const disabled = new Set(state.disabledMidiDeviceIds);
      if (disabled.has(action.deviceId)) {
        disabled.delete(action.deviceId);
      } else {
        disabled.add(action.deviceId);
      }
      const next = { ...state, disabledMidiDeviceIds: disabled };
      return { ...next, ...syncListeningState(next) };
    }
    case 'SET_MIDI_CONNECTED':
      return { ...state, midiConnected: action.connected };
    case 'SET_LISTENING':
      return { ...state, isListening: action.listening };
    case 'MIDI_NOTE_ON': {
      const next = new Set(state.activeMidis);
      next.add(action.midi);
      return { ...state, activeMidis: next };
    }
    case 'MIDI_NOTE_OFF': {
      const next = new Set(state.activeMidis);
      next.delete(action.midi);
      return { ...state, activeMidis: next };
    }
    case 'CAPTURE_LAST_BARS':
      return { ...state, capturedLoop: action.loop, loopPlaying: false };
    case 'CLEAR_CAPTURE':
      return { ...state, capturedLoop: null, loopPlaying: false };
    case 'SET_METRONOME_PLAYING':
      return { ...state, metronomePlaying: action.playing };
    case 'SET_LOOP_PLAYING':
      return { ...state, loopPlaying: action.playing };
    case 'SET_CURRENT_BEAT':
      return { ...state, currentBeat: action.beat };
    case 'SET_MONITOR_SOUND':
      return { ...state, monitorSoundEnabled: action.enabled };
    case 'SET_ACTIVE_RIFF':
      return { ...state, activeRiff: action.riff };
    case 'ADD_RIFF_STEP': {
      const riff = state.activeRiff ?? {
        id: crypto.randomUUID(),
        title: 'My riff',
        steps: [],
        beatsPerStep: 1,
      };
      return {
        ...state,
        activeRiff: { ...riff, steps: [...riff.steps, action.step] },
      };
    }
    case 'UNDO_RIFF_STEP': {
      if (!state.activeRiff || state.activeRiff.steps.length === 0) return state;
      return {
        ...state,
        activeRiff: {
          ...state.activeRiff,
          steps: state.activeRiff.steps.slice(0, -1),
        },
      };
    }
    case 'SET_RIFF_BEATS_PER_STEP': {
      if (!state.activeRiff) return state;
      return {
        ...state,
        activeRiff: {
          ...state.activeRiff,
          beatsPerStep: Math.max(1, Math.min(8, action.beats)),
        },
      };
    }
    case 'SET_GUIDE_RUNNING':
      return {
        ...state,
        guideRunning: action.running,
        guideStepIndex: action.running ? 0 : null,
      };
    case 'SET_GUIDE_STEP_INDEX':
      return { ...state, guideStepIndex: action.index };
    case 'GUIDE_STEP_MATCHED':
      return { ...state, guideStepIndex: action.nextIndex };
    default:
      return state;
  }
}

export function subdivisionToLevel(sub: MidiSubdivision): 1 | 2 | 4 {
  return sub;
}

export function buildInitialState(): MidiState {
  return { ...DEFAULT_STATE };
}
