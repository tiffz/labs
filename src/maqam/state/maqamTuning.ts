import {
  MAQAM_ACCIDENTALS,
  accidentalFor,
  pitchClassOf,
  semitoneShiftOf,
  spellingAriaLabel,
  spellingLabel,
  type MaqamAccidentalCode,
} from '../notation/maqamAccidentals';
import {
  deriveDetuneMatrix,
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
   * Whether this key is the maqam's home note. Drawn as a dot: shape rather
   * than colour, so it survives a colour-blind reading and stacks with the
   * others.
   */
  isTonic: boolean;
  /** Whether this key is bent off the 12-TET grid. Drawn as an amber mark. */
  isRetuned: boolean;
  /** Cents this key is bent by. 0 for every key in equal temperament. */
  cents: number;
  /** How the maqam writes this key, e.g. `E½♭`. Absent for keys outside it. */
  label?: string;
  /** Badge for a bent key, e.g. `½♭`. Absent when the key is unbent. */
  badge?: string;
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
  if (preset) {
    for (const degree of preset.scaleDegrees) {
      // First spelling wins, so an octave-repeated tonic does not overwrite the
      // one the maqam opens on.
      if (!spellingByPitchClass.has(pitchClassOf(degree))) {
        spellingByPitchClass.set(pitchClassOf(degree), degree);
      }
    }
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
    const badge = bent ? badgeForCents(cents, liveSpelling?.accidental) : undefined;
    // Screen readers get the accidental spelled out — "E half-flat", not the
    // "E½♭" that a speech engine reads as "E one slash two flat" or skips.
    const spokenName = liveSpelling
      ? spellingAriaLabel(liveSpelling)
      : bentLabel(pitchClass, cents);

    return {
      pitchClass,
      role,
      isTonic,
      isRetuned: bent,
      cents,
      label,
      badge,
      ariaLabel: describeKey(spokenName, role, cents, isTonic, bent),
    };
  });
}

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
 * case. Named from the piano key plus its bend, which is all that is known.
 */
function bentLabel(pitchClass: number, cents: number): string | undefined {
  if (cents === 0) return undefined;
  return `${PITCH_CLASS_LETTERS[pitchClass]} ${formatCents(cents)}`;
}

function badgeForCents(cents: number, accidental?: MaqamAccidentalCode): string {
  // Prefer the maqam's own symbol so a half-flat reads ½♭ rather than -50c.
  if (accidental && MAQAM_ACCIDENTALS[accidental].isMicrotonal) {
    return MAQAM_ACCIDENTALS[accidental].symbol;
  }
  return formatCents(cents);
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

export function formatCents(cents: number): string {
  if (cents === 0) return '0c';
  return `${cents > 0 ? '+' : '−'}${Math.abs(cents)}c`;
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
): string {
  const name = label ?? 'key';
  if (role === 'outside' && !isRetuned) return `${name}, outside the maqam`;

  const parts = [role === 'in-scale' ? 'in the maqam' : 'outside the maqam'];
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
