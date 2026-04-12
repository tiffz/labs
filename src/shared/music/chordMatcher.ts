/**
 * Parses chord symbols and matches user-played pitch classes against expected chords.
 * Accepts any voicing/inversion as long as all required pitch classes are present.
 */

const NOTE_TO_PC: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7,
  'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11,
};

const QUALITY_INTERVALS: Record<string, number[]> = {
  '':      [0, 4, 7],
  'm':     [0, 3, 7],
  'min':   [0, 3, 7],
  'dim':   [0, 3, 6],
  'aug':   [0, 4, 8],
  'sus2':  [0, 2, 7],
  'sus4':  [0, 5, 7],
  '7':     [0, 4, 7, 10],
  'maj7':  [0, 4, 7, 11],
  'm7':    [0, 3, 7, 10],
  'min7':  [0, 3, 7, 10],
  'dim7':  [0, 3, 6, 9],
  'aug7':  [0, 4, 8, 10],
  'mmaj7': [0, 3, 7, 11],
  '6':     [0, 4, 7, 9],
  'm6':    [0, 3, 7, 9],
  '9':     [0, 4, 7, 10, 14],
  'm9':    [0, 3, 7, 10, 14],
  'add9':  [0, 4, 7, 14],
};

export interface ParsedChord {
  root: string;
  rootPc: number;
  quality: string;
  pitchClasses: Set<number>;
}

export function parseChordSymbol(symbol: string): ParsedChord | null {
  if (!symbol) return null;
  const trimmed = symbol.trim();
  if (!trimmed) return null;

  let rootLen = 1;
  if (trimmed.length > 1 && (trimmed[1] === '#' || trimmed[1] === 'b')) rootLen = 2;

  const root = trimmed.slice(0, rootLen);
  const rootPc = NOTE_TO_PC[root];
  if (rootPc === undefined) return null;

  const qualityStr = trimmed.slice(rootLen);

  const intervals = QUALITY_INTERVALS[qualityStr] ?? QUALITY_INTERVALS[''];

  const pitchClasses = new Set(intervals.map(i => (rootPc + i) % 12));

  return { root, rootPc, quality: qualityStr, pitchClasses };
}

export function matchesChord(playedMidiNotes: number[], expectedSymbol: string): boolean {
  const chord = parseChordSymbol(expectedSymbol);
  if (!chord) return false;
  if (playedMidiNotes.length === 0) return false;

  const playedPCs = new Set(playedMidiNotes.map(n => n % 12));

  for (const pc of chord.pitchClasses) {
    if (!playedPCs.has(pc)) return false;
  }
  return true;
}
