import type { Key } from './chordTypes';

export const ALL_KEYS: Key[] = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
];

export function randomKey(random: () => number = Math.random): Key {
  const index = Math.floor(random() * ALL_KEYS.length);
  return ALL_KEYS[Math.max(0, Math.min(ALL_KEYS.length - 1, index))] as Key;
}
