/**
 * Natural word rhythm templates.
 *
 * Maps stress patterns (from CMU dictionary or heuristics) to ideal duration
 * patterns in sixteenths. Used by the "Natural Word Rhythm" rule during the
 * propose/reconcile layout phase.
 *
 * Stress encoding: 1 = primary stress, 2 = secondary stress, 0 = unstressed.
 * Duration encoding: values in sixteenths (1 = sixteenth, 2 = eighth, 3 = dotted eighth, 4 = quarter).
 *
 * These patterns are derived from how rhythmic mnemonics naturally map words
 * to drum patterns (e.g. "coconut" = three even eighths, "watermelon" = four
 * sixteenths, "apple" = eighth + sixteenth or two eighths).
 */

export interface WordShapeTemplate {
  /** Human-readable description of the rhythm feel. */
  label: string;
  /** Duration of each syllable in sixteenths. */
  durations: number[];
  /** Total time in sixteenths. */
  totalSixteenths: number;
}

/**
 * Canonical stress pattern key: stress values joined by '-', e.g. "1-0" for
 * a trochee (stressed-unstressed) like "apple".
 */
type StressKey = string;

function stressKey(pattern: number[]): StressKey {
  return pattern.join('-');
}

// -----------------------------------------------------------------------
// Single-syllable words
// -----------------------------------------------------------------------

const ONE_STRESSED: WordShapeTemplate = {
  label: 'long single',
  durations: [4],
  totalSixteenths: 4,
};

const ONE_UNSTRESSED: WordShapeTemplate = {
  label: 'short single',
  durations: [2],
  totalSixteenths: 2,
};

// -----------------------------------------------------------------------
// Two-syllable words
// -----------------------------------------------------------------------

const TROCHEE: WordShapeTemplate = {
  label: 'trochee (AP-ple)',
  durations: [2, 2],
  totalSixteenths: 4,
};

const IAMB: WordShapeTemplate = {
  label: 'iamb (a-BOVE)',
  durations: [1, 3],
  totalSixteenths: 4,
};

const SPONDEE: WordShapeTemplate = {
  label: 'spondee (HEART-BREAK)',
  durations: [2, 2],
  totalSixteenths: 4,
};

// -----------------------------------------------------------------------
// Three-syllable words
// -----------------------------------------------------------------------

const DACTYL: WordShapeTemplate = {
  label: 'dactyl (CO-co-nut)',
  durations: [2, 2, 2],
  totalSixteenths: 6,
};

const ANAPEST: WordShapeTemplate = {
  label: 'anapest (un-der-STAND)',
  durations: [1, 1, 4],
  totalSixteenths: 6,
};

const AMPHIBRACH: WordShapeTemplate = {
  label: 'amphibrach (to-MA-to)',
  durations: [1, 3, 2],
  totalSixteenths: 6,
};

const THREE_EVEN: WordShapeTemplate = {
  label: 'triplet-like',
  durations: [2, 2, 2],
  totalSixteenths: 6,
};

// -----------------------------------------------------------------------
// Four-syllable words
// -----------------------------------------------------------------------

const FOUR_FAST: WordShapeTemplate = {
  label: 'four sixteenths (WA-ter-me-lon)',
  durations: [1, 1, 1, 1],
  totalSixteenths: 4,
};

const FOUR_INITIAL_STRESS: WordShapeTemplate = {
  label: 'stressed-fast (A-vo-ca-do)',
  durations: [2, 1, 1, 2],
  totalSixteenths: 6,
};

const FOUR_PENULT_STRESS: WordShapeTemplate = {
  label: 'penult stress (a-PRI-cot jam)',
  durations: [1, 2, 1, 2],
  totalSixteenths: 6,
};

// -----------------------------------------------------------------------
// Five+ syllable words
// -----------------------------------------------------------------------

const FIVE_FAST: WordShapeTemplate = {
  label: 'five fast',
  durations: [1, 1, 1, 1, 2],
  totalSixteenths: 6,
};

const SIX_FAST: WordShapeTemplate = {
  label: 'six fast',
  durations: [1, 1, 1, 1, 1, 1],
  totalSixteenths: 6,
};

