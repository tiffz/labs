import { dictionary } from 'cmu-pronouncing-dictionary';
import { syllable as estimateSyllables } from 'syllable';
import { getSixteenthsPerMeasure } from '../../shared/rhythm/timeSignatureUtils';
import type { TimeSignature } from '../types';

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
}

interface PronunciationAnalysis {
  stressPattern: number[];
  syllableCount: number;
}

const STRESS_PHONEME_REGEX = /\d$/;
const WORD_REGEX = /[A-Za-z']+/;
const TOKEN_REGEX = /[A-Za-z']+|[.,!?;:]/g;
const STRONG_ENDING_REGEX = /(tion|sion|ic|ity|ian|ious|ive|ette|eer|ese)$/i;

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
}

function normalizeWord(rawWord: string): string {
  return rawWord.toLowerCase().replace(/[^a-z']/g, '');
}

function splitByVowelGroups(word: string): string[] {
  const displayWord = word.replace(/[^A-Za-z']/g, '');
  const collapsedApostrophes = displayWord.replace(/'/g, '');
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
    const boundary = Math.max(currentEnd, Math.floor((currentEnd + nextStart) / 2));
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
    caseMappedSlices.push(collapsedApostrophes.slice(rawStart, rawStart + sliceLength));
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
      (bestIdx, part, index, list) => (part.length > list[bestIdx].length ? index : bestIdx),
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
  const noApostrophe = baseWord.replace(/'/g, '');
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

function getHeuristicStressPattern(word: string, syllableCount: number): number[] {
  if (syllableCount <= 1) return [1];

  const pattern = new Array<number>(syllableCount).fill(0);
  const baseStressIndex = STRONG_ENDING_REGEX.test(word) && syllableCount > 1 ? syllableCount - 2 : 0;
  pattern[Math.max(0, baseStressIndex)] = 1;
  return pattern;
}

function analyzeWord(word: string, strictDictionaryMode: boolean): WordAnalysis {
  const normalized = normalizeWord(word);
  if (!normalized) {
    return { word, syllables: [word], stressPattern: [1], source: 'unresolved' };
  }

  const pronunciations = lookupPronunciations(normalized);
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

  const heuristicInput = normalized.replace(/'/g, '');
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

function buildNotationFromAnalyses(
  analyses: WordAnalysis[],
  timeSignature: TimeSignature,
  rhythmVariationSeed = 0,
  soundVariationSeed = 0,
  lineStartWordIndices = new Set<number>(),
  lineByWordIndex = new Map<number, number>(),
  lineSyllableCounts = new Map<number, number>()
): { notation: string; hits: SyllableHit[] } {
  type Stroke = 'D' | 'T' | 'K';
  type VariationMode = 'tight' | 'balanced' | 'open';
  const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
  const beatUnitSixteenths = Math.max(1, Math.round(16 / Math.max(1, timeSignature.denominator)));
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
  const maxWordSpillSixteenths = 2;
  const recentStrokes: Stroke[] = [];

  const pushHit = (
    stroke: 'D' | 'T' | 'K',
    durationSixteenths: number,
    analysis: WordAnalysis,
    syllable: string,
    syllableIndex: number,
    stress: number
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
    });
    cursor += durationSixteenths;
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
    if (overflow > 0 && overflow <= maxWordSpillSixteenths) {
      // Allow small spill for natural ties over barlines.
      return preferred;
    }
    if (remaining >= 2) return 2;
    return 1;
  };

  const isMajorBeat = (measurePosition: number) => measurePosition % beatUnitSixteenths === 0;

  const expectedMajorBeatStroke = (measurePosition: number): Stroke => {
    const beatIndex = Math.floor(measurePosition / beatUnitSixteenths);
    // Grounding low sound on odd beats (1,3), snare-like answer on even beats (2,4).
    return beatIndex % 2 === 0 ? 'D' : 'T';
  };

  const pickStroke = (stress: number): Stroke => {
    const measurePosition = sixteenthsPerMeasure > 0 ? cursor % sixteenthsPerMeasure : 0;
    const previous = recentStrokes[recentStrokes.length - 1];
    const previous2 = recentStrokes[recentStrokes.length - 2];

    let stroke: Stroke;
    if (isMajorBeat(measurePosition)) {
      stroke = expectedMajorBeatStroke(measurePosition);
    } else {
      const offbeatChoice = (wordIndex + unstressedIndex + soundVariationSeed + measurePosition) % 4;
      stroke = stress > 0 ? (offbeatChoice === 0 ? 'K' : 'T') : offbeatChoice <= 1 ? 'K' : 'T';
      if (previous === 'K') {
        stroke = 'T';
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

  const getLineTargetDuration = (currentWordIndex: number, syllableIndex: number, stress: number): 1 | 2 | 3 | 4 => {
    const lineIndex = lineByWordIndex.get(currentWordIndex);
    const lineSyllables = lineIndex !== undefined ? lineSyllableCounts.get(lineIndex) : undefined;
    const targetLineSixteenths = Math.max(8, sixteenthsPerMeasure * 2);
    const avg = lineSyllables && lineSyllables > 0 ? targetLineSixteenths / lineSyllables : 2;
    const isLineAnchor = syllableIndex === 0;
    if (avg <= 1.4) return stress > 0 && isLineAnchor ? 2 : 1;
    if (avg <= 2.2) return stress > 0 && isLineAnchor ? 3 : 2;
    if (avg <= 3.2) return stress > 0 && isLineAnchor ? 4 : 3;
    return stress > 0 && isLineAnchor ? 4 : 3;
  };

  const getPreferredDuration = (
    analysis: WordAnalysis,
    syllableIndex: number,
    stress: number
  ): 1 | 2 | 3 | 4 => {
    const isWordAnchor = syllableIndex === 0;
    const isLongWord = analysis.syllables.length >= 4;
    const lineDurationBias = getLineTargetDuration(wordIndex, syllableIndex, stress);
    const grooveAnchorBoost =
      isWordAnchor && stress > 0 && (wordIndex + rhythmVariationSeed) % 4 === 0 ? 1 : 0;
    let preferred = Math.min(4, lineDurationBias + grooveAnchorBoost) as 1 | 2 | 3 | 4;

    // Long words (e.g. watermelon) are often spoken faster in rhythmic mnemonics.
    if (isLongWord) {
      if (variationMode === 'tight') {
        preferred = stress > 0 && isWordAnchor ? 2 : 1;
      } else if (variationMode === 'balanced') {
        preferred = stress > 0 && isWordAnchor ? 2 : Math.min(2, preferred) as 1 | 2;
      } else {
        preferred = stress > 0 && isWordAnchor ? Math.min(3, preferred) as 1 | 2 | 3 : Math.min(2, preferred) as 1 | 2;
      }
    }

    if (!isLongWord) {
      if (variationMode === 'tight') {
        preferred = Math.max(1, preferred - 1) as 1 | 2 | 3 | 4;
      } else if (variationMode === 'open') {
        preferred = Math.min(4, preferred + (stress > 0 ? 1 : 0)) as 1 | 2 | 3 | 4;
      }
    }

    const microVariation = (wordIndex * 3 + syllableIndex + rhythmVariationSeed) % 5;
    if (microVariation === 0 && preferred > 1 && variationMode !== 'open') {
      preferred = (preferred - 1) as 1 | 2 | 3 | 4;
    } else if (microVariation === 4 && preferred < 4 && stress > 0 && variationMode !== 'tight') {
      preferred = (preferred + 1) as 1 | 2 | 3 | 4;
    }
    return preferred;
  };

  const placeWordAtCurrentPosition = (analysis: WordAnalysis) => {
    for (let syllableIndex = 0; syllableIndex < analysis.syllables.length; syllableIndex += 1) {
      const stress = analysis.stressPattern[syllableIndex] ?? 0;
      const syllable = analysis.syllables[syllableIndex] ?? analysis.word;
      const preferredDuration = getPreferredDuration(analysis, syllableIndex, stress);
      const duration = chooseDuration(preferredDuration);
      const stroke = pickStroke(stress);
      pushHit(stroke, duration, analysis, syllable, syllableIndex, stress);
      recentStrokes.push(stroke);
      if (recentStrokes.length > 4) recentStrokes.shift();
      if (stroke !== 'D') unstressedIndex += 1;
    }
  };

  for (const analysis of analyses) {
    if (lineStartWordIndices.has(wordIndex) && sixteenthsPerMeasure > 0) {
      const remaining = remainingInMeasure();
      if (remaining > 0 && remaining < sixteenthsPerMeasure) {
        // Strong line-break phrasing cue: start next lyric line at a fresh bar.
        pushRest(remaining);
      }
    }

    if (analysis.source === 'unresolved') {
      // Keep timing stable even in strict mode by inserting a short rest.
      pushRest(2);
      wordIndex += 1;
      continue;
    }

    const preferredWordDuration = analysis.syllables.reduce((sum, _, syllableIndex) => {
      const stress = analysis.stressPattern[syllableIndex] ?? 0;
      return sum + getPreferredDuration(analysis, syllableIndex, stress);
    }, 0);
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

  return { notation: measures.join('|'), hits };
}

export function generateWordRhythm(input: string, options: GenerateOptions): WordRhythmResult {
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
      if (!WORD_REGEX.test(token)) continue;
      const analysis = analyzeWord(token, options.strictDictionaryMode);
      lineByWordIndex.set(analyses.length, lineIndex);
      lineSyllables += analysis.syllables.length;
      analyses.push(analysis);
      lineAddedWords += 1;
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
    lineSyllableCounts
  );
  const dictionaryCount = analyses.filter((item) => item.source === 'dictionary').length;
  const heuristicCount = analyses.filter((item) => item.source === 'heuristic').length;
  const unresolvedCount = analyses.filter((item) => item.source === 'unresolved').length;

  return {
    notation: mapped.notation,
    analyses,
    hits: mapped.hits,
    dictionaryCount,
    heuristicCount,
    unresolvedCount,
  };
}
