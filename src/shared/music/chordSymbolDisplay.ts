import { parseChordSymbolToken } from './chordProgressionText';
import {
  getScalePitchClasses,
  harmonicModeFromSongKey,
  songKeyToTonic,
  type HarmonicMode,
} from './chordTheory';
import type { ChordQuality, Key } from './chordTypes';
import { NOTE_TO_PITCH_CLASS } from './theory/pitchClass';

type QualityBucket = 'major' | 'minor' | 'diminished';

const MAJOR_KEY_ROMAN: Record<number, Record<QualityBucket, string>> = {
  1: { major: 'I', minor: 'i', diminished: 'i°' },
  2: { minor: 'ii', diminished: 'ii°', major: 'II' },
  3: { minor: 'iii', major: 'III', diminished: 'iii°' },
  4: { major: 'IV', minor: 'iv', diminished: 'iv°' },
  5: { major: 'V', minor: 'v', diminished: 'v°' },
  6: { minor: 'vi', major: 'VI', diminished: 'vi°' },
  7: { diminished: 'vii°', minor: 'vii', major: 'VII' },
};

const MINOR_KEY_ROMAN: Record<number, Record<QualityBucket, string>> = {
  1: { minor: 'i', major: 'I', diminished: 'i°' },
  2: { minor: 'ii', diminished: 'ii°', major: 'II' },
  3: { major: 'III', minor: 'iii', diminished: 'iii°' },
  4: { minor: 'iv', major: 'IV', diminished: 'iv°' },
  5: { minor: 'v', major: 'V', diminished: 'v°' },
  6: { major: 'VI', minor: 'vi', diminished: 'vi°' },
  7: { major: 'VII', minor: 'vii', diminished: 'vii°' },
};

function qualityBucket(quality: ChordQuality): QualityBucket {
  if (quality === 'diminished') return 'diminished';
  if (quality === 'minor' || quality === 'minor7') return 'minor';
  return 'major';
}

function romanNumeralBase(degree: number, mode: HarmonicMode, bucket: QualityBucket): string | null {
  const table = mode === 'major' ? MAJOR_KEY_ROMAN : MINOR_KEY_ROMAN;
  return table[degree]?.[bucket] ?? null;
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
    default:
      return '';
  }
}

function degreeForPitchClass(pitchClass: number, key: Key, mode: HarmonicMode): number | null {
  const index = getScalePitchClasses(key, mode).findIndex((pc) => pc === pitchClass);
  return index >= 0 ? index + 1 : null;
}

function chordTokenToRomanDisplay(token: ReturnType<typeof parseChordSymbolToken>, key: Key, mode: HarmonicMode): string | null {
  if (!token) return null;
  const rootPc = NOTE_TO_PITCH_CLASS[token.root];
  if (rootPc === undefined) return null;
  const degree = degreeForPitchClass(rootPc, key, mode);
  if (!degree) return null;
  const roman = romanNumeralBase(degree, mode, qualityBucket(token.quality));
  if (!roman) return null;
  const qualitySuffix = qualityToRomanSuffix(token.quality);
  if (!token.bassRoot) return `${roman}${qualitySuffix}`;

  const bassPc = NOTE_TO_PITCH_CLASS[token.bassRoot];
  if (bassPc === undefined) return `${roman}${qualitySuffix}/${token.bassRoot}`;
  const bassDegree = degreeForPitchClass(bassPc, key, mode);
  if (!bassDegree) return `${roman}${qualitySuffix}/${token.bassRoot}`;
  const bassRoman = romanNumeralBase(bassDegree, mode, 'major') ?? String(bassDegree);
  return `${roman}${qualitySuffix}/${bassRoman}`;
}

/** Map a chord symbol to roman numeral display in the song key (falls back to letters). */
export function chordSymbolToRomanDisplay(symbol: string, songKey: string): string {
  const parsed = parseChordSymbolToken(symbol);
  if (!parsed) return symbol;
  const key = songKeyToTonic(songKey);
  const mode = harmonicModeFromSongKey(songKey);
  return chordTokenToRomanDisplay(parsed, key, mode) ?? symbol;
}

export type ChordNotationMode = 'letters' | 'roman';

export function formatChordForDisplay(
  symbol: string,
  songKey: string,
  notation: ChordNotationMode,
): string {
  if (notation === 'roman') return chordSymbolToRomanDisplay(symbol, songKey);
  return symbol;
}
