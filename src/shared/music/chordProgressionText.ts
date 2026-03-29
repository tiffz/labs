import { romanNumeralToChord } from './chordTheory';
import type { ChordQuality, Key, RomanNumeral } from './chordTypes';
import { ALL_KEYS } from './randomization';
import {
  NOTE_TO_PITCH_CLASS,
  spellPitchClass as spellPitchClassForKey,
  spellRootForKey,
} from './theory/pitchClass';

const PROGRESSION_SEPARATOR_REGEX = /\s*(?:[–—-]|,)\s*/;
const ROMAN_TOKEN_REGEX = /^(?:I|II|III|IV|V|VI|VII|i|ii|iii|iv|v|vi|vii)$/;
const CHORD_TOKEN_REGEX =
  /^[A-G](?:#|b)?(?:m|maj7|m7|7|sus|sus2|sus4|dim|aug)?(?:\/[A-G](?:#|b)?)?$/i;
const SHIFT_CANDIDATES = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6] as const;

const MAJOR_DIATONIC_QUALITY_BY_DEGREE: Record<number, ChordQuality[]> = {
  1: ['major', 'major7'],
  2: ['minor', 'minor7'],
  3: ['minor', 'minor7'],
  4: ['major', 'major7'],
  5: ['major', 'dominant7'],
  6: ['minor', 'minor7'],
  7: ['diminished'],
};

const ROMAN_BY_DEGREE: Record<number, RomanNumeral> = {
  1: 'I',
  2: 'ii',
  3: 'iii',
  4: 'IV',
  5: 'V',
  6: 'vi',
  7: 'vii',
};

const QUALITY_SUFFIX: Record<ChordQuality, string> = {
  major: '',
  minor: 'm',
  diminished: 'dim',
  augmented: 'aug',
  sus2: 'sus2',
  sus4: 'sus4',
  dominant7: '7',
  major7: 'maj7',
  minor7: 'm7',
};

export interface ParsedChordToken {
  root: string;
  quality: ChordQuality;
  bassRoot?: string;
}

export interface ParsedProgressionText {
  isValid: boolean;
  format: 'empty' | 'roman' | 'chord' | 'invalid';
  tokens: string[];
  chordSymbols: string[];
  romanNumerals: RomanNumeral[];
  romanNumeralDisplay: string[];
  inferredKey: Key | null;
  resolvedKey: Key | null;
  resolvedChordSymbols: string[];
  resolvedDisplay: string;
}

export interface ParseProgressionTextOptions {
  keyAware?: boolean;
  inferKey?: boolean;
}

function tokenizeProgressionInput(input: string): string[] {
  return input
    .trim()
    .split(PROGRESSION_SEPARATOR_REGEX)
    .map((token) => token.trim())
    .filter(Boolean);
}

function spellRoot(root: string, key: Key): string {
  return spellRootForKey(root, key);
}

function spellPitchClass(pitchClass: number, key: Key): string {
  return spellPitchClassForKey(pitchClass, key);
}

