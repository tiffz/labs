import type { PianoScore, ScorePart, ScoreMeasure, ScoreNote, NoteDuration, Key } from '../types';
import { generateNoteId } from '../types';

/**
 * Minimal types mirroring midi-json-parser-worker's output,
 * so the core logic can be tested without the web-worker dependency.
 */
export interface MidiNoteOnEvent { delta: number; noteOn: { noteNumber: number; velocity: number }; channel: number }
export interface MidiNoteOffEvent { delta: number; noteOff: { noteNumber: number; velocity: number }; channel: number }
export interface MidiSetTempoEvent { delta: number; setTempo: { microsecondsPerQuarter: number } }
export interface MidiTimeSignatureEvent { delta: number; timeSignature: { numerator: number; denominator: number; metronome: number; thirtyseconds: number } }
export interface MidiKeySignatureEvent { delta: number; keySignature: { key: number; scale: number } }
export interface MidiTrackNameEvent { delta: number; trackName: string }
export interface MidiEndOfTrackEvent { delta: number; endOfTrack: true }
export type MidiEvent = MidiNoteOnEvent | MidiNoteOffEvent | MidiSetTempoEvent
  | MidiTimeSignatureEvent | MidiKeySignatureEvent | MidiTrackNameEvent
  | MidiEndOfTrackEvent | { delta: number; [key: string]: unknown };

export interface MidiFile {
  division: number;
  format: number;
  tracks: MidiEvent[][];
}

interface NoteEvent {
  pitch: number;
  startTick: number;
  durationTicks: number;
}

const QUANTIZE_TARGETS: [number, NoteDuration, boolean][] = [
  [6, 'whole', true],
  [4, 'whole', false],
  [3, 'half', true],
  [2, 'half', false],
  [1.5, 'quarter', true],
  [1, 'quarter', false],
  [0.75, 'eighth', true],
  [0.5, 'eighth', false],
  [0.375, 'sixteenth', true],
  [0.25, 'sixteenth', false],
];

function quantizeDuration(beats: number): { duration: NoteDuration; dotted: boolean } {
  let closest: [NoteDuration, boolean] = ['quarter', false];
  let closestDiff = Infinity;
  for (const [val, dur, dot] of QUANTIZE_TARGETS) {
    const diff = Math.abs(beats - val);
    if (diff < closestDiff) { closestDiff = diff; closest = [dur, dot]; }
  }
  return { duration: closest[0], dotted: closest[1] };
}

const KEY_SIG_MAP: Record<string, Key> = {
  '-7_0': 'Cb' as Key, '-6_0': 'Gb', '-5_0': 'Db', '-4_0': 'Ab', '-3_0': 'Eb', '-2_0': 'Bb', '-1_0': 'F',
  '0_0': 'C', '1_0': 'G', '2_0': 'D', '3_0': 'A', '4_0': 'E', '5_0': 'B', '6_0': 'F#', '7_0': 'C#',
  '-7_1': 'Ab', '-6_1': 'Eb', '-5_1': 'Bb', '-4_1': 'F', '-3_1': 'C', '-2_1': 'G', '-1_1': 'D',
  '0_1': 'A', '1_1': 'E', '2_1': 'B', '3_1': 'F#', '4_1': 'C#', '5_1': 'G#', '6_1': 'D#', '7_1': 'A#',
};

function isNoteOn(e: MidiEvent): e is MidiNoteOnEvent {
  return 'noteOn' in e && (e as MidiNoteOnEvent).noteOn.velocity > 0;
}
function isNoteOff(e: MidiEvent): e is MidiNoteOffEvent {
  return 'noteOff' in e || ('noteOn' in e && (e as MidiNoteOnEvent).noteOn.velocity === 0);
}
function isSetTempo(e: MidiEvent): e is MidiSetTempoEvent { return 'setTempo' in e; }
function isTimeSig(e: MidiEvent): e is MidiTimeSignatureEvent { return 'timeSignature' in e; }
function isKeySig(e: MidiEvent): e is MidiKeySignatureEvent { return 'keySignature' in e; }
function isTrackName(e: MidiEvent): e is MidiTrackNameEvent { return 'trackName' in e; }

function extractNotes(events: MidiEvent[]): NoteEvent[] {
  const pending = new Map<number, number>(); // noteNumber -> startTick
  const notes: NoteEvent[] = [];
  let tick = 0;

  for (const e of events) {
    tick += e.delta;
    if (isNoteOn(e)) {
      pending.set(e.noteOn.noteNumber, tick);
    } else if (isNoteOff(e)) {
      const num = 'noteOff' in e ? (e as MidiNoteOffEvent).noteOff.noteNumber : (e as unknown as MidiNoteOnEvent).noteOn.noteNumber;
      const start = pending.get(num);
      if (start !== undefined) {
        notes.push({ pitch: num, startTick: start, durationTicks: tick - start });
        pending.delete(num);
      }
    }
  }
  return notes;
}

