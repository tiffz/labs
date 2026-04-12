/**
 * Subdivision pattern lookup table for the prosody engine.
 *
 * When a template hit is subdivided (rule: "Subdivide Notes"), we replace it
 * with one of these patterns. The first stroke of every pattern preserves the
 * original sound (represented as 'X' in the source patterns and replaced at
 * runtime). Subsequent strokes use standard darbuka ornaments derived from the
 * Common Patterns palette in the drums training app.
 *
 * Patterns are grouped by total duration (in sixteenths). Each entry carries a
 * weight that the engine uses when choosing randomly (higher = more likely).
 */

export type Stroke = 'D' | 'T' | 'K';

export interface SubdivisionPattern {
  /**
   * Array of `[stroke, durationInSixteenths]` pairs.
   * The first stroke is always `'X'` (placeholder for the original).
   */
  hits: Array<[stroke: 'X' | Stroke, duration: number]>;
  /** Relative weight for random selection (higher = more common). */
  weight: number;
}

/**
 * Quarter-note subdivisions (4 sixteenths total).
 * Derived from COMMON_PATTERNS: DKTK, D-K-, D-TK, DKD-, DK-T, D--K.
 */
const QUARTER_SUBDIVISIONS: SubdivisionPattern[] = [
  // X-K- : two eighths (original + ka) — most natural subdivision
  { hits: [['X', 2], ['K', 2]], weight: 45 },
  // X-T- : two eighths (original + tek)
  { hits: [['X', 2], ['T', 2]], weight: 30 },
  // X--K : dotted eighth + sixteenth
  { hits: [['X', 3], ['K', 1]], weight: 20 },
  // X-TK : eighth + two sixteenths
  { hits: [['X', 2], ['T', 1], ['K', 1]], weight: 15 },
  // XKTK : four sixteenths
  { hits: [['X', 1], ['K', 1], ['T', 1], ['K', 1]], weight: 8 },
  // XK-T : sixteenth + dotted eighth (pickup)
  { hits: [['X', 1], ['K', 3]], weight: 6 },
];

/**
 * Dotted-eighth subdivisions (3 sixteenths total).
 */
const DOTTED_EIGHTH_SUBDIVISIONS: SubdivisionPattern[] = [
  // X-K : eighth + sixteenth — most natural
  { hits: [['X', 2], ['K', 1]], weight: 45 },
  // XK- : sixteenth + eighth (pickup feel)
  { hits: [['X', 1], ['K', 2]], weight: 30 },
  // XKT : three sixteenths
  { hits: [['X', 1], ['K', 1], ['T', 1]], weight: 12 },
];

/**
 * Eighth-note subdivisions (2 sixteenths total).
 */
const EIGHTH_SUBDIVISIONS: SubdivisionPattern[] = [
  // XK : two sixteenths
  { hits: [['X', 1], ['K', 1]], weight: 50 },
  // XT : two sixteenths (tak ornament)
  { hits: [['X', 1], ['T', 1]], weight: 30 },
];

/**
 * Map from total duration (in sixteenths) to available subdivision patterns.
 * Durations not in this map cannot be subdivided (e.g. single sixteenth = 1).
 */
export const SUBDIVISION_TABLE: ReadonlyMap<
  number,
  readonly SubdivisionPattern[]
> = new Map([
  [4, QUARTER_SUBDIVISIONS],
  [3, DOTTED_EIGHTH_SUBDIVISIONS],
  [2, EIGHTH_SUBDIVISIONS],
]);

/** Duration categories for a single hit within a pattern. */
function hitDurationCategory(dur: number): 'sixteenth' | 'eighth' | 'dotted' | 'quarter' {
  if (dur <= 1) return 'sixteenth';
  if (dur === 2) return 'eighth';
  if (dur === 3) return 'dotted';
  return 'quarter';
}

/**
 * Note-value bias weights (0-100 per category). Passed through from settings
 * to influence which subdivision patterns are selected.
 */
export interface NoteValueBiasHint {
  sixteenth: number;
  eighth: number;
  dotted: number;
  quarter: number;
}

/**
 * Pick a random subdivision pattern for a given duration, using a seeded
 * random value in [0, 1). Patterns are re-weighted based on `biasHint`:
 * - A value of 0 ("None") hard-filters patterns containing that note value.
 * - Higher values boost pattern weight proportionally.
 * Returns null if the duration has no subdivisions or all are filtered out.
 */
export function pickSubdivision(
  durationSixteenths: number,
  randomValue: number,
  biasHint?: NoteValueBiasHint
): SubdivisionPattern | null {
  const patterns = SUBDIVISION_TABLE.get(durationSixteenths);
  if (!patterns || patterns.length === 0) return null;

  if (!biasHint) {
    const totalWeight = patterns.reduce((sum, p) => sum + p.weight, 0);
    let threshold = randomValue * totalWeight;
    for (const pattern of patterns) {
      threshold -= pattern.weight;
      if (threshold <= 0) return pattern;
    }
    return patterns[patterns.length - 1];
  }

  // Re-weight patterns based on bias: multiply each pattern's weight by a
  // factor derived from the bias values for the note durations it contains.
  const biasMap: Record<string, number> = {
    sixteenth: biasHint.sixteenth,
    eighth: biasHint.eighth,
    dotted: biasHint.dotted,
    quarter: biasHint.quarter,
  };

  const weighted: Array<{ pattern: SubdivisionPattern; adjustedWeight: number }> = [];
  for (const pattern of patterns) {
    const categories = pattern.hits.map(([, dur]) => hitDurationCategory(dur));
    // If any hit produces a note value with bias=0, exclude this pattern
    const blocked = categories.some((cat) => biasMap[cat] === 0);
    if (blocked) continue;

    // Scale weight by average bias of the durations produced
    const avgBias = categories.reduce((s, cat) => s + (biasMap[cat] ?? 50), 0) / categories.length;
    const scaleFactor = avgBias / 50; // 0=excluded above, 50=neutral(1x), 90=1.8x
    weighted.push({ pattern, adjustedWeight: pattern.weight * scaleFactor });
  }

  if (weighted.length === 0) return null;

  const totalWeight = weighted.reduce((s, w) => s + w.adjustedWeight, 0);
  let threshold = randomValue * totalWeight;
  for (const { pattern, adjustedWeight } of weighted) {
    threshold -= adjustedWeight;
    if (threshold <= 0) return pattern;
  }
  return weighted[weighted.length - 1].pattern;
}

/**
 * Resolve 'X' placeholders in a subdivision pattern to the original stroke.
 */
export function resolveSubdivisionStrokes(
  pattern: SubdivisionPattern,
  originalStroke: Stroke
): Array<[stroke: Stroke, duration: number]> {
  return pattern.hits.map(([s, d]) => [
    s === 'X' ? originalStroke : s,
    d,
  ]);
}
