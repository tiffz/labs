export const DEFAULT_BPM_MIN = 20;
export const DEFAULT_BPM_MAX = 300;
export const COMMON_BPMS = [40, 50, 60, 72, 80, 90, 100, 108, 120, 128, 132, 140, 160, 180, 200];

export const ALL_KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'] as const;
export type MusicKey = (typeof ALL_KEYS)[number];
export const DISPLAY_KEYS_12 = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const KEY_TO_SEMITONE: Record<string, number> = {
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

/** Transpose a key root by semitones; returns a {@link DISPLAY_KEYS_12} label. */
export function transposeMusicKey(key: MusicKey, semitones: number): MusicKey {
  const noteIndex = KEY_TO_SEMITONE[key];
  if (noteIndex === undefined) return key;
  const newIndex = ((noteIndex + semitones) % 12 + 12) % 12;
  return DISPLAY_KEYS_12[newIndex]!;
}
