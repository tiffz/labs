import { describe, it, expect } from 'vitest';
import { parseMidi } from './parseMidi';
import type { MidiFile, MidiEvent } from './parseMidi';

function makeFile(tracks: MidiEvent[][], division = 480): MidiFile {
  return { division, format: 1, tracks };
}

describe('parseMidi', () => {
  it('parses a simple C major scale (C4–G4 quarter notes)', () => {
    const division = 480;
    const pitches = [60, 62, 64, 65, 67]; // C4 D4 E4 F4 G4
    const events: MidiEvent[] = [];

    // Time signature at delta 0
    events.push({ delta: 0, timeSignature: { numerator: 4, denominator: 4, metronome: 24, thirtyseconds: 8 } });

    for (let i = 0; i < pitches.length; i++) {
      events.push({ delta: i === 0 ? 0 : 0, noteOn: { noteNumber: pitches[i], velocity: 80 }, channel: 0 });
      events.push({ delta: division, noteOff: { noteNumber: pitches[i], velocity: 0 }, channel: 0 });
    }

    const score = parseMidi(makeFile([events], division));
    expect(score.parts).toHaveLength(2);

    const rh = score.parts[0];
    expect(rh.clef).toBe('treble');
    // All notes should be in treble (>= 60)
    const allNotes = rh.measures.flatMap(m => m.notes).filter(n => !n.rest);
    expect(allNotes).toHaveLength(5);
    allNotes.forEach(n => {
      expect(n.duration).toBe('quarter');
      expect(n.pitches).toHaveLength(1);
    });
    expect(allNotes[0].pitches[0]).toBe(60);
    expect(allNotes[4].pitches[0]).toBe(67);
  });

  it('splits notes by pitch into treble and bass', () => {
    const division = 480;
    const events: MidiEvent[] = [
      { delta: 0, noteOn: { noteNumber: 72, velocity: 80 }, channel: 0 }, // C5 treble
      { delta: 0, noteOn: { noteNumber: 48, velocity: 80 }, channel: 0 }, // C3 bass
      { delta: division, noteOff: { noteNumber: 72, velocity: 0 }, channel: 0 },
      { delta: 0, noteOff: { noteNumber: 48, velocity: 0 }, channel: 0 },
    ];

    const score = parseMidi(makeFile([events], division));
    const rhNotes = score.parts[0].measures.flatMap(m => m.notes).filter(n => !n.rest);
    const lhNotes = score.parts[1].measures.flatMap(m => m.notes).filter(n => !n.rest);

    expect(rhNotes).toHaveLength(1);
    expect(rhNotes[0].pitches).toEqual([72]);
    expect(lhNotes).toHaveLength(1);
    expect(lhNotes[0].pitches).toEqual([48]);
  });

  it('groups simultaneous notes into chords', () => {
    const division = 480;
    const events: MidiEvent[] = [
      // C E G simultaneously
      { delta: 0, noteOn: { noteNumber: 60, velocity: 80 }, channel: 0 },
      { delta: 0, noteOn: { noteNumber: 64, velocity: 80 }, channel: 0 },
      { delta: 0, noteOn: { noteNumber: 67, velocity: 80 }, channel: 0 },
      { delta: division * 4, noteOff: { noteNumber: 60, velocity: 0 }, channel: 0 },
      { delta: 0, noteOff: { noteNumber: 64, velocity: 0 }, channel: 0 },
      { delta: 0, noteOff: { noteNumber: 67, velocity: 0 }, channel: 0 },
    ];

    const score = parseMidi(makeFile([events], division));
    const rh = score.parts[0].measures.flatMap(m => m.notes).filter(n => !n.rest);
    expect(rh).toHaveLength(1);
    expect(rh[0].pitches).toEqual([60, 64, 67]);
    expect(rh[0].duration).toBe('whole');
  });

  it('quantizes slightly off-grid durations to nearest standard', () => {
    const division = 480;
    // A note held for 470 ticks (just under 1 beat) should quantize to quarter
    const events: MidiEvent[] = [
      { delta: 0, noteOn: { noteNumber: 60, velocity: 80 }, channel: 0 },
      { delta: 470, noteOff: { noteNumber: 60, velocity: 0 }, channel: 0 },
    ];

    const score = parseMidi(makeFile([events], division));
    const note = score.parts[0].measures[0].notes.find(n => !n.rest);
    expect(note?.duration).toBe('quarter');
  });

  it('quantizes half notes', () => {
    const division = 480;
    const events: MidiEvent[] = [
      { delta: 0, noteOn: { noteNumber: 60, velocity: 80 }, channel: 0 },
      { delta: division * 2, noteOff: { noteNumber: 60, velocity: 0 }, channel: 0 },
    ];

    const score = parseMidi(makeFile([events], division));
    const note = score.parts[0].measures[0].notes.find(n => !n.rest);
    expect(note?.duration).toBe('half');
  });

  it('quantizes eighth notes', () => {
    const division = 480;
    const events: MidiEvent[] = [
      { delta: 0, noteOn: { noteNumber: 60, velocity: 80 }, channel: 0 },
      { delta: division / 2, noteOff: { noteNumber: 60, velocity: 0 }, channel: 0 },
    ];

    const score = parseMidi(makeFile([events], division));
    const note = score.parts[0].measures[0].notes.find(n => !n.rest);
    expect(note?.duration).toBe('eighth');
  });

  it('parses tempo from setTempo event', () => {
    const events: MidiEvent[] = [
      { delta: 0, setTempo: { microsecondsPerQuarter: 500_000 } }, // 120 BPM
    ];
    const score = parseMidi(makeFile([events]));
    expect(score.tempo).toBe(120);

    const events2: MidiEvent[] = [
      { delta: 0, setTempo: { microsecondsPerQuarter: 750_000 } }, // 80 BPM
    ];
    const score2 = parseMidi(makeFile([events2]));
    expect(score2.tempo).toBe(80);
  });

  it('parses time signature from meta event', () => {
    const events: MidiEvent[] = [
      { delta: 0, timeSignature: { numerator: 3, denominator: 4, metronome: 24, thirtyseconds: 8 } },
    ];
    const score = parseMidi(makeFile([events]));
    expect(score.timeSignature).toEqual({ numerator: 3, denominator: 4 });
  });

  it('parses key signature', () => {
    const events: MidiEvent[] = [
      { delta: 0, keySignature: { key: 2, scale: 0 } }, // D major
    ];
    const score = parseMidi(makeFile([events]));
    expect(score.key).toBe('D');
  });

  it('parses minor key signature', () => {
    const events: MidiEvent[] = [
      { delta: 0, keySignature: { key: 0, scale: 1 } }, // A minor
    ];
    const score = parseMidi(makeFile([events]));
    expect(score.key).toBe('A');
  });

  it('parses track name as title', () => {
    const events: MidiEvent[] = [
      { delta: 0, trackName: 'My Song' },
      { delta: 0, noteOn: { noteNumber: 60, velocity: 80 }, channel: 0 },
      { delta: 480, noteOff: { noteNumber: 60, velocity: 0 }, channel: 0 },
    ];
    const score = parseMidi(makeFile([events]));
    expect(score.title).toBe('My Song');
  });

  it('creates measures from note positions', () => {
    const division = 480;
    // 8 quarter notes in 4/4 => 2 measures
    const events: MidiEvent[] = [
      { delta: 0, timeSignature: { numerator: 4, denominator: 4, metronome: 24, thirtyseconds: 8 } },
    ];
    for (let i = 0; i < 8; i++) {
      events.push({ delta: i === 0 ? 0 : 0, noteOn: { noteNumber: 60 + i, velocity: 80 }, channel: 0 });
      events.push({ delta: division, noteOff: { noteNumber: 60 + i, velocity: 0 }, channel: 0 });
    }

    const score = parseMidi(makeFile([events], division));
    const rh = score.parts[0];
    expect(rh.measures.length).toBeGreaterThanOrEqual(2);
  });

  it('handles velocity-0 noteOn as noteOff', () => {
    const division = 480;
    const events: MidiEvent[] = [
      { delta: 0, noteOn: { noteNumber: 60, velocity: 80 }, channel: 0 },
      // velocity 0 = note off
      { delta: division, noteOn: { noteNumber: 60, velocity: 0 }, channel: 0 },
    ];

    const score = parseMidi(makeFile([events], division));
    const note = score.parts[0].measures[0].notes.find(n => !n.rest);
    expect(note?.pitches).toEqual([60]);
    expect(note?.duration).toBe('quarter');
  });

  it('handles multiple tracks (format 1)', () => {
    const division = 480;
    const track0: MidiEvent[] = [
      { delta: 0, setTempo: { microsecondsPerQuarter: 600_000 } }, // 100 BPM
      { delta: 0, trackName: 'Conductor' },
    ];
    const track1: MidiEvent[] = [
      { delta: 0, noteOn: { noteNumber: 72, velocity: 80 }, channel: 0 },
      { delta: division, noteOff: { noteNumber: 72, velocity: 0 }, channel: 0 },
    ];
    const track2: MidiEvent[] = [
      { delta: 0, noteOn: { noteNumber: 48, velocity: 80 }, channel: 0 },
      { delta: division, noteOff: { noteNumber: 48, velocity: 0 }, channel: 0 },
    ];

    const score = parseMidi(makeFile([track0, track1, track2], division));
    expect(score.tempo).toBe(100);
    expect(score.title).toBe('Conductor');

    const rhNotes = score.parts[0].measures.flatMap(m => m.notes).filter(n => !n.rest);
    const lhNotes = score.parts[1].measures.flatMap(m => m.notes).filter(n => !n.rest);
    expect(rhNotes.some(n => n.pitches.includes(72))).toBe(true);
    expect(lhNotes.some(n => n.pitches.includes(48))).toBe(true);
  });

  it('produces at least one measure per part even for empty input', () => {
    const score = parseMidi(makeFile([[]]));
    expect(score.parts).toHaveLength(2);
    expect(score.parts[0].measures.length).toBeGreaterThanOrEqual(1);
    expect(score.parts[1].measures.length).toBeGreaterThanOrEqual(1);
  });
});
