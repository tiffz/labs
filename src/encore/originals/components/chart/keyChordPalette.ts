import type { ChordQuality, Key, RomanNumeral } from '../../../../shared/music/chordTypes';
import { progressionToChords } from '../../../../shared/music/chordTheory';
import { parseChordSymbolToken } from '../../../../shared/music/chordProgressionText';
import { spellRootForKey } from '../../../../shared/music/theory/pitchClass';
import type { Key as KeyType } from '../../../../shared/music/chordTypes';

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

const PALETTE_ROMANS: RomanNumeral[] = ['I', 'IV', 'V', 'vi', 'ii', 'iii'];

function chordToSymbol(chord: { root: string; quality: ChordQuality }): string {
  return `${chord.root}${QUALITY_SUFFIX[chord.quality] ?? ''}`;
}

function harmonicMode(key: string): 'major' | 'minor' {
  return key.endsWith('m') ? 'minor' : 'major';
}

function spellKey(key: string): KeyType {
  return key.replace(/m$/, '') as KeyType;
}

/** Diatonic chord symbols for the song key — Paint Mode palette defaults. */
export function keyChordPalette(songKey: string): string[] {
  const key = songKey as Key;
  const mode = harmonicMode(songKey);
  const chords = progressionToChords(PALETTE_ROMANS, key, mode);
  const symbols = chords.map(chordToSymbol);
  return [...new Set(symbols)];
}

/** Diatonic chords with common 7th extensions for quick palette access. */
export function keyChordPaletteSevenths(songKey: string): string[] {
  return keyChordPalette(songKey).map((symbol) => {
    if (symbol.endsWith('dim')) return symbol;
    if (symbol.endsWith('m')) return `${symbol}7`;
    return `${symbol}7`;
  });
}

/** Major triads with maj7 (minor triads use m7 on the 7ths row). */
export function keyChordPaletteMaj7s(songKey: string): string[] {
  return keyChordPalette(songKey)
    .filter((symbol) => !symbol.endsWith('m') && !symbol.endsWith('dim'))
    .map((symbol) => `${symbol}maj7`);
}

/** Sus2 / sus4 color on diatonic roots (skip diminished). */
export function keyChordPaletteSus(songKey: string): string[] {
  const out: string[] = [];
  for (const symbol of keyChordPalette(songKey)) {
    if (symbol.endsWith('dim')) continue;
    const base = symbol.replace(/m$/, '');
    out.push(`${base}sus4`);
    if (!symbol.endsWith('m')) out.push(`${base}sus2`);
  }
  return [...new Set(out)];
}

export type ChordPaletteLayout = {
  triads: string[];
  sevenths: string[];
  maj7s: string[];
  sus: string[];
};

/** Paint-mode palette segments for one song key. */
export function keyChordPaletteLayout(songKey: string): ChordPaletteLayout {
  return {
    triads: keyChordPalette(songKey),
    sevenths: keyChordPaletteSevenths(songKey),
    maj7s: keyChordPaletteMaj7s(songKey),
    sus: keyChordPaletteSus(songKey),
  };
}

const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const AUTocomplete_SUFFIXES = ['', 'm', '7', 'maj7', 'm7', 'sus4', 'sus2', 'dim', 'aug'] as const;

/** Autocomplete options for inline custom chord entry. */
export function chordSymbolSuggestions(songKey: string, query = ''): string[] {
  const key = spellKey(songKey);
  const q = query.trim().toLowerCase();
  const options: string[] = [];
  for (const root of ROOTS) {
    const spelled = spellRootForKey(root, key);
    for (const suffix of AUTocomplete_SUFFIXES) {
      const sym = `${spelled}${suffix}`;
      if (parseChordSymbolToken(sym)) options.push(sym);
    }
  }
  const unique = [...new Set(options)];
  if (!q) return unique.slice(0, 40);
  return unique.filter((sym) => sym.toLowerCase().includes(q)).slice(0, 24);
}