// -----------------------------------------------------------------------
// Lookup by stress pattern
// -----------------------------------------------------------------------

const SHAPE_BY_STRESS = new Map<StressKey, WordShapeTemplate>([
  // 1 syllable
  [stressKey([1]), ONE_STRESSED],
  [stressKey([0]), ONE_UNSTRESSED],

  // 2 syllables
  [stressKey([1, 0]), TROCHEE],
  [stressKey([0, 1]), IAMB],
  [stressKey([1, 1]), SPONDEE],
  [stressKey([1, 2]), TROCHEE],
  [stressKey([2, 1]), IAMB],
  [stressKey([0, 0]), TROCHEE],

  // 3 syllables
  [stressKey([1, 0, 0]), DACTYL],
  [stressKey([0, 0, 1]), ANAPEST],
  [stressKey([0, 1, 0]), AMPHIBRACH],
  [stressKey([1, 0, 2]), DACTYL],
  [stressKey([2, 0, 1]), ANAPEST],
  [stressKey([1, 2, 0]), DACTYL],
  [stressKey([0, 1, 2]), AMPHIBRACH],
  [stressKey([0, 0, 0]), THREE_EVEN],
  [stressKey([1, 1, 0]), DACTYL],
  [stressKey([0, 1, 1]), ANAPEST],
  [stressKey([1, 0, 1]), DACTYL],

  // 4 syllables
  [stressKey([1, 0, 0, 0]), FOUR_FAST],
  [stressKey([1, 0, 2, 0]), FOUR_INITIAL_STRESS],
  [stressKey([0, 1, 0, 0]), FOUR_PENULT_STRESS],
  [stressKey([2, 0, 1, 0]), FOUR_INITIAL_STRESS],
  [stressKey([0, 0, 1, 0]), FOUR_PENULT_STRESS],
  [stressKey([1, 0, 0, 2]), FOUR_FAST],
  [stressKey([0, 0, 0, 1]), FOUR_FAST],
  [stressKey([0, 0, 0, 0]), FOUR_FAST],
]);

/**
 * Look up the ideal word shape for a given stress pattern.
 *
 * Falls back to heuristics when no exact match exists:
 * - Words with 5+ syllables use fast uniform sixteenths
 * - Words with 4 syllables default to four-fast
 * - Unknown 3-syllable patterns use even eighths
 * - Unknown 2-syllable patterns use trochee
 */
export function getWordShape(stressPattern: number[]): WordShapeTemplate {
  const key = stressKey(stressPattern);
  const exact = SHAPE_BY_STRESS.get(key);
  if (exact) return exact;

  const n = stressPattern.length;
  if (n >= 6) return SIX_FAST;
  if (n >= 5) return FIVE_FAST;
  if (n >= 4) return FOUR_FAST;
  if (n >= 3) return THREE_EVEN;
  if (n >= 2) return TROCHEE;
  if (n === 1) return stressPattern[0] > 0 ? ONE_STRESSED : ONE_UNSTRESSED;
  return ONE_UNSTRESSED;
}

/**
 * Rescale a word shape's durations so they fit within a target total sixteenths
 * budget, preserving relative proportions as closely as possible.
 * Returns durations that sum to exactly `targetSixteenths`.
 */
export function fitWordShapeToSlot(
  shape: WordShapeTemplate,
  targetSixteenths: number
): number[] {
  if (shape.totalSixteenths === targetSixteenths) {
    return [...shape.durations];
  }

  const ratio = targetSixteenths / shape.totalSixteenths;
  const scaled = shape.durations.map((d) => Math.max(1, Math.round(d * ratio)));

  let sum = scaled.reduce((a, b) => a + b, 0);
  let attempts = 0;
  while (sum !== targetSixteenths && attempts < 20) {
    attempts += 1;
    if (sum > targetSixteenths) {
      const longest = scaled.indexOf(Math.max(...scaled));
      scaled[longest] = Math.max(1, scaled[longest] - 1);
    } else {
      const shortest = scaled.indexOf(Math.min(...scaled));
      scaled[shortest] = Math.min(4, scaled[shortest] + 1);
    }
    sum = scaled.reduce((a, b) => a + b, 0);
  }

  return scaled;
}
