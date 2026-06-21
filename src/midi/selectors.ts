import type { MidiState, PerformanceNote, DisplayLayer } from './types';
import { buildDisplayLayer, performanceNotesFromLoop } from './display/buildDisplayLayer';
import { displayLayerToPianoScore } from './display/displayLayerToPianoScore';
import type { PianoScore } from '../shared/music/scoreTypes';
import { performanceNotesToMidiEvents } from './performance/performanceNotesToMidiEvents';
import type { MidiNoteEvent } from '../shared/music/midiBuilder';

export function selectPerformanceNotes(state: MidiState): PerformanceNote[] {
  return performanceNotesFromLoop(state.capturedLoop);
}

export function selectDisplayLayer(state: MidiState): DisplayLayer | null {
  if (!state.capturedLoop) return null;
  return buildDisplayLayer(state.capturedLoop, state.notationStrictness);
}

export function selectDisplayScore(state: MidiState): PianoScore | null {
  const layer = selectDisplayLayer(state);
  if (!layer) return null;
  const bpm = state.transport.bpm * state.transport.playbackRate;
  return displayLayerToPianoScore(layer, bpm);
}

export function selectExportMidiEvents(state: MidiState): MidiNoteEvent[] {
  const notes = selectPerformanceNotes(state);
  const bpm = state.transport.bpm * state.transport.playbackRate;
  return performanceNotesToMidiEvents(notes, bpm);
}

export function msPerBar(state: MidiState): number {
  const { bpm, timeSignature } = state.transport;
  return (60000 / bpm) * timeSignature.numerator;
}
