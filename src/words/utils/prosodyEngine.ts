import { dictionary } from 'cmu-pronouncing-dictionary';
import { syllable as estimateSyllables } from 'syllable';
import {
  getSixteenthsPerMeasure,
  getDefaultBeatGrouping,
  getBeatGroupingInSixteenths,
} from '../../shared/rhythm/timeSignatureUtils';
import type { TimeSignature } from '../../shared/rhythm/types';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';

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
  generationSettings?: Partial<WordRhythmAdvancedSettings>;
}

export interface WordRhythmAdvancedSettings {
  adventurousness: number;
  dottedBias: number;
  sixteenthBias: number;
  tieCrossingBias: number;
  midMeasureRestBias: number;
  templateBias: number;
  motifVariation: number;
  alignWordStartsToBeats: number;
  alignStressToMajorBeats: number;
  avoidIntraWordRests: number;
  lineBreakGapBias: number;
  templateNotation?: string;
}

export const DEFAULT_WORD_RHYTHM_SETTINGS: WordRhythmAdvancedSettings = {
  adventurousness: 45,
  dottedBias: 40,
  sixteenthBias: 35,
  tieCrossingBias: 40,
  midMeasureRestBias: 0,
  templateBias: 35,
  motifVariation: 30,
  alignWordStartsToBeats: 70,
  alignStressToMajorBeats: 75,
  avoidIntraWordRests: 85,
  lineBreakGapBias: 70,
  templateNotation: '',
};

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

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function mergeAdvancedSettings(
  overrides?: Partial<WordRhythmAdvancedSettings>
): WordRhythmAdvancedSettings {
  return {
    ...DEFAULT_WORD_RHYTHM_SETTINGS,
    ...overrides,
    adventurousness: clampPercent(
      overrides?.adventurousness ?? DEFAULT_WORD_RHYTHM_SETTINGS.adventurousness
    ),
    dottedBias: clampPercent(
      overrides?.dottedBias ?? DEFAULT_WORD_RHYTHM_SETTINGS.dottedBias
    ),
    sixteenthBias: clampPercent(
      overrides?.sixteenthBias ?? DEFAULT_WORD_RHYTHM_SETTINGS.sixteenthBias
    ),
    tieCrossingBias: clampPercent(
      overrides?.tieCrossingBias ?? DEFAULT_WORD_RHYTHM_SETTINGS.tieCrossingBias
    ),
    midMeasureRestBias: clampPercent(
      overrides?.midMeasureRestBias ??
        DEFAULT_WORD_RHYTHM_SETTINGS.midMeasureRestBias
    ),
    templateBias: clampPercent(
      overrides?.templateBias ?? DEFAULT_WORD_RHYTHM_SETTINGS.templateBias
    ),
    motifVariation: clampPercent(
      overrides?.motifVariation ?? DEFAULT_WORD_RHYTHM_SETTINGS.motifVariation
    ),
    alignWordStartsToBeats: clampPercent(
      overrides?.alignWordStartsToBeats ??
        DEFAULT_WORD_RHYTHM_SETTINGS.alignWordStartsToBeats
    ),
    alignStressToMajorBeats: clampPercent(
      overrides?.alignStressToMajorBeats ??
        DEFAULT_WORD_RHYTHM_SETTINGS.alignStressToMajorBeats
    ),
    avoidIntraWordRests: clampPercent(
      overrides?.avoidIntraWordRests ??
        DEFAULT_WORD_RHYTHM_SETTINGS.avoidIntraWordRests
    ),
    lineBreakGapBias: clampPercent(
      overrides?.lineBreakGapBias ??
        DEFAULT_WORD_RHYTHM_SETTINGS.lineBreakGapBias
    ),
    templateNotation:
      overrides?.templateNotation ??
      DEFAULT_WORD_RHYTHM_SETTINGS.templateNotation,
  };
}

