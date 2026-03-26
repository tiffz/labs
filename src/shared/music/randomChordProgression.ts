import { COMMON_CHORD_PROGRESSIONS } from './commonChordProgressions';
import { progressionToChords } from '../../chords/utils/chordTheory';
import type { Key, ChordQuality } from '../../chords/types';
import { ALL_KEYS } from '../../chords/utils/randomization';

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

export interface RandomPopularChordProgressionResult {
  key: Key;
  progressionName: string;
  chordSymbols: string[];
  display: string;
}

function pickRandom<T>(items: readonly T[], random: () => number): T {
  const index = Math.floor(random() * items.length);
  return items[Math.min(items.length - 1, Math.max(0, index))] as T;
}

function spellRoot(root: string, key: Key): string {
  const pitchClass = ROOT_TO_PITCH_CLASS[root];
  if (pitchClass === undefined) return root;
  const chromatic = FLAT_KEYS.has(key) ? FLAT_CHROMATIC : SHARP_CHROMATIC;
  return chromatic[pitchClass] ?? root;
}

export function getRandomPopularChordProgressionInKey(
  key: Key,
  random: () => number = Math.random
): RandomPopularChordProgressionResult {
  const progression = pickRandom(COMMON_CHORD_PROGRESSIONS, random);
  const chords = progressionToChords(progression.progression, key);
  const chordSymbols = chords.map(
    (chord) =>
      `${spellRoot(chord.root, key)}${QUALITY_SUFFIX[chord.quality] ?? ''}`
  );
  return {
    key,
    progressionName: progression.name,
    chordSymbols,
    display: chordSymbols.join(' – '),
  };
}

export function getRandomPopularChordProgression(
  random: () => number = Math.random
): RandomPopularChordProgressionResult {
  const key = pickRandom(ALL_KEYS, random);
  return getRandomPopularChordProgressionInKey(key, random);
}
