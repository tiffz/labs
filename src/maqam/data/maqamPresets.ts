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
   * The ascending scale. The detune matrix and the keyboard colouring are both
   * DERIVED from this — it is the one place a maqam's pitches are written down.
   *
   * Ends on the upper tonic when `repeatsAtOctave`; otherwise it stops at the
   * seventh degree.
   */
  scaleDegrees: MaqamScaleDegree[];
  /**
   * Whether the maqam returns to its tonic an octave up.
   *
   * True for eight of the nine families. **Saba does not** — its upper tonic is
   * flattened, so the scale never closes at 1200 cents. An earlier version of
   * this module asserted every maqam spanned exactly an octave, which is a
   * Western assumption, not a fact about maqamat; Saba is the counterexample
   * that made it visible.
   */
  repeatsAtOctave: boolean;
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

/**
 * The nine maqam families.
 *
 * Every other named maqam in common use is a member of one of these, so this is
 * the set that teaches the system rather than a catalogue.
 *
 * Each is authored twice over — once as written `scaleDegrees`, once as
 * `primaryAjnas` intervals — and `maqamPresets.test.ts` requires the two to
 * agree. That cross-check is what caught the original spec rooting Jins
 * Nahawand on A in Bayati, where the B-flat makes those intervals impossible.
 *
 * Four families use microtones (Rast, Bayati, Sikah, Saba); five sit entirely
 * in 12-TET (Ajam, Hijaz, Kurd, Nahawand, Nikriz). That spread is deliberate —
 * it shows that "maqam" is not a synonym for "quarter-tone".
 */
