import {
  MAQAM_ACCIDENTALS,
  microtonalCentsOf,
  midiNoteOf,
  pitchClassOf,
  spellingLabel,
  type MaqamNoteSpelling,
} from '../notation/maqamAccidentals';

/**
 * A scale degree as written: a spelling plus how many octaves above the maqam's
 * written tonic it sits. The octave lets a maqam close on its upper tonic.
 */
export interface MaqamScaleDegree extends MaqamNoteSpelling {
  octaveOffset: number;
}

/**
 * A jins — the three-, four-, or five-note building block a maqam is assembled
 * from. `intervalsInCents` is authored independently of `scaleDegrees`, and
 * `maqamPresets.test.ts` checks the two agree; a typo in either is caught by
 * the disagreement rather than by someone noticing the app sounds wrong.
 */
export interface Jins {
  id: string;
  name: string;
  /** Where in the maqam this jins is rooted, as written. */
  root: MaqamNoteSpelling;
  /** Cents above the root, ascending, starting at 0. */
  intervalsInCents: number[];
}

export interface MaqamPreset {
  id: string;
  /** Short name used in the picker, e.g. "Rast on C". */
  name: string;
  /** Transliterated Arabic name, e.g. "Maqam Rast". */
  transliteration: string;
  /** The tonic, as written. */
  tonic: MaqamNoteSpelling;
  description: string;
  /**
   * The full ascending scale, tonic to upper tonic. The detune matrix and the
   * keyboard colouring are both DERIVED from this — it is the one place a
   * maqam's pitches are written down.
   */
  scaleDegrees: MaqamScaleDegree[];
  primaryAjnas: Jins[];
}

/** Pitch-class names in the order the 12 detune slots appear, C first. */
export const PITCH_CLASS_NAMES = [
  'C',
  'C♯',
  'D',
  'D♯',
  'E',
  'F',
  'F♯',
  'G',
  'G♯',
  'A',
  'A♯',
  'B',
] as const;

/** Cents by pitch class, 0..11, applied on top of 12-TET. */
export type DetuneMatrix = number[];

export const NEUTRAL_DETUNE_MATRIX: DetuneMatrix = Object.freeze(
  new Array<number>(12).fill(0),
) as DetuneMatrix;

/**
 * Two scale degrees that want the same piano key bent by different amounts. A
 * 12-key board physically cannot play both, so this is surfaced rather than
 * resolved by last-write-wins — a silently dropped degree is a maqam that
 * sounds wrong with no indication why.
 */
export interface DetuneConflict {
  pitchClass: number;
  cents: number[];
}

export interface DerivedDetune {
  matrix: DetuneMatrix;
  conflicts: DetuneConflict[];
}

/**
 * Build the 12-slot retuning a maqam needs from the notes it is written with.
 *
 * Authoring the matrix separately from the scale — as the original spec did —
 * makes the same fact true in two places, and nothing keeps them true together.
 * Deriving it means a maqam's pitches are edited once.
 */
export function deriveDetuneMatrix(degrees: MaqamScaleDegree[]): DerivedDetune {
  const centsByPitchClass = new Map<number, Set<number>>();
  for (const degree of degrees) {
    const pc = pitchClassOf(degree);
    const cents = microtonalCentsOf(degree);
    const seen = centsByPitchClass.get(pc) ?? new Set<number>();
    seen.add(cents);
    centsByPitchClass.set(pc, seen);
  }

  const matrix = new Array<number>(12).fill(0);
  const conflicts: DetuneConflict[] = [];
  for (const [pitchClass, centsSet] of centsByPitchClass) {
    const cents = [...centsSet].sort((a, b) => a - b);
    // Pick the bent reading so a conflicted key at least plays the microtone
    // the maqam is named for; the conflict is reported either way.
    matrix[pitchClass] = cents.find((c) => c !== 0) ?? 0;
    if (cents.length > 1) conflicts.push({ pitchClass, cents });
  }
  return { matrix, conflicts };
}

/** Pitch classes a maqam uses at all, bent or not — the "in the scale" set. */
export function scalePitchClasses(degrees: MaqamScaleDegree[]): Set<number> {
  return new Set(degrees.map((degree) => pitchClassOf(degree)));
}

/**
 * Absolute cents above MIDI 0 for a degree of a maqam written from
 * `tonicOctave`. Used to compare a jins against the scale it came from.
 */
export function degreeAbsoluteCents(degree: MaqamScaleDegree, tonicOctave: number): number {
  const midi = midiNoteOf(degree, tonicOctave + degree.octaveOffset);
  return midi * 100 + microtonalCentsOf(degree);
}

/** How a maqam's written spelling reads back, e.g. "C D E½♭ F G A B½♭ C". */
export function scaleDegreeLabels(degrees: MaqamScaleDegree[]): string[] {
  return degrees.map((degree) => spellingLabel(degree));
}

/** True when any degree of the maqam leaves 12-TET. */
export function hasMicrotones(degrees: MaqamScaleDegree[]): boolean {
  return degrees.some((degree) => MAQAM_ACCIDENTALS[degree.accidental].isMicrotonal);
}

