import { dictionary } from 'cmu-pronouncing-dictionary';
import { syllable as estimateSyllables } from 'syllable';
import {
  getSixteenthsPerMeasure,
  getDefaultBeatGrouping,
  getBeatGroupingInSixteenths,
} from '../../shared/rhythm/timeSignatureUtils';
import type { TimeSignature } from '../../shared/rhythm/types';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import { getWordShape, fitWordShapeToSlot } from './wordShapeTemplates';
import { mutateTemplate, applyFreestyle, enforceMinDuration } from './generationPipeline';

export type ProsodySource = 'dictionary' | 'heuristic' | 'unresolved';

export interface WordAnalysis {
  word: string;
  syllables: string[];
  stressPattern: number[];
  source: ProsodySource;
}

export interface WordRhythmResult {
  notation: string;
  analyses: WordAnalysis[];
  hits: SyllableHit[];
  dictionaryCount: number;
  heuristicCount: number;
  unresolvedCount: number;
}

interface GenerateOptions {
  strictDictionaryMode: boolean;
  timeSignature: TimeSignature;
  variationSeed?: number;
  rhythmVariationSeed?: number;
  soundVariationSeed?: number;
  generationSettings?: Partial<WordRhythmGenerationSettings>;
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
  sixteenth: number; // 0–100
  eighth: number; // 0–100
  dotted: number; // 0–100
  quarter: number; // 0–100
}

export interface WordRhythmGenerationSettings {
  // Template mutation rules
  fillRests: boolean;
  subdivideNotes: boolean;
  stretchSyllables: boolean;
  mergeNotes: boolean;
  noteValueBias: NoteValueBias;
  freestyle: boolean;
  freestyleStrength: number; // 0–100

  // Word shaping
  naturalWordRhythm: boolean;
  stressAlignment: AlignmentStrength;
  wordStartAlignment: AlignmentStrength;

  // Phrasing
  phrasing: PhrasingMode;
  landingNote: LandingNote;

  /** Optional global default; per-section template in the app overrides this. */
  templateNotation?: string;

  /**
   * @deprecated v2 mutation flags kept for transitional compat.
   * The new pipeline reads the named boolean rules above instead.
   */
  mutations: Record<MutationId, boolean>;
}

export const DEFAULT_NOTE_VALUE_BIAS: NoteValueBias = {
  sixteenth: 50,
  eighth: 50,
  dotted: 50,
  quarter: 50,
};

export const DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS: WordRhythmGenerationSettings =
  {
    fillRests: false,
    subdivideNotes: false,
    stretchSyllables: false,
    mergeNotes: false,
    noteValueBias: { ...DEFAULT_NOTE_VALUE_BIAS },
    freestyle: true,
    freestyleStrength: 15,

    naturalWordRhythm: true,
    stressAlignment: 'strong',
    wordStartAlignment: 'strong',

    phrasing: 'halfMeasureVariations',
    landingNote: 'off',

    templateNotation: '',

    // Legacy v2 compat — all off so strict template mode is the baseline
    mutations: {
      adventurousRhythm: false,
      dottedFeel: false,
      sixteenthMotion: false,
      crossBarTies: false,
      midMeasureRests: false,
      motifOrnament: false,
      lineBreakGaps: false,
      avoidIntraWordRests: false,
    },
  };

/**
 * True when no rules that loosen the *placement engine* are active.
 * fillRests and subdivideNotes are pre-processing steps that modify the
 * template before placement — the placement engine should still follow the
 * (modified) template literally. Only freestyle breaks placement constraints.
 */
export function noTemplateMutations(
  settings: WordRhythmGenerationSettings
): boolean {
  return !settings.freestyle;
}

export function alignmentStrengthFactor(strength: AlignmentStrength): number {
  if (strength === 'off') return 0;
  if (strength === 'light') return 0.48;
  return 0.88;
}

interface PronunciationAnalysis {
  stressPattern: number[];
  syllableCount: number;
}

