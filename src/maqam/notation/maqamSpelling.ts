import {
  pitchClassOf,
  type MaqamAccidentalCode,
  type MaqamLetter,
  type MaqamNoteSpelling,
} from './maqamAccidentals';
import type { MaqamPreset } from '../data/maqamPresets';
import type { StaffNote } from './maqamStaffDraw';

/**
 * Default spelling for each of the twelve keys when no maqam names it: black
 * keys as flats of the note above, which is the commoner reading in maqam
 * contexts (B♭, E♭) and keeps Hijaz's written scale intact.
 */
const DEFAULT_SPELLINGS: MaqamNoteSpelling[] = [
  { letter: 'C', accidental: 'n' },
  { letter: 'D', accidental: 'b' },
  { letter: 'D', accidental: 'n' },
  { letter: 'E', accidental: 'b' },
  { letter: 'E', accidental: 'n' },
  { letter: 'F', accidental: 'n' },
  { letter: 'G', accidental: 'b' },
  { letter: 'G', accidental: 'n' },
  { letter: 'A', accidental: 'b' },
  { letter: 'A', accidental: 'n' },
  { letter: 'B', accidental: 'b' },
  { letter: 'B', accidental: 'n' },
];

/** Bend a default spelling down by a quarter-tone, keeping its letter. */
const HALF_FLATTENED: Record<MaqamAccidentalCode, MaqamAccidentalCode> = {
  n: 'd', // E -> E half-flat
  b: 'db', // B flat -> B three-quarter-flat
  '#': '+', // (unused by the defaults, kept total)
  d: 'd',
  '+': '+',
  db: 'db',
  '++': '++',
};

/**
 * How to write a played MIDI note, given the maqam loaded and the bend the
 * tuning applies to it.
 *
 * A maqam that names the key wins: playing E in Rast writes E-half-flat, which
 * is what the ear hears, rather than the E-natural the key is painted with.
 * Outside the maqam, the key falls back to its default spelling, bent if the
 * user has retuned it by hand.
 */
export function spellMidiNote(
  midiNote: number,
  cents: number,
  preset: MaqamPreset | undefined,
): StaffNote {
  const pitchClass = ((Math.round(midiNote) % 12) + 12) % 12;
  const octave = Math.floor(Math.round(midiNote) / 12) - 1;

  const named = preset?.scaleDegrees.find((degree) => pitchClassOf(degree) === pitchClass);
  if (named) {
    return { letter: named.letter, accidental: named.accidental, octave };
  }

  const fallback = DEFAULT_SPELLINGS[pitchClass];
  const accidental = cents === 0 ? fallback.accidental : HALF_FLATTENED[fallback.accidental];
  return { letter: fallback.letter, accidental, octave };
}

/** The written form of a maqam's own scale, for the reference stave. */
export function referenceStaffNotes(
  preset: MaqamPreset | undefined,
  baseOctave: number,
): StaffNote[] {
  if (!preset) return [];
  return preset.scaleDegrees.map((degree) => ({
    letter: degree.letter,
    accidental: degree.accidental,
    octave: baseOctave + degree.octaveOffset,
  }));
}

/** Exposed for tests: the fallback spelling table is data, not behaviour. */
export function defaultSpellingFor(pitchClass: number): MaqamNoteSpelling {
  return DEFAULT_SPELLINGS[((pitchClass % 12) + 12) % 12];
}

export type { MaqamLetter };
