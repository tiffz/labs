import { ALL_KEYS } from '../../chords/utils/randomization';
import { romanNumeralToChord } from '../../chords/utils/chordTheory';
import type { Key, RomanNumeral, ChordQuality } from '../../chords/types';

const PROGRESSION_SEPARATOR_REGEX = /\s*(?:[–—-]|,)\s*/;
const ROMAN_TOKEN_REGEX = /^(?:I|II|III|IV|V|VI|VII|i|ii|iii|iv|v|vi|vii)$/;
const CHORD_TOKEN_REGEX = /^[A-G](?:#|b)?(?:m|maj7|m7|7|sus2|sus4|dim|aug)?$/i;
const FLAT_KEYS = new Set<Key>(['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);
const FLAT_CHROMATIC = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];
const SHARP_CHROMATIC = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

const SHIFT_CANDIDATES = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6] as const;

const ROOT_TO_PITCH_CLASS: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

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

interface ParsedChordToken {
  root: string;
  quality: ChordQuality;
}

export interface ParsedProgressionText {
  isValid: boolean;
  format: 'empty' | 'roman' | 'chord' | 'invalid';
  tokens: string[];
  chordSymbols: string[];
  romanNumerals: RomanNumeral[];
  inferredKey: Key | null;
}

function tokenizeProgressionInput(input: string): string[] {
  return input
    .trim()
    .split(PROGRESSION_SEPARATOR_REGEX)
    .map((token) => token.trim())
    .filter(Boolean);
}

function spellRoot(root: string, key: Key): string {
  const pitchClass = ROOT_TO_PITCH_CLASS[root];
  if (pitchClass === undefined) return root;
  const chromatic = FLAT_KEYS.has(key) ? FLAT_CHROMATIC : SHARP_CHROMATIC;
  return chromatic[pitchClass] ?? root;
}

function spellPitchClass(pitchClass: number, key: Key): string {
  const normalized = ((pitchClass % 12) + 12) % 12;
  const chromatic = FLAT_KEYS.has(key) ? FLAT_CHROMATIC : SHARP_CHROMATIC;
  return chromatic[normalized] ?? 'C';
}

function parseChordToken(token: string): ParsedChordToken | null {
  const match = token.match(
    /^([A-G](?:#|b)?)(maj7|m7|m|7|sus2|sus4|dim|aug)?$/i
  );
  if (!match) return null;
  const root = `${match[1]?.[0]?.toUpperCase() ?? 'C'}${(match[1] ?? '').slice(1)}`;
  const suffix = (match[2] ?? '').toLowerCase();
  const qualityBySuffix: Record<string, ChordQuality> = {
    '': 'major',
    m: 'minor',
    dim: 'diminished',
    aug: 'augmented',
    sus2: 'sus2',
    sus4: 'sus4',
    '7': 'dominant7',
    maj7: 'major7',
    m7: 'minor7',
  };
  const quality = qualityBySuffix[suffix];
  if (!quality) return null;
  return { root, quality };
}

function normalizeChordToken(token: string, key: Key): string | null {
  const parsed = parseChordToken(token);
  if (!parsed) return null;
  return `${spellRoot(parsed.root, key)}${QUALITY_SUFFIX[parsed.quality] ?? ''}`;
}

function romanToChordSymbols(romanTokens: RomanNumeral[], key: Key): string[] {
  return romanTokens.map((token) => {
    const chord = romanNumeralToChord(token, key);
    return `${spellRoot(chord.root, key)}${QUALITY_SUFFIX[chord.quality] ?? ''}`;
  });
}

function getMajorScalePitchClasses(key: Key): number[] {
  const tonicPc = ROOT_TO_PITCH_CLASS[key];
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
  const rootPc = ROOT_TO_PITCH_CLASS[token.root];
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
    const rootPc = ROOT_TO_PITCH_CLASS[token.root];
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

function transposeChordTokens(
  tokens: ParsedChordToken[],
  semitoneShift: number,
  key: Key
): ParsedChordToken[] {
  return tokens.map((token) => {
    const rootPc = ROOT_TO_PITCH_CLASS[token.root] ?? 0;
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

  ALL_KEYS.forEach((key) => {
    SHIFT_CANDIDATES.forEach((shift) => {
      const shiftedTokens = transposeChordTokens(tokens, shift, key);
      const romanNumerals = chordTokensToRoman(shiftedTokens, key);
      if (!romanNumerals || romanNumerals.length < 2) return;
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
    });
  });

  return best
    ? {
        key: best.key,
        romanNumerals: best.romanNumerals,
        chordSymbols: best.chordSymbols,
      }
    : null;
}

function rootPatternToRoman(tokens: ParsedChordToken[], key: Key): RomanNumeral[] | null {
  const converted: RomanNumeral[] = [];
  for (const token of tokens) {
    const rootPc = ROOT_TO_PITCH_CLASS[token.root];
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

  ALL_KEYS.forEach((key) => {
    SHIFT_CANDIDATES.forEach((shift) => {
      const shiftedTokens = transposeChordTokens(tokens, shift, key);
      const romanNumerals = rootPatternToRoman(shiftedTokens, key);
      if (!romanNumerals || romanNumerals.length < 2) return;
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
        best = {
          key,
          score,
          romanNumerals,
          chordSymbols: romanToChordSymbols(romanNumerals, key),
        };
      }
    });
  });

  return best
    ? {
        key: best.key,
        romanNumerals: best.romanNumerals,
        chordSymbols: best.chordSymbols,
      }
    : null;
}

export function inferKeyFromChordSymbols(chordSymbols: string[]): Key | null {
  const parsedTokens = chordSymbols.map(parseChordToken);
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
  selectedKey: Key
): ParsedProgressionText {
  const tokens = tokenizeProgressionInput(input);
  if (tokens.length === 0) {
    return {
      isValid: true,
      format: 'empty',
      tokens: [],
      chordSymbols: [],
      romanNumerals: [],
      inferredKey: null,
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
    };
  }

  if (tokens.every((token) => CHORD_TOKEN_REGEX.test(token))) {
    const inferredKey = inferKeyFromChordSymbols(tokens) ?? selectedKey;
    const parsedTokens = tokens.map(parseChordToken);
    if (parsedTokens.some((token) => token === null)) {
      return {
        isValid: false,
        format: 'invalid',
        tokens,
        chordSymbols: [],
        romanNumerals: [],
        inferredKey: null,
      };
    }
    const normalizedSymbols = tokens
      .map((token) => normalizeChordToken(token, inferredKey))
      .filter(Boolean) as string[];
    let romanNumerals =
      chordTokensToRoman(parsedTokens as ParsedChordToken[], inferredKey) ?? [];
    let effectiveKey = inferredKey;
    let effectiveSymbols = normalizedSymbols;
    if (romanNumerals.length < 2) {
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
    return {
      isValid: true,
      format: 'chord',
      tokens,
      chordSymbols: effectiveSymbols,
      romanNumerals,
      inferredKey: effectiveKey,
    };
  }

  return {
    isValid: false,
    format: 'invalid',
    tokens,
    chordSymbols: [],
    romanNumerals: [],
    inferredKey: null,
  };
}
