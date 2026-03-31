import type { PianoScore } from '../types';
import { durationToBeats } from '../types';
import { buildSingleTrackMidi, type MidiNoteEvent } from '../../shared/music/midiBuilder';

export function buildScoreMidiEventMap(
  score: PianoScore,
  loopCount = 1,
  selectedPartIds?: string[]
): Map<string, MidiNoteEvent[]> {
  const ticksPerQuarter = 480;
  const selectedSet = selectedPartIds && selectedPartIds.length > 0 ? new Set(selectedPartIds) : null;
  const eventMap = new Map<string, MidiNoteEvent[]>();
  const channelByPart = new Map<string, number>();
  let nextChannel = 0;

  score.parts.forEach((part) => {
    if (selectedSet && !selectedSet.has(part.id)) return;
    channelByPart.set(part.id, nextChannel);
    eventMap.set(part.id, []);
    nextChannel += 1;
  });

  score.parts.forEach((part) => {
    if (selectedSet && !selectedSet.has(part.id)) return;
    const channel = channelByPart.get(part.id) ?? 0;
    const events = eventMap.get(part.id);
    if (!events) return;
    const singleLoopTicks = part.measures.reduce((sum, measure) => sum + measure.notes.reduce((acc, note) => {
      return acc + Math.max(30, Math.round(durationToBeats(note.duration, note.dotted) * ticksPerQuarter));
    }, 0), 0);
    for (let loopIndex = 0; loopIndex < loopCount; loopIndex += 1) {
      let tickCursor = singleLoopTicks * loopIndex;
      part.measures.forEach((measure) => {
        measure.notes.forEach((note) => {
          const durationTicks = Math.max(
            30,
            Math.round(durationToBeats(note.duration, note.dotted) * ticksPerQuarter)
          );
          if (!note.rest && note.pitches.length > 0) {
            note.pitches.forEach((pitch) => {
              events.push({
                midi: pitch,
                startTick: tickCursor,
                durationTicks,
                velocity: 84,
                channel,
              });
            });
          }
          tickCursor += durationTicks;
        });
      });
    }
  });
  return eventMap;
}

export function buildScoreMidiBytes(score: PianoScore, loopCount = 1, selectedPartIds?: string[]): Uint8Array {
  const events = Array.from(buildScoreMidiEventMap(score, loopCount, selectedPartIds).values()).flat();
  return buildSingleTrackMidi(events, score.tempo);
}

