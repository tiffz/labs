import {
  MAQAM_ACCIDENTALS,
  accidentalFor,
  pitchClassOf,
  semitoneShiftOf,
  spellingAriaLabel,
  spellingLabel,
} from '../notation/maqamAccidentals';
import {
  deriveDetuneMatrix,
  scalePitchClasses,
  type DetuneMatrix,
  type MaqamPreset,
  type MaqamScaleDegree,
} from '../data/maqamPresets';

/**
 * Whether a key belongs to the maqam. Membership only — deliberately binary.
 *
 * It used to be four values that conflated three unrelated facts (membership,
 * tonic, retuning) into one fill colour, which made "in the maqam" mean three
 * different things depending on which colour won. Each fact now owns its own
 * visual channel: fill for membership, a dot for the tonic, an amber mark for
 * retuning. A key can be all three at once — Sikah's E½♭ is — and each stays
 * readable.
 */
export type KeyRole = 'in-scale' | 'outside';

export interface KeyTuning {
  pitchClass: number;
  role: KeyRole;
  /**
   * Whether this key is the maqam's home note. Drawn as degree 1 in a filled
   * chip — the same channel as every other degree, one step louder, rather
   * than a separate dot saying a thing the numeral already says.
   */
  isTonic: boolean;
  /**
   * Where this key falls in the maqam, counting the tonic as 1. Absent for a
   * key the maqam does not use.
   *
   * This is what membership is drawn with, and it is drawn POSITIVELY on
   * purpose. Three earlier models tinted or faded keys *relative* to each
   * other, which says nothing on Rast: every white key is in Rast, so a
   * relative mark had nothing to contrast against and the board looked
   * unmarked. The user reported "the highlighting is broken" four times, and
   * every time it was working exactly as built. A numeral on the key is true
   * whether the maqam uses seven white keys or three.
   */
  degree?: number;
  /** Whether this key is bent off the 12-TET grid. Drawn as an amber mark. */
  isRetuned: boolean;
  /** Cents this key is bent by. 0 for every key in equal temperament. */
  cents: number;
  /** How the maqam writes this key, e.g. `E½♭`. Absent for keys outside it. */
  label?: string;
  /** Spoken description for assistive tech. */
  ariaLabel: string;
}

/**
 * Whether the live tuning still matches the preset it started from. Tracked
 * rather than remembered: a flag set when the user edits the matrix would
 * survive an edit that puts every slot back where it started, and the UI would
 * keep claiming "Custom" for a tuning identical to Rast.
 */
export function matrixMatchesPreset(matrix: DetuneMatrix, preset: MaqamPreset): boolean {
  const derived = deriveDetuneMatrix(preset.scaleDegrees).matrix;
  return derived.every((cents, pitchClass) => cents === matrix[pitchClass]);
}

/**
 * Per-key tuning for the whole 12-key octave: what each key sounds, how the
 * maqam spells it, and whether it belongs to the maqam at all.
 *
 * `matrix` is passed separately from `preset` on purpose — once the user edits
 * the detune matrix the two disagree, and the keyboard must colour from what
 * will actually sound, not from what the preset wanted.
 */
export function buildKeyTunings(
  preset: MaqamPreset | undefined,
  matrix: DetuneMatrix,
): KeyTuning[] {
  const spellingByPitchClass = new Map<number, MaqamScaleDegree>();
  const degreeByPitchClass = new Map<number, number>();
  if (preset) {
    preset.scaleDegrees.forEach((degree, index) => {
      // First spelling wins, so an octave-repeated tonic does not overwrite the
      // one the maqam opens on — and the home key reads 1, not 8.
      if (!spellingByPitchClass.has(pitchClassOf(degree))) {
        spellingByPitchClass.set(pitchClassOf(degree), degree);
        degreeByPitchClass.set(pitchClassOf(degree), index + 1);
      }
    });
  }
  const tonicPitchClass = preset ? pitchClassOf(preset.tonic) : null;

  return Array.from({ length: 12 }, (_, pitchClass) => {
    const cents = matrix[pitchClass] ?? 0;
    const degree = spellingByPitchClass.get(pitchClass);
    const inScale = degree !== undefined;
    const bent = cents !== 0;

    const isTonic = inScale && pitchClass === tonicPitchClass;
    const role: KeyRole = inScale ? 'in-scale' : 'outside';

    /*
     * Spell the key from the LIVE tuning, not the preset's own spelling.
     *
     * The colour already followed the matrix; the label did not. So un-bending
     * Rast's E left a key announcing itself as "E half-flat" while sounding E
     * natural — the app teaching a wrong interval off a screen that looks
     * authoritative. Letter comes from the maqam (E half-flat and F
     * three-quarter-flat sound alike but are different notes); the accidental
     * comes from what the key will actually play.
     */
    const liveSpelling = degree
      ? {
          letter: degree.letter,
          accidental: accidentalFor(semitoneShiftOf(degree), cents) ?? degree.accidental,
        }
      : undefined;

    const label = liveSpelling ? spellingLabel(liveSpelling) : bentLabel(pitchClass, cents);
    // Screen readers get the accidental spelled out — "E half-flat", not the
    // "E½♭" that a speech engine reads as "E one slash two flat" or skips.
    // The name only. `describeKey` appends the bend, so folding it in here too
    // made a hand-bent key announce it twice: "C sharp 50 cents flat, outside
    // the maqam, tuned 50 cents flat".
    const spokenName = liveSpelling
      ? spellingAriaLabel(liveSpelling)
      : bentSpokenName(pitchClass, cents);

    return {
      pitchClass,
      role,
      isTonic,
      degree: degreeByPitchClass.get(pitchClass),
      isRetuned: bent,
      cents,
      label,
      ariaLabel: describeKey(
        spokenName,
        role,
        cents,
        isTonic,
        bent,
        degreeByPitchClass.get(pitchClass),
      ),
    };
  });
}

