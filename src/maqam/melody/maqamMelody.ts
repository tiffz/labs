import type { MaqamPreset } from '../data/maqamPresets';
import { microtonalCentsOf, midiNoteOf } from '../notation/maqamAccidentals';
import type { StaffNote } from '../notation/maqamStaffDraw';

/**
 * A note of a melody, as a degree of the loaded maqam rather than an absolute
 * pitch.
 *
 * That indirection is the whole design. Every pattern below is written once and
 * plays correctly in all 9 families, in tune, because "the third degree" resolves
 * to E½♭ in Rast and E♭ in Kurd without the pattern knowing either.
 */
export interface MelodyNote {
  /** Index into the maqam's `scaleDegrees`. */
  degree: number;
  /** Length in beats. 1 = quarter note. */
  beats: number;
}

export type MelodyKind = 'scale' | 'exercise' | 'arpeggio' | 'generated';

/**
 * Why these are generated rather than transcribed.
 *
 * Copyright covers expression, not procedure: "play the scale in thirds" is an
 * idea, and a pattern derived mechanically from data we author ourselves carries
 * no licence at all. Transcribing famous maqam repertoire would have meant
 * shipping content whose provenance could not be verified — most named examples
 * are 20th-century and firmly in copyright, and "traditional" attributions are
 * wrong often enough to matter in an app whose credibility rests on its musical
 * claims being checked.
 *
 * These also cover all 9 families for free, and they are testable: every note
 * must land on a real degree of the maqam.
 */
export interface MelodyDefinition {
  id: string;
  name: string;
  kind: MelodyKind;
  /** One line on what the pattern teaches. */
  description: string;
  build: (preset: MaqamPreset) => MelodyNote[];
}

/** Degrees available, guarding against a preset shorter than a pattern needs. */
function span(preset: MaqamPreset): number {
  return preset.scaleDegrees.length;
}

function note(degree: number, beats: number): MelodyNote {
  return { degree, beats };
}

/** Where the second jins starts — the degree maqam phrases rest on. */
function ghammazDegree(preset: MaqamPreset): number {
  const lowerJinsNotes = preset.primaryAjnas[0]?.intervalsInCents.length ?? 4;
  return Math.min(Math.max(lowerJinsNotes - 1, 1), span(preset) - 1);
}

function ascending(preset: MaqamPreset): MelodyNote[] {
  return preset.scaleDegrees.map((_, index) => note(index, 1));
}

function descending(preset: MaqamPreset): MelodyNote[] {
  const last = span(preset) - 1;
  return preset.scaleDegrees.map((_, index) =>
    note(last - index, index === last ? 2 : 1),
  );
}

/**
 * Each degree against the one 2 above it — the classic Hanon-style interval
 * drill, and how you learn to hear a maqam's characteristic thirds.
 */
function thirds(preset: MaqamPreset): MelodyNote[] {
  const out: MelodyNote[] = [];
  for (let i = 0; i + 2 < span(preset); i += 1) {
    out.push(note(i, 0.5), note(i + 2, 0.5));
  }
  return out;
}

/**
 * Tonic, third, fifth and back.
 *
 * Worth being explicit about what this is not: maqam music is monophonic and
 * heterophonic and has no functional harmony, so there are no chord progressions
 * to practise. This is an interval drill. The traditional accompaniment is a
 * drone on the tonic, which the player offers separately.
 */
function arpeggio(preset: MaqamPreset): MelodyNote[] {
  const top = Math.min(span(preset) - 1, 7);
  const up = [0, 2, 4, top];
  const shape = [...up, ...up.slice(0, -1).reverse()];
  return shape.map((degree, index) => note(degree, index === shape.length - 1 ? 2 : 0.5));
}

/**
 * The two ajnas, separately, with a longer note where they meet.
 *
 * This is the pattern that shows what a maqam actually is: two cells joined at a
 * shared degree, rather than a row of 7 notes.
 */
function jinsByJins(preset: MaqamPreset): MelodyNote[] {
  const pivot = ghammazDegree(preset);
  const last = span(preset) - 1;
  const out: MelodyNote[] = [];
  for (let i = 0; i <= pivot; i += 1) out.push(note(i, i === pivot ? 2 : 1));
  for (let i = pivot; i <= last; i += 1) out.push(note(i, i === last ? 2 : 1));
  return out;
}

/** Up to the ghammaz and back down to the tonic. */
function ghammazTurn(preset: MaqamPreset): MelodyNote[] {
  const ghammaz = ghammazDegree(preset);
  const out: MelodyNote[] = [];
  for (let i = 0; i <= ghammaz; i += 1) out.push(note(i, 0.5));
  out.push(note(ghammaz, 1));
  for (let i = ghammaz - 1; i >= 0; i -= 1) out.push(note(i, 0.5));
  out.push(note(0, 2));
  return out;
}

