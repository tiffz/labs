import type { PerformanceNote, RawMidiEvent } from '../types';

/**
 * Pair note-on/note-off events into performance notes relative to loop start.
 */
export function rawEventsToPerformanceNotes(
  events: readonly RawMidiEvent[],
  loopStartPerfMs: number,
): PerformanceNote[] {
  const open = new Map<number, { perfMs: number; velocity: number }>();
  const notes: PerformanceNote[] = [];

  const sorted = [...events].sort((a, b) => a.perfMs - b.perfMs || a.midi - b.midi);

  for (const evt of sorted) {
    if (evt.type === 'noteon' && evt.velocity > 0) {
      open.set(evt.midi, { perfMs: evt.perfMs, velocity: evt.velocity });
    } else if (evt.type === 'noteoff' || (evt.type === 'noteon' && evt.velocity === 0)) {
      const start = open.get(evt.midi);
      if (!start) continue;
      open.delete(evt.midi);
      const durationMs = Math.max(30, evt.perfMs - start.perfMs);
      notes.push({
        midi: evt.midi,
        startMs: start.perfMs - loopStartPerfMs,
        durationMs,
        velocity: start.velocity,
      });
    }
  }

  for (const [midi, start] of open) {
    notes.push({
      midi,
      startMs: start.perfMs - loopStartPerfMs,
      durationMs: 200,
      velocity: start.velocity,
    });
  }

  return notes.sort((a, b) => a.startMs - b.startMs || a.midi - b.midi);
}
