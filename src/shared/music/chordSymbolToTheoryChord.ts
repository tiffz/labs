import { parseChordSymbolToken } from './chordProgressionText';
import type { Chord } from './chordTypes';

/** Map a chart chord symbol (e.g. `Fm`, `Bbmaj7`) to shared voicing input. */
export function chordSymbolToTheoryChord(symbol: string): Chord | null {
  const parsed = parseChordSymbolToken(symbol.trim());
  if (!parsed) return null;
  return {
    root: parsed.root,
    quality: parsed.quality,
    bassRoot: parsed.bassRoot,
    inversion: 0,
    octave: 4,
  };
}
