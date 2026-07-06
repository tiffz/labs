import { createContext, type Dispatch } from 'react';
import type { MidiAction } from './storeTypes';
import type { MidiState } from './types';

export interface MidiContextValue {
  state: MidiState;
  dispatch: Dispatch<MidiAction>;
  captureLastBars: () => void;
  toggleMetronome: () => Promise<void>;
  toggleLoopPlayback: () => void;
  toggleMidiDevice: (deviceId: string) => void;
  startGuide: () => Promise<void>;
  stopGuide: () => void;
  syncMetronomePreferences: () => void;
}

export const MidiContext = createContext<MidiContextValue | null>(null);
