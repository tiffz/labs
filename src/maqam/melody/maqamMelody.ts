import type { DetuneMatrix, MaqamPreset } from '../data/maqamPresets';
import { accidentalFor, midiNoteOf, semitoneShiftOf } from '../notation/maqamAccidentals';
import type { StaffNote } from '../notation/maqamStaffDraw';
import { detuneForMidiNote } from '../audio/maqamSynth';

/**
 * A note of the scale, as a degree of the loaded maqam rather than an absolute
 * pitch. "The third degree" resolves to E half-flat in Rast and E flat in Kurd
 * without the caller knowing either.
 */
export interface MelodyNote {
  /** Index into the maqam's `scaleDegrees`. */
  degree: number;
  /** Length in beats. 1 = quarter note. */
  beats: number;
}

/**
 * The scale, ascending. The only thing this app plays.
 *
 * It used to ship 7 drill patterns and a procedural phrase generator. They are
 * gone deliberately. Every one of them made a claim about how this music moves
 * (which degrees a phrase leans on, how it descends, where it rests) and those
 * claims belong to the sayr, which nobody here is in a position to get right.
 * A scale is the one thing that follows from the data without anyone's
 * judgement about the idiom.
 *
 * Restoring them is a question of learning enough about sayr to make them
 * honest, not of wanting more buttons.
 */
export function scaleOf(preset: MaqamPreset): MelodyNote[] {
  return preset.scaleDegrees.map((_, index) => ({ degree: index, beats: 1 }));
}

/** VexFlow duration code for a note length in beats. */
export function durationForBeats(beats: number): string {
  if (beats >= 4) return 'w';
  if (beats >= 2) return 'h';
  if (beats >= 1) return 'q';
  if (beats >= 0.5) return '8';
  return '16';
}

export interface ResolvedMelodyNote {
  staff: StaffNote;
  midiNote: number;
  cents: number;
  beats: number;
  duration: string;
}

/**
 * Resolve into staff notes and MIDI pitches, against the LIVE tuning.
 *
 * `matrix` is required, and it is the single source of truth for pitch. That
 * is a correctness fix, not a convenience: this used to take the bend from the
 * preset's own spelling while the keyboard took it from the live matrix, so
 * the moment anyone edited the tuning, pressing E and pressing Play produced
 * two different pitches for one written note.
 *
 * The accidental is re-derived too. Un-bend Rast's E and the degree is still
 * written on the E line, but with no bend, so the staff must draw a natural
 * rather than a half-flat. Staff, keyboard and audio all read the matrix.
 */
export function resolveMelody(
  preset: MaqamPreset,
  notes: MelodyNote[],
  baseOctave: number,
  matrix: DetuneMatrix,
): ResolvedMelodyNote[] {
  const resolved: ResolvedMelodyNote[] = [];
  for (const item of notes) {
    const degree = preset.scaleDegrees[item.degree];
    if (!degree) continue;

    const octave = baseOctave + degree.octaveOffset;
    const midiNote = midiNoteOf(degree, octave);
    const cents = detuneForMidiNote(midiNote, matrix);

    // Keep the maqam's letter, and let the live bend choose the accidental.
    const accidental = accidentalFor(semitoneShiftOf(degree), cents) ?? degree.accidental;

    resolved.push({
      staff: { letter: degree.letter, accidental, octave },
      midiNote,
      cents,
      beats: item.beats,
      duration: durationForBeats(item.beats),
    });
  }
  return resolved;
}
