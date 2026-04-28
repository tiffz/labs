import type { Key } from '../../shared/music/scoreTypes';

const TONIC_PC: Record<Key, number> = {
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

const SHARP_KEYS: ReadonlySet<Key> = new Set([
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'C#',
  'C',
]);

const SOLFEGE_DIATONIC = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'] as const;
const SOLFEGE_CHROMATIC_SHARP: Record<number, string> = {
  1: 'Di',
  3: 'Ri',
  6: 'Fi',
  8: 'Si',
  10: 'Li',
};
const SOLFEGE_CHROMATIC_FLAT: Record<number, string> = {
  1: 'Ra',
  3: 'Me',
  6: 'Se',
  8: 'Le',
  10: 'Te',
};
const SCALE_DEGREE_FOR_DIATONIC: Record<number, number> = {
  0: 0,
  2: 1,
  4: 2,
  5: 3,
  7: 4,
  9: 5,
  11: 6,
};

export function midiToSolfege(midi: number, key: Key): string | null {
  const tonicPc = TONIC_PC[key];
  if (tonicPc === undefined) return null;
  const diff = ((midi - tonicPc) % 12 + 12) % 12;
  const idx = SCALE_DEGREE_FOR_DIATONIC[diff];
  if (idx !== undefined) return SOLFEGE_DIATONIC[idx];
  const map = SHARP_KEYS.has(key) ? SOLFEGE_CHROMATIC_SHARP : SOLFEGE_CHROMATIC_FLAT;
  return map[diff] ?? null;
}