/** The only bend the app can produce: one quarter tone down. */
const QUARTER_TONE_DOWN = -50;

const PITCH_CLASS_LETTERS = [
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
];

/**
 * A key bent by the user but not named by any maqam degree — the custom-matrix
 * case.
 *
 * NAMED AS A NOTE, NOT AS A NUMBER.
 *
 * This used to return `"B \u2212 50"`, and the keyboard appends the octave to
 * whatever it is given, so the keycap read **`B \u2212503`**: a letter, a minus
 * sign and two unrelated numbers run together. It was reported as impossible to
 * read, and that is fair — it is not so much wrong as unparseable. Every other
 * key on the board says `E\u266d3`, so this one should say `B\u00bd\u266d3`.
 *
 * A bend is always exactly \u221250 cents. The lever bank toggles between 0 and
 * \u221250 (`toggleDetuneSlot`) and the URL encodes only `-` or `d`
 * (`decodeTuning`), so no other value can reach here from anywhere in the app.
 *
 * Which note that lands on depends on the key. Down a quarter tone from a WHITE
 * key is that letter's half-flat: B becomes B\u00bd\u266d. Down a quarter tone
 * from a BLACK key lands a quarter tone above the natural below it, so C\u266f
 * becomes C\u00bd\u266f \u2014 not C\u266f\u00bd\u266d, which names the
 * same pitch twice over.
 */
function bentLabel(pitchClass: number, cents: number): string | undefined {
  if (cents === 0) return undefined;
  const letter = PITCH_CLASS_LETTERS[pitchClass];
  if (letter === undefined) return undefined;
  const isBlackKey = letter.length > 1;

  if (cents === QUARTER_TONE_DOWN) {
    return isBlackKey
      ? `${letter[0]}${MAQAM_ACCIDENTALS['+'].symbol}`
      : `${letter}${MAQAM_ACCIDENTALS.d.symbol}`;
  }

  /*
   * Unreachable today, and deliberately not guessed at. A bend this function
   * cannot spell gets the plain letter rather than an invented accidental or a
   * bare cents figure; the key is still tinted as retuned, and the spoken
   * label below still carries the exact amount, so nothing is lost but the
   * pretence of precision on a 24px keycap.
   */
  return letter;
}

/*
 * `KeyTuning.badge` and the two functions behind it were deleted here.
 *
 * The shared keyboard does support a `badge` on a keycap, and this app used to
 * pass one — but it was retired when the accidental was folded into the printed
 * name (`MaqamKeyboard` says why: the chip had to live in the strip of white key
 * no black key covers, which is 80px at full desktop and 44px on a laptop, so it
 * was sliced in half at 1366x768). The field stayed behind and was computed for
 * twelve keys on every render, reaching nothing.
 *
 * It is worth naming what it cost. The dead branch of `badgeForCents` fell back
 * to a raw cents figure, and its comment — "prefer the maqam's own symbol so a
 * half-flat reads ½♭ rather than -50" — described a fix that `bentLabel` never
 * got. So the one place a cents figure could still reach the screen was the one
 * place nobody had looked, and it printed `B \u2212503`.
 */

/** Spoken name for a key the maqam does not name — the hand-bent case. */
function bentSpokenName(pitchClass: number, cents: number): string | undefined {
  if (cents === 0) return undefined;
  return PITCH_CLASS_LETTERS[pitchClass];
}

/**
 * The maqam's scale, read back in degree order, spelled as it is tuned RIGHT
 * NOW rather than as the preset wrote it.
 *
 * `scaleDegreeLabels` reads the preset, which is correct until someone bends a
 * key: the board would then show an amber E natural while the line above it
 * still said E half-flat. Same invariant as the staff and the keyboard — one
 * matrix, one answer.
 */
export function liveScaleLabels(
  preset: MaqamPreset | undefined,
  tunings: KeyTuning[],
): string[] {
  if (!preset) return [];
  return preset.scaleDegrees.map((degree) => {
    const tuning = tunings[pitchClassOf(degree)];
    return tuning?.label ?? spellingLabel(degree);
  });
}

