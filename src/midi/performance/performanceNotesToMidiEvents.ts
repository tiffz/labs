import type { MidiNoteEvent } from '../../shared/music/midiBuilder';
import type { PerformanceNote } from '../types';

const TICKS_PER_QUARTER = 480;

export function performanceNotesToMidiEvents(notes: PerformanceNote[], bpm: number): MidiNoteEvent[] {
  const msPerTick = 60000 / (bpm * TICKS_PER_QUARTER);
  return notes.map((note) => ({
    midi: note.midi,
    startTick: Math.max(0, Math.round(note.startMs / msPerTick)),
    durationTicks: Math.max(30, Math.round(note.durationMs / msPerTick)),
    velocity: Math.max(1, Math.round(note.velocity * 127)),
    channel: 0,
  }));
}