const STRESS_PHONEME_REGEX = /\d$/;
const WORD_REGEX = /[A-Za-z'’]+/;
const NUMBER_REGEX = /\d[\d,]*(?:\.\d+)?(?:st|nd|rd|th)?(?:['’]?s)?/i;
const TOKEN_REGEX =
  /\d[\d,]*(?:\.\d+)?(?:st|nd|rd|th)?(?:['’]?s)?|[A-Za-z'’]+|[.,!?;:]/g;
const STRONG_ENDING_REGEX = /(tion|sion|ic|ity|ian|ious|ive|ette|eer|ese)$/i;
const STRICT_SYLLABLE_COUNT_OVERRIDES: Record<string, number> = {
  violet: 2,
  violets: 2,
  hour: 1,
};
const VARIABLE_SPOKEN_SYLLABLE_COUNTS: Record<string, number> = {
  every: 2,
  different: 2,
  favorite: 2,
  favourite: 2,
  comfortable: 3,
};

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

function normalizeWord(rawWord: string): string {
  return rawWord.toLowerCase().replace(/[^a-z'’]/g, '');
}

function splitByVowelGroups(word: string): string[] {
  const displayWord = word.replace(/[^A-Za-z'’]/g, '');
  const collapsedApostrophes = displayWord.replace(/['’]/g, '');
  const normalized = collapsedApostrophes.toLowerCase();
  if (!normalized) return [displayWord || word];
  const vowelGroups = [...normalized.matchAll(/[aeiouy]+/g)];
  if (vowelGroups.length <= 1) return [displayWord || word];

  const groups = [...vowelGroups];
  const last = groups[groups.length - 1];
  if (
    groups.length > 1 &&
    last?.[0] === 'e' &&
    (last.index ?? 0) === normalized.length - 1 &&
    !normalized.endsWith('le')
  ) {
    groups.pop();
  }

  if (groups.length <= 1) return [displayWord || word];

  const boundaries: number[] = [];
  for (let index = 0; index < groups.length - 1; index += 1) {
    const current = groups[index];
    const next = groups[index + 1];
    const currentEnd = (current.index ?? 0) + current[0].length;
    const nextStart = next.index ?? normalized.length;
    const boundary = Math.max(
      currentEnd,
      Math.floor((currentEnd + nextStart) / 2)
    );
    boundaries.push(boundary);
  }

  const normalizedSlices: string[] = [];
  let start = 0;
  for (const boundary of boundaries) {
    normalizedSlices.push(normalized.slice(start, boundary));
    start = boundary;
  }
  normalizedSlices.push(normalized.slice(start));

  const joined = normalizedSlices.join('');
  if (joined !== normalized) return [displayWord || word];

  const caseMappedSlices: string[] = [];
  let rawStart = 0;
  for (const slice of normalizedSlices) {
    const sliceLength = slice.length;
    caseMappedSlices.push(
      collapsedApostrophes.slice(rawStart, rawStart + sliceLength)
    );
    rawStart += sliceLength;
  }
  return caseMappedSlices.filter(Boolean);
}

function alignSyllableCount(word: string, targetCount: number): string[] {
  const clampedTarget = Math.max(1, targetCount);
  const parts = splitByVowelGroups(word);

  if (parts.length === clampedTarget) return parts;

  while (parts.length > clampedTarget) {
    if (parts.length < 2) break;
    let bestMergeIndex = 0;
    let bestMergeCost = Number.POSITIVE_INFINITY;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const mergeCost = parts[index].length + parts[index + 1].length;
      if (mergeCost < bestMergeCost) {
        bestMergeCost = mergeCost;
        bestMergeIndex = index;
      }
    }
    const merged = `${parts[bestMergeIndex]}${parts[bestMergeIndex + 1]}`;
    parts.splice(bestMergeIndex, 2, merged);
  }

  while (parts.length < clampedTarget) {
    const longestIndex = parts.reduce(
      (bestIdx, part, index, list) =>
        part.length > list[bestIdx].length ? index : bestIdx,
      0
    );
    const longest = parts[longestIndex];
    if (longest.length <= 2) {
      parts.push('');
      continue;
    }
    const splitAt = Math.max(1, Math.floor(longest.length / 2));
    const left = longest.slice(0, splitAt);
    const right = longest.slice(splitAt);
    parts.splice(longestIndex, 1, left, right);
  }

  const filtered = parts.filter(Boolean);
  return filtered.length > 0 ? filtered : [word];
}

function lookupPronunciations(baseWord: string): string[] {
  const results: string[] = [];
  const direct = dictionary[baseWord];
  if (direct) results.push(direct);
  const noApostrophe = baseWord.replace(/['’]/g, '');
  if (noApostrophe && noApostrophe !== baseWord) {
    const noApostropheDirect = dictionary[noApostrophe];
    if (noApostropheDirect) results.push(noApostropheDirect);
  }

  // CMU entries often include alternate forms as word(1), word(2), ...
  let missesInRow = 0;
  for (let variant = 1; variant <= 12; variant += 1) {
    const maybe = dictionary[`${baseWord}(${variant})`];
    if (maybe) {
      results.push(maybe);
      missesInRow = 0;
    } else {
      missesInRow += 1;
      if (missesInRow >= 2) break;
    }
  }

  return results;
}

function parseStressPattern(pronunciation: string): PronunciationAnalysis {
  const phonemes = pronunciation.split(/\s+/).filter(Boolean);
  const stressPattern: number[] = [];
  for (const phoneme of phonemes) {
    if (STRESS_PHONEME_REGEX.test(phoneme)) {
      const digit = Number(phoneme[phoneme.length - 1] ?? '0');
      stressPattern.push(Number.isNaN(digit) ? 0 : digit);
    }
  }

  return {
    stressPattern,
    syllableCount: Math.max(1, stressPattern.length),
  };
}

function chunkToWordsUnder1000(value: number): string[] {
  const ones = [
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
  ] as const;
  const teens = [
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen',
  ] as const;
  const tens = [
    '',
    '',
    'twenty',
    'thirty',
    'forty',
    'fifty',
    'sixty',
    'seventy',
    'eighty',
    'ninety',
  ] as const;
  const words: string[] = [];
  let remaining = Math.max(0, Math.floor(value));

  if (remaining >= 100) {
    const hundreds = Math.floor(remaining / 100);
    words.push(ones[hundreds], 'hundred');
    remaining %= 100;
  }

  if (remaining >= 20) {
    const tensDigit = Math.floor(remaining / 10);
    words.push(tens[tensDigit]);
    remaining %= 10;
    if (remaining > 0) words.push(ones[remaining]);
    return words;
  }

  if (remaining >= 10) {
    words.push(teens[remaining - 10]);
    return words;
  }

  if (remaining > 0) {
    words.push(ones[remaining]);
  }

  return words;
}

function integerToWords(value: bigint): string[] {
  if (value === 0n) return ['zero'];
  const scales: Array<{ divisor: bigint; label: string }> = [
    { divisor: 1_000_000_000n, label: 'billion' },
    { divisor: 1_000_000n, label: 'million' },
    { divisor: 1_000n, label: 'thousand' },
  ];
  const words: string[] = [];
  let remainder = value;

  for (const scale of scales) {
    if (remainder < scale.divisor) continue;
    const chunk = Number(remainder / scale.divisor);
    remainder %= scale.divisor;
    if (chunk > 0) {
      words.push(...chunkToWordsUnder1000(chunk), scale.label);
    }
  }

  const finalChunk = Number(remainder);
  if (finalChunk > 0) {
    words.push(...chunkToWordsUnder1000(finalChunk));
  }

  return words;
}

function pluralizeWord(word: string): string {
  if (word.endsWith('y') && word.length > 1) {
    const beforeY = word[word.length - 2] ?? '';
    if (!/[aeiou]/i.test(beforeY)) return `${word.slice(0, -1)}ies`;
  }
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  return `${word}s`;
}

function ordinalizeWord(word: string): string {
  const irregular: Record<string, string> = {
    one: 'first',
    two: 'second',
    three: 'third',
    five: 'fifth',
    eight: 'eighth',
    nine: 'ninth',
    twelve: 'twelfth',
  };
  if (irregular[word]) return irregular[word];
  if (word.endsWith('y') && word.length > 1) return `${word.slice(0, -1)}ieth`;
  if (word.endsWith('e')) return `${word.slice(0, -1)}th`;
  return `${word}th`;
}

function integerToOrdinalWords(value: bigint): string[] {
  const baseWords = integerToWords(value);
  if (baseWords.length === 0) return ['zeroth'];
  const lastIndex = baseWords.length - 1;
  return [
    ...baseWords.slice(0, lastIndex),
    ordinalizeWord(baseWords[lastIndex] ?? 'zero'),
  ];
}

function getWordSignatureSeed(word: string): number {
  let acc = 0;
  for (const char of word) {
    acc = (acc * 31 + char.charCodeAt(0)) % 1_000_003;
  }
  return acc;
}

function expandNumericToken(token: string): string[] | null {
  const normalizedToken = token.toLowerCase();
  const ordinalMatch = normalizedToken.match(
    /^(\d[\d,]*(?:\.\d+)?)(st|nd|rd|th)(['’]?s)?$/i
  );
  if (ordinalMatch) {
    const compactOrdinal = (ordinalMatch[1] ?? '').replace(/,/g, '');
    if (!compactOrdinal || compactOrdinal.includes('.')) return null;
    const ordinalWords = integerToOrdinalWords(BigInt(compactOrdinal));
    if (!ordinalWords.length) return null;
    if (ordinalMatch[3]) {
      const last = ordinalWords[ordinalWords.length - 1] ?? '';
      return [...ordinalWords.slice(0, -1), pluralizeWord(last)];
    }
    return ordinalWords;
  }

  const colloquialMatch = normalizedToken.match(/^(\d[\d,]*)(['’]?s)$/i);
  if (colloquialMatch) {
    const compactColloquial = (colloquialMatch[1] ?? '').replace(/,/g, '');
    if (!compactColloquial) return null;
    const numericValue = BigInt(compactColloquial);
    const baseWords = integerToWords(numericValue);
    if (baseWords.length === 0) return null;
    const pluralizedTail = pluralizeWord(baseWords[baseWords.length - 1] ?? '');
    return [...baseWords.slice(0, -1), pluralizedTail];
  }

  const compact = normalizedToken.replace(/,/g, '');
  if (!/^\d+(?:\.\d+)?$/.test(compact)) return null;
  const decimalParts = compact.split('.');
  if (decimalParts.length === 2) {
    const [whole, fractional] = decimalParts;
    if (!whole || !fractional) return null;
    const wholeWords = integerToWords(BigInt(whole));
    const digitWords = [...fractional].map((digit) =>
      integerToWords(BigInt(digit))[0] ?? 'zero'
    );
    return [...wholeWords, 'point', ...digitWords];
  }

  return integerToWords(BigInt(compact));
}

function getHeuristicStressPattern(
  word: string,
  syllableCount: number
): number[] {
  if (syllableCount <= 1) return [1];

  const pattern = new Array<number>(syllableCount).fill(0);
  const baseStressIndex =
    STRONG_ENDING_REGEX.test(word) && syllableCount > 1 ? syllableCount - 2 : 0;
  pattern[Math.max(0, baseStressIndex)] = 1;
  return pattern;
}

function analyzeWord(
  word: string,
  strictDictionaryMode: boolean,
  variantSeed = 0
): WordAnalysis {
  const normalized = normalizeWord(word);
  if (!normalized) {
    return {
      word,
      syllables: [word],
      stressPattern: [1],
      source: 'unresolved',
    };
  }

  const forcedCount = STRICT_SYLLABLE_COUNT_OVERRIDES[normalized];
  if (forcedCount) {
    const syllables = alignSyllableCount(word, forcedCount);
    return {
      word,
      syllables,
      stressPattern: getHeuristicStressPattern(normalized, syllables.length),
      source: 'heuristic',
    };
  }

  const pronunciations = lookupPronunciations(normalized);
  const spokenCount = VARIABLE_SPOKEN_SYLLABLE_COUNTS[normalized];
  if (spokenCount && !strictDictionaryMode) {
    const strictCount = pronunciations.length
      ? parseStressPattern(pronunciations[0]).syllableCount
      : Math.max(1, estimateSyllables(normalized.replace(/['’]/g, '')));
    const useSpoken =
      seededUnit(getWordSignatureSeed(normalized), variantSeed, strictCount) <
      0.5;
    const targetCount = useSpoken ? spokenCount : strictCount;
    const syllables = alignSyllableCount(word, targetCount);
    if (!useSpoken && pronunciations.length > 0) {
      const parsed = parseStressPattern(pronunciations[0]);
      const paddedStress = [...parsed.stressPattern];
      while (paddedStress.length < syllables.length) paddedStress.push(0);
      return {
        word,
        syllables,
        stressPattern: paddedStress.slice(0, syllables.length),
        source: 'dictionary',
      };
    }
    return {
      word,
      syllables,
      stressPattern: getHeuristicStressPattern(normalized, syllables.length),
      source: useSpoken ? 'heuristic' : pronunciations.length > 0 ? 'dictionary' : 'heuristic',
    };
  }

  if (pronunciations.length > 0) {
    const parsed = parseStressPattern(pronunciations[0]);
    const syllables = alignSyllableCount(word, parsed.syllableCount);
    const paddedStress = [...parsed.stressPattern];
    while (paddedStress.length < syllables.length) paddedStress.push(0);

    return {
      word,
      syllables,
      stressPattern: paddedStress.slice(0, syllables.length),
      source: 'dictionary',
    };
  }

  if (strictDictionaryMode) {
    return {
      word,
      syllables: [word],
      stressPattern: [0],
      source: 'unresolved',
    };
  }

  const heuristicInput = normalized.replace(/['’]/g, '');
  const syllableCount = Math.max(1, estimateSyllables(heuristicInput));
  const syllables = alignSyllableCount(word, syllableCount);
  const stressPattern = getHeuristicStressPattern(normalized, syllables.length);
  return {
    word,
    syllables,
    stressPattern,
    source: 'heuristic',
  };
}

function normalizeAlignment(
  value: AlignmentStrength | undefined
): AlignmentStrength {
  if (value === 'off' || value === 'light' || value === 'strong') return value;
  return 'strong';
}

function mergeGenerationSettings(
  overrides?: Partial<WordRhythmGenerationSettings>
): WordRhythmGenerationSettings {
  const base = DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS;
  if (!overrides) return { ...base, noteValueBias: { ...base.noteValueBias }, mutations: { ...base.mutations } };

  const mergedMutations = { ...base.mutations, ...overrides.mutations };
  ALL_MUTATION_IDS.forEach((id) => {
    if (mergedMutations[id] === undefined) mergedMutations[id] = base.mutations[id];
  });

  return {
    fillRests: overrides.fillRests ?? base.fillRests,
    subdivideNotes: overrides.subdivideNotes ?? base.subdivideNotes,
    stretchSyllables: overrides.stretchSyllables ?? base.stretchSyllables,
    mergeNotes: overrides.mergeNotes ?? base.mergeNotes,
    noteValueBias: {
      ...base.noteValueBias,
      ...overrides.noteValueBias,
    },
    freestyle: overrides.freestyle ?? base.freestyle,
    freestyleStrength: overrides.freestyleStrength ?? base.freestyleStrength,
    naturalWordRhythm: overrides.naturalWordRhythm ?? base.naturalWordRhythm,
    stressAlignment: normalizeAlignment(
      overrides.stressAlignment ?? base.stressAlignment
    ),
    wordStartAlignment: normalizeAlignment(
      overrides.wordStartAlignment ?? base.wordStartAlignment
    ),
    phrasing: overrides.phrasing ?? base.phrasing,
    landingNote: overrides.landingNote ?? base.landingNote,
    templateNotation:
      overrides.templateNotation !== undefined
        ? overrides.templateNotation
        : base.templateNotation,
    mutations: mergedMutations as Record<MutationId, boolean>,
  };
}

export function seededUnit(...seeds: number[]): number {
  let state = 0;
  for (let index = 0; index < seeds.length; index += 1) {
    state += (index + 1) * (seeds[index] + 0.6180339887);
  }
  const raw = Math.sin(state * 12.9898 + 78.233) * 43758.5453123;
  return raw - Math.floor(raw);
}

function splitDurationForTemplate(durationInSixteenths: number): number[] {
  const durations: number[] = [];
  let remaining = Math.max(1, durationInSixteenths);
  while (remaining > 0) {
    const next = Math.min(4, remaining);
    durations.push(next);
    remaining -= next;
  }
  return durations;
}

interface TemplatePulse {
  durations: number[];
  strokes: Array<'D' | 'T' | 'K'>;
}

/** Ordered segments for one measure, including rests (strict mode follows this timeline). */
export type TemplateSegment =
  | { kind: 'rest'; sixteenths: number }
  | { kind: 'hit'; sixteenths: number; stroke: 'D' | 'T' | 'K' };

export function parseTemplateTimeline(
  notation: string | undefined,
  timeSignature: TimeSignature
): TemplateSegment[] {
  if (!notation || !notation.trim()) return [];
  const parsed = parseRhythm(notation, timeSignature);
  if (!parsed.isValid || parsed.measures.length === 0) return [];
  const measure = parsed.measures[0];
  const segments: TemplateSegment[] = [];
  measure.notes.forEach((note) => {
    if (note.sound === 'simile') return;
    if (note.sound === 'rest') {
      const n = note.durationInSixteenths;
      if (n > 0) segments.push({ kind: 'rest', sixteenths: n });
      return;
    }
    const stroke: 'D' | 'T' | 'K' =
      note.sound === 'dum' ? 'D' : note.sound === 'tak' ? 'T' : 'K';
    const chunks = splitDurationForTemplate(note.durationInSixteenths);
    chunks.forEach((duration) => {
      segments.push({
        kind: 'hit',
        sixteenths: Math.max(1, Math.min(4, duration)),
        stroke,
      });
    });
  });
  return segments;
}

function parseTemplatePulse(
  notation: string | undefined,
  timeSignature: TimeSignature
): TemplatePulse {
  if (!notation || !notation.trim()) return { durations: [], strokes: [] };
  const parsed = parseRhythm(notation, timeSignature);
  if (!parsed.isValid || parsed.measures.length === 0)
    return { durations: [], strokes: [] };

  const durations: number[] = [];
  const strokes: Array<'D' | 'T' | 'K'> = [];
  const sourceMeasures = parsed.measures.slice(
    0,
    Math.min(2, parsed.measures.length)
  );
  sourceMeasures.forEach((measure) => {
    measure.notes.forEach((note) => {
      if (note.sound === 'rest' || note.sound === 'simile') return;
      const stroke: 'D' | 'T' | 'K' =
        note.sound === 'dum' ? 'D' : note.sound === 'tak' ? 'T' : 'K';
      const chunks = splitDurationForTemplate(note.durationInSixteenths);
      chunks.forEach((duration) => {
        durations.push(Math.max(1, Math.min(4, duration)));
        strokes.push(stroke);
      });
    });
  });
  return { durations, strokes };
}

/**
 * Reshape the ending of the song so the final syllable resolves on a strong
 * beat with a D (dum) stroke. Mutates `measures` and `hits` in place.
 *
 * Heuristics (in priority order):
 * 1. Already on beat 1 → upgrade stroke to D, extend duration to fill measure.
 * 2. On beat 3 (or another strong beat) → upgrade stroke to D, extend to end.
 * 3. Off a strong beat → move the syllable to beat 1 of a new landing measure.
 */
function applyLandingNote(
  measures: string[],
  hits: SyllableHit[],
  sixteenthsPerMeasure: number
): void {
  if (measures.length === 0 || sixteenthsPerMeasure <= 0) return;

  // Find the last hit that carries an actual word.
  let lastWordHitIdx = -1;
  for (let i = hits.length - 1; i >= 0; i--) {
    if (hits[i].word !== '') {
      lastWordHitIdx = i;
      break;
    }
  }
  if (lastWordHitIdx < 0) return;

  const hit = hits[lastWordHitIdx];

  // Remove any trailing hits after the last word hit that carry no word text.
  // These are either tie continuations or template filler hits that would
  // render as random wordless notes.
  while (lastWordHitIdx + 1 < hits.length && (hits[lastWordHitIdx + 1].word === '' || hits[lastWordHitIdx + 1].continuationOfPrevious)) {
    const orphan = hits[lastWordHitIdx + 1];
    // Erase from notation
    const orphanMeasure = Math.floor(orphan.startSixteenth / sixteenthsPerMeasure);
    if (orphanMeasure < measures.length) {
      const chars = measures[orphanMeasure].split('');
      const orphanPos = orphan.startSixteenth % sixteenthsPerMeasure;
      const orphanEnd = Math.min(orphanPos + orphan.durationSixteenths, chars.length);
      for (let i = orphanPos; i < orphanEnd; i++) chars[i] = '_';
      measures[orphanMeasure] = chars.join('');
    }
    hits.splice(lastWordHitIdx + 1, 1);
  }

  const hitMeasureIdx = Math.floor(hit.startSixteenth / sixteenthsPerMeasure);
  const posInMeasure = hit.startSixteenth % sixteenthsPerMeasure;

  // Strong beats in the measure (beat 1 and beat 3 in 4/4, etc.).
  // Beat 1 = position 0; beat 3 = halfway point.
  const halfMeasure = Math.floor(sixteenthsPerMeasure / 2);
  const isOnBeat1 = posInMeasure === 0;
  const isOnStrongBeat = isOnBeat1 || posInMeasure === halfMeasure;

  const LANDING_DURATION = 4; // quarter note

  // Stretch the previous hit to fill any gap leading into the landing note.
  const fillGapFromPreviousHit = (landingAbsSixteenth: number) => {
    if (lastWordHitIdx <= 0) return;
    const prevHit = hits[lastWordHitIdx - 1];
    const prevEnd = prevHit.startSixteenth + prevHit.durationSixteenths;
    const gap = landingAbsSixteenth - prevEnd;
    if (gap <= 0 || gap > sixteenthsPerMeasure) return;
    prevHit.durationSixteenths += gap;
    let pos = prevEnd;
    while (pos < landingAbsSixteenth) {
      const mIdx = Math.floor(pos / sixteenthsPerMeasure);
      if (mIdx >= measures.length) break;
      const mChars = measures[mIdx].split('');
      const mPos = pos % sixteenthsPerMeasure;
      const mEnd = Math.min(sixteenthsPerMeasure, mPos + (landingAbsSixteenth - pos));
      for (let i = mPos; i < mEnd; i++) mChars[i] = '-';
      measures[mIdx] = mChars.join('');
      pos += (mEnd - mPos);
    }
  };

  if (isOnBeat1) {
    hit.stroke = 'D';
    const remainingInMeasure = sixteenthsPerMeasure - posInMeasure;
    const newDuration = Math.max(hit.durationSixteenths, Math.min(remainingInMeasure, LANDING_DURATION));
    if (newDuration > hit.durationSixteenths) {
      hit.durationSixteenths = newDuration;
      rewriteMeasureForHit(measures, hitMeasureIdx, posInMeasure, newDuration, sixteenthsPerMeasure);
    }
    fillGapFromPreviousHit(hit.startSixteenth);
    return;
  }

  if (isOnStrongBeat) {
    hit.stroke = 'D';
    const remainingInMeasure = sixteenthsPerMeasure - posInMeasure;
    const newDuration = Math.max(hit.durationSixteenths, Math.min(remainingInMeasure, LANDING_DURATION));
    if (newDuration > hit.durationSixteenths) {
      hit.durationSixteenths = newDuration;
      rewriteMeasureForHit(measures, hitMeasureIdx, posInMeasure, newDuration, sixteenthsPerMeasure);
    }
    fillGapFromPreviousHit(hit.startSixteenth);
    return;
  }

  // Off a strong beat — find the nearest strong beat and move there.
  // Then fill any resulting gap by stretching the previous word's hit.

  let targetPos: number;
  let targetMeasureIdx: number;

  if (posInMeasure < halfMeasure) {
    // Beat 3 is ahead in the same measure.
    targetPos = halfMeasure;
    targetMeasureIdx = hitMeasureIdx;
  } else {
    // Past midpoint — move to beat 1 of the next measure.
    targetPos = 0;
    targetMeasureIdx = hitMeasureIdx + 1;
  }

  // Erase the hit from its current position.
  const measure = measures[hitMeasureIdx];
  if (measure) {
    const chars = measure.split('');
    const endPos = Math.min(posInMeasure + hit.durationSixteenths, chars.length);
    for (let i = posInMeasure; i < endPos; i++) {
      chars[i] = '_';
    }
    measures[hitMeasureIdx] = chars.join('');
  }

  // Ensure the target measure exists.
  if (targetMeasureIdx >= measures.length) {
    measures.push('_'.repeat(sixteenthsPerMeasure));
  }

  const targetAbsSixteenth = targetMeasureIdx * sixteenthsPerMeasure + targetPos;
  const remainingFromTarget = sixteenthsPerMeasure - targetPos;
  const newDuration = Math.min(remainingFromTarget, LANDING_DURATION);

  hit.startSixteenth = targetAbsSixteenth;
  hit.durationSixteenths = newDuration;
  hit.stroke = 'D';
  rewriteMeasureForHit(measures, targetMeasureIdx, targetPos, newDuration, sixteenthsPerMeasure);

  fillGapFromPreviousHit(targetAbsSixteenth);
}

/**
 * Post-processing: compact intra-line gaps so that consecutive words on the
 * same lyric line are never separated by more than a small rest.  When a gap
 * exceeds the threshold the *previous* word's last syllable is stretched with
 * continuation dashes to fill it — this is musically natural (holding a note
 * longer) and keeps phrases cohesive.
 *
 * Phrase-ending words (last word before a line break, or last overall) use a
 * tighter threshold so the final syllable sits snugly against the preceding
 * content.
 */
function compactPhraseEndings(
  measures: string[],
  hits: SyllableHit[],
  sixteenthsPerMeasure: number,
  lineStartWordIndices: Set<number>,
  totalWords: number
): void {
  if (measures.length === 0 || sixteenthsPerMeasure <= 0 || totalWords < 2) return;

  const PHRASE_END_MAX_GAP = 2;   // eighth note – tight for phrase endings
  const INTRA_LINE_MAX_GAP = 4;   // quarter note – breathing room mid-phrase

  // Index hits by word.
  const lastHitByWord = new Map<number, SyllableHit>();
  const firstHitByWord = new Map<number, SyllableHit>();
  for (const hit of hits) {
    if (hit.word === '' || hit.wordIndex < 0) continue;
    const prev = lastHitByWord.get(hit.wordIndex);
    if (!prev || hit.startSixteenth > prev.startSixteenth) {
      lastHitByWord.set(hit.wordIndex, hit);
    }
    const prevF = firstHitByWord.get(hit.wordIndex);
    if (!prevF || hit.startSixteenth < prevF.startSixteenth) {
      firstHitByWord.set(hit.wordIndex, hit);
    }
  }

  const fillGap = (prevHit: SyllableHit, amount: number) => {
    const prevEnd = prevHit.startSixteenth + prevHit.durationSixteenths;
    prevHit.durationSixteenths += amount;
    let pos = prevEnd;
    const fillEnd = prevEnd + amount;
    while (pos < fillEnd) {
      const mIdx = Math.floor(pos / sixteenthsPerMeasure);
      if (mIdx >= measures.length) break;
      const mChars = measures[mIdx].split('');
      const mPos = pos % sixteenthsPerMeasure;
      const mEnd = Math.min(sixteenthsPerMeasure, mPos + (fillEnd - pos));
      for (let i = mPos; i < mEnd; i++) mChars[i] = '-';
      measures[mIdx] = mChars.join('');
      pos += (mEnd - mPos);
    }
  };

  for (let wi = 1; wi < totalWords; wi++) {
    if (lineStartWordIndices.has(wi)) continue; // skip cross-line boundaries

    const prevLastHit = lastHitByWord.get(wi - 1);
    const currFirstHit = firstHitByWord.get(wi);
    if (!prevLastHit || !currFirstHit) continue;

    const prevEnd = prevLastHit.startSixteenth + prevLastHit.durationSixteenths;
    const gap = currFirstHit.startSixteenth - prevEnd;

    const isPhraseEnd =
      wi === totalWords - 1 ||
      lineStartWordIndices.has(wi + 1);
    const maxGap = isPhraseEnd ? PHRASE_END_MAX_GAP : INTRA_LINE_MAX_GAP;

    if (gap > maxGap) {
      fillGap(prevLastHit, gap - maxGap);
    }
  }
}

/**
 * Rewrite a measure's notation so that the cell at `posInMeasure` becomes a
 * hit of `duration` sixteenths (stroke char + continuation dashes), absorbing
 * whatever was there before.
 */
function rewriteMeasureForHit(
  measures: string[],
  measureIdx: number,
  posInMeasure: number,
  duration: number,
  sixteenthsPerMeasure: number
): void {
  const measure = measures[measureIdx];
  if (!measure) return;
  const chars = measure.split('');
  // The first cell keeps the existing stroke character (already set on the hit).
  // Subsequent cells become continuation dashes.
  const endPos = Math.min(posInMeasure + duration, sixteenthsPerMeasure);
  for (let i = posInMeasure + 1; i < endPos; i++) {
    chars[i] = '-';
  }
  // Ensure the stroke char at the start position is a sounding stroke, not a rest.
  if (chars[posInMeasure] === '_' || chars[posInMeasure] === '-') {
    chars[posInMeasure] = 'D';
  }
  measures[measureIdx] = chars.join('');
}

function buildNotationFromAnalyses(
  analyses: WordAnalysis[],
  timeSignature: TimeSignature,
  rhythmVariationSeed = 0,
  soundVariationSeed = 0,
  lineStartWordIndices = new Set<number>(),
  lineByWordIndex = new Map<number, number>(),
  lineSyllableCounts = new Map<number, number>(),
  generationSettings?: Partial<WordRhythmGenerationSettings>
): { notation: string; hits: SyllableHit[] } {
  type Stroke = 'D' | 'T' | 'K';
  type VariationMode = 'tight' | 'balanced' | 'open';
  const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
  const beatUnitSixteenths = Math.max(
    1,
    Math.round(16 / Math.max(1, timeSignature.denominator))
  );
  const settings = mergeGenerationSettings(generationSettings);
  // Bridge v3 rules → legacy mutation flags.
  // IMPORTANT: fillRests and subdivideNotes are handled by the new pipeline
  // stages (mutateTemplate), NOT by the old placement engine. Only freestyle
  // should activate the wide-ranging legacy flags.
  const mut: Record<MutationId, boolean> = {
    adventurousRhythm: settings.freestyle,
    dottedFeel: settings.noteValueBias.dotted > 50,
    sixteenthMotion: settings.noteValueBias.sixteenth > 50,
    crossBarTies: settings.stretchSyllables,
    midMeasureRests: false,
    motifOrnament: settings.freestyle,
    lineBreakGaps: false,
    avoidIntraWordRests: true,
  };
  const variationMode: VariationMode =
    Math.abs(rhythmVariationSeed) % 3 === 0
      ? 'balanced'
      : Math.abs(rhythmVariationSeed) % 3 === 1
        ? 'tight'
        : 'open';
  const cells: string[] = [];
  const hits: SyllableHit[] = [];
  let unstressedIndex = soundVariationSeed;
  let cursor = 0;
  let wordIndex = 0;
  // Scale randomization with freestyleStrength (0-100)
  const freestyleFactor = settings.freestyle
    ? Math.min(1, settings.freestyleStrength / 100)
    : 0;
  const adventurousness = mut.adventurousRhythm
    ? 0.12 + 0.40 * freestyleFactor
    : 0.12;
  const motifVariation = mut.motifOrnament
    ? 0.08 + 0.24 * freestyleFactor
    : 0;
  // Bias scales continuously: 50 = neutral (0 effect), 90 = full effect
  const dottedBias = settings.noteValueBias.dotted > 50
    ? 0.12 + ((settings.noteValueBias.dotted - 50) / 50) * 0.26
    : 0;
  const sixteenthBias = settings.noteValueBias.sixteenth > 50
    ? 0.10 + ((settings.noteValueBias.sixteenth - 50) / 50) * 0.24
    : 0;
  const tieCrossingBias = mut.crossBarTies ? 0.88 : 0.18;
  const restBias = mut.midMeasureRests ? 0.38 : 0;
  const lineBreakGapBias = mut.lineBreakGaps ? 0.92 : 0;
  const avoidIntraWordProtect = mut.avoidIntraWordRests ? 0.88 : 0.65;
  // Minimum duration floor: if a note value has bias=0, don't produce it.
  const minDuration = settings.noteValueBias.sixteenth === 0 ? 2 : 1;
  const stressAlign = alignmentStrengthFactor(settings.stressAlignment);
  const wordStartAlign = alignmentStrengthFactor(settings.wordStartAlignment);
  const maxWordSpillSixteenths = Math.min(
    4,
    Math.max(1, 1 + Math.round(tieCrossingBias * 3))
  );
  const recentStrokes: Stroke[] = [];
  const lineSyllableProgress = new Map<number, number>();

  const templatePulse = parseTemplatePulse(
    settings.templateNotation,
    timeSignature
  );
  let templateTimeline = parseTemplateTimeline(
    settings.templateNotation,
    timeSignature
  );

  // --- Pipeline stage 1: mutate template (fill rests, subdivide, merge) ---
  if (settings.fillRests || settings.subdivideNotes || settings.mergeNotes) {
    templateTimeline = mutateTemplate(
      templateTimeline,
      settings,
      timeSignature,
      rhythmVariationSeed
    );
  }

  // --- Pipeline stage: apply freestyle strength to template ---
  if (settings.freestyle && settings.freestyleStrength > 0) {
    templateTimeline = applyFreestyle(
      templateTimeline,
      settings.freestyleStrength,
      settings.noteValueBias,
      rhythmVariationSeed
    );
  }

  // --- Enforce note value bias floor on the template ---
  if (minDuration > 1) {
    templateTimeline = enforceMinDuration(templateTimeline, minDuration);
  }

  const lineTimelineCursor = new Map<number, number>();
  const templateDurations = templatePulse.durations;
  /** Syllable/hit placement follows the template when no template-mutating rules are on. */
  const strictTemplateRhythmMode =
    noTemplateMutations(settings) && templateDurations.length > 0;
  const strictTimelineMode =
    strictTemplateRhythmMode &&
    templateTimeline.some((segment) => segment.kind === 'hit');
  /** How strongly durations follow the template pulse (1 = full follow). */
  const templateFollowStrength = noTemplateMutations(settings)
    ? 1
    : templateDurations.length > 0
      ? Math.max(0.3, 0.82 - freestyleFactor * 0.4)
      : 0;
  const isTemplatePhaseLocked =
    templateDurations.length > 0 &&
    (strictTemplateRhythmMode || !mut.motifOrnament);
  const beatGrouping = getDefaultBeatGrouping(timeSignature);
  const beatGroupingInSixteenths = getBeatGroupingInSixteenths(
    beatGrouping,
    timeSignature
  );
  const defaultMotif = beatGroupingInSixteenths.flatMap(
    (groupSize, groupIndex) => {
      if (groupSize <= 0) return [];
      const motif: number[] = [];
      let remaining = groupSize;
      while (remaining > 0) {
        const beatChoice = seededUnit(
          rhythmVariationSeed,
          groupIndex,
          remaining
        );
        const preferred =
          remaining >= 4 && beatChoice < 0.5
            ? 4
            : remaining >= 3 && beatChoice < 0.8
              ? 3
              : remaining >= 2
                ? 2
                : 1;
        const duration = Math.min(remaining, Math.max(1, preferred));
        motif.push(duration);
        remaining -= duration;
      }
      return motif;
    }
  );
  const lineMotifs = new Map<number, number[]>();

  const getLineMotif = (lineIndex: number): number[] => {
    if (lineMotifs.has(lineIndex))
      return lineMotifs.get(lineIndex) ?? [2, 2, 4, 2];
    const seedOffset = lineIndex + rhythmVariationSeed + soundVariationSeed;
    const motifSource =
      templateDurations.length > 0 &&
      (strictTemplateRhythmMode ||
        seededUnit(seedOffset, templateDurations.length) <
          templateFollowStrength)
        ? templateDurations
        : defaultMotif.length > 0
          ? defaultMotif
          : [2, 2, 4, 2];
    if (
      templateDurations.length > 0 &&
      (strictTemplateRhythmMode || templateFollowStrength >= 0.78)
    ) {
      const strictTemplate = motifSource.map((duration) =>
        Math.max(1, Math.min(4, duration))
      );
      lineMotifs.set(
        lineIndex,
        strictTemplate.length > 0 ? strictTemplate : [2, 2, 4, 2]
      );
      return lineMotifs.get(lineIndex) ?? [2, 2, 4, 2];
    }

    const transformed = motifSource.map((duration, motifIndex) => {
      const variationRoll = seededUnit(seedOffset, motifIndex, duration);
      if (variationRoll < motifVariation * 0.2)
        return Math.max(minDuration, duration - 1);
      if (variationRoll > 1 - motifVariation * 0.2)
        return Math.min(4, duration + 1);
      return duration;
    });
    const withAdventure = transformed.map((duration, motifIndex) => {
      const roll = seededUnit(seedOffset, motifIndex, adventurousness);
      if (roll < sixteenthBias * 0.25) return minDuration;
      if (roll > 1 - dottedBias * 0.25 && duration >= 2)
        return Math.min(4, duration + 1);
      return duration;
    });
    lineMotifs.set(
      lineIndex,
      withAdventure.length > 0 ? withAdventure : [2, 2, 4, 2]
    );
    return lineMotifs.get(lineIndex) ?? [2, 2, 4, 2];
  };

  const getTemplateDurationAt = (
    lineIndex: number,
    positionInLine: number
  ): 1 | 2 | 3 | 4 | null => {
    if (templatePulse.durations.length === 0) return null;
    const lineOffset = isTemplatePhaseLocked
      ? 0
      : Math.abs(rhythmVariationSeed + lineIndex * 3);
    const index =
      (lineOffset + positionInLine) % templatePulse.durations.length;
    return Math.max(1, Math.min(4, templatePulse.durations[index] ?? 2)) as
      | 1
      | 2
      | 3
      | 4;
  };

  const getTemplateStrokeAt = (
    lineIndex: number,
    positionInLine: number
  ): Stroke | null => {
    if (templatePulse.strokes.length === 0) return null;
    const lineOffset = isTemplatePhaseLocked
      ? 0
      : Math.abs(soundVariationSeed + lineIndex * 2);
    const index = (lineOffset + positionInLine) % templatePulse.strokes.length;
    return templatePulse.strokes[index] ?? null;
  };

  const pushHit = (
    stroke: 'D' | 'T' | 'K',
    durationSixteenths: number,
    analysis: WordAnalysis,
    syllable: string,
    syllableIndex: number,
    stress: number,
    continuationOfPrevious = false
  ) => {
    cells.push(stroke);
    for (let idx = 1; idx < durationSixteenths; idx += 1) {
      cells.push('-');
    }
    hits.push({
      word: analysis.word,
      syllable,
      source: analysis.source,
      stroke,
      stress,
      wordIndex,
      syllableIndex,
      startSixteenth: cursor,
      durationSixteenths,
      continuationOfPrevious,
    });
    cursor += durationSixteenths;
  };

  const splitForReadableTemplateTies = (
    duration: number,
    templateDuration: 1 | 2 | 3 | 4 | null
  ): number[] => {
    // When following the template closely, split dotted-like values into tied chunks
    // so the base pulse stays visually obvious (e.g. 3 -> 2+1).
    // Preserve template triplet-like anchors (3 sixteenths) so grooves like Malfuf (3-3-2)
    // and Ayoub keep their characteristic swing in notation.
    if (templateDuration === 3) return [3];
    if (templateFollowStrength >= 0.7 && duration === 3) return [2, 1];
    return [duration];
  };

  const pushRest = (durationSixteenths: number) => {
    for (let idx = 0; idx < durationSixteenths; idx += 1) {
      cells.push('_');
    }
    cursor += durationSixteenths;
  };

  const remainingInMeasure = () => {
    if (sixteenthsPerMeasure <= 0) return Number.POSITIVE_INFINITY;
    const offset = cursor % sixteenthsPerMeasure;
    return offset === 0 ? sixteenthsPerMeasure : sixteenthsPerMeasure - offset;
  };

  const chooseDuration = (preferred: 1 | 2 | 3 | 4) => {
    const remaining = remainingInMeasure();
    const overflow = preferred - remaining;
    if (remaining >= preferred) return preferred;
    const tieChance = 0.18 + tieCrossingBias * 0.6;
    if (
      overflow > 0 &&
      overflow <= maxWordSpillSixteenths &&
      seededUnit(cursor, wordIndex, preferred) < tieChance
    ) {
      // Allow small spill for natural ties over barlines.
      return preferred;
    }
    if (
      tieCrossingBias >= 0.85 &&
      remaining <= 2 &&
      preferred >= 3 &&
      overflow <= 4
    ) {
      return preferred;
    }
    if (remaining >= 2) return 2;
    return 1;
  };

  const isMajorBeat = (measurePosition: number) =>
    measurePosition % beatUnitSixteenths === 0;

  const expectedMajorBeatStroke = (measurePosition: number): Stroke => {
    const beatIndex = Math.floor(measurePosition / beatUnitSixteenths);
    // Grounding low sound on odd beats (1,3), snare-like answer on even beats (2,4).
    return beatIndex % 2 === 0 ? 'D' : 'T';
  };

  const pickStroke = (
    stress: number,
    templateStroke: Stroke | null
  ): Stroke => {
    const measurePosition =
      sixteenthsPerMeasure > 0 ? cursor % sixteenthsPerMeasure : 0;
    const beatIndex = Math.floor(measurePosition / beatUnitSixteenths);
    const soundPalette = Math.abs(soundVariationSeed) % 4;
    const previous = recentStrokes[recentStrokes.length - 1];
    const previous2 = recentStrokes[recentStrokes.length - 2];

    let stroke: Stroke;
    if (templateStroke) {
      const deformation = Math.max(0, 1 - templateFollowStrength);
      const shouldUseTemplate =
        seededUnit(wordIndex, cursor, stress, soundVariationSeed) >=
        deformation;
      if (shouldUseTemplate) {
        stroke = templateStroke;
      } else {
        stroke = stress > 0 ? 'T' : 'K';
      }
    } else {
      stroke = 'D';
    }
    // When a template stroke exists and we're still following the groove, do not
    // replace it with generic beat heuristics (that was firing for any strength < 0.96).
    if (!templateStroke || templateFollowStrength < 0.72) {
      if (isMajorBeat(measurePosition)) {
        stroke = expectedMajorBeatStroke(measurePosition);
        if (stroke === 'T') {
          // Backbeat color can vary by regeneration profile.
          if (soundPalette === 1) stroke = 'K';
          if (soundPalette === 3) stroke = beatIndex % 2 === 0 ? 'T' : 'K';
        } else if (stroke === 'D' && soundPalette === 2 && beatIndex >= 2) {
          // Keep beat 1 grounded, but allow later strong beats to open up in one profile.
          stroke = 'T';
        }
      } else {
        const offbeatChoice =
          (wordIndex + unstressedIndex + soundVariationSeed + measurePosition) %
          6;
        if (soundPalette === 0) {
          stroke =
            stress > 0
              ? offbeatChoice <= 1
                ? 'T'
                : 'K'
              : offbeatChoice <= 2
                ? 'K'
                : 'T';
        } else if (soundPalette === 1) {
          stroke =
            stress > 0
              ? offbeatChoice <= 2
                ? 'K'
                : 'T'
              : offbeatChoice <= 3
                ? 'T'
                : 'K';
        } else if (soundPalette === 2) {
          stroke = stress > 0 ? 'T' : offbeatChoice <= 1 ? 'K' : 'T';
        } else {
          stroke =
            stress > 0
              ? offbeatChoice % 2 === 0
                ? 'K'
                : 'T'
              : offbeatChoice <= 2
                ? 'K'
                : 'T';
        }
        if (previous === 'K') {
          stroke = 'T';
        }
      }
    }

    if (stroke === 'K' && previous === 'K') {
      stroke = 'T';
    }
    if (stroke === 'T' && previous === 'T' && previous2 === 'T') {
      stroke = 'K';
    }
    if (!isMajorBeat(measurePosition) && stroke === 'T' && previous === 'T') {
      stroke = 'K';
    }

    return stroke;
  };

  const getLineTargetDuration = (
    currentWordIndex: number,
    syllableIndex: number,
    stress: number
  ): 1 | 2 | 3 | 4 => {
    const lineIndex = lineByWordIndex.get(currentWordIndex);
    const lineSyllables =
      lineIndex !== undefined ? lineSyllableCounts.get(lineIndex) : undefined;
    const targetLineSixteenths = Math.max(8, sixteenthsPerMeasure * 2);
    const avg =
      lineSyllables && lineSyllables > 0
        ? targetLineSixteenths / lineSyllables
        : 2;
    const isLineAnchor = syllableIndex === 0;
    if (avg <= 1.4) return stress > 0 && isLineAnchor ? 2 : 1;
    if (avg <= 2.2) return stress > 0 && isLineAnchor ? 3 : 2;
    if (avg <= 3.2) return stress > 0 && isLineAnchor ? 4 : 3;
    return stress > 0 && isLineAnchor ? 4 : 3;
  };

  const getMotifDuration = (
    currentWordIndex: number,
    syllableIndex: number
  ): 1 | 2 | 3 | 4 => {
    const lineIndex = lineByWordIndex.get(currentWordIndex) ?? 0;
    const syllableProgress = lineSyllableProgress.get(lineIndex) ?? 0;
    const motif = getLineMotif(lineIndex);
    const index = (syllableProgress + syllableIndex) % motif.length;
    return Math.max(1, Math.min(4, motif[index] ?? 2)) as 1 | 2 | 3 | 4;
  };

  const getPreferredDuration = (
    analysis: WordAnalysis,
    syllableIndex: number,
    stress: number
  ): 1 | 2 | 3 | 4 => {
    const isWordAnchor = syllableIndex === 0;
    const isLongWord = analysis.syllables.length >= 4;
    const lineDurationBias = getLineTargetDuration(
      wordIndex,
      syllableIndex,
      stress
    );
    const grooveAnchorBoost =
      isWordAnchor && stress > 0 && (wordIndex + rhythmVariationSeed) % 4 === 0
        ? 1
        : 0;
    let preferred = Math.min(4, lineDurationBias + grooveAnchorBoost) as
      | 1
      | 2
      | 3
      | 4;

    // Long words (e.g. watermelon) are often spoken faster in rhythmic mnemonics.
    if (isLongWord) {
      if (variationMode === 'tight') {
        preferred = stress > 0 && isWordAnchor ? 2 : 1;
      } else if (variationMode === 'balanced') {
        preferred =
          stress > 0 && isWordAnchor ? 2 : (Math.min(2, preferred) as 1 | 2);
      } else {
        preferred =
          stress > 0 && isWordAnchor
            ? (Math.min(3, preferred) as 1 | 2 | 3)
            : (Math.min(2, preferred) as 1 | 2);
      }
    }

    if (!isLongWord) {
      if (variationMode === 'tight') {
        preferred = Math.max(minDuration, preferred - 1) as 1 | 2 | 3 | 4;
      } else if (variationMode === 'open') {
        preferred = Math.min(4, preferred + (stress > 0 ? 1 : 0)) as
          | 1
          | 2
          | 3
          | 4;
      }
    }

    const motifDuration = getMotifDuration(wordIndex, syllableIndex);
    const blended = Math.round(
      preferred * (1 - templateFollowStrength) +
        motifDuration * templateFollowStrength
    );
    preferred = Math.max(minDuration, Math.min(4, blended)) as 1 | 2 | 3 | 4;

    if (templateFollowStrength >= 0.9) {
      preferred = motifDuration;
      return preferred;
    }

    const microVariation =
      (wordIndex * 3 + syllableIndex + rhythmVariationSeed) % 5;
    if (microVariation === 0 && preferred > 1 && variationMode !== 'open') {
      preferred = (preferred - 1) as 1 | 2 | 3 | 4;
    } else if (
      microVariation === 4 &&
      preferred < 4 &&
      stress > 0 &&
      variationMode !== 'tight'
    ) {
      preferred = (preferred + 1) as 1 | 2 | 3 | 4;
    }
    const adventureRoll = seededUnit(
      wordIndex,
      syllableIndex,
      rhythmVariationSeed,
      soundVariationSeed
    );
    if (adventureRoll < sixteenthBias * 0.2) preferred = minDuration as 1 | 2 | 3 | 4;
    if (adventureRoll > 1 - dottedBias * 0.22 && preferred <= 2) preferred = 3;
    if (
      adventureRoll > 1 - adventurousness * 0.12 &&
      stress > 0 &&
      preferred <= 3
    )
      preferred = 4;
    return preferred;
  };

  const placeWordAtCurrentPosition = (analysis: WordAnalysis, suppressAlignmentRests = false, isEndOfPhrase = false) => {
    const lineIndex = lineByWordIndex.get(wordIndex) ?? 0;
    const lineProgress = lineSyllableProgress.get(lineIndex) ?? 0;

    if (strictTimelineMode) {
      // --- Helper: advance idx past rests, emitting them. Returns the new idx. ---
      const skipRests = (startIdx: number, maxEmit = Infinity): number => {
        let i = startIdx;
        let guard = 0;
        let emitted = 0;
        while (guard < 4096) {
          guard += 1;
          if (i >= templateTimeline.length) i = 0;
          const seg = templateTimeline[i];
          if (!seg || seg.kind !== 'rest') break;
          if (emitted < maxEmit) {
            const canEmit = Math.min(seg.sixteenths, maxEmit - emitted);
            if (canEmit > 0) pushRest(canEmit);
            emitted += canEmit;
          }
          i += 1;
        }
        return i;
      };
      // Max rest gap between words on the same lyric line (one beat).
      const maxIntraLineGap = beatUnitSixteenths;

      // --- Helper: find the next hit segment at or after idx. ---
      const findNextHit = (startIdx: number): { idx: number; seg: TemplateSegment & { kind: 'hit' } } | null => {
        const i = startIdx >= templateTimeline.length ? 0 : startIdx;
        const seg = templateTimeline[i];
        if (seg?.kind === 'hit') return { idx: i, seg };
        const firstHit = templateTimeline.findIndex((s) => s.kind === 'hit');
        if (firstHit < 0) return null;
        return { idx: firstHit, seg: templateTimeline[firstHit] as TemplateSegment & { kind: 'hit' } };
      };

      // When naturalWordRhythm is on and the word has multiple syllables,
      // subdivide template hits according to the word's natural shape.
      // Strategy: consume as few template hits as possible, packing multiple
      // syllables into a single hit when the hit is long enough (≥2 sixteenths
      // per syllable). This produces the most musically natural result — e.g.
      // a quarter-note hit becomes two eighths for a trochee, or [1,3] for
      // an iamb.
      if (settings.naturalWordRhythm && analysis.syllables.length > 1) {
        let idx = skipRests(lineTimelineCursor.get(lineIndex) ?? 0, maxIntraLineGap);
        const shape = getWordShape(analysis.stressPattern);
        const syllableCount = analysis.syllables.length;

        // Greedily pack syllables into template hits.
        type SyllablePlan = { stroke: Stroke; duration: 1 | 2 | 3 | 4 };
        const plans: SyllablePlan[] = [];
        let syllablesPlaced = 0;

        while (syllablesPlaced < syllableCount) {
          // Skip rests (capped to avoid intra-word gaps).
          idx = skipRests(idx, maxIntraLineGap);
          if (idx >= templateTimeline.length) idx = 0;
          const hit = findNextHit(idx);
          if (!hit) break;
          const hitDur = hit.seg.sixteenths;
          const stroke = hit.seg.stroke;
          const remaining = syllableCount - syllablesPlaced;

          // How many syllables can this hit hold? At least minDuration sixteenths each.
          const canFit = Math.min(remaining, Math.floor(hitDur / minDuration));
          if (canFit > 1) {
            // Subdivide this hit using the word shape.
            const sliceDurations = fitWordShapeToSlot(
              { label: shape.label, durations: shape.durations.slice(syllablesPlaced, syllablesPlaced + canFit), totalSixteenths: shape.durations.slice(syllablesPlaced, syllablesPlaced + canFit).reduce((a, b) => a + b, 0) },
              hitDur
            );
            for (let i = 0; i < canFit; i += 1) {
              const dur = sliceDurations[i] ?? minDuration;
              plans.push({ stroke, duration: Math.max(minDuration, Math.min(4, dur)) as 1 | 2 | 3 | 4 });
            }
            syllablesPlaced += canFit;
          } else {
            // Single syllable takes the whole hit.
            plans.push({ stroke, duration: Math.max(minDuration, Math.min(4, hitDur)) as 1 | 2 | 3 | 4 });
            syllablesPlaced += 1;
          }
          idx = hit.idx + 1;
        }

        if (plans.length > 0) {
          for (let si = 0; si < plans.length; si += 1) {
            const plan = plans[si];
            const stress = analysis.stressPattern[si] ?? 0;
            const syllable = analysis.syllables[si] ?? analysis.word;
            pushHit(plan.stroke, plan.duration, analysis, syllable, si, stress, false);
            recentStrokes.push(plan.stroke);
            if (recentStrokes.length > 4) recentStrokes.shift();
            if (plan.stroke !== 'D') unstressedIndex += 1;
          }
          lineTimelineCursor.set(lineIndex, idx);
          lineSyllableProgress.set(lineIndex, lineProgress + analysis.syllables.length);
          return;
        }
      }

      // Default strict-mode: one syllable per template hit.
      // For multi-syllable words, skip rests between syllables silently
      // (absorb into previous syllable duration) to prevent intra-word gaps.
      const skipRestsNoEmit = (startIdx: number): { idx: number; restGap: number } => {
        let i = startIdx;
        let gap = 0;
        let guard = 0;
        while (guard < 4096) {
          guard += 1;
          if (i >= templateTimeline.length) i = 0;
          const seg = templateTimeline[i];
          if (!seg || seg.kind !== 'rest') break;
          gap += seg.sixteenths;
          i += 1;
        }
        return { idx: i, restGap: gap };
      };
      // Check if this is the last word before a line break — if so, limit
      // rest emission so the word stays close to its phrase rather than
      // drifting across a long gap.
      const nextWordIndex = wordIndex + 1;
      const isLastWordBeforeLineBreak =
        nextWordIndex < analyses.length && lineStartWordIndices.has(nextWordIndex);
      const isLastWordOverall = nextWordIndex >= analyses.length;
      const keepWordCloseToPhrase = isLastWordBeforeLineBreak || isLastWordOverall;

      for (
        let syllableIndex = 0;
        syllableIndex < analysis.syllables.length;
        syllableIndex += 1
      ) {
        const stress = analysis.stressPattern[syllableIndex] ?? 0;
        const syllable = analysis.syllables[syllableIndex] ?? analysis.word;
        let idx: number;
        let absorbedRest = 0;
        if (syllableIndex === 0) {
          if (keepWordCloseToPhrase) {
            // For end-of-phrase words, absorb rests silently instead of
            // emitting them — this prevents a big gap before the final word.
            const result = skipRestsNoEmit(lineTimelineCursor.get(lineIndex) ?? 0);
            idx = result.idx;
          } else {
            idx = skipRests(lineTimelineCursor.get(lineIndex) ?? 0, maxIntraLineGap);
          }
        } else {
          const result = skipRestsNoEmit(lineTimelineCursor.get(lineIndex) ?? 0);
          idx = result.idx;
          absorbedRest = result.restGap;
        }
        if (idx >= templateTimeline.length) idx = 0;
        const hit = findNextHit(idx);
        if (!hit) {
          lineSyllableProgress.set(lineIndex, lineProgress + analysis.syllables.length);
          return;
        }
        const stroke = hit.seg.stroke;
        const baseDuration = Math.min(4, Math.max(1, hit.seg.sixteenths)) as 1 | 2 | 3 | 4;
        // When we absorbed rests between syllables of the same word,
        // add the gap to this syllable's duration (extending it backward).
        // Cap at 4 for readability.
        const duration = Math.min(4, baseDuration + absorbedRest) as 1 | 2 | 3 | 4;
        const tieSegments = isEndOfPhrase ? [duration] : splitForReadableTemplateTies(duration, duration);
        tieSegments.forEach((segmentDuration, segmentIndex) => {
          const isContinuation = segmentIndex > 0;
          pushHit(
            stroke,
            segmentDuration,
            analysis,
            isContinuation ? '' : syllable,
            syllableIndex,
            isContinuation ? 0 : stress,
            isContinuation
          );
        });
        recentStrokes.push(stroke);
        if (recentStrokes.length > 4) recentStrokes.shift();
        if (stroke !== 'D') unstressedIndex += 1;
        lineTimelineCursor.set(lineIndex, hit.idx + 1);
      }
      lineSyllableProgress.set(lineIndex, lineProgress + analysis.syllables.length);
      return;
    }

    for (
      let syllableIndex = 0;
      syllableIndex < analysis.syllables.length;
      syllableIndex += 1
    ) {
      const stress = analysis.stressPattern[syllableIndex] ?? 0;
      const syllable = analysis.syllables[syllableIndex] ?? analysis.word;
      const templatePos = lineProgress + syllableIndex;
      const templateDuration = getTemplateDurationAt(lineIndex, templatePos);
      const templateStroke = getTemplateStrokeAt(lineIndex, templatePos);
      const measurePosition =
        sixteenthsPerMeasure > 0 ? cursor % sixteenthsPerMeasure : 0;
      const beatOffset = measurePosition % beatUnitSixteenths;
      const toNextBeat = beatOffset === 0 ? 0 : beatUnitSixteenths - beatOffset;
      const stressAlignmentRoll = seededUnit(
        cursor,
        wordIndex,
        syllableIndex,
        stress
      );
      const isProtectedWordInterior =
        syllableIndex > 0 &&
        seededUnit(
          wordIndex,
          syllableIndex,
          analysis.syllables.length,
          rhythmVariationSeed
        ) < avoidIntraWordProtect;
      if (
        !suppressAlignmentRests &&
        stress > 0 &&
        !isProtectedWordInterior &&
        toNextBeat === 2 &&
        stressAlignmentRoll <
          stressAlign * (1 - templateFollowStrength)
      ) {
        pushRest(toNextBeat);
      }
      let preferredDuration = getPreferredDuration(
        analysis,
        syllableIndex,
        stress
      );
      if (templateDuration) {
        const deformAmount = Math.max(0, 1 - templateFollowStrength);
        preferredDuration = templateDuration;
        if (deformAmount > 0) {
          const deformRoll = seededUnit(
            wordIndex,
            syllableIndex,
            lineIndex,
            rhythmVariationSeed
          );
          if (deformRoll < deformAmount * 0.55) {
            const delta = deformRoll < deformAmount * 0.27 ? -1 : 1;
            preferredDuration = Math.max(
              1,
              Math.min(4, preferredDuration + delta)
            ) as 1 | 2 | 3 | 4;
          }
        }
      }
      if (!suppressAlignmentRests && tieCrossingBias >= 0.85 && stress > 0 && remainingInMeasure() <= 2) {
        preferredDuration = Math.max(3, preferredDuration) as 1 | 2 | 3 | 4;
      }
      const duration = chooseDuration(preferredDuration);
      const stroke = pickStroke(stress, templateStroke);
      const tieSegments = isEndOfPhrase
        ? [duration]
        : splitForReadableTemplateTies(duration, templateDuration);
      tieSegments.forEach((segmentDuration, segmentIndex) => {
        const isContinuation = segmentIndex > 0;
        pushHit(
          stroke,
          segmentDuration,
          analysis,
          isContinuation ? '' : syllable,
          syllableIndex,
          isContinuation ? 0 : stress,
          isContinuation
        );
      });
      recentStrokes.push(stroke);
      if (recentStrokes.length > 4) recentStrokes.shift();
      if (stroke !== 'D') unstressedIndex += 1;
    }
    lineSyllableProgress.set(
      lineIndex,
      lineProgress + analysis.syllables.length
    );
  };

  for (const analysis of analyses) {
    // Detect last word of a lyric line — suppress optional rests to keep
    // the final word tight against its phrase.
    const nextWI = wordIndex + 1;
    const isEndOfCurrentPhrase =
      (nextWI < analyses.length && lineStartWordIndices.has(nextWI)) ||
      nextWI >= analyses.length;

    const measurePosition =
      sixteenthsPerMeasure > 0 ? cursor % sixteenthsPerMeasure : 0;
    const beatOffset = measurePosition % beatUnitSixteenths;
    const toNextBeat = beatOffset === 0 ? 0 : beatUnitSixteenths - beatOffset;
    if (
      !isEndOfCurrentPhrase &&
      toNextBeat === 2 &&
      seededUnit(wordIndex, cursor, rhythmVariationSeed) <
        wordStartAlign * (1 - templateFollowStrength)
    ) {
      pushRest(toNextBeat);
    }

    if (lineStartWordIndices.has(wordIndex) && sixteenthsPerMeasure > 0) {
      const remaining = remainingInMeasure();
      let alignedToFreshBar = remaining === sixteenthsPerMeasure;
      if (remaining > 0 && remaining < sixteenthsPerMeasure) {
        // Strong line-break phrasing cue: start next lyric line at a fresh bar.
        pushRest(remaining);
        alignedToFreshBar = true;
      }
      if (alignedToFreshBar && cursor > 0) {
        const currentLineIndex = lineByWordIndex.get(wordIndex) ?? 0;
        const currentLineSyllables =
          lineSyllableCounts.get(currentLineIndex) ?? 0;
        const hasFollowingContent = wordIndex < analyses.length - 1;
        const shouldAddLineGap =
          hasFollowingContent &&
          currentLineSyllables >= 6 &&
          seededUnit(
            wordIndex,
            cursor,
            rhythmVariationSeed,
            soundVariationSeed
          ) < lineBreakGapBias;
        if (shouldAddLineGap) {
          // Keep a breathable pocket between lyric lines while preserving barline phrasing.
          const gap = Math.min(
            beatUnitSixteenths,
            Math.max(1, sixteenthsPerMeasure - 1)
          );
          pushRest(gap);
        }
      }
    }

    if (analysis.source === 'unresolved') {
      // Keep timing stable even in strict mode by inserting a short rest.
      pushRest(2);
      wordIndex += 1;
      continue;
    }

    const preferredWordDuration = analysis.syllables.reduce(
      (sum, _, syllableIndex) => {
        const stress = analysis.stressPattern[syllableIndex] ?? 0;
        return sum + getPreferredDuration(analysis, syllableIndex, stress);
      },
      0
    );
    const remaining = remainingInMeasure();
    const spill = preferredWordDuration - remaining;

    // Don't push the last word of a line into the next measure — it should
    // stay close to its phrase even if it slightly spills over the bar line.
    const nextWIdx = wordIndex + 1;
    const isEndOfPhrase =
      (nextWIdx < analyses.length && lineStartWordIndices.has(nextWIdx)) ||
      nextWIdx >= analyses.length;

    const shouldPadToNextMeasure =
      !isEndOfPhrase &&
      sixteenthsPerMeasure > 0 &&
      preferredWordDuration > remaining &&
      spill > maxWordSpillSixteenths &&
      remaining < sixteenthsPerMeasure;

    if (shouldPadToNextMeasure && !strictTimelineMode) {
      pushRest(remaining);
    }

    placeWordAtCurrentPosition(analysis, isEndOfCurrentPhrase, isEndOfCurrentPhrase);
    // Check if the NEXT word is the last word of its phrase — if so, skip
    // the optional post-word rest to avoid pushing the phrase-ending word
    // into a separate measure.
    const nextWordIdx = wordIndex + 1;
    const nextWordIsEndOfPhrase =
      nextWordIdx < analyses.length &&
      ((nextWordIdx + 1 < analyses.length && lineStartWordIndices.has(nextWordIdx + 1)) ||
       nextWordIdx + 1 >= analyses.length);
    if (
      !strictTimelineMode &&
      !isEndOfCurrentPhrase &&
      !nextWordIsEndOfPhrase &&
      restBias > 0 &&
      sixteenthsPerMeasure > 0 &&
      remainingInMeasure() > 1 &&
      cursor % sixteenthsPerMeasure !== 0 &&
      seededUnit(wordIndex, cursor, restBias, rhythmVariationSeed) <
        restBias * 0.18
    ) {
      pushRest(seededUnit(cursor, soundVariationSeed) < 0.65 ? 1 : 2);
    }
    wordIndex += 1;
  }

  if (sixteenthsPerMeasure <= 0) {
    return { notation: cells.join(''), hits };
  }

  const remainder = cells.length % sixteenthsPerMeasure;
  if (remainder !== 0) {
    pushRest(sixteenthsPerMeasure - remainder);
  }

  const measures: string[] = [];
  for (let index = 0; index < cells.length; index += sixteenthsPerMeasure) {
    measures.push(cells.slice(index, index + sixteenthsPerMeasure).join(''));
  }

  // Compact gaps within lyric lines so words don't drift apart.
  compactPhraseEndings(measures, hits, sixteenthsPerMeasure, lineStartWordIndices, analyses.length);

  // Landing note: reshape the ending so the final syllable resolves on a
  // strong beat (beat 1 or beat 3) with a D stroke.
  if (settings.landingNote !== 'off' && measures.length > 0) {
    applyLandingNote(measures, hits, sixteenthsPerMeasure);
  }

  if (measures.length === 0) {
    return { notation: '', hits };
  }

  const hasAnySoundingMeasure = measures.some((measure) =>
    /[DTK-]/.test(measure)
  );
  const retainedMeasureIndices: number[] = [];
  for (
    let measureIndex = 0;
    measureIndex < measures.length;
    measureIndex += 1
  ) {
    const measure = measures[measureIndex];
    const isEmptyMeasure = /^_+$/.test(measure);
    if (!isEmptyMeasure) {
      retainedMeasureIndices.push(measureIndex);
      continue;
    }
    if (!hasAnySoundingMeasure && retainedMeasureIndices.length === 0) {
      retainedMeasureIndices.push(measureIndex);
    }
  }

  const retainedSet = new Set(retainedMeasureIndices);
  const removedBeforeByMeasure: number[] = [];
  let removed = 0;
  for (
    let measureIndex = 0;
    measureIndex < measures.length;
    measureIndex += 1
  ) {
    if (!retainedSet.has(measureIndex)) {
      removed += 1;
    }
    removedBeforeByMeasure[measureIndex] = removed;
  }

  const normalizedMeasures = retainedMeasureIndices.map((measureIndex) => {
    const measure = measures[measureIndex] ?? '';
    if (/^_+$/.test(measure)) return '_'.repeat(sixteenthsPerMeasure);
    return measure;
  });
  let normalizedHits = hits.map((hit) => {
    const originalMeasureIndex = Math.floor(
      hit.startSixteenth / sixteenthsPerMeasure
    );
    const removedBefore =
      originalMeasureIndex > 0
        ? (removedBeforeByMeasure[originalMeasureIndex - 1] ?? 0)
        : 0;
    const shift = removedBefore * sixteenthsPerMeasure;
    return {
      ...hit,
      startSixteenth: hit.startSixteenth - shift,
    };
  });

  // --- Post-processing: A/B half-measure variations ---
  // Only apply rests at the END of measures (second half → rest), and only
  // on measures that end a lyric line or have no words in the second half.
  if (
    settings.phrasing === 'halfMeasureVariations' &&
    normalizedMeasures.length >= 2
  ) {
    const halfLen = Math.floor(sixteenthsPerMeasure / 2);
    const firstMeasure = normalizedMeasures[0] ?? '';
    const halfA = firstMeasure.slice(0, halfLen);
    const halfB = firstMeasure.slice(halfLen, sixteenthsPerMeasure);
    const restHalf = '_'.repeat(halfLen);

    // Find which measures end a lyric line (last hit in the measure is
    // the last syllable of a word at the end of a line).
    const lastHitMeasure = new Map<number, number>();
    for (const hit of normalizedHits) {
      const mi = Math.floor(hit.startSixteenth / sixteenthsPerMeasure);
      lastHitMeasure.set(mi, hit.startSixteenth + hit.durationSixteenths);
    }

    for (let mi = 1; mi < normalizedMeasures.length; mi++) {
      const comboRoll = seededUnit(rhythmVariationSeed, mi, 777);
      const measureStart = mi * sixteenthsPerMeasure;
      const measureEnd = measureStart + sixteenthsPerMeasure;
      const halfwayPoint = measureStart + halfLen;

      // Check if the second half of this measure has any word hits.
      const hasWordsInSecondHalf = normalizedHits.some(
        (hit) =>
          hit.startSixteenth >= halfwayPoint &&
          hit.startSixteenth < measureEnd &&
          hit.word !== ''
      );

      // Only use rest combos that put rests in the second half, and only
      // when that half has no words (phrase boundary).
      const canRestSecondHalf = !hasWordsInSecondHalf;

      const combos: [string, string, number][] = [
        [halfA, halfB, 40],
        [halfA, halfA, 15],
        [halfB, halfB, 15],
        [halfB, halfA, 8],
      ];
      if (canRestSecondHalf) {
        combos.push([halfA, restHalf, 12]);
        combos.push([halfB, restHalf, 10]);
      }
      const totalW = combos.reduce((s, [, , w]) => s + w, 0);
      let thresh = comboRoll * totalW;
      let first = halfA;
      let second = halfB;
      for (const [f, s, w] of combos) {
        thresh -= w;
        if (thresh <= 0) {
          first = f;
          second = s;
          break;
        }
      }
      const combo = first + second;
      const original = normalizedMeasures[mi] ?? '';

      // Build a set of positions inside this measure that carry a word hit.
      // These positions must never be replaced by rests/continuations so that
      // words are never silently removed by A/B variation swaps.
      const wordHitPositions = new Set<number>();
      for (const hit of normalizedHits) {
        if (
          hit.word !== '' &&
          hit.startSixteenth >= measureStart &&
          hit.startSixteenth < measureEnd
        ) {
          wordHitPositions.add(hit.startSixteenth - measureStart);
        }
      }

      // Merge: original rests/continuations are always preserved (structural
      // gaps between lyric lines stay intact). Positions with word hits are
      // protected — only stroke-to-stroke swaps are allowed there. Non-word
      // stroke positions can freely adopt the swap pattern.
      let newMeasure = '';
      for (let i = 0; i < sixteenthsPerMeasure; i++) {
        const orig = i < original.length ? original[i] : '_';
        const swap = i < combo.length ? combo[i] : '_';
        if (orig === '_' || orig === '-') {
          newMeasure += orig;
        } else if (wordHitPositions.has(i) && (swap === '_' || swap === '-')) {
          newMeasure += orig;
        } else {
          newMeasure += swap;
        }
      }

      // When a non-word stroke position becomes a rest or continuation,
      // remove the corresponding hit so the hitMap stays aligned.
      normalizedHits = normalizedHits.map((hit) => {
        if (
          hit.startSixteenth >= measureStart &&
          hit.startSixteenth < measureEnd
        ) {
          const pos = hit.startSixteenth - measureStart;
          const cell = newMeasure[pos];
          if (cell === '_' || cell === '-') {
            return { ...hit, durationSixteenths: 0 };
          }
        }
        return hit;
      }).filter((hit) => hit.durationSixteenths > 0);

      normalizedMeasures[mi] = newMeasure;
    }
  }

  return { notation: normalizedMeasures.join('|'), hits: normalizedHits };
}

export function generateWordRhythm(
  input: string,
  options: GenerateOptions
): WordRhythmResult {
  const rhythmSeed = options.rhythmVariationSeed ?? options.variationSeed ?? 0;
  const soundSeed = options.soundVariationSeed ?? options.variationSeed ?? 0;
  const analyses: WordAnalysis[] = [];
  const lineStartWordIndices = new Set<number>();
  const lineByWordIndex = new Map<number, number>();
  const lineSyllableCounts = new Map<number, number>();
  const lines = input.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const lineWordStartIndex = analyses.length;
    const tokens = line.match(TOKEN_REGEX) ?? [];
    let lineAddedWords = 0;
    let lineSyllables = 0;
    for (const token of tokens) {
      const expandedWords = NUMBER_REGEX.test(token)
        ? expandNumericToken(token)
        : null;
      const wordsToAnalyze = expandedWords ?? (WORD_REGEX.test(token) ? [token] : []);
      for (const wordToken of wordsToAnalyze) {
        const analysis = analyzeWord(
          wordToken,
          options.strictDictionaryMode,
          rhythmSeed + soundSeed + analyses.length
        );
        lineByWordIndex.set(analyses.length, lineIndex);
        lineSyllables += analysis.syllables.length;
        analyses.push(analysis);
        lineAddedWords += 1;
      }
    }
    if (lineAddedWords > 0 && lineWordStartIndex > 0) {
      lineStartWordIndices.add(lineWordStartIndex);
    }
    if (lineAddedWords > 0) {
      lineSyllableCounts.set(lineIndex, lineSyllables);
    }
  }

  const mapped = buildNotationFromAnalyses(
    analyses,
    options.timeSignature,
    rhythmSeed,
    soundSeed,
    lineStartWordIndices,
    lineByWordIndex,
    lineSyllableCounts,
    options.generationSettings
  );
  const dictionaryCount = analyses.filter(
    (item) => item.source === 'dictionary'
  ).length;
  const heuristicCount = analyses.filter(
    (item) => item.source === 'heuristic'
  ).length;
  const unresolvedCount = analyses.filter(
    (item) => item.source === 'unresolved'
  ).length;

  return {
    notation: mapped.notation,
    analyses,
    hits: mapped.hits,
    dictionaryCount,
    heuristicCount,
    unresolvedCount,
  };
}