function seededUnit(...seeds: number[]): number {
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

function buildNotationFromAnalyses(
  analyses: WordAnalysis[],
  timeSignature: TimeSignature,
  rhythmVariationSeed = 0,
  soundVariationSeed = 0,
  lineStartWordIndices = new Set<number>(),
  lineByWordIndex = new Map<number, number>(),
  lineSyllableCounts = new Map<number, number>(),
  generationSettings?: Partial<WordRhythmAdvancedSettings>
): { notation: string; hits: SyllableHit[] } {
  type Stroke = 'D' | 'T' | 'K';
  type VariationMode = 'tight' | 'balanced' | 'open';
  const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
  const beatUnitSixteenths = Math.max(
    1,
    Math.round(16 / Math.max(1, timeSignature.denominator))
  );
  const settings = mergeAdvancedSettings(generationSettings);
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
  const adventurousness = settings.adventurousness / 100;
  const templateBias = settings.templateBias / 100;
  const motifVariation = settings.motifVariation / 100;
  const dottedBias = settings.dottedBias / 100;
  const sixteenthBias = settings.sixteenthBias / 100;
  const tieCrossingBias = settings.tieCrossingBias / 100;
  const restBias = settings.midMeasureRestBias / 100;
  const alignWordStartsToBeats = settings.alignWordStartsToBeats / 100;
  const alignStressToMajorBeats = settings.alignStressToMajorBeats / 100;
  const avoidIntraWordRests = settings.avoidIntraWordRests / 100;
  const lineBreakGapBias = settings.lineBreakGapBias / 100;
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
  const templateDurations = templatePulse.durations;
  const isTemplatePhaseLocked =
    templateDurations.length > 0 && templateBias >= 0.85;
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
      seededUnit(seedOffset, templateDurations.length) < templateBias
        ? templateDurations
        : defaultMotif.length > 0
          ? defaultMotif
          : [2, 2, 4, 2];
    if (templateDurations.length > 0 && templateBias >= 0.95) {
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
        return Math.max(1, duration - 1);
      if (variationRoll > 1 - motifVariation * 0.2)
        return Math.min(4, duration + 1);
      return duration;
    });
    const withAdventure = transformed.map((duration, motifIndex) => {
      const roll = seededUnit(seedOffset, motifIndex, adventurousness);
      if (roll < sixteenthBias * 0.25) return 1;
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
    // When template influence is high, split dotted-like values into tied chunks
    // so the base pulse stays visually obvious (e.g. 3 -> 2+1).
    // Preserve template triplet-like anchors (3 sixteenths) so grooves like Malfuf (3-3-2)
    // and Ayoub keep their characteristic swing in notation.
    if (templateDuration === 3) return [3];
    if (templateBias >= 0.7 && duration === 3) return [2, 1];
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
      const deformation = Math.max(0, 1 - templateBias);
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
    if (!templateStroke || templateBias < 0.96) {
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
        preferred = Math.max(1, preferred - 1) as 1 | 2 | 3 | 4;
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
      preferred * (1 - templateBias) + motifDuration * templateBias
    );
    preferred = Math.max(1, Math.min(4, blended)) as 1 | 2 | 3 | 4;

    if (templateBias >= 0.9) {
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
    if (adventureRoll < sixteenthBias * 0.2) preferred = 1;
    if (adventureRoll > 1 - dottedBias * 0.22 && preferred <= 2) preferred = 3;
    if (
      adventureRoll > 1 - adventurousness * 0.12 &&
      stress > 0 &&
      preferred <= 3
    )
      preferred = 4;
    return preferred;
  };

  const placeWordAtCurrentPosition = (analysis: WordAnalysis) => {
    const lineIndex = lineByWordIndex.get(wordIndex) ?? 0;
    const lineProgress = lineSyllableProgress.get(lineIndex) ?? 0;
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
        ) < avoidIntraWordRests;
      if (
        stress > 0 &&
        !isProtectedWordInterior &&
        toNextBeat === 2 &&
        stressAlignmentRoll < alignStressToMajorBeats * (1 - templateBias)
      ) {
        pushRest(toNextBeat);
      }
      let preferredDuration = getPreferredDuration(
        analysis,
        syllableIndex,
        stress
      );
      if (templateDuration) {
        const deformAmount = Math.max(0, 1 - templateBias);
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
      if (tieCrossingBias >= 0.85 && stress > 0 && remainingInMeasure() <= 2) {
        preferredDuration = Math.max(3, preferredDuration) as 1 | 2 | 3 | 4;
      }
      const duration = chooseDuration(preferredDuration);
      const stroke = pickStroke(stress, templateStroke);
      const tieSegments = splitForReadableTemplateTies(
        duration,
        templateDuration
      );
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
    const measurePosition =
      sixteenthsPerMeasure > 0 ? cursor % sixteenthsPerMeasure : 0;
    const beatOffset = measurePosition % beatUnitSixteenths;
    const toNextBeat = beatOffset === 0 ? 0 : beatUnitSixteenths - beatOffset;
    if (
      toNextBeat === 2 &&
      seededUnit(wordIndex, cursor, rhythmVariationSeed) <
        alignWordStartsToBeats * (1 - templateBias)
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
    const shouldPadToNextMeasure =
      sixteenthsPerMeasure > 0 &&
      preferredWordDuration > remaining &&
      spill > maxWordSpillSixteenths &&
      remaining < sixteenthsPerMeasure;

    if (shouldPadToNextMeasure) {
      pushRest(remaining);
    }

    placeWordAtCurrentPosition(analysis);
    if (
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
  const normalizedHits = hits.map((hit) => {
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
