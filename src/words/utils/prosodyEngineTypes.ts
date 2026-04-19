// Types, constants, and small pure helpers extracted from prosodyEngine.ts.
// This file has zero dependencies on the rest of the prosody engine, which
// means codec/settings-only consumers don't have to import the full module.
//
// See docs/COMPONENT_DECOMPOSITION_PATTERN.md. The bulk of prosodyEngine.ts
// (parseTemplateTimeline, generateWordRhythm, syllable pipeline) remains in
// the original file; moving those requires dedicated review.

export type ProsodySource = 'dictionary' | 'heuristic' | 'unresolved';

export interface WordAnalysis {
  word: string;
  syllables: string[];
  stressPattern: number[];
  source: ProsodySource;
}

export type AlignmentStrength = 'off' | 'light' | 'strong';

// ---------------------------------------------------------------------------
// Legacy v2 mutation IDs — kept for backward compat (codec migration, tests)
// ---------------------------------------------------------------------------

/** @deprecated v2 mutation IDs — use `WordRhythmGenerationSettings` rules instead. */
export const ALL_MUTATION_IDS = [
  'adventurousRhythm',
  'dottedFeel',
  'sixteenthMotion',
  'crossBarTies',
  'midMeasureRests',
  'motifOrnament',
  'lineBreakGaps',
  'avoidIntraWordRests',
] as const;

/** @deprecated v2 mutation ID type. */
export type MutationId = (typeof ALL_MUTATION_IDS)[number];

// ---------------------------------------------------------------------------
// v3 generation settings
// ---------------------------------------------------------------------------

export type PhrasingMode = 'repeat' | 'halfMeasureVariations';
export type LandingNote = 'off' | 'quarter' | 'half' | 'whole';

export interface NoteValueBias {
  sixteenth: number;
  eighth: number;
  dotted: number;
  quarter: number;
}

export const DEFAULT_NOTE_VALUE_BIAS: NoteValueBias = {
  sixteenth: 50,
  eighth: 50,
  dotted: 50,
  quarter: 50,
};

export function alignmentStrengthFactor(strength: AlignmentStrength): number {
  if (strength === 'off') return 0;
  if (strength === 'light') return 0.48;
  return 0.88;
}

export interface SyllableHit {
  word: string;
  syllable: string;
  source: ProsodySource;
  stroke: 'D' | 'T' | 'K' | '_';
  stress: number;
  wordIndex: number;
  syllableIndex: number;
  startSixteenth: number;
  durationSixteenths: number;
  continuationOfPrevious?: boolean;
}

export interface WordRhythmResult {
  notation: string;
  analyses: WordAnalysis[];
  hits: SyllableHit[];
  dictionaryCount: number;
  heuristicCount: number;
  unresolvedCount: number;
}
