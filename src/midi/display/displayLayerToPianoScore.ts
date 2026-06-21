import type { NoteDuration, PianoScore, ScoreMeasure } from '../../shared/music/scoreTypes';
import { generateNoteId } from '../../shared/music/scoreTypes';
import type { DisplayLayer, DisplayNote } from '../types';

/** Middle C — same split as `parseMidi` / MusicXML import. */
export const PIANO_SPLIT_MIDI = 60;

/** Notes within this beat distance render as one chord head. */
export const BEAT_CHORD_TOLERANCE = 0.08;

export type BeatNoteGroup = {
  beat: number;
  durationBeats: number;
  midis: number[];
};

export function groupDisplayNotesByBeat(
  notes: readonly DisplayNote[],
  tolerance = BEAT_CHORD_TOLERANCE,
): BeatNoteGroup[] {
  const sorted = [...notes].sort((a, b) => a.beat - b.beat || a.midi - b.midi);
  const groups: BeatNoteGroup[] = [];

  for (const note of sorted) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(note.beat - last.beat) <= tolerance) {
      last.midis.push(note.midi);
      last.durationBeats = Math.max(last.durationBeats, note.durationBeats);
    } else {
      groups.push({
        beat: note.beat,
        durationBeats: note.durationBeats,
        midis: [note.midi],
      });
    }
  }

  for (const group of groups) {
    group.midis.sort((a, b) => a - b);
  }

  return groups;
}

function beatsToDuration(beats: number): { duration: NoteDuration; dotted: boolean } {
  const rounded = Math.max(0.25, beats);
  if (rounded >= 4) return { duration: 'whole', dotted: false };
  if (rounded >= 3) return { duration: 'half', dotted: true };
  if (rounded >= 2) return { duration: 'half', dotted: false };
  if (rounded >= 1.5) return { duration: 'quarter', dotted: true };
  if (rounded >= 1) return { duration: 'quarter', dotted: false };
  if (rounded >= 0.75) return { duration: 'eighth', dotted: true };
  if (rounded >= 0.5) return { duration: 'eighth', dotted: false };
  if (rounded >= 0.375) return { duration: 'sixteenth', dotted: true };
  return { duration: 'sixteenth', dotted: false };
}

function buildMeasuresFromNotes(
  notes: readonly DisplayNote[],
  beatsPerBar: number,
  barCount: number,
): ScoreMeasure[] {
  const measures: ScoreMeasure[] = Array.from({ length: barCount }, () => ({ notes: [] }));
  const lastEndByBar = Array.from({ length: barCount }, () => 0);
  const groups = groupDisplayNotesByBeat(notes);

  for (const group of groups) {
    const barIndex = Math.min(barCount - 1, Math.floor(group.beat / beatsPerBar));
    const beatInBar = group.beat - barIndex * beatsPerBar;
    const measure = measures[barIndex]!;
    const lastEnd = lastEndByBar[barIndex] ?? 0;

    if (beatInBar > lastEnd + 0.02) {
      const restDur = beatsToDuration(beatInBar - lastEnd);
      measure.notes.push({
        id: generateNoteId(),
        pitches: [],
        duration: restDur.duration,
        dotted: restDur.dotted,
        rest: true,
      });
    }

    const { duration, dotted } = beatsToDuration(group.durationBeats);
    measure.notes.push({
      id: generateNoteId(),
      pitches: [...group.midis],
      duration,
      dotted,
    });
    lastEndByBar[barIndex] = Math.max(lastEnd, beatInBar + group.durationBeats);
  }

  for (const measure of measures) {
    if (measure.notes.length === 0) {
      measure.notes.push({
        id: generateNoteId(),
        pitches: [],
        duration: 'quarter',
        rest: true,
      });
    }
  }

  return measures;
}

export function displayLayerToPianoScore(layer: DisplayLayer, bpm: number): PianoScore {
  const beatsPerBar = layer.beatsPerBar;
  const maxBeat = layer.notes.reduce(
    (max, n) => Math.max(max, n.beat + n.durationBeats),
    beatsPerBar,
  );
  const barCount = Math.max(1, Math.ceil(maxBeat / beatsPerBar));

  const trebleNotes = layer.notes.filter((note) => note.midi >= PIANO_SPLIT_MIDI);
  const bassNotes = layer.notes.filter((note) => note.midi < PIANO_SPLIT_MIDI);

  const rhMeasures = buildMeasuresFromNotes(trebleNotes, beatsPerBar, barCount);
  const lhMeasures = buildMeasuresFromNotes(bassNotes, beatsPerBar, barCount);

  return {
    id: 'midi-scratchpad-display',
    title: 'Captured loop',
    key: 'C',
    timeSignature: layer.timeSignature,
    tempo: bpm,
    parts: [
      {
        id: 'rh',
        name: 'Right Hand',
        clef: 'treble',
        hand: 'right',
        measures: rhMeasures,
      },
      {
        id: 'lh',
        name: 'Left Hand',
        clef: 'bass',
        hand: 'left',
        measures: lhMeasures,
      },
    ],
  };
}
