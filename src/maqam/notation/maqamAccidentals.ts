/**
 * The single table that binds an accidental's THREE facts together: how far it
 * bends the pitch (cents), which 12-TET key it lands on (semitone shift), and
 * which glyph VexFlow draws for it.
 *
 * These three drifted apart in the original spec for this app, which asked for
 * VexFlow's `'db'` as the half-flat. `'db'` is the *three-quarter-tone* flat
 * (`accidentalThreeQuarterTonesFlatZimmermann`, vexflow 5.0.0 `Tables.accidentals`)
 * — 150 cents down, while the audio engine detuned by 50. Every E½♭ in the app
 * would have been drawn a full quarter-tone from the note you heard, on the one
 * glyph this app exists to teach.
 *
 * So the three facts live in one record, and `maqamAccidentals.test.ts` asserts
 * the arithmetic relating them. An accidental added with an inconsistent trio
 * fails that test instead of shipping a wrong glyph.
 */

/** VexFlow accidental codes, verified against vexflow 5.0.0 `Tables.accidentals`. */
export type MaqamAccidentalCode = 'n' | 'b' | '#' | 'd' | '+' | 'db' | '++';

export type MaqamLetter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

export interface MaqamAccidental {
  /** VexFlow `Accidental` code — the glyph drawn on the staff. */
  code: MaqamAccidentalCode;
  /** Total bend from the natural letter, in cents. */
  cents: number;
  /** Which 12-TET key the note is played on, relative to the natural letter. */
  semitoneShift: number;
  /**
   * Residual bend applied to that key, in cents. Always
   * `cents - 100 * semitoneShift`; this is what reaches `OscillatorNode.detune`.
   */
  microtonalCents: number;
  /** Screen-reader and tooltip name. */
  label: string;
  /** Compact badge for keycaps and chips. */
  symbol: string;
  /** True when the note cannot be played by an untouched 12-TET key. */
  isMicrotonal: boolean;
}

export const MAQAM_ACCIDENTALS: Record<MaqamAccidentalCode, MaqamAccidental> = {
  n: {
    code: 'n',
    cents: 0,
    semitoneShift: 0,
    microtonalCents: 0,
    label: 'natural',
    symbol: '♮',
    isMicrotonal: false,
  },
  b: {
    code: 'b',
    cents: -100,
    semitoneShift: -1,
    microtonalCents: 0,
    label: 'flat',
    symbol: '♭',
    isMicrotonal: false,
  },
  '#': {
    code: '#',
    cents: 100,
    semitoneShift: 1,
    microtonalCents: 0,
    label: 'sharp',
    symbol: '♯',
    isMicrotonal: false,
  },
  d: {
    code: 'd',
    cents: -50,
    semitoneShift: 0,
    microtonalCents: -50,
    label: 'half-flat',
    symbol: '½♭',
    isMicrotonal: true,
  },
  '+': {
    code: '+',
    cents: 50,
    semitoneShift: 0,
    microtonalCents: 50,
    label: 'half-sharp',
    symbol: '½♯',
    isMicrotonal: true,
  },
  db: {
    code: 'db',
    cents: -150,
    semitoneShift: -1,
    microtonalCents: -50,
    label: 'three-quarter-flat',
    symbol: '¾♭',
    isMicrotonal: true,
  },
  '++': {
    code: '++',
    cents: 150,
    semitoneShift: 1,
    microtonalCents: 50,
    label: 'three-quarter-sharp',
    symbol: '¾♯',
    isMicrotonal: true,
  },
};

/** Natural letters and the 12-TET semitone each sits on, relative to C. */
export const NATURAL_LETTER_SEMITONES: Record<MaqamLetter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export const MAQAM_LETTERS: MaqamLetter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/**
 * A note as written: a letter plus an accidental. This spelling — not a bare
 * pitch class — is what both the staff and the keyboard need, because E
 * half-flat and F three-quarter-flat sound the same but are different notes.
 */
export interface MaqamNoteSpelling {
  letter: MaqamLetter;
  accidental: MaqamAccidentalCode;
}

/** Semitones above C4=0 this spelling lands on, before octave wrapping. */
function unwrappedSemitone(spelling: MaqamNoteSpelling): number {
  return (
    NATURAL_LETTER_SEMITONES[spelling.letter] +
    MAQAM_ACCIDENTALS[spelling.accidental].semitoneShift
  );
}

/** The 12-TET pitch class (0-11) whose key this spelling is played on. */
export function pitchClassOf(spelling: MaqamNoteSpelling): number {
  const shifted = unwrappedSemitone(spelling);
  return ((shifted % 12) + 12) % 12;
}

/** Cents this spelling bends its key by. Zero for every 12-TET spelling. */
export function microtonalCentsOf(spelling: MaqamNoteSpelling): number {
  return MAQAM_ACCIDENTALS[spelling.accidental].microtonalCents;
}

/**
 * Whether the spelling sounds in a different octave from the one its letter is
 * written in. `Cb` sits on pitch class 11 — a B — so a `Cb` written in octave 4
 * sounds in octave 3. No maqam spelling in this app does this today, but the
 * octave arithmetic must not quietly get it wrong if one is added.
 */
export function octaveCarryOf(spelling: MaqamNoteSpelling): number {
  return Math.floor(unwrappedSemitone(spelling) / 12);
}

/** MIDI note number for a spelling written in the given octave (C4 = 60). */
export function midiNoteOf(spelling: MaqamNoteSpelling, writtenOctave: number): number {
  return (writtenOctave + 1) * 12 + unwrappedSemitone(spelling);
}

/** Display name, e.g. `E½♭`, `B♭`, `C`. */
export function spellingLabel(spelling: MaqamNoteSpelling): string {
  if (spelling.accidental === 'n') return spelling.letter;
  return `${spelling.letter}${MAQAM_ACCIDENTALS[spelling.accidental].symbol}`;
}

/** Spoken name for screen readers, e.g. "E half-flat". */
export function spellingAriaLabel(spelling: MaqamNoteSpelling): string {
  if (spelling.accidental === 'n') return spelling.letter;
  return `${spelling.letter} ${MAQAM_ACCIDENTALS[spelling.accidental].label}`;
}

/**
 * VexFlow key string, e.g. `e/4`. VexFlow takes the letter and octave here and
 * the accidental as a separate `Accidental` modifier, so this deliberately drops
 * the accidental rather than folding it into the key.
 */
export function vexflowKey(spelling: MaqamNoteSpelling, writtenOctave: number): string {
  return `${spelling.letter.toLowerCase()}/${writtenOctave}`;
}