/** A qafla — the descending formula a maqam phrase closes on. */
function qafla(preset: MaqamPreset): MelodyNote[] {
  const top = Math.min(4, span(preset) - 1);
  const notes: MelodyNote[] = [note(top, 1)];
  if (top >= 1) notes.push(note(top - 1, 0.5), note(top, 0.5));
  notes.push(note(Math.min(2, top), 1));
  if (top >= 1) notes.push(note(1, 0.5), note(0, 0.5), note(1, 0.5));
  notes.push(note(0, 2));
  return notes;
}

export const MELODY_PATTERNS: MelodyDefinition[] = [
  {
    id: 'scale-up',
    name: 'The scale',
    kind: 'scale',
    description: 'Every degree in order, tonic upward.',
    build: ascending,
  },
  {
    id: 'scale-down',
    name: 'Descending',
    kind: 'scale',
    description: 'The same degrees coming down, where a maqam shows its character.',
    build: descending,
  },
  {
    id: 'jins-by-jins',
    name: 'Jins by jins',
    kind: 'exercise',
    description: 'The 2 cells separately, meeting on the degree they share.',
    build: jinsByJins,
  },
  {
    id: 'ghammaz-turn',
    name: 'Up to the ghammaz',
    kind: 'exercise',
    description: 'Climb to the resting degree and fall back to the tonic.',
    build: ghammazTurn,
  },
  {
    id: 'thirds',
    name: 'In thirds',
    kind: 'exercise',
    description: 'Each degree against the one 2 above it, the way Hanon drills intervals.',
    build: thirds,
  },
  {
    id: 'arpeggio',
    name: 'Arpeggio',
    kind: 'arpeggio',
    description: 'Tonic, third, fifth and back. An interval drill, not a chord.',
    build: arpeggio,
  },
  {
    id: 'qafla',
    name: 'Qafla (cadence)',
    kind: 'exercise',
    description: 'The descending formula a phrase closes on.',
    build: qafla,
  },
];

export const DEFAULT_MELODY_ID = 'scale-up';
/** Selecting this builds a fresh phrase from the current seed. */
export const GENERATED_MELODY_ID = 'generated';

export function findMelodyDefinition(id: string): MelodyDefinition | undefined {
  return MELODY_PATTERNS.find((pattern) => pattern.id === id);
}

/** Deterministic PRNG, so a generated phrase is reproducible from its seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Total beats in a melody. */
export function melodyBeats(notes: MelodyNote[]): number {
  return notes.reduce((sum, item) => sum + item.beats, 0);
}

/** Two bars of 4/4. */
export const GENERATED_BEATS = 8;

/**
 * Generate a phrase in the loaded maqam.
 *
 * Constrained rather than random: maqam melody is overwhelmingly conjunct, and a
 * phrase starts and ends on a degree the maqam rests on. An unconstrained random
 * walk sounds like an exercise in atonality rather than like the maqam.
 */
export function generateMelody(preset: MaqamPreset, seed: number): MelodyNote[] {
  const random = mulberry32(seed || 1);
  const top = span(preset) - 1;
  const ghammaz = ghammazDegree(preset);

  const notes: MelodyNote[] = [];
  let beatsLeft = GENERATED_BEATS;
  let degree = random() < 0.5 ? 0 : ghammaz;

  // Leave a beat for the closing tonic, so the phrase always resolves.
  while (beatsLeft > 1) {
    // Eighths outnumber quarters: a phrase of all quarter notes reads as a
    // metronome rather than as a melody.
    const beats = random() < 0.62 ? 0.5 : 1;
    const take = Math.min(beats, beatsLeft - 1);
    notes.push(note(degree, take));
    beatsLeft -= take;

    const roll = random();
    const next =
      roll < 0.62
        ? degree + (random() < 0.5 ? 1 : -1)
        : roll < 0.88
          ? degree + (random() < 0.5 ? 2 : -2)
          : ghammaz;
    degree = Math.min(Math.max(next, 0), top);
  }

  notes.push(note(0, beatsLeft));
  return notes;
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
 * Resolve a melody into staff notes and MIDI pitches for the loaded maqam.
 *
 * Both together, so the staff and the keyboard cannot disagree about which note
 * is sounding — they are two readings of one array rather than two parallel
 * derivations that could drift.
 */
export function resolveMelody(
  preset: MaqamPreset,
  notes: MelodyNote[],
  baseOctave: number,
): ResolvedMelodyNote[] {
  const resolved: ResolvedMelodyNote[] = [];
  for (const item of notes) {
    const degree = preset.scaleDegrees[item.degree];
    if (!degree) continue;
    const octave = baseOctave + degree.octaveOffset;
    resolved.push({
      staff: { letter: degree.letter, accidental: degree.accidental, octave },
      // Reuses the accidental table rather than repeating its arithmetic: a
      // second copy of "which key does E-half-flat play on" is exactly the
      // duplicated invariant this app already got bitten by once.
      midiNote: midiNoteOf(degree, octave),
      cents: microtonalCentsOf(degree),
      beats: item.beats,
      duration: durationForBeats(item.beats),
    });
  }
  return resolved;
}
