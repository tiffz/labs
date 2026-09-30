import { MAQAM_PRESETS } from './maqamCatalogue';
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
  /**
   * Where this cell's size and intervals were checked. Required, because the
   * app teaches theory off a screen that looks authoritative and the first
   * version of this data was wrong in a way nobody could audit: every root
   * jins that is a 5-note pentachord was authored as a 4-note tetrachord.
   */
  source: string;
  /**
   * Other cells that can sit in this position.
   *
   * maqamworld writes these with "either ... or": Maqam Rast is "followed on
   * the 5th degree by either Jins Upper Rast ... or Jins Nahawand", and Maqam
   * 'Ajam the same. Listing one and dropping the other implies a maqam has a
   * single settled decomposition, which is not what the source says.
   *
   * They are alternatives, not additional cells, so they do not take part in
   * the scale or the joins — only in what the panel offers.
   */
  alternatives?: Omit<Jins, 'alternatives'>[];
  /**
   * The jins this one is a variation of, bare — "Rast", not "Jins Rast on C".
   *
   * Only for families. maqamworld classifies maqamat "based on sharing the
   * same first (root) jins", and the Rast family page says it "is made of
   * maqamat that start with Jins Rast" — yet it lists Maqam Sazkar, whose root
   * is Jins Sazkar. That is not an inconsistency in the source: Jins Sazkar is
   * described there as "a variation of Jins Rast with a raised 2nd", so a
   * maqam starting on it does start with Jins Rast, in the sense the family
   * means.
   *
   * Without this, deriving the family from the root jins NAME puts Sazkar in a
   * family of its own, which the source does not have. With it, the family is
   * still derived rather than authored — `maqamFamily` resolves through this
   * link — so a maqam still files itself and a family still cannot disagree
   * with its cell.
   */
  variationOf?: string;
}

