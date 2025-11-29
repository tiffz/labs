export interface PlaybackSettings {
  measureAccentVolume: number; // 0-100, volume for first note of measure
  beatGroupAccentVolume: number; // 0-100, volume for first note of beat groups
  nonAccentVolume: number; // 0-100, volume for non-accented notes (must be <= accent volumes)
  emphasizeSimpleRhythms: boolean; // Whether to emphasize beat groups in /4 rhythms
}

export const DEFAULT_SETTINGS: PlaybackSettings = {
  measureAccentVolume: 100,
  beatGroupAccentVolume: 75,
  nonAccentVolume: 40,
  emphasizeSimpleRhythms: false, // Default to false - only accent measure start for /4
};

