import type { CapturedLoop, DisplayLayer, DisplayNote, PerformanceNote } from '../types';
import { rawEventsToPerformanceNotes } from '../performance/rawToPerformanceNotes';

export function buildDisplayLayer(
  loop: CapturedLoop,
  strictness: number,
): DisplayLayer {
  const perfNotes = rawEventsToPerformanceNotes(loop.events, loop.loopStartPerfMs);
  const { bpm, timeSignature, subdivision } = loop.transportSnapshot;
  const msPerBeat = 60000 / bpm;
  const gridDivisor = subdivision;

  const notes: DisplayNote[] = perfNotes.map((n) => {
    const rawBeat = n.startMs / msPerBeat;
    const snappedBeat = Math.round(rawBeat * gridDivisor) / gridDivisor;
    const beat = rawBeat + (snappedBeat - rawBeat) * strictness;

    const rawDur = n.durationMs / msPerBeat;
    const snappedDur = Math.max(
      1 / gridDivisor,
      Math.round(rawDur * gridDivisor) / gridDivisor,
    );
    const durationBeats = rawDur + (snappedDur - rawDur) * strictness;

    return { midi: n.midi, beat, durationBeats, velocity: n.velocity };
  });

  return {
    strictness,
    notes,
    timeSignature,
    beatsPerBar: timeSignature.numerator,
  };
}

export function performanceNotesFromLoop(loop: CapturedLoop | null): PerformanceNote[] {
  if (!loop) return [];
  return rawEventsToPerformanceNotes(loop.events, loop.loopStartPerfMs);
}
