import {
  MAQAM_ACCIDENTALS,
  pitchClassOf,
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

/** How a piano key relates to the maqam currently loaded. */
export type KeyRole = 'tonic' | 'microtonal' | 'scale' | 'outside';

export interface KeyTuning {
  pitchClass: number;
  role: KeyRole;
  /**
   * Whether this key is the maqam's home note.
   *
   * Orthogonal to `role`, not a fourth value of it. Sikah's tonic is E½♭ — both
   * home *and* retuned — and when these were one field the retuned tier won, so
   * Sikah rendered with no home key at all. The maqam whose whole point is a
   * microtonal tonic was the one that hid it.
   */
  isTonic: boolean;
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
    const role: KeyRole = bent
      ? 'microtonal'
      : isTonic
        ? 'tonic'
        : inScale
          ? 'scale'
          : 'outside';

    const label = degree ? spellingLabel(degree) : bentLabel(pitchClass, cents);
    const badge = bent ? badgeForCents(cents, degree?.accidental) : undefined;
    // Screen readers get the accidental spelled out — "E half-flat", not the
    // "E½♭" that a speech engine reads as "E one slash two flat" or skips.
    const spokenName = degree ? spellingAriaLabel(degree) : bentLabel(pitchClass, cents);

    return {
      pitchClass,
      role,
      isTonic,
      cents,
      label,
      badge,
      ariaLabel: describeKey(spokenName, role, cents, isTonic),
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

export function formatCents(cents: number): string {
  if (cents === 0) return '0c';
  return `${cents > 0 ? '+' : '−'}${Math.abs(cents)}c`;
}

function describeKey(
  label: string | undefined,
  role: KeyRole,
  cents: number,
  isTonic: boolean,
): string {
  const name = label ?? 'key';
  // "home note" is announced alongside the tuning, not instead of it, so a
  // microtonal tonic reads as both.
  const home = isTonic ? ', home note' : '';
  switch (role) {
    case 'tonic':
      return `${name}, home note`;
    case 'microtonal':
      return `${name}, tuned ${formatCents(cents)}${home}`;
    case 'scale':
      return `${name}, in the maqam`;
    case 'outside':
      return `${name}, outside the maqam`;
  }
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