/**
 * Spelled out, because this string is read aloud as well as shown.
 *
 * It used to render "−50c" with a real minus sign, which a screen reader says
 * as "minus fifty c" — and "c" is not an abbreviation for cents anywhere. The
 * app also spelled the same unit three ways on one screen ("400¢" in the help
 * dialog, "350 cents" in the ajnas panel, "−50c" here), so one quantity looked
 * like three different units to a reader still learning what a cent is.
 */
/**
 * What the user has done to the tuning, and what it now spells.
 *
 * Bending a note the maqam does NOT use is preparing, not altering: the maqam
 * is untouched, and those keys are the vocabulary a player reaches for.
 * maqamworld on Suznak, the commonest modulation of Rast: the move to Jins
 * Hijaz on the 5th degree is "practically obligatory in any taqsim or mawwal
 * starting on the root Jins Rast". Calling that "custom tuning" is wrong —
 * nothing about the maqam has changed.
 *
 * Bending a note the maqam DOES use is altering, and often lands on something
 * with a name. Un-bend Rast's 7th and the keys spell Maqam Mahur, in Rast's
 * own family. So the app names the result where it can, rather than reporting
 * an error: the disclaimer becomes a discovery.
 */
export type TuningStatus =
  | { kind: 'preset' }
  | { kind: 'prepared'; bentOutside: number[] }
  | { kind: 'spells'; presetId: string; name: string }
  | { kind: 'unnamed' };

function sameMatrix(a: DetuneMatrix, b: DetuneMatrix): boolean {
  return a.length === b.length && a.every((cents, index) => cents === b[index]);
}

export function describeTuning(
  preset: MaqamPreset | undefined,
  matrix: DetuneMatrix,
  catalogue: readonly MaqamPreset[],
): TuningStatus {
  if (!preset) return { kind: 'unnamed' };
  if (matrixMatchesPreset(matrix, preset)) return { kind: 'preset' };

  const own = deriveDetuneMatrix(preset.scaleDegrees).matrix;
  const inScale = scalePitchClasses(preset.scaleDegrees);

  // Has any degree the maqam actually uses been changed?
  const alteredDegree = [...inScale].some((pitchClass) => matrix[pitchClass] !== own[pitchClass]);
  if (!alteredDegree) {
    const bentOutside = matrix
      .map((cents, pitchClass) => ({ cents, pitchClass }))
      .filter(({ cents, pitchClass }) => cents !== 0 && !inScale.has(pitchClass))
      .map(({ pitchClass }) => pitchClass);
    return { kind: 'prepared', bentOutside };
  }

  // It spells something else. Name it if we know it.
  const match = catalogue.find(
    (candidate) =>
      candidate.id !== preset.id &&
      sameMatrix(matrix, deriveDetuneMatrix(candidate.scaleDegrees).matrix),
  );
  return match
    ? { kind: 'spells', presetId: match.id, name: match.transliteration }
    : { kind: 'unnamed' };
}

export function formatCents(cents: number): string {
  // A quantity, always — never a phrase like "in equal temperament". Callers
  // put this inside a sentence, and a fragment that reads as a whole clause is
  // the shape that produces "tuned in equal temperament".
  if (cents === 0) return '0 cents';
  return `${Math.abs(cents)} cents ${cents > 0 ? 'sharp' : 'flat'}`;
}

/**
 * Spoken description, assembled from the same independent facts the visuals
 * use — so a screen reader hears exactly what a sighted user sees, rather than
 * a separate hierarchy of its own.
 */
function describeKey(
  label: string | undefined,
  role: KeyRole,
  cents: number,
  isTonic: boolean,
  isRetuned: boolean,
  degree?: number,
): string {
  const name = label ?? 'key';
  if (role === 'outside' && !isRetuned) return `${name}, outside the maqam`;

  // The numeral on the keycap is `aria-hidden`, so the degree has to be spoken
  // here or a screen-reader user loses the one mark membership is drawn with.
  const parts = [
    role === 'in-scale'
      ? degree
        ? `degree ${degree} of the maqam`
        : 'in the maqam'
      : 'outside the maqam',
  ];
  if (isTonic) parts.push('home note');
  if (isRetuned) parts.push(`tuned ${formatCents(cents)}`);
  return `${name}, ${parts.join(', ')}`;
}

/** Toggle one slot between equal temperament and a half-flat. */
export function toggleDetuneSlot(matrix: DetuneMatrix, pitchClass: number): DetuneMatrix {
  const next = [...matrix];
  next[pitchClass] = next[pitchClass] === 0 ? -50 : 0;
  return next;
}

/** Which slots are bent, for the "n keys retuned" summary. */
export function bentPitchClasses(matrix: DetuneMatrix): number[] {
  return matrix.reduce<number[]>((acc, cents, pitchClass) => {
    if (cents !== 0) acc.push(pitchClass);
    return acc;
  }, []);
}