export const MAQAM_PRESETS: MaqamPreset[] = [
  {
    id: 'rast_c',
    name: 'Rast on C',
    transliteration: 'Maqam Rast',
    tonic: { letter: 'C', accidental: 'n' },
    description:
      'The foundational maqam, and the one others are measured against. Its third and seventh sit half-flat, between the major and minor you already know.',
    repeatsAtOctave: true,
    scaleDegrees: [n('C'), n('D'), halfFlat('E'), n('F'), n('G'), n('A'), halfFlat('B'), n('C', 1)],
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
    repeatsAtOctave: true,
    scaleDegrees: [n('D'), halfFlat('E'), n('F'), n('G'), n('A'), flat('B'), n('C', 1), n('D', 1)],
    primaryAjnas: [
      {
        id: 'bayati_d__jins_bayati_d',
        name: 'Jins Bayati on D',
        root: { letter: 'D', accidental: 'n' },
        intervalsInCents: [0, 150, 300, 500],
      },
      {
        // The spec rooted this on A, where Bayati's B-flat makes the authored
        // 0-200-300-500 impossible (it would be Jins Kurd). Nahawand sits on
        // the fifth degree, G — where those intervals are exactly right.
        id: 'bayati_d__jins_nahawand_g',
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
      'Rooted on a half-flat, so the home note itself is one an untouched piano cannot play. Its first jins is only three notes.',
    repeatsAtOctave: true,
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
  {
    id: 'saba_d',
    name: 'Saba on D',
    transliteration: 'Maqam Saba',
    tonic: { letter: 'D', accidental: 'n' },
    description:
      'The sound of lament. Saba is the one family that never comes home: its upper tonic is flattened, so the scale does not close at the octave.',
    // The exception the `repeatsAtOctave` flag exists for.
    repeatsAtOctave: false,
    scaleDegrees: [
      n('D'),
      halfFlat('E'),
      n('F'),
      flat('G'),
      n('A'),
      flat('B'),
      n('C', 1),
    ],
    primaryAjnas: [
      {
        // Only the lower jins is listed. Jins Saba — with its diminished fourth
        // from D to G-flat — is the uncontested, defining cell. Saba's upper
        // region is analysed differently across sources, and guessing at it
        // would be inventing content (docs/CONTENT_ACCURACY.md).
        id: 'saba_d__jins_saba_d',
        name: 'Jins Saba on D',
        root: { letter: 'D', accidental: 'n' },
        intervalsInCents: [0, 150, 300, 400],
      },
    ],
  },
  {
    id: 'hijaz_d',
    name: 'Hijaz on D',
    transliteration: 'Maqam Hijaz',
    tonic: { letter: 'D', accidental: 'n' },
    description:
      'No microtones at all. The drama is the step-and-a-half leap from E♭ to F♯. A good place to start if the half-flats are not landing yet.',
    repeatsAtOctave: true,
    scaleDegrees: [n('D'), flat('E'), sharp('F'), n('G'), n('A'), flat('B'), n('C', 1), n('D', 1)],
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
    id: 'kurd_d',
    name: 'Kurd on D',
    transliteration: 'Maqam Kurd',
    tonic: { letter: 'D', accidental: 'n' },
    description:
      'A flattened second and nothing else exotic. Western ears hear Phrygian; the difference is where the melody rests, not which notes exist.',
    repeatsAtOctave: true,
    scaleDegrees: [n('D'), flat('E'), n('F'), n('G'), n('A'), flat('B'), n('C', 1), n('D', 1)],
    primaryAjnas: [
      {
        id: 'kurd_d__jins_kurd_d',
        name: 'Jins Kurd on D',
        root: { letter: 'D', accidental: 'n' },
        intervalsInCents: [0, 100, 300, 500],
      },
      {
        id: 'kurd_d__jins_nahawand_g',
        name: 'Jins Nahawand on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 300, 500],
      },
    ],
  },
  {
    id: 'nahawand_c',
    name: 'Nahawand on C',
    transliteration: 'Maqam Nahawand',
    tonic: { letter: 'C', accidental: 'n' },
    description:
      'The closest thing to a Western minor. Useful as a control: if Nahawand sounds ordinary to you, the strangeness in the others really is the tuning.',
    repeatsAtOctave: true,
    scaleDegrees: [n('C'), n('D'), flat('E'), n('F'), n('G'), flat('A'), flat('B'), n('C', 1)],
    primaryAjnas: [
      {
        id: 'nahawand_c__jins_nahawand_c',
        name: 'Jins Nahawand on C',
        root: { letter: 'C', accidental: 'n' },
        intervalsInCents: [0, 200, 300, 500],
      },
      {
        id: 'nahawand_c__jins_kurd_g',
        name: 'Jins Kurd on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 100, 300, 500],
      },
    ],
  },
  {
    id: 'nikriz_c',
    name: 'Nikriz on C',
    transliteration: 'Maqam Nikriz',
    tonic: { letter: 'C', accidental: 'n' },
    description:
      'Built on a five-note jins rather than a four-note one, with a raised fourth. The extra note is why its lower cell reaches all the way to the fifth.',
    repeatsAtOctave: true,
    scaleDegrees: [n('C'), n('D'), flat('E'), sharp('F'), n('G'), n('A'), flat('B'), n('C', 1)],
    primaryAjnas: [
      {
        id: 'nikriz_c__jins_nikriz_c',
        name: 'Jins Nikriz on C',
        root: { letter: 'C', accidental: 'n' },
        intervalsInCents: [0, 200, 300, 600, 700],
      },
      {
        id: 'nikriz_c__jins_nahawand_g',
        name: 'Jins Nahawand on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 300, 500],
      },
    ],
  },
  {
    id: 'ajam_bb',
    name: 'Ajam on B♭',
    transliteration: 'Maqam Ajam',
    tonic: { letter: 'B', accidental: 'b' },
    description:
      'The major scale, by another name and another route. Its two ajnas are identical, which is exactly what makes it sound settled.',
    repeatsAtOctave: true,
    scaleDegrees: [
      flat('B'),
      n('C', 1),
      n('D', 1),
      flat('E', 1),
      n('F', 1),
      n('G', 1),
      n('A', 1),
      flat('B', 1),
    ],
    primaryAjnas: [
      {
        id: 'ajam_bb__jins_ajam_bb',
        name: 'Jins Ajam on B♭',
        root: { letter: 'B', accidental: 'b' },
        intervalsInCents: [0, 200, 400, 500],
      },
      {
        id: 'ajam_bb__jins_ajam_f',
        name: 'Jins Ajam on F',
        root: { letter: 'F', accidental: 'n' },
        intervalsInCents: [0, 200, 400, 500],
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
