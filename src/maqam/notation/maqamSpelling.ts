import {
  pitchClassOf,
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

/**
 * Which degrees of the written scale the held keys correspond to.
 *
 * Matching is by pitch class, not by MIDI note, so holding E in any octave
 * lights every E in the scale — including Sikah's upper tonic, which is the
 * same degree an octave up. That is the honest answer for a 12-key board: one
 * key IS every octave of that pitch class.
 */
export function highlightedDegreeIndices(
  preset: MaqamPreset | undefined,
  activeNotes: ReadonlySet<number>,
): Set<number> {
  const lit = new Set<number>();
  if (!preset || activeNotes.size === 0) return lit;

  const activePitchClasses = new Set<number>();
  for (const midi of activeNotes) activePitchClasses.add(((midi % 12) + 12) % 12);

  preset.scaleDegrees.forEach((degree, index) => {
    if (activePitchClasses.has(pitchClassOf(degree))) lit.add(index);
  });
  return lit;
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