export function parseChordSymbolToken(token: string): ParsedChordToken | null {
  const match = token.match(
    /^([A-G](?:#|b)?)(maj7|m7|m|7|sus|sus2|sus4|dim|aug)?(?:\/([A-G](?:#|b)?))?$/i
  );
  if (!match) return null;
  const root = `${match[1]?.[0]?.toUpperCase() ?? 'C'}${(match[1] ?? '').slice(1)}`;
  const suffix = (match[2] ?? '').toLowerCase();
  const bassRootRaw = match[3];
  const bassRoot = bassRootRaw
    ? `${bassRootRaw[0]?.toUpperCase() ?? 'C'}${bassRootRaw.slice(1)}`
    : undefined;
  const qualityBySuffix: Record<string, ChordQuality> = {
    '': 'major',
    m: 'minor',
    dim: 'diminished',
    aug: 'augmented',
    sus2: 'sus2',
    sus4: 'sus4',
    sus: 'sus4',
    '7': 'dominant7',
    maj7: 'major7',
    m7: 'minor7',
  };
  const quality = qualityBySuffix[suffix];
  if (!quality) return null;
  return { root, quality, bassRoot };
}

function normalizeChordToken(token: string, key: Key): string | null {
  const parsed = parseChordSymbolToken(token);
  if (!parsed) return null;
  const slashSuffix = parsed.bassRoot ? `/${spellRoot(parsed.bassRoot, key)}` : '';
  return `${spellRoot(parsed.root, key)}${QUALITY_SUFFIX[parsed.quality] ?? ''}${slashSuffix}`;
}

function romanToChordSymbols(romanTokens: RomanNumeral[], key: Key): string[] {
  return romanTokens.map((token) => {
    const chord = romanNumeralToChord(token, key);
    return `${spellRoot(chord.root, key)}${QUALITY_SUFFIX[chord.quality] ?? ''}`;
  });
}

function getMajorScalePitchClasses(key: Key): number[] {
  const tonicPc = NOTE_TO_PITCH_CLASS[key];
  if (tonicPc === undefined) return [];
  const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];
  return majorScaleIntervals.map((interval) => (tonicPc + interval) % 12);
}

function findDegreeInKey(chordRootPc: number, key: Key): number | null {
  const degrees = getMajorScalePitchClasses(key);
  const index = degrees.findIndex((pitchClass) => pitchClass === chordRootPc);
  return index >= 0 ? index + 1 : null;
}

function chordFitsDiatonicMajor(token: ParsedChordToken, key: Key): boolean {
  const rootPc = NOTE_TO_PITCH_CLASS[token.root];
  if (rootPc === undefined) return false;
  const degree = findDegreeInKey(rootPc, key);
  if (!degree) return false;
  return (
    MAJOR_DIATONIC_QUALITY_BY_DEGREE[degree]?.includes(token.quality) ?? false
  );
}

function chordTokensToRoman(
  tokens: ParsedChordToken[],
  key: Key
): RomanNumeral[] | null {
  const converted: RomanNumeral[] = [];
  for (const token of tokens) {
    const rootPc = NOTE_TO_PITCH_CLASS[token.root];
    if (rootPc === undefined) return null;
    const degree = findDegreeInKey(rootPc, key);
    if (!degree) return null;
    if (
      !(
        MAJOR_DIATONIC_QUALITY_BY_DEGREE[degree]?.includes(token.quality) ??
        false
      )
    )
      return null;
    const roman = ROMAN_BY_DEGREE[degree];
    if (!roman) return null;
    converted.push(roman);
  }
  return converted;
}

function qualityToRomanSuffix(quality: ChordQuality): string {
  switch (quality) {
    case 'sus2':
      return 'sus2';
    case 'sus4':
      return 'sus4';
    case 'dominant7':
      return '7';
    case 'major7':
      return 'maj7';
    case 'minor7':
      return 'm7';
    case 'augmented':
      return 'aug';
    case 'diminished':
      return 'dim';
    default:
      return '';
  }
}

function tokenToRomanDisplay(token: ParsedChordToken, key: Key): string | null {
  const rootPc = NOTE_TO_PITCH_CLASS[token.root];
  if (rootPc === undefined) return null;
  const degree = findDegreeInKey(rootPc, key);
  if (!degree) return null;
  const roman = ROMAN_BY_DEGREE[degree];
  if (!roman) return null;
  const qualitySuffix = qualityToRomanSuffix(token.quality);
  if (!token.bassRoot) return `${roman}${qualitySuffix}`;

  const bassPc = NOTE_TO_PITCH_CLASS[token.bassRoot];
  if (bassPc === undefined) return `${roman}${qualitySuffix}`;
  const bassDegree = findDegreeInKey(bassPc, key);
  if (!bassDegree) return `${roman}${qualitySuffix}/${token.bassRoot}`;
  return `${roman}${qualitySuffix}/${bassDegree}`;
}

function transposeChordTokens(
  tokens: ParsedChordToken[],
  semitoneShift: number,
  key: Key
): ParsedChordToken[] {
  return tokens.map((token) => {
    const rootPc = NOTE_TO_PITCH_CLASS[token.root] ?? 0;
    const shiftedRoot = spellPitchClass(rootPc + semitoneShift, key);
    return { ...token, root: shiftedRoot };
  });
}

function findBestDiatonicFit(
  tokens: ParsedChordToken[],
  selectedKey: Key
): { key: Key; romanNumerals: RomanNumeral[]; chordSymbols: string[] } | null {
  let best:
    | {
        key: Key;
        shift: number;
        romanNumerals: RomanNumeral[];
        chordSymbols: string[];
        score: number;
      }
    | null = null;

  for (const key of ALL_KEYS) {
    for (const shift of SHIFT_CANDIDATES) {
      const shiftedTokens = transposeChordTokens(tokens, shift, key);
      const romanNumerals = chordTokensToRoman(shiftedTokens, key);
      if (!romanNumerals || romanNumerals.length < 2) continue;
      const chordSymbols = shiftedTokens.map(
        (token) => `${spellRoot(token.root, key)}${QUALITY_SUFFIX[token.quality] ?? ''}`
      );
      const firstDegreeBonus = romanNumerals[0] === 'I' ? 1 : 0;
      const selectedKeyBonus = key === selectedKey ? 0.2 : 0;
      const shiftPenalty = Math.abs(shift) * 0.05;
      const score = firstDegreeBonus + selectedKeyBonus - shiftPenalty;
      if (!best || score > best.score) {
        best = { key, shift, romanNumerals, chordSymbols, score };
      }
    }
  }

  if (!best) return null;
  return {
    key: best.key,
    romanNumerals: best.romanNumerals,
    chordSymbols: best.chordSymbols,
  };
}

function rootPatternToRoman(tokens: ParsedChordToken[], key: Key): RomanNumeral[] | null {
  const converted: RomanNumeral[] = [];
  for (const token of tokens) {
    const rootPc = NOTE_TO_PITCH_CLASS[token.root];
    if (rootPc === undefined) return null;
    const degree = findDegreeInKey(rootPc, key);
    if (!degree) return null;
    const roman = ROMAN_BY_DEGREE[degree];
    if (!roman) return null;
    converted.push(roman);
  }
  return converted;
}

function findBestRootPatternFit(
  tokens: ParsedChordToken[],
  selectedKey: Key
): { key: Key; romanNumerals: RomanNumeral[]; chordSymbols: string[] } | null {
  let best:
    | {
        key: Key;
        score: number;
        romanNumerals: RomanNumeral[];
        chordSymbols: string[];
      }
    | null = null;

  for (const key of ALL_KEYS) {
    for (const shift of SHIFT_CANDIDATES) {
      const shiftedTokens = transposeChordTokens(tokens, shift, key);
      const romanNumerals = rootPatternToRoman(shiftedTokens, key);
      if (!romanNumerals || romanNumerals.length < 2) continue;
      const qualityMatches = shiftedTokens.reduce((sum, token, index) => {
        const roman = romanNumerals[index];
        if (!roman) return sum;
        const expectedQuality =
          romanToChordSymbols([roman], key)[0]?.match(
            /^(?:[A-G](?:#|b)?)(maj7|m7|m|7|sus2|sus4|dim|aug)?$/i
          )?.[1] ?? '';
        const expectedMapped: ChordQuality =
          expectedQuality === 'm'
            ? 'minor'
            : expectedQuality === 'dim'
              ? 'diminished'
              : expectedQuality === 'aug'
                ? 'augmented'
                : expectedQuality === 'sus2'
                  ? 'sus2'
                  : expectedQuality === 'sus4'
                    ? 'sus4'
                    : expectedQuality === '7'
                      ? 'dominant7'
                      : expectedQuality === 'maj7'
                        ? 'major7'
                        : expectedQuality === 'm7'
                          ? 'minor7'
                          : 'major';
        return sum + (token.quality === expectedMapped ? 1 : 0);
      }, 0);
      const selectedKeyBonus = key === selectedKey ? 0.2 : 0;
      const shiftPenalty = Math.abs(shift) * 0.05;
      const score = qualityMatches + selectedKeyBonus - shiftPenalty;
      if (!best || score > best.score) {
        const shouldPreserveTokenQuality = shiftedTokens.some(
          (token) =>
            token.bassRoot !== undefined ||
            !['major', 'minor', 'diminished'].includes(token.quality)
        );
        best = {
          key,
          score,
          romanNumerals,
          chordSymbols: shouldPreserveTokenQuality
            ? shiftedTokens.map((token) => {
              const slashSuffix = token.bassRoot ? `/${spellRoot(token.bassRoot, key)}` : '';
              return `${spellRoot(token.root, key)}${QUALITY_SUFFIX[token.quality] ?? ''}${slashSuffix}`;
            })
            : romanToChordSymbols(romanNumerals, key),
        };
      }
    }
  }

  if (!best) return null;
  return {
    key: best.key,
    romanNumerals: best.romanNumerals,
    chordSymbols: best.chordSymbols,
  };
}

export function inferKeyFromChordSymbols(chordSymbols: string[]): Key | null {
  const parsedTokens = chordSymbols.map(parseChordSymbolToken);
  if (parsedTokens.some((token) => token === null)) return null;
  const concreteTokens = parsedTokens.filter(Boolean) as ParsedChordToken[];
  if (concreteTokens.length === 0) return null;

  let bestKey: Key | null = null;
  let bestScore = -1;
  const flatTokenCount = chordSymbols.filter((token) => token.includes('b')).length;
  const sharpTokenCount = chordSymbols.filter((token) => token.includes('#')).length;

  ALL_KEYS.forEach((key) => {
    const score = concreteTokens.reduce((sum, token, index) => {
      if (!chordFitsDiatonicMajor(token, key)) return sum;
      const tonicMatchBonus =
        index === 0 && spellRoot(token.root, key) === key ? 1.2 : 0;
      return sum + 1 + tonicMatchBonus;
    }, 0);
    const spellingPreferenceBonus =
      flatTokenCount > sharpTokenCount && key.includes('b')
        ? 0.15
        : sharpTokenCount > flatTokenCount && key.includes('#')
          ? 0.15
          : 0;
    const weightedScore = score + spellingPreferenceBonus;
    if (weightedScore > bestScore) {
      bestScore = weightedScore;
      bestKey = key;
    }
  });

  return bestScore > 0 ? bestKey : null;
}

export function parseProgressionText(
  input: string,
  selectedKey: Key,
  options: ParseProgressionTextOptions = {}
): ParsedProgressionText {
  const keyAware = options.keyAware ?? true;
  const inferKey = options.inferKey ?? true;
  const tokens = tokenizeProgressionInput(input);
  if (tokens.length === 0) {
    return {
      isValid: true,
      format: 'empty',
      tokens: [],
      chordSymbols: [],
      romanNumerals: [],
      romanNumeralDisplay: [],
      inferredKey: null,
      resolvedKey: null,
      resolvedChordSymbols: [],
      resolvedDisplay: '',
    };
  }

  if (tokens.every((token) => ROMAN_TOKEN_REGEX.test(token))) {
    const romanTokens = tokens as RomanNumeral[];
    return {
      isValid: true,
      format: 'roman',
      tokens,
      romanNumerals: romanTokens,
      chordSymbols: romanToChordSymbols(romanTokens, selectedKey),
      inferredKey: selectedKey,
      romanNumeralDisplay: romanTokens,
      resolvedKey: selectedKey,
      resolvedChordSymbols: romanToChordSymbols(romanTokens, selectedKey),
      resolvedDisplay: romanToChordSymbols(romanTokens, selectedKey).join('–'),
    };
  }

  if (tokens.every((token) => CHORD_TOKEN_REGEX.test(token))) {
    const inferredKeyCandidate = inferKey ? inferKeyFromChordSymbols(tokens) : null;
    const inferredKey = inferredKeyCandidate ?? selectedKey;
    const parsedTokens = tokens.map(parseChordSymbolToken);
    if (parsedTokens.some((token) => token === null)) {
      return {
        isValid: false,
        format: 'invalid',
        tokens,
        chordSymbols: [],
        romanNumerals: [],
      romanNumeralDisplay: [],
        inferredKey: null,
        resolvedKey: null,
        resolvedChordSymbols: [],
        resolvedDisplay: '',
      };
    }
    const mappingKey = keyAware ? inferredKey : selectedKey;
    const normalizedSymbols = tokens
      .map((token) => normalizeChordToken(token, mappingKey))
      .filter(Boolean) as string[];
    let romanNumerals =
      chordTokensToRoman(parsedTokens as ParsedChordToken[], mappingKey) ?? [];
    let effectiveKey = mappingKey;
    let effectiveSymbols = normalizedSymbols;
    if (romanNumerals.length < 2 && inferKey) {
      const fitted = findBestDiatonicFit(
        parsedTokens as ParsedChordToken[],
        selectedKey
      );
      if (fitted) {
        romanNumerals = fitted.romanNumerals;
        effectiveKey = fitted.key;
        effectiveSymbols = fitted.chordSymbols;
      } else {
        const rootPatternFit = findBestRootPatternFit(
          parsedTokens as ParsedChordToken[],
          selectedKey
        );
        if (rootPatternFit) {
          romanNumerals = rootPatternFit.romanNumerals;
          effectiveKey = rootPatternFit.key;
          effectiveSymbols = rootPatternFit.chordSymbols;
        }
      }
    }
    const effectiveParsedTokens = effectiveSymbols
      .map(parseChordSymbolToken)
      .filter(Boolean) as ParsedChordToken[];
    const romanNumeralDisplay = effectiveParsedTokens
      .map((token) => tokenToRomanDisplay(token, effectiveKey))
      .filter(Boolean) as string[];
    return {
      isValid: true,
      format: 'chord',
      tokens,
      chordSymbols: effectiveSymbols,
      romanNumerals,
      romanNumeralDisplay,
      inferredKey: effectiveKey,
      resolvedKey: effectiveKey,
      resolvedChordSymbols: effectiveSymbols,
      resolvedDisplay: effectiveSymbols.join('–'),
    };
  }

  return {
    isValid: false,
    format: 'invalid',
    tokens,
    chordSymbols: [],
    romanNumerals: [],
    romanNumeralDisplay: [],
    inferredKey: null,
    resolvedKey: null,
    resolvedChordSymbols: [],
    resolvedDisplay: '',
  };
}