export interface MaqamPreset {
  id: string;
  /** Short name used in the picker, e.g. "Rast on C". */
  name: string;
  /** Transliterated Arabic name, e.g. "Maqam Rast". */
  transliteration: string;
  /*
   * There is no `arabicName`.
   *
   * It was shown beside the transliteration and is gone at the owner's
   * request, on a standing rule worth keeping: this app does not display what
   * its author cannot check. Every other claim here — an interval, a cell
   * size, a join — can be verified against the `source` URL by someone who
   * reads English. A name in a script you cannot read cannot, so it was the
   * one thing on screen taken purely on trust.
   *
   * The data is not lost, only unshipped: every preset carries its maqamworld
   * page in `source`, and that page has the Arabic.
   */
  /** The tonic, as written. */
  tonic: MaqamNoteSpelling;
  description: string;
  /**
   * This maqam's page on maqamworld.com, shown in the app as a credit and a
   * way for a reader to check anything the app claims.
   */
  source: string;
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

/**
 * The family a maqam belongs to, derived from its root jins.
 *
 * maqamworld.com: "Maqamat are classified into families based on sharing the
 * same first (root) jins. The root jins plays the largest role in defining the
 * maqam's character."
 *
 * So the family is not a field to author and keep in step. It is a reading of
 * the root jins, which means a new maqam files itself, and a family can never
 * disagree with the cell it is named for. Given "Jins Rast on C" this is
 * "Rast"; given "Jins Upper Rast on G" it would be "Upper Rast", which is why
 * only the ROOT jins is consulted.
 *
 * A root jins that declares itself a `variationOf` another resolves to that
 * one. Maqam Sazkar is the case: its root is Jins Sazkar, which maqamworld
 * calls "a variation of Jins Rast with a raised 2nd", and it lists the maqam
 * in the Rast family. Reading the name alone gave it a family of its own.
 */
export function maqamFamily(preset: MaqamPreset): string {
  const root = preset.primaryAjnas[0];
  if (!root) return 'Other';
  if (root.variationOf) return root.variationOf;
  // "Jins Nahawand on C" -> "Nahawand".
  const withoutPrefix = root.name.replace(/^Jins\s+/, '');
  const withoutRoot = withoutPrefix.replace(/\s+on\s+.+$/, '');
  return withoutRoot.trim() || 'Other';
}

/** Every family present, and the maqamat in each, for a two-tier picker. */
export function maqamatByFamily(
  presets: readonly MaqamPreset[] = MAQAM_PRESETS,
): { family: string; maqamat: MaqamPreset[] }[] {
  const families = new Map<string, MaqamPreset[]>();
  for (const preset of presets) {
    const family = maqamFamily(preset);
    const members = families.get(family) ?? [];
    members.push(preset);
    families.set(family, members);
  }
  return [...families.entries()]
    .map(([family, maqamat]) => ({ family, maqamat }))
    .sort((a, b) => a.family.localeCompare(b.family));
}

/** Scale index a spelling sits at, or -1. */
function degreeIndexOf(preset: MaqamPreset, spelling: MaqamNoteSpelling): number {
  return preset.scaleDegrees.findIndex(
    (degree) => degree.letter === spelling.letter && degree.accidental === spelling.accidental,
  );
}

/**
 * How a maqam's two cells meet.
 *
 * Derived, never asserted. The panel used to print "Joined on G, where the
 * first cell ends and the second begins" for every maqam, directly under the
 * intervals that disprove it: Rast's lower jins is 0-200-350-500, which is
 * C D E½♭ F, so it ends on F and the upper jins starts a whole tone above on
 * G. Deriving it matters more than the answer: when the cell sizes were later
 * corrected against maqamworld.com, every maqam here turned out to be
 * conjunct, and the panel, the ghammaz and the melody patterns all corrected
 * themselves with no prose to chase.
 *
 * Separately, the ghammaz here is read from the upper jins's root rather than
 * guessed from the lower jins's note count. The guess was right only for the
 * conjunct maqamat, so in Rast the "jins by jins" pattern rested twice on F,
 * a note neither cell is rooted on.
 */
export interface AjnasJoin {
  /** Scale index the lower cell ends on. */
  lowerTopIndex: number;
  /** Scale index the upper cell is rooted on. This is the ghammaz. */
  ghammazIndex: number;
  /** True when one degree belongs to both cells. */
  shared: boolean;
}

/** `undefined` for a maqam with a single settled jins, which has no join. */
function joinBetween(
  preset: MaqamPreset,
  lower: Jins,
  upper: Jins,
): AjnasJoin | undefined {
  const lowerRootIndex = degreeIndexOf(preset, lower.root);
  const ghammazIndex = degreeIndexOf(preset, upper.root);
  if (lowerRootIndex < 0 || ghammazIndex < 0) return undefined;

  const lowerTopIndex = lowerRootIndex + lower.intervalsInCents.length - 1;
  return { lowerTopIndex, ghammazIndex, shared: lowerTopIndex === ghammazIndex };
}

/**
 * Every seam, not just the first.
 *
 * A maqam is not limited to two cells — maqamworld draws three over Maqam
 * Rast, the third covering the descending form — and this used to read
 * `primaryAjnas[0]` and `[1]` and ignore anything after. A third cell was
 * stored, listed in the panel, and then silently left out of every sentence
 * about how the cells meet.
 */
export function ajnasJoins(preset: MaqamPreset): AjnasJoin[] {
  const joins: AjnasJoin[] = [];
  for (let i = 0; i + 1 < preset.primaryAjnas.length; i += 1) {
    const join = joinBetween(preset, preset.primaryAjnas[i], preset.primaryAjnas[i + 1]);
    if (join) joins.push(join);
  }
  return joins;
}

/**
 * The maqam's own ghammaz: the seam between the first two cells.
 *
 * `undefined` for a maqam with a single settled jins, which has no join.
 */
export function ajnasJoin(preset: MaqamPreset): AjnasJoin | undefined {
  return ajnasJoins(preset)[0];
}

/** Which scale degrees each cell covers, for the brackets drawn over the staff. */
export interface AjnasSpan {
  id: string;
  name: string;
  /** Scale index of the cell's root. */
  fromIndex: number;
  /** Scale index of its top note. */
  toIndex: number;
}

/**
 * Where each jins sits in the written scale.
 *
 * Derived from the cell's root and its own interval count, like every other
 * fact about the seam — so a cell corrected from a tetrachord to a pentachord
 * moves its bracket without anyone editing a second number. A cell rooted on a
 * degree the scale does not contain (a descending-form cell, say) is left out
 * rather than drawn at index 0, which is what `findIndex` returning -1 would
 * otherwise produce: a bracket starting at the tonic for no reason.
 */
export function ajnasSpans(preset: MaqamPreset): AjnasSpan[] {
  const lastIndex = preset.scaleDegrees.length - 1;
  return preset.primaryAjnas.flatMap((jins) => {
    const fromIndex = degreeIndexOf(preset, jins.root);
    if (fromIndex < 0) return [];
    const toIndex = Math.min(fromIndex + jins.intervalsInCents.length - 1, lastIndex);
    if (toIndex <= fromIndex) return [];
    return [{ id: jins.id, name: jins.name, fromIndex, toIndex }];
  });
}

/**
 * The degree a maqam's phrases rest on, as a scale index.
 *
 * For a two-jins maqam that is the upper cell's root. Saba has one settled
 * jins, so its phrases rest on the top of that cell instead.
 */
export function ghammazDegreeIndex(preset: MaqamPreset): number {
  const join = ajnasJoin(preset);
  if (join) return join.ghammazIndex;
  const cellLength = preset.primaryAjnas[0]?.intervalsInCents.length ?? 4;
  const lastIndex = preset.scaleDegrees.length - 1;
  return Math.min(Math.max(cellLength - 1, 1), lastIndex);
}

/** How a maqam's written spelling reads back, e.g. "C D E½♭ F G A B½♭ C". */
export function scaleDegreeLabels(degrees: MaqamScaleDegree[]): string[] {
  return degrees.map((degree) => spellingLabel(degree));
}

/** True when any degree of the maqam leaves 12-TET. */
export function hasMicrotones(degrees: MaqamScaleDegree[]): boolean {
  return degrees.some((degree) => MAQAM_ACCIDENTALS[degree.accidental].isMicrotonal);
}

export { MAQAM_PRESETS } from './maqamCatalogue';

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
