import type { Key } from '../chordTypes';

export const FLAT_KEYS = new Set<Key>(['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

export const FLAT_CHROMATIC = [
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
] as const;

export const SHARP_CHROMATIC = [
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
] as const;

export const NOTE_TO_PITCH_CLASS: Record<string, number> = {
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

export function usesFlatSpelling(key: Key): boolean {
  return FLAT_KEYS.has(key);
}

export function chromaticForKey(key: Key): readonly string[] {
  return usesFlatSpelling(key) ? FLAT_CHROMATIC : SHARP_CHROMATIC;
}

export function normalizePitchClass(value: number): number {
  return ((value % 12) + 12) % 12;
}

export function spellPitchClass(pitchClass: number, key: Key): string {
  const chromatic = chromaticForKey(key);
  return chromatic[normalizePitchClass(pitchClass)] ?? 'C';
}

export function pitchClassForNote(note: string): number | null {
  const value = NOTE_TO_PITCH_CLASS[note];
  return value === undefined ? null : value;
}

export function spellRootForKey(root: string, key: Key): string {
  const pc = pitchClassForNote(root);
  if (pc === null) return root;
  return spellPitchClass(pc, key);
}
