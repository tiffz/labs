export interface PlaybackSettings {
  measureAccentVolume: number; // 0-100, volume for first note of measure
  beatGroupAccentVolume: number; // 0-100, volume for first note of beat groups
  nonAccentVolume: number; // 0-100, volume for non-accented notes (must be <= accent volumes)
  emphasizeSimpleRhythms: boolean; // Whether to emphasize beat groups in /4 rhythms
  metronomeVolume: number; // 0-100, volume for metronome clicks
}

export const DEFAULT_SETTINGS: PlaybackSettings = {
  measureAccentVolume: 90,
  beatGroupAccentVolume: 70,
  nonAccentVolume: 40,
  emphasizeSimpleRhythms: false, // Default to false - only accent measure start for /4
  metronomeVolume: 50,
};

