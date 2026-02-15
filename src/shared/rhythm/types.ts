export type DrumSound = 'dum' | 'tak' | 'ka' | 'slap' | 'rest' | 'simile';

export type NoteDuration = 'sixteenth' | 'eighth' | 'quarter' | 'half' | 'whole';

export interface Note {
  sound: DrumSound;
  duration: NoteDuration;
  durationInSixteenths: number;
  isDotted: boolean; // Dotted notes are 1.5x their normal duration
  isTiedFrom?: boolean; // This note is tied from previous measure
  isTiedTo?: boolean; // This note ties to next measure
  tiedDuration?: number; // Original full duration before splitting (in sixteenths)
  isMeasureFiller?: boolean; // If true, this note fills the remainder of the current measure and stops (doesn't spill over)
  isBarline?: boolean; // If true, forces a measure boundary
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

/** Section repeat: multi-measure phrase with repeat barlines |: ... :| */
export interface SectionRepeat {
  type: 'section';
  startMeasure: number; // Index of first measure in repeat
  endMeasure: number; // Index of last measure in repeat (inclusive)
  repeatCount: number; // How many times to play (2 = play twice total)
}

/** Measure repeat: consecutive identical measures shown with % simile symbol */
export interface MeasureDefinition {
  /** Index of the Source Measure in the Grid (for Linked Editing) */
  sourceMeasureIndex: number;
  /** Index in the Original Notation String where the Source Content starts */
  sourceStringIndex: number;
}

export interface MeasureRepeat {
  type: 'measure';
  sourceMeasure: number; // Index of the measure being repeated
  repeatMeasures: number[]; // Indices of measures that are % symbols
}

/** Union type for all repeat markers */
export type RepeatMarker = SectionRepeat | MeasureRepeat;

export interface ParsedRhythm {
  measures: Measure[];
  timeSignature: TimeSignature;
  isValid: boolean;
  error?: string;
  /** Repeat markers for rendering (section repeats and measure repeats) */
  repeats?: RepeatMarker[];
  /** Mapping from measure index to its source measure index (for repeats) */
  measureSourceMapping?: Record<number, number>;
  /** Unified Navigation Map (Phase 21) */
  measureMapping: MeasureDefinition[];
}

export interface PlaybackSettings {
  measureAccentVolume: number; // 0-100, volume for first note of measure
  beatGroupAccentVolume: number; // 0-100, volume for first note of beat groups
  nonAccentVolume: number; // 0-100, volume for non-accented notes (must be <= accent volumes)
  emphasizeSimpleRhythms: boolean; // Whether to emphasize beat groups in /4 rhythms
  metronomeVolume: number; // 0-100, volume for metronome clicks
  reverbStrength: number; // 0-100, reverb effect strength (0 = no reverb, 100 = full reverb)
  autoScrollDuringPlayback: boolean; // Whether to auto-scroll to keep current note visible
}

export const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = {
  measureAccentVolume: 90,
  beatGroupAccentVolume: 70,
  nonAccentVolume: 40,
  emphasizeSimpleRhythms: false, // Default to false - only accent measure start for /4
  metronomeVolume: 50,
  reverbStrength: 20, // Default to 20% reverb
  autoScrollDuringPlayback: true, // Default to on - scroll to follow playback
};
