import { COMMON_CHORD_PROGRESSIONS } from './commonChordProgressions';
import { progressionToChords } from './chordTheory';
import type { ChordQuality, Key } from './chordTypes';
import { ALL_KEYS } from './randomization';
import { spellRootForKey } from './theory/pitchClass';

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
  return spellRootForKey(root, key);
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
