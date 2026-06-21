import { useContext } from 'react';
import { MidiContext, type MidiContextValue } from './midiContext';

export function useMidi(): MidiContextValue {
  const ctx = useContext(MidiContext);
  if (!ctx) throw new Error('useMidi must be used within MidiProvider');
  return ctx;
}