function groupIntoChords(notes: NoteEvent[], tolerance: number): NoteEvent[][] {
  if (notes.length === 0) return [];
  const sorted = [...notes].sort((a, b) => a.startTick - b.startTick);
  const groups: NoteEvent[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = groups[groups.length - 1];
    if (sorted[i].startTick - last[0].startTick <= tolerance) {
      last.push(sorted[i]);
    } else {
      groups.push([sorted[i]]);
    }
  }
  return groups;
}

function chordGroupsToMeasures(
  groups: NoteEvent[][],
  division: number,
  timeSig: { numerator: number; denominator: number },
): ScoreMeasure[] {
  const beatsPerMeasure = timeSig.numerator * (4 / timeSig.denominator);
  const ticksPerMeasure = division * beatsPerMeasure;
  const measures: ScoreMeasure[] = [];

  let currentMeasureTick = 0;
  let currentNotes: ScoreNote[] = [];
  let lastEndTick = 0;

  for (const group of groups) {
    const startTick = group[0].startTick;
    const maxDuration = Math.max(...group.map(n => n.durationTicks));
    const beats = maxDuration / division;

    // Fill rest gap if needed
    while (startTick >= currentMeasureTick + ticksPerMeasure) {
      // Finish current measure with rest if needed
      if (lastEndTick < currentMeasureTick + ticksPerMeasure && currentNotes.length > 0) {
        const gapBeats = (currentMeasureTick + ticksPerMeasure - lastEndTick) / division;
        if (gapBeats > 0.125) {
          const { duration, dotted } = quantizeDuration(gapBeats);
          currentNotes.push({ id: generateNoteId(), pitches: [], duration, dotted: dotted || undefined, rest: true });
        }
      }
      measures.push({ notes: currentNotes.length > 0 ? currentNotes : [] });
      currentNotes = [];
      currentMeasureTick += ticksPerMeasure;
      lastEndTick = currentMeasureTick;
    }

    // Insert rest for gap within a measure
    if (startTick > lastEndTick + division * 0.125) {
      const gapBeats = (startTick - lastEndTick) / division;
      if (gapBeats > 0.125) {
        const { duration, dotted } = quantizeDuration(gapBeats);
        currentNotes.push({ id: generateNoteId(), pitches: [], duration, dotted: dotted || undefined, rest: true });
      }
    }

    const { duration, dotted } = quantizeDuration(beats);
    const pitches = group.map(n => n.pitch).sort((a, b) => a - b);
    currentNotes.push({
      id: generateNoteId(),
      pitches,
      duration,
      dotted: dotted || undefined,
    });
    lastEndTick = startTick + maxDuration;
  }

  // Flush remaining notes
  if (currentNotes.length > 0) {
    measures.push({ notes: currentNotes });
  }

  if (measures.length === 0) measures.push({ notes: [] });
  return measures;
}

export function parseMidi(midi: MidiFile): PianoScore {
  const { division, tracks } = midi;

  let title = 'Imported MIDI';
  let tempo = 120;
  let timeSig = { numerator: 4, denominator: 4 };
  let key: Key = 'C';

  // Extract metadata from first track (format 1) or all tracks
  for (const track of tracks) {
    let tick = 0;
    for (const event of track) {
      tick += event.delta;
      if (isTrackName(event) && tick === 0 && title === 'Imported MIDI') {
        title = event.trackName || title;
      }
      if (isSetTempo(event)) {
        tempo = Math.round(60_000_000 / event.setTempo.microsecondsPerQuarter);
      }
      if (isTimeSig(event)) {
        timeSig = {
          numerator: event.timeSignature.numerator,
          denominator: event.timeSignature.denominator,
        };
      }
      if (isKeySig(event)) {
        const k = `${event.keySignature.key}_${event.keySignature.scale}`;
        key = KEY_SIG_MAP[k] ?? 'C';
      }
    }
  }

  // Extract notes from all tracks, merge
  const allNotes: NoteEvent[] = [];
  for (const track of tracks) {
    allNotes.push(...extractNotes(track));
  }

  // Chord grouping tolerance: ~1/32 note
  const tolerance = Math.max(1, Math.round(division / 8));

  // Split into treble (>=60 / C4) and bass (<60)
  const trebleNotes = allNotes.filter(n => n.pitch >= 60);
  const bassNotes = allNotes.filter(n => n.pitch < 60);

  const trebleGroups = groupIntoChords(trebleNotes, tolerance);
  const bassGroups = groupIntoChords(bassNotes, tolerance);

  const rhMeasures = chordGroupsToMeasures(trebleGroups, division, timeSig);
  const lhMeasures = chordGroupsToMeasures(bassGroups, division, timeSig);

  // Pad parts to same length
  while (lhMeasures.length < rhMeasures.length) lhMeasures.push({ notes: [] });
  while (rhMeasures.length < lhMeasures.length) rhMeasures.push({ notes: [] });

  const parts: ScorePart[] = [
    { id: 'rh', name: 'Right Hand', clef: 'treble', hand: 'right', measures: rhMeasures },
    { id: 'lh', name: 'Left Hand', clef: 'bass', hand: 'left', measures: lhMeasures },
  ];

  return {
    id: `imported-midi-${Date.now()}`,
    title,
    key,
    timeSignature: timeSig,
    tempo,
    parts,
  };
}