const n = (letter: MaqamScaleDegree['letter'], octaveOffset = 0): MaqamScaleDegree => ({
  letter,
  accidental: 'n',
  octaveOffset,
});
const halfFlat = (
  letter: MaqamScaleDegree['letter'],
  octaveOffset = 0,
): MaqamScaleDegree => ({ letter, accidental: 'd', octaveOffset });
const flat = (letter: MaqamScaleDegree['letter'], octaveOffset = 0): MaqamScaleDegree => ({
  letter,
  accidental: 'b',
  octaveOffset,
});
const sharp = (letter: MaqamScaleDegree['letter'], octaveOffset = 0): MaqamScaleDegree => ({
  letter,
  accidental: '#',
  octaveOffset,
});

export const MAQAM_PRESETS: MaqamPreset[] = [
  {
    id: 'rast_c',
    name: 'Rast on C',
    transliteration: 'Maqam Rast',
    tonic: { letter: 'C', accidental: 'n' },
    description:
      'The foundational maqam, and the one most others are measured against. Its third and seventh sit half-flat — between the major and minor you already know.',
    scaleDegrees: [
      n('C'),
      n('D'),
      halfFlat('E'),
      n('F'),
      n('G'),
      n('A'),
      halfFlat('B'),
      n('C', 1),
    ],
    primaryAjnas: [
      {
        id: 'rast_c__jins_rast_c',
        name: 'Jins Rast on C',
        root: { letter: 'C', accidental: 'n' },
        intervalsInCents: [0, 200, 350, 500],
      },
      {
        id: 'rast_c__jins_rast_g',
        name: 'Jins Rast on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 350, 500],
      },
    ],
  },
  {
    id: 'bayati_d',
    name: 'Bayati on D',
    transliteration: 'Maqam Bayati',
    tonic: { letter: 'D', accidental: 'n' },
    description:
      'Everywhere in Arabic song. The half-flat second gives it a pull toward the tonic that no Western mode has.',
    scaleDegrees: [
      n('D'),
      halfFlat('E'),
      n('F'),
      n('G'),
      n('A'),
      flat('B'),
      n('C', 1),
      n('D', 1),
    ],
    primaryAjnas: [
      {
        id: 'bayati_d__jins_bayati_d',
        name: 'Jins Bayati on D',
        root: { letter: 'D', accidental: 'n' },
        intervalsInCents: [0, 150, 300, 500],
      },
      {
        // The spec rooted this jins on A, where Bayati's B-flat makes the
        // authored 0-200-300-500 impossible (it would be Jins Kurd). Nahawand
        // sits on the fifth degree, G — where those intervals are exactly right.
        id: 'bayati_d__jins_nahawand_g',
        name: 'Jins Nahawand on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 300, 500],
      },
    ],
  },
  {
    id: 'hijaz_d',
    name: 'Hijaz on D',
    transliteration: 'Maqam Hijaz',
    tonic: { letter: 'D', accidental: 'n' },
    description:
      'No microtones at all — the drama is the step-and-a-half leap from E♭ to F♯. A good place to start if the half-flats are not landing yet.',
    scaleDegrees: [
      n('D'),
      flat('E'),
      sharp('F'),
      n('G'),
      n('A'),
      flat('B'),
      n('C', 1),
      n('D', 1),
    ],
    primaryAjnas: [
      {
        id: 'hijaz_d__jins_hijaz_d',
        name: 'Jins Hijaz on D',
        root: { letter: 'D', accidental: 'n' },
        intervalsInCents: [0, 100, 400, 500],
      },
      {
        id: 'hijaz_d__jins_nahawand_g',
        name: 'Jins Nahawand on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 300, 500],
      },
    ],
  },
  {
    id: 'sikah_e',
    name: 'Sikah on E½♭',
    transliteration: 'Maqam Sikah',
    tonic: { letter: 'E', accidental: 'd' },
    description:
      'Rooted on a half-flat, so the home note itself is one you cannot play on an untouched piano. Its first jins is only three notes.',
    scaleDegrees: [
      halfFlat('E'),
      n('F'),
      n('G'),
      n('A'),
      halfFlat('B'),
      n('C', 1),
      n('D', 1),
      halfFlat('E', 1),
    ],
    primaryAjnas: [
      {
        id: 'sikah_e__jins_sikah_e',
        name: 'Jins Sikah on E½♭',
        root: { letter: 'E', accidental: 'd' },
        intervalsInCents: [0, 150, 350],
      },
      {
        id: 'sikah_e__jins_rast_g',
        name: 'Jins Rast on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 350, 500],
      },
    ],
  },
];

export const MAQAM_PRESETS_BY_ID: Record<string, MaqamPreset> = Object.fromEntries(
  MAQAM_PRESETS.map((preset) => [preset.id, preset]),
);

export const DEFAULT_MAQAM_ID = 'rast_c';

/**
 * Look up a preset. Returns `undefined` for an unknown id rather than falling
 * back to Rast — a stale URL should not silently look like a deliberate choice
 * of the default maqam.
 */
export function findMaqamPreset(id: string | null | undefined): MaqamPreset | undefined {
  if (!id) return undefined;
  return MAQAM_PRESETS_BY_ID[id];
}
