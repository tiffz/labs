import { describe, it, expect } from 'vitest';
import {
  displayLayerToPianoScore,
  groupDisplayNotesByBeat,
  PIANO_SPLIT_MIDI,
} from './displayLayerToPianoScore';
import type { DisplayLayer } from '../types';
import { rawEventsToPerformanceNotes } from '../performance/rawToPerformanceNotes';
import type { RawMidiEvent } from '../types';

function layerWithNotes(
  notes: DisplayLayer['notes'],
  timeSignature = { numerator: 4, denominator: 4 },
): DisplayLayer {
  return {
    strictness: 0.5,
    notes,
    timeSignature,
    beatsPerBar: timeSignature.numerator,
  };
}

describe('groupDisplayNotesByBeat', () => {
  it('merges simultaneous pitches into one group', () => {
    const groups = groupDisplayNotesByBeat([
      { midi: 60, beat: 0, durationBeats: 1, velocity: 0.8 },
      { midi: 64, beat: 0.01, durationBeats: 1, velocity: 0.8 },
      { midi: 67, beat: 0.02, durationBeats: 1, velocity: 0.8 },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.midis).toEqual([60, 64, 67]);
  });
});

describe('displayLayerToPianoScore', () => {
  it('splits low notes to bass staff and high notes to treble', () => {
    const score = displayLayerToPianoScore(
      layerWithNotes([
        { midi: 48, beat: 0, durationBeats: 1, velocity: 0.8 },
        { midi: 72, beat: 1, durationBeats: 1, velocity: 0.8 },
      ]),
      120,
    );

    const rh = score.parts.find((part) => part.hand === 'right');
    const lh = score.parts.find((part) => part.hand === 'left');
    expect(rh?.measures[0]?.notes.some((n) => n.pitches.includes(72))).toBe(true);
    expect(rh?.measures[0]?.notes.some((n) => n.pitches.includes(48))).toBe(false);
    expect(lh?.measures[0]?.notes.some((n) => n.pitches.includes(48))).toBe(true);
    expect(lh?.measures[0]?.notes.some((n) => n.pitches.includes(72))).toBe(false);
  });

  it(`puts middle C (${PIANO_SPLIT_MIDI}) on treble staff`, () => {
    const score = displayLayerToPianoScore(
      layerWithNotes([{ midi: PIANO_SPLIT_MIDI, beat: 0, durationBeats: 1, velocity: 0.8 }]),
      120,
    );
    const rh = score.parts.find((part) => part.hand === 'right');
    const lh = score.parts.find((part) => part.hand === 'left');
    expect(rh?.measures[0]?.notes.some((n) => n.pitches.includes(PIANO_SPLIT_MIDI))).toBe(true);
    expect(lh?.measures[0]?.notes.every((n) => n.rest || n.pitches.length === 0)).toBe(true);
  });

  it('renders a triad as one chord note on the treble staff', () => {
    const score = displayLayerToPianoScore(
      layerWithNotes([
        { midi: 60, beat: 0, durationBeats: 1, velocity: 0.8 },
        { midi: 64, beat: 0, durationBeats: 1, velocity: 0.8 },
        { midi: 67, beat: 0, durationBeats: 1, velocity: 0.8 },
      ]),
      120,
    );
    const rh = score.parts.find((part) => part.hand === 'right');
    const chordHead = rh?.measures[0]?.notes.find((n) => !n.rest && n.pitches.length > 1);
    expect(chordHead?.pitches).toEqual([60, 64, 67]);
  });
});

describe('rawEventsToPerformanceNotes chords', () => {
  it('pairs each note in a chord separately', () => {
    const events: RawMidiEvent[] = [
      { id: '1', type: 'noteon', midi: 60, velocity: 0.8, perfMs: 100, deviceId: 'd' },
      { id: '2', type: 'noteon', midi: 64, velocity: 0.8, perfMs: 102, deviceId: 'd' },
      { id: '3', type: 'noteon', midi: 67, velocity: 0.8, perfMs: 104, deviceId: 'd' },
      { id: '4', type: 'noteoff', midi: 60, velocity: 0, perfMs: 600, deviceId: 'd' },
      { id: '5', type: 'noteoff', midi: 64, velocity: 0, perfMs: 602, deviceId: 'd' },
      { id: '6', type: 'noteoff', midi: 67, velocity: 0, perfMs: 604, deviceId: 'd' },
    ];
    const notes = rawEventsToPerformanceNotes(events, 0);
    expect(notes.map((n) => n.midi).sort((a, b) => a - b)).toEqual([60, 64, 67]);
  });
});
