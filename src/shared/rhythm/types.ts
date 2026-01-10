export type DrumSound = 'dum' | 'tak' | 'ka' | 'slap' | 'rest';

export type NoteDuration = 'sixteenth' | 'eighth' | 'quarter' | 'half' | 'whole';

export interface Note {
  sound: DrumSound;
  duration: NoteDuration;
  durationInSixteenths: number;
  isDotted: boolean; // Dotted notes are 1.5x their normal duration
  isTiedFrom?: boolean; // This note is tied from previous measure
  isTiedTo?: boolean; // This note ties to next measure
  tiedDuration?: number; // Original full duration before splitting (in sixteenths)
}

export interface Measure {
  notes: Note[];
  totalDuration: number;
}

export interface TimeSignature {
  numerator: number;
  denominator: number;
  beatGrouping?: number[]; // For asymmetric time signatures (e.g., [3, 3, 2] for 8/8)
}

export interface ParsedRhythm {
  measures: Measure[];
  timeSignature: TimeSignature;
  isValid: boolean;
  error?: string;
}

export interface PlaybackSettings {
  measureAccentVolume: number; // 0-100, volume for first note of measure
  beatGroupAccentVolume: number; // 0-100, volume for first note of beat groups
  nonAccentVolume: number; // 0-100, volume for non-accented notes (must be <= accent volumes)
  emphasizeSimpleRhythms: boolean; // Whether to emphasize beat groups in /4 rhythms
  metronomeVolume: number; // 0-100, volume for metronome clicks
  reverbStrength: number; // 0-100, reverb effect strength (0 = no reverb, 100 = full reverb)
}

export const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = {
  measureAccentVolume: 90,
  beatGroupAccentVolume: 70,
  nonAccentVolume: 40,
  emphasizeSimpleRhythms: false, // Default to false - only accent measure start for /4
  metronomeVolume: 50,
  reverbStrength: 20, // Default to 20% reverb
};
