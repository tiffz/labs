import type { ParsedRhythm } from '../rhythm/types';
import type { MidiNoteEvent } from './midiBuilder';

const TICKS_PER_SIXTEENTH = 120;

const DRUM_PITCH_BY_SOUND: Record<string, number> = {
  dum: 36,
  tak: 38,
  ka: 42,
  slap: 39,
};

/**
 * GM drum-map MIDI events (channel 9) for a parsed rhythm, repeated `loopCount` times.
 * Used by drums and words export adapters (same layout as legacy per-app copies).
 */
export function buildDrumMidiEventsFromParsedRhythm(
  parsedRhythm: ParsedRhythm,
  loopCount: number,
): MidiNoteEvent[] {
  const events: MidiNoteEvent[] = [];
  let loopTickOffset = 0;
  const singleLoopTicks = parsedRhythm.measures.reduce(
    (total, measure) =>
      total +
      measure.notes.reduce(
        (sum, note) =>
          sum +
          Math.max(
            TICKS_PER_SIXTEENTH,
            Math.round(note.durationInSixteenths * TICKS_PER_SIXTEENTH),
          ),
        0,
      ),
    0,
  );

  for (let loop = 0; loop < loopCount; loop += 1) {
    let tickCursor = loopTickOffset;
    parsedRhythm.measures.forEach((measure) => {
      measure.notes.forEach((note) => {
        const pitch = DRUM_PITCH_BY_SOUND[note.sound];
        const durationTicks = Math.max(
          TICKS_PER_SIXTEENTH,
          Math.round(note.durationInSixteenths * TICKS_PER_SIXTEENTH),
        );
        if (pitch !== undefined) {
          events.push({
            midi: pitch,
            startTick: tickCursor,
            durationTicks: Math.max(30, Math.round(durationTicks * 0.8)),
            velocity: 100,
            channel: 9,
          });
        }
        tickCursor += durationTicks;
      });
    });
    loopTickOffset += singleLoopTicks;
  }
  return events;
}
