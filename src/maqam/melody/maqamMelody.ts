import {
  ajnasJoin,
  ghammazDegreeIndex,
  type DetuneMatrix,
  type MaqamPreset,
} from '../data/maqamPresets';
import { accidentalFor, midiNoteOf, semitoneShiftOf } from '../notation/maqamAccidentals';
import type { StaffNote } from '../notation/maqamStaffDraw';
import { detuneForMidiNote } from '../audio/maqamSynth';

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

/**
 * Where the second jins starts — the degree maqam phrases rest on.
 *
 * Read from the upper jins's root. This used to be guessed from the LOWER
 * jins's note count, which is only the same answer when the two cells share a
 * degree. Rast, Nahawand and Ajam are disjunct, so all three rested a whole
 * tone below their real ghammaz: in Rast, the pattern whose description says
 * the cells "meet on the degree they share" sat twice on F, which neither cell
 * is rooted on.
 */
function ghammazDegree(preset: MaqamPreset): number {
  return ghammazDegreeIndex(preset);
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
 * to practise. This is an interval drill.
 */
function arpeggio(preset: MaqamPreset): MelodyNote[] {
  const top = Math.min(span(preset) - 1, 7);
  const up = [0, 2, 4, top];
  const shape = [...up, ...up.slice(0, -1).reverse()];
  return shape.map((degree, index) => note(degree, index === shape.length - 1 ? 2 : 0.5));
}

/**
 * Each cell on its own, held at the end of each.
 *
 * This is the pattern that shows what a maqam actually is: two cells, rather
 * than a row of 7 notes. It plays the cells the maqam really has — the lower
 * one from the tonic to its own top degree, then the upper one from the
 * ghammaz — so a conjunct maqam repeats the degree they share and a disjunct
 * one steps up to reach the second cell. Hearing that difference is the point.
 *
 * It used to run the first cell all the way to the pivot and start the second
 * there, which for Rast meant a first "cell" of C D E½♭ F G: a five-note run
 * ending on a note the four-note Jins Rast does not contain.
 */
function jinsByJins(preset: MaqamPreset): MelodyNote[] {
  const last = span(preset) - 1;
  const join = ajnasJoin(preset);
  const out: MelodyNote[] = [];

  // One settled cell (Saba): play it, then carry on to the top of the scale.
  const lowerTop = join ? join.lowerTopIndex : ghammazDegree(preset);
  const upperRoot = join ? join.ghammazIndex : lowerTop;

  for (let i = 0; i <= lowerTop; i += 1) out.push(note(i, i === lowerTop ? 2 : 1));
  for (let i = upperRoot; i <= last; i += 1) out.push(note(i, i === last ? 2 : 1));
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
    description: 'Each cell on its own, so you hear where one ends and the next starts.',
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
    // Not "octave": Saba has no eighth degree, so on Saba the top of this
    // shape is the seventh — and the panel on the same screen says so.
    description: 'Tonic, third, fifth, top of the scale, and back. A drill, not a chord.',
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

/**
 * Bring a degree back inside the scale by bouncing off the end, not by pinning
 * to it.
 *
 * Clamping turned every out-of-range step into a repeat of the boundary note,
 * so phrases that wandered to the tonic or the octave stuck there: runs of
 * three, four and five identical notes, in a generator whose own description
 * promises stepwise motion.
 */
function reflectIntoScale(degree: number, top: number): number {
  if (degree < 0) return Math.min(-degree, top);
  if (degree > top) return Math.max(top - (degree - top), 0);
  return degree;
}

/**
 * Move to `target`, guaranteeing the phrase actually moves.
 *
 * Reflection alone is not enough: a step of -2 from degree 1 reflects to 1
 * again, so the note repeats anyway. When the bounce lands back where it
 * started, step one degree inward instead.
 */
function stepAwayFrom(from: number, target: number, top: number): number {
  const next = reflectIntoScale(target, top);
  if (next !== from) return next;
  return reflectIntoScale(from + (from >= top ? -1 : 1), top);
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
    const step =
      roll < 0.62
        ? (random() < 0.5 ? 1 : -1)
        : roll < 0.88
          ? (random() < 0.5 ? 2 : -2)
          : 0;
    // Landing on the ghammaz is a move, not a destination: rolling it while
    // already there used to be a self-transition, so the note simply repeated.
    // That was the likelier branch after the phrase starts on the ghammaz half
    // the time.
    const target = step === 0 ? (degree === ghammaz ? degree + 1 : ghammaz) : degree + step;
    degree = stepAwayFrom(degree, target, top);
  }

  // Merge into the closing tonic rather than striking it twice. A phrase that
  // wandered home on its last step would otherwise end "C C", which is the
  // repeated note this generator exists not to produce.
  const last = notes[notes.length - 1];
  if (last && last.degree === 0) last.beats += beatsLeft;
  else notes.push(note(0, beatsLeft));

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
 * Resolve a melody into staff notes and MIDI pitches, against the LIVE tuning.
 *
 * `matrix` is required, and it is the single source of truth for pitch. That is
 * a correctness fix, not a convenience: this function used to take the bend
 * from the preset's own spelling while the keyboard took it from the live
 * matrix, so the moment anyone edited the tuning, pressing E and pressing Play
 * produced two different pitches for one written note — with the staff and the
 * screen-reader label still announcing the preset's. The app's one stated
 * invariant, broken by its own escape hatch.
 *
 * The accidental is re-derived too. Un-bend Rast's E and the degree is still
 * written on the E line, but with no bend, so the staff must draw a natural
 * rather than a half-flat. Staff, keyboard and audio now all read the matrix.
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

    // Keep the maqam's letter — E half-flat and F three-quarter-flat sound the
    // same but are different notes — and let the live bend choose the
    // accidental. Falls back to the written spelling if the pairing has no
    // symbol, rather than drawing something wrong.
    const accidental =
      accidentalFor(semitoneShiftOf(degree), cents) ?? degree.accidental;

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
