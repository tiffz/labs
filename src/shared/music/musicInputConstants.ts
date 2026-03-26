export const DEFAULT_BPM_MIN = 20;
export const DEFAULT_BPM_MAX = 300;
export const COMMON_BPMS = [60, 72, 80, 90, 100, 120, 128, 140, 160];

export const ALL_KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'] as const;
export type MusicKey = (typeof ALL_KEYS)[number];
export const DISPLAY_KEYS_12 = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
